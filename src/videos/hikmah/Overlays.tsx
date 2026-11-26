// Grafis cerita di atas render 3D: title card, stempel "20 TAHUN", "BANDING DITERIMA", "TAMBANG ILEGAL" dan end card
// "Hikmah yang didapat: 0". Zona aman 9:16: semua teks di atas area caption (paddingBottom 520).
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
const Stamp: React.FC<{ t: number; a: number; b: number; rot: number; top: number; children: React.ReactNode }> = ({ t, a, b, rot, top, children }) => {
  if (t < a || t >= b) return null;
  const p = glide((t - a) / 0.16);
  return <div style={{ position: "absolute", left: 50, right: 50, top, transform: `rotate(${rot}deg) scale(${0.5 + 0.5 * p})`, opacity: p }}>{children}</div>;
};

export const HikmahOverlays: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const title = t < 3.4 ? glide(t / 0.5) * (1 - glide((t - 2.8) / 0.6)) : 0;
  const e = glide((t - (AT.end + 0.1)) / 0.3);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {title > 0.01 && (
        <div style={{ position: "absolute", left: 70, right: 70, top: 260, opacity: title, transform: `translateY(${(1 - title) * 20}px)` }}>
          <Pop text="Segala sesuatu" size={84} color="#ffffff" stroke={9} />
          <Pop text="pasti ada hikmahnya" size={84} color="#ffd43b" stroke={9} />
        </div>
      )}
      <Stamp t={t} a={AT.dua0} b={AT.dua0 + 1.3} rot={-4} top={230}><Pop text="20 TAHUN" size={158} color="#ff4757" /></Stamp>
      <Stamp t={t} a={AT.dua0 + 1.5} b={AT.banding + 0.2} rot={-3} top={250}>
        <Pop text="2 TAHUN" size={118} color="#ffffff" /><Pop text="KEMUDIAN..." size={118} color="#ffffff" />
      </Stamp>
      <Stamp t={t} a={AT.banding + 0.4} b={AT.bebas} rot={-4} top={240}>
        <Pop text="BANDING" size={120} color="#ffffff" /><Pop text="DITERIMA" size={132} color="#2ed573" />
      </Stamp>
      <Stamp t={t} a={AT.tambang} b={AT.penjara - 0.1} rot={-5} top={250}>
        <Pop text="TAMBANG" size={128} color="#ffffff" /><Pop text="ILEGAL" size={148} color="#ff4757" />
      </Stamp>
      {e > 0 && (
        <div style={{ position: "absolute", left: 50, right: 50, top: 190, opacity: e, transform: `scale(${0.7 + 0.3 * e})` }}>
          <Pop text="Hikmah yang didapat:" size={62} color="#ffffff" />
          <div style={{ marginTop: 4 }}><Pop text="0" size={200} color="#ffd43b" /></div>
          <div style={{ marginTop: 18 }}><Pop text="Kerusakan akibat twist:" size={50} color="#ffffff" stroke={8} /></div>
          <div style={{ marginTop: 6 }}><Pop text="2 HEKTAR + 1 SUMUR" size={88} color="#ff4757" /></div>
        </div>
      )}
    </AbsoluteFill>
  );
};
