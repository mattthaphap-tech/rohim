// "Segala Sesuatu Pasti Ada Hikmahnya" (komedi absurd, ~51 dtk, 1532 frame @ 30 fps).
// Pak Bimo: tanah 2 hektar -> ladang ganja -> ditangkap -> vonis 20 tahun -> banding bebas -> bangun rumah & sumur
// -> emas sebesar kepala ("ini hikmah!") -> ditangkap lagi (tambang ilegal) -> tanah diambil pemerintah.
// Semua cue dari anchors.json (hasil scripts/gen-hikmah-assets.py dari voice/hikmah.srt).
import { LightName } from "./lights";
import A from "./anchors.json";

export const FPS = 30;
const SEC = A as Record<string, number>;
export const F = (k: string) => Math.round(SEC[k] * FPS);
export const TOTAL = Math.ceil((SEC.end + 2.2) * FPS);
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export type SetKind = "land" | "court" | "cell" | "gate";
export type ShotDef = { id: number; a: number; b: number; light: LightName; kind: SetKind; sunAz?: number; sunEl?: number };

export const SHOTS: ShotDef[] = [
  { id: 1,  a: 0,              b: F("ganja"),      light: "day",    kind: "land",  sunAz: 50, sunEl: 52 }, // tiba di tanah, hutan lebat
  { id: 2,  a: F("ganja"),     b: F("lima"),       light: "day",    kind: "land",  sunAz: 50, sunEl: 52 }, // ladang ganja!
  { id: 3,  a: F("lima"),      b: F("sidang"),     light: "day",    kind: "land",  sunAz: 50, sunEl: 52 }, // polisi datang, ditangkap
  { id: 4,  a: F("sidang"),    b: F("palu"),       light: "day",    kind: "court", sunAz: 56, sunEl: 46 }, // sidang
  { id: 5,  a: F("palu"),      b: F("dua0"),       light: "day",    kind: "court", sunAz: 56, sunEl: 46 }, // palu diketuk
  { id: 6,  a: F("dua0"),      b: F("banding"),    light: "night",  kind: "court", sunAz: 56, sunEl: 40 }, // "20 tahun" ... "2 tahun kemudian"
  { id: 7,  a: F("banding"),   b: F("bebas"),      light: "day",    kind: "court", sunAz: 56, sunEl: 46 }, // banding diterima
  { id: 8,  a: F("bebas"),     b: F("olah"),       light: "golden", kind: "gate",  sunAz: 48, sunEl: 30 }, // BEBAS
  { id: 9,  a: F("olah"),      b: F("rumah"),      light: "golden", kind: "land",  sunAz: 48, sunEl: 32 }, // "aku akan mengolah tanahku"
  { id: 10, a: F("rumah"),     b: F("sumur"),      light: "golden", kind: "land",  sunAz: 48, sunEl: 32 }, // rumah jadi dalam sekejap
  { id: 11, a: F("sumur"),     b: F("emas"),       light: "golden", kind: "land",  sunAz: 52, sunEl: 34 }, // gali sumur, cangkul menabrak sesuatu
  { id: 12, a: F("emas"),      b: F("hikmah"),     light: "golden", kind: "land",  sunAz: 50, sunEl: 28 }, // EMAS sebesar kepala
  { id: 13, a: F("hikmah"),    b: F("polisi2"),    light: "golden", kind: "land",  sunAz: 46, sunEl: 24 }, // "ini hikmah..." bangga, hening
  { id: 14, a: F("polisi2"),   b: F("penjara"),    light: "day",    kind: "land",  sunAz: 50, sunEl: 52 }, // polisi lagi: tambang ilegal
  { id: 15, a: F("penjara"),   b: F("tanahnya"),   light: "night",  kind: "cell",  sunAz: 50, sunEl: 40 }, // dipenjara lagi
  { id: 16, a: F("tanahnya"),  b: TOTAL,           light: "day",    kind: "land",  sunAz: 50, sunEl: 50 }, // tanah diambil pemerintah
];

export const XFADE: Record<number, number> = {}; // hard cut saja
export const FLASH_AT = F("emas");                   // white flash 4 frame: emas ditemukan

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// ---- keadaan tanah (apa yang ada di lahan pada waktu t) ----
export const HOUSE = { x: 4.2, z: -3.4 };
export const WELL = { x: -1.2, z: -0.8 };
export const DIG = { x: -2.5, z: 0.2 };
export const SIGN = { x: 0.9, z: 0.9 };
export const landFlags = (t: number, id: number) => {
  const hp = clamp01((t - SEC.rumah) / 0.6);
  return {
    plants: id === 2 || id === 3,                                            // ladang hanya ada di shot 2-3
    houseStage: t < SEC.rumah ? 0 : id >= 16 || t >= SEC.sumur ? 4 : Math.min(4, 1 + Math.floor(hp * 4)),
    well: t >= SEC.sumur && id >= 11,
    sign: id === 16 && t >= SEC.tanahnya + 0.35,
  };
};
export type WorldState = {
  id: number; f: number; t: number; u: number;
  setKind: SetKind; showStars: boolean; showMoon: boolean; coinRot: number;
};
export const worldState = (id: number, f: number): WorldState => {
  const s = SHOTS[id - 1];
  return { id, f, t: f / FPS, u: clamp01((f - s.a) / Math.max(1, s.b - s.a)), setKind: s.kind, showStars: false, showMoon: false, coinRot: 0 };
};

// ---- posisi aktor (meter) ----
export const bimoWalkX = (t: number) => -9 + 6.8 * clamp01(t / SEC.ganja); // shot 1: berjalan ke tengah lahan
export const COP_A = (t: number) => lerp(-9.5, -3.6, glide((t - SEC.lima) / 1.5));
export const COP_B = (t: number) => lerp(6.5, -0.9, glide((t - SEC.lima) / 1.5));
export const COP2_A = (t: number) => lerp(-9.5, -3.6, glide((t - SEC.polisi2) / 1.4));
export const COP2_B = (t: number) => lerp(6.5, -0.9, glide((t - SEC.polisi2) / 1.4));
export const COURT = { bimo: [0, 0, -0.1] as V3, judge: [0, 0.35, -3.7] as V3, cop: [-1.9, 0, -0.3] as V3 };
export const CELL = { bimo: [0.1, 0, -1.7] as V3 };
export const GATE = { x: 40, z: -2.8 };

// ---------------- Reference Camera Engine ----------------
export type CamPose = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<CamPose> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mix = (a: CamPose, b: CamPose, k: number): CamPose => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
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

// shot 1: crane/tracking wide -> medium tracking saat "hutan"
const S1a = (f: number) => { const b = bimoWalkX(T(f)); return dolly([b + 1.6, 2.6, 8.5], [b + 0.8, 1.0, 0], pushK(f, 0, 0.0014), { fov: 40, roll: -0.03 }); };
const S1b = (f: number) => { const b = bimoWalkX(T(f)); return dolly([b + 1.3, 1.4, 4.4], [b + 0.6, 1.3, 0], pushK(f, F("hutan"), 0.0014), { fov: 34, roll: 0.035 }); };
// shot 2: CU Bimo kaget -> cut ke ladang
const S2a = (f: number) => dolly([-1.95, 1.5, 2.3], [-2.2, 1.5, 0], pushK(f, F("ganja"), 0.004, 0.009, 14), { fov: 30, roll: -0.05 });
const S2b = (f: number) => dolly([-2.6, 1.3, 4.2], [2.0, 0.9, -3.2], pushK(f, F("ganja") + 14, 0.002), { fov: 46, roll: 0.045 });
// shot 3: polisi datang
const S3a = (f: number) => dolly([-2.3, 1.25, 8.6], [-2.3, 1.1, 0], pushK(f, F("lima"), 0.0010, 0.004, 20), { fov: 38, roll: -0.04 });
// shot 4-7 pengadilan
const S4a = (f: number) => dolly([0.1, 1.7, 6.0], [0, 1.2, -2.5], pushK(f, F("sidang"), 0.0022), { fov: 40, roll: 0.02 });
const S5a = (f: number) => dolly([0.55, 1.95, -1.5], [0.3, 1.45, -3.3], pushK(f, F("palu"), 0.0016), { fov: 32, roll: 0.05 });
const S6a = (f: number) => dolly([0.2, 1.5, 2.0], [0, 1.5, -0.1], pushK(f, F("dua0"), 0.0028, 0.007, 22), { fov: 30, roll: -0.04 });
const S7a = (f: number) => dolly([-0.4, 1.55, 5.0], [0, 1.3, -2.0], pushK(f, F("banding"), 0.0022), { fov: 38, roll: 0.025 });
// shot 8: gerbang penjara terbuka, Bimo keluar
const S8a = (f: number) => dolly([GATE.x, 1.3, 5.0], [GATE.x, 1.4, -2.0], pushK(f, F("bebas"), 0.0026, 0.007, 22), { fov: 40, roll: 0.03 });
// shot 9-10: di lahan
const S9a = (f: number) => dolly([-2.2, 1.45, 3.9], [-2.4, 1.3, 0], pushK(f, F("olah"), 0.0022), { fov: 34, roll: -0.03 });
const S10a = (f: number) => dolly([2.4, 2.0, 12.0], [2.7, 1.2, -1.0], pushK(f, F("rumah"), 0.0012), { fov: 44, roll: 0.03 });
const S11a = (f: number) => dolly([-1.5, 1.5, 5.2], [-1.9, 1.0, 0], pushK(f, F("sumur"), 0.002), { fov: 36, roll: 0.03 });
const S11b = (f: number) => dolly([-2.0, 0.55, 2.4], [-1.9, 0.7, 0], pushK(f, F("emas") - 20, 0.003, 0.009, 14), { fov: 32, roll: -0.07 });
// shot 12-13: emas
const S12a = (f: number) => dolly([-2.15, 1.3, 2.6], [-2.3, 1.3, 0.1], pushK(f, F("emas"), 0.0035, 0.01, 18), { fov: 30, roll: -0.05 });
const S13a = (f: number) => dolly([-1.9, 1.3, 3.6], [-2.4, 1.35, 0], pushK(f, F("hikmah"), 0.0011), { fov: 36, roll: 0.05 });
// shot 14: polisi lagi
const S14a = (f: number) => dolly([-2.2, 1.3, 8.6], [-2.2, 1.1, 0], pushK(f, F("polisi2"), 0.0010, 0.004, 20), { fov: 38, roll: -0.04 });
// shot 15: sel
const S15a = (f: number) => dolly([0.4, 1.4, 3.8], [0.1, 1.4, -1.6], pushK(f, F("penjara"), 0.0026), { fov: 36, roll: 0.03 });
// shot 16: tanah dikuasai pemerintah
const S16a = (f: number) => dolly([0.9, 1.5, 8.0], [0.9, 1.0, 0], pushK(f, F("tanahnya"), 0.0008, 0.005, 16), { fov: 40, roll: 0.02 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: F("hutan"), cut: true, s: S1b }],
  2: [{ f: F("ganja"), s: S2a }, { f: F("ganja") + 14, cut: true, s: S2b }],
  3: [{ f: F("lima"), s: S3a }], 4: [{ f: F("sidang"), s: S4a }], 5: [{ f: F("palu"), s: S5a }],
  6: [{ f: F("dua0"), s: S6a }], 7: [{ f: F("banding"), s: S7a }], 8: [{ f: F("bebas"), s: S8a }],
  9: [{ f: F("olah"), s: S9a }], 10: [{ f: F("rumah"), s: S10a }],
  11: [{ f: F("sumur"), s: S11a }, { f: F("emas") - 20, cut: true, s: S11b }],
  12: [{ f: F("emas"), s: S12a }], 13: [{ f: F("hikmah"), s: S13a }], 14: [{ f: F("polisi2"), s: S14a }],
  15: [{ f: F("penjara"), s: S15a }], 16: [{ f: F("tanahnya"), s: S16a }],
};

// kick 7 frame di momen penting
const KICKS: [number, number][] = [
  [SEC.ganja, 1.2], [SEC.lima, 0.9], [SEC.palu + 0.45, 1.6], [SEC.dua0, 1.3], [SEC.banding + 0.5, 1.1], [SEC.bebas, 1.0],
  [SEC.sumur + 1.9, 0.8], [SEC.emas - 0.35, 1.3], [SEC.emas, 1.5], [SEC.polisi2, 1.3], [SEC.tambang, 1.0], [SEC.penjara + 0.2, 1.2], [SEC.pemerintah, 1.3],
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

export const dofAt = (f: number): { cInf: number; focus?: (frame: number) => V3 } => {
  const s = shotAt(f);
  if ([2, 5, 6, 9, 12, 13, 15].includes(s.id) || (s.id === 11 && f >= F("emas") - 20)) return { cInf: 10.8 };
  return { cInf: 4.5, focus: () => [s.kind === "court" ? 0 : s.kind === "gate" ? GATE.x : -2.4, 1.1, 0] };
};
