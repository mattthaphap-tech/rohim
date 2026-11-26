// Grafis cerita di atas render 3D (bukan subtitle): stempel "PLOT TWIST: BUKAN SUNGAI" dan end card "1 KASUR".
// Zona aman 9:16: semua teks berada di tengah horizontal dan di atas area caption (paddingBottom 520).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import A from "./anchors.json";
import { FPS, glide } from "./story";

const AT = A as Record<string, number>;
const FONT = "'Poppins', 'Montserrat', 'Segoe UI', 'Arial Rounded MT Bold', sans-serif";
const INK = "#241726";

const Pop: React.FC<{ text: string; size: number; color: string }> = ({ text, size, color }) => (
  <div
    style={{
      fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.05, textAlign: "center", color,
      WebkitTextStroke: `10px ${INK}`, paintOrder: "stroke fill", textShadow: "0 8px 18px rgba(0,0,0,0.45)",
    }}
  >
    {text}
  </div>
);

export const TipsOverlays: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const stamp = t >= AT.plot && t < AT.sari;
  const p1 = glide((t - AT.plot) / 0.18), p2 = glide((t - AT.bukan) / 0.18);
  const e = glide((t - (AT.end + 0.1)) / 0.3);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {stamp && (
        <div style={{ position: "absolute", left: 60, right: 60, top: 250, transform: `rotate(-4deg) scale(${0.5 + 0.5 * p1})`, opacity: p1 }}>
          <Pop text="PLOT TWIST:" size={112} color="#ffd43b" />
          <div style={{ marginTop: 14, opacity: p2, transform: `scale(${0.6 + 0.4 * p2})` }}>
            <Pop text="BUKAN SUNGAI" size={124} color="#ffffff" />
          </div>
        </div>
      )}
      {e > 0 && (
        <div style={{ position: "absolute", left: 60, right: 60, top: 240, opacity: e, transform: `scale(${0.7 + 0.3 * e})` }}>
          <Pop text="Kerusakan akibat twist:" size={64} color="#ffffff" />
          <div style={{ marginTop: 14 }}><Pop text="1 KASUR" size={150} color="#ff4757" /></div>
        </div>
      )}
    </AbsoluteFill>
  );
};
