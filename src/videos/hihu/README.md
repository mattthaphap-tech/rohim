# "Ada Duit di Bawahmu! Hi hu!" (komedi absurd satir, 3153 frame = 105,1 dtk @ 30 fps, 1080x1920)

Desa Sukamaju: prank "Ada duit di bawahmu!" -> seluruh desa menunduk lalu berteriak "Hi hu!" -> Pak Ujang (tukang bersih balai desa)
menemukan peti 2 miliar dana desa di bawah ubin -> tak ada yang percaya -> ditahan -> divonis 5 tahun, saksi utamanya Pak Lurah (yang
menguburnya): "Saya sudah bilang berkali-kali, Pak, ada duit di bawahmu." -> seisi ruang sidang menunduk. "Hi hu!"

## Render
```bash
npm install
npm run hihu:assets      # hanya jika voiceover/SRT diganti (anchors, caption_chunks, hihu_mix.wav)
npm run hihu:stills      # 20 frame cek visual -> out/hihu/stills
npm run hihu:previews    # 8 cuplikan -> out/hihu/previews
npm run hihu:video       # render penuh -> out/hihu/Hihu_Video_Final.mp4
npm run hihu:captions    # caption + mux -> out/hihu/Hihu_Video_Final_With_Captions.mp4
```

## Peta shot (28)
1 Desa Sukamaju | 2-4 anak nge-prank, orang menunduk, "Hi hu!" | 5-6 seluruh desa ikut, lalu berhenti (hafal triknya) |
7-9 Pak Ujang menyapu, ubin longgar, peti 2 miliar | 10-13 berlari, semua warga menunduk, "Apaan, tat!" | 14-16 melapor, polisi menunduk, tos |
17-18 Pak Lurah tertawa lalu berkeringat | 19-20 membongkar lantai, membawa peti ke polsek | 21-23 polisi serius, "Apaan, tat!", ditahan |
24-28 sidang: vonis 5 tahun, Pak Lurah saksi, semua menunduk, "Hi hu!" + end card.

## Peta file
| File | Isi |
| :-- | :-- |
| `anchors.json` | cue waktu dari SRT (sumber tunggal timing; kata disejajarkan ke suara nyata dengan VAD) |
| `story.ts` | 28 shot, kamera, kick 7 frame, `balaiFlags` (ubin & peti), posisi aktor, kerumunan |
| `sets.ts` | alun-alun desa + gapura, aula balai desa (ubin longgar, peti), kantor polisi, ruang sidang + palu |
| `cast.ts` | anak-anak, ibu-ibu, warga, Pak Ujang, Pak Lurah, polisi, hakim; efek "menunduk" (`bowDraw`), balon ucapan, sapu, peti, borgol |
| `world.ts` | scene Three.js, animasi ubin terangkat/ubin beterbangan, tutup peti, palu hakim |
| `Overlays.tsx` | judul, stempel "HI HU!", panel Rp 2.000.000.000, DITAHAN!, VONIS 5 TAHUN, end card |

## Catatan
- Gerakan "menunduk" dibuat dengan memendekkan badan atas di sekitar pinggul + mata terpejam (framework tidak punya pose menunduk bawaan).
- Audio akhir `public/hihu_mix.wav`: VO dikompresi ringan + SFX prosedural (boing, sapu, gavel, tos, tawa), ~ -16 LUFS, true peak <= -1,2 dBTP.
