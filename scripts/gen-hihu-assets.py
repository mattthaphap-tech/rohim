#!/usr/bin/env python3
"""
Aset otomatis "Ada Duit di Bawahmu! Hi hu!" (prank desa, Pak Ujang & dana desa).
Input : voice/hihu.srt (ElevenLabs) + public/hihu_vo.mp3
Output: src/videos/hihu/caption_chunks.json  (subtitle 1-2 kata, tag audio [..] dibuang)
        src/videos/hihu/anchors.json          (cue waktu yang menggerakkan story.ts, cast.ts, dan SFX)
        public/hihu_mix.wav                   (VO + SFX prosedural, ducking, -15 LUFS, true peak <= -1.2 dBTP)
Ganti voiceover -> ganti dua file input -> jalankan ulang skrip ini; semua shot ikut bergeser.
"""
import os, re, sys, json, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "skill", "templates", "audio"))
from dsp import SR, ns, tt, lp, bp, colored, pan, st, integrated, true_peak, read_wav, write_wav

SRT = os.path.join(ROOT, "voice", "hihu.srt")
VO = os.path.join(ROOT, "public", "hihu_vo.mp3")
OUT_DIR = os.path.join(ROOT, "src", "videos", "hihu")
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
    "start": 0.0, "prank": find(r"prank"), "duit1": find(r"^ada duit", 0), "bawahmu": find(r"^bawahmu", 0), "menunduk1": find(r"^orang menunduk"),
    "hihu1": find(r"^hi hu", 0), "seminggu": find(r"seminggu"), "ibu": find(r"^dari ibu-ibu"), "lurah1": find(r"^pak lurah", 0),
    "warga1": find(r"^warga bahkan"), "hafal": find(r"^karena sudah"), "ujang": find(r"^pak ujang", 0), "menyapu": find(r"menyapu"),
    "ubin": find(r"ubin"), "peti": find(r"ada peti", 0), "miliar": find(r"miliar", 0), "stiker": find(r"stiker"), "berlari": find(r"berlari"),
    "semua": find(r"^semua warga"), "hihu2": find(r"^hi hu", 1), "beneran": find(r"^beneran"), "apa": find(r"^apa\?", 0), "melapor": find(r"melapor"),
    "polmenunduk": find(r"^polisi menunduk"), "angkat": find(r"mengangkat"), "tos": find(r"^tos"), "hihu3": find(r"^hi hu", 2),
    "belakang": find(r"^dari belakang"), "lurah2": find(r"^pak lurah", 1), "keringat": find(r"berkeringat"), "karena": find(r"^karena tidak"),
    "bongkar": find(r"membongkar"), "kantor": find(r"kantor"), "meja": find(r"di meja"), "serius": find(r"berubah serius"),
    "dari": find(r"^dari bawah"), "ditahan": find(r"ditahan"), "vonis": find(r"divonis"), "saksi": find(r"jadi saksi"), "saya": find(r"^saya sudah"),
    "bawahmu2": find(r"di bawahmu"), "seisi": find(r"^seisi"), "hi": find(r"^hi$", -1), "hu": find(r"^hu!", -1), "end": chunks[-1]["end"],
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

def sfx_clank():
    t = tt(0.9); n = ns(0.9)
    return st(sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, a, k in [(620, .7, 6), (1450, .4, 9), (2300, .25, 13)]) + colored(n, RNG, 2.0) * np.exp(-t * 90) * .4)
def sfx_boing(f0=260, f1=820, dur=0.35):
    t = tt(dur); f = f0 + (f1 - f0) * (1 - np.exp(-t * 14)) + 25 * np.sin(2 * np.pi * 18 * t) * np.exp(-t * 6)
    return pan(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 0.7, 0.0)
def sfx_swish(dur=0.25):
    n = ns(dur); return st(bp(colored(n, RNG, -0.5), 1500, 6000) * env_sin(n, 1.3) * 0.7)
def sfx_scrape(dur=0.6):
    n = ns(dur); t = tt(dur); return st((lp(colored(n, RNG, -1), 900) * 2 + (2 * ((140 * t) % 1) - 1) * 0.15) * env_sin(n, 0.8))
def sfx_slap():
    n = ns(0.12); t = tt(0.12); return st(bp(colored(n, RNG, 0), 1200, 7000) * np.exp(-t * 55) * 1.6 + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 40) * 0.5)
def sfx_drip():
    t = tt(0.25); f = 1900 - 700 * (1 - np.exp(-t * 20)); return st(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * 0.7)
def sfx_gavel():
    n = ns(0.35); t = tt(0.35)
    return st(np.exp(-t * 55) * colored(n, RNG, 0.0) * .8 + np.sin(2 * np.pi * 180 * t) * np.exp(-t * 28) * .9 + np.sin(2 * np.pi * 95 * t) * np.exp(-t * 20) * .6)
def sfx_laugh(dur):
    n = ns(dur); t = tt(dur); a = bp(colored(n, RNG, -0.5), 500, 3200)
    return st(a * (0.5 + 0.5 * np.sin(2 * np.pi * 7.0 * t)) ** 1.5 * env_sin(n, 0.5) * 1.1)

# --- bagian 1: prank
put(0.0, sfx_whoosh(0.4, 500, -0.3), -9)
put(A["duit1"], sfx_tick(1800), -10); put(A["bawahmu"] - 0.05, sfx_kick(0.3, 130, 50), -6)
put(A["menunduk1"] + 0.2, sfx_swish(0.3), -10); put(A["menunduk1"] + 0.55, sfx_drip(), -14)
for k in ("hihu1", "hihu2", "hihu3"): put(A[k] - 0.05, sfx_boing(), -7); put(A[k], sfx_clap(0.5), -14)
put(A["seminggu"], sfx_whoosh(0.4, 600, 0.0), -9)
for i in range(6): put(A["seminggu"] + 0.3 + i * 0.4, sfx_boing(300 + 60 * (i % 3), 900, 0.3), -17)
put(A["ibu"], sfx_laugh(1.4), -16); put(A["lurah1"], sfx_boing(), -11)
put(A["hafal"] - 0.05, sfx_scratch(), -10); put(A["hafal"] + 0.9, sfx_crickets(1.8), -22)
# --- bagian 2: Pak Ujang menemukan peti
put(A["ujang"] - 0.05, sfx_whoosh(0.3, 500, 0.0), -10)
for i in range(int((A["ubin"] - A["menyapu"]) / 0.45) + 3): put(A["menyapu"] - 0.9 + i * 0.45, sfx_swish(0.28), -12)   # menyapu
put(A["ubin"] - 0.05, sfx_tick(1300), -9); put(A["ubin"] + 0.3, sfx_scrape(0.7), -9)                                   # ubin diangkat
put(A["peti"] - 0.05, sfx_kick(0.4, 100, 40), -5); put(A["peti"] + 0.1, sfx_creak(0.8), -9)
put(A["miliar"] - 0.05, sfx_kaching(0.85), -6)
for i in range(7): put(A["miliar"] + 0.3 + i * 0.28, sfx_coin(2600 + 300 * (i % 3)), -13)
put(A["stiker"], sfx_tick(2200), -11)
for i in range(int((A["semua"] - A["berlari"]) / 0.32)): put(A["berlari"] + i * 0.32, sfx_step(0.8), -13)
put(A["semua"] - 0.05, sfx_whoosh(0.3, 500, 0.0), -9)
# --- bagian 3: tidak ada yang percaya
put(A["beneran"] + 0.1, sfx_tick(1500), -10)
put(A["apa"], sfx_scratch(), -10)
put(A["apa"] + 1.3, sfx_laugh(1.8), -14)
for i in range(4): put(A["melapor"] + i * 0.35, sfx_step(0.7), -14)
put(A["polmenunduk"] + 0.3, sfx_swish(0.3), -10); put(A["angkat"] + 0.15, sfx_whoosh(0.3, 600, 0.0), -10)
put(A["tos"] - 0.05, sfx_slap(), -5); put(A["tos"] + 0.02, sfx_boing(), -12)
put(A["belakang"] + 0.5, sfx_laugh(4.2), -11)
for i in range(3): put(A["keringat"] + 0.15 + i * 0.5, sfx_drip(), -11)
# --- bagian 4: bukti & penahanan
put(A["bongkar"] - 0.05, sfx_kick(0.3, 100, 40), -6)
for i in range(5): put(A["bongkar"] + 0.15 + i * 0.28, sfx_scrape(0.35), -11)
for i in range(int((A["kantor"] - A["bongkar"]) / 0.5)): put(A["bongkar"] + 1.3 + i * 0.5, sfx_step(0.8), -13)
put(A["meja"] - 0.05, sfx_kick(0.45, 90, 36), -3); put(A["meja"] + 0.05, sfx_coin(2800), -10)
put(A["serius"] - 0.05, sfx_scratch(), -10); put(A["serius"] + 0.2, sfx_kick(0.35, 90, 40), -7)
put(A["dari"] + 2.3, sfx_scratch(), -11)
put(A["ditahan"] - 0.1, sfx_clank(), -6); put(A["ditahan"] + 0.05, sfx_gavel(), -4)
put(A["vonis"] + 0.55, sfx_gavel(), -3); put(A["vonis"] + 1.9, sfx_kick(0.45, 80, 36), -6)
put(A["saksi"] - 0.05, sfx_whoosh(0.3, 500, 0.0), -10)
put(A["saya"] - 0.05, sfx_tick(1700), -10); put(A["bawahmu2"], sfx_kick(0.3, 130, 50), -6)
put(A["seisi"] - 0.1, sfx_whoosh(0.4, 400, 0.0), -9); put(A["seisi"] + 0.7, sfx_swish(0.35), -11)
put(A["hi"] - 0.05, sfx_boing(), -5); put(A["hu"], sfx_clap(0.7), -10)
put(A["end"] + 0.15, sfx_trombone(), -9); put(A["end"] + 0.15, sfx_kick(0.35, 100, 40), -7)

# ------------------------------------------------ 3. Voice + ducking + master -15 LUFS
tmp = os.path.join(ROOT, "public", "_hihu_vo_48k.wav")
subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", VO, "-ar", str(SR), "-ac", "2", tmp], check=True)
v, _ = read_wav(tmp); os.remove(tmp)
voice = np.zeros((2, N)); m = min(N, v.shape[1]); voice[:, :m] = v[:, :m]

# kompresor suara ringan: VO ini dinamis (puncak tinggi) sehingga sulit mencapai -15 LUFS tanpa merusak puncak
_env = lp(np.abs(voice).mean(axis=0), 15.0); _thr = np.percentile(_env[_env > 1e-4], 55)
_g = lp(np.where(_env > _thr, (_env / _thr) ** -0.5, 1.0), 25.0)
voice = voice * np.clip(_g, 0.35, 1.6)

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
    norm = limit(np.tanh(mix * gain * 0.85) / 0.85)  # soft-clip lembut: menaikkan RMS tanpa menambah puncak
    cur = integrated(norm)
    if abs(cur - (-15.0)) < 0.1: break
    gain *= 10 ** ((-15.0 - cur) / 20.0)
tp = true_peak(norm)  # sudah dalam dBTP
if tp > -1.2:
    norm = norm * 10 ** ((-1.2 - tp) / 20.0)
print(f"akhir: {integrated(norm):.2f} LUFS, true peak {true_peak(norm):.2f} dBTP, durasi {N / SR:.2f}s")
write_wav(os.path.join(ROOT, "public", "hihu_mix.wav"), norm, 16)
print("OK -> public/hihu_mix.wav")
