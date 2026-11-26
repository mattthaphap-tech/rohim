// Render pipeline "Tuyul": node scripts/render-tips.mjs <stills|previews|video|captions|all>
// Lintas-OS: pakai Chrome sistem kalau ditemukan (atau env CHROME_PATH), jika tidak Remotion mengunduh chrome-headless-shell.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const mode = process.argv[2] || "video";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const browserExecutable = candidates.find((p) => fs.existsSync(p));
const chromiumOptions = { gl: "angle" };
const common = { browserExecutable, chromiumOptions };
const conc = Math.max(1, Math.min(2, os.cpus().length - 1));

const outDir = path.resolve("out/tuyul");
fs.mkdirSync(outDir, { recursive: true });
const finalVideo = path.join(outDir, "Tuyul_Video_Final.mp4");

console.log("Bundling Remotion...");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const pick = (id) => selectComposition({ serveUrl, id, ...common });

const doStills = async () => {
  const comp = await pick("TuyulShort");
  fs.mkdirSync(path.join(outDir, "stills"), { recursive: true });
  const frames = [60, 160, 260, 330, 400, 480, 620, 700, 800, 1000, 1230, 1450, 1700, 2000, 2250, 2400, 2600, 2850];
  for (const frame of frames) {
    const output = path.join(outDir, "stills", `still_f${String(frame).padStart(4, "0")}.jpg`);
    console.log(`Still ${frame} -> ${output}`);
    await renderStill({ composition: comp, serveUrl, output, frame, imageFormat: "jpeg", jpegQuality: 95, ...common });
  }
};

const doPreviews = async () => {
  const comp = await pick("TuyulShortWithCaptions");
  fs.mkdirSync(path.join(outDir, "previews"), { recursive: true });
  const clips = [
    ["p1_dukun_kontrak", [90, 420]], ["p2_tuyul_mencuri", [530, 700]], ["p3_motor_tv_kulkas", [780, 900]], ["p4_saling_curi", [1090, 1250]],
    ["p5_lurah_300", [1420, 1600]], ["p6_spanduk_permen", [1690, 2040]], ["p7_mogok_kosong", [2300, 2640]], ["p8_ending", [2650, 2935]],
  ];
  for (const [name, range] of clips) {
    const outputLocation = path.join(outDir, "previews", `${name}.mp4`);
    console.log(`Preview ${name} ${range} -> ${outputLocation}`);
    await renderMedia({ composition: comp, serveUrl, codec: "h264", outputLocation, frameRange: range, crf: 20, concurrency: conc, timeoutInMilliseconds: 600000, ...common });
  }
};

const doVideo = async () => {
  const comp = await pick("TuyulShort");
  console.log(`Render ${comp.durationInFrames} frame (${(comp.durationInFrames / 30).toFixed(1)} dtk) -> ${finalVideo}`);
  await renderMedia({
    composition: comp, serveUrl, codec: "h264", outputLocation: finalVideo, crf: 18, concurrency: conc, timeoutInMilliseconds: 900000,
    onProgress: ({ renderedFrames, progress }) => { if (renderedFrames % 150 === 0 || progress === 1) console.log(`Progress ${(progress * 100).toFixed(1)}%`); },
    ...common,
  });
};

const doCaptions = async () => {
  const webm = path.join(outDir, "Tuyul_Captions_Transparent.webm");
  const green = path.join(outDir, "Tuyul_Captions_GreenScreen.mp4");
  const withCaps = path.join(outDir, "Tuyul_Video_Final_With_Captions.mp4");
  const c1 = await pick("TuyulCaptionOverlay");
  await renderMedia({ composition: c1, serveUrl, codec: "vp9", outputLocation: webm, concurrency: conc, ...common });
  const c2 = await pick("TuyulCaptionGreenScreen");
  await renderMedia({ composition: c2, serveUrl, codec: "h264", outputLocation: green, crf: 18, concurrency: conc, ...common });
  if (fs.existsSync(finalVideo)) {
    execSync(`ffmpeg -y -i "${finalVideo}" -i "${green}" -filter_complex "[1:v]colorkey=0x00FF00:0.3:0.1[ck];[0:v][ck]overlay=0:0[v]" -map "[v]" -map 0:a -c:v libx264 -crf 18 -preset fast -c:a copy "${withCaps}"`, { stdio: "inherit" });
    console.log(`Siap upload -> ${withCaps}`);
  } else console.log("Tuyul_Video_Final.mp4 belum ada: jalankan 'video' dulu, lalu 'captions'.");
};

if (mode === "stills") await doStills();
else if (mode === "previews") await doPreviews();
else if (mode === "video") await doVideo();
else if (mode === "captions") await doCaptions();
else if (mode === "all") { await doVideo(); await doCaptions(); }
else console.log("mode: stills | previews | video | captions | all");
