// Karakter 2D & kartu FX untuk "Ada Duit di Bawahmu! Hi hu!" (anak-anak, ibu-ibu, warga, Pak Ujang, Pak Lurah, polisi, hakim).
// Infrastruktur (Pool, Actor, Fx, person, blob, kedipan, hop) dipakai ulang dari framework;
// yang baru: Pak Slamet, dukun, tuyul (build "kid", botak), ketua tuyul, Pak Lurah, warga, kartu kontrak/uang/plakat, staging 28 shot.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, fxBurst,
  Outfit, FrontOpts, SideOpts, Prop, INK,
} from "./toon";
import { FPS, SHOTS, clamp01, glide, lerp, WorldState, PRANK, CROWD, ujangRunX, UJANG_STAND, BALAI, CHEST, POLSEK, COURT, AUD, DC, BX, PX, CX } from "./story";
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



const SEC_PRANK = AT.prank, SEC_MENUNDUK = AT.menunduk1, SEC_HIHU1 = AT.hihu1, SEC_SEMINGGU = AT.seminggu, SEC_WARGA1 = AT.warga1, SEC_HAFAL = AT.hafal;
const SEC_PETI = AT.peti, SEC_MILIAR = AT.miliar, SEC_SEMUA = AT.semua, SEC_HIHU2 = AT.hihu2, SEC_APA = AT.apa, SEC_MELAPOR = AT.melapor, SEC_POLMEN = AT.polmenunduk;
const SEC_ANGKAT = AT.angkat, SEC_TOS = AT.tos, SEC_BELAKANG = AT.belakang, SEC_KERINGAT = AT.keringat, SEC_BONGKAR = AT.bongkar, SEC_KANTOR = AT.kantor, SEC_MEJA = AT.meja;
const SEC_DARI = AT.dari, SEC_DITAHAN = AT.ditahan, SEC_VONIS = AT.vonis, SEC_SAKSI = AT.saksi, SEC_SAYA = AT.saya, SEC_BAWAHMU2 = AT.bawahmu2, SEC_SEISI = AT.seisi, SEC_HI = AT.hi;

// ---------------- Roster ----------------
const mkKid = (j: string, h: string): Outfit => ({ jacket: j, pants: "#3a5ea8", boots: "#fcfaf5", hat: "hair", hair: h, skin: "#fcfaf5", build: "kid", noButtons: true });
const KIDS: Outfit[] = [mkKid("#ffd43b", "#1b1b1b"), mkKid("#ff6b81", "#3b2416"), mkKid("#5dade2", "#1b1b1b")];
const IBUS: Outfit[] = ["#d35400", "#8e44ad"].map((d) => ({ jacket: "#f4f1de", pants: "#3a3a4a", boots: "#222222", hat: "bonnet", dress: d, skin: "#fcfaf5", noButtons: true }));
const PRIAS: Outfit[] = [{ jacket: "#2f9e6a", pants: "#3a3a4a", boots: "#222222", hat: "hair", hair: "#222222", skin: "#fcfaf5", noButtons: true },
  { jacket: "#d9822b", pants: "#2d3a5a", boots: "#222222", hat: "hair", hair: "#4a3020", skin: "#fcfaf5", noButtons: true }];
const LURAH: Outfit = { jacket: "#8a4b1a", vest: "#c9a227", pants: "#2a2a30", boots: "#111111", hat: "cap", cap: "#111111", glasses: true, build: "stout", skin: "#fcfaf5", noButtons: false };
const UJANG: Outfit = { jacket: "#4a90d9", vest: "#f28a1e", pants: "#3a3a4a", boots: "#3a2a1a", hat: "cap", cap: "#f28a1e", skin: "#fcfaf5", noButtons: true };
const POLISI: Outfit = { jacket: "#1f3b73", pants: "#162447", boots: "#111111", hat: "cap", cap: "#1f3b73", skin: "#fcfaf5", noButtons: false };
const HAKIM: Outfit = { jacket: "#161616", vest: "#ffffff", pants: "#161616", boots: "#111111", hat: "hair", hair: "#c9c9c9", glasses: true, skin: "#fcfaf5", noButtons: true };
const W_KID = (v: number): Who => ({ i: 20 + (v % 3), o: KIDS[v % 3], okey: "kid" + (v % 3) });
const W_IBU = (v: number): Who => ({ i: 30 + (v % 2), o: IBUS[v % 2], okey: "ibu" + (v % 2) });
const W_PRIA = (v: number): Who => ({ i: 40 + (v % 2), o: PRIAS[v % 2], okey: "pria" + (v % 2) });
const W_LURAH: Who = { i: 7, o: LURAH, okey: "lurah" };
const W_UJANG: Who = { i: 1, o: UJANG, okey: "ujang" };
const W_POL: Who = { i: 5, o: POLISI, okey: "pol" };
const W_HAKIM: Who = { i: 8, o: HAKIM, okey: "hakim" };

// ---------------- Kartu FX ----------------
const fxText = (p: Pen, text: string, col: string, size = 190) => {
  const g = p.g;
  g.textAlign = "center"; g.lineJoin = "round";
  g.font = `900 ${size}px 'Poppins', 'Arial Black', sans-serif`;
  g.lineWidth = 22; g.strokeStyle = INK; g.strokeText(text, 160, 210);
  g.fillStyle = col; g.fillText(text, 160, 210);
};
const fxBubble = (p: Pen, l1: string, l2: string, tt: number) => { // balon ucapan komik
  const g = p.g; g.lineJoin = "round";
  g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = 10;
  g.beginPath(); g.roundRect(14, 14, 392, 190, 34); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(120, 200); g.lineTo(96, 250); g.lineTo(168, 202); g.closePath(); g.fillStyle = "#ffffff"; g.fill(); g.stroke();
  g.fillStyle = "#ffffff"; g.fillRect(104, 196, 62, 14);
  g.fillStyle = "#1b1b1b"; g.textAlign = "center"; g.font = "900 54px 'Segoe UI', Arial, sans-serif";
  g.fillText(l1, 210, 92 + Math.sin(tt * 8) * 1.5); g.fillText(l2, 210, 156 + Math.sin(tt * 8) * 1.5);
};
const fxBroom = (p: Pen, tt: number) => { // sapu lidi (bergoyang menyapu)
  const g = p.g; g.lineCap = "round"; g.lineJoin = "round";
  const sw = Math.sin(tt * 9) * 26;
  g.save(); g.translate(160 + sw, 330); g.rotate(-0.22 + Math.sin(tt * 9) * 0.1);
  g.strokeStyle = INK; g.lineWidth = 16; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -300); g.stroke();
  g.strokeStyle = "#a9743a"; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -300); g.stroke();
  g.fillStyle = "#e0b45a"; g.strokeStyle = INK; g.lineWidth = 8;
  g.beginPath(); g.moveTo(-10, 0); g.lineTo(-62, 70); g.lineTo(62, 70); g.lineTo(10, 0); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = "#a9743a"; g.lineWidth = 4; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 4, 6); g.lineTo(i * 16, 66); g.stroke(); }
  g.restore();
};
const fxChestCarry = (p: Pen) => { // peti dibawa (tampak depan)
  const g = p.g; g.lineJoin = "round";
  g.fillStyle = "#8a5a2e"; g.strokeStyle = INK; g.lineWidth = 9;
  g.beginPath(); g.roundRect(20, 80, 260, 140, 14); g.fill(); g.stroke();
  g.fillStyle = "#3a3f4a"; g.fillRect(70, 80, 26, 140); g.fillRect(204, 80, 26, 140);
  g.fillStyle = "#fffdf0"; g.strokeStyle = "#d62828"; g.lineWidth = 6; g.beginPath(); g.roundRect(100, 126, 100, 52, 6); g.fill(); g.stroke();
  g.fillStyle = "#d62828"; g.textAlign = "center"; g.font = "900 22px 'Segoe UI', Arial, sans-serif"; g.fillText("DANA DESA", 150, 148); g.font = "900 16px 'Segoe UI', Arial, sans-serif"; g.fillStyle = "#222"; g.fillText("Rp 2 M", 150, 168);
  g.fillStyle = "#4f9d63"; g.strokeStyle = INK; g.lineWidth = 6;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect(34 + i * 62, 48 + (i % 2) * 6, 54, 38, 6); g.fill(); g.stroke(); }
};
const fxSweat = (p: Pen, tt: number) => {
  const g = p.g; g.lineJoin = "round";
  [70, 150, 230].forEach((x, i) => {
    const ph = (tt * 1.6 + i * 0.33) % 1;
    g.globalAlpha = 1 - ph * 0.7; g.fillStyle = "#8fd3ff"; g.strokeStyle = INK; g.lineWidth = 5;
    g.beginPath(); const y = 40 + ph * 150; g.moveTo(x, y - 24); g.quadraticCurveTo(x + 22, y + 8, x, y + 20); g.quadraticCurveTo(x - 22, y + 8, x, y - 24); g.fill(); g.stroke();
  });
  g.globalAlpha = 1;
};
const fxCuffs = (p: Pen) => {
  const g = p.g; g.lineWidth = 9; g.strokeStyle = INK; g.fillStyle = "#c8ccd4";
  for (const x of [70, 230]) { g.beginPath(); g.arc(x, 80, 38, 0, Math.PI * 2); g.stroke(); g.lineWidth = 5; g.strokeStyle = "#8a9099"; g.beginPath(); g.arc(x, 80, 38, 0, Math.PI * 2); g.stroke(); g.lineWidth = 9; g.strokeStyle = INK; }
  g.lineWidth = 8; g.beginPath(); g.moveTo(104, 96); g.quadraticCurveTo(150, 140, 196, 96); g.stroke();
};

// "menunduk": badan atas dipendekkan di sekitar pinggul (perspektif membungkuk) + mata terpejam; k = 0..1
const HIP: Record<string, number> = { adult: 584, stout: 604, kid: 700 };
const bowDraw = (p: Pen, o: Outfit, f2: FrontOpts, k: number) => {
  const g = p.g, hip = HIP[o.build ?? "adult"];
  g.save(); g.beginPath(); g.rect(-60, hip, 720, 1200); g.clip(); bodyFront(p, o, f2); g.restore();
  g.save(); g.beginPath(); g.rect(-60, -60, 720, hip + 60); g.clip();
  g.translate(300, hip); g.scale(1, 1 - 0.3 * k); g.translate(-300, -hip);
  bodyFront(p, o, f2); g.restore();
};

// ---------------- Staging 28 shot ----------------
export const stage = (ws: WorldState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const { id, f, t } = ws;
  LNAME = SHOTS[id - 1].light;
  findSun(cam, SUN);

  const addChar = (who: Who, x: number, y: number, z: number, fo: FrontOpts, scale = 0.84, side = false, mirror = false, so: SideOpts = {}, shadow = true, bow = 0) => {
    const pl = person(cam, who, x, y, z, side, mirror, fo, so, scale);
    if (bow > 0.02 && !side) {
      const f2: FrontOpts = { ...fo, light: light2D(cam, false), seed: ((who.i * 5 + 3) % 7) + 1 };
      pl.key += "|bow" + q(bow, 4); pl.draw = (p) => bowDraw(p, who.o, f2, q(bow, 4));
    }
    out.places.push(pl);
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
  const stand = (who: Who, x: number, y: number, z: number, expr: any, seed: number, extra: Partial<FrontOpts> = {}, scale = 0.84, facing: -1 | 0 | 1 = 1, bow = 0) =>
    addChar(who, x, y, z, { mode: "stand", phase: q(t * 0.8 + seed * 0.13, 20), expr, blink: lidAt(t, seed), tilt: liveTilt(t, seed, 2.2), headTilt: liveHead(t, seed, 3.4), look: facing, facing, ...extra }, scale, false, false, {}, true, bow);
  const shake = q(Math.sin(t * 22), 10);
  const whoOf = (c: { ty: string; v: number }): [Who, number] => c.ty === "k" ? [W_KID(c.v), 0.58] : c.ty === "i" ? [W_IBU(c.v), 0.84] : c.ty === "l" ? [W_LURAH, 0.86] : [W_PRIA(c.v), 0.84];
  // pose warga: state menentukan ekspresi/gerak
  const person_ = (c: typeof CROWD[0], idx: number, state: "idle" | "prank" | "stand" | "bow" | "shout" | "laugh", t0 = 0) => {
    const [who, sc] = whoOf(c);
    const base = c.ty === "k" ? 1 : 0;
    if (state === "bow") { const k = glide((t - t0) / 0.3) * (1 - glide((t - (t0 + 1.2)) / 0.25)); stand(who, c.x, 0, c.z, k > 0.3 ? "smile_closed" : "smile", 50 + idx, {}, sc, 1, k); }
    else if (state === "shout") stand(who, c.x, hopY(t, t0 + 0.05 * (idx % 4), 0.32, 0.12), c.z, "laugh", 50 + idx, { wave: q(Math.sin(t * 9 + idx), 10) }, sc);
    else if (state === "laugh") stand(who, c.x, 0.04 * Math.abs(Math.sin(t * 9 + idx)), c.z, "laugh", 50 + idx, { wave: q(Math.sin(t * 6 + idx) * 0.6, 10) }, sc);
    else if (state === "prank") stand(who, c.x, 0, c.z, idx % 3 ? "grin" : "laugh", 50 + idx, { wave: q(Math.sin(t * 3 + idx) * 0.5, 10) }, sc);
    else if (state === "stand") stand(who, c.x, 0, c.z, idx % 2 ? "stern" : "neutral", 50 + idx, {}, sc);
    else stand(who, c.x, 0, c.z, "smile", 50 + idx, {}, sc);
    void base;
  };

  if (ws.setKind === "desa") {
    if (id === 1) CROWD.forEach((c, i) => person_(c, i, "idle"));
    else if (id >= 2 && id <= 4) {
      const [ax, , az] = PRANK.kidA, [bx, , bz] = PRANK.kidB, [vx, , vz] = PRANK.victim;
      const bowK = id === 3 ? glide((t - SEC_MENUNDUK) / 0.3) * (1 - glide((t - (SEC_HIHU1 - 0.2)) / 0.2)) : id === 2 ? 0 : 0;
      const shout = id === 4;
      stand(W_KID(0), ax, shout ? hopY(t, SEC_HIHU1 + 0.02, 0.32, 0.14) : 0, az, shout ? "laugh" : "grin", 61, shout ? { wave: q(Math.sin(t * 9), 10) } : { wave: q(Math.sin(t * 3) * 0.4, 10) }, 0.58);
      stand(W_KID(1), bx, shout ? hopY(t, SEC_HIHU1 + 0.06, 0.32, 0.14) : 0, bz, shout ? "laugh" : "grin", 62, shout ? { wave: q(Math.sin(t * 9 + 1), 10) } : { prop: "point_up", wave: q(Math.sin(t * 3), 10) }, 0.58);
      stand(W_PRIA(0), vx, 0, vz, id === 4 ? "shock" : bowK > 0.3 ? "smile_closed" : "smile", 63, id === 4 ? { wave: shake } : {}, 0.84, -1, bowK);
      if (id === 2) bubble("Ada duit di", "bawahmu!", bx - 0.05, 1.55, bz + 0.3, SEC_PRANK + 0.5, SEC_MENUNDUK, 0.95);
    } else if (id === 5) {
      CROWD.forEach((c, i) => person_(c, i, "prank"));
      [[0, "Ada duit di", "bawahmu!"], [5, "Ada duit di", "bawahmu!"], [9, "Ada duit di", "bawahmu!"]].forEach(([i, a, b], k) => bubble(a as string, b as string, CROWD[i as number].x + 0.15, 1.9, CROWD[i as number].z + 0.3, SEC_SEMINGGU + 0.6 + k * 1.2, SEC_SEMINGGU + 2.4 + k * 1.2, 0.8));
    } else if (id === 6) {
      CROWD.forEach((c, i) => person_(c, i, "stand"));
      bubble("Ada duit di", "bawahmu!", CROWD[2].x + 0.1, 1.45, CROWD[2].z + 0.3, SEC_WARGA1 + 0.8, SEC_HAFAL + 1.2, 0.8);
    } else if (id === 10) {
      const x = ujangRunX(t);
      addChar(W_UJANG, x, 0, 0, {}, 0.84, true, false, { mode: "march", phase: q(t * 1.5, 40), expr: "shock", blink: lidAt(t, 1), stride: 1.4 }, true);
      CROWD.forEach((c, i) => person_(c, i, "idle"));
    } else if (id === 11) {
      const bowT = SEC_SEMUA + 0.05;
      CROWD.forEach((c, i) => person_(c, i, t < SEC_HIHU2 - 0.05 ? "bow" : "shout", t < SEC_HIHU2 - 0.05 ? bowT + 0.05 * (i % 3) : SEC_HIHU2));
      stand(W_UJANG, UJANG_STAND[0], 0, UJANG_STAND[2], "nervous", 1, {}, 0.84, 1);
    } else if (id === 12) {
      stand(W_UJANG, UJANG_STAND[0], 0, UJANG_STAND[2], "nervous", 1, { wave: shake }, 0.84, 1);
      CROWD.forEach((c, i) => person_(c, i, "stand"));
    } else if (id === 13) {
      CROWD.forEach((c, i) => person_(c, i, t >= SEC_APA + 1.2 ? "laugh" : "stand"));
      stand(W_UJANG, UJANG_STAND[0], 0, UJANG_STAND[2], t < SEC_APA + 1.2 ? "nervous" : "dazed", 1, {}, 0.84, 1);
      bubble("Apaan,", "tat!", CROWD[5].x, 1.9, CROWD[5].z + 0.3, SEC_APA + 1.3, SEC_MELAPOR, 0.7);
    } else if (id === 14) {
      const u = glide((t - SEC_MELAPOR) / (SEC_POLMEN - SEC_MELAPOR));
      addChar(W_UJANG, UJANG_STAND[0] - 5 * u, 0, UJANG_STAND[2], {}, 0.84, true, true, { mode: "march", phase: q(t * 1.2, 40), expr: "pained", blink: lidAt(t, 1), stride: 0.9 }, true);
      CROWD.forEach((c, i) => person_(c, i, "idle"));
    }
  } else if (ws.setKind === "balai") {
    const [ux, , uz] = BALAI.ujang;
    if (id === 7) {
      stand(W_UJANG, ux, 0, uz, "neutral", 1, { tilt: 4 + liveTilt(t, 1, 3) }, 0.84, 1);
      const tq = q(t, 30);
      card(`fx|broom|${tq}`, 320, 400, (p) => fxBroom(p, tq), ux + 0.55, 0.55, uz + 0.25, 0.8, 1.0, true);
    } else if (id === 8) {
      stand(W_UJANG, ux, 0, uz, t < SEC_PETI ? "nervous" : "shock", 1, t >= SEC_PETI ? { wave: shake } : {}, 0.84, 1);
      burst("peti", SEC_PETI, 0.4, "#ffe066", CHEST.x, 0.7, CHEST.z + 0.3, 1.3);
    } else if (id === 9) {
      stand(W_UJANG, ux, 0, uz, "shock", 1, { wave: shake }, 0.84, 1);
      burst("miliar", SEC_MILIAR, 0.5, "#9bff9b", CHEST.x, 0.8, CHEST.z + 0.4, 1.6);
      for (let i = 0; i < 4; i++) burst("coin" + i, SEC_MILIAR + 0.4 + i * 0.55, 0.35, "#ffe066", CHEST.x + (i % 2 ? 0.3 : -0.3), 0.9, CHEST.z + 0.3, 0.8);
    } else if (id === 19) {
      const dig = t >= SEC_BONGKAR && t < SEC_BONGKAR + 1.4, carry = t >= SEC_BONGKAR + 1.6;
      const x = carry ? ux + 4.5 * glide((t - (SEC_BONGKAR + 1.6)) / (SEC_KANTOR - (SEC_BONGKAR + 1.6))) : ux;
      if (carry) {
        addChar(W_UJANG, x, 0, uz, {}, 0.84, true, false, { mode: "march", phase: q(t * 1.1, 40), expr: "stern", blink: lidAt(t, 1), stride: 0.8 }, true);
        card("fx|chestcarry", 300, 260, (p) => fxChestCarry(p), x + 0.35, 0.75, uz + 0.35, 0.8, 0.7, true);
      } else stand(W_UJANG, ux, 0, uz, t < SEC_BONGKAR ? "stern" : "grin", 1, dig ? { prop: ["hammer", q(0.5 + 0.5 * Math.sin(t * 8), 10)] as Prop } : {}, 0.84, 1);
    }
  } else if (ws.setKind === "polsek") {
    const [px, , pz] = POLSEK.police, [ux, , uz] = POLSEK.ujang;
    if (id === 15 || id === 16) {
      const bowK = id === 15 && t < SEC_ANGKAT ? glide((t - SEC_POLMEN) / 0.3) : 0;
      const hand = id === 15 ? (t >= SEC_ANGKAT ? glide((t - SEC_ANGKAT) / 0.4) : 0) : 1;
      stand(W_POL, px, 0, pz, bowK > 0.3 ? "smile_closed" : "grin", 5, hand > 0 ? { wave: q(0.4 + 0.6 * hand + 0.15 * Math.sin(t * 10), 10) } : {}, 0.88, -1, bowK);
      stand(W_UJANG, ux, 0, uz, id === 16 && t >= SEC_TOS ? "dazed" : "nervous", 1, id === 16 && t >= SEC_TOS - 0.1 ? { wave: q(0.5 + 0.2 * Math.sin(t * 10), 10) } : {}, 0.84, 1);
      if (id === 16) { bubble("Hi hu, Pak!", "", px + 0.1, 1.95, pz + 0.3, SEC_TOS + 0.2, SEC_BELAKANG, 0.9); burst("tos", SEC_TOS - 0.05, 0.35, "#ffd43b", (px + ux) / 2, 1.5, -0.7, 1.0); }
    } else if (id === 17 || id === 18) {
      const [lx, , lz] = POLSEK.lurah;
      stand(W_POL, px, 0, pz, "grin", 5, {}, 0.88, -1);
      stand(W_UJANG, ux, 0, uz, "dazed", 1, {}, 0.84, 1);
      stand(W_LURAH, lx, id === 17 ? 0.05 * Math.abs(Math.sin(t * 9)) : 0, lz, id === 17 ? "laugh" : "nervous", 7, id === 17 ? { wave: q(Math.sin(t * 7), 10) } : { wave: shake }, 0.86, -1);
      if (id === 17) bubble("HAHAHA!", "", lx - 0.1, 2.1, lz + 0.3, SEC_BELAKANG + 0.8, SEC_KERINGAT, 0.9);
      if (id === 18) { const tq = q(t, 30); card(`fx|sweat|${tq}`, 300, 240, (p) => fxSweat(p, tq), lx, 1.85, lz + 0.3, 0.8, 0.64, true); }
    } else {
      const carryIn = id === 20 && t < SEC_MEJA;
      const ux2 = id === 20 && t < SEC_MEJA ? lerp(PX + 3.2, ux, glide((t - SEC_KANTOR) / (SEC_MEJA - SEC_KANTOR))) : ux;
      if (carryIn) {
        addChar(W_UJANG, ux2, 0, uz, {}, 0.84, true, true, { mode: "march", phase: q(t * 1.1, 40), expr: "stern", blink: lidAt(t, 1), stride: 0.8 }, true);
        card("fx|chestcarry", 300, 260, (p) => fxChestCarry(p), ux2 - 0.35, 0.75, uz + 0.35, 0.8, 0.7, true);
      } else stand(W_UJANG, ux2, 0, uz, id >= 22 ? (t < SEC_DARI + 2.2 ? "nervous" : "dazed") : "stern", 1, id === 23 ? { wave: shake } : {}, 0.84, 1);
      const pExpr = id === 20 ? "neutral" : id === 21 ? "stern" : id === 22 && t >= SEC_DARI + 2.2 ? "shock" : "stern";
      stand(W_POL, px, 0, pz, pExpr, 5, id === 21 ? { prop: "pointer", wave: q(Math.sin(t * 3) * 0.3, 10) } : {}, 0.88, -1);
      if (id === 20 && t >= SEC_MEJA) burst("meja", SEC_MEJA, 0.35, "#ffd43b", POLSEK.chest[0], 1.2, POLSEK.chest[2] + 0.4, 1.0);
      if (id === 22 && t >= SEC_DARI + 2.3) bubble("Apaan, tat!", "", px, 2.0, pz + 0.3, SEC_DARI + 2.5, SEC_DITAHAN, 0.9);
      if (id === 23 && t >= SEC_DITAHAN + 0.1) card("fx|cuffs", 300, 170, (p) => fxCuffs(p), ux, 0.85, uz + 0.4, 0.7, 0.4, true);
    }
  } else {
    // ruang sidang
    const [jx, jy, jz] = COURT.judge, [ux, , uz] = COURT.ujang, [lx, , lz] = COURT.lurah;
    const bowAll = id === 27 ? glide((t - SEC_SEISI - 0.5) / 0.3) : id === 26 ? glide((t - SEC_BAWAHMU2 - 0.35) / 0.3) : 0;
    const shout = id === 28 && t >= SEC_HI;
    const ex = id === 24 ? (t >= SEC_VONIS + 1.2 ? "pained" : "shock") : "pained";
    stand(W_HAKIM, jx, jy, jz, id === 27 ? (bowAll > 0.3 ? "smile_closed" : "stern") : "stern", 8, {}, 0.86, 1, id === 27 ? bowAll : 0);
    stand(W_UJANG, ux, shout ? hopY(t, SEC_HI + 0.05, 0.32, 0.1) : 0, uz, id === 27 && bowAll > 0.3 ? "smile_closed" : shout ? "laugh" : ex, 1, shout ? { wave: q(Math.sin(t * 9), 10) } : id === 26 && t < SEC_BAWAHMU2 + 0.3 ? {} : {}, 0.84, 1, id === 26 || id === 27 ? bowAll : 0);
    stand(W_LURAH, lx, shout ? hopY(t, SEC_HI + 0.1, 0.32, 0.1) : 0, lz, id === 26 ? "smile" : shout ? "nervous" : id === 27 ? "smile" : "stern", 7, id === 26 ? { prop: "pointer", wave: q(0.5 + 0.4 * Math.sin(t * 5), 10) } : shout ? { wave: q(Math.sin(t * 9), 10) } : {}, 0.86, -1, id === 27 ? bowAll : 0);
    stand(W_POL, COURT.cop[0], shout ? hopY(t, SEC_HI + 0.02, 0.32, 0.1) : 0, COURT.cop[2], id === 27 && bowAll > 0.3 ? "smile_closed" : shout ? "laugh" : "stern", 5, shout ? { wave: q(Math.sin(t * 9 + 1), 10) } : {}, 0.88, 1, id === 27 ? bowAll : 0);
    AUD.forEach((a, i) => stand(i % 2 ? W_PRIA(1) : W_IBU(i), a.x, shout ? hopY(t, SEC_HI + 0.03 * i, 0.32, 0.12) : 0, a.z, id === 27 && bowAll > 0.3 ? "smile_closed" : shout ? "laugh" : "neutral", 50 + i, shout ? { wave: q(Math.sin(t * 9 + i), 10) } : {}, 0.84, 1, id === 27 ? bowAll : 0));
    if (id === 25 && t >= SEC_SAKSI + 0.2) bubble("Saya sudah", "bilang...", lx + 0.1, 2.15, lz + 0.3, SEC_SAYA - 1.0, SEC_SAYA, 0.8);
  }
  return out;
};
