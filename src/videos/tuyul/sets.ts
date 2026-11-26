// Set prosedural "Tuyul Mogok Kerja":
//  buildHouseSet()  : rumah Pak Slamet (lemari berpintu yang bisa terbuka, uang 3 tahap, motor/TV/kulkas yang "pop", bangku)
//  buildHutSet()    : gubuk dukun (meja berkain, lilin, rak toples, sertifikat dukun)
//  buildStreetSet() : jalan kampung malam/siang (5 rumah, tiang lampu, barang baru tetangga)
//  buildFieldSet()  : lapangan tempat tuyul demo (spanduk, lampu sorot)
//  buildBalaiSet()  : balai desa siang (panggung, podium, bendera, rumbai)
// Pola: Batch + lam() two-tone + tekstur Canvas2D; semua benda menapak tanah/lantai.
import * as THREE from "three";
import { Batch, lam, addTree } from "./build";
import { ctex, rep, rng, grassHD, planksHD, beamHD, stoneHD } from "./paint";
import { NOINK } from "./ink";
import { HX, UX, SX, LX, BX, STREET_XS } from "./story";

const SPH = new THREE.SphereGeometry(1, 10, 8);
const at = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(sx, sy, sz));
const glow = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false });
const box = (b: Batch, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, ry = 0) =>
  b.add(new THREE.BoxGeometry(w, h, d), m, at(x, y, z, 1, 1, 1, ry));
const glowBox = (g: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, col: [number, number, number]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glow(...col)); m.position.set(x, y, z); m.layers.set(NOINK); g.add(m); return m;
};
const signTex = (key: string, lines: [string, number, string][], bg: string, border: string, w = 512, h = 256) =>
  ctex(key, w, h, (g) => {
    g.fillStyle = border; g.fillRect(0, 0, w, h);
    g.fillStyle = bg; g.fillRect(14, 14, w - 28, h - 28);
    g.textAlign = "center"; g.textBaseline = "middle";
    let y = h / (lines.length + 1);
    for (const [txt, sz, col] of lines) { g.font = `900 ${sz}px 'Segoe UI', Arial, sans-serif`; g.fillStyle = col; g.fillText(txt, w / 2, y); y += h / (lines.length + 1); }
  });

// ---------- barang baru (dipakai rumah Slamet dan teras tetangga); origin lokal = dasar benda ----------
export const makeMotor = (): THREE.Group => {
  const g = new THREE.Group(), b = new Batch();
  const red = lam("tyMotorRed", () => ({ color: "#d62828" })), blk = lam("tyMotorBlk", () => ({ color: "#222630" })), chrome = lam("tyChrome", () => ({ color: "#c8ccd4" }));
  for (const x of [-0.55, 0.55]) b.add(new THREE.TorusGeometry(0.3, 0.075, 8, 18), blk, at(x, 0.3, 0));
  box(b, 1.0, 0.1, 0.16, 0, 0.5, 0, red); box(b, 0.32, 0.3, 0.2, 0.05, 0.38, 0, blk);
  box(b, 0.5, 0.1, 0.22, -0.2, 0.72, 0, blk); b.add(SPH, red, at(0.2, 0.74, 0, 0.25, 0.14, 0.12));
  box(b, 0.07, 0.62, 0.06, 0.55, 0.62, 0, chrome, 0); box(b, 0.07, 0.06, 0.5, 0.55, 0.96, 0, chrome);
  b.build(g, true); return g;
};
export const makeTV = (): { g: THREE.Group; screen: THREE.Mesh } => {
  const g = new THREE.Group(), b = new Batch();
  const wood = lam("tyTVStand", () => ({ map: beamHD() })), blk = lam("tyTVBody", () => ({ color: "#1b1d24" }));
  box(b, 1.0, 0.5, 0.5, 0, 0.25, 0, wood); box(b, 0.9, 0.62, 0.14, 0, 0.82, 0, blk);
  b.build(g, true);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.48), glow(1.1, 1.5, 2.1)); screen.position.set(0, 0.82, 0.075); screen.layers.set(NOINK); g.add(screen);
  return { g, screen };
};
export const makeFridge = (): THREE.Group => {
  const g = new THREE.Group(), b = new Batch();
  const wh = lam("tyFridge", () => ({ color: "#f1f1f4" })), gr = lam("tyFridgeSeam", () => ({ color: "#9aa0ab" }));
  box(b, 0.85, 1.9, 0.75, 0, 0.95, 0, wh); box(b, 0.8, 0.03, 0.02, 0, 1.2, 0.385, gr);
  box(b, 0.05, 0.4, 0.05, 0.3, 1.55, 0.4, gr); box(b, 0.05, 0.4, 0.05, 0.3, 0.8, 0.4, gr);
  b.build(g, true); return g;
};

// ============================ RUMAH PAK SLAMET ============================
export type HouseSet = { root: THREE.Group; doorL: THREE.Group; doorR: THREE.Group; money: THREE.Group[]; motor: THREE.Group; tv: THREE.Group; tvScreen: THREE.Mesh; fridge: THREE.Group; stool: THREE.Group; bulb: THREE.Mesh };
export const buildHouseSet = (): HouseSet => {
  const root = new THREE.Group();
  const floorM = lam("tyHFloor", () => ({ color: "#8a6b4a" }));
  const wallM = lam("tyHWall", () => ({ map: rep(planksHD(), 3, 2) }));
  const woodM = lam("tyHWood", () => ({ map: beamHD() }));
  const darkW = lam("tyHDark", () => ({ color: "#5a3a1c" }));
  const w = new Batch(), f = new Batch();
  w.add(new THREE.BoxGeometry(7.6, 0.2, 6.2), floorM, at(HX, -0.1, -0.2));
  w.add(new THREE.BoxGeometry(7.6, 3.4, 0.2), wallM, at(HX, 1.7, -2.9));
  w.add(new THREE.BoxGeometry(0.2, 3.4, 6.2), wallM, at(HX - 3.8, 1.7, -0.2)); w.add(new THREE.BoxGeometry(0.2, 3.4, 6.2), wallM, at(HX + 3.8, 1.7, -0.2));
  // lemari (hampa, berpintu)
  box(f, 1.9, 2.1, 0.05, HX, 1.05, -2.77, woodM); box(f, 0.06, 2.1, 0.7, HX - 0.92, 1.05, -2.45, woodM); box(f, 0.06, 2.1, 0.7, HX + 0.92, 1.05, -2.45, woodM);
  box(f, 1.9, 0.06, 0.7, HX, 2.1, -2.45, woodM); box(f, 1.9, 0.08, 0.7, HX, 0.04, -2.45, woodM);
  box(f, 1.8, 0.04, 0.65, HX, 0.68, -2.45, woodM); box(f, 1.8, 0.04, 0.65, HX, 1.38, -2.45, woodM);
  f.build(root, true); w.build(root, false);
  const mkDoor = (side: number) => {
    const g = new THREE.Group(), b = new Batch();
    box(b, 0.95, 2.0, 0.05, side * -0.475, 1.05, 0, woodM); box(b, 0.05, 0.3, 0.07, side * -0.85, 1.05, 0.04, darkW);
    b.build(g, true); g.position.set(HX + side * 0.95, 0, -2.1); root.add(g); return g;
  };
  const doorL = mkDoor(-1), doorR = mkDoor(1); // doorL: engsel di kiri (x-0.95), daun ke +x
  // uang 3 tahap di lemari (+ tumpukan di lantai)
  const bill = lam("tyBill", () => ({ color: "#4f9d63" })), band = lam("tyBillBand", () => ({ color: "#efe6c0" }));
  const money: THREE.Group[] = [];
  const mk = (rows: [number, number][]) => { // [y, count]
    const g = new THREE.Group(), b = new Batch();
    for (const [y, n] of rows) for (let i = 0; i < n; i++) { const x = HX - 0.7 + (i % 4) * 0.36, h = Math.floor(i / 4);
      box(b, 0.3, 0.09, 0.17, x, y + 0.05 + h * 0.1, -2.5, bill); box(b, 0.06, 0.092, 0.172, x, y + 0.05 + h * 0.1, -2.5, band); }
    b.build(g, true); g.visible = false; root.add(g); money.push(g);
  };
  mk([[0.7, 4]]); mk([[1.4, 8], [0.7, 4]]); mk([[0.1, 12], [1.4, 8], [0.7, 8]]);
  // barang baru (pop)
  const motor = makeMotor(); motor.position.set(HX + 0.2, 0, 0.6); motor.visible = false; root.add(motor);
  const { g: tv, screen } = makeTV(); tv.position.set(HX - 2.0, 0, -2.4); tv.visible = false; root.add(tv);
  const fridge = makeFridge(); fridge.position.set(HX + 2.1, 0, -2.3); fridge.visible = false; root.add(fridge);
  // bangku (shot 26-28)
  const stool = new THREE.Group(), sb = new Batch(); box(sb, 0.6, 0.42, 0.5, HX - 0.9, 0.21, -0.4, darkW); sb.build(stool, true); stool.visible = false; root.add(stool);
  // bohlam gantung
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), glow(2.4, 1.8, 0.8)); bulb.position.set(HX, 2.7, -1.2); bulb.layers.set(NOINK); root.add(bulb);
  return { root, doorL, doorR, money, motor, tv, tvScreen: screen, fridge, stool, bulb };
};

// ============================ GUBUK DUKUN ============================
export const buildHutSet = (): THREE.Group => {
  const root = new THREE.Group();
  const floorM = lam("tyUFloor", () => ({ map: rep(planksHD(), 3, 2) }));
  const wallM = lam("tyUWall", () => ({ color: "#3a2a22" }));
  const woodM = lam("tyUWood", () => ({ map: beamHD() }));
  const cloth = lam("tyUCloth", () => ({ color: "#8e1f2f" }));
  const drape = lam("tyUDrape", () => ({ color: "#4b2a72" }));
  const paper = lam("tyUPaper", () => ({ color: "#f4efdc" }));
  const jar = lam("tyUJar", () => ({ color: "#6b8e23" })), jar2 = lam("tyUJar2", () => ({ color: "#b5452d" }));
  const cert = lam("tyUCert", () => ({ map: signTex("tyCertTex", [["SERTIFIKAT DUKUN", 38, "#222"], ["TERAKREDITASI", 36, "#8e1f2f"]], "#fff8e1", "#c9a227") }));
  const w = new Batch(), f = new Batch();
  w.add(new THREE.BoxGeometry(7.4, 0.2, 6.4), floorM, at(UX, -0.1, -0.2));
  w.add(new THREE.BoxGeometry(7.4, 3.4, 0.2), wallM, at(UX, 1.7, -2.95));
  w.add(new THREE.BoxGeometry(0.2, 3.4, 6.4), wallM, at(UX - 3.7, 1.7, -0.2)); w.add(new THREE.BoxGeometry(0.2, 3.4, 6.4), wallM, at(UX + 3.7, 1.7, -0.2));
  box(f, 2.2, 1.6, 0.04, UX, 2.0, -2.8, drape);
  box(f, 1.3, 0.65, 0.04, UX - 2.2, 2.2, -2.8, cert);
  // meja berkain
  box(f, 2.4, 0.08, 0.9, UX, 0.8, -1.5, woodM); box(f, 2.5, 0.58, 0.05, UX, 0.5, -1.05, cloth); box(f, 2.5, 0.58, 0.05, UX, 0.5, -1.95, cloth);
  for (const [x, z] of [[-1.1, -1.9], [1.1, -1.9], [-1.1, -1.1], [1.1, -1.1]]) box(f, 0.08, 0.8, 0.08, UX + x, 0.4, z, woodM);
  // rak kiri: toples; rak kanan: tumpukan kertas kontrak
  box(f, 0.3, 0.06, 2.0, UX - 3.4, 1.3, -1.2, woodM); box(f, 0.3, 0.06, 2.0, UX - 3.4, 2.0, -1.2, woodM);
  for (let i = 0; i < 5; i++) { f.add(SPH, i % 2 ? jar : jar2, at(UX - 3.4, 1.45, -0.4 - i * 0.4, 0.14, 0.17, 0.14)); f.add(SPH, i % 2 ? jar2 : jar, at(UX - 3.4, 2.15, -0.4 - i * 0.4, 0.13, 0.16, 0.13)); }
  box(f, 0.3, 0.06, 2.0, UX + 3.4, 1.3, -1.2, woodM);
  for (let i = 0; i < 4; i++) box(f, 0.28, 0.12 + 0.06 * (i % 2), 0.4, UX + 3.4, 1.4, -0.5 - i * 0.5, paper);
  w.build(root, false); f.build(root, true);
  // lilin + dupa (api HDR)
  const cb = new Batch(), cm = lam("tyUCandle", () => ({ color: "#f5ecd2" }));
  const candles: [number, number, number][] = [[UX - 0.9, 0.84, -1.5], [UX + 0.9, 0.84, -1.5], [UX - 0.3, 0.84, -1.2], [UX - 3.4, 1.37, -1.0], [UX + 3.4, 1.37, -2.0], [UX - 1.6, 0.0, 0.2], [UX + 1.9, 0.0, 0.4]];
  for (const [x, y, z] of candles) {
    cb.add(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 8), cm, at(x, y + 0.11 + (y === 0 ? 0.1 : 0), z, 1, y === 0 ? 2 : 1, 1));
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow(3.2, 2.0, 0.6)); fl.scale.set(1, 1.6, 1); fl.position.set(x, y + 0.27 + (y === 0 ? 0.22 : 0), z); fl.layers.set(NOINK); root.add(fl);
  }
  cb.build(root, true);
  return root;
};

// ============================ JALAN KAMPUNG ============================
export type StreetSet = { root: THREE.Group; items: THREE.Group };
export const buildStreetSet = (): StreetSet => {
  const root = new THREE.Group();
  const R = rng(31);
  const dirtM = lam("tyDirt", () => ({ color: "#6a5a45" })), grassM = lam("tySGrass", () => ({ map: rep(grassHD(), 24, 8) }));
  const roadM = lam("tyRoad", () => ({ color: "#7a705f" }));
  const roofM = lam("tyRoof", () => ({ color: "#a8442c" })), doorM = lam("tyDoor", () => ({ color: "#5b3a1c" }));
  const wallCols = ["#d9c9a3", "#c9d9a3", "#a3c9d9", "#d9a3a3", "#e0d29a"].map((c, i) => lam("tyWall" + i, () => ({ color: c })));
  const iron = lam("tyPole", () => ({ color: "#2b2f3a" }));
  const b = new Batch();
  b.add(new THREE.BoxGeometry(130, 0.4, 60), grassM, at(SX, -0.2, -12));
  b.add(new THREE.BoxGeometry(130, 0.03, 3.6), roadM, at(SX, 0.015, 0.4));
  b.add(new THREE.BoxGeometry(130, 0.03, 2.0), dirtM, at(SX, 0.012, -3.6));
  STREET_XS.forEach((x, i) => {
    b.add(new THREE.BoxGeometry(3.6, 2.3, 3.0), wallCols[i], at(x, 1.15, -6));
    for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(2.55, 0.12, 3.4), roofM, at(x + s * 0.9, 2.6, -6, 1, 1, 1, 0, -s * 0.5));
    b.add(new THREE.BoxGeometry(0.8, 1.6, 0.06), doorM, at(x + 0.9, 0.8, -4.47));
    b.add(new THREE.BoxGeometry(3.7, 0.42, 0.05), iron, at(x, 0.21, -3.2));
  });
  for (let i = 0; i < 40; i++) { const x = SX - 30 + i * 1.6 + R(), z = -10.5 - R() * 5; addTree(b, x, 0, z, 4.8 + R() * 2.2, 700 + i); }
  for (let i = 0; i < 4; i++) { const x = SX - 6.7 + i * 4.5; b.add(new THREE.CylinderGeometry(0.06, 0.07, 3.6, 8), iron, at(x, 1.8, -1.9)); }
  b.build(root, true);
  for (let i = 0; i < 4; i++) glowBox(root, 0.45, 0.22, 0.45, SX - 6.7 + i * 4.5, 3.65, -1.9, [3.0, 2.3, 1.0]);
  STREET_XS.forEach((x, i) => { glowBox(root, 0.8, 0.7, 0.06, x - 0.9, 1.3, -4.46, [2.6, 2.0, 1.0]); void i; });
  // barang baru tetangga & Slamet (flag neighborItems)
  const items = new THREE.Group();
  const m1 = makeMotor(); m1.position.set(STREET_XS[1] + 0.2, 0, -3.1); m1.rotation.y = 0.3; items.add(m1);
  const m2 = makeMotor(); m2.position.set(STREET_XS[2] + 0.1, 0, -3.1); m2.rotation.y = -0.3; items.add(m2);
  const m3 = makeMotor(); m3.position.set(STREET_XS[4] + 0.2, 0, -3.1); items.add(m3);
  const t1 = makeTV(); t1.g.position.set(STREET_XS[3] - 1.2, 0, -3.3); items.add(t1.g);
  const t2 = makeTV(); t2.g.position.set(STREET_XS[1] - 1.3, 0, -3.3); items.add(t2.g);
  const fr = makeFridge(); fr.position.set(STREET_XS[3] + 1.2, 0, -3.3); items.add(fr);
  items.visible = false; root.add(items);
  return { root, items };
};

// ============================ LAPANGAN ============================
export const buildFieldSet = (): THREE.Group => {
  const root = new THREE.Group();
  const R = rng(13);
  const grassM = lam("tyLGrass", () => ({ map: rep(grassHD(), 18, 10) }));
  const dirtM = lam("tyLDirt", () => ({ color: "#7d6a4c" }));
  const iron = lam("tyLPole", () => ({ color: "#2b2f3a" })), wood = lam("tyLWood", () => ({ map: beamHD() }));
  const banner = lam("tyBanner", () => ({ map: ctex("tyBannerTex", 512, 320, (g) => {
    g.fillStyle = "#c0392b"; g.fillRect(0, 0, 512, 320); g.fillStyle = "#fff7d6"; g.fillRect(14, 14, 484, 292);
    g.textAlign = "center"; g.textBaseline = "middle";
    const L: [string, number, string, number][] = [["KAMI LELAH!", 84, "#c0392b", 70], ["NAIKKAN UPAH", 58, "#222222", 150], ["CUTI WAJIB", 58, "#222222", 215], ["HARI JUMAT", 58, "#1f4fa0", 275]];
    for (const [t, s, c, y] of L) { g.font = `900 ${s}px 'Segoe UI', Arial, sans-serif`; g.fillStyle = c; g.fillText(t, 256, y); }
  }) }));
  const b = new Batch();
  b.add(new THREE.BoxGeometry(80, 0.4, 50), grassM, at(LX, -0.2, -10));
  b.add(new THREE.BoxGeometry(14, 0.03, 8.5), dirtM, at(LX, 0.015, -1.2));
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.06, 0.07, 3.8, 8), wood, at(LX + s * 1.85, 1.9, -3.3));
    b.add(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 8), iron, at(LX + s * 6, 2.1, -3));
  }
  b.add(new THREE.BoxGeometry(3.2, 2.0, 0.05), banner, at(LX, 2.6, -3.3));
  for (let i = 0; i < 26; i++) addTree(b, LX - 24 + i * 1.9 + R(), 0, -10 - R() * 5, 4.8 + R() * 2.2, 900 + i);
  b.build(root, true);
  for (const s of [-1, 1]) glowBox(root, 0.9, 0.4, 0.3, LX + s * 6, 4.3, -2.9, [3.2, 3.0, 2.4]);
  return root;
};

// ============================ BALAI DESA ============================
export const buildBalaiSet = (): THREE.Group => {
  const root = new THREE.Group();
  const grassM = lam("tyBGrass", () => ({ map: rep(grassHD(), 12, 8) }));
  const paveM = lam("tyBPave", () => ({ map: stoneHD("tyBPaveTex") }));
  const wallM = lam("tyBWall", () => ({ color: "#efe3c0" }));
  const stageM = lam("tyBStage", () => ({ map: rep(planksHD(), 2, 1) }));
  const darkW = lam("tyBDark", () => ({ color: "#5a3a1c" }));
  const red = lam("tyBRed", () => ({ color: "#d62828" })), white = lam("tyBWhite", () => ({ color: "#f6f6f6" }));
  const sign = lam("tyBSign", () => ({ map: signTex("tyBalaiTex", [["BALAI DESA", 80, "#ffffff"]], "#1f6f3f", "#ffffff", 512, 160) }));
  const b = new Batch();
  b.add(new THREE.BoxGeometry(44, 0.4, 34), grassM, at(BX, -0.2, -8));
  b.add(new THREE.BoxGeometry(12, 0.04, 9), paveM, at(BX, 0.02, 0.2));
  b.add(new THREE.BoxGeometry(10, 4.4, 0.2), wallM, at(BX, 2.2, -5.3));
  b.add(new THREE.BoxGeometry(7.4, 0.5, 3.6), stageM, at(BX, 0.25, -3.3));
  b.add(new THREE.BoxGeometry(2.0, 0.25, 0.8), stageM, at(BX, 0.12, -1.2));
  b.add(new THREE.BoxGeometry(0.95, 1.0, 0.5), darkW, at(BX, 1.0, -3.0));
  b.add(new THREE.BoxGeometry(0.7, 0.28, 0.04), sign, at(BX, 1.05, -2.73));
  b.add(new THREE.BoxGeometry(4.4, 0.9, 0.08), sign, at(BX, 3.6, -5.15));
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.04, 0.05, 4.2, 8), darkW, at(BX + s * 3.9, 2.1, -4.0));
    b.add(new THREE.BoxGeometry(1.0, 0.34, 0.03), red, at(BX + s * 3.9 - s * 0.5, 3.95, -4.0)); b.add(new THREE.BoxGeometry(1.0, 0.34, 0.03), white, at(BX + s * 3.9 - s * 0.5, 3.6, -4.0));
  }
  for (let i = 0; i < 16; i++) b.add(new THREE.BoxGeometry(0.34, 0.5, 0.03), i % 2 ? red : white, at(BX - 4.2 + i * 0.56, 3.05, -1.2 + Math.sin(i * 0.8) * 0.03, 1, 1, 1, 0, 0.0));
  b.build(root, true);
  return root;
};
