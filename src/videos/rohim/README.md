# "Gilanya Meyakinkan" (komedi absurd satir, 3289 frame = 109,6 dtk @ 30 fps, 1080x1920)

Pak Rohim kena tilang lima pelanggaran -> panci di kepala, "motor ini anak kandung saya" -> polisi: ODGJ tak bisa ditilang -> dokter: "gilanya
sangat meyakinkan" -> bebas denda, pajak, utang -> seluruh kampung ikut "gila" (Puskesmas penuh orang berpanci) -> Pak Lurah bangga "100% sakit jiwa",
penerima bansos terbesar -> tim audit: warga berbaris, "KAMI GILA!" terlalu kompak = tanda waras, semua surat dicabut, pajak 5 tahun ->
hanya Pak Rohim gila asli (menyuapi panci, bernyanyi pada ayam), jadi maskot desa -> padahal sudah sembuh diam-diam, tak berani mengaku
karena kena pajak 5 tahun.

## Render
```bash
npm install
npm run rohim:assets      # hanya jika voiceover/SRT diganti (anchors, caption_chunks, rohim_mix.wav)
npm run rohim:stills      # 21 frame cek visual -> out/rohim/stills
npm run rohim:previews    # 8 cuplikan -> out/rohim/previews
npm run rohim:video       # render penuh -> out/rohim/Rohim_Video_Final.mp4
npm run rohim:captions    # caption + mux -> out/rohim/Rohim_Video_Final_With_Captions.mp4
```

## Peta shot (27)
1-2 tilang & panik | 3 panci di kepala, motor "anak kandung" | 4-5 ODGJ tak bisa ditilang, "bawa surat dokter" | 6-8 dokter memeriksa,
"gilanya meyakinkan", bebas denda/pajak/utang | 9-10 tetangga ikut, Puskesmas penuh orang berpanci | 11-13 kampung resmi gila, Pak Lurah | 14-16 tim audit,
warga berbaris, "KAMI GILA!" | 17-19 auditor: terlalu kompak, surat dicabut, pajak 5 tahun | 20-22 warga lemas, Pak Rohim menyuapi panci, bernyanyi pada ayam, "gila asli" |
23-24 maskot desa, latihan Jumat | 25-27 sudah sembuh diam-diam + end card.

## Peta file
| File | Isi |
| :-- | :-- |
| `anchors.json` | cue waktu dari SRT (sumber tunggal timing; kata disejajarkan ke suara nyata dengan VAD) |
| `story.ts` | 27 shot, kamera, kick 7 frame, posisi aktor, kerumunan, auditor berjalan masuk |
| `sets.ts` | jalan raya (motor, kerucut), puskesmas, alun-alun kampung + panggung Pak Lurah + alas maskot |
| `cast.ts` | Pak Rohim, polisi, dokter, auditor, Pak Lurah, warga; panci, ayam, not lagu, sendok, hati, keringat, balon ucapan |
| `world.ts` | scene Three.js, visibilitas set, panggung & alas maskot |
| `Overlays.tsx` | judul dan 16 stempel cerita (TIDAK BISA DITILANG, BEBAS ..., KAMI GILA!, PAJAK 5 TAHUN, ...) + end card |

## Catatan
- Panci di kepala dibuat sebagai kartu FX yang mengikuti tinggi kepala tiap tokoh (dewasa/anak/gemuk), bukan topi bawaan framework.
- Audio akhir `public/rohim_mix.wav`: VO dikompresi ringan + SFX prosedural (denting panci, stempel, kokok ayam, riuh warga), ~ -15 LUFS, true peak <= -1,2 dBTP.
