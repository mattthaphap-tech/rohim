#!/usr/bin/env python3
"""
Aset otomatis "Plot Twist Tidak Berguna #2: Tips Hewan Buas".
Input : voice/tips.srt (ElevenLabs) + public/tips_vo.mp3
Output: src/videos/tips/caption_chunks.json  (subtitle 1-2 kata, tag audio [..] dibuang)
        src/videos/tips/anchors.json          (cue waktu yang menggerakkan story.ts, cast.ts, dan SFX)
        public/tips_mix.wav                   (VO + SFX prosedural, ducking, -15 LUFS, true peak <= -1.2 dBTP)
Ganti voiceover -> ganti dua file input -> jalankan ulang skrip ini; semua shot ikut bergeser.
"""
import os, re, sys, json, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "skill", "templates", "audio"))
from dsp import SR, ns, tt, lp, bp, colored, pan, st, integrated, true_peak, read_wav, write_wav

SRT = os.path.join(ROOT, "voice", "tips.srt")
VO = os.path.join(ROOT, "public", "tips_vo.mp3")
OUT_DIR = os.path.join(ROOT, "src", "videos", "tips")
TAIL = 2.2  # detik ekor setelah suara habis (end card)

# ------------------------------------------------ 1. SRT -> chunks + anchors
def t2s(s):
    h, m, r = s.split(":"); sec, ms = r.split(",")
    return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000

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
    tot = sum(len(c) for c in cs) or 1; x = a
    for c in cs:
        d = (b - a) * len(c) / tot
        chunks.append({"text": c, "start": round(x, 3), "end": round(x + d, 3)}); x += d
json.dump(chunks, open(os.path.join(OUT_DIR, "caption_chunks.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)

def find(pat, nth=0):
    ms = [c for c in chunks if re.search(pat, c["text"], re.I)]
    if not ms: sys.exit("anchor tidak ketemu di SRT: " + pat)
    return ms[nth]["start"]

A = {
    "start": 0.0, "tunggu": find(r"tunggu"), "halo": find(r"^halo"), "oh": find(r"^oh"), "pak": find(r"^pak"),
    "mari": find(r"^mari"), "harimauPun": find(r"harimau pun"), "pergi": find(r"^pergi"), "dan": find(r"^dan"),
    "leganya": find(r"legan"), "scream": find(r"^aaa", -1), "plot": find(r"^plot"), "bukan": find(r"^bukan"),
    "sari": find(r"^sari"), "bagus": find(r"^bagus"), "tips": find(r"^itu"), "kasur": find(r"kasur"),
    "end": chunks[-1]["end"],
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

put(0.00, sfx_whoosh(0.32, 550, -0.4), -6)
put(0.10, sfx_growl(A["tunggu"] - 0.5), -13)                       # raungan harimau di belakang
t = 0.25
while t < A["tunggu"] - 0.2:                                        # langkah lari Bimo (3 langkah/dtk)
    put(t, sfx_step(), -8); t += 1 / 3
put(3.23, sfx_kick(0.34, 110, 42), -4)                              # cut ke low-angle
put(A["tunggu"] - 0.05, sfx_whoosh(0.35, 900, 0.2), -6); put(A["tunggu"], sfx_kick(0.34, 130, 40), -3); put(A["tunggu"] + 0.05, sfx_tick(2600), -8)
put(A["halo"] - 0.3, sfx_static(0.55), -9); put(A["halo"] - 0.05, sfx_bell(0.7, 1320), -14)   # TV menyala
put(A["oh"] - 0.05, sfx_whoosh(0.3, 1000, 0.0), -7)
put(A["pak"] - 0.08, sfx_whoosh(0.4, 700, 0.0), -5); put(A["pak"], sfx_kick(0.42, 120, 36), -2)  # momen heroik
put(A["mari"], sfx_whoosh(0.3, 600, -0.2), -9)
put(A["harimauPun"] - 0.05, sfx_tick(1400), -9); put(A["harimauPun"] + 0.45, sfx_tick(1100), -9)  # harimau bingung
put(A["pergi"] + 0.05, sfx_bell(1.6, 1050), -8)                     # "ting" harimau pergi
for i in range(5): put(A["pergi"] + 0.25 + i * 0.42, sfx_step(), -14 - i * 1.5)
put(A["dan"], sfx_whoosh(0.45, 600, 0.0), -8)
for i in range(int((A["leganya"] - A["dan"]) / 0.55)): put(A["dan"] + 0.25 + i * 0.55, sfx_step(), -13)
put(A["leganya"] - 0.1, sfx_water(min(2.6, A["scream"] - A["leganya"] + 1.0)), -12)               # aliran air (nada: sungai)
put(A["scream"] - 0.45, sfx_flash(0.95), -2.5)                      # white flash 4 frame
put(A["plot"], sfx_kick(0.38, 140, 34), -3)
put(A["bukan"] - 0.05, sfx_whoosh(0.3, 800, 0.0), -9)
put(A["bagus"] - 0.05, sfx_tick(1800), -9)
put(A["kasur"] - 0.05, sfx_whoosh(0.3, 700, 0.0), -8); put(A["kasur"] + 0.35, sfx_plop(), -8)
put(A["end"] + 0.1, sfx_kaching(0.85), -4.5); put(A["end"] + 0.1, sfx_kick(0.3, 120, 40), -6)  # "Kerusakan akibat twist: 1 kasur"

# ------------------------------------------------ 3. Voice + ducking + master -15 LUFS
tmp = os.path.join(ROOT, "public", "_tips_vo_48k.wav")
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
write_wav(os.path.join(ROOT, "public", "tips_mix.wav"), norm, 16)
print("OK -> public/tips_mix.wav")
