// Dua set prosedural untuk "Plot Twist Tidak Berguna #2: Tips Hewan Buas":
//  - buildForestSet(bank): hutan golden hour + jalan tanah + sungai + hutan di seberang (set "mimpi")
//  - buildBedroomSet(): kamar tidur pagi (set "kenyataan"): kasur + selimut basah, jendela, pintu, jam, lampu meja
// Pola mengikuti build.ts (Batch + lam() two-tone + tekstur Canvas2D); kaidah grounding: semua benda menapak lantai/tanah.
import * as THREE from "three";
import { Batch, lam, addTree, rugTex } from "./build";
import { ctex, rep, rng, grassHD, planksHD, beamHD, stoneHD } from "./paint";
import { NOINK } from "./ink";
import { BED } from "./story";

// ---------------- tekstur ----------------
const riverTex = () => ctex("tipsRiverTex", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#3f9fd8"); gr.addColorStop(1, "#2f86c4");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const x = r() * 512, y = r() * 512, w = 30 + r() * 60;
    g.strokeStyle = r() > 0.5 ? "rgba(190,235,255,0.75)" : "rgba(255,230,180,0.55)";
    g.lineWidth = 3 + r() * 3;
    for (const dx of [-512, 0, 512]) { g.beginPath(); g.moveTo(x + dx, y); g.quadraticCurveTo(x + dx + w / 2, y - 7, x + dx + w, y); g.stroke(); }
  }
});

const wallTex = () => ctex("tipsWallpaper", 512, 512, (g) => {
  g.fillStyle = "#f2e2b8"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "#e9d3a0"; g.fillRect(x, 0, 24, 512); }
  g.fillStyle = "rgba(160,120,70,0.25)";
  for (let y = 24; y < 512; y += 64) for (let x = 12; x < 512; x += 64) { g.beginPath(); g.arc(x + 20, y, 4, 0, Math.PI * 2); g.fill(); }
});

// selimut biru bergaris + noda basah (posisi noda = BED.stain terhadap bidang selimut)
export const BLANKET = { x0: -1.22, x1: 0.56, z0: -2.48, z1: -1.32 };
const blanketTex = () => ctex("tipsBlanketStain", 512, 512, (g, r) => {
  g.fillStyle = "#5b7fd8"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#7f9be6";
  for (let y = 40; y < 512; y += 78) g.fillRect(0, y, 512, 22);
  const w = BLANKET.x1 - BLANKET.x0, d = BLANKET.z1 - BLANKET.z0;
  const cx = ((BED.stain[0] - BLANKET.x0) / w) * 512;
  const cy = (0.5 + (BED.stain[2] - (BLANKET.z0 + d / 2)) / d) * 512;
  const blob = (rx: number, ry: number, col: string) => {
    g.fillStyle = col; g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2, k = 1 + 0.12 * Math.sin(a * 3 + 1) + 0.07 * Math.sin(a * 5 + r() * 0.4);
      const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath(); g.fill();
  };
  blob(104, 126, "#3a54b0");
  blob(84, 104, "#2c4290");
  g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.ellipse(cx - 28, cy - 36, 20, 12, -0.5, 0, Math.PI * 2); g.fill();
});

const glow = (r: number, gr: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, gr, b), fog: false });
const SPH = new THREE.SphereGeometry(1, 10, 8);
const at = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

// ===============================================================================================================
// SET 1: HUTAN GOLDEN HOUR + SUNGAI
//   x < bank  : tanah berumput + jalan tanah (z = 0) tempat Bimo lari
//   bank..+12 : sungai (mengalir sepanjang z), seberang: tanah berumput + hutan
// ===============================================================================================================
export const buildForestSet = (bank: number) => {
  const g = new THREE.Group();
  const b = new Batch();
  const grassM = lam("tipsGrass", () => ({ map: rep(grassHD(), 30, 16) }));
  const dirtM = lam("tipsDirt", () => ({ color: "#b98a52" }));
  const sandM = lam("tipsSand", () => ({ color: "#e8d29a" }));
  const riverM = lam("tipsRiver", () => ({ map: rep(riverTex(), 10, 14) }));
  const rockM = lam("tipsRock", () => ({ map: stoneHD("tipsRockHD") }));
  const R = rng(17);
  const RIVER_W = 12;

  // tanah: dekat (sisi Bimo) + seberang
  const nearW = bank + 56;
  b.add(new THREE.BoxGeometry(nearW, 0.4, 70).translate(bank - nearW / 2, -0.2, -10), grassM);
  b.add(new THREE.BoxGeometry(60, 0.4, 70).translate(bank + RIVER_W + 30, -0.2, -10), grassM);
  // jalan tanah selebar 2.6 m
  b.add(new THREE.BoxGeometry(nearW - 1.0, 0.03, 2.6).translate(bank - nearW / 2 - 0.5, 0.015, 0.0), dirtM);
  // sungai (permukaan -0.2) + pasir di dua tepi
  b.add(new THREE.BoxGeometry(RIVER_W, 0.4, 70).translate(bank + RIVER_W / 2, -0.4, -10), riverM);
  b.add(new THREE.BoxGeometry(0.9, 0.03, 70).translate(bank - 0.45, 0.015, -10), sandM);
  b.add(new THREE.BoxGeometry(0.9, 0.03, 70).translate(bank + RIVER_W + 0.45, 0.015, -10), sandM);

  // batu di tepi sungai (sisi Bimo)
  for (let i = 0; i < 9; i++) {
    const rz = -2.8 - R() * 12, rs = 0.22 + R() * 0.26; // batu hanya di belakang jalan: sisi kamera dibiarkan bersih agar pancuran terlihat
    b.add(SPH, rockM, at(bank - 0.15 + R() * 0.4, rs * 0.4, rz, rs * 1.3, rs * 0.8, rs));
  }
  // semak
  const bushM = lam("tipsBush", () => ({ color: "#3f8f3c" }));
  for (let i = 0; i < 26; i++) {
    const bx = -40 + R() * (bank + 30), bz = -2.6 - R() * 12;
    if (bx > bank - 1 && bx < bank + RIVER_W + 1) continue;
    const s = 0.4 + R() * 0.5;
    b.add(SPH, bushM, at(bx, s * 0.6, bz, s * 1.4, s, s * 1.2));
  }

  // pohon: baris dekat (di belakang jalan), baris jauh, hutan seberang sungai
  for (let i = 0; i < 48; i++) {
    const x = -40 + i * 2.1 + (R() - 0.5) * 1.1;
    if (x > bank - 0.8) continue;
    addTree(b, x, 0, -3.8 - R() * 3.0, 3.6 + R() * 1.6, i + 1);
  }
  for (let i = 0; i < 42; i++) {
    const x = -42 + i * 2.2 + R();
    if (x > bank - 1) continue;
    addTree(b, x, 0, -9.5 - R() * 7, 4.6 + R() * 2.2, 100 + i);
  }
  for (let i = 0; i < 24; i++) addTree(b, bank + RIVER_W + 2 + i * 2.4 + R(), 0, -5 - R() * 9, 4.2 + R() * 2.2, 300 + i);
  for (let i = 0; i < 14; i++) addTree(b, bank + RIVER_W + 3 + i * 3.4 + R(), 0, 1.5 + R() * 5, 4.0 + R() * 1.8, 400 + i);

  b.build(g, true);
  return g;
};

// ===============================================================================================================
// SET 2: KAMAR TIDUR PAGI (kenyataan) - kasur dengan selimut basah, jendela matahari pagi, pintu, jam, lampu meja
// Dinding/lantai tidak melempar bayangan (castShadow=false) agar sun tidak menggelapkan isi kamar.
// ===============================================================================================================
export const buildBedroomSet = () => {
  const g = new THREE.Group();
  const f = new Batch(); // furnitur (cast shadow)
  const w = new Batch(); // cangkang ruangan (receive only)

  const floorM = lam("tipsFloor", () => ({ map: rep(planksHD(), 3, 2) }));
  const wallM = lam("tipsWallM", () => ({ map: rep(wallTex(), 6, 3) }));
  const woodM = lam("tipsWood", () => ({ map: beamHD() }));
  const woodDark = lam("tipsWoodDark", () => ({ color: "#6f4a24" }));
  const whiteM = lam("tipsWhite", () => ({ color: "#f6f1e6" }));
  const frameM = lam("tipsFrame", () => ({ color: "#8a5a2e" }));
  const mattM = lam("tipsMattress", () => ({ color: "#e8e0d0" }));
  const blanketM = lam("tipsBlanketBody", () => ({ color: "#4f72cc" }));
  const blanketTopM = lam("tipsBlanketTop", () => ({ map: blanketTex() }));
  const rugM = lam("tipsRug", () => ({ map: rugTex("#8f2d38", "#e0a84c") }));
  const curtainM = lam("tipsCurtain", () => ({ color: "#c94c4c" }));
  const darkM = lam("tipsHall", () => ({ color: "#15101e" }));
  const clockM = lam("tipsClockFace", () => ({ color: "#ffffff" }));
  const ink = lam("tipsInk", () => ({ color: "#241726" }));

  // ---- cangkang ruangan: lantai y=0, dinding belakang z=-2.6, dinding kiri/kanan x=+-3.4 ----
  w.add(new THREE.BoxGeometry(6.8, 0.2, 5.2).translate(0, -0.1, -0.3), floorM);
  w.add(new THREE.BoxGeometry(6.8, 3.2, 0.2).translate(0, 1.6, -2.7), wallM);
  w.add(new THREE.BoxGeometry(0.2, 3.2, 5.2).translate(-3.3, 1.6, -0.3), wallM);
  w.add(new THREE.BoxGeometry(0.2, 3.2, 5.2).translate(3.3, 1.6, -0.3), wallM);
  w.add(new THREE.BoxGeometry(6.4, 0.9, 0.05).translate(0, 0.45, -2.575), woodM); // wainscot
  w.add(new THREE.BoxGeometry(6.4, 0.06, 0.07).translate(0, 0.93, -2.57), woodDark);
  w.add(new THREE.BoxGeometry(2.6, 0.02, 1.5).translate(-0.4, 0.011, -0.6), rugM); // karpet di depan kasur

  // ---- kasur: bingkai + kasur + papan kepala/kaki + bantal + selimut (z -2.48..-1.32) ----
  f.add(new THREE.BoxGeometry(2.1, 0.32, 1.2).translate(-0.5, 0.16, -1.9), frameM);
  f.add(new THREE.BoxGeometry(2.0, 0.2, 1.1).translate(-0.5, 0.42, -1.9), mattM);
  f.add(new THREE.BoxGeometry(0.1, 1.0, 1.3).translate(-1.58, 0.6, -1.9), woodM);
  f.add(new THREE.BoxGeometry(0.08, 0.55, 1.25).translate(0.57, 0.38, -1.9), woodM);
  f.add(new THREE.BoxGeometry(0.5, 0.16, 0.8).translate(-1.3, 0.6, -1.9), whiteM);
  const bw = BLANKET.x1 - BLANKET.x0, bd = BLANKET.z1 - BLANKET.z0, bcx = (BLANKET.x0 + BLANKET.x1) / 2, bcz = (BLANKET.z0 + BLANKET.z1) / 2;
  f.add(new THREE.BoxGeometry(bw, 0.08, bd).translate(bcx, 0.56, bcz), blanketM);
  f.add(new THREE.PlaneGeometry(bw, bd).rotateX(-Math.PI / 2).translate(bcx, 0.602, bcz), blanketTopM);

  // ---- meja kecil + lampu (sumber cahaya hangat bermotif) ----
  f.add(new THREE.BoxGeometry(0.46, 0.55, 0.42).translate(-2.1, 0.275, -2.3), woodM);
  f.add(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 10).translate(-2.1, 0.66, -2.3), woodDark);

  // ---- jendela di atas kasur (x -1.15..0.05) + gorden ----
  const wx = -0.55, wy = 1.75;
  f.add(new THREE.BoxGeometry(1.3, 0.07, 0.1).translate(wx, wy + 0.5, -2.57), woodDark);
  f.add(new THREE.BoxGeometry(1.3, 0.07, 0.1).translate(wx, wy - 0.5, -2.57), woodDark);
  f.add(new THREE.BoxGeometry(0.07, 1.07, 0.1).translate(wx - 0.62, wy, -2.57), woodDark);
  f.add(new THREE.BoxGeometry(0.07, 1.07, 0.1).translate(wx + 0.62, wy, -2.57), woodDark);
  f.add(new THREE.BoxGeometry(0.04, 1.0, 0.08).translate(wx, wy, -2.57), woodDark);
  f.add(new THREE.BoxGeometry(0.28, 1.35, 0.1).translate(wx - 0.82, wy - 0.05, -2.52), curtainM);
  f.add(new THREE.BoxGeometry(0.28, 1.35, 0.1).translate(wx + 0.82, wy - 0.05, -2.52), curtainM);

  // ---- pintu terbuka ke lorong gelap (x 1.0..1.9) ----
  f.add(new THREE.BoxGeometry(0.8, 2.05, 0.06).translate(1.45, 1.02, -2.62), darkM);
  f.add(new THREE.BoxGeometry(0.1, 2.15, 0.12).translate(1.0, 1.07, -2.55), woodDark);
  f.add(new THREE.BoxGeometry(0.1, 2.15, 0.12).translate(1.9, 1.07, -2.55), woodDark);
  f.add(new THREE.BoxGeometry(0.98, 0.1, 0.12).translate(1.45, 2.17, -2.55), woodDark);

  // ---- jam dinding ----
  f.add(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 24).rotateX(Math.PI / 2).translate(0.55, 2.4, -2.55), ink);
  f.add(new THREE.CylinderGeometry(0.19, 0.19, 0.07, 24).rotateX(Math.PI / 2).translate(0.55, 2.4, -2.54), clockM);
  f.add(new THREE.BoxGeometry(0.025, 0.14, 0.02).translate(0.55, 2.47, -2.5), ink);
  f.add(new THREE.BoxGeometry(0.02, 0.1, 0.02).rotateZ(-0.9).translate(0.58, 2.43, -2.5), ink);

  w.build(g, false);
  f.build(g, true);

  // ---- aksen cahaya HDR (layer NOINK -> bloom): kaca jendela pagi + kap lampu ----
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.96), glow(1.7, 1.95, 2.3));
  glass.position.set(wx, wy, -2.58); glass.layers.set(NOINK); g.add(glass);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.26, 12), glow(2.3, 1.55, 0.7));
  shade.position.set(-2.1, 0.9, -2.3); shade.layers.set(NOINK); g.add(shade);
  return g;
};

