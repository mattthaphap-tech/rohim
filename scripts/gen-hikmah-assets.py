#!/usr/bin/env python3
"""
Aset otomatis "Segala Sesuatu Pasti Ada Hikmahnya" (tanah 2 hektar).
Input : voice/hikmah.srt (ElevenLabs) + public/hikmah_vo.mp3
Output: src/videos/hikmah/caption_chunks.json  (subtitle 1-2 kata, tag audio [..] dibuang)
        src/videos/hikmah/anchors.json          (cue waktu yang menggerakkan story.ts, cast.ts, dan SFX)
        public/hikmah_mix.wav                   (VO + SFX prosedural, ducking, -15 LUFS, true peak <= -1.2 dBTP)
Ganti voiceover -> ganti dua file input -> jalankan ulang skrip ini; semua shot ikut bergeser.
"""
import os, re, sys, json, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "skill", "templates", "audio"))
from dsp import SR, ns, tt, lp, bp, colored, pan, st, integrated, true_peak, read_wav, write_wav

SRT = os.path.join(ROOT, "voice", "hikmah.srt")
VO = os.path.join(ROOT, "public", "hikmah_vo.mp3")
OUT_DIR = os.path.join(ROOT, "src", "videos", "hikmah")
TAIL = 2.2  # detik ekor setelah suara habis (end card)

# ------------------------------------------------ 1. SRT -> chunks (disejajarkan ke suara nyata via VAD) + anchors
def t2s(s):
    h, m, r = s.split(":"); sec, ms = r.split(",")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000

# VAD energi: SRT ElevenLabs hanya punya waktu per cue (beberapa kalimat + jeda napas),
# jadi kata dibagi proporsional hanya pada bagian yang benar-benar ada suaranya.
_t16 = os.path.join(ROOT, "public", "_vad16k.wav")
subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", VO, "-ar", "16000", "-ac", "1", _t16], check=True)
_x, _ = read_wav(_t16); os.remove(_t16)
_x = _x.mean(axis=0) if _x.ndim > 1 else _x
_hop = 160; _n = len(_x) // _hop
_rms = np.sqrt((_x[: _n * _hop].reshape(_n, _hop) ** 2).mean(axis=1))
_act = _rms > 0.10 * np.percentile(_rms, 95)
for _ in range(2):  # tutup celah < 120 ms, buang bunyi < 80 ms
    k = 12
    _act = np.convolve(_act.astype(float), np.ones(k), "same") > 0
    _act = np.convolve(_act.astype(float), np.ones(8), "same") >= 8
iv, st0 = [], None
for i, v in enumerate(_act):
    if v and st0 is None: st0 = i
    if not v and st0 is not None: iv.append((st0 * 0.01, i * 0.01)); st0 = None
if st0 is not None: iv.append((st0 * 0.01, _n * 0.01))

def active_segments(a, b):
    return [(max(a, s0), min(b, e0)) for s0, e0 in iv if min(b, e0) - max(a, s0) > 0.03] or [(a, b)]

def map_active(segs, frac):  # frac 0..1 pada total durasi aktif -> waktu nyata
    tot = sum(e - s for s, e in segs); target = frac * tot
    for s, e in segs:
        if target <= e - s: return s + target
        target -= e - s
    return segs[-1][1]

chunks = []
for blk in open(SRT, encoding="utf-8").read().strip().split("\n\n"):
    L = blk.split("\n"); a, b = [t2s(x) for x in L[1].split(" --> ")]
    txt = re.sub(r"\[[^\]]*\]", "", " ".join(L[2:])).replace('"', "").replace("\u201c", "").replace("\u201d", "")
    words, cs, cur = txt.split(), [], []
    for w in words:
        cur.append(w)
        if len(cur) == 2 or re.search(r"[.,!?]$", w):
            cs.append(" ".join(cur)); cur = []
    if cur: cs.append(" ".join(cur))
    tot = sum(len(c) for c in cs) or 1; segs = active_segments(a, b); acc = 0
    for c in cs:
        f0, f1 = acc / tot, (acc + len(c)) / tot; acc += len(c)
        chunks.append({"text": c, "start": round(map_active(segs, f0), 3), "end": round(map_active(segs, f1), 3)})
json.dump(chunks, open(os.path.join(OUT_DIR, "caption_chunks.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)

def find(pat, nth=0):
    ms = [c for c in chunks if re.search(pat, c["text"], re.I)]
    if not ms: sys.exit("anchor tidak ketemu di SRT: " + pat)
    return ms[nth]["start"]

A = {
    "start": 0.0, "hutan": find(r"hutan"), "ganja": find(r"ganja"), "lima": find(r"^lima"), "polisi1": find(r"^polisi", 0),
    "sidang": find(r"^sidang"), "palu": find(r"palu"), "dua0": find(r"^20"), "banding": find(r"banding"), "bebas": find(r"^bebas"),
    "olah": find(r"mengolah"), "rumah": find(r"rumah"), "sumur": find(r"sumur"), "emas": find(r"^emas"), "sebesar": find(r"^sebesar"),
    "hikmah": find(r"hikmah"), "polisi2": find(r"^polisi", 1), "tambang": find(r"tambang"), "penjara": find(r"dipenjara"),
    "tanahnya": find(r"tanahnya", -1), "pemerintah": find(r"pemerintah"), "end": chunks[-1]["end"],
}
json.dump(A, open(os.path.join(OUT_DIR, "anchors.json"), "w"), indent=2)
print("anchors:", {k: round(v, 2) for k, v in A.items()})

# ------------------------------------------------ 2. SFX prosedural (primitive dsp.py repo)
RNG = np.random.default_rng(42)
DUR = A["end"] + TAIL
N = ns(DUR)

def env_sin(n, p=2): return np.sin(np.pi * np.linspace(0, 1, n)) ** p
def sfx_whoosh(dur=0.38, f=650, pp=0.0):
    n = ns(dur); w = bp(colored(n, RNG, -2.5), max(60, f * 0.5), min(SR * 0.45, f * 1.8)) * env_sin(n)
    return pan(w, pp)
def sfx_kick(dur=0.34, f0=120, f1=38):
    n = ns(dur); t = tt(dur); fi = f1 + (f0 - f1) * np.exp(-t * 28.0)
    hit = np.sin(2 * np.pi * np.cumsum(fi) / SR) * np.exp(-t * 14.0) * 0.85 + np.exp(-t * 180.0) * colored(n, RNG, 2.0) * 0.25
    return st(hit)
def sfx_flash(dur=0.95):
    t = tt(dur); out = np.zeros(len(t)); nr = int(0.45 * SR)
    out[:nr] += bp(colored(nr, RNG, -2.0), 350, 2200) * (t[:nr] / 0.45) ** 3 * 0.7
    nt = len(t) - nr; tl = np.arange(nt) / SR
    out[nr:] += np.sin(2 * np.pi * (55 * np.exp(-tl * 8.0)) * tl) * np.exp(-tl * 4.5) * 0.9 + lp(colored(nt, RNG, 1.0), 4500) * np.exp(-tl * 4.5) * 0.2
    return st(out)
def sfx_bell(dur=1.4, f=1180):
    n = ns(dur); t = tt(dur)
    s = np.exp(-t * 140.0) * colored(n, RNG, 5.0) * 0.3
    m = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, a, k in [(1, 1, 3.2), (1.58, .45, 4.5), (2.32, .25, 6.0)])
    return pan(s + m * 0.65, -0.3)
def sfx_kaching(dur=0.85):
    n = ns(dur); t = tt(dur)
    return pan(np.exp(-t * 80) * colored(n, RNG, 2.0) * .5 + np.sin(2 * np.pi * 1760 * t) * np.exp(-t * 6.5) * .5
               + np.sin(2 * np.pi * 2640 * t) * np.exp(-t * 8.5) * .4 + lp(colored(n, RNG, 4.0), 5500) * np.exp(-t * 9) * .3, -0.2)
def sfx_step(gain=1.0):
    n = ns(0.14); t = tt(0.14)
    return st(lp(colored(n, RNG, -1.0), 650) * np.exp(-t * 38) * 3.0 * gain)
def sfx_growl(dur):
    n = ns(dur); t = tt(dur)
    saw = (2 * ((55 + 8 * np.sin(2 * np.pi * 3 * t)) * t % 1) - 1) * 0.35
    g = (lp(colored(n, RNG, -1.5), 280) * 4 + lp(saw, 500)) * (0.6 + 0.4 * np.sin(2 * np.pi * 21 * t))
    e = np.ones(n); a = int(0.25 * SR); e[:a] = np.linspace(0, 1, a); e[-a:] = np.minimum(e[-a:], np.linspace(1, 0, a))
    return st(g * e)
def sfx_water(dur):
    n = ns(dur); t = tt(dur)
    e = np.ones(n); a = int(0.35 * SR); e[:a] = np.linspace(0, 1, a); e[-a:] = np.minimum(e[-a:], np.linspace(1, 0, a))
    w = bp(colored(n, RNG, -0.5), 900, 6000) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t) * np.sin(2 * np.pi * 2.3 * t)) + lp(colored(n, RNG, -1), 400) * 0.5
    return st(w * e)
def sfx_static(dur=0.5):
    n = ns(dur); e = np.ones(n); a = int(0.01 * SR); e[:a] = np.linspace(0, 1, a); e[-int(0.15 * SR):] = np.linspace(1, 0, int(0.15 * SR))
    return st(bp(colored(n, RNG, 0.0), 1500, 9000) * e)
def sfx_tick(f=2000):
    t = tt(0.07); return st(np.sin(2 * np.pi * f * t) * np.exp(-t * 80))
def sfx_plop():
    t = tt(0.3); f = 420 * np.exp(-t * 14) + 120
    return st(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16))

sfx = np.zeros((2, N))
def put(t0, w, db=0.0):
    w = w * 10 ** (db / 20.0); i0 = ns(t0); L = min(N - i0, w.shape[1])
    if L > 0 and i0 >= 0: sfx[:, i0:i0 + L] += w[:, :L]
def sfx_gavel():
    n = ns(0.35); t = tt(0.35)
    return st(np.exp(-t * 55) * colored(n, RNG, 0.0) * .8 + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 28) * .9 + np.sin(2 * np.pi * 95 * t) * np.exp(-t * 20) * .6)
def sfx_siren(dur):
    t = tt(dur); f = 700 + 300 * np.sin(2 * np.pi * 1.4 * t)
    e = np.ones(len(t)); a = int(0.1 * SR); e[:a] = np.linspace(0, 1, a); e[-a:] = np.minimum(e[-a:], np.linspace(1, 0, a))
    return st(np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35 * e)
def sfx_rustle(dur):
    return st(bp(colored(ns(dur), RNG, -0.5), 1800, 7000) * env_sin(ns(dur), 1.2) * 0.6)
def sfx_clank():
    t = tt(0.9); n = ns(0.9)
    return st(sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, a, k in [(620, .7, 6), (1450, .4, 9), (2300, .25, 13)]) + colored(n, RNG, 2.0) * np.exp(-t * 90) * .4)
def sfx_dig(): 
    return st(lp(colored(ns(0.22), RNG, -1.0), 900) * np.exp(-tt(0.22) * 20) * 3.0)
def sfx_thunk():
    return sfx_kick(0.45, 95, 50)
def sfx_gold(dur=1.6):
    t = tt(dur)
    return pan(sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, a, k in [(1568, .5, 2.2), (2093, .45, 2.6), (2637, .35, 3.0), (3136, .25, 3.4)]) * 0.9, 0.0)
def sfx_pages(dur):
    n = ns(dur); t = tt(dur)
    flick = (np.sin(2 * np.pi * 9 * t) > 0.6).astype(float)
    return st(bp(colored(n, RNG, -1.0), 2500, 9000) * np.convolve(flick, np.ones(400) / 400, "same") * 0.8)
def sfx_swell(dur, f0=180, f1=900):
    n = ns(dur); t = tt(dur); f = f0 * (f1 / f0) ** (t / dur)
    return st(bp(colored(n, RNG, -1.0), 120, 3500) * (t / dur) ** 2 * 0.7)

# --- bagian 1: tanah & ladang
put(0.0, sfx_whoosh(0.5, 450, -0.3), -8)
for i in range(6): put(1.0 + i * 0.9, sfx_rustle(0.5), -22)                         # hutan lebat: gemerisik daun
put(A["ganja"] - 0.2, sfx_swell(0.6), -10); put(A["ganja"], sfx_kick(0.4, 120, 40), -4)  # penemuan ladang
put(A["lima"] - 0.3, sfx_whoosh(0.4, 700, 0.0), -8); put(A["polisi1"], sfx_siren(1.6), -13)  # polisi datang
# --- sidang
put(A["sidang"] - 0.05, sfx_kick(0.4, 90, 40), -5)
put(A["palu"] + 0.45, sfx_gavel(), -2)                                              # palu #1
put(A["dua0"], sfx_kick(0.5, 80, 34), -3)
put(A["dua0"] + 1.1, sfx_pages(2.0), -12)                                           # kalender berguguran
put(A["banding"] + 0.5, sfx_gavel(), -5)                                            # palu banding diterima
put(A["bebas"] - 0.15, sfx_clank(), -9); put(A["bebas"], sfx_whoosh(0.5, 500, 0.0), -9)
# --- bangun kembali
for i in range(int((A["sumur"] - A["rumah"]) / 0.5)): put(A["rumah"] + 0.15 + i * 0.5, sfx_dig(), -14)  # palu/pukul bangun rumah
for i in range(4): put(A["sumur"] + 0.3 + i * 0.55, sfx_dig(), -9)                  # gali sumur
put(A["emas"] - 0.35, sfx_thunk(), -3)                                              # cangkul membentur emas
put(A["emas"], sfx_gold(1.8), -8); put(A["sebesar"], sfx_whoosh(0.35, 800, 0.0), -9)
put(A["hikmah"] + 0.2, sfx_gold(1.6), -11)
# --- hening 1,4 dtk lalu polisi lagi
put(A["polisi2"] - 0.3, sfx_siren(1.8), -13); put(A["polisi2"], sfx_kick(0.45, 100, 38), -3)
put(A["tambang"], sfx_gavel(), -6)
put(A["penjara"] + 0.2, sfx_clank(), -4)
put(A["tanahnya"], sfx_whoosh(0.4, 600, 0.0), -9); put(A["pemerintah"] + 0.1, sfx_kick(0.5, 70, 34), -3)
put(A["end"] + 0.1, sfx_kaching(0.85), -5); put(A["end"] + 0.1, sfx_kick(0.3, 120, 40), -7)  # end card

# ------------------------------------------------ 3. Voice + ducking + master -15 LUFS
tmp = os.path.join(ROOT, "public", "_hikmah_vo_48k.wav")
subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", VO, "-ar", str(SR), "-ac", "2", tmp], check=True)
v, _ = read_wav(tmp); os.remove(tmp)
voice = np.zeros((2, N)); m = min(N, v.shape[1]); voice[:, :m] = v[:, :m]

# sidechain ducking: SFX turun sampai -5 dB saat suara aktif
env = lp(np.abs(voice).mean(axis=0), 10.0)
act = np.clip(env / (np.percentile(env, 90) + 1e-9), 0, 1)
duck = 10 ** ((-5.0 * act) / 20.0)
mix = voice * 0.95 + sfx * 0.42 * duck

# limiter look-ahead sederhana (peak -2.2 dBFS agar true peak <= -1.2 dBTP) + normalisasi iteratif ke -15 LUFS
from scipy.ndimage import minimum_filter1d, uniform_filter1d
def limit(x, ceil_db=-2.2):
    c = 10 ** (ceil_db / 20.0)
    g = np.minimum(1.0, c / np.maximum(np.abs(x).max(axis=0), 1e-9))
    g = minimum_filter1d(g, size=ns(0.004)); g = uniform_filter1d(g, size=ns(0.004))
    g = uniform_filter1d(np.minimum.accumulate(g[::-1])[::-1] * 0 + g, size=ns(0.02))  # lepas halus
    return x * np.minimum(1.0, g)
gain = 1.0
for _ in range(8):
    norm = limit(mix * gain)
    cur = integrated(norm)
    if abs(cur - (-15.0)) < 0.1: break
    gain *= 10 ** ((-15.0 - cur) / 20.0)
tp = true_peak(norm)  # sudah dalam dBTP
if tp > -1.2:
    norm = norm * 10 ** ((-1.2 - tp) / 20.0)
print(f"akhir: {integrated(norm):.2f} LUFS, true peak {true_peak(norm):.2f} dBTP, durasi {N / SR:.2f}s")
write_wav(os.path.join(ROOT, "public", "hikmah_mix.wav"), norm, 16)
print("OK -> public/hikmah_mix.wav")
