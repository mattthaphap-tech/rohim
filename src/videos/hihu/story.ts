// "Ada Duit di Bawahmu! Hi hu!" (komedi absurd satir, ~105 dtk @ 30 fps).
// Desa Sukamaju: prank "Ada duit di bawahmu!" -> seluruh desa menunduk dan berteriak "Hi hu!" -> Pak Ujang (tukang bersih)
// menemukan peti 2 miliar dana desa di bawah ubin balai desa -> tak ada yang percaya -> ditahan polisi -> divonis 5 tahun,
// saksi utamanya Pak Lurah (yang menguburnya): "Saya sudah bilang berkali-kali, Pak, ada duit di bawahmu." -> semua menunduk. "Hi hu!"
// Semua cue dari anchors.json (hasil scripts/gen-hihu-assets.py dari voice/hihu.srt).
import { LightName } from "./lights";
import A from "./anchors.json";

export const FPS = 30;
const SEC = A as Record<string, number>;
export const F = (k: string) => Math.round(SEC[k] * FPS);
export const TOTAL = Math.ceil((SEC.end + 3.0) * FPS);
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export type SetKind = "desa" | "balai" | "polsek" | "court";
export type ShotDef = { id: number; a: number; b: number; light: LightName; kind: SetKind; sunAz?: number; sunEl?: number };
export const DX = 0, BX = 60, PX = 120, CX = 180; // pusat tiap set (x dunia)
export const DC = 4.0;                              // pusat kerumunan di alun-alun desa

const S = (id: number, a: string | number, b: string | number, kind: SetKind, light: LightName, sunAz = 50, sunEl = 50): ShotDef =>
  ({ id, a: typeof a === "string" ? F(a) : a, b: typeof b === "string" ? F(b) : b, kind, light, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, "prank", "desa", "day"),                       // Di Desa Sukamaju
  S(2, "prank", "menunduk1", "desa", "day"),             // anak-anak nge-prank "Ada duit di bawahmu!"
  S(3, "menunduk1", "hihu1", "desa", "day"),             // orang menunduk
  S(4, "hihu1", "seminggu", "desa", "golden", 46, 28),   // anak-anak: "Hi hu!"
  S(5, "seminggu", "warga1", "desa", "day"),             // seluruh desa ikut (ibu-ibu, Pak Lurah)
  S(6, "warga1", "ujang", "desa", "day"),                // warga berhenti menunduk, hafal triknya
  S(7, "ujang", "ubin", "balai", "day", 56, 48),         // Pak Ujang menyapu
  S(8, "ubin", "miliar", "balai", "day", 56, 48),        // ubin longgar, peti
  S(9, "miliar", "berlari", "balai", "golden", 50, 30),  // 2 miliar dana desa
  S(10, "berlari", "semua", "desa", "day"),              // berlari ke tengah desa
  S(11, "semua", "beneran", "desa", "day"),              // semua warga menunduk sebentar, "Hi hu!"
  S(12, "beneran", "apa", "desa", "day"),                // "Beneran, Pak, ada peti!"
  S(13, "apa", "melapor", "desa", "day"),                // "Apaan, tat!"
  S(14, "melapor", "polmenunduk", "desa", "day"),        // melapor ke polisi
  S(15, "polmenunduk", "tos", "polsek", "day", 56, 46),  // polisi menunduk, lalu mengangkat tangan
  S(16, "tos", "belakang", "polsek", "day", 56, 46),     // tos "Hi hu, Pak! Bagus, bagus."
  S(17, "belakang", "keringat", "polsek", "day", 56, 46),// Pak Lurah tertawa paling keras
  S(18, "keringat", "karena", "polsek", "day", 56, 46),  // berkeringat dingin
  S(19, "karena", "kantor", "balai", "day", 56, 48),     // membongkar lantai, membawa peti
  S(20, "kantor", "serius", "polsek", "day", 56, 46),    // menaruh peti di meja
  S(21, "serius", "dari", "polsek", "day", 56, 46),      // polisi berubah serius
  S(22, "dari", "ditahan", "polsek", "day", 56, 46),     // "Dari bawah balai desa, Pak." "Apaan, tat!"
  S(23, "ditahan", "vonis", "polsek", "day", 56, 46),    // Bapak ditahan
  S(24, "vonis", "saksi", "court", "day", 56, 46),       // divonis lima tahun
  S(25, "saksi", "saya", "court", "day", 56, 46),        // Pak Lurah saksi utama
  S(26, "saya", "seisi", "court", "day", 56, 46),        // "ada duit di bawahmu."
  S(27, "seisi", "hi", "court", "day", 56, 46),          // seisi ruang sidang menunduk
  S(28, "hi", TOTAL, "court", "golden", 50, 30),         // "Hi hu!" + end card
];

export const XFADE: Record<number, number> = {};
export const FLASH_AT = F("miliar");                     // white flash 4 frame: peti terbuka, 2 miliar

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

// ---- keadaan dunia menurut waktu ----
export const CHEST = { x: BX + 0.6, z: -0.9 };
export const balaiFlags = (t: number, id: number) => {
  const lift = glide((t - SEC.ubin) / 0.5);
  const tiles2 = id === 19 ? clamp01((t - SEC.bongkar) / 1.4) : 0;           // ubin lain dibongkar (0..1)
  return {
    tile: id === 7 ? 0 : id === 19 ? 1 : lift,                               // ubin utama: terangkat
    tiles2,
    chest: id === 8 || id === 9 ? glide((t - (SEC.peti - 0.15)) / 0.35) : id === 19 && t < SEC.bongkar + 1.6 ? 1 : 0,
    lid: id === 9 ? glide((t - (SEC.miliar - 0.1)) / 0.3) : id === 8 ? 0 : 1,
  };
};
export const polsekFlags = (t: number, id: number) => ({ chest: id >= 20 && t >= SEC.meja - 0.1 });

export type WorldState = {
  id: number; f: number; t: number; u: number;
  setKind: SetKind; showStars: boolean; showMoon: boolean; coinRot: number;
};
export const worldState = (id: number, f: number): WorldState => {
  const s = SHOTS[id - 1];
  return { id, f, t: f / FPS, u: clamp01((f - s.a) / Math.max(1, s.b - s.a)), setKind: s.kind, showStars: false, showMoon: false, coinRot: 0 };
};

// ---- posisi aktor (meter) ----
export const PRANK = { kidA: [DC - 0.95, 0, 0.35] as V3, kidB: [DC - 0.3, 0, 0.7] as V3, victim: [DC + 0.7, 0, 0] as V3 };
// 12 warga di alun-alun: 4 kolom x 3 baris; tipe: k=anak, i=ibu-ibu, m=pria, l=Pak Lurah
export const CROWD = [
  { x: DC - 1.2, z: 0.2, ty: "i", v: 0 }, { x: DC - 0.4, z: 0.2, ty: "m", v: 0 }, { x: DC + 0.4, z: 0.2, ty: "k", v: 0 }, { x: DC + 1.2, z: 0.2, ty: "i", v: 1 },
  { x: DC - 1.0, z: -0.6, ty: "k", v: 1 }, { x: DC - 0.2, z: -0.6, ty: "l", v: 0 }, { x: DC + 0.6, z: -0.6, ty: "m", v: 1 }, { x: DC + 1.4, z: -0.6, ty: "k", v: 2 },
  { x: DC - 1.3, z: -1.4, ty: "m", v: 1 }, { x: DC - 0.5, z: -1.4, ty: "i", v: 1 }, { x: DC + 0.3, z: -1.4, ty: "m", v: 0 }, { x: DC + 1.1, z: -1.4, ty: "i", v: 0 },
];
export const ujangRunX = (t: number) => -13 + 3.0 * clamp01((t - SEC.berlari) / (SEC.semua - SEC.berlari)) * (SEC.semua - SEC.berlari);
export const UJANG_STAND = [DC - 2.4, 0, 0.3] as V3;
export const BALAI = { ujang: [BX - 0.5, 0, 0.3] as V3 };
export const POLSEK = { police: [PX + 0.45, 0, -1.9] as V3, ujang: [PX - 0.3, 0, -0.6] as V3, lurah: [PX + 2.5, 0, -0.4] as V3, chest: [PX - 0.3, 0.82, -1.35] as V3 };
export const COURT = { judge: [CX, 0.35, -3.7] as V3, ujang: [CX - 0.9, 0, -0.3] as V3, lurah: [CX + 1.4, 0, -1.4] as V3, cop: [CX - 2.0, 0, -0.3] as V3 };
export const AUD = [-1.7, -1.1, -0.5, 0.5, 1.1, 1.7].map((x, i) => ({ x: CX + x, z: 2.2 + (i % 2) * 0.3 }));

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
const wide = (a: string, p: V3, l: V3, rate = 0.0010, fov = 40, roll = 0.03) => (f: number) => dolly(p, l, pushK(f, F(a), rate), { fov, roll });

const KID_A = PRANK.kidA, KID_B = PRANK.kidB;
const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: (f) => dolly([DC, 1.8, 11.5], [DC, 1.3, -1.5], pushK(f, 0, 0.0020), { fov: 44, roll: -0.03 }) }],
  2: [{ f: F("prank"), s: wide("prank", [DC - 0.1, 1.4, 5.4], [DC - 0.1, 1.0, 0.2], 0.0016, 38, -0.03) },
      { f: F("bawahmu") - 4, cut: true, s: cu("bawahmu", [KID_B[0] + 0.2, 1.05, 2.3], [KID_B[0], 1.0, 0.7], 0.003, 30, 0.05, 0.009) }],
  3: [{ f: F("menunduk1"), s: cu("menunduk1", [PRANK.victim[0] + 0.1, 1.45, 2.8], [PRANK.victim[0], 1.35, 0], 0.0026, 32, -0.04, 0.007) }],
  4: [{ f: F("hihu1"), s: (f) => dolly([DC + 0.2, 1.0, 5.4], [DC, 1.2, 0.4], pushK(f, F("hihu1"), 0.002, 0.01, 12), { fov: 40, roll: 0.07 }) }],
  5: [{ f: F("seminggu"), s: wide("seminggu", [DC, 1.5, 10.0], [DC, 1.0, -0.6], 0.0010, 42, -0.03) },
      { f: F("ibu"), cut: true, s: wide("ibu", [DC - 1.0, 1.2, 4.4], [DC - 0.9, 1.1, 0.0], 0.0016, 38, 0.04) },
      { f: F("lurah1"), cut: true, s: cu("lurah1", [DC - 0.1, 1.5, 3.2], [DC - 0.2, 1.4, -0.6], 0.003, 30, -0.05, 0.008) }],
  6: [{ f: F("warga1"), s: wide("warga1", [DC, 1.5, 10.0], [DC, 1.0, -0.6], 0.0008, 42, 0.02) }],
  7: [{ f: F("ujang"), s: wide("ujang", [BX, 1.5, 5.0], [BX + 0.1, 0.9, -0.5], 0.0016, 38, -0.03) }],
  8: [{ f: F("ubin"), s: (f) => dolly([BX + 0.4, 1.9, 1.9], [BX + 0.6, 0.2, -0.9], pushK(f, F("ubin"), 0.0022, 0.008, 18), { fov: 36, roll: 0.05 }) }],
  9: [{ f: F("miliar"), s: (f) => dolly([BX + 0.2, 1.2, 1.6], [BX + 0.6, 0.45, -0.9], pushK(f, F("miliar"), 0.0018, 0.01, 18), { fov: 32, roll: -0.05 }) }],
  10: [{ f: F("berlari"), s: (f) => { const x = ujangRunX(T(f)); return dolly([x + 1.4, 1.1, 4.8], [x + 0.6, 0.95, 0], pushK(f, F("berlari"), 0.0010), { fov: 38, roll: -0.04 }); } }],
  11: [{ f: F("semua"), s: wide("semua", [DC - 0.6, 1.6, 10.8], [DC - 0.6, 1.0, -0.4], 0.0010, 42, -0.03) }],
  12: [{ f: F("beneran"), s: cu("beneran", [UJANG_STAND[0] + 0.3, 1.45, 2.5], [UJANG_STAND[0], 1.45, 0.3], 0.0024, 30, -0.04, 0.007) }],
  13: [{ f: F("apa"), s: wide("apa", [DC - 0.6, 1.5, 9.5], [DC - 0.6, 1.0, -0.4], 0.0010, 42, 0.03) }],
  14: [{ f: F("melapor"), s: (f) => dolly([UJANG_STAND[0] + 1.2, 1.1, 5.0], [UJANG_STAND[0] - 0.4, 0.95, 0.3], pushK(f, F("melapor"), 0.0010), { fov: 38, roll: 0.04 }) }],
  15: [{ f: F("polmenunduk"), s: wide("polmenunduk", [PX, 1.5, 4.8], [PX, 1.1, -1.3], 0.0014, 38, -0.03) }],
  16: [{ f: F("tos"), s: cu("tos", [PX + 0.1, 1.6, 2.4], [PX + 0.05, 1.55, -1.0], 0.003, 32, 0.05, 0.01) }],
  17: [{ f: F("belakang"), s: cu("belakang", [POLSEK.lurah[0] + 0.2, 1.5, 2.5], [POLSEK.lurah[0], 1.5, -0.4], 0.0016, 30, -0.04, 0.007) }],
  18: [{ f: F("keringat"), s: cu("keringat", [POLSEK.lurah[0] + 0.1, 1.55, 1.9], [POLSEK.lurah[0], 1.55, -0.4], 0.0026, 28, 0.04, 0.007) }],
  19: [{ f: F("karena"), s: wide("karena", [BX + 0.4, 1.6, 5.0], [BX + 0.4, 0.8, -0.6], 0.0012, 40, 0.03) }],
  20: [{ f: F("kantor"), s: wide("kantor", [PX, 1.5, 4.8], [PX, 1.0, -1.1], 0.0014, 38, -0.03) }],
  21: [{ f: F("serius"), s: cu("serius", [POLSEK.police[0] + 0.2, 1.6, 0.4], [POLSEK.police[0], 1.55, -1.9], 0.0016, 30, 0.04, 0.007) }],
  22: [{ f: F("dari"), s: cu("dari", [POLSEK.ujang[0] + 0.2, 1.5, 2.0], [POLSEK.ujang[0], 1.45, -0.6], 0.0018, 30, -0.04, 0.007) },
       { f: F("ditahan") - 55, cut: true, s: cu("ditahan", [POLSEK.police[0] + 0.1, 1.6, 0.4], [POLSEK.police[0], 1.55, -1.9], 0.0018, 30, 0.05, 0.007) }],
  23: [{ f: F("ditahan"), s: wide("ditahan", [PX, 1.4, 4.6], [PX, 1.0, -1.1], 0.0020, 36, -0.05) }],
  24: [{ f: F("vonis"), s: wide("vonis", [CX - 0.2, 1.7, 5.6], [CX - 0.2, 1.2, -1.6], 0.0014, 40, 0.03) },
       { f: F("vonis") + 66, cut: true, s: cu("vonis", [COURT.ujang[0] + 0.2, 1.5, 1.9], [COURT.ujang[0], 1.5, -0.3], 0.002, 30, -0.04, 0.007) }],
  25: [{ f: F("saksi"), s: cu("saksi", [COURT.lurah[0] + 0.2, 1.5, 1.7], [COURT.lurah[0], 1.5, -1.4], 0.0016, 30, 0.04, 0.007) }],
  26: [{ f: F("saya"), s: cu("saya", [COURT.lurah[0] - 0.1, 1.55, 1.4], [COURT.lurah[0], 1.5, -1.4], 0.0028, 30, -0.05, 0.009) }],
  27: [{ f: F("seisi"), s: wide("seisi", [CX, 1.7, 9.8], [CX, 1.1, -1.4], 0.0008, 46, 0.03) }],
  28: [{ f: F("hi"), s: wide("hi", [CX, 1.7, 9.8], [CX, 1.1, -1.4], 0.0008, 46, -0.03) }],
};

const KICKS: [number, number][] = [
  [SEC.bawahmu, 1.2], [SEC.hihu1, 1.4], [SEC.seminggu, 0.9], [SEC.ibu, 0.8], [SEC.lurah1, 1.0], [SEC.ujang, 0.8], [SEC.ubin + 0.3, 1.0],
  [SEC.peti, 1.3], [SEC.miliar, 1.6], [SEC.semua, 0.9], [SEC.hihu2, 1.3], [SEC.apa, 1.0], [SEC.tos, 1.4], [SEC.hihu3, 1.1], [SEC.lurah2, 0.9],
  [SEC.keringat, 1.0], [SEC.meja, 1.4], [SEC.serius, 1.2], [SEC.ditahan, 1.5], [SEC.vonis + 0.55, 1.5], [SEC.saya, 0.9], [SEC.bawahmu2, 1.3],
  [SEC.seisi, 0.8], [SEC.hi, 1.5], [SEC.hu, 1.2],
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
  if ([3, 8, 9, 12, 16, 17, 18, 21, 22, 25, 26].includes(s.id) || (s.id === 2 && f >= F("bawahmu") - 4)) return { cInf: 10.8 };
  const cx = s.kind === "desa" ? DC : s.kind === "balai" ? BX : s.kind === "polsek" ? PX : CX;
  return { cInf: 4.5, focus: () => [cx, 1.1, 0] };
};
