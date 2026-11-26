// Set prosedural "Segala Sesuatu Pasti Ada Hikmahnya":
//  buildLandSet()  : lahan 2 hektar. Hutan lebat + petak ladang, rumah (4 tahap), sumur, plang "TANAH NEGARA"
//  buildCourtSet() : ruang sidang (bangku hakim, palu, pagar terdakwa, bendera)
//  buildCellSet()  : sel penjara (jeruji, ranjang tingkat, jendela kecil)
//  buildGateSet()  : gerbang lapas tempat Bimo keluar bebas
// Pola mengikuti build.ts (Batch + lam() two-tone + tekstur Canvas2D); semua benda menapak tanah/lantai.
import * as THREE from "three";
import { Batch, lam, addTree } from "./build";
import { ctex, rep, rng, grassHD, planksHD, beamHD, stoneHD } from "./paint";
import { NOINK } from "./ink";
import { HOUSE, WELL, SIGN, GATE } from "./story";

const SPH = new THREE.SphereGeometry(1, 10, 8);
const at = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(sx, sy, sz));
const glow = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false });
const box = (b: Batch, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, ry = 0) =>
  b.add(new THREE.BoxGeometry(w, h, d), m, at(x, y, z, 1, 1, 1, ry));

const signTex = (key: string, lines: [string, number, string][], bg: string, border: string) =>
  ctex(key, 512, 256, (g) => {
    g.fillStyle = border; g.fillRect(0, 0, 512, 256);
    g.fillStyle = bg; g.fillRect(14, 14, 484, 228);
    g.textAlign = "center"; g.textBaseline = "middle";
    let y = 256 / (lines.length + 1);
    for (const [txt, sz, col] of lines) {
      g.font = `900 ${sz}px 'Segoe UI', Arial, sans-serif`; g.fillStyle = col; g.fillText(txt, 256, y); y += 256 / (lines.length + 1);
    }
  });

// ============================ LAHAN ============================
export type LandSet = { root: THREE.Group; plants: THREE.Group; house: THREE.Group[]; well: THREE.Group; sign: THREE.Group };
export const buildLandSet = (): LandSet => {
  const root = new THREE.Group();
  const R = rng(23);
  const grassM = lam("hkGrass", () => ({ map: rep(grassHD(), 30, 16) }));
  const earthM = lam("hkEarth", () => ({ color: "#8a6b43" }));
  const bushM = lam("hkBush", () => ({ color: "#3f8f3c" }));
  const b = new Batch();
  b.add(new THREE.BoxGeometry(130, 0.4, 70).translate(0, -0.2, -12), grassM);
  b.add(new THREE.BoxGeometry(15, 0.03, 10).translate(-0.5, 0.015, -1.2), earthM); // petak lahan
  // hutan lebat: tidak menumbuhi petak tengah dan jalur kamera
  for (let i = 0; i < 90; i++) {
    const x = -34 + i * 0.78 + (R() - 0.5) * 1.2, z = -4.2 - R() * 10;
    if (Math.abs(x - 0.5) < 8.5 && z > -7.2) continue;
    addTree(b, x, 0, z, 3.8 + R() * 2.2, i + 1);
  }
  for (let i = 0; i < 40; i++) {
    const x = -32 + i * 1.6 + R(), z = -14 - R() * 10;
    addTree(b, x, 0, z, 5 + R() * 2.4, 200 + i);
  }
  for (let i = 0; i < 70; i++) { // semak belukar: hutan "yang tidak diurus bertahun-tahun"
    const x = -26 + R() * 52, z = -1.8 - R() * 8, s = 0.35 + R() * 0.5;
    if (Math.abs(x - 0.5) < 8.0 && z > -6.5) continue;
    if (x > -5 && x < 5 && z > -2.5) continue;
    b.add(SPH, bushM, at(x, s * 0.65, z, s * 1.5, s, s * 1.3));
  }
  for (let i = 0; i < 16; i++) { // semak di sisi lintasan awal Bimo (jalan setapak sempit)
    const x = -26 + i * 1.5 + R(), z = 1.4 + R() * 1.6, s = 0.3 + R() * 0.3;
    if (x > -6) continue;
    b.add(SPH, bushM, at(x, s * 0.6, z, s * 1.4, s, s * 1.2));
  }
  b.build(root, true);

  // ---- ladang: 5 baris x 7 tanaman (batang + kipas 7 anak daun, tanpa alpha-texture) ----
  const plants = new THREE.Group();
  const pb = new Batch();
  const stemM = lam("hkStem", () => ({ color: "#6b8f2a" }));
  const leafM = lam("hkLeaf", () => ({ color: "#2f9a2f" }));
  const leafM2 = lam("hkLeaf2", () => ({ color: "#3fb53f" }));
  for (let rz = 0; rz < 5; rz++) for (let rx = 0; rx < 7; rx++) {
    const x = 1.3 + rx * 0.82 + (R() - 0.5) * 0.12, z = -1.3 - rz * 0.72 + (R() - 0.5) * 0.1, h = 0.95 + R() * 0.35;
    pb.add(new THREE.CylinderGeometry(0.025, 0.04, h, 6).translate(0, h / 2, 0), stemM, at(x, 0, z));
    for (const [yy, sc, rot] of [[h * 0.85, 1, 0], [h * 0.6, 0.85, 0.4], [h * 0.38, 0.7, 0.8]] as [number, number, number][]) {
      for (let k = 0; k < 7; k++) {
        const ang = rot + (k / 7) * Math.PI * 2, L = (k % 2 ? 0.26 : 0.34) * sc;
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(x + Math.cos(ang) * L * 0.55, yy + 0.05 - L * 0.12, z + Math.sin(ang) * L * 0.55),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -ang, -0.35)),
          new THREE.Vector3(L * 0.55, 0.012, 0.035 + 0.02 * sc));
        pb.add(SPH, k % 2 ? leafM : leafM2, m);
      }
    }
  }
  pb.build(plants, true);
  root.add(plants);

  // ---- rumah 4 tahap (pondasi, dinding bawah, dinding atas+pintu, atap) ----
  const woodM = lam("hkWood", () => ({ map: rep(planksHD(), 2, 2) }));
  const roofM = lam("hkRoof", () => ({ color: "#b5452d" }));
  const doorM = lam("hkDoor", () => ({ color: "#5b3a1c" }));
  const slabM = lam("hkSlab", () => ({ map: stoneHD("hkSlabStone") }));
  const house: THREE.Group[] = [];
  const hx = HOUSE.x, hz = HOUSE.z, W = 4.4, D = 3.4;
  { const s = new Batch(); s.add(new THREE.BoxGeometry(W + 0.4, 0.3, D + 0.4).translate(hx, 0.15, hz), slabM); const g = new THREE.Group(); s.build(g, true); house.push(g); }
  { const s = new Batch();
    box(s, W, 1.2, 0.2, hx, 0.9, hz + D / 2 - 0.1, woodM); box(s, W, 1.2, 0.2, hx, 0.9, hz - D / 2 + 0.1, woodM);
    box(s, 0.2, 1.2, D - 0.4, hx - W / 2 + 0.1, 0.9, hz, woodM); box(s, 0.2, 1.2, D - 0.4, hx + W / 2 - 0.1, 0.9, hz, woodM);
    const g = new THREE.Group(); s.build(g, true); house.push(g); }
  { const s = new Batch();
    box(s, W, 1.2, 0.2, hx, 2.1, hz - D / 2 + 0.1, woodM);
    box(s, 1.4, 1.2, 0.2, hx - 1.5, 2.1, hz + D / 2 - 0.1, woodM); box(s, 1.4, 1.2, 0.2, hx + 1.5, 2.1, hz + D / 2 - 0.1, woodM);
    box(s, 1.6, 0.5, 0.2, hx, 2.45, hz + D / 2 - 0.1, woodM);
    box(s, 0.2, 1.2, D - 0.4, hx - W / 2 + 0.1, 2.1, hz, woodM); box(s, 0.2, 1.2, D - 0.4, hx + W / 2 - 0.1, 2.1, hz, woodM);
    box(s, 0.8, 1.8, 0.12, hx, 1.2, hz + D / 2 - 0.05, doorM);
    const g = new THREE.Group(); s.build(g, true); house.push(g); }
  { const s = new Batch(); const rise = 1.1, half = W / 2 + 0.35, len = Math.hypot(half, rise);
    s.add(new THREE.BoxGeometry(len, 0.14, D + 0.6), roofM, at(hx - half / 2, 2.7 + rise / 2, hz, 1, 1, 1, 0, Math.atan2(rise, half)));
    s.add(new THREE.BoxGeometry(len, 0.14, D + 0.6), roofM, at(hx + half / 2, 2.7 + rise / 2, hz, 1, 1, 1, 0, -Math.atan2(rise, half)));
    box(s, 0.5, 1.2, 0.5, hx + 1.2, 3.5, hz - 0.6, slabM);
    const g = new THREE.Group(); s.build(g, true); house.push(g); }
  house.forEach((g) => { g.visible = false; root.add(g); });

  // ---- sumur: cincin batu, lubang gelap, tiang + palang kayu, ember ----
  const well = new THREE.Group();
  const wb = new Batch();
  const stoneM = lam("hkWellStone", () => ({ map: stoneHD("hkWellStoneTex") }));
  const hole = lam("hkHole", () => ({ color: "#0b0a10" }));
  wb.add(new THREE.CylinderGeometry(0.66, 0.7, 0.6, 18, 1, true).translate(WELL.x, 0.3, WELL.z), stoneM);
  wb.add(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 18).translate(WELL.x, 0.22, WELL.z), hole);
  wb.add(new THREE.TorusGeometry(0.68, 0.07, 6, 18).rotateX(Math.PI / 2).translate(WELL.x, 0.6, WELL.z), stoneM);
  box(wb, 0.12, 1.6, 0.12, WELL.x - 0.8, 0.8, WELL.z, woodM); box(wb, 0.12, 1.6, 0.12, WELL.x + 0.8, 0.8, WELL.z, woodM);
  box(wb, 1.8, 0.12, 0.14, WELL.x, 1.62, WELL.z, woodM);
  wb.add(new THREE.CylinderGeometry(0.14, 0.11, 0.2, 10).translate(WELL.x + 0.3, 1.2, WELL.z + 0.02), doorM);
  wb.add(SPH, earthM, at(WELL.x + 1.0, 0.1, WELL.z + 0.5, 0.7, 0.25, 0.45)); // gundukan tanah galian
  wb.add(SPH, earthM, at(WELL.x - 0.9, 0.08, WELL.z + 0.7, 0.5, 0.18, 0.35));
  wb.build(well, true); well.visible = false; root.add(well);

  // ---- plang TANAH NEGARA ----
  const sign = new THREE.Group();
  const sb = new Batch();
  const postM = lam("hkPost", () => ({ color: "#6b4a22" }));
  const boardM = lam("hkBoard", () => ({ map: signTex("hkSignTex", [["TANAH NEGARA", 74, "#d62828"], ["DILARANG MASUK", 40, "#222222"]], "#ffffff", "#d62828") }));
  sb.add(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 8).translate(SIGN.x - 0.55, 0.95, SIGN.z), postM);
  sb.add(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 8).translate(SIGN.x + 0.55, 0.95, SIGN.z), postM);
  sb.add(new THREE.BoxGeometry(1.7, 0.85, 0.08).translate(SIGN.x, 1.45, SIGN.z + 0.06), boardM);
  sb.build(sign, true); sign.visible = false; root.add(sign);
  return { root, plants, house, well, sign };
};

// ============================ RUANG SIDANG ============================
export type CourtSet = { root: THREE.Group; gavel: THREE.Group };
export const buildCourtSet = (): CourtSet => {
  const root = new THREE.Group();
  const floorM = lam("hkCFloor", () => ({ map: rep(planksHD(), 4, 3) }));
  const wallM = lam("hkCWall", () => ({ color: "#d9c9a3" }));
  const panelM = lam("hkCPanel", () => ({ map: beamHD() }));
  const darkW = lam("hkCDark", () => ({ color: "#5a3a1c" }));
  const redM = lam("hkCRed", () => ({ color: "#d62828" }));
  const whiteM = lam("hkCWhite", () => ({ color: "#f4f4f4" }));
  const goldM = lam("hkCGold", () => ({ color: "#c9a227" }));
  const w = new Batch(), f = new Batch();
  w.add(new THREE.BoxGeometry(11, 0.2, 9).translate(0, -0.1, -1), floorM);
  w.add(new THREE.BoxGeometry(11, 4.0, 0.2).translate(0, 2.0, -4.6), wallM);
  w.add(new THREE.BoxGeometry(0.2, 4.0, 9).translate(-5.4, 2.0, -1), wallM);
  w.add(new THREE.BoxGeometry(0.2, 4.0, 9).translate(5.4, 2.0, -1), wallM);
  w.add(new THREE.BoxGeometry(10.6, 1.3, 0.12).translate(0, 0.65, -4.46), panelM);
  w.add(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24).rotateX(Math.PI / 2).translate(0, 3.0, -4.48), goldM); // lambang
  w.add(new THREE.CylinderGeometry(0.03, 0.03, 3.4, 8).translate(-3.4, 1.7, -4.3), darkW);                     // tiang bendera
  box(w, 1.5, 0.5, 0.04, -2.65, 3.15, -4.3, redM); box(w, 1.5, 0.5, 0.04, -2.65, 2.65, -4.3, whiteM);
  // bangku hakim: panggung, panel depan, meja
  f.add(new THREE.BoxGeometry(4.6, 0.35, 1.9), darkW, at(0, 0.175, -3.5));
  f.add(new THREE.BoxGeometry(3.6, 1.05, 0.25), panelM, at(0, 0.875, -2.7));
  f.add(new THREE.BoxGeometry(3.9, 0.1, 1.0), darkW, at(0, 1.45, -3.0));
  // pagar terdakwa + bangku pengunjung
  f.add(new THREE.BoxGeometry(2.6, 0.95, 0.14), panelM, at(0, 0.475, 0.35));
  f.add(new THREE.BoxGeometry(0.16, 1.1, 0.16), darkW, at(-1.4, 0.55, 0.35)); f.add(new THREE.BoxGeometry(0.16, 1.1, 0.16), darkW, at(1.4, 0.55, 0.35));
  f.add(new THREE.BoxGeometry(3.4, 0.5, 0.6), darkW, at(-2.8, 0.25, 2.6)); f.add(new THREE.BoxGeometry(3.4, 0.5, 0.6), darkW, at(2.8, 0.25, 2.6));
  f.add(new THREE.BoxGeometry(3.4, 0.9, 0.12), darkW, at(-2.8, 0.7, 2.95)); f.add(new THREE.BoxGeometry(3.4, 0.9, 0.12), darkW, at(2.8, 0.7, 2.95));
  w.build(root, false); f.build(root, true);
  // palu: kepala + gagang (pivot di ujung gagang, dianimasikan oleh world.ts)
  const gavel = new THREE.Group();
  const gm = lam("hkGavel", () => ({ color: "#7a4a24" }));
  const gb = new Batch();
  gb.add(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8).translate(0, 0.17, 0), gm);
  gb.add(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 10).rotateZ(Math.PI / 2).translate(0, 0.36, 0), gm);
  gb.build(gavel, true);
  gavel.position.set(0.4, 1.5, -2.95);
  root.add(gavel);
  const block = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 14), darkW); block.position.set(0.1, 1.53, -2.95); root.add(block);
  return { root, gavel };
};

// ============================ SEL PENJARA ============================
export const buildCellSet = () => {
  const root = new THREE.Group();
  const conc = lam("hkConcrete", () => ({ map: stoneHD("hkCellStone") }));
  const floorM = lam("hkCellFloor", () => ({ color: "#6e727c" }));
  const iron = lam("hkIron", () => ({ color: "#2b2f3a" }));
  const bedM = lam("hkBunk", () => ({ color: "#8a8f9a" }));
  const w = new Batch(), f = new Batch();
  w.add(new THREE.BoxGeometry(5.4, 0.2, 6.2).translate(0, -0.1, -0.5), floorM);
  w.add(new THREE.BoxGeometry(5.4, 3.6, 0.2).translate(0, 1.8, -3.5), conc);
  w.add(new THREE.BoxGeometry(0.2, 3.6, 6.2).translate(-2.7, 1.8, -0.5), conc);
  w.add(new THREE.BoxGeometry(0.2, 3.6, 6.2).translate(2.7, 1.8, -0.5), conc);
  for (let i = 0; i < 16; i++) f.add(new THREE.CylinderGeometry(0.035, 0.035, 3.6, 6), iron, at(-2.55 + i * 0.34, 1.8, 0.45));
  for (const y of [0.35, 1.8, 3.4]) f.add(new THREE.BoxGeometry(5.4, 0.08, 0.08), iron, at(0, y, 0.45));
  f.add(new THREE.BoxGeometry(1.9, 0.1, 0.9), bedM, at(-1.7, 0.5, -2.9)); f.add(new THREE.BoxGeometry(1.9, 0.1, 0.9), bedM, at(-1.7, 1.45, -2.9));
  for (const [x, z] of [[-2.6, -3.3], [-0.8, -3.3], [-2.6, -2.5], [-0.8, -2.5]]) f.add(new THREE.BoxGeometry(0.07, 1.5, 0.07), iron, at(x, 0.75, z));
  w.build(root, false); f.build(root, true);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), glow(1.5, 1.7, 2.3)); win.position.set(1.4, 2.5, -3.38); win.layers.set(NOINK); root.add(win);
  return root;
};

// ============================ GERBANG LAPAS ============================
export const buildGateSet = () => {
  const root = new THREE.Group();
  const grassM = lam("hkGGrass", () => ({ map: rep(grassHD(), 8, 6) }));
  const roadM = lam("hkRoad", () => ({ color: "#a89c86" }));
  const wallM = lam("hkGWall", () => ({ map: stoneHD("hkGateStone") }));
  const iron = lam("hkGIron", () => ({ color: "#2b2f3a" }));
  const boardM = lam("hkLapas", () => ({ map: signTex("hkLapasTex", [["LAPAS KELAS I", 62, "#ffffff"]], "#1f3b73", "#ffffff") }));
  const dark = lam("hkYard", () => ({ color: "#1d1b24" }));
  const b = new Batch();
  const x0 = GATE.x;
  b.add(new THREE.BoxGeometry(60, 0.4, 40).translate(x0, -0.2, -4), grassM);
  b.add(new THREE.BoxGeometry(5, 0.03, 20).translate(x0, 0.015, 2), roadM);
  b.add(new THREE.BoxGeometry(9, 3.6, 0.7).translate(x0 - 5.2, 1.8, -4.2), wallM); b.add(new THREE.BoxGeometry(9, 3.6, 0.7).translate(x0 + 5.2, 1.8, -4.2), wallM);
  b.add(new THREE.BoxGeometry(0.6, 4.0, 0.9).translate(x0 - 1.75, 2.0, -4.2), wallM); b.add(new THREE.BoxGeometry(0.6, 4.0, 0.9).translate(x0 + 1.75, 2.0, -4.2), wallM);
  b.add(new THREE.BoxGeometry(3.9, 0.5, 0.9).translate(x0, 3.75, -4.2), wallM);
  b.add(new THREE.BoxGeometry(3.4, 0.7, 0.14).translate(x0, 4.35, -4.0), boardM);
  b.add(new THREE.BoxGeometry(2.8, 3.4, 0.2).translate(x0, 1.7, -6.0), dark);                      // halaman dalam yang gelap
  // pintu besi terbuka
  b.add(new THREE.BoxGeometry(1.3, 3.0, 0.08), iron, at(x0 - 1.5, 1.5, -3.2, 1, 1, 1, 1.2));
  const R = rng(5);
  for (let i = 0; i < 20; i++) addTree(b, x0 - 24 + i * 2.5 + R(), 0, -14 - R() * 6, 5 + R() * 2, 500 + i);
  b.build(root, true);
  return root;
};
