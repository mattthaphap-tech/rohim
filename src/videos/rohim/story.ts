// "Gilanya Meyakinkan" (komedi absurd satir, ~110 dtk @ 30 fps).
// Pak Rohim kena tilang -> pakai panci di kepala, "motor ini anak kandung saya" -> surat dokter "gilanya sangat meyakinkan" ->
// seluruh kampung ikut "gila" -> Pak Lurah bangga, tim audit datang -> "KAMI GILA!" terlalu kompak = tanda waras, surat dicabut ->
// hanya Pak Rohim yang gila asli, jadi maskot desa -> padahal sudah sembuh diam-diam, tak bisa mengaku karena kena pajak 5 tahun.
// Semua cue dari anchors.json (hasil scripts/gen-rohim-assets.py dari voice/rohim.srt).
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

export type SetKind = "jalan" | "klinik" | "desa";
export type ShotDef = { id: number; a: number; b: number; light: LightName; kind: SetKind; sunAz?: number; sunEl?: number };
export const JX = 0, KX = 60, DC = 124; // pusat tiap set (x dunia); DC = pusat alun-alun kampung

const S = (id: number, a: string | number, b: string | number, kind: SetKind, light: LightName, sunAz = 50, sunEl = 50): ShotDef =>
  ({ id, a: typeof a === "string" ? F(a) : a, b: typeof b === "string" ? F(b) : b, kind, light, sunAz, sunEl });
export const SHOTS: ShotDef[] = [
  S(1, 0, "panik", "jalan", "day"),                     // kena tilang lima pelanggaran
  S(2, "panik", "panci", "jalan", "day"),               // panik
  S(3, "panci", "polisi", "jalan", "day"),              // panci di kepala, "anak kandung saya"
  S(4, "polisi", "surat", "jalan", "day"),              // polisi mengangguk, ODGJ tak bisa ditilang
  S(5, "surat", "dokter", "jalan", "day"),              // "Silakan bawa surat dokter."
  S(6, "dokter", "gilanya", "klinik", "day", 56, 46),   // dokter memeriksa
  S(7, "gilanya", "bebas", "klinik", "day", 56, 46),    // "Gilanya sangat meyakinkan."
  S(8, "bebas", "tetangganya", "klinik", "golden", 50, 30), // bebas denda, pajak, utang
  S(9, "tetangganya", "puskesmas", "desa", "day"),      // tetangga melihat
  S(10, "puskesmas", "sebulan", "klinik", "day", 56, 46), // Puskesmas penuh orang berpanci
  S(11, "sebulan", "lurah", "desa", "day"),             // seluruh kampung resmi gila
  S(12, "lurah", "bansos", "desa", "day"),              // Pak Lurah mengumumkan
  S(13, "bansos", "audit", "desa", "day"),              // penerima bansos terbesar
  S(14, "audit", "berbaris", "desa", "day"),            // tim audit datang
  S(15, "berbaris", "kami", "desa", "day"),             // warga berbaris rapi
  S(16, "kami", "mencatat", "desa", "day"),             // "KAMI GILA!"
  S(17, "mencatat", "kekompakan", "desa", "day"),       // auditor mencatat, "tidak bisa sekompak ini"
  S(18, "kekompakan", "dicabut", "desa", "day"),        // kekompakan adalah tanda waras
  S(19, "dicabut", "lemas", "desa", "day"),             // semua surat dicabut, pajak 5 tahun
  S(20, "lemas", "menyuapi", "desa", "day"),            // warga lemas, hanya Pak Rohim tak peduli
  S(21, "menyuapi", "menatap", "desa", "golden", 46, 30), // menyuapi panci, bernyanyi pada ayam
  S(22, "menatap", "satu", "desa", "day"),              // "gila asli", surat dipertahankan
  S(23, "satu", "jumat", "desa", "golden", 46, 28),     // satu-satunya bebas pajak, maskot desa
  S(24, "jumat", "sembuh", "desa", "golden", 46, 26),   // tiap Jumat latihan jadi gila
  S(25, "sembuh", "kalau", "desa", "day"),              // sudah sembuh diam-diam
  S(26, "kalau", "kena", "desa", "day"),                // "kalau ia mengaku waras..."
  S(27, "kena", TOTAL, "desa", "day"),                  // "ia kena pajak lima tahun."
];

export const XFADE: Record<number, number> = {};
export const FLASH_AT = F("gilanya");                    // white flash 4 frame: surat dokter "gilanya sangat meyakinkan"

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

export type WorldState = {
  id: number; f: number; t: number; u: number;
  setKind: SetKind; showStars: boolean; showMoon: boolean; coinRot: number;
};
export const worldState = (id: number, f: number): WorldState => {
  const s = SHOTS[id - 1];
  return { id, f, t: f / FPS, u: clamp01((f - s.a) / Math.max(1, s.b - s.a)), setKind: s.kind, showStars: false, showMoon: false, coinRot: 0 };
};
export const mascotFlag = (id: number) => id === 23;
export const stageFlag = (id: number) => id === 12 || id === 13;

// ---- posisi aktor (meter) ----
export const ROH = { x: -0.05, z: 0.3 };                       // Pak Rohim di jalan
export const MOTOR = { x: -1.25, z: 0.15 };
export const POL = { x: 1.15, z: 0.3 };
export const KLINIK = { doctor: [KX + 0.7, 0, -1.9] as V3, rohim: [KX - 0.5, 0, -0.5] as V3 };
export const QUEUE = Array.from({ length: 8 }, (_, i) => ({ x: KX - 1.6 + i * 0.46, z: 0.5, ty: ["i", "m", "k", "m", "i", "k", "m", "i"][i], v: i % 3 }));
export const LURAH = [DC, 0.5, -3.5] as V3;
// 12 warga: 4 kolom x 3 baris; tipe: k=anak, i=ibu-ibu, m=pria, l=ditempati Pak Lurah (dipindah ke panggung)
export const CROWD = [
  { x: DC - 1.2, z: 0.2, ty: "i", v: 0 }, { x: DC - 0.4, z: 0.2, ty: "m", v: 0 }, { x: DC + 0.4, z: 0.2, ty: "k", v: 0 }, { x: DC + 1.2, z: 0.2, ty: "i", v: 1 },
  { x: DC - 1.0, z: -0.6, ty: "k", v: 1 }, { x: DC - 0.2, z: -0.6, ty: "m", v: 1 }, { x: DC + 0.6, z: -0.6, ty: "m", v: 0 }, { x: DC + 1.4, z: -0.6, ty: "k", v: 2 },
  { x: DC - 1.3, z: -1.4, ty: "m", v: 1 }, { x: DC - 0.5, z: -1.4, ty: "i", v: 1 }, { x: DC + 0.3, z: -1.4, ty: "m", v: 0 }, { x: DC + 1.1, z: -1.4, ty: "i", v: 0 },
];
export const AUD1 = [DC + 1.9, 0, 1.3] as V3, AUD2 = [DC + 2.7, 0, 1.0] as V3;
export const audX = (t: number, i: number) => (i === 0 ? AUD1[0] : AUD2[0]) + 7 * (1 - glide((t - SEC.audit - 0.2 * i) / 1.8));   // auditor berjalan masuk dari kanan
export const ROH_SIT = [DC + 1.5, 0, 1.5] as V3;
export const ROH_END = [DC, 0, 0.8] as V3;

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
const wide = (a: string, p: V3, l: V3, rate = 0.0010, fov = 42, roll = 0.03) => (f: number) => dolly(p, l, pushK(f, F(a), rate), { fov, roll });

const JW = (a: string) => wide(a, [JX, 1.5, 6.8], [JX, 1.0, 0], 0.0012, 44, -0.03);
const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: JW("start") }],
  2: [{ f: F("panik"), s: cu("panik", [ROH.x + 0.2, 1.5, 2.4], [ROH.x, 1.5, ROH.z], 0.0032, 30, -0.05, 0.009) }],
  3: [{ f: F("panci"), s: cu("panci", [ROH.x + 0.2, 1.5, 3.4], [ROH.x, 1.45, ROH.z], 0.0022, 34, 0.04, 0.010) },
      { f: F("motor"), cut: true, s: cu("motor", [-0.65, 1.3, 4.5], [-0.65, 1.0, 0.3], 0.0010, 38, -0.04, 0.008) }],
  4: [{ f: F("polisi"), s: cu("polisi", [POL.x + 0.2, 1.5, 2.4], [POL.x, 1.5, POL.z], 0.0024, 30, 0.04, 0.007) },
      { f: F("gangguan") - 4, cut: true, s: JW("gangguan") }],
  5: [{ f: F("surat"), s: cu("surat", [POL.x - 0.1, 1.5, 2.4], [POL.x, 1.5, POL.z], 0.0014, 30, -0.04, 0.007) }],
  6: [{ f: F("dokter"), s: wide("dokter", [KX, 1.5, 5.4], [KX, 1.0, -1.0], 0.0016, 40, 0.03) }],
  7: [{ f: F("gilanya"), s: cu("gilanya", [KLINIK.doctor[0] + 0.2, 1.5, 0.4], [KLINIK.doctor[0], 1.5, KLINIK.doctor[2]], 0.0028, 30, -0.05, 0.010) }],
  8: [{ f: F("bebas"), s: (f) => dolly([KX + 0.1, 1.4, 4.4], [KX + 0.1, 1.3, -0.9], pushK(f, F("bebas"), 0.0010, 0.007, 18), { fov: 38, roll: 0.05 }) }],
  9: [{ f: F("tetangganya"), s: cu("tetangganya", [DC - 0.55, 1.5, 4.4], [DC - 0.55, 1.4, 0.2], 0.0010, 34, -0.04, 0.007) }],
  10: [{ f: F("puskesmas"), s: wide("puskesmas", [KX, 1.5, 8.2], [KX, 1.0, -0.2], 0.0010, 44, 0.03) }],
  11: [{ f: F("sebulan"), s: wide("sebulan", [DC, 1.5, 10.0], [DC, 1.0, -0.5], 0.0010, 42, -0.03) }],
  12: [{ f: F("lurah"), s: cu("lurah", [LURAH[0], 2.0, 0.6], [LURAH[0], 2.0, LURAH[2]], 0.0016, 30, -0.03, 0.007) }],
  13: [{ f: F("bansos"), s: wide("bansos", [DC, 1.6, 10.5], [DC, 1.2, -1.5], 0.0010, 42, 0.03) }],
  14: [{ f: F("audit"), s: wide("audit", [DC + 1.0, 1.5, 9.0], [DC + 1.0, 1.0, 0], 0.0010, 42, -0.03) }],
  15: [{ f: F("berbaris"), s: wide("berbaris", [DC, 1.5, 10.0], [DC, 1.0, -0.5], 0.0012, 42, 0.02) }],
  16: [{ f: F("kami"), s: (f) => dolly([DC, 1.2, 8.0], [DC, 1.1, -0.5], pushK(f, F("kami"), 0.0024, 0.01, 16), { fov: 42, roll: -0.05 }) }],
  17: [{ f: F("mencatat"), s: cu("mencatat", [AUD1[0] + 0.2, 1.5, 3.6], [AUD1[0], 1.5, AUD1[2]], 0.0014, 30, -0.04, 0.007) },
       { f: F("orang") - 4, cut: true, s: cu("orang", [AUD1[0] - 0.1, 1.55, 2.8], [AUD1[0], 1.5, AUD1[2]], 0.0024, 28, 0.05, 0.008) }],
  18: [{ f: F("kekompakan"), s: cu("kekompakan", [AUD1[0] + 0.15, 1.5, 3.0], [AUD1[0], 1.5, AUD1[2]], 0.0020, 30, -0.04, 0.007) }],
  19: [{ f: F("dicabut"), s: wide("dicabut", [DC + 1.6, 1.5, 6.4], [DC + 1.6, 1.1, 0.6], 0.0012, 40, 0.03) }],
  20: [{ f: F("lemas"), s: wide("lemas", [DC + 0.8, 1.4, 10.0], [DC + 0.8, 0.9, -0.5], 0.0008, 44, 0.035) }],
  21: [{ f: F("menyuapi"), s: (f) => dolly([ROH_SIT[0] + 0.4, 1.2, 4.4], [ROH_SIT[0] + 0.25, 0.85, ROH_SIT[2]], pushK(f, F("menyuapi"), 0.0010, 0.006, 18), { fov: 34, roll: -0.04 }) }],
  22: [{ f: F("menatap"), s: cu("menatap", [AUD1[0] + 0.2, 1.5, 3.4], [AUD1[0], 1.5, AUD1[2]], 0.0014, 30, 0.04, 0.007) },
       { f: F("asli") - 4, cut: true, s: wide("asli", [DC + 1.8, 1.4, 5.6], [DC + 1.8, 1.0, 1.3], 0.0014, 38, -0.04) }],
  23: [{ f: F("satu"), s: (f) => dolly([DC, 1.8, 5.4], [DC, 1.4, 0], pushK(f, F("satu"), 0.0014, 0.007, 18), { fov: 38, roll: 0.04 }) }],
  24: [{ f: F("jumat"), s: wide("jumat", [DC, 1.5, 10.0], [DC, 1.0, -0.5], 0.0010, 42, -0.03) },
       { f: F("latihan"), dur: 40, s: (f) => dolly([DC, 1.3, 7.4], [DC, 1.0, -0.5], pushK(f, F("latihan"), 0.0012), { fov: 42, roll: 0.05 }) }],
  25: [{ f: F("sembuh"), s: cu("sembuh", [ROH_END[0] + 0.25, 1.5, 3.2], [ROH_END[0], 1.5, ROH_END[2]], 0.0014, 30, -0.04, 0.007) }],
  26: [{ f: F("kalau"), s: cu("kalau", [ROH_END[0] - 0.1, 1.5, 2.6], [ROH_END[0], 1.5, ROH_END[2]], 0.0030, 28, 0.05, 0.008) }],
  27: [{ f: F("kena"), s: cu("kena", [ROH_END[0] + 0.1, 1.5, 3.0], [ROH_END[0], 1.5, ROH_END[2]], 0.0012, 30, -0.04, 0.009) }],
};

const KICKS: [number, number][] = [
  [SEC.panci + 0.25, 1.5], [SEC.motor, 0.9], [SEC.polisi, 0.9], [SEC.gangguan + 1.5, 1.2], [SEC.surat, 0.8], [SEC.gilanya, 1.6],
  [SEC.denda, 1.0], [SEC.pajak, 1.0], [SEC.utang, 1.0], [SEC.tetangganya, 0.8], [SEC.resmi, 1.2], [SEC.seratus, 1.2], [SEC.bansos, 0.9],
  [SEC.kami, 1.7], [SEC.orang, 1.0], [SEC.kekompakan, 0.9], [SEC.dicabut, 1.4], [SEC.tunggakan, 1.3], [SEC.lemas, 1.1], [SEC.asli, 1.0],
  [SEC.dipertahankan, 1.3], [SEC.sembuh, 0.8], [SEC.kalau, 1.0], [SEC.kena, 1.6],
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
  if ([2, 3, 4, 5, 7, 9, 12, 17, 18, 21, 22, 25, 26, 27].includes(s.id) && !(s.id === 4 && f >= F("gangguan") - 4) && !(s.id === 22 && f >= F("asli") - 4)) return { cInf: 10.8 };
  const cx = s.kind === "jalan" ? JX : s.kind === "klinik" ? KX : DC;
  return { cInf: 4.5, focus: () => [cx, 1.1, 0] };
};
