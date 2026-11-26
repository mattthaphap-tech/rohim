# Plot Twist Tidak Berguna #2: "Tips Hewan Buas" (komedi absurd, 1305 frame = 43.5 dtk @ 30 fps, 1080x1920)

Dikejar harimau -> ingat video tips -> harimau pergi -> pipis di pinggir sungai -> TWIST: ngompol di kasur (kerusakan: 1 kasur).

## Render (urutan)
```bash
npm install
npm run tips:assets      # opsional: hanya kalau voiceover/SRT diganti (membuat ulang anchors, caption, SFX mix)
npm run tips:stills      # cek visual 14 frame -> out/tips/stills
npm run tips:previews    # 7 cuplikan beat 3-4 dtk -> out/tips/previews
npm run tips:video       # render 3D penuh -> out/tips/Tips_Video_Final.mp4
npm run tips:captions    # caption (webm alpha + green screen) + mux -> out/tips/Tips_Video_Final_With_Captions.mp4
npm run studio           # Folder "Tips": TipsShort, TipsShortWithCaptions, ...
```
Font Poppins (Bold/Black) sebaiknya terpasang di sistem untuk caption & teks stempel (sama seperti demo).

## Peta file
| File | Isi |
| :-- | :-- |
| `anchors.json` | cue waktu dari SRT (tunggu, halo, oh, pak, ..., scream, plot, kasur, end). **Sumber tunggal** timing shot, staging, dan SFX |
| `story.ts` | 15 shot, kamera multi-angle, kick 7 frame, flash 4 frame di `FLASH_AT`, posisi Bimo/harimau (`bimoX`, `tigerX`), tata kamar (`BED`) |
| `sets.ts` | set prosedural: hutan golden hour + sungai, kamar tidur (kasur, selimut basah, jendela, pintu, jam, lampu meja) |
| `cast.ts` | Bimo, Sari, Bang Jagoan Alam (toon.ts), sprite harimau (Pen), kartu TV flashback, "!" "?", uap noda kasur |
| `world.ts` | scene Three.js: sky, kedua set, lampu meja sebagai motivated halo |
| `Overlays.tsx` | stempel "PLOT TWIST: BUKAN SUNGAI" dan end card "Kerusakan akibat twist: 1 KASUR" |
| `TipsCaptionOverlay.tsx` | subtitle standar channel (Poppins 900, outline 7px, pop 1.12x) |
| `build.ts, toon.ts, ink.ts, grade.ts, ...` | inti framework (tidak diubah) |

## Peta timeline
Shot 1-2 kejar + realisasi | 3 flashback TV | 4-5 "Oh iya" + dutch heroik | 6-7 harimau bingung/pergi | 8-9 crane + tepi sungai |
**10 twist (white flash + kick)** | 11-12 stempel + macro kasur | 13-14 Bimo vs Sari deadpan | 15 macro + end card + ka-ching.

## Catatan
- Timing kata di dalam satu cue SRT diinterpolasi per jumlah karakter, jadi bisa meleset beberapa frame. Kalau perlu presisi per kata, ganti `voice/tips.srt`/chunk dengan JSON kata-per-kata dari ElevenLabs (seperti `scripts/gen-chunks.py`) lalu sesuaikan nilai di `anchors.json`.
- Audio akhir `public/tips_mix.wav`: VO + SFX prosedural dengan ducking, ~ -16 LUFS, true peak <= -1.2 dBTP.
