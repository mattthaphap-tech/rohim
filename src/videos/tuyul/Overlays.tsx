// Grafis cerita di atas render 3D: judul, penghitung uang desa, grafik "+300%", stempel "MOGOK KERJA!" dan end card.
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
const Stamp: React.FC<{ t: number; a: number; b: number; rot: number; top: number; children: React.ReactNode }> = ({ t, a, b, rot, top, children }) => {
  if (t < a || t >= b) return null;
  const p = glide((t - a) / 0.16);
  return <div style={{ position: "absolute", left: 50, right: 50, top, transform: `rotate(${rot}deg) scale(${0.5 + 0.5 * p})`, opacity: p }}>{children}</div>;
};
const Panel: React.FC<{ children: React.ReactNode; top: number; op: number }> = ({ children, top, op }) => (
  <div style={{ position: "absolute", left: 90, right: 90, top, opacity: op, padding: "22px 20px", borderRadius: 30, background: "rgba(20,16,32,0.82)", border: `6px solid ${INK}`, boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>{children}</div>
);

export const TuyulOverlays: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const title = t < 3.0 ? glide(t / 0.4) * (1 - glide((t - 2.4) / 0.6)) : 0;
  const counter = t >= AT.saling && t < AT.makmur ? glide((t - AT.saling) / 0.3) * (1 - glide((t - (AT.makmur - 0.4)) / 0.4)) : 0;
  const same = t >= AT.tidak;
  const chart = t >= AT.ekonomi && t < AT.suatu ? glide((t - AT.ekonomi) / 0.25) * (1 - glide((t - (AT.suatu - 0.5)) / 0.5)) : 0;
  const grow = glide((t - AT.persen) / 0.7);
  const e = glide((t - (AT.end + 0.1)) / 0.3);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {title > 0.01 && (
        <div style={{ position: "absolute", left: 60, right: 60, top: 250, opacity: title, transform: `translateY(${(1 - title) * 20}px)` }}>
          <Pop text="TUYUL" size={118} color="#ffd43b" /><Pop text="MOGOK KERJA" size={96} color="#ffffff" />
        </div>
      )}
      {counter > 0.01 && (
        <Panel top={210} op={counter}>
          <Pop text="TOTAL UANG DI KAMPUNG" size={44} color="#ffffff" stroke={6} />
          <div style={{ marginTop: 6 }}><Pop text="Rp 12.500.000" size={92} color="#2ed573" stroke={8} /></div>
          {same && <div style={{ marginTop: 6 }}><Pop text="Tambahan uang: Rp 0" size={46} color="#ff4757" stroke={6} /></div>}
        </Panel>
      )}
      {chart > 0.01 && (
        <Panel top={190} op={chart}>
          <Pop text="PERTUMBUHAN EKONOMI DESA" size={38} color="#ffffff" stroke={6} />
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 36, height: 300, marginTop: 14 }}>
            <div style={{ width: 120, height: 70, background: "#74b9ff", border: `6px solid ${INK}`, borderRadius: 10 }} />
            <div style={{ width: 120, height: 70 + 220 * grow, background: "#2ed573", border: `6px solid ${INK}`, borderRadius: 10 }} />
          </div>
          <div style={{ marginTop: 4 }}><Pop text={`+${Math.round(300 * grow)}%`} size={120} color="#2ed573" stroke={9} /></div>
        </Panel>
      )}
      <Stamp t={t} a={AT.mogok} b={AT.kosong - 0.2} rot={-5} top={240}>
        <Pop text="MOGOK" size={150} color="#ff4757" /><Pop text="KERJA!" size={150} color="#ffffff" />
      </Stamp>
      {e > 0 && (
        <div style={{ position: "absolute", left: 50, right: 50, top: 190, opacity: e, transform: `scale(${0.7 + 0.3 * e})` }}>
          <Pop text="Pertumbuhan ekonomi desa:" size={52} color="#ffffff" />
          <div style={{ marginTop: 6 }}><Pop text="300% ➜ 0%" size={150} color="#ff4757" /></div>
          <div style={{ marginTop: 18 }}><Pop text="Yang kerja selama ini:" size={48} color="#ffffff" stroke={8} /></div>
          <div style={{ marginTop: 4 }}><Pop text="TUYUL" size={110} color="#ffd43b" /></div>
        </div>
      )}
    </AbsoluteFill>
  );
};
