// Set prosedural "Gilanya Meyakinkan":
//  buildJalanSet()  : jalan raya tempat razia tilang (aspal, marka, kerucut, motor Pak Rohim)
//  buildKlinikSet() : puskesmas (meja dokter, tempat tidur periksa, bangku antre, papan "PUSKESMAS")
//  buildDesaSet()   : alun-alun kampung (gapura, rumah warga) + panggung Pak Lurah + alas maskot desa
// Pola mengikuti build.ts (Batch + lam() two-tone + tekstur Canvas2D); semua benda menapak tanah/lantai.
import * as THREE from "three";
import { Batch, lam, addTree } from "./build";
import { ctex, rep, rng, grassHD, planksHD, beamHD, stoneHD } from "./paint";
import { DC, JX, KX } from "./story";

const SPH = new THREE.SphereGeometry(1, 10, 8);
const at = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(sx, sy, sz));
const box = (b: Batch, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, ry = 0) =>
  b.add(new THREE.BoxGeometry(w, h, d), m, at(x, y, z, 1, 1, 1, ry));
const signTex = (key: string, lines: [string, number, string][], bg: string, border: string, w = 512, h = 256) =>
  ctex(key, w, h, (g) => {
    g.fillStyle = border; g.fillRect(0, 0, w, h);
    g.fillStyle = bg; g.fillRect(14, 14, w - 28, h - 28);
    g.textAlign = "center"; g.textBaseline = "middle";
    let y = h / (lines.length + 1);
    for (const [txt, sz, col] of lines) { g.font = `900 ${sz}px 'Segoe UI', Arial, sans-serif`; g.fillStyle = col; g.fillText(txt, w / 2, y); y += h / (lines.length + 1); }
  });

// ============================ JALAN (razia tilang) ============================
export const makeMotor = (): THREE.Group => {
  const g = new THREE.Group(), b = new Batch();
  const red = lam("rhMotorRed", () => ({ color: "#d62828" })), blk = lam("rhMotorBlk", () => ({ color: "#222630" })), chrome = lam("rhChrome", () => ({ color: "#c8ccd4" })), plate = lam("rhPlate", () => ({ map: signTex("rhPlateTex", [["B 1234 ROH", 64, "#111"]], "#fff7c2", "#111", 256, 120) }));
  for (const x of [-0.55, 0.55]) b.add(new THREE.TorusGeometry(0.3, 0.075, 8, 18), blk, at(x, 0.3, 0));
  box(b, 1.0, 0.1, 0.16, 0, 0.5, 0, red); box(b, 0.32, 0.3, 0.2, 0.05, 0.38, 0, blk);
  box(b, 0.5, 0.1, 0.22, -0.2, 0.72, 0, blk); b.add(SPH, red, at(0.2, 0.74, 0, 0.25, 0.14, 0.12));
  box(b, 0.07, 0.62, 0.06, 0.55, 0.62, 0, chrome); box(b, 0.07, 0.06, 0.5, 0.55, 0.96, 0, chrome);
  b.add(new THREE.PlaneGeometry(0.28, 0.12), plate, at(-0.74, 0.42, 0, 1, 1, 1, Math.PI / 2));
  b.build(g, true); return g;
};
export const buildJalanSet = (): THREE.Group => {
  const root = new THREE.Group();
  const R = rng(51);
  const grassM = lam("rhJGrass", () => ({ map: rep(grassHD(), 24, 8) })), roadM = lam("rhRoad", () => ({ color: "#4a4d55" })), lineM = lam("rhLine", () => ({ color: "#f2f2f2" }));
  const curbM = lam("rhCurb", () => ({ color: "#b9b4a8" })), orange = lam("rhCone", () => ({ color: "#ff7a1a" })), white = lam("rhConeW", () => ({ color: "#ffffff" }));
  const roofM = lam("rhJRoof", () => ({ color: "#a8442c" })), doorM = lam("rhJDoor", () => ({ color: "#5b3a1c" }));
  const wallCols = ["#d9c9a3", "#c9d9a3", "#a3c9d9", "#d9a3a3"].map((c, i) => lam("rhJWall" + i, () => ({ color: c })));
  const b = new Batch();
  b.add(new THREE.BoxGeometry(120, 0.4, 50), grassM, at(JX, -0.2, -10));
  b.add(new THREE.BoxGeometry(120, 0.05, 6.4), roadM, at(JX, 0.025, 1.2));
  for (let i = 0; i < 24; i++) b.add(new THREE.BoxGeometry(1.4, 0.06, 0.16), lineM, at(JX - 30 + i * 2.6, 0.04, 1.2));
  b.add(new THREE.BoxGeometry(120, 0.12, 0.3), curbM, at(JX, 0.06, -2.1));
  b.add(new THREE.BoxGeometry(120, 0.03, 2.2), curbM, at(JX, 0.015, -3.3));
  for (let i = 0; i < 4; i++) { const x = JX - 8 + i * 5.4; b.add(new THREE.BoxGeometry(3.4, 2.3, 3.0), wallCols[i], at(x, 1.15, -7.5));
    for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(2.4, 0.12, 3.4), roofM, at(x + s * 0.85, 2.6, -7.5, 1, 1, 1, 0, -s * 0.5)); b.add(new THREE.BoxGeometry(0.8, 1.6, 0.06), doorM, at(x + 0.8, 0.8, -5.97)); }
  for (const x of [-2.6, 1.2, 4.8]) { b.add(new THREE.CylinderGeometry(0.1, 0.22, 0.7, 10), orange, at(JX + x, 0.35, 3.4)); b.add(new THREE.CylinderGeometry(0.13, 0.17, 0.12, 10), white, at(JX + x, 0.42, 3.4)); }
  for (let i = 0; i < 26; i++) addTree(b, JX - 22 + i * 1.7 + R(), 0, -11 - R() * 5, 4.6 + R() * 2.2, 1300 + i);
  b.build(root, true);
  const motor = makeMotor(); motor.position.set(JX - 1.25, 0, 0.15); root.add(motor);
  return root;
};

// ============================ PUSKESMAS ============================
export const buildKlinikSet = (): THREE.Group => {
  const root = new THREE.Group();
  const tile = ctex("rhKTile", 512, 512, (g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#f1f6f8" : "#dbe8ee"; g.fillRect(x * 64, y * 64, 64, 64); } });
  const floorM = lam("rhKFloor", () => ({ map: rep(tile, 8, 5) })), wallM = lam("rhKWall", () => ({ color: "#cfe8d6" })), woodM = lam("rhKWood", () => ({ map: beamHD() }));
  const whiteM = lam("rhKWhite", () => ({ color: "#f4f6f8" })), redM = lam("rhKRed", () => ({ color: "#d62828" })), blueM = lam("rhKBlue", () => ({ color: "#5b9bd5" }));
  const sign = lam("rhKSign", () => ({ map: signTex("rhKSignTex", [["PUSKESMAS", 84, "#ffffff"]], "#1f8f4f", "#ffffff", 512, 170) }));
  const chart = lam("rhChart", () => ({ map: signTex("rhChartTex", [["E", 70, "#111"], ["F P", 46, "#111"], ["T O Z", 32, "#111"]], "#ffffff", "#8a9099", 256, 300) }));
  const w = new Batch(), f = new Batch();
  w.add(new THREE.BoxGeometry(9, 0.2, 6.4), floorM, at(KX, -0.1, -0.2));
  w.add(new THREE.BoxGeometry(9, 3.6, 0.2), wallM, at(KX, 1.8, -3.0));
  w.add(new THREE.BoxGeometry(0.2, 3.6, 6.4), wallM, at(KX - 4.5, 1.8, -0.2)); w.add(new THREE.BoxGeometry(0.2, 3.6, 6.4), wallM, at(KX + 4.5, 1.8, -0.2));
  box(f, 3.2, 0.8, 0.08, KX, 3.0, -2.9, sign); box(f, 0.8, 0.2, 0.06, KX - 3.0, 2.6, -2.9, redM); box(f, 0.2, 0.8, 0.06, KX - 3.0, 2.6, -2.9, redM);
  box(f, 0.7, 0.85, 0.05, KX + 3.0, 2.0, -2.9, chart);
  box(f, 1.7, 0.08, 0.8, KX + 0.7, 0.8, -1.35, woodM); box(f, 1.7, 0.76, 0.05, KX + 0.7, 0.4, -0.95, woodM); box(f, 0.05, 0.76, 0.8, KX - 0.15, 0.4, -1.35, woodM); box(f, 0.05, 0.76, 0.8, KX + 1.55, 0.4, -1.35, woodM);
  box(f, 2.0, 0.45, 0.85, KX - 3.2, 0.5, -1.8, whiteM); box(f, 2.0, 0.12, 0.85, KX - 3.2, 0.78, -1.8, blueM);          // tempat tidur periksa
  box(f, 0.9, 1.9, 0.5, KX + 3.5, 0.95, -2.5, whiteM); box(f, 0.05, 1.7, 0.02, KX + 3.5, 0.95, -2.23, woodM);          // lemari obat
  box(f, 3.4, 0.5, 0.5, KX - 1.4, 0.25, 1.9, woodM);                                                                    // bangku tunggu
  w.build(root, false); f.build(root, true);
  return root;
};

// ============================ DESA SUKAMAJU ============================
export type DesaSet = { root: THREE.Group; stage: THREE.Group; mascot: THREE.Group };
export const buildDesaSet = (): DesaSet => {
  const root = new THREE.Group();
  const R = rng(41);
  const grassM = lam("hhGrass", () => ({ map: rep(grassHD(), 24, 12) }));
  const paveM = lam("hhPave", () => ({ map: stoneHD("hhPaveTex") }));
  const roadM = lam("hhRoad", () => ({ color: "#8a7f6c" }));
  const roofM = lam("hhRoof", () => ({ color: "#a8442c" })), doorM = lam("hhDoor", () => ({ color: "#5b3a1c" })), winM = lam("hhWin", () => ({ color: "#9fd6f0" }));
  const wallCols = ["#d9c9a3", "#c9d9a3", "#a3c9d9", "#d9a3a3", "#e0d29a"].map((c, i) => lam("hhWall" + i, () => ({ color: c })));
  const woodM = lam("hhWood", () => ({ map: beamHD() })), red = lam("hhRed", () => ({ color: "#d62828" })), white = lam("hhWhite", () => ({ color: "#f4f4f4" }));
  const sign = lam("hhGapura", () => ({ map: signTex("rhGapuraTex", [["KAMPUNG SUKAMAJU", 66, "#ffffff"]], "#1f6f3f", "#ffd43b", 512, 140) }));
  const b = new Batch();
  b.add(new THREE.BoxGeometry(120, 0.4, 60), grassM, at(DC, -0.2, -12));
  b.add(new THREE.BoxGeometry(18, 0.04, 9), paveM, at(DC, 0.02, 0.2));
  b.add(new THREE.BoxGeometry(120, 0.03, 3.4), roadM, at(DC, 0.015, 5.6));
  [-9, -4.5, 0, 4.5, 9].forEach((dx, i) => {
    const x = DC + dx;
    b.add(new THREE.BoxGeometry(3.6, 2.3, 3.0), wallCols[i], at(x, 1.15, -7.5));
    for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(2.55, 0.12, 3.4), roofM, at(x + s * 0.9, 2.6, -7.5, 1, 1, 1, 0, -s * 0.5));
    b.add(new THREE.BoxGeometry(0.8, 1.6, 0.06), doorM, at(x + 0.9, 0.8, -5.97)); b.add(new THREE.BoxGeometry(0.8, 0.7, 0.06), winM, at(x - 0.9, 1.3, -5.97));
  });
  // gapura desa
  for (const s of [-1, 1]) { box(b, 0.5, 3.4, 0.5, DC + s * 2.5, 1.7, -4.4, woodM); box(b, 0.7, 0.3, 0.7, DC + s * 2.5, 0.15, -4.4, woodM); }
  box(b, 5.7, 0.9, 0.3, DC, 3.65, -4.4, sign);
  // tiang bendera merah putih
  for (const s of [-1, 1]) { b.add(new THREE.CylinderGeometry(0.04, 0.05, 4.4, 8), woodM, at(DC + s * 5.5, 2.2, -2.6));
    box(b, 1.0, 0.3, 0.03, DC + s * 5.5 - s * 0.5, 4.1, -2.6, red); box(b, 1.0, 0.3, 0.03, DC + s * 5.5 - s * 0.5, 3.8, -2.6, white); }
  for (let i = 0; i < 30; i++) addTree(b, DC - 22 + i * 1.5 + R(), 0, -11 - R() * 5, 4.6 + R() * 2.2, 1100 + i);
  for (let i = 0; i < 6; i++) b.add(SPH, lam("hhBush", () => ({ color: "#3f8f3c" })), at(DC - 8 + i * 3.2 + R(), 0.4, -3.4 + R() * 0.6, 0.7, 0.45, 0.6));
  b.build(root, true);
  // panggung Pak Lurah (muncul di shot pengumuman)
  const stage = new THREE.Group(), sb = new Batch();
  const stageM = lam("rhStage", () => ({ map: rep(planksHD(), 2, 1) })), darkW = lam("rhDark", () => ({ color: "#5a3a1c" }));
  const banner = lam("rhBanner", () => ({ map: signTex("rhBannerTex", [["KAMPUNG SEHAT JIWA", 54, "#ffffff"]], "#c0392b", "#ffd43b", 512, 150) }));
  sb.add(new THREE.BoxGeometry(7.4, 0.5, 3.6), stageM, at(DC, 0.25, -3.3)); sb.add(new THREE.BoxGeometry(0.95, 1.0, 0.5), darkW, at(DC, 1.0, -3.0));
  sb.add(new THREE.BoxGeometry(4.6, 1.0, 0.08), banner, at(DC, 3.5, -5.2));
  sb.build(stage, true); stage.visible = false; root.add(stage);
  // alas maskot desa (Pak Rohim berdiri di atasnya)
  const mascot = new THREE.Group(), mb = new Batch();
  const bannerM = lam("rhMascotBanner", () => ({ map: signTex("rhMascotTex", [["MASKOT DESA", 60, "#c0392b"], ["BEBAS PAJAK", 44, "#222222"]], "#fffdf0", "#c0392b", 512, 220) }));
  mb.add(new THREE.BoxGeometry(1.6, 0.5, 1.2), darkW, at(DC, 0.25, 0.0)); mb.add(new THREE.BoxGeometry(2.4, 1.1, 0.06), bannerM, at(DC, 1.0, -1.1));
  mb.build(mascot, true); mascot.visible = false; root.add(mascot);
  return { root, stage, mascot };
};


