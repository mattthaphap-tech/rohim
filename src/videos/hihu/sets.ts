// Set prosedural "Ada Duit di Bawahmu! Hi hu!":
//  buildDesaSet()   : alun-alun Desa Sukamaju (gapura, paving, rumah warga, bendera)
//  buildBalaiSet()  : aula balai desa dengan lantai ubin; ubin longgar + peti dana desa di bawahnya (animasi diatur world.ts)
//  buildPolsekSet() : kantor polisi (meja, peta, bendera, peti yang ditaruh di meja)
//  buildCourtSet()  : ruang sidang (bangku hakim + palu, kursi saksi, bendera)
// Pola mengikuti build.ts (Batch + lam() two-tone + tekstur Canvas2D); semua benda menapak tanah/lantai.
import * as THREE from "three";
import { Batch, lam, addTree } from "./build";
import { ctex, rep, rng, grassHD, planksHD, beamHD, stoneHD } from "./paint";
import { DC, BX, PX, CX, CHEST, POLSEK, COURT } from "./story";

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

// ---------- peti dana desa (origin lokal = dasar peti; lid = engsel di sisi belakang) ----------
export const makeChest = (): { g: THREE.Group; lid: THREE.Group } => {
  const g = new THREE.Group(), b = new Batch();
  const wood = lam("hhChestWood", () => ({ map: beamHD() })), iron = lam("hhChestIron", () => ({ color: "#3a3f4a" }));
  const bill = lam("hhBill", () => ({ color: "#4f9d63" })), band = lam("hhBillBand", () => ({ color: "#efe6c0" }));
  const stick = lam("hhSticker", () => ({ map: signTex("hhStickerTex", [["DANA DESA", 70, "#d62828"], ["Rp 2 MILIAR", 54, "#222222"]], "#fffdf0", "#d62828", 512, 220) }));
  box(b, 0.9, 0.38, 0.6, 0, 0.19, 0, wood);
  for (const x of [-0.32, 0.32]) box(b, 0.06, 0.4, 0.62, x, 0.19, 0, iron);
  for (let i = 0; i < 8; i++) { const x = -0.33 + (i % 4) * 0.22, z = i < 4 ? -0.12 : 0.12;
    box(b, 0.2, 0.08, 0.16, x, 0.4, z, bill); box(b, 0.04, 0.082, 0.162, x, 0.4, z, band); }
  b.add(new THREE.PlaneGeometry(0.5, 0.21), stick, at(0, 0.2, 0.31));
  b.build(g, true);
  const lid = new THREE.Group(), lb = new Batch();
  box(lb, 0.92, 0.12, 0.62, 0, 0.06, 0.31, wood); for (const x of [-0.32, 0.32]) box(lb, 0.06, 0.13, 0.64, x, 0.06, 0.31, iron);
  lb.build(lid, true); lid.position.set(0, 0.38, -0.31); g.add(lid);
  return { g, lid };
};

// ============================ DESA SUKAMAJU ============================
export const buildDesaSet = (): THREE.Group => {
  const root = new THREE.Group();
  const R = rng(41);
  const grassM = lam("hhGrass", () => ({ map: rep(grassHD(), 24, 12) }));
  const paveM = lam("hhPave", () => ({ map: stoneHD("hhPaveTex") }));
  const roadM = lam("hhRoad", () => ({ color: "#8a7f6c" }));
  const roofM = lam("hhRoof", () => ({ color: "#a8442c" })), doorM = lam("hhDoor", () => ({ color: "#5b3a1c" })), winM = lam("hhWin", () => ({ color: "#9fd6f0" }));
  const wallCols = ["#d9c9a3", "#c9d9a3", "#a3c9d9", "#d9a3a3", "#e0d29a"].map((c, i) => lam("hhWall" + i, () => ({ color: c })));
  const woodM = lam("hhWood", () => ({ map: beamHD() })), red = lam("hhRed", () => ({ color: "#d62828" })), white = lam("hhWhite", () => ({ color: "#f4f4f4" }));
  const sign = lam("hhGapura", () => ({ map: signTex("hhGapuraTex", [["DESA SUKAMAJU", 66, "#ffffff"]], "#1f6f3f", "#ffd43b", 512, 140) }));
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
  return root;
};

// ============================ BALAI DESA (aula) ============================
export type BalaiSet = { root: THREE.Group; tile: THREE.Group; tiles2: THREE.Group[]; chest: THREE.Group; lid: THREE.Group };
export const buildBalaiSet = (): BalaiSet => {
  const root = new THREE.Group();
  const checker = ctex("hhChecker", 512, 512, (g) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#e6d9bd" : "#c98f6a"; g.fillRect(x * 64, y * 64, 64, 64); }
    g.strokeStyle = "rgba(60,40,20,0.35)"; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); }
  });
  const floorM = lam("hhBFloor", () => ({ map: rep(checker, 8, 5) }));
  const wallM = lam("hhBWall", () => ({ color: "#efe3c0" })), woodM = lam("hhBWood", () => ({ map: beamHD() })), darkW = lam("hhBDark", () => ({ color: "#5a3a1c" }));
  const signM = lam("hhBSign", () => ({ map: signTex("hhBalaiTex", [["BALAI DESA", 84, "#ffffff"]], "#1f6f3f", "#ffffff", 512, 170) }));
  const infoM = lam("hhInfo", () => ({ map: signTex("hhInfoTex", [["DANA DESA", 50, "#222"], ["BELUM CAIR (2 TAHUN)", 34, "#c0392b"]], "#fff8e1", "#8a5a2e") }));
  const holeM = lam("hhHole", () => ({ color: "#17110d" }));
  const tileM = lam("hhTile", () => ({ color: "#d8b087" }));
  const w = new Batch(), f = new Batch();
  w.add(new THREE.BoxGeometry(9, 0.2, 6.4), floorM, at(BX, -0.1, -0.2));
  w.add(new THREE.BoxGeometry(9, 3.8, 0.2), wallM, at(BX, 1.9, -3.0));
  w.add(new THREE.BoxGeometry(0.2, 3.8, 6.4), wallM, at(BX - 4.5, 1.9, -0.2)); w.add(new THREE.BoxGeometry(0.2, 3.8, 6.4), wallM, at(BX + 4.5, 1.9, -0.2));
  box(f, 3.2, 0.8, 0.08, BX, 3.0, -2.9, signM); box(f, 1.1, 0.7, 0.05, BX - 2.8, 2.0, -2.9, infoM);
  for (const s of [-1, 1]) { box(f, 0.4, 3.8, 0.4, BX + s * 3.2, 1.9, -2.3, woodM); box(f, 0.55, 0.2, 0.55, BX + s * 3.2, 0.1, -2.3, darkW); }
  box(f, 2.2, 0.08, 0.8, BX - 3.0, 0.8, -1.6, darkW); for (const [x, z] of [[-1, -1.9], [1, -1.9], [-1, -1.3], [1, -1.3]]) box(f, 0.08, 0.8, 0.08, BX - 3.0 + x * 1.0, 0.4, z, darkW);
  w.build(root, false); f.build(root, true);
  // lubang gelap di bawah ubin utama
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.8), new THREE.MeshLambertMaterial({ color: "#17110d" })); hole.position.set(CHEST.x, 0.012, CHEST.z); root.add(hole); void holeM;
  // ubin utama (longgar) + 8 ubin sekitarnya
  const mkTile = (x: number, z: number, ry = 0) => { const g = new THREE.Group(), b = new Batch(); box(b, 0.8, 0.06, 0.8, 0, 0.03, 0, tileM, ry); b.build(g, true); g.position.set(x, 0, z); root.add(g); return g; };
  const tile = mkTile(CHEST.x, CHEST.z, 0.04);
  const tiles2: THREE.Group[] = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; tiles2.push(mkTile(CHEST.x + Math.cos(a) * 0.9, CHEST.z + Math.sin(a) * 0.9)); }
  const { g: chest, lid } = makeChest(); chest.position.set(CHEST.x, 0, CHEST.z); chest.visible = false; root.add(chest);
  return { root, tile, tiles2, chest, lid };
};

// ============================ KANTOR POLISI ============================
export const buildPolsekSet = (): { root: THREE.Group; chest: THREE.Group; lid: THREE.Group } => {
  const root = new THREE.Group();
  const floorM = lam("hhPFloor", () => ({ color: "#9aa0ab" })), wallM = lam("hhPWall", () => ({ color: "#bcd3e6" }));
  const woodM = lam("hhPWood", () => ({ map: beamHD() })), darkW = lam("hhPDark", () => ({ color: "#5a3a1c" }));
  const red = lam("hhPRed", () => ({ color: "#d62828" })), white = lam("hhPWhite", () => ({ color: "#f4f4f4" }));
  const sign = lam("hhPSign", () => ({ map: signTex("hhPolsekTex", [["POLSEK SUKAMAJU", 62, "#ffffff"]], "#1f3b73", "#ffffff", 512, 150) }));
  const w = new Batch(), f = new Batch();
  w.add(new THREE.BoxGeometry(8, 0.2, 6.2), floorM, at(PX, -0.1, -0.2));
  w.add(new THREE.BoxGeometry(8, 3.6, 0.2), wallM, at(PX, 1.8, -3.0));
  w.add(new THREE.BoxGeometry(0.2, 3.6, 6.2), wallM, at(PX - 4, 1.8, -0.2)); w.add(new THREE.BoxGeometry(0.2, 3.6, 6.2), wallM, at(PX + 4, 1.8, -0.2));
  box(f, 3.6, 0.7, 0.08, PX, 3.0, -2.9, sign);
  f.add(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 8), darkW, at(PX - 2.4, 1.6, -2.7)); box(f, 1.0, 0.3, 0.03, PX - 1.9, 3.0, -2.7, red); box(f, 1.0, 0.3, 0.03, PX - 1.9, 2.7, -2.7, white);
  box(f, 1.9, 0.08, 0.85, POLSEK.chest[0] + 0.3, 0.8, POLSEK.chest[2], woodM); box(f, 1.9, 0.76, 0.05, POLSEK.chest[0] + 0.3, 0.4, POLSEK.chest[2] + 0.4, darkW);
  box(f, 0.05, 0.76, 0.8, POLSEK.chest[0] - 0.65, 0.4, POLSEK.chest[2], darkW); box(f, 0.05, 0.76, 0.8, POLSEK.chest[0] + 1.25, 0.4, POLSEK.chest[2], darkW);
  box(f, 2.0, 0.05, 0.4, PX - 3.0, 0.5, 0.2, darkW); // bangku tunggu
  w.build(root, false); f.build(root, true);
  const { g: chest, lid } = makeChest(); chest.position.set(POLSEK.chest[0], 0.84, POLSEK.chest[2]); chest.rotation.y = 0.25; lid.rotation.x = -1.9; chest.visible = false; root.add(chest);
  return { root, chest, lid };
};

// ============================ RUANG SIDANG ============================
export type CourtSet = { root: THREE.Group; gavel: THREE.Group };
export const buildCourtSet = (): CourtSet => {
  const root = new THREE.Group();
  const floorM = lam("hhCFloor", () => ({ map: rep(planksHD(), 4, 3) })), wallM = lam("hhCWall", () => ({ color: "#d9c9a3" }));
  const panelM = lam("hhCPanel", () => ({ map: beamHD() })), darkW = lam("hhCDark", () => ({ color: "#5a3a1c" }));
  const redM = lam("hhCRed", () => ({ color: "#d62828" })), whiteM = lam("hhCWhite", () => ({ color: "#f4f4f4" })), goldM = lam("hhCGold", () => ({ color: "#c9a227" }));
  const w = new Batch(), f = new Batch();
  w.add(new THREE.BoxGeometry(11, 0.2, 9), floorM, at(CX, -0.1, -1));
  w.add(new THREE.BoxGeometry(11, 4.0, 0.2), wallM, at(CX, 2.0, -4.6));
  w.add(new THREE.BoxGeometry(0.2, 4.0, 9), wallM, at(CX - 5.4, 2.0, -1)); w.add(new THREE.BoxGeometry(0.2, 4.0, 9), wallM, at(CX + 5.4, 2.0, -1));
  w.add(new THREE.BoxGeometry(10.6, 1.3, 0.12), panelM, at(CX, 0.65, -4.46));
  w.add(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24).rotateX(Math.PI / 2), goldM, at(CX, 3.0, -4.48));
  w.add(new THREE.CylinderGeometry(0.03, 0.03, 3.4, 8), darkW, at(CX - 3.4, 1.7, -4.3));
  box(w, 1.5, 0.5, 0.04, CX - 2.65, 3.15, -4.3, redM); box(w, 1.5, 0.5, 0.04, CX - 2.65, 2.65, -4.3, whiteM);
  f.add(new THREE.BoxGeometry(4.6, 0.35, 1.9), darkW, at(CX, 0.175, -3.5)); f.add(new THREE.BoxGeometry(3.6, 1.05, 0.25), panelM, at(CX, 0.875, -2.7)); f.add(new THREE.BoxGeometry(3.9, 0.1, 1.0), darkW, at(CX, 1.45, -3.0));
  f.add(new THREE.BoxGeometry(2.6, 0.95, 0.14), panelM, at(COURT.ujang[0] + 0.2, 0.475, 0.35));              // pagar terdakwa
  f.add(new THREE.BoxGeometry(1.3, 0.9, 0.8), panelM, at(COURT.lurah[0], 0.45, COURT.lurah[2] - 0.35));         // kursi saksi
  f.add(new THREE.BoxGeometry(3.4, 0.5, 0.6), darkW, at(CX - 2.8, 0.25, 2.9)); f.add(new THREE.BoxGeometry(3.4, 0.5, 0.6), darkW, at(CX + 2.8, 0.25, 2.9));
  w.build(root, false); f.build(root, true);
  const gavel = new THREE.Group(), gm = lam("hhGavel", () => ({ color: "#7a4a24" })), gb = new Batch();
  gb.add(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8), gm, at(0, 0.17, 0)); gb.add(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 10).rotateZ(Math.PI / 2), gm, at(0, 0.36, 0));
  gb.build(gavel, true); gavel.position.set(CX + 0.4, 1.5, -2.95); gavel.rotation.z = 1.45; root.add(gavel);
  const block = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 14), darkW); block.position.set(CX + 0.1, 1.53, -2.95); root.add(block);
  return { root, gavel };
};
