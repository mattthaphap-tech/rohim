# "Tuyul Mogok Kerja" (komedi absurd, 2937 frame = 97,9 dtk @ 30 fps, 1080x1920)

Pak Slamet bosan miskin -> dukun memberi tuyul + kontrak (ada pasal cuti!) -> tuyul mencuri, beli motor/TV/kulkas ->
semua tetangga juga punya tuyul, semua tuyul saling mencuri -> uang desa tidak bertambah tapi "ekonomi tumbuh 300%" ->
tuyul mogok -> semua lemari kosong -> "ternyata selama ini yang kerja bukan saya."
End card: "Pertumbuhan ekonomi desa: 300% -> 0% | Yang kerja selama ini: TUYUL".

## Render
```bash
npm install
npm run tuyul:assets      # hanya jika voiceover/SRT diganti (anchors, caption_chunks, tuyul_mix.wav)
npm run tuyul:stills      # 18 frame cek visual -> out/tuyul/stills
npm run tuyul:previews    # 8 cuplikan -> out/tuyul/previews
npm run tuyul:video       # render penuh -> out/tuyul/Tuyul_Video_Final.mp4
npm run tuyul:captions    # caption + mux -> out/tuyul/Tuyul_Video_Final_With_Captions.mp4
```
Perkiraan waktu render penuh: 2937 frame; pakai `tuyul:previews` dulu untuk memastikan tampilan.

## Peta shot (28)
1 bosan miskin | 2-3 gubuk dukun, tuyul + kertas | 4 CU kontrak (stempel SAH) | 5 "Tuyul kok pakai kontrak?" | 6 "Zaman sudah berubah" |
7 tuyul mencuri di jalan malam | 8 lemari terisi uang | 9-10 motor/TV/kulkas pop | 11 tetangga juga kaya (pan) + tuyul mengintip |
12 crane: tuyul saling mencuri | 13 uang cuma pindah (penghitung "Rp 0 tambahan") | 14-16 balai desa: Pak Lurah, grafik +300% (white flash) |
17-18 tuyul berkumpul, spanduk | 19-22 Pak Slamet membujuk, permen, ketua tuyul dingin | 23 tuyul mogok | 24-25 pagi: lemari kosong |
26-27 terduduk, berbisik | 28 "yang kerja bukan saya" + end card.

## Peta file
| File | Isi |
| :-- | :-- |
| `anchors.json` | cue waktu dari SRT (sumber tunggal timing; kata disejajarkan ke suara nyata dengan VAD) |
| `story.ts` | 28 shot, kamera, kick 7 frame, flag dunia (`houseFlags`, `streetFlags`), posisi aktor |
| `sets.ts` | rumah (lemari berpintu, uang 3 tahap, motor/TV/kulkas), gubuk dukun, jalan kampung, lapangan + spanduk, balai desa |
| `cast.ts` | Pak Slamet, dukun, tuyul (build "kid", botak), ketua tuyul, Pak Lurah, warga; kartu kontrak/uang/plakat |
| `world.ts` | scene Three.js, visibilitas set, pintu lemari, pop barang baru, halo lampu |
| `Overlays.tsx` | judul, penghitung uang desa, grafik +300%, stempel MOGOK KERJA!, end card |

## Catatan
- Judul "TUYUL MOGOK KERJA" (0-3 dtk) hanya teks layar; ubah di `Overlays.tsx`.
- Audio akhir `public/tuyul_mix.wav`: VO + SFX prosedural (ducking, trombon sedih di akhir), ~ -16 LUFS, true peak <= -1,2 dBTP.
