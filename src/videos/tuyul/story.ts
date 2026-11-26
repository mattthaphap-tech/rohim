// "Tuyul Mogok Kerja" (komedi absurd, ~98 dtk @ 30 fps). Pak Slamet bosan miskin -> dukun memberi tuyul + kontrak ->
// tuyul mencuri, Pak Slamet beli motor/TV/kulkas -> semua tetangga juga punya tuyul, semua tuyul saling mencuri ->
// uang desa tidak bertambah tapi "ekonomi tumbuh 300%" -> tuyul mogok -> semua lemari kosong ->
// "ternyata selama ini yang kerja bukan saya."
// Semua cue dari anchors.json (hasil scripts/gen-tuyul-assets.py dari voice/tuyul.srt).
import { LightName } from "./lights";
import A from "./anchors.json";

export const FPS = 30;
const SEC = A as Record<string, number>;
export const F = (k: string) => Math.round(SEC[k] * FPS);
export const TOTAL = Math.ceil((SEC.end + 3.0) * FPS); // +3 dtk ekor untuk end card
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export type SetKind = "house" | "hut" | "street" | "field" | "balai";
export type ShotDef = { id: number; a: number; b: number; light: LightName; kind: SetKind; sunAz?: number; sunEl?: number };
// pusat tiap set (x dunia)
export const HX = 0, UX = 60, SX = 120, LX = 180, BX = 240;

const S = (id: number, a: string | number, b: string | number, kind: SetKind, light: LightName, sunAz = 50, sunEl = 46): ShotDef =>
  ({ id, a: typeof a === "string" ? F(a) : a, b: typeof b === "string" ? F(b) : b, kind, light, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, "dukun", "house", "day"),                       // bosan miskin
  S(2, "dukun", "dukun2", "hut", "night"),                // ke dukun, minta tuyul
  S(3, "dukun2", "kontrak", "hut", "night"),              // dukun menyerahkan tuyul + kertas
  S(4, "kontrak", "kok", "hut", "night"),                 // CU kontrak
  S(5, "kok", "zaman", "hut", "night"),                   // "Tuyul kok pakai kontrak?"
  S(6, "zaman", "bekerja", "hut", "night"),               // "Zaman sudah berubah, Pak."
  S(7, "bekerja", "lemari", "street", "night", 40, 38),   // tuyul mencuri
  S(8, "lemari", "motor", "house", "night", 40, 38),      // lemari terisi
  S(9, "motor", "kulkas", "house", "golden", 52, 34),     // motor, TV pop
  S(10, "kulkas", "tetangganya", "house", "golden", 52, 34), // kulkas pop, bangga
  S(11, "tetangganya", "saling", "street", "golden", 52, 30), // tetangga juga kaya
  S(12, "saling", "tidak", "street", "night", 40, 38),    // saling mencuri (crane)
  S(13, "tidak", "makmur", "street", "night", 40, 38),    // uang pindah-pindah
  S(14, "makmur", "lurah", "balai", "day"),               // warga merasa makmur
  S(15, "lurah", "persen", "balai", "day"),               // Pak Lurah mengumumkan
  S(16, "persen", "suatu", "balai", "day"),               // 300%
  S(17, "suatu", "spanduk", "field", "night", 40, 38),    // tuyul berkumpul di lapangan
  S(18, "spanduk", "membujuk", "field", "night", 40, 38), // spanduk
  S(19, "membujuk", "bapak", "field", "night", 40, 38),   // Pak Slamet membujuk
  S(20, "bapak", "ketua", "field", "night", 40, 38),      // "bonus satu permen"
  S(21, "ketua", "kalau", "field", "night", 40, 38),      // ketua tuyul dingin
  S(22, "kalau", "malam", "field", "night", 40, 38),      // "uang Bapak dari mana?"
  S(23, "malam", "besok", "field", "night", 40, 38),      // semua tuyul mogok
  S(24, "besok", "kosong", "street", "day"),              // besok paginya
  S(25, "kosong", "terduduk", "house", "day"),            // lemari kosong
  S(26, "terduduk", "berbisik", "house", "day"),          // terduduk
  S(27, "berbisik", "ternyata", "house", "day"),          // berbisik
  S(28, "ternyata", TOTAL, "house", "day"),               // "yang kerja bukan saya" + end card
];

export const XFADE: Record<number, number> = {};
export const FLASH_AT = F("persen");                      // white flash 4 frame di "300%"

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// ---- keadaan dunia menurut waktu ----
export const houseFlags = (t: number, id: number) => {
  const pop = (a: number) => (t >= a ? glide((t - a) / 0.3) : 0);
  const stage = id === 8 ? Math.min(3, Math.floor(((t - SEC.lemari) / (SEC.motor - SEC.lemari)) * 3.4) + 1) : id >= 9 && id <= 10 ? 3 : 0;
  const open = id === 1 ? 0.55 : id === 8 ? glide((t - (SEC.lemari - 0.2)) / 0.5) : id >= 25 ? glide((t - (SEC.kosong - 0.1)) / 0.5) : id === 9 || id === 10 ? 0.0 : 0;
  return {
    doors: open,
    money: id === 1 ? 0 : stage,
    motor: id >= 9 || t >= SEC.kulkas ? pop(SEC.motor) : 0,
    tv: id >= 9 ? pop(SEC.tv) : 0,
    kulkas: id >= 9 ? pop(SEC.kulkas) : 0,
  };
};
export const streetFlags = (t: number, id: number) => ({
  neighborItems: id === 11 || id === 24 ? t >= SEC.tetangganya || id === 24 : id >= 12,
  peekTuyul: id === 11 && t >= SEC.tetangganya + 3.6,
});

export type WorldState = {
  id: number; f: number; t: number; u: number;
  setKind: SetKind; showStars: boolean; showMoon: boolean; coinRot: number;
};
export const worldState = (id: number, f: number): WorldState => {
  const s = SHOTS[id - 1];
  const nightOut = s.light === "night" && (s.kind === "street" || s.kind === "field");
  return { id, f, t: f / FPS, u: clamp01((f - s.a) / Math.max(1, s.b - s.a)), setKind: s.kind, showStars: nightOut, showMoon: false, coinRot: 0 };
};

// ---- posisi aktor (meter) ----
export const HOME = { slamet: [-0.7, 0, -0.4] as V3, tuyul: [0.9, 0, -1.5] as V3, stool: [-0.7, 0, -0.4] as V3 };
export const HUT = { dukun: [UX + 0.1, 0, -2.3] as V3, slamet: [UX - 0.95, 0, 0.2] as V3, tuyul: [UX + 0.95, 0, -0.5] as V3 };
export const STREET_XS = [SX - 9, SX - 4.5, SX, SX + 4.5, SX + 9]; // pusat 5 rumah (z = -6)
export const tuyulStreetX = (t: number) => SX - 3.5 + 7 * clamp01((t - SEC.bekerja) / (SEC.lemari - SEC.bekerja));
export const FIELD = { ketua: [LX, 0, 0.9] as V3, slamet: [LX + 1.0, 0, 0.5] as V3 };
export const BALAI = { lurah: [BX, 0.5, -3.5] as V3 };
// tuyul mondar-mandir (shot 12-13): 8 tuyul di jalur z berbeda
export const RUNNERS = Array.from({ length: 8 }, (_, i) => ({ lane: -1.2 + (i % 4) * 0.8 + (i > 3 ? 0.4 : 0), sp: 0.5 + 0.12 * i, ph: i * 0.9 }));
export const runnerX = (i: number, t: number) => SX + 2.8 * Math.sin(RUNNERS[i].ph + t * RUNNERS[i].sp);
export const runnerDir = (i: number, t: number) => Math.cos(RUNNERS[i].ph + t * RUNNERS[i].sp) >= 0 ? 1 : -1;
// kerumunan tuyul di lapangan: 5 kolom x 3 baris
export const CROWD = Array.from({ length: 15 }, (_, i) => ({ x: LX - 1.2 + (i % 5) * 0.6, z: -0.1 - Math.floor(i / 5) * 0.8, enter: SEC.suatu + 0.15 * i }));
// warga di balai desa
export const AUDIENCE = [BX - 2.1, BX - 0.9, BX + 0.5, BX + 1.7].map((x, i) => ({ x, z: 0.9 + (i % 2) * 0.5 }));

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
const cu = (a: string, p: V3, l: V3, rate = 0.003, fov = 30, roll = 0.04, punch = 0.008): ((f: number) => Shot) =>
  (f) => dolly(p, l, pushK(f, F(a), rate, punch, 16), { fov, roll });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: (f) => dolly([-0.35, 1.4, 4.6], [-0.35, 1.2, -1.5], pushK(f, 0, 0.0026), { fov: 38, roll: -0.03 }) }],
  2: [{ f: F("dukun"), s: (f) => dolly([UX, 1.4, 4.8], [UX, 1.2, -1.4], pushK(f, F("dukun"), 0.0016), { fov: 42, roll: 0.03 }) }],
  3: [{ f: F("dukun2"), s: (f) => dolly([UX, 1.3, 4.8], [UX, 1.15, -1.2], pushK(f, F("dukun2"), 0.0010), { fov: 42, roll: -0.03 }) },
      { f: F("kertas"), cut: true, s: (f) => dolly([UX + 0.1, 1.4, 2.8], [UX + 0.1, 1.35, -1.2], pushK(f, F("kertas"), 0.0028, 0.007, 16), { fov: 34, roll: 0.05 }) }],
  4: [{ f: F("kontrak"), s: (f) => dolly([UX, 1.3, 3.2], [UX, 1.25, 0.4], pushK(f, F("kontrak"), 0.0014, 0.006, 14), { fov: 34, roll: -0.03 }) }],
  5: [{ f: F("kok"), s: cu("kok", [HUT.slamet[0] + 0.2, 1.5, 2.0], [HUT.slamet[0], 1.5, 0.2], 0.0035, 30, -0.05, 0.009) }],
  6: [{ f: F("zaman"), s: cu("zaman", [HUT.dukun[0] + 0.3, 1.5, 0.2], [HUT.dukun[0], 1.55, -2.3], 0.0014, 30, 0.04, 0.006) }],
  7: [{ f: F("bekerja"), s: (f) => { const x = tuyulStreetX(T(f)); return dolly([x + 0.9, 0.95, 4.0], [x + 0.35, 0.65, 0], pushK(f, F("bekerja"), 0.0010), { fov: 36, roll: -0.04 }); } }],
  8: [{ f: F("lemari"), s: (f) => dolly([0.5, 1.5, 4.8], [0.2, 1.1, -1.8], pushK(f, F("lemari"), 0.0022, 0.006, 20), { fov: 38, roll: 0.04 }) }],
  9: [{ f: F("motor"), s: (f) => dolly([0.2, 1.8, 10.5], [0.2, 1.1, -1.0], pushK(f, F("motor"), 0.0016, 0.007, 14), { fov: 44, roll: -0.03 }) }],
  10: [{ f: F("kulkas"), s: cu("kulkas", [-0.4, 1.4, 3.4], [-0.55, 1.25, -0.4], 0.0022, 34, 0.035, 0.007) }],
  11: [{ f: F("tetangganya"), s: (f) => dolly([STREET_XS[1], 1.6, 9.5], [STREET_XS[1], 1.2, -3], pushK(f, F("tetangganya"), 0.0008), { fov: 40, roll: -0.03 }) },
       { f: F("tetangganya") + 66, dur: 40, s: () => ({ pos: [STREET_XS[2], 1.6, 9.5], look: [STREET_XS[2], 1.2, -3], fov: 40, roll: 0.02 }) },
       { f: F("tetangganya") + 130, dur: 40, s: () => ({ pos: [STREET_XS[3], 1.5, 8.5], look: [STREET_XS[3], 1.2, -3], fov: 38, roll: -0.03 }) }],
  12: [{ f: F("saling"), s: (f) => dolly([SX, 7.6, 9.0], [SX, 0.3, -1.0], pushK(f, F("saling"), 0.0010), { fov: 42, roll: 0.03 }) }],
  13: [{ f: F("tidak"), s: (f) => dolly([SX - 2.5, 0.6, 6.5], [SX + 1.0, 1.0, 0], pushK(f, F("tidak"), 0.0009), { fov: 40, roll: 0.08 }) }],
  14: [{ f: F("makmur"), s: (f) => dolly([BX, 1.6, 8.5], [BX, 1.1, -1.5], pushK(f, F("makmur"), 0.0016), { fov: 40, roll: -0.03 }) }],
  15: [{ f: F("lurah"), s: cu("lurah", [BX, 2.0, 0.6], [BX, 2.0, -3.5], 0.0022, 30, -0.03, 0.007) }],
  16: [{ f: F("persen"), s: (f) => dolly([BX, 1.8, 9.0], [BX, 1.8, -3.0], pushK(f, F("persen"), 0.0014, 0.01, 18), { fov: 40, roll: 0.03 }) }],
  17: [{ f: F("suatu"), s: (f) => dolly([LX, 1.3, 6.4], [LX, 1.0, -1.5], pushK(f, F("suatu"), 0.0010), { fov: 40, roll: -0.03 }) }],
  18: [{ f: F("spanduk"), s: (f) => dolly([LX, 2.4, 6.6], [LX, 2.3, -3.2], pushK(f, F("spanduk"), 0.0008, 0.008, 16), { fov: 34, roll: 0.04 }) }],
  19: [{ f: F("membujuk"), s: cu("membujuk", [FIELD.slamet[0] + 0.2, 1.5, 2.4], [FIELD.slamet[0], 1.5, 0.5], 0.0022, 30, -0.04, 0.007) }],
  20: [{ f: F("bapak"), s: cu("bapak", [FIELD.slamet[0] + 0.3, 1.35, 2.1], [FIELD.slamet[0] + 0.1, 1.35, 0.5], 0.0024, 30, 0.04, 0.007) }],
  21: [{ f: F("ketua"), s: cu("ketua", [LX + 0.1, 1.05, 2.5], [LX, 1.05, 0.9], 0.0016, 30, -0.03, 0.006) }],
  22: [{ f: F("kalau"), s: cu("kalau", [FIELD.slamet[0] + 0.2, 1.5, 2.4], [FIELD.slamet[0], 1.5, 0.5], 0.0016, 30, 0.04, 0.006) }],
  23: [{ f: F("malam"), s: (f) => dolly([LX, 1.4, 6.4], [LX, 0.9, -1.5], pushK(f, F("malam"), 0.0012, 0.006, 16), { fov: 40, roll: 0.035 }) }],
  24: [{ f: F("besok"), s: (f) => dolly([SX - 1.9, 1.5, 6.5], [SX - 1.9, 1.2, -3.5], pushK(f, F("besok"), 0.0008), { fov: 40, roll: -0.03 }) }],
  25: [{ f: F("kosong"), s: (f) => dolly([-0.3, 1.5, 4.8], [-0.3, 1.1, -1.8], pushK(f, F("kosong"), 0.0014, 0.006, 16), { fov: 38, roll: 0.035 }) }],
  26: [{ f: F("terduduk"), s: (f) => dolly([-0.3, 1.0, 3.6], [-0.7, 0.8, -0.4], pushK(f, F("terduduk"), 0.0020, 0.008, 14), { fov: 34, roll: -0.05 }) }],
  27: [{ f: F("berbisik"), s: cu("berbisik", [-0.7, 1.1, 2.1], [-0.7, 1.0, -0.4], 0.0026, 28, 0.03, 0.007) }],
  28: [{ f: F("ternyata"), s: (f) => dolly([-0.7, 1.05, 2.2], [-0.7, 1.0, -0.4], pushK(f, F("ternyata"), 0.0014), { fov: 28, roll: -0.025 }) }],
};

const KICKS: [number, number][] = [
  [SEC.dukun, 0.8], [SEC.kertas, 0.9], [SEC.kontrak, 1.3], [SEC.kok, 1.0], [SEC.zaman, 1.2], [SEC.lemari, 0.9], [SEC.motor, 1.1], [SEC.kulkas, 1.1],
  [SEC.tetangganya, 0.9], [SEC.tidak, 1.3], [SEC.lurah, 0.8], [SEC.persen, 1.6], [SEC.suatu, 0.8], [SEC.lelah, 1.2], [SEC.permen, 0.9],
  [SEC.ketua, 1.1], [SEC.kalau, 0.9], [SEC.mogok, 1.4], [SEC.kosong, 1.2], [SEC.terduduk, 1.3], [SEC.ternyata, 0.8],
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
  if ([2, 4, 5, 6, 10, 15, 18, 19, 20, 21, 22, 26, 27, 28].includes(s.id)) return { cInf: 10.8 };
  const cx = s.kind === "house" ? 0 : s.kind === "hut" ? UX : s.kind === "street" ? SX : s.kind === "field" ? LX : BX;
  return { cInf: 4.5, focus: () => [cx, 1.1, 0] };
};
