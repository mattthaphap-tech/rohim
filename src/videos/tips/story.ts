// Timeline "Plot Twist Tidak Berguna #2: Tips Hewan Buas" (komedi absurd, ~43 detik, 1305 frame @ 30 fps).
// Semua cue waktu diambil dari anchors.json (dibuat dari voice/tips.srt oleh scripts/gen-tips-assets.py),
// jadi kalau voiceover diganti, cukup jalankan ulang skrip itu dan seluruh shot/kamera/SFX ikut bergeser.
// Tata kamera mengikuti GUIDELINES.md: push-in kontinu, glide smootherstep, hard cut ke macro insert,
// dutch tilt heroik, high-angle crane, kick 7 frame di punchline, white flash 4 frame di momen twist.
import { LightName } from "./lights";
import A from "./anchors.json";

export const FPS = 30;
const SEC = A as Record<string, number>;
export const F = (k: string) => Math.round(SEC[k] * FPS);
export const TOTAL = Math.ceil((SEC.end + 2.2) * FPS); // +2.2 dtk ekor untuk end card "1 kasur"
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export type ShotDef = { id: number; a: number; b: number; light: LightName; sunAz?: number; sunEl?: number };

// 15 shot, dikunci ke ElevenLabs "Bagas - Deep & Relaxed" (41.28 dtk)
export const SHOTS: ShotDef[] = [
  { id: 1,  a: 0,           b: F("tunggu"),     light: "golden", sunAz: 52, sunEl: 38 }, // dikejar harimau
  { id: 2,  a: F("tunggu"), b: F("halo"),       light: "golden", sunAz: 50, sunEl: 38 }, // "Tunggu... aku pernah nonton videonya"
  { id: 3,  a: F("halo"),   b: F("oh"),         light: "golden", sunAz: 50, sunEl: 38 }, // flashback video Bang Jagoan Alam
  { id: 4,  a: F("oh"),     b: F("pak"),        light: "golden", sunAz: 54, sunEl: 36 }, // "Oh iya, aku ingat!"
  { id: 5,  a: F("pak"),    b: F("harimauPun"), light: "golden", sunAz: 56, sunEl: 34 }, // "Pak Harimau, mari kita bicara baik-baik"
  { id: 6,  a: F("harimauPun"), b: F("pergi"),  light: "golden", sunAz: 48, sunEl: 36 }, // harimau bingung (macro)
  { id: 7,  a: F("pergi"),  b: F("dan"),        light: "golden", sunAz: 52, sunEl: 36 }, // harimau pergi
  { id: 8,  a: F("dan"),    b: F("leganya"),    light: "golden", sunAz: 52, sunEl: 40 }, // Bimo selamat, jalan ke sungai
  { id: 9,  a: F("leganya"), b: F("scream"),    light: "golden", sunAz: 46, sunEl: 34 }, // "Ahhh, leganya..."
  { id: 10, a: F("scream"), b: F("plot"),       light: "day",    sunAz: 60, sunEl: 44 }, // TWIST: bangun di kamar
  { id: 11, a: F("plot"),   b: F("bukan"),      light: "day",    sunAz: 62, sunEl: 44 },
  { id: 12, a: F("bukan"),  b: F("sari"),       light: "day",    sunAz: 58, sunEl: 46 }, // macro kasur basah
  { id: 13, a: F("sari"),   b: F("bagus"),      light: "day",    sunAz: 60, sunEl: 44 },
  { id: 14, a: F("bagus"),  b: F("kasur"),      light: "day",    sunAz: 64, sunEl: 44 }, // Sari deadpan
  { id: 15, a: F("kasur"),  b: TOTAL,           light: "day",    sunAz: 58, sunEl: 46 }, // macro + end card
];

export const XFADE: Record<number, number> = {}; // hanya hard cut
export const FLASH_AT = F("scream");

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

export type WorldState = {
  id: number; f: number; t: number; u: number;
  setKind: "forest" | "bedroom";
  showStars: boolean; showMoon: boolean; coinRot: number;
};
export const worldState = (id: number, f: number): WorldState => {
  const s = SHOTS[id - 1];
  return {
    id, f, t: f / FPS, u: clamp01((f - s.a) / Math.max(1, s.b - s.a)),
    setKind: id >= 10 ? "bedroom" : "forest", showStars: false, showMoon: false, coinRot: 0,
  };
};

// ---------------- posisi aktor (meter) ----------------
export const RUN_V = 3.4; // m/s, lari panik
export const X0 = -4;
export const STOP = X0 + RUN_V * SEC.tunggu; // tempat Bimo berhenti (~18 m)
export const BANK = STOP + 5.0; // tepi sungai
export const TIGER_GAP = 2.6;
export const bimoX = (t: number) =>
  t < SEC.tunggu ? X0 + RUN_V * t
  : t < SEC.dan ? STOP
  : STOP + clamp01((t - SEC.dan) / (SEC.leganya - SEC.dan)) * (BANK - 0.9 - STOP);
export const tigerX = (t: number) => {
  if (t < SEC.tunggu) return bimoX(t) - TIGER_GAP + 0.55 * Math.sin(t * 2.4) * (1 - clamp01((t - (SEC.tunggu - 0.8)) / 0.8));
  if (t < SEC.pergi) return STOP - TIGER_GAP;
  return STOP - TIGER_GAP - (t - SEC.pergi) * 1.1;
};
// kamar tidur
export const BED = {
  bimo: [-0.75, 0.5, -1.9] as V3,
  sari: [1.2, 0, -2.1] as V3,
  stain: [0.0, 0.62, -1.85] as V3,
};

// ---------------- Reference Camera Engine ----------------
export type CamPose = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<CamPose> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };

const mix = (a: CamPose, b: CamPose, k: number): CamPose => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3,
  look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): CamPose => ({ fov: 38, roll: 0, ...c });
const run = (keys: Key[], f: number): CamPose => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 22)));
  }
  return cur;
};
const T = (f: number) => f / FPS;

const pushK = (f: number, f0: number, rate: number, punch = 0, n = 28) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 7, (n - i - 0.5) / 7));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<CamPose> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

// ---- Shot 1 (chase): tracking medium-wide dari samping -> cut ke low-angle dutch yang ikut berlari ----
const S1a = (f: number) => { const b = bimoX(T(f)); return dolly([b - 0.7, 1.2, 10.5], [b - 1.0, 1.0, 0], pushK(f, 0, 0.0022, 0.005, 14), { fov: 38, roll: -0.04 }); };
const S1b = (f: number) => { const b = bimoX(T(f)); return dolly([b + 0.1, 0.55, 6.0], [b - 0.7, 1.0, 0], pushK(f, 98, 0.0010), { fov: 40, roll: 0.07 }); };
// ---- Shot 2: close-up realisasi "Tunggu..." ----
const S2a = (f: number) => dolly([STOP + 0.25, 1.5, 2.7], [STOP, 1.45, 0], pushK(f, F("tunggu"), 0.0034, 0.0075, 18), { fov: 31, roll: 0.035 });
// ---- Shot 3: Bimo + kartu TV flashback (thought-bubble di kanan atas) ----
const S3a = (f: number) => dolly([STOP + 0.55, 1.7, 3.7], [STOP + 0.25, 1.7, 0], pushK(f, F("halo"), 0.0004), { fov: 38, roll: -0.02 });
// ---- Shot 4: "Oh iya, aku ingat!" ----
const S4a = (f: number) => dolly([STOP + 0.15, 1.58, 2.2], [STOP, 1.55, 0], pushK(f, F("oh"), 0.0035, 0.008, 18), { fov: 30, roll: -0.06 });
// ---- Shot 5: wide two-shot dutch heroik -> OTS rendah di belakang Bimo ----
const S5a = (f: number) => { const m = STOP - TIGER_GAP / 2; return dolly([m + 0.35, 1.0, 9.0], [m + 0.25, 1.05, 0], pushK(f, F("pak"), 0.0024, 0.007, 22), { fov: 38, roll: -0.07 }); };
const S5b = (f: number) => dolly([STOP + 0.2, 1.5, 2.4], [STOP, 1.5, 0], pushK(f, F("mari"), 0.0028), { fov: 30, roll: 0.05 }); // CU Bimo tenang bicara
// ---- Shot 6: macro harimau bingung ----
const S6a = (f: number) => { const x = STOP - TIGER_GAP; return dolly([x + 1.5, 1.0, 2.3], [x + 0.65, 0.9, -0.2], pushK(f, F("harimauPun"), 0.0032, 0.0075, 20), { fov: 32, roll: -0.05 }); };
// ---- Shot 7: wide, harimau pergi ----
const S7a = (f: number) => dolly([STOP - 1.4, 1.2, 9.5], [STOP - 1.5, 1.0, 0], pushK(f, F("pergi"), 0.0018), { fov: 40, roll: 0.025 });
// ---- Shot 8: high-angle crane mengikuti Bimo -> tracking rendah ----
const S8a = (f: number) => { const b = bimoX(T(f)); return dolly([b + 1.3, 3.7, 5.0], [b + 0.6, 0.9, 0], pushK(f, F("dan"), 0.0024), { fov: 38, roll: -0.025 }); };
const S8b = (f: number) => { const b = bimoX(T(f)); return dolly([b + 1.9, 1.2, 4.3], [b + 0.8, 1.1, 0], pushK(f, F("dan") + 62, 0.0022), { fov: 36, roll: 0.03 }); };
// ---- Shot 9: medium di tepi sungai, push-in lambat ----
const S9a = (f: number) => { const b = BANK - 0.9; return dolly([b + 0.3, 1.2, 6.0], [b + 0.55, 1.0, 0], pushK(f, F("leganya"), 0.0012), { fov: 36, roll: -0.02 }); }; // medium-wide: Bimo + pancuran + sungai
// ---- Shot 10: TWIST. Kamar tidur wide ----
const S10a = (f: number) => dolly([0.25, 1.5, 5.0], [0.1, 1.15, -1.9], pushK(f, F("scream"), 0.0028, 0.008, 26), { fov: 38, roll: 0.045 });
const S11a = (f: number) => dolly([-0.4, 1.4, 1.5], [-0.75, 1.2, -1.9], pushK(f, F("plot"), 0.0034, 0.0075, 20), { fov: 36, roll: -0.04 });
const S12a = (f: number) => dolly([0.05, 1.85, -0.3], [0.0, 0.62, -1.85], pushK(f, F("bukan"), 0.0034, 0.0075, 20), { fov: 34, roll: 0.05 });
const S13a = (f: number) => dolly([0.3, 1.3, 3.7], [0.2, 1.2, -1.9], pushK(f, F("sari"), 0.0024), { fov: 40, roll: 0.02 });
const S14a = (f: number) => dolly([0.55, 1.5, -0.1], [1.2, 1.45, -2.1], pushK(f, F("bagus"), 0.0032, 0.007, 22), { fov: 30, roll: -0.035 });
const S15a = (f: number) => dolly([0.05, 1.85, -0.3], [0.0, 0.62, -1.85], pushK(f, F("kasur"), 0.0036, 0.008, 24), { fov: 34, roll: -0.04 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 98, cut: true, s: S1b }],
  2: [{ f: F("tunggu"), s: S2a }],
  3: [{ f: F("halo"), s: S3a }],
  4: [{ f: F("oh"), s: S4a }],
  5: [{ f: F("pak"), s: S5a }, { f: F("mari"), cut: true, s: S5b }],
  6: [{ f: F("harimauPun"), s: S6a }],
  7: [{ f: F("pergi"), s: S7a }],
  8: [{ f: F("dan"), s: S8a }, { f: F("dan") + 62, dur: 24, s: S8b }],
  9: [{ f: F("leganya"), s: S9a }],
  10: [{ f: F("scream"), s: S10a }],
  11: [{ f: F("plot"), s: S11a }],
  12: [{ f: F("bukan"), s: S12a }],
  13: [{ f: F("sari"), s: S13a }],
  14: [{ f: F("bagus"), s: S14a }],
  15: [{ f: F("kasur"), s: S15a }],
};

// kick 7 frame di punchline & hard cut
const KICKS: [number, number][] = [
  [3.23, 0.9], [SEC.tunggu, 1.1], [SEC.oh, 0.9], [SEC.pak, 1.3], [SEC.mari, 0.8], [SEC.harimauPun, 0.9],
  [SEC.pergi, 1.0], [SEC.scream, 1.5], [SEC.plot, 1.2], [SEC.bukan, 1.0], [SEC.bagus, 0.9], [SEC.kasur, 1.2],
];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};

export const camAt = (id: number, f: number): CamPose => {
  const c = run(CAMS[id] ?? CAMS[1], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// DOF dangkal di close-up/macro, tajam di wide
export const dofAt = (f: number): { cInf: number; focus?: (frame: number) => V3 } => {
  const s = shotAt(f);
  if ([2, 3, 4, 6, 9, 11, 12, 14, 15].includes(s.id) || (s.id === 1 && f >= 98)) return { cInf: 10.8 };
  if (s.id >= 10) return { cInf: 4.5, focus: () => [0.1, 1.1, -1.9] };
  return { cInf: 4.5, focus: (fr: number) => [bimoX(T(fr)), 1.1, 0] };
};
