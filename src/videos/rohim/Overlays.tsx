// Grafis cerita di atas render 3D: judul, stempel (TIDAK BISA DITILANG, SURAT DOKTER, BEBAS ..., KAMI GILA!, dst) dan end card.
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
type L = [string, number, string];
const Stamp: React.FC<{ t: number; a: number; b: number; rot?: number; top?: number; shake?: boolean; lines: L[] }> = ({ t, a, b, rot = -4, top = 250, shake, lines }) => {
  if (t < a || t >= b) return null;
  const p = glide((t - a) / 0.14);
  const sx = shake ? Math.sin(t * 60) * 6 : 0, sy = shake ? Math.cos(t * 53) * 5 : 0;
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top, transform: `translate(${sx}px, ${sy}px) rotate(${rot}deg) scale(${0.45 + 0.55 * p})`, opacity: p }}>
      {lines.map(([text, size, color], i) => <div key={i} style={{ marginTop: i ? 6 : 0 }}><Pop text={text} size={size} color={color} /></div>)}
    </div>
  );
};

export const RohimOverlays: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const title = t < 3.6 ? glide(t / 0.4) * (1 - glide((t - 3.0) / 0.6)) : 0;
  const e = glide((t - (AT.end + 0.1)) / 0.3);
  const W = "#ffffff", Y = "#ffd43b", R = "#ff4757", G = "#2ed573";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {title > 0.01 && (
        <div style={{ position: "absolute", left: 50, right: 50, top: 250, opacity: title, transform: `translateY(${(1 - title) * 20}px)` }}>
          <Pop text="GILANYA" size={124} color={Y} /><Pop text="MEYAKINKAN" size={110} color={W} />
        </div>
      )}
      <Stamp t={t} a={AT.gangguan} b={AT.surat - 0.1} rot={-5} lines={[["TIDAK BISA", 96, W], ["DITILANG!", 130, R]]} />
      <Stamp t={t} a={AT.gilanya} b={AT.bebas - 0.1} rot={-4} lines={[["SURAT DOKTER:", 70, W], ["GILA MEYAKINKAN", 78, Y]]} />
      <Stamp t={t} a={AT.denda} b={AT.denda + 0.75} rot={-6} lines={[["BEBAS", 110, W], ["DENDA", 140, G]]} />
      <Stamp t={t} a={AT.pajak} b={AT.pajak + 1.0} rot={5} lines={[["BEBAS", 110, W], ["PAJAK", 140, G]]} />
      <Stamp t={t} a={AT.utang} b={AT.tetangganya - 0.1} rot={-4} lines={[["BEBAS", 110, W], ["UTANG", 140, G]]} />
      <Stamp t={t} a={AT.resmi} b={AT.lurah} rot={-4} lines={[["KAMPUNG", 100, W], ["RESMI GILA", 120, Y]]} />
      <Stamp t={t} a={AT.seratus} b={AT.bansos - 0.1} rot={4} lines={[["100%", 170, Y], ["SAKIT JIWA!", 90, W]]} />
      <Stamp t={t} a={AT.bansos + 0.9} b={AT.audit - 0.2} rot={-3} top={240} lines={[["PENERIMA BANSOS", 70, W], ["KESEHATAN TERBESAR", 66, Y], ["SE-INDONESIA!", 80, W]]} />
      <Stamp t={t} a={AT.kami} b={AT.mencatat - 0.1} rot={-4} shake lines={[["KAMI", 150, Y], ["GILA!", 190, R]]} />
      <Stamp t={t} a={AT.kekompakan + 1.0} b={AT.dicabut - 0.1} rot={-3} lines={[["KEKOMPAKAN", 82, W], ["= WARAS", 128, G]]} />
      <Stamp t={t} a={AT.dicabut} b={AT.tunggakan - 0.1} rot={-6} lines={[["SEMUA SURAT", 80, W], ["DICABUT!", 140, R]]} />
      <Stamp t={t} a={AT.tunggakan} b={AT.lemas} rot={4} lines={[["TUNGGAKAN PAJAK", 70, W], ["5 TAHUN", 150, R]]} />
      <Stamp t={t} a={AT.dipertahankan} b={AT.satu - 0.1} rot={-4} lines={[["SURAT", 100, W], ["DIPERTAHANKAN", 84, G]]} />
      <Stamp t={t} a={AT.satu + 0.2} b={AT.jumat - 0.1} rot={3} lines={[["MASKOT DESA", 104, Y], ["BEBAS PAJAK", 92, G]]} />
      <Stamp t={t} a={AT.jumat + 0.5} b={AT.latihan + 0.6} rot={-3} lines={[["LATIHAN", 100, W], ["JUMAT", 140, Y]]} />
      <Stamp t={t} a={AT.sembuh + 1.6} b={AT.bilang} rot={-3} top={260} lines={[["SUDAH SEMBUH", 82, G], ["(diam-diam)", 66, W]]} />
      {e > 0 && (
        <div style={{ position: "absolute", left: 50, right: 50, top: 200, opacity: e, transform: `scale(${0.7 + 0.3 * e})` }}>
          <Pop text="Pak Rohim:" size={60} color={W} />
          <div style={{ marginTop: 2 }}><Pop text="WARAS" size={140} color={G} /></div>
          <div style={{ marginTop: 18 }}><Pop text="Kalau ketahuan:" size={54} color={W} /></div>
          <div style={{ marginTop: 2 }}><Pop text="PAJAK 5 TAHUN" size={96} color={R} /></div>
        </div>
      )}
    </AbsoluteFill>
  );
};
