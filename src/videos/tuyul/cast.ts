// Karakter 2D & kartu FX untuk "Tuyul Mogok Kerja" (Pak Slamet, dukun, tuyul, Pak Lurah, warga).
// Infrastruktur (Pool, Actor, Fx, person, blob, kedipan, hop) dipakai ulang dari framework;
// yang baru: Pak Slamet, dukun, tuyul (build "kid", botak), ketua tuyul, Pak Lurah, warga, kartu kontrak/uang/plakat, staging 28 shot.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, fxBurst,
  Outfit, FrontOpts, SideOpts, Prop, INK,
} from "./toon";
import { FPS, SHOTS, clamp01, glide, WorldState, houseFlags, streetFlags, HOME, HUT, STREET_XS, tuyulStreetX, FIELD, BALAI, RUNNERS, runnerX, runnerDir, CROWD, AUDIENCE, SX, HX, UX, BX, LX } from "./story";
import A from "./anchors.json";
import { LightName } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

const AT = A as Record<string, number>;

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const ROOTS = new Set<THREE.Object3D>();

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}

export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else {
      this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0;
    }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;

const tier = (d: number): [number, number, number] =>
  d < 8.5 ? [1800, 3000, 3.0] : d < 14 ? [1080, 1800, 1.8] : [480, 800, 0.8];

const SUN = new THREE.Vector3(0.5, 0.75, 0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: LightName = "golden";

const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- blinks, expression swaps & micro-motion helpers ----------------
const LEAD = 2 / FPS;
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 48 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const liveTilt = (t: number, seed: number, amp = 2.6) => q(amp * Math.sin(t * 3.2 + seed), 30);
const liveHead = (t: number, seed: number, amp = 4.0) => q(amp * Math.sin(t * 2.4 + seed * 1.7) + (amp * 0.4) * Math.cos(t * 4.1 + seed), 30);

/** Parabolic hop/jump arc with a 3-frame crouch anticipation */
const hopY = (t: number, t0: number, dur = 0.42, height = 0.16): number => {
  const dt = t - t0;
  if (dt < -0.08 || dt > dur) return 0;
  if (dt < 0) return -0.025 * Math.sin(((dt + 0.08) / 0.08) * Math.PI);
  const u = dt / dur;
  return height * 4 * u * (1 - u);
};

type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, side: boolean, mirror: boolean, fo: FrontOpts, so: SideOpts, scale = 1): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const m = side && mirror, light = light2D(cam, m), seed = ((who.i * 5 + 3) % 7) + 1;
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror: m,
    draw: (p) => (side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

const CONTACT: Record<LightName, [number, number, number]> = {
  space: [0.18, 0.16, 0.32],
  night: [0.18, 0.16, 0.30],
  golden: [0.24, 0.20, 0.33],
  day: [0.20, 0.21, 0.33],
};
const TAIL: [number, number, number] = [0.38, 0.36, 0.56];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");

const blob = (out: Stage, x: number, _y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  const el = Math.asin(Math.min(0.99, Math.max(0.15, SUN.y)));
  const len = Math.min(2.2, Math.max(0.5, 1.4 / Math.tan(el))) * sc, h = len + 0.5 * sc, c = 0.3 * h;
  const tc = hexOf(TAIL, k);
  out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: 0.022, z: z + oz * 0.03 * sc, w: 0.54 * sc, h: 0.42 * sc, flat: true, rot });
};


const SEC_LEMARI = AT.lemari, SEC_KULKAS = AT.kulkas, SEC_DUKUN2 = AT.dukun2, SEC_KONTRAK = AT.kontrak, SEC_BEKERJA = AT.bekerja, SEC_TETANGGA = AT.tetangganya;
const SEC_LELAH = AT.lelah, SEC_SPANDUK = AT.spanduk, SEC_MALAM = AT.malam, SEC_PERSEN = AT.persen, SEC_MAKMUR = AT.makmur, SEC_TERN = AT.ternyata;
const HX_L = (dx: number) => HX + dx; // x lemari

// ---------------- Roster ----------------
const SLAMET: Outfit = { jacket: "#9a8a6c", pants: "#3c4a6b", boots: "#5a3b2a", hat: "hair", hair: "#6b6b6b", skin: "#fcfaf5", noButtons: true };
const DUKUN: Outfit = { jacket: "#4b2a72", vest: "#c9a227", pants: "#2a1a3a", boots: "#111111", hat: "tophat", glasses: true, skin: "#fcfaf5", noButtons: true };
const TUYULS: Outfit[] = ["#d8ecd0", "#f3e1c8", "#d0e2f3", "#f3d0e2"].map((j) => ({ jacket: j, pants: "#a5c99a", boots: "#fcfaf5", hat: null, skin: "#eaf6e4", build: "kid" as const, noButtons: true }));
const KETUA: Outfit = { jacket: "#2b6cb0", pants: "#1f3b73", boots: "#fcfaf5", hat: null, skin: "#eaf6e4", build: "kid", glasses: true, tie: "#c0392b", noButtons: false };
const NEIGH_A: Outfit = { jacket: "#2f9e6a", pants: "#3a3a4a", boots: "#222222", hat: "hair", hair: "#222222", skin: "#fcfaf5", noButtons: true };
const NEIGH_B: Outfit = { jacket: "#d9822b", pants: "#2d3a5a", boots: "#222222", hat: "hair", hair: "#4a3020", skin: "#fcfaf5", noButtons: true };
const LURAH: Outfit = { jacket: "#8a4b1a", vest: "#c9a227", pants: "#2a2a30", boots: "#111111", hat: "cap", cap: "#111111", glasses: true, build: "stout", skin: "#fcfaf5", noButtons: false };
const W_SLAMET: Who = { i: 1, o: SLAMET, okey: "slamet" };
const W_DUKUN: Who = { i: 2, o: DUKUN, okey: "dukun" };
const W_KETUA: Who = { i: 4, o: KETUA, okey: "ketua" };
const W_NA: Who = { i: 5, o: NEIGH_A, okey: "na" };
const W_NB: Who = { i: 6, o: NEIGH_B, okey: "nb" };
const W_LURAH: Who = { i: 7, o: LURAH, okey: "lurah" };
const W_TUYUL = (k: number): Who => ({ i: 8 + (k % 4), o: TUYULS[k % 4], okey: "tuyul" + (k % 4) });

// ---------------- Kartu FX ----------------
const fxText = (p: Pen, text: string, col: string, size = 190) => {
  const g = p.g;
  g.textAlign = "center"; g.lineJoin = "round";
  g.font = `900 ${size}px 'Poppins', 'Arial Black', sans-serif`;
  g.lineWidth = 22; g.strokeStyle = INK; g.strokeText(text, 160, 210);
  g.fillStyle = col; g.fillText(text, 160, 210);
};
// kontrak tuyul (kertas, pasal, stempel SAH)
const fxContract = (p: Pen, tt: number) => {
  const g = p.g; g.lineJoin = "round";
  g.fillStyle = "#fff6dc"; g.strokeStyle = INK; g.lineWidth = 12;
  g.beginPath(); g.roundRect(18, 14, 424, 572, 22); g.fill(); g.stroke();
  g.textAlign = "center"; g.fillStyle = "#3a2410";
  g.font = "900 46px 'Segoe UI', Arial, sans-serif"; g.fillText("KONTRAK TUYUL", 230, 80);
  g.fillRect(50, 98, 360, 5);
  g.textAlign = "left"; g.font = "700 30px 'Segoe UI', Arial, sans-serif";
  const L = ["Pasal 1", "Jam kerja malam:", "22.00 - 04.00", "Pasal 2", "Cuti wajib: Jumat", "Pasal 3", "Bonus: 1 permen"];
  L.forEach((s, i) => { g.font = (i === 0 || i === 3 || i === 5 ? "900 " : "600 ") + "30px 'Segoe UI', Arial, sans-serif"; g.fillStyle = i === 0 || i === 3 || i === 5 ? "#8e1f2f" : "#3a2410"; g.fillText(s, 50, 150 + i * 52); });
  g.strokeStyle = "#3a2410"; g.lineWidth = 3; g.beginPath(); g.moveTo(50, 540); g.lineTo(230, 540); g.stroke();
  g.font = "italic 26px 'Segoe UI', Arial, sans-serif"; g.fillStyle = "#3a2410"; g.fillText("ttd. Tuyul", 60, 530);
  const k = clamp01((tt - 0) / 0.2);
  g.save(); g.translate(350, 470); g.rotate(-0.35); g.globalAlpha = k; g.strokeStyle = "#d62828"; g.lineWidth = 8;
  g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#d62828"; g.textAlign = "center"; g.font = "900 44px 'Segoe UI', Arial, sans-serif"; g.fillText("SAH", 0, 16); g.restore();
};
const fxMoney = (p: Pen) => { // sebundel uang (Rp)
  const g = p.g; g.lineJoin = "round";
  for (let i = 0; i < 2; i++) {
    g.fillStyle = i ? "#5db573" : "#4f9d63"; g.strokeStyle = INK; g.lineWidth = 7;
    g.beginPath(); g.roundRect(24, 120 - i * 38, 196, 90, 10); g.fill(); g.stroke();
    g.fillStyle = "#efe6c0"; g.fillRect(104, 122 - i * 38, 36, 86);
    g.fillStyle = "#1f5a33"; g.textAlign = "center"; g.font = "900 40px 'Segoe UI', Arial, sans-serif"; g.fillText("Rp", 62, 180 - i * 38);
  }
};
const fxSign = (p: Pen, text: string, tt: number) => { // plakat demo di tongkat
  const g = p.g; g.lineJoin = "round";
  g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.moveTo(160, 190); g.lineTo(160, 300); g.stroke();
  g.fillStyle = "#fffdf0"; g.lineWidth = 10; g.beginPath(); g.roundRect(30, 30, 260, 160, 16); g.fill(); g.stroke();
  g.fillStyle = "#c0392b"; g.textAlign = "center"; g.font = "900 56px 'Segoe UI', Arial, sans-serif"; g.fillText(text, 160, 128 + Math.sin(tt * 9) * 1);
};

// ---------------- Staging 28 shot ----------------
export const stage = (ws: WorldState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const { id, f, t } = ws;
  LNAME = SHOTS[id - 1].light;
  findSun(cam, SUN);

  const addChar = (who: Who, x: number, y: number, z: number, fo: FrontOpts, scale = 0.84, side = false, mirror = false, so: SideOpts = {}, shadow = true) => {
    out.places.push(person(cam, who, x, y, z, side, mirror, fo, so, scale));
    if (shadow) blob(out, x, y, z, scale * 0.95);
  };
  const card = (key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, soft = false) =>
    out.fx.push({ key, cw, ch, draw, x, y, z, w, h, soft });
  const burst = (key: string, t0: number, dur: number, col: string, x: number, y: number, z: number, s = 1.2) => {
    if (t >= t0 && t < t0 + dur) { const bt = q(clamp01((t - t0) / dur), 20); card(`fx|burst|${key}|${bt}`, 500, 500, (p) => fxBurst(p, bt, col, 12, 36, 235), x, y, z, s, s); }
  };
  const stand = (who: Who, x: number, y: number, z: number, expr: any, seed: number, extra: Partial<FrontOpts> = {}, scale = 0.84, facing = 1) =>
    addChar(who, x, y, z, { mode: "stand", phase: q(t * 0.8 + seed * 0.13, 20), expr, blink: lidAt(t, seed), tilt: liveTilt(t, seed, 2.2), headTilt: liveHead(t, seed, 3.4), look: facing, facing, ...extra }, scale);
  const shake = q(Math.sin(t * 22), 10);
  const tuyulK = (i: number) => TUYULS.length > i ? i : i % 4;

  if (ws.setKind === "house") {
    const [sx, , sz] = HOME.slamet, hf = houseFlags(t, id);
    if (id === 1) {
      stand(W_SLAMET, sx, 0, sz, "pained", 1, { tilt: 5 + liveTilt(t, 1, 2), headTilt: 8 });
      card("fx|dots", 320, 280, (p) => fxText(p, "...", "#ffffff", 150), sx + 0.2, 2.05 + Math.sin(t * 3) * 0.04, 0.3, 0.6, 0.5, true);
    } else if (id === 8) {
      const hop = hopY(t, SEC_LEMARI + 0.3, 0.3, 0.09) + 0.05 * Math.abs(Math.sin(t * 8));
      stand(W_TUYUL(0), HOME.tuyul[0], hop, HOME.tuyul[2] + 0.4, "grin", 3, { phase: q(t * 1.6, 20) }, 0.58, -1);
      for (let i = 0; i < 3; i++) burst("lem" + i, SEC_LEMARI + 0.5 + i * 0.7, 0.35, "#ffe066", HX_L(0.1 * (i - 1)), 1.1 + 0.3 * i, -2.0, 0.9);
    } else if (id === 9 || id === 10) {
      stand(W_SLAMET, sx, 0, sz, id === 9 ? "shock" : "laugh", 1, id === 10 ? { wave: q(Math.sin(t * 5) * 0.6, 10) } : {});
      if (id === 10) burst("proud", SEC_KULKAS + 0.3, 0.4, "#ffd43b", sx, 1.7, 0.3, 1.3);
    } else if (id === 25) {
      stand(W_SLAMET, sx, 0, sz, "shock", 1, { wave: shake });
      card("fx|q", 320, 280, (p) => fxText(p, "?", "#ffd60a", 200), sx + 0.1, 2.15 + Math.sin(t * 6) * 0.04, 0.3, 0.55, 0.48, true);
    } else {
      // 26-28: duduk di bangku
      const ex = id === 26 ? "dazed" : id === 27 ? "pained" : t < SEC_TERN + 1.2 ? "pained" : "dazed";
      addChar(W_SLAMET, sx, 0.34, sz, { mode: "sit", phase: q(t * 0.7, 20), expr: ex, blink: lidAt(t, 1), tilt: 4 + liveTilt(t, 1, 1.6), headTilt: 10 + liveHead(t, 1, 2.0), look: 1, facing: 1 }, 0.84, false, false, {}, false);
    }
  } else if (ws.setKind === "hut") {
    const [dx, , dz] = HUT.dukun, [sx, , sz] = HUT.slamet, [tx, , tz] = HUT.tuyul;
    const talky = id >= 5;
    stand(W_SLAMET, sx, 0, sz, id === 5 ? "shock" : id === 2 ? "nervous" : "nervous", 1, id === 5 ? { wave: shake } : {});
    const holding = id >= 3 && t < SEC_KONTRAK + 3.4;
    stand(W_DUKUN, dx, 0, dz, id === 6 ? "stern" : id === 2 ? "grin" : "smile", 2, holding || id >= 3 ? { prop: "cert", wave: q(Math.sin(t * 2) * 0.3, 10) } : {}, 0.86);
    if (id >= 3) {
      const k = id === 3 ? glide((t - SEC_DUKUN2) / 0.35) : 1;
      stand(W_TUYUL(0), tx, 0, tz, "stern", 3, {}, 0.58 * Math.max(0.01, k), -1);
      burst("magic", SEC_DUKUN2, 0.5, "#b98cff", tx, 0.7, tz + 0.2, 1.4);
    }
    if (id === 4) {
      const tq = q(t - SEC_KONTRAK, 30);
      card(`fx|contract|${tq}`, 460, 600, (p) => fxContract(p, tq), UX, 1.28, 0.45, 1.12, 1.46);
    }
    if (id === 5) card("fx|q", 320, 280, (p) => fxText(p, "?", "#ffd60a", 200), sx + 0.2, 2.15 + Math.sin(t * 6) * 0.04, 0.3, 0.55, 0.48, true);
    void talky;
  } else if (ws.setKind === "street") {
    const sf = streetFlags(t, id);
    if (id === 7) {
      const x = tuyulStreetX(t);
      addChar(W_TUYUL(0), x, 0, 0.2, {}, 0.58, true, false, { mode: "march", phase: q(t * 0.9, 40), expr: "grin", blink: lidAt(t, 3), stride: 0.6 }, true);
      let thefts = 0;
      [STREET_XS[2], STREET_XS[3]].forEach((hx, i) => {
        const tc = SEC_BEKERJA + ((hx - 0.9 - (SX - 3.5)) / 7) * (SEC_LEMARI - SEC_BEKERJA);
        if (t >= tc) thefts++;
        burst("thef" + i, tc, 0.4, "#ffe066", hx - 0.9, 1.3, -4.2, 1.0);
      });
      if (thefts > 0) card("fx|money", 260, 260, (p) => fxMoney(p), x + 0.3, 0.78 + Math.sin(t * 7) * 0.02, 0.45, 0.45, 0.45, true);
    } else if (id === 11) {
      const xs = STREET_XS;
      stand(W_NA, xs[1] + 1.3, 0, -3.2, "grin", 5, { wave: q(Math.sin(t * 4) * 0.5, 10) });
      stand(W_SLAMET, xs[2] + 0.6, 0, -3.3, "laugh", 1);
      stand(W_NB, xs[3] - 1.4, 0, -3.2, "grin", 6, { wave: q(Math.sin(t * 4 + 1) * 0.5, 10) });
      if (sf.peekTuyul) xs.forEach((x, i) => {
        const k = glide((t - (SEC_TETANGGA + 3.6 + i * 0.12)) / 0.25);
        stand(W_TUYUL(i + 1), x + 1.7, 0, -4.0, "grin", 10 + i, {}, 0.58 * Math.max(0.01, k), -1);
      });
    } else if (id === 12 || id === 13) {
      RUNNERS.forEach((r, i) => {
        const x = runnerX(i, t), dir = runnerDir(i, t);
        addChar(W_TUYUL(i), x, 0, r.lane, {}, 0.58, true, dir < 0, { mode: "march", phase: q(t * 1.5 + i * 0.2, 40), expr: i % 2 ? "grin" : "nervous", blink: lidAt(t, 3 + i), stride: 1.2 }, true);
        card("fx|money", 260, 260, (p) => fxMoney(p), x + 0.3 * dir, 0.78 + Math.sin(t * 7 + i) * 0.02, r.lane + 0.25, 0.4, 0.4, true);
      });
    } else if (id === 24) {
      stand(W_NA, SX - 3.1, 0, -3.0, "shock", 5, { wave: shake });
      stand(W_NB, SX - 1.9, 0, -3.0, "shock", 6, { wave: shake });
      stand(W_SLAMET, SX - 0.8, 0, -3.2, "dazed", 1);
      card("fx|q", 320, 280, (p) => fxText(p, "?", "#ffd60a", 200), SX - 3.0, 2.15 + Math.sin(t * 6) * 0.04, -2.9, 0.55, 0.48, true);
    }
  } else if (ws.setKind === "field") {
    const [kx, , kz] = FIELD.ketua, [sx, , sz] = FIELD.slamet;
    const strike = t >= SEC_MALAM;
    const signs = ["UPAH!", "CUTI!", "MOGOK!"];
    CROWD.forEach((c, i) => {
      if (t < c.enter) return;
      const k = glide((t - c.enter) / 0.3);
      if (strike) addChar(W_TUYUL(i), c.x, 0, c.z, { mode: "sit", phase: q(t * 0.5 + (i % 3) * 0.1, 20), expr: "stern", blink: lidAt(t, 3 + (i % 4)), look: 0, facing: 0 }, 0.58 * Math.max(0.01, k), false, false, {}, false);
      else addChar(W_TUYUL(i), c.x, id === 17 ? 0 : hopY(t, SEC_LELAH + 0.1 * (i % 5), 0.3, 0.06), c.z, { mode: "stand", phase: q(t * 0.9 + (i % 3) * 0.15, 20), expr: "stern", blink: lidAt(t, 3 + (i % 4)), look: 0, facing: 0 }, 0.58 * Math.max(0.01, k));
      if (t >= SEC_SPANDUK - 1 && i % 3 === 0 && !strike) {
        const tq = q(t, 30);
        card(`fx|sign|${i % 9}|${tq}`, 320, 320, (p) => fxSign(p, signs[(i / 3) % 3 | 0], tq), c.x, 1.45 + Math.sin(t * 6 + i) * 0.03, c.z + 0.2, 0.6, 0.6, true);
      }
    });
    stand(W_KETUA, kx, 0, kz, strike ? "stern" : "stern", 4, { prop: id === 21 ? null : null }, 0.62);
    if (id >= 19) stand(W_SLAMET, sx, 0, sz, id === 20 ? "smile" : id === 19 ? "nervous" : id === 22 ? "pained" : "shock", 1, id === 20 ? { prop: "icecream", wave: q(Math.sin(t * 3) * 0.2, 10) } : id >= 22 ? { wave: shake } : {});
    if (strike) {
      card("fx|mogok", 320, 280, (p) => fxText(p, "MOGOK!", "#ff4757", 110), LX, 1.55, 0.8, 1.9, 0.8, true);
    }
  } else {
    // balai desa
    const [lx, ly, lz] = BALAI.lurah;
    const cheer = id === 14 || id === 16;
    stand(W_LURAH, lx, ly, lz, id === 14 ? "grin" : "grin", 7, { prop: "mic", ...(id === 16 && t >= SEC_PERSEN ? { wave: q(Math.sin(t * 6), 10) } : {}) }, 0.86);
    AUDIENCE.forEach((a, i) => {
      const who = i % 2 ? W_NB : W_NA;
      stand(who, a.x, cheer ? hopY(t, SEC_MAKMUR + 0.08 * i, 0.3, 0.1) + (id === 16 && t >= SEC_PERSEN ? 0.08 * Math.abs(Math.sin(t * 8 + i)) : 0) : 0, a.z, cheer ? "laugh" : "smile", 5 + i, cheer ? { wave: q(Math.sin(t * 6 + i) * 0.7, 10) } : {});
    });
    stand(W_SLAMET, BX + 2.8, 0, 1.3, cheer ? "laugh" : "smile", 1, cheer ? { wave: q(Math.sin(t * 6) * 0.7, 10) } : {});
    burst("p300", SEC_PERSEN, 0.45, "#ffd43b", BX, 2.2, -2.6, 2.2);
  }
  return out;
};
