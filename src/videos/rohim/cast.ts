// Karakter 2D & kartu FX untuk "Gilanya Meyakinkan" (Pak Rohim, polisi, dokter, auditor, Pak Lurah, warga berpanci).
// Infrastruktur (Pool, Actor, Fx, person, blob, kedipan, hop) dipakai ulang dari framework;
// yang baru: Pak Slamet, dukun, tuyul (build "kid", botak), ketua tuyul, Pak Lurah, warga, kartu kontrak/uang/plakat, staging 28 shot.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, fxBurst,
  Outfit, FrontOpts, SideOpts, Prop, INK,
} from "./toon";
import { FPS, SHOTS, clamp01, glide, lerp, WorldState, ROH, MOTOR, POL, KLINIK, QUEUE, LURAH, CROWD, AUD1, AUD2, audX, ROH_SIT, ROH_END, JX, KX, DC } from "./story";
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



const SEC_PANCI = AT.panci, SEC_MOTOR = AT.motor, SEC_ANAK = AT.anak, SEC_POLISI = AT.polisi, SEC_GANGGUAN = AT.gangguan, SEC_GILANYA = AT.gilanya, SEC_BEBAS = AT.bebas;
const SEC_TETANGGA = AT.tetangganya, SEC_PUSKESMAS = AT.puskesmas, SEC_SEBULAN = AT.sebulan, SEC_SERATUS = AT.seratus, SEC_AUDIT = AT.audit, SEC_KAMI = AT.kami, SEC_ORANG = AT.orang;
const SEC_DICABUT = AT.dicabut, SEC_TUNGGAKAN = AT.tunggakan, SEC_LEMAS = AT.lemas, SEC_HANYA = AT.hanya, SEC_ASLI = AT.asli, SEC_DIPERT = AT.dipertahankan, SEC_BILANG = AT.bilang, SEC_KENA = AT.kena;

// ---------------- Roster ----------------
const mkKid = (j: string, h: string): Outfit => ({ jacket: j, pants: "#3a5ea8", boots: "#fcfaf5", hat: "hair", hair: h, skin: "#fcfaf5", build: "kid", noButtons: true });
const KIDS: Outfit[] = [mkKid("#ffd43b", "#1b1b1b"), mkKid("#ff6b81", "#3b2416"), mkKid("#5dade2", "#1b1b1b")];
const IBUS: Outfit[] = ["#d35400", "#8e44ad"].map((d) => ({ jacket: "#f4f1de", pants: "#3a3a4a", boots: "#222222", hat: "bonnet", dress: d, skin: "#fcfaf5", noButtons: true }));
const PRIAS: Outfit[] = [{ jacket: "#2f9e6a", pants: "#3a3a4a", boots: "#222222", hat: "hair", hair: "#222222", skin: "#fcfaf5", noButtons: true },
  { jacket: "#d9822b", pants: "#2d3a5a", boots: "#222222", hat: "hair", hair: "#4a3020", skin: "#fcfaf5", noButtons: true }];
const ROHIM: Outfit = { jacket: "#c0392b", pants: "#2e3a59", boots: "#3a2a1a", hat: "hair", hair: "#2b2b2b", skin: "#fcfaf5", noButtons: true };
const LURAHO: Outfit = { jacket: "#8a4b1a", vest: "#c9a227", pants: "#2a2a30", boots: "#111111", hat: "cap", cap: "#111111", glasses: true, build: "stout", skin: "#fcfaf5", noButtons: false };
const POLISI: Outfit = { jacket: "#1f3b73", pants: "#162447", boots: "#111111", hat: "cap", cap: "#1f3b73", skin: "#fcfaf5", noButtons: false };
const DOKTER: Outfit = { jacket: "#f4f6f8", pants: "#2d3a5a", boots: "#222222", hat: "hair", hair: "#6b6b6b", glasses: true, skin: "#fcfaf5", noButtons: false };
const AUDIT = (j: string, h: string, gl: boolean): Outfit => ({ jacket: j, pants: "#2a2d36", boots: "#111111", hat: "hair", hair: h, glasses: gl, tie: "#c0392b", skin: "#fcfaf5", noButtons: false });
const W_KID = (v: number): Who => ({ i: 20 + (v % 3), o: KIDS[v % 3], okey: "kid" + (v % 3) });
const W_IBU = (v: number): Who => ({ i: 30 + (v % 2), o: IBUS[v % 2], okey: "ibu" + (v % 2) });
const W_PRIA = (v: number): Who => ({ i: 40 + (v % 2), o: PRIAS[v % 2], okey: "pria" + (v % 2) });
const W_ROHIM: Who = { i: 1, o: ROHIM, okey: "rohim" };
const W_LURAH: Who = { i: 7, o: LURAHO, okey: "lurah" };
const W_POL: Who = { i: 5, o: POLISI, okey: "pol" };
const W_DOK: Who = { i: 9, o: DOKTER, okey: "dokter" };
const W_AUD1: Who = { i: 10, o: AUDIT("#3b3f4a", "#1b1b1b", true), okey: "aud1" };
const W_AUD2: Who = { i: 11, o: AUDIT("#4a4f5c", "#5a4a3a", false), okey: "aud2" };

// ---------------- Kartu FX ----------------
const fxText = (p: Pen, text: string, col: string, size = 190) => {
  const g = p.g; g.textAlign = "center"; g.lineJoin = "round";
  g.font = `900 ${size}px 'Poppins', 'Arial Black', sans-serif`; g.lineWidth = 22; g.strokeStyle = INK; g.strokeText(text, 160, 210);
  g.fillStyle = col; g.fillText(text, 160, 210);
};
const fxPot = (p: Pen) => { // panci di kepala: kubah perak, bibir, kuping, kenop
  const g = p.g; g.lineJoin = "round"; g.lineWidth = 11; g.strokeStyle = INK;
  g.fillStyle = "#b9c0cc"; g.beginPath(); g.ellipse(160, 150, 120, 96, 0, Math.PI, 0); g.lineTo(280, 170); g.lineTo(40, 170); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#8f98a8"; g.beginPath(); g.roundRect(26, 160, 268, 34, 14); g.fill(); g.stroke();
  g.fillStyle = "#6e7686"; for (const s of [-1, 1]) { g.beginPath(); g.roundRect(s < 0 ? 4 : 284, 150, 34, 24, 10); g.fill(); g.stroke(); }
  g.fillStyle = "#e7ebf1"; g.beginPath(); g.ellipse(120, 96, 34, 14, -0.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#3a3f4a"; g.beginPath(); g.arc(160, 56, 16, 0, Math.PI * 2); g.fill(); g.stroke();
};
const fxHeart = (p: Pen, tt: number) => {
  const g = p.g, s = 1 + 0.08 * Math.sin(tt * 8); g.save(); g.translate(160, 140); g.scale(s, s); g.lineJoin = "round";
  g.fillStyle = "#ff4d6d"; g.strokeStyle = INK; g.lineWidth = 12; g.beginPath(); g.moveTo(0, 70); g.bezierCurveTo(-120, -10, -60, -90, 0, -30); g.bezierCurveTo(60, -90, 120, -10, 0, 70); g.closePath(); g.fill(); g.stroke(); g.restore();
};
const fxChicken = (p: Pen, tt: number) => {
  const g = p.g; g.lineJoin = "round"; g.lineWidth = 9; g.strokeStyle = INK;
  const peck = Math.max(0, Math.sin(tt * 7)) * 22;
  g.strokeStyle = "#e08a1a"; g.lineWidth = 8; for (const x of [110, 150]) { g.beginPath(); g.moveTo(x, 170); g.lineTo(x, 212); g.lineTo(x - 14, 218); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 9; g.fillStyle = "#fffdf5"; g.beginPath(); g.ellipse(130, 140, 70, 52, -0.15, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(66, 130); g.lineTo(30, 100); g.lineTo(70, 108); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(190, 96 + peck, 32, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = "#e0392b"; for (const [x, y] of [[180, 62], [196, 58], [208, 66]] as [number, number][]) { g.beginPath(); g.arc(x, y + peck, 11, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.fillStyle = "#f2a31a"; g.beginPath(); g.moveTo(218, 94 + peck); g.lineTo(248, 104 + peck); g.lineTo(218, 112 + peck); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(198, 90 + peck, 5, 0, Math.PI * 2); g.fill();
};
const fxNotes = (p: Pen, tt: number) => {
  const g = p.g; g.lineJoin = "round"; g.lineCap = "round";
  [[70, 0.0], [150, 0.5]].forEach(([x, ph]) => {
    const k = (tt * 0.9 + ph) % 1, y = 190 - k * 150; g.globalAlpha = 1 - k * 0.6; g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = 8;
    g.beginPath(); g.ellipse(x, y, 22, 16, -0.4, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x + 18, y - 4); g.lineTo(x + 18, y - 62); g.quadraticCurveTo(x + 50, y - 50, x + 40, y - 24); g.stroke();
  });
  g.globalAlpha = 1;
};
const fxSpoon = (p: Pen, tt: number) => {
  const g = p.g; g.lineJoin = "round"; g.lineCap = "round"; const k = 0.5 + 0.5 * Math.sin(tt * 5);
  g.save(); g.translate(60 + k * 60, 100 - k * 30); g.rotate(-0.5 + k * 0.4);
  g.strokeStyle = INK; g.lineWidth = 16; g.beginPath(); g.moveTo(0, 0); g.lineTo(110, 0); g.stroke(); g.strokeStyle = "#c8ccd4"; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(110, 0); g.stroke();
  g.fillStyle = "#c8ccd4"; g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.ellipse(-8, 0, 30, 22, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = "#fffdf5"; g.beginPath(); g.ellipse(-10, -6, 20, 12, 0, 0, Math.PI * 2); g.fill(); g.restore();
};
const fxBubble = (p: Pen, l1: string, l2: string, tt: number) => {
  const g = p.g; g.lineJoin = "round"; g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = 10;
  g.beginPath(); g.roundRect(14, 14, 392, 190, 34); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(120, 200); g.lineTo(96, 250); g.lineTo(168, 202); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#ffffff"; g.fillRect(104, 196, 62, 14);
  g.fillStyle = "#1b1b1b"; g.textAlign = "center"; g.font = "900 54px 'Segoe UI', Arial, sans-serif";
  g.fillText(l1, 210, l2 ? 92 + Math.sin(tt * 8) * 1.5 : 128); if (l2) g.fillText(l2, 210, 156 + Math.sin(tt * 8) * 1.5);
};
const fxSweat = (p: Pen, tt: number) => {
  const g = p.g; g.lineJoin = "round";
  [70, 150, 230].forEach((x, i) => { const ph = (tt * 1.6 + i * 0.33) % 1; g.globalAlpha = 1 - ph * 0.7; g.fillStyle = "#8fd3ff"; g.strokeStyle = INK; g.lineWidth = 5;
    g.beginPath(); const y = 40 + ph * 150; g.moveTo(x, y - 24); g.quadraticCurveTo(x + 22, y + 8, x, y + 20); g.quadraticCurveTo(x - 22, y + 8, x, y - 24); g.fill(); g.stroke(); });
  g.globalAlpha = 1;
};

// ---------------- Staging 27 shot ----------------
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
  const bubble = (l1: string, l2: string, x: number, y: number, z: number, t0: number, t1: number, w = 0.9) => {
    if (t >= t0 && t < t1) { const k = glide((t - t0) / 0.18), tq = q(t, 30); card(`fx|bub|${l1}|${l2}|${tq}`, 420, 260, (p) => fxBubble(p, l1, l2, tq), x, y, z, w * k, w * 0.62 * k, true); }
  };
  const stand = (who: Who, x: number, y: number, z: number, expr: any, seed: number, extra: Partial<FrontOpts> = {}, scale = 0.84, facing: -1 | 0 | 1 = 1) =>
    addChar(who, x, y, z, { mode: "stand", phase: q(t * 0.8 + seed * 0.13, 20), expr, blink: lidAt(t, seed), tilt: liveTilt(t, seed, 2.2), headTilt: liveHead(t, seed, 3.4), look: facing, facing, ...extra }, scale);
  const shake = q(Math.sin(t * 22), 10);
  // panci di kepala (ukuran & tinggi mengikuti skala tokoh); pop = waktu mulai (animasi muncul), boleh jatuh setelah fall
  const pot = (x: number, z: number, kind: "a" | "k" | "s", t0 = -1, fall = -1, tag = "") => {
    if (t < t0) return;
    const [w, h, y0] = kind === "k" ? [0.40, 0.33, 1.06] : kind === "s" ? [0.58, 0.47, 1.9] : [0.56, 0.455, 1.84];
    const k = t0 >= 0 ? glide((t - t0) / 0.18) : 1;
    let y = y0 + 0.08 * (1 - k), rot = 0;
    if (fall >= 0 && t >= fall) { const u = clamp01((t - fall) / 0.55); y = y0 - (y0 - 0.12) * u * u; }
    card(`fx|pot|${kind}`, 320, 260, (p) => fxPot(p), x, y + 0.0 * rot, z + 0.12, w * Math.max(0.05, k), h * Math.max(0.05, k), true);
    void tag;
  };
  const whoOf = (c: { ty: string; v: number }): [Who, number, "a" | "k" | "s"] => c.ty === "k" ? [W_KID(c.v), 0.58, "k"] : c.ty === "i" ? [W_IBU(c.v), 0.84, "a"] : [W_PRIA(c.v), 0.84, "a"];
  type St = "idle" | "stand" | "shout" | "sit" | "practice";
  const villager = (c: { x: number; z: number; ty: string; v: number }, idx: number, state: St, pots = true, potT0 = -1, fallT = -1) => {
    const [who, sc, kind] = whoOf(c);
    if (state === "sit") addChar(who, c.x, 0, c.z, { mode: "sit", phase: q(t * 0.6 + idx * 0.1, 20), expr: "pained", blink: lidAt(t, 50 + idx), tilt: 3 + liveTilt(t, 50 + idx, 1.6), headTilt: 6 + liveHead(t, 50 + idx, 2), look: 0, facing: 0 }, sc, false, false, {}, false);
    else if (state === "shout") stand(who, c.x, hopY(t, SEC_KAMI + 0.04 * (idx % 4), 0.32, 0.13), c.z, "laugh", 50 + idx, { wave: q(Math.sin(t * 9 + idx), 10) }, sc);
    else if (state === "practice") { const ex = ["laugh", "lick", "whistle", "nervous", "dazed"][Math.floor(t * 2.5 + idx) % 5]; stand(who, c.x, 0.07 * Math.abs(Math.sin(t * 7 + idx)), c.z, ex, 50 + idx, { wave: q(Math.sin(t * 5 + idx * 1.7), 10), tilt: 12 * Math.sin(t * 4 + idx) }, sc); }
    else stand(who, c.x, 0, c.z, state === "stand" ? (idx % 2 ? "stern" : "neutral") : idx % 3 ? "dazed" : "smile", 50 + idx, {}, sc);
    if (pots && state !== "sit") pot(c.x, c.z, kind, potT0, fallT);
    if (state === "sit" && pots && fallT >= 0) pot(c.x + 0.05, c.z + 0.45, "k", -1, fallT - 5);
  };

  if (ws.setKind === "jalan") {
    const [rx, rz, px, pz] = [ROH.x, ROH.z, POL.x, POL.z];
    const potOn = id >= 3 && t >= SEC_PANCI + 0.25;
    stand(W_POL, px, 0, pz, id === 4 && t >= SEC_POLISI ? "stern" : "stern", 5, id === 1 ? { prop: "cert", wave: q(0.5 + 0.4 * Math.sin(t * 6), 10) } : id === 4 && t >= SEC_GANGGUAN + 0.9 ? { prop: "cert", wave: q(Math.sin(t * 12), 10) } : id === 5 ? { prop: "cert", wave: q(0.3 + 0.1 * Math.sin(t * 3), 10) } : {}, 0.88, -1);
    stand(W_ROHIM, rx, 0, rz, id === 1 ? "nervous" : id === 2 ? "shock" : id === 3 && t >= SEC_MOTOR ? "stern" : id === 3 ? "stern" : id === 4 ? "stern" : "dazed", 1, id === 1 || id === 2 ? { wave: shake } : {}, 0.84, 1);
    if (potOn) pot(rx, rz, "a", SEC_PANCI + 0.25);
    if (id === 3 && t >= SEC_PANCI + 0.25) burst("clong", SEC_PANCI + 0.25, 0.35, "#ffffff", rx, 1.9, rz + 0.3, 1.0);
    if (id === 2) { const tq = q(t, 30); card(`fx|sweat|${tq}`, 300, 240, (p) => fxSweat(p, tq), rx, 1.95, rz + 0.3, 0.8, 0.64, true); }
    if (id === 3 && t >= SEC_ANAK) { const tq = q(t, 30); card(`fx|heart|${tq}`, 320, 280, (p) => fxHeart(p, tq), MOTOR.x, 1.35, 0.4, 0.55, 0.48, true); }
    if (id === 4 && t >= SEC_GANGGUAN + 1.2 && t < SEC_GANGGUAN + 1.7) burst("tear", SEC_GANGGUAN + 1.2, 0.5, "#ffffff", px, 1.1, pz + 0.4, 1.2);
  } else if (ws.setKind === "klinik") {
    const [dx, , dz] = KLINIK.doctor, [rx, , rz] = KLINIK.rohim;
    if (id === 6 || id === 7 || id === 8) {
      stand(W_DOK, dx, 0, dz, id === 8 ? "smile" : "stern", 9, id === 6 ? { prop: "pointer", wave: q(0.5 + 0.5 * Math.sin(t * 5), 10) } : id === 7 ? { prop: "cert", wave: q(0.4 + 0.4 * Math.sin(t * 7), 10) } : {}, 0.86, -1);
      const hop = id === 8 ? hopY(t, SEC_BEBAS + 0.05 * 0, 0.4, 0.1) + 0.06 * Math.abs(Math.sin(t * 8)) : 0;
      stand(W_ROHIM, rx, hop, rz, id === 8 ? "laugh" : id === 7 && t >= SEC_GILANYA ? "smile" : "dazed", 1, id === 8 ? { prop: "cert", wave: q(0.5 + 0.5 * Math.sin(t * 6), 10) } : {}, 0.84, 1);
      pot(rx, rz, "a");
      if (id === 7) burst("sah", SEC_GILANYA - 0.05, 0.4, "#ffd43b", dx, 1.2, dz + 0.6, 1.2);
    } else {
      QUEUE.forEach((c, i) => villager(c, i, i % 2 ? "stand" : "idle", true, SEC_PUSKESMAS + 0.12 * i));
      if (t >= SEC_PUSKESMAS + 1.0) bubble("Sakit", "jiwa, Dok!", QUEUE[3].x, 1.95, QUEUE[3].z + 0.3, SEC_PUSKESMAS + 1.0, SEC_SEBULAN, 0.8);
    }
  } else {
    if (id === 9) {
      const nx = [DC - 0.95, DC - 0.15];
      nx.forEach((x, i) => { stand(i ? W_IBU(0) : W_PRIA(0), x, 0, 0.2, t < SEC_TETANGGA + 2.2 ? (i ? "shock" : "dazed") : "grin", 60 + i, t < SEC_TETANGGA + 2.2 ? {} : { wave: q(Math.sin(t * 5 + i), 10) }, 0.84, 1);
        pot(x, 0.2, "a", SEC_TETANGGA + 2.4 + 0.2 * i); });
    } else if (id === 11) {
      CROWD.forEach((c, i) => villager(c, i, "idle"));
    } else if (id === 12 || id === 13) {
      stand(W_LURAH, LURAH[0], LURAH[1], LURAH[2], t >= SEC_SERATUS ? "laugh" : "grin", 7, { prop: "mic", ...(t >= SEC_SERATUS ? { wave: q(Math.sin(t * 5), 10) } : {}) }, 0.86, 1);
      pot(LURAH[0], LURAH[2] + LURAH[1] - 0.5 + 0.5, "s");
      if (id === 13) CROWD.forEach((c, i) => villager(c, i, "shout"));
    } else if (id >= 14 && id <= 19) {
      const walking = id === 14 && t < SEC_AUDIT + 2.4;
      if (id <= 16) CROWD.forEach((c, i) => villager(c, i, id === 16 ? "shout" : "stand"));
      else CROWD.forEach((c, i) => villager(c, i, id === 19 && t >= SEC_DICABUT + 0.2 ? "idle" : "stand"));
      const ex1 = id === 17 ? (t >= SEC_ORANG ? "shock" : "stern") : id === 18 ? "smile" : id === 19 ? "stern" : "stern";
      const a1x = id === 14 ? audX(t, 0) : AUD1[0], a2x = id === 14 ? audX(t, 1) : AUD2[0];
      if (walking) {
        addChar(W_AUD1, a1x, 0, AUD1[2], {}, 0.86, true, true, { mode: "march", phase: q(t * 1.0, 40), expr: "stern", blink: lidAt(t, 10), stride: 0.7 }, true);
        addChar(W_AUD2, a2x, 0, AUD2[2], {}, 0.86, true, true, { mode: "march", phase: q(t * 1.0 + 0.3, 40), expr: "stern", blink: lidAt(t, 11), stride: 0.7 }, true);
      } else {
        const stamp = id === 19 && t >= SEC_DICABUT - 0.1 && t < SEC_DICABUT + 1.4;
        stand(W_AUD1, a1x, 0, AUD1[2], ex1, 10, id === 17 ? { prop: "cert", wave: q(0.4 + 0.4 * Math.sin(t * 8), 10) } : stamp ? { prop: ["hammer", q(0.5 + 0.5 * Math.sin(t * 9), 10)] as Prop } : { prop: "cert", wave: 0.5 }, 0.86, -1);
        stand(W_AUD2, a2x, 0, AUD2[2], id === 18 ? "smile" : "stern", 11, { prop: "suitcase" }, 0.86, -1);
      }
      if (id === 16) burst("kami", SEC_KAMI - 0.05, 0.45, "#ffd43b", DC, 1.6, -0.2, 2.2);
      if (id === 19) { burst("cabut", SEC_DICABUT - 0.05, 0.4, "#ff4757", AUD1[0] - 0.4, 1.2, AUD1[2] + 0.3, 1.1); burst("tung", SEC_TUNGGAKAN - 0.05, 0.4, "#ff4757", AUD1[0] - 0.4, 1.2, AUD1[2] + 0.3, 1.1); }
    } else if (id === 20) {
      CROWD.forEach((c, i) => villager(c, i, t >= SEC_LEMAS ? "sit" : "stand", true, -1, SEC_LEMAS + 0.15 + 0.07 * i));
      stand(W_ROHIM, ROH_SIT[0] + 1.0, 0, ROH_SIT[2] - 0.2, t >= SEC_HANYA ? "smile" : "neutral", 1, {}, 0.84, -1);
      pot(ROH_SIT[0] + 1.0, ROH_SIT[2] - 0.2, "a");
    } else if (id === 21) {
      const [sx, , sz] = ROH_SIT, tq = q(t, 30);
      addChar(W_ROHIM, sx, 0, sz, { mode: "sit", phase: q(t * 0.9, 20), expr: Math.floor(t * 2) % 2 ? "laugh" : "smile", blink: lidAt(t, 1), tilt: 4 * Math.sin(t * 3), headTilt: 6 * Math.sin(t * 2.4), look: 1, facing: 1 }, 0.84, false, false, {}, false);
      pot(sx, sz, "a");
      card("fx|panlap", 320, 260, (p) => fxPot(p), sx + 0.0, 0.5, sz + 0.5, 0.5, 0.405, true);
      card(`fx|spoon|${tq}`, 220, 160, (p) => fxSpoon(p, tq), sx + 0.05, 0.78, sz + 0.55, 0.5, 0.36, true);
      card(`fx|chicken|${tq}`, 300, 240, (p) => fxChicken(p, tq), sx + 0.55, 0.28, sz + 0.2, 0.55, 0.44, true);
      card(`fx|notes|${tq}`, 240, 240, (p) => fxNotes(p, tq), sx + 0.45, 1.5, sz + 0.2, 0.5, 0.5, true);
    } else if (id === 22) {
      CROWD.forEach((c, i) => villager(c, i, "sit", true, -1, -1));
      stand(W_AUD1, AUD1[0], 0, AUD1[2], t >= SEC_ASLI ? "grin" : "stern", 10, t >= SEC_DIPERT - 0.1 ? { prop: ["hammer", q(0.5 + 0.5 * Math.sin(t * 9), 10)] as Prop } : { prop: "cert", wave: 0.5 }, 0.86, -1);
      stand(W_AUD2, AUD2[0], 0, AUD2[2], "stern", 11, { prop: "suitcase" }, 0.86, -1);
      addChar(W_ROHIM, ROH_SIT[0], 0, ROH_SIT[2], { mode: "sit", phase: q(t * 0.9, 20), expr: "smile", blink: lidAt(t, 1), tilt: 4 * Math.sin(t * 3), headTilt: 6 * Math.sin(t * 2.4), look: 1, facing: 1 }, 0.84, false, false, {}, false);
      pot(ROH_SIT[0], ROH_SIT[2], "a");
      if (t >= SEC_DIPERT) burst("dipert", SEC_DIPERT - 0.05, 0.4, "#2ed573", AUD1[0] - 0.4, 1.2, AUD1[2] + 0.3, 1.1);
    } else if (id === 23) {
      CROWD.forEach((c, i) => villager(c, i, "idle"));
      stand(W_ROHIM, DC, 0.5, 0.0, "grin", 1, { wave: q(0.4 + 0.5 * Math.sin(t * 4), 10) }, 0.84, 1);
      pot(DC, 0.0, "a", -1, -1);
    } else if (id === 24) {
      CROWD.forEach((c, i) => villager(c, i, "practice"));
    } else {
      // 25-27: Pak Rohim sudah sembuh diam-diam
      const ex = id === 25 ? (t >= SEC_BILANG ? "nervous" : "neutral") : id === 26 ? "nervous" : t >= SEC_KENA ? "pained" : "nervous";
      stand(W_ROHIM, ROH_END[0], 0, ROH_END[2], ex, 1, id >= 26 ? { wave: q(Math.sin(t * 18) * 0.6, 10) } : {}, 0.84, 1);
      pot(ROH_END[0], ROH_END[2], "a");
      if (id >= 26 || t >= SEC_BILANG) { const tq = q(t, 30); card(`fx|sweat|${tq}`, 300, 240, (p) => fxSweat(p, tq), ROH_END[0] + 0.1, 1.95, ROH_END[2] + 0.35, 0.8, 0.64, true); }
      if (id === 27 && t >= SEC_KENA) burst("kena", SEC_KENA - 0.05, 0.5, "#ff4757", ROH_END[0], 1.7, ROH_END[2] + 0.4, 1.6);
    }
  }
  return out;
};
