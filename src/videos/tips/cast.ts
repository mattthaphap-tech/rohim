// Karakter 2D & kartu FX komik untuk "Plot Twist Tidak Berguna #2: Tips Hewan Buas".
// Infrastruktur (Pool, Actor, Fx, person, blob, kedipan, hop) dipakai ulang dari framework;
// yang baru: Bimo/Sari/Bang Jagoan Alam (outfit toon.ts), sprite Harimau (Pen), kartu TV flashback,
// tanda tanya/seru, uap noda kasur, dan staging 15 shot.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, fxBurst,
  Outfit, FrontOpts, SideOpts, INK,
} from "./toon";
import { FPS, SHOTS, clamp01, glide, WorldState, bimoX, tigerX, STOP, BED, F } from "./story";
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


// ---------------- Roster (gaya bean-head framework: kepala #fcfaf5 + siluet tegas) ----------------
const BIMO: Outfit = { jacket: "#e8553b", pants: "#3a5ea8", boots: "#f5f6fa", hat: "hair", hair: "#1b1b1b", skin: "#fcfaf5", noButtons: true };
const SARI: Outfit = { jacket: "#8e5bd6", pants: "#2d2d3a", boots: "#382419", hat: "hair", hair: "#3b2416", skin: "#fcfaf5", noButtons: true };
const JAGOAN: Outfit = { jacket: "#6b8e23", vest: "#c8a15a", pants: "#8b6f3a", boots: "#382419", hat: "cap", cap: "#c8a15a", glasses: true, skin: "#fcfaf5", noButtons: true };
const WHO_BIMO: Who = { i: 1, o: BIMO, okey: "bimo" };
const WHO_SARI: Who = { i: 2, o: SARI, okey: "sari" };

// ---------------- Harimau (sprite 2D, design space 600 x 1000, telapak di y = 975, menghadap kanan) ----------------
type P2 = [number, number];
type TFace = "chase" | "idle" | "confused" | "leave";
type TigerOpts = { phase: number; mode: "run" | "walk" | "idle"; face: TFace; blink: number };
const TIG = "#f28a1e", TIG_FAR = "#c9650d", BELLY = "#ffe3b3", MOUTHC = "#7a1f1f";
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 40): P2[] =>
  Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * Math.PI * 2), cy + ry * Math.sin((i / n) * Math.PI * 2)] as P2);

const tigerDraw = (p: Pen, o: TigerOpts) => {
  const two = Math.PI * 2, run = o.mode === "run", walk = o.mode === "walk";
  const swing = run ? 78 : walk ? 40 : 0;
  const bob = run ? -30 * Math.abs(Math.cos(two * o.phase)) : walk ? -10 * Math.abs(Math.cos(two * o.phase)) : 4 * Math.sin(two * o.phase);
  const sole = 975;
  const leg = (hx: number, ph: number, far: boolean) => {
    const a = two * (o.phase + ph), sw = swing * Math.sin(a);
    const lift = run ? Math.max(0, Math.cos(a)) * 36 : walk ? Math.max(0, Math.cos(a)) * 14 : 0;
    const hip: P2 = [hx, 905 + bob], foot: P2 = [hx + sw, sole - lift], knee: P2 = [(hip[0] + foot[0]) / 2 + 16, (hip[1] + foot[1]) / 2];
    p.line([hip, knee, foot], far ? TIG_FAR : TIG, 44);
    p.ell(foot[0] + 14, foot[1] - 6, 34, 18, BELLY, 8);
  };
  // ekor
  const tw = 16 * Math.sin(two * o.phase * 0.7 + 1);
  p.line([[78, 830 + bob], [24, 790 + bob], [14 + tw, 716 + bob]], TIG, 30);
  p.dot(14 + tw, 712 + bob, 20, INK);
  // kaki jauh
  leg(150, 0.5, true); leg(400, 0, true);
  // badan + perut + belang
  const body = ellPts(290, 850 + bob, 240, 100);
  p.ell(290, 850 + bob, 240, 100, TIG, 12);
  p.clip(body, () => {
    p.ell(290, 940 + bob, 200, 62, BELLY, 0);
    for (let i = 0; i < 7; i++) {
      const x = 120 + i * 52;
      p.poly([[x, 740 + bob], [x + 24, 790 + bob], [x + 10, 850 + bob], [x + 22, 910 + bob], [x - 6, 846 + bob], [x - 16, 792 + bob]], INK, 0);
    }
  });
  // kaki dekat
  leg(200, 0, false); leg(452, 0.5, false);
  // telinga + kepala
  const hy = 790 + bob;
  p.ell(412, hy - 84, 30, 30, TIG, 10); p.ell(412, hy - 84, 14, 14, "#ff9aa8", 0);
  p.ell(548, hy - 78, 30, 30, TIG, 10); p.ell(548, hy - 78, 14, 14, "#ff9aa8", 0);
  p.ell(480, hy, 98, 92, TIG, 12);
  p.stroke([[470, hy - 84], [474, hy - 48]], 12); p.stroke([[494, hy - 86], [496, hy - 50]], 12); p.stroke([[450, hy - 80], [454, hy - 46]], 12);
  p.stroke([[392, hy + 6], [418, hy + 14]], 11); p.stroke([[392, hy + 30], [420, hy + 34]], 11);
  p.ell(525, hy + 40, 56, 42, BELLY, 8);
  p.poly([[505, hy + 18], [545, hy + 18], [525, hy + 42]], INK, 4);
  // mata
  const cf = o.face === "confused", lf = o.face === "leave";
  for (const ex of [445, 515]) {
    const ry = (cf ? 26 : 22) * (1 - 0.9 * o.blink) * (lf ? 0.55 : 1);
    p.ell(ex, hy - 18, cf ? 23 : 20, Math.max(2, ry), "#ffffff", 7);
    p.dot(ex + 5, hy - 16, cf ? 6 : 8, INK);
  }
  if (o.face === "chase") { p.stroke([[424, hy - 54], [470, hy - 26]], 14); p.stroke([[542, hy - 54], [500, hy - 26]], 14); }
  if (cf) p.stroke([[500, hy - 56], [545, hy - 68]], 12);
  // mulut
  if (o.face === "chase") {
    p.poly([[488, hy + 56], [525, hy + 96], [564, hy + 56]], MOUTHC, 6);
    p.poly([[500, hy + 58], [507, hy + 78], [514, hy + 58]], "#ffffff", 2);
    p.poly([[536, hy + 58], [543, hy + 78], [550, hy + 58]], "#ffffff", 2);
  } else if (o.face === "idle") {
    p.stroke([[490, hy + 62], [525, hy + 74], [560, hy + 62]], 8);
    p.ell(525, hy + 84 + 3 * Math.sin(two * o.phase * 4), 16, 26, "#ff7a90", 6);
  } else if (cf) {
    p.stroke([[494, hy + 66], [510, hy + 56], [526, hy + 66], [542, hy + 56], [558, hy + 66]], 8);
  } else {
    p.stroke([[494, hy + 74], [525, hy + 58], [556, hy + 74]], 8);
  }
  p.stroke([[560, hy + 40], [596, hy + 32]], 4); p.stroke([[560, hy + 52], [598, hy + 54]], 4);
};

const tigerPlace = (cam: CamInfo, x: number, y: number, z: number, o: TigerOpts, scale: number, mirror: boolean): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 0.9, z)) / scale;
  const [w, h, k] = tier(d);
  return { key: `TIGER|${fkey(o)}`, x, y, z, scale, mirror, draw: (p) => tigerDraw(p, o), size: [w, h, k] };
};

// ---------------- Kartu FX komik ----------------
const fxText = (p: Pen, text: string, col: string, size = 190) => {
  const g = p.g;
  g.textAlign = "center"; g.lineJoin = "round";
  g.font = `900 ${size}px 'Poppins', 'Arial Black', sans-serif`;
  g.lineWidth = 22; g.strokeStyle = INK; g.strokeText(text, 160, 210);
  g.fillStyle = col; g.fillText(text, 160, 210);
};
const fxSteam = (p: Pen, t: number) => {
  const g = p.g;
  [60, 100, 140].forEach((x, i) => {
    const ph = t * 5 + i * 1.7;
    g.globalAlpha = 0.55 + 0.45 * Math.sin(ph);
    const pts: P2[] = [];
    for (let k = 0; k <= 12; k++) pts.push([x + 12 * Math.sin(k * 0.9 + ph), 270 - k * 20 - (i % 2) * 14]);
    p.stroke(pts, 11, "#9bc653");
  });
  g.globalAlpha = 1;
};
// TV jadul tempat Bang Jagoan Alam muncul (flashback "video yang pernah dia tonton")
const fxTV = (p: Pen, tt: number) => {
  const g = p.g;
  p.stroke([[300, 80], [250, 14]], 10, INK); p.stroke([[400, 80], [452, 14]], 10, INK);
  g.fillStyle = "#7a4a24"; g.strokeStyle = INK; g.lineWidth = 14;
  g.beginPath(); g.roundRect(24, 66, 652, 566, 56); g.fill(); g.stroke();
  const sx = 70, sy = 108, sw = 560, sh = 470;
  g.save();
  g.beginPath(); g.roundRect(sx, sy, sw, sh, 34); g.clip();
  const gr = g.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, "#4aa3df"); gr.addColorStop(1, "#cfeeff");
  g.fillStyle = gr; g.fillRect(sx, sy, sw, sh);
  g.save();
  const s = 0.64;
  g.translate(sx + sw / 2 - 300 * s, sy + sh - 975 * s + 40); g.scale(s, s);
  bodyFront(p, JAGOAN, { phase: tt, expr: "grin", mode: "stand", prop: "mic", wave: Math.sin(tt * 5), look: 0, facing: 0, seed: 3, blink: false });
  g.restore();
  g.fillStyle = "#d62828"; g.strokeStyle = INK; g.lineWidth = 6;
  g.beginPath(); g.roundRect(sx + 28, sy + sh - 86, sw - 56, 60, 12); g.fill(); g.stroke();
  g.fillStyle = "#ffffff"; g.textAlign = "center";
  let sz = 34; g.font = `900 ${sz}px 'Segoe UI', Arial, sans-serif`;
  while (g.measureText("BANG JAGOAN ALAM").width > sw - 90 && sz > 16) { sz -= 2; g.font = `900 ${sz}px 'Segoe UI', Arial, sans-serif`; }
  g.fillText("BANG JAGOAN ALAM", sx + sw / 2, sy + sh - 44);
  g.fillStyle = "rgba(0,0,0,0.14)";
  for (let y = sy; y < sy + sh; y += 6) g.fillRect(sx, y, sw, 2);
  g.restore();
  g.fillStyle = INK; g.beginPath(); g.arc(640, 600, 10, 0, Math.PI * 2); g.fill();
};

// Pancuran air kencing kartun (kuning, outline gelap, kilau mengalir) melengkung dari Bimo ke sungai + cipratan & riak
const fxStream = (p: Pen, t: number) => {
  const g = p.g;
  const pts: P2[] = [];
  for (let i = 0; i <= 28; i++) { const s = i / 28; pts.push([42 + 423 * s, 66 + 249 * s * s]); }
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
  g.lineCap = "round"; g.lineJoin = "round";
  path(); g.lineWidth = 19; g.strokeStyle = "#8a6a00"; g.stroke();
  path(); g.lineWidth = 12; g.strokeStyle = "#ffe03a"; g.stroke();
  g.setLineDash([14, 26]); g.lineDashOffset = -t * 260;
  path(); g.lineWidth = 4; g.strokeStyle = "rgba(255,255,255,0.85)"; g.stroke();
  g.setLineDash([]);
  // riak di permukaan sungai
  for (let k = 0; k < 3; k++) {
    const ph = (t * 1.6 + k / 3) % 1;
    g.strokeStyle = `rgba(232,246,255,${0.9 * (1 - ph)})`; g.lineWidth = 5;
    g.beginPath(); g.ellipse(465, 318, 16 + ph * 56, 5 + ph * 15, 0, 0, Math.PI * 2); g.stroke();
  }
  // percikan
  for (let i = 0; i < 7; i++) {
    const ph = (t * 2.2 + i * 0.37) % 1, dir = i % 2 ? 1 : -1, sp = 22 + i * 7;
    const x = 465 + dir * sp * ph, y = 314 - 62 * Math.sin(Math.PI * ph) * (0.6 + 0.07 * i);
    g.fillStyle = "#ffe03a"; g.strokeStyle = "#8a6a00"; g.lineWidth = 3;
    g.beginPath(); g.arc(x, y, 6 - 2 * ph, 0, Math.PI * 2); g.fill(); g.stroke();
  }
};

// ---------------- Staging 15 shot ----------------
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

  // ================= HUTAN (shot 1-9) =================
  if (id <= 9) {
    const bx = bimoX(t), tx = tigerX(t);
    const running = t < AT.tunggu, strolling = t >= AT.dan;
    const pak = t >= AT.pak && t < AT.dan;
    const expr = t < AT.tunggu ? (Math.floor(t * 3) % 2 ? "shock" : "nervous")
      : t < AT.tunggu + 1.0 ? "nervous"
      : t < AT.oh ? "neutral"
      : t < AT.pak ? "grin"
      : t < AT.pergi ? "stern"
      : t < AT.leganya ? "smile"
      : "relief_open";

    // ---- Bimo ----
    if (running) {
      addChar(WHO_BIMO, bx, 0, 0, {}, 0.84, true, false, { mode: "march", phase: q(t * 1.5, 40), expr, blink: lidAt(t, 1), stride: 1.42 });
    } else if (strolling && t < AT.leganya) {
      addChar(WHO_BIMO, bx, 0, 0, {}, 0.84, true, false, { mode: "march", phase: q(t * 1.0, 40), expr, blink: lidAt(t, 1, [AT.dan]), stride: 0.6 });
    } else if (t >= AT.leganya) {
      addChar(WHO_BIMO, bx, 0, 0, {}, 0.84, true, false, { mode: "stand", phase: q(t * 0.8, 40), expr, blink: lidAt(t, 1, [AT.leganya]) });
    } else {
      const look = pak ? -1 : 1;
      addChar(WHO_BIMO, bx, hopY(t, AT.oh + 0.1, 0.36, 0.1), 0, {
        mode: "stand", phase: q(t * 1.1, 20), expr, blink: lidAt(t, 1, [AT.tunggu + 1.0, AT.oh, AT.pak]),
        tilt: liveTilt(t, 1, 2.8), headTilt: liveHead(t, 1, 4.0), look, facing: pak ? -1 : 1,
        ...(t >= AT.pak && t < AT.pergi ? { wave: q(Math.sin(t * 3), 10) } : {}),
      }, 0.84);
    }

    // ---- Harimau ----
    const tface: TFace = t < AT.tunggu ? "chase" : t < AT.harimauPun ? "idle" : t < AT.pergi ? "confused" : "leave";
    const tmode = t < AT.tunggu ? "run" : t < AT.pergi ? "idle" : "walk";
    const tph = t < AT.tunggu ? q(t * 1.8, 40) : t < AT.pergi ? q(t * 0.7, 40) : q(t * 1.1, 40);
    out.places.push(tigerPlace(cam, tx, 0, -0.25, { phase: tph, mode: tmode, face: tface, blink: lidAt(t, 7) > 0 ? 1 : 0 }, 1.7, t >= AT.pergi));
    blob(out, tx, 0, -0.25, 1.9);

    // ---- kartu & efek ----
    if (t >= AT.tunggu && t < AT.tunggu + 1.0) {
      const k = glide((t - AT.tunggu) / 0.25);
      card("fx|bang", 320, 280, (p) => fxText(p, "!", "#ff3b30"), bx, 2.25, 0.3, 0.5 + 0.2 * k, 0.5 + 0.2 * k, true);
    }
    if (t >= AT.halo - 0.1 && t < AT.oh + 0.1) {
      const k = glide((t - (AT.halo - 0.1)) / 0.22) * (1 - glide((t - AT.oh) / 0.1));
      const tt = q(t, 30);
      card(`fx|tv|${tt}`, 700, 660, (p) => fxTV(p, tt), STOP + 0.12, 2.25, 0.25, 0.84 * k, 0.79 * k);
    }
    if (t >= AT.pak && t < AT.pak + 0.45) {
      const bt = q(clamp01((t - AT.pak) / 0.45), 20);
      card(`fx|burst|pak|${bt}`, 500, 500, (p) => fxBurst(p, bt, "#ffd43b", 12, 36, 235), STOP - 1.4, 1.2, 0.3, 1.5, 1.5);
    }
    if (t >= AT.leganya && t < AT.scream) {
      const tq = q(t, 30);
      card(`fx|stream|${tq}`, 570, 336, (p) => fxStream(p, tq), bx + 0.95, 0.34, 0.05, 1.9, 1.12, true); // mulai setinggi pinggang Bimo (0.68 m), mendarat di sungai
    }
    if (t >= AT.harimauPun && t < AT.pergi) {
      card("fx|q", 320, 280, (p) => fxText(p, "?", "#ffd60a", 200), STOP - 3.4 + 0.75, 1.45 + Math.sin(t * 6) * 0.04, 0.2, 0.55, 0.48, true);
    }
  } else {
    // ================= KAMAR TIDUR (shot 10-15) =================
    const [bxm, bym, bzm] = BED.bimo, [sx, sy, sz] = BED.sari;
    const bexpr = t < AT.bukan ? "shock" : t < AT.sari ? "nervous" : t < AT.bagus ? "smile" : t < AT.kasur ? "dazed" : "nervous";
    const flail = t < AT.plot + 0.6 ? q(Math.sin(t * 14), 10) : undefined;
    addChar(WHO_BIMO, bxm, bym, bzm, {
      mode: "sit", phase: q(t * 0.9, 20), expr: bexpr, blink: lidAt(t, 1, [AT.bukan, AT.sari, AT.bagus]),
      tilt: liveTilt(t, 1, 2.4), headTilt: liveHead(t, 1, 3.6), look: 1, facing: 1,
      ...(flail !== undefined ? { wave: flail } : {}),
    }, 0.84, false, false, {}, false);

    const sexpr = t < AT.bagus ? "neutral" : t < AT.kasur ? "stern" : "smile_closed";
    addChar(WHO_SARI, sx, sy, sz, {
      mode: "stand", phase: q(t * 0.7, 20), expr: sexpr, blink: lidAt(t, 2, [AT.bagus, AT.kasur]),
      tilt: liveTilt(t, 2, 1.6), headTilt: liveHead(t, 2, 2.4), look: -1, facing: -1,
      prop: "kopi", wave: q(Math.sin(t * 0.9) * 0.4, 10),
    }, 0.84);

    if (t >= AT.scream && t < AT.scream + 0.4) {
      const bt = q(clamp01((t - AT.scream) / 0.4), 20);
      card(`fx|burst|scream|${bt}`, 500, 500, (p) => fxBurst(p, bt, "#ffd43b", 12, 36, 235), bxm, 1.35, bzm + 0.6, 1.6, 1.6);
    }
    if (t >= AT.bukan - 0.2) {
      const tq = q(t, 30);
      card(`fx|steam|${tq}`, 200, 300, (p) => fxSteam(p, tq), BED.stain[0], 1.02, BED.stain[2] + 0.1, 0.42, 0.62, true);
    }
  }
  return out;
};
