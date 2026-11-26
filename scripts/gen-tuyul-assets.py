#!/usr/bin/env python3
"""
Aset otomatis "Tuyul Mogok Kerja" (Pak Slamet & tuyul).
Input : voice/tuyul.srt (ElevenLabs) + public/tuyul_vo.mp3
Output: src/videos/tuyul/caption_chunks.json  (subtitle 1-2 kata, tag audio [..] dibuang)
        src/videos/tuyul/anchors.json          (cue waktu yang menggerakkan story.ts, cast.ts, dan SFX)
        public/tuyul_mix.wav                   (VO + SFX prosedural, ducking, -15 LUFS, true peak <= -1.2 dBTP)
Ganti voiceover -> ganti dua file input -> jalankan ulang skrip ini; semua shot ikut bergeser.
"""
import os, re, sys, json, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "skill", "templates", "audio"))
from dsp import SR, ns, tt, lp, bp, colored, pan, st, integrated, true_peak, read_wav, write_wav

SRT = os.path.join(ROOT, "voice", "tuyul.srt")
VO = os.path.join(ROOT, "public", "tuyul_vo.mp3")
OUT_DIR = os.path.join(ROOT, "src", "videos", "tuyul")
TAIL = 3.0  # detik ekor setelah suara habis (end card)

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
    "start": 0.0, "dukun": find(r"dukun", 0), "tuyul": find(r"tuyul", 0), "dukun2": find(r"^dukun", 0), "kertas": find(r"kertas"),
    "kontrak": find(r"^kontraknya"), "kok": find(r"\bkok\b"), "zaman": find(r"^zaman"), "bekerja": find(r"bekerja"), "lemari": find(r"lemari", 0),
    "motor": find(r"motor"), "tv": find(r"^tv"), "kulkas": find(r"kulkas"), "tetangganya": find(r"tetangganya"), "saling": find(r"saling"),
    "tidak": find(r"^tidak"), "makmur": find(r"makmur"), "lurah": find(r"lurah"), "ekonomi": find(r"ekonomi"), "persen": find(r"300"),
    "suatu": find(r"^suatu"), "malam": find(r"^malam itu"), "membujuk": find(r"membujuk"), "besok": find(r"^besok"), "spanduk": find(r"spanduk"), "lelah": find(r"lelah"), "bapak": find(r"^bapak", 0), "permen": find(r"permen"),
    "ketua": find(r"^ketua"), "kalau": find(r"^kalau"), "mana": find(r"mana"), "mogok": find(r"mogok", 1), "kosong": find(r"kosong"),
    "terduduk": find(r"terduduk"), "berbisik": find(r"berbisik"), "ternyata": find(r"ternyata", -1), "end": chunks[-1]["end"],
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
def sfx_coin(f=3200):
    t = tt(0.5); return pan(sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, a, k in [(1, .6, 9), (1.5, .35, 12)]) * 0.8, RNG.uniform(-.5, .5))
def sfx_paper(dur=0.5):
    n = ns(dur); return st(bp(colored(n, RNG, -0.5), 2500, 8000) * env_sin(n, 1.0) * 0.8)
def sfx_stamp():
    return sfx_kick(0.3, 150, 60)
def sfx_creak(dur=0.7):
    t = tt(dur); f = 180 + 120 * np.sin(2 * np.pi * 5 * t) + 80 * t
    return st(np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 * env_sin(len(t), 1.0) + bp(colored(len(t), RNG, -1), 400, 1800) * 0.25 * env_sin(len(t), 1.0))
def sfx_engine(dur=0.9):
    t = tt(dur); f = 55 + 120 * (t / dur) ** 0.7
    sig = (2 * ((f * t) % 1) - 1) * 0.4 + lp(colored(len(t), RNG, -1), 300) * 1.5
    return st(lp(sig, 900) * env_sin(len(t), 0.6))
def sfx_crowd(dur, cheer=True):
    n = ns(dur); t = tt(dur); a = bp(colored(n, RNG, -0.5), 600, 4200)
    mod = 0.55 + 0.45 * np.sin(2 * np.pi * (5 if cheer else 2) * t) * np.sin(2 * np.pi * 1.7 * t)
    return st(a * mod * env_sin(n, 0.5) * 0.9)
def sfx_clap(dur):
    n = ns(dur); t = tt(dur); out = np.zeros(n)
    for i in range(int(dur * 14)):
        k = RNG.integers(0, max(1, n - ns(0.05))); out[k:k + ns(0.05)] += bp(colored(ns(0.05), RNG, 0.0), 1500, 6000) * np.linspace(1, 0, ns(0.05))
    return st(out * env_sin(n, 0.4) * 1.2)
def sfx_feedback():
    t = tt(0.45); return st(np.sin(2 * np.pi * 3100 * t) * np.exp(-t * 5) * 0.35 * (0.6 + 0.4 * np.sin(2 * np.pi * 12 * t)))
def sfx_scratch():
    t = tt(0.5); f = 1800 * np.exp(-t * 7); return st(bp(colored(len(t), RNG, 0), 600, 5000) * 0.5 * np.exp(-t * 6) + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.2 * np.exp(-t * 7))
def sfx_crickets(dur):
    n = ns(dur); t = tt(dur); trem = (np.sin(2 * np.pi * 16 * t) > 0).astype(float)
    return st(np.sin(2 * np.pi * 4300 * t) * trem * 0.5 * (0.7 + 0.3 * np.sin(2 * np.pi * 0.6 * t)))
def sfx_trombone():
    out = []
    for f, d in [(233, 0.5), (220, 0.5), (208, 0.5), (185, 1.4)]:
        n = ns(d); t = tt(d); vib = 1 + (0.012 * np.sin(2 * np.pi * 5.5 * t) if d > 1 else 0)
        saw = lp(2 * ((f * vib * t) % 1) - 1, 1300) * 0.45 * env_sin(n, 0.4)
        out.append(saw)
    x = np.concatenate(out); return st(x)
def sfx_candy():
    return st(bp(colored(ns(0.45), RNG, 0), 3000, 9000) * env_sin(ns(0.45), 1.0) * 0.8)

# --- bagian 1: dukun & kontrak
put(0.0, sfx_whoosh(0.4, 500, -0.3), -9)
put(A["dukun"] - 0.1, sfx_bell(1.8, 520), -8); put(A["dukun"], sfx_creak(0.7), -12)                 # masuk gubuk dukun
for i in range(5): put(A["dukun"] + 0.5 + i * 0.35, sfx_tick(2400 + 200 * i), -22)                  # api lilin berderak
put(A["dukun2"] - 0.1, sfx_whoosh(0.35, 700, 0.0), -9); put(A["dukun2"] + 0.4, sfx_bell(1.4, 880), -12)
put(A["kertas"], sfx_paper(0.6), -8)
put(A["kontrak"] - 0.05, sfx_stamp(), -4); put(A["kontrak"] - 0.1, sfx_paper(0.3), -10)             # stempel kontrak
put(A["kok"], sfx_scratch(), -10); put(A["kok"] + 0.2, sfx_tick(1500), -9)
put(A["zaman"] - 0.05, sfx_kick(0.3, 100, 45), -6); put(A["zaman"] + 0.2, sfx_bell(1.2, 700), -14)
# --- bagian 2: tuyul bekerja
for i in range(int((A["lemari"] - A["bekerja"]) / 0.45)): put(A["bekerja"] + 0.2 + i * 0.45, sfx_step(0.6), -18)  # langkah berjingkat
put(A["bekerja"] - 0.2, sfx_crickets(A["lemari"] - A["bekerja"] + 1.0), -24)
for i in range(7): put(A["bekerja"] + 0.8 + i * 0.6, sfx_coin(2800 + 200 * (i % 3)), -12)            # koin dicuri
put(A["lemari"] - 0.2, sfx_creak(0.8), -8); put(A["lemari"] + 0.2, sfx_coin(3200), -8)
for i in range(6): put(A["lemari"] + 0.4 + i * 0.3, sfx_coin(2600 + 300 * (i % 3)), -11)
put(A["motor"] - 0.1, sfx_whoosh(0.3, 600, 0.0), -8); put(A["motor"], sfx_engine(0.9), -9); put(A["motor"] + 0.15, sfx_bell(1.0, 1400), -12)
put(A["tv"] - 0.05, sfx_static(0.35), -10); put(A["tv"] + 0.05, sfx_bell(1.0, 1200), -12)
put(A["kulkas"] - 0.05, sfx_kick(0.4, 90, 40), -5); put(A["kulkas"] + 0.1, sfx_bell(1.2, 1000), -11)
# --- bagian 3: semua tetangga kaya, semua tuyul saling mencuri
put(A["tetangganya"] - 0.1, sfx_scratch(), -9)
put(A["saling"] - 0.3, sfx_whoosh(0.5, 400, 0.0), -9)
for i in range(int((A["tidak"] - A["saling"]) / 0.22)): put(A["saling"] + i * 0.22, sfx_coin(2400 + 250 * (i % 4)), -15)   # saling curi: koin cepat
put(A["tidak"] - 0.05, sfx_kick(0.45, 90, 36), -4)
put(A["makmur"] - 0.2, sfx_crowd(A["lurah"] - A["makmur"] + 0.6, True), -15)
put(A["lurah"] + 0.2, sfx_feedback(), -14)
put(A["persen"] - 0.05, sfx_kick(0.35, 130, 50), -5); put(A["persen"], sfx_clap(2.6), -10); put(A["persen"] + 0.1, sfx_crowd(2.4, True), -14)
# --- bagian 4: tuyul mogok
put(A["suatu"] - 0.2, sfx_crickets(A["lelah"] - A["suatu"] + 1.0), -24)
put(A["suatu"], sfx_whoosh(0.45, 500, 0.0), -9); put(A["suatu"] + 0.6, sfx_crowd(2.4, False), -17)
put(A["spanduk"] - 0.05, sfx_whoosh(0.3, 800, 0.0), -9)
put(A["lelah"], sfx_kick(0.35, 110, 42), -6)
put(A["bapak"] - 0.05, sfx_tick(1500), -10); put(A["permen"], sfx_candy(), -7)
put(A["ketua"] - 0.05, sfx_kick(0.45, 90, 36), -5)
put(A["kalau"] - 0.05, sfx_kick(0.3, 100, 40), -7)
put(A["mana"] + 0.3, sfx_scratch(), -10)
put(A["mogok"] - 0.1, sfx_stamp(), -4); put(A["mogok"], sfx_crowd(1.8, False), -14)
put(A["kosong"] - 0.2, sfx_whoosh(0.8, 300, 0.0), -9); put(A["kosong"], sfx_creak(0.8), -9)
put(A["terduduk"], sfx_kick(0.45, 70, 34), -5)
put(A["ternyata"] + 1.8, sfx_trombone(), -10)                                                         # trombon sedih di akhir
put(A["end"] + 0.15, sfx_kick(0.35, 100, 40), -6); put(A["end"] + 0.15, sfx_kaching(0.85), -8)

# ------------------------------------------------ 3. Voice + ducking + master -15 LUFS
tmp = os.path.join(ROOT, "public", "_tuyul_vo_48k.wav")
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
write_wav(os.path.join(ROOT, "public", "tuyul_mix.wav"), norm, 16)
print("OK -> public/tuyul_mix.wav")
