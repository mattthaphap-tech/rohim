// Grafis cerita di atas render 3D: judul, stempel "HI HU!", panel "Rp 2 miliar", stempel DITAHAN / 5 TAHUN dan end card.
// Zona aman 9:16: semua teks di atas area caption (paddingBottom 520).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import A from "./anchors.json";
import { FPS, glide } from "./story";

const AT = A as Record<string, number>;
const FONT = "'Poppins', 'Montserrat', 'Segoe UI', 'Arial Rounded MT Bold', sans-serif";
const INK = "#241726";

const Pop: React.FC<{ text: string; size: number; color: string; stroke?: number }> = ({ text, size, color, stroke = 10 }) => (
  <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.05, textAlign: "center", color,
    WebkitTextStroke: `${stroke}px ${INK}`, paintOrder: "stroke fill", textShadow: "0 8px 18px rgba(0,0,0,0.45)" }}>{text}</div>
);
const Stamp: React.FC<{ t: number; a: number; b: number; rot: number; top: number; children: React.ReactNode; shake?: boolean }> = ({ t, a, b, rot, top, children, shake }) => {
  if (t < a || t >= b) return null;
  const p = glide((t - a) / 0.14);
  const sx = shake ? Math.sin(t * 60) * 6 : 0, sy = shake ? Math.cos(t * 53) * 5 : 0;
  return <div style={{ position: "absolute", left: 50, right: 50, top, transform: `translate(${sx}px, ${sy}px) rotate(${rot}deg) scale(${0.45 + 0.55 * p})`, opacity: p }}>{children}</div>;
};
const Panel: React.FC<{ children: React.ReactNode; top: number; op: number }> = ({ children, top, op }) => (
  <div style={{ position: "absolute", left: 80, right: 80, top, opacity: op, padding: "22px 20px", borderRadius: 30, background: "rgba(20,16,32,0.82)", border: `6px solid ${INK}`, boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>{children}</div>
);
const HiHu: React.FC<{ t: number; a: number; b: number; rot?: number }> = ({ t, a, b, rot = -5 }) => (
  <Stamp t={t} a={a} b={b} rot={rot} top={250} shake><Pop text="HI HU!" size={190} color="#ffd43b" stroke={14} /></Stamp>
);

export const HihuOverlays: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const title = t < 3.6 ? glide(t / 0.4) * (1 - glide((t - 3.0) / 0.6)) : 0;
  const money = t >= AT.miliar && t < AT.berlari ? glide((t - AT.miliar) / 0.3) * (1 - glide((t - (AT.berlari - 0.4)) / 0.4)) : 0;
  const e = glide((t - (AT.end + 0.1)) / 0.3);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {title > 0.01 && (
        <div style={{ position: "absolute", left: 50, right: 50, top: 250, opacity: title, transform: `translateY(${(1 - title) * 20}px)` }}>
          <Pop text="ADA DUIT" size={120} color="#ffd43b" /><Pop text="DI BAWAHMU!" size={120} color="#ffffff" />
        </div>
      )}
      <HiHu t={t} a={AT.hihu1} b={AT.hihu1 + 1.0} />
      <HiHu t={t} a={AT.hihu2} b={AT.hihu2 + 0.9} rot={4} />
      <HiHu t={t} a={AT.hihu3} b={AT.hihu3 + 0.8} rot={-4} />
      <HiHu t={t} a={AT.hi} b={AT.end + 0.1} rot={-3} />
      {money > 0.01 && (
        <Panel top={210} op={money}>
          <Pop text="DANA DESA" size={52} color="#ffffff" stroke={7} />
          <div style={{ marginTop: 6 }}><Pop text="Rp 2.000.000.000" size={78} color="#2ed573" stroke={8} /></div>
          <div style={{ marginTop: 6 }}><Pop text="belum cair 2 tahun" size={46} color="#ff4757" stroke={6} /></div>
        </Panel>
      )}
      <Stamp t={t} a={AT.ditahan} b={AT.vonis - 0.1} rot={-6} top={250}><Pop text="DITAHAN!" size={150} color="#ff4757" /></Stamp>
      <Stamp t={t} a={AT.vonis + 0.5} b={AT.saksi} rot={-4} top={250}>
        <Pop text="VONIS" size={110} color="#ffffff" /><Pop text="5 TAHUN" size={150} color="#ff4757" />
      </Stamp>
      {e > 0 && (
        <div style={{ position: "absolute", left: 50, right: 50, top: 190, opacity: e, transform: `scale(${0.7 + 0.3 * e})` }}>
          <Pop text="Pak Ujang:" size={56} color="#ffffff" />
          <div style={{ marginTop: 2 }}><Pop text="5 TAHUN PENJARA" size={92} color="#ff4757" /></div>
          <div style={{ marginTop: 20 }}><Pop text="Pak Lurah:" size={56} color="#ffffff" /></div>
          <div style={{ marginTop: 2 }}><Pop text="SAKSI UTAMA" size={92} color="#ffd43b" /></div>
          <div style={{ marginTop: 20 }}><Pop text="Dana desa: belum cair" size={50} color="#ffffff" stroke={8} /></div>
        </div>
      )}
    </AbsoluteFill>
  );
};
