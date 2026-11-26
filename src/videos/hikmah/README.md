# "Segala Sesuatu Pasti Ada Hikmahnya" (komedi absurd, 1526 frame = 50,9 dtk @ 30 fps, 1080x1920)

Pak Bimo mengunjungi tanah 2 hektar yang jadi hutan -> ladang ganja -> ditangkap, vonis 20 tahun -> banding, bebas ->
bangun rumah, gali sumur -> emas sebesar kepala ("ini hikmah!") -> ditangkap lagi (tambang ilegal) -> tanah diambil pemerintah.
End card: "Hikmah yang didapat: 0 | Kerusakan akibat twist: 2 hektar + 1 sumur".

## Render
```bash
npm install
npm run hikmah:assets     # hanya jika voiceover/SRT diganti (anchors, caption_chunks, hikmah_mix.wav)
npm run hikmah:stills     # 16 frame cek visual -> out/hikmah/stills
npm run hikmah:previews   # 7 cuplikan -> out/hikmah/previews
npm run hikmah:video      # render penuh -> out/hikmah/Hikmah_Video_Final.mp4
npm run hikmah:captions   # caption + mux -> out/hikmah/Hikmah_Video_Final_With_Captions.mp4
```

## Peta shot (16)
1 tiba di hutan (tracking) | 2 ladang ganja (CU kaget + reveal) | 3 polisi datang | 4 sidang | 5 palu (macro) | 6 "20 TAHUN" (stempel, "2 TAHUN KEMUDIAN") |
7 banding diterima | 8 bebas di gerbang lapas | 9 "mengolah tanahku" | 10 rumah jadi dalam sekejap (4 tahap) | 11 gali sumur, cangkul menabrak sesuatu |
12 EMAS (white flash 4 frame) | 13 "ini hikmah..." bangga + hening | 14 polisi lagi: TAMBANG ILEGAL | 15 sel | 16 plang TANAH NEGARA + end card.

## Peta file
| File | Isi |
| :-- | :-- |
| `anchors.json` | cue waktu dari SRT (sumber tunggal timing). Kata dalam satu cue disejajarkan ke suara nyata dengan VAD, bukan sekadar dibagi rata |
| `story.ts` | 16 shot, kamera, kick 7 frame, `landFlags` (isi lahan menurut waktu), posisi aktor |
| `sets.ts` | lahan (hutan lebat, ladang, rumah 4 tahap, sumur, plang), ruang sidang + palu, sel, gerbang lapas |
| `cast.ts` | Bimo (baju biasa & seragam tahanan), polisi, hakim, kartu emas, "!" , burst |
| `world.ts` | scene Three.js, visibilitas set, animasi palu, halo emas |
| `Overlays.tsx` | title card, "20 TAHUN", "BANDING DITERIMA", "TAMBANG ILEGAL", end card |

## Catatan
- Title card "Segala sesuatu pasti ada hikmahnya" hanya teks di layar 0-3 dtk (tidak ada di voiceover). Tambahkan baris pembuka di ElevenLabs bila ingin dibacakan, lalu jalankan `hikmah:assets`.
- Audio akhir `public/hikmah_mix.wav`: VO + SFX prosedural (ducking), ~ -17,8 LUFS, true peak <= -1,2 dBTP.
