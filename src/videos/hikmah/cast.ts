// Karakter 2D & kartu FX untuk "Segala Sesuatu Pasti Ada Hikmahnya" (Bimo, polisi, hakim, emas).
// Infrastruktur (Pool, Actor, Fx, person, blob, kedipan, hop) dipakai ulang dari framework;
// yang baru: Bimo (baju biasa & seragam tahanan), polisi, hakim, kartu emas, dan staging 16 shot.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, fxBurst,
  Outfit, FrontOpts, SideOpts, Prop, INK,
} from "./toon";
import { FPS, SHOTS, clamp01, glide, lerp, WorldState, landFlags, bimoWalkX, COP_A, COP_B, COP2_A, COP2_B, COURT, CELL, GATE, DIG, WELL, SIGN } from "./story";
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


// ---------------- Roster ----------------
const BIMO: Outfit = { jacket: "#e8553b", pants: "#3a5ea8", boots: "#f5f6fa", hat: "hair", hair: "#1b1b1b", skin: "#fcfaf5", noButtons: true };
const BIMO_PRISON: Outfit = { jacket: "#f28a1e", pants: "#d96b00", boots: "#f5f6fa", hat: "hair", hair: "#1b1b1b", skin: "#fcfaf5", noButtons: true };
const POLISI: Outfit = { jacket: "#1f3b73", pants: "#162447", boots: "#111111", hat: "cap", cap: "#1f3b73", skin: "#fcfaf5", noButtons: false };
const HAKIM: Outfit = { jacket: "#161616", vest: "#ffffff", pants: "#161616", boots: "#111111", hat: "hair", hair: "#c9c9c9", glasses: true, skin: "#fcfaf5", noButtons: true };
const WHO_BIMO: Who = { i: 1, o: BIMO, okey: "bimo" };
const WHO_BIMO_P: Who = { i: 4, o: BIMO_PRISON, okey: "bimop" };
const WHO_POL_A: Who = { i: 5, o: POLISI, okey: "pola" };
const WHO_POL_B: Who = { i: 6, o: POLISI, okey: "polb" };
const WHO_HAKIM: Who = { i: 7, o: HAKIM, okey: "hakim" };

// ---------------- Kartu FX ----------------
const fxText = (p: Pen, text: string, col: string, size = 190) => {
  const g = p.g;
  g.textAlign = "center"; g.lineJoin = "round";
  g.font = `900 ${size}px 'Poppins', 'Arial Black', sans-serif`;
  g.lineWidth = 22; g.strokeStyle = INK; g.strokeText(text, 160, 210);
  g.fillStyle = col; g.fillText(text, 160, 210);
};
// bongkahan emas sebesar kepala + kilau bintang
const fxGold = (p: Pen, t: number) => {
  const g = p.g;
  const pts: [number, number][] = [[70, 190], [60, 120], [105, 70], [175, 48], [250, 70], [300, 125], [290, 195], [235, 238], [140, 242]];
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  g.lineJoin = "round";
  const gr = g.createLinearGradient(80, 50, 270, 240); gr.addColorStop(0, "#fff3a0"); gr.addColorStop(0.45, "#ffcf3a"); gr.addColorStop(1, "#b8780a");
  path(); g.fillStyle = gr; g.fill(); g.lineWidth = 12; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.moveTo(110, 100); g.lineTo(165, 70); g.lineTo(150, 100); g.lineTo(115, 125); g.closePath(); g.fill();
  g.strokeStyle = "rgba(120,70,0,0.55)"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(170, 150); g.lineTo(215, 135); g.lineTo(240, 170); g.stroke();
  const star = (cx: number, cy: number, r: number, a: number) => {
    g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = "#ffffff"; g.strokeStyle = "#ffb800"; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.28 : r; g.lineTo(Math.cos((i / 8) * Math.PI * 2) * rr, Math.sin((i / 8) * Math.PI * 2) * rr); }
    g.closePath(); g.fill(); g.stroke(); g.restore();
  };
  const k = 0.75 + 0.25 * Math.sin(t * 9);
  star(60, 70, 32 * k, t * 2); star(320, 60, 26 * (1.5 - k), -t * 2); star(300, 230, 22 * k, t * 3);
};

// ---------------- Staging 16 shot ----------------
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
  const prisoner = (t >= AT.sidang && t < AT.bebas) || id === 15;
  const bimoWho = prisoner ? WHO_BIMO_P : WHO_BIMO;
  const shake = q(Math.sin(t * 22), 10);

  if (ws.setKind === "land") {
    const lf = landFlags(t, id);
    const nugget = t >= AT.emas && t < AT.polisi2;
    if (id === 1) {
      const bx = bimoWalkX(t);
      addChar(WHO_BIMO, bx, 0, 0, {}, 0.84, true, false, { mode: "march", phase: q(t * 0.55, 40), expr: t < AT.hutan ? "neutral" : "nervous", blink: lidAt(t, 1, [AT.hutan]), stride: 0.72 });
    } else if (id === 2 || id === 3) {
      const bx = -2.2;
      addChar(WHO_BIMO, bx, 0, 0, { mode: "stand", phase: q(t * 1.1, 20), expr: "shock", blink: lidAt(t, 1), tilt: liveTilt(t, 1, 2.8), headTilt: liveHead(t, 1, 4.0), look: 1, facing: 1, wave: id === 3 ? shake : undefined }, 0.84);
      if (id === 2 && t < AT.ganja + 1.0) {
        const k = glide((t - AT.ganja) / 0.25);
        card("fx|bang", 320, 280, (p) => fxText(p, "!", "#ff3b30"), bx, 2.25, 0.3, 0.5 + 0.2 * k, 0.5 + 0.2 * k, true);
      }
      if (id === 3) {
        const ax = COP_A(t), bxx = COP_B(t), moving = t < AT.lima + 1.5;
        if (moving) {
          addChar(WHO_POL_A, ax, 0, 0, {}, 0.88, true, false, { mode: "march", phase: q(t * 1.1, 40), expr: "stern", blink: lidAt(t, 5), stride: 1.0 });
          addChar(WHO_POL_B, bxx, 0, 0.1, {}, 0.88, true, true, { mode: "march", phase: q(t * 1.1 + 0.3, 40), expr: "stern", blink: lidAt(t, 6), stride: 1.0 });
        } else {
          addChar(WHO_POL_A, ax, 0, 0, { mode: "stand", phase: q(t * 0.7, 20), expr: "stern", blink: lidAt(t, 5), look: 1, facing: 1 }, 0.88);
          addChar(WHO_POL_B, bxx, 0, 0.1, { mode: "stand", phase: q(t * 0.7 + 0.3, 20), expr: "stern", blink: lidAt(t, 6), look: -1, facing: -1 }, 0.88);
        }
      }
    } else if (id === 8) {
      /* di set gate */
    } else if (id === 9) {
      addChar(WHO_BIMO, DIG.x, 0, 0, { mode: "stand", phase: q(t * 0.9, 20), expr: t < AT.olah + 1.6 ? "stern" : "smile", blink: lidAt(t, 1, [AT.olah]), tilt: liveTilt(t, 1, 2.4), headTilt: liveHead(t, 1, 3.6), look: 1, facing: 1 }, 0.84);
    } else if (id >= 10 && id <= 13) {
      const dig = id === 10 || id === 11;
      const strike = id === 11 && t >= AT.emas - 0.35 ? 1 : q(0.5 + 0.5 * Math.sin(t * 7), 10); // 0 = terangkat .. 1 = menghantam
      const ex = id === 12 ? "laugh" : id === 13 ? "smile" : id === 11 && t >= AT.emas - 0.35 ? "shock" : id === 10 ? "laugh" : "stern";
      addChar(WHO_BIMO, id === 10 ? 1.6 : DIG.x, hopY(t, AT.emas, 0.4, id === 12 ? 0.12 : 0), id === 10 ? 0.8 : 0, {
        mode: "stand", phase: q(t * 1.0, 20), expr: ex, blink: lidAt(t, 1, [AT.emas, AT.hikmah]), tilt: liveTilt(t, 1, 2.4), headTilt: liveHead(t, 1, 3.6), look: 1, facing: 1,
        ...(dig ? { prop: ["hammer", strike] as Prop } : {}),
      }, 0.84);
      if (id === 11 && t >= AT.emas - 0.35 && t < AT.emas) {
        const bt = q(clamp01((t - (AT.emas - 0.35)) / 0.35), 20);
        card(`fx|burst|thunk|${bt}`, 500, 500, (p) => fxBurst(p, bt, "#ffe066", 12, 36, 235), WELL.x - 0.7, 0.5, 0.4, 1.3, 1.3);
      }
    } else if (id === 14) {
      const ax = COP2_A(t), bxx = COP2_B(t), moving = t < AT.polisi2 + 1.4;
      addChar(WHO_BIMO, DIG.x, 0, 0, { mode: "stand", phase: q(t * 1.1, 20), expr: "shock", blink: lidAt(t, 1), look: 1, facing: 1, wave: shake }, 0.84);
      if (moving) {
        addChar(WHO_POL_A, ax, 0, 0, {}, 0.88, true, false, { mode: "march", phase: q(t * 1.1, 40), expr: "stern", blink: lidAt(t, 5), stride: 1.0 });
        addChar(WHO_POL_B, bxx, 0, 0.1, {}, 0.88, true, true, { mode: "march", phase: q(t * 1.1 + 0.3, 40), expr: "stern", blink: lidAt(t, 6), stride: 1.0 });
      } else {
        addChar(WHO_POL_A, ax, 0, 0, { mode: "stand", phase: q(t * 0.7, 20), expr: "stern", blink: lidAt(t, 5), look: 1, facing: 1 }, 0.88);
        addChar(WHO_POL_B, bxx, 0, 0.1, { mode: "stand", phase: q(t * 0.7 + 0.3, 20), expr: "stern", blink: lidAt(t, 6), look: -1, facing: -1 }, 0.88);
      }
    } else if (id === 16) {
      addChar(WHO_POL_A, SIGN.x - 1.2, 0, 0.6, { mode: "stand", phase: q(t * 0.7, 20), expr: "stern", blink: lidAt(t, 5), look: 1, facing: 1 }, 0.88);
      addChar(WHO_POL_B, SIGN.x + 1.2, 0, 0.6, { mode: "stand", phase: q(t * 0.7 + 0.3, 20), expr: "stern", blink: lidAt(t, 6), look: -1, facing: -1 }, 0.88);
    }
    if (nugget && id >= 12 && id <= 14) {
      const k = id === 12 ? glide((t - AT.emas) / 0.2) : 1;
      const tq = q(t, 30);
      card(`fx|gold|${tq}`, 400, 300, (p) => fxGold(p, tq), DIG.x + 0.28, 1.1 + (id === 13 ? 0.03 * Math.sin(t * 3) : 0), 0.4, 0.62 * k, 0.47 * k);
    }
  } else if (ws.setKind === "court") {
    const [bx, by, bz] = COURT.bimo;
    const bex = t < AT.palu ? "nervous" : t < AT.dua0 ? "shock" : t < AT.banding ? "pained" : t < AT.banding + 0.6 ? "dazed" : "smile";
    addChar(bimoWho, bx, by, bz, { mode: "stand", phase: q(t * 0.9, 20), expr: bex, blink: lidAt(t, 1, [AT.palu, AT.dua0, AT.banding]), tilt: liveTilt(t, 1, 2.4), headTilt: liveHead(t, 1, 3.6), look: 1, facing: 1, wave: t >= AT.dua0 && t < AT.dua0 + 1.2 ? shake : undefined }, 0.84);
    addChar(WHO_HAKIM, COURT.judge[0], COURT.judge[1], COURT.judge[2], { mode: "stand", phase: q(t * 0.6, 20), expr: "stern", blink: lidAt(t, 8), look: 1, facing: 1 }, 0.86, false, false, {}, false);
    addChar(WHO_POL_A, COURT.cop[0], COURT.cop[1], COURT.cop[2], { mode: "stand", phase: q(t * 0.7, 20), expr: "stern", blink: lidAt(t, 5), look: 1, facing: 1 }, 0.88);
    if (id === 5 && t >= AT.palu + 0.45 && t < AT.palu + 0.9) {
      const bt = q(clamp01((t - (AT.palu + 0.45)) / 0.45), 20);
      card(`fx|burst|palu|${bt}`, 500, 500, (p) => fxBurst(p, bt, "#ffd43b", 12, 36, 235), 0.1, 1.6, -2.7, 1.4, 1.4);
    }
  } else if (ws.setKind === "cell") {
    addChar(WHO_BIMO_P, CELL.bimo[0], CELL.bimo[1], CELL.bimo[2], { mode: "stand", phase: q(t * 0.7, 20), expr: "neutral", blink: lidAt(t, 1, [AT.penjara]), tilt: liveTilt(t, 1, 1.6), headTilt: liveHead(t, 1, 2.4), look: 1, facing: 1 }, 0.84);
  } else {
    // gerbang lapas: Bimo keluar berjalan ke arah kamera, tangan terangkat
    const u = glide((t - AT.bebas) / 1.2);
    const z = lerp(GATE.z, -0.2, u);
    addChar(WHO_BIMO, GATE.x, Math.abs(Math.sin(t * 9)) * 0.07 * (u < 1 ? 1 : 0), z, { mode: "stand", phase: q(t * 1.2, 20), expr: "relief_open", blink: lidAt(t, 1), tilt: liveTilt(t, 1, 2.0), headTilt: liveHead(t, 1, 3.0), look: 1, facing: 1, wave: q(Math.sin(t * 6), 10) }, 0.84);
  }
  return out;
};
