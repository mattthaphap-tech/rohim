// Chunked render for Rohim on GitHub Actions.
//   node scripts/render-chunk.mjs <startFrame> <endFrame>   -> muted h264 chunk of RohimShort
//   node scripts/render-chunk.mjs captions                  -> full RohimCaptionGreenScreen mp4
// Uses software ANGLE (swangle): --gl=angle fails to create a WebGL context on GH runners.
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const mode = process.argv[2];
const browserExecutable = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const chromiumOptions = { gl: "swangle" };
const common = { browserExecutable, chromiumOptions };

console.log("Bundling Remotion...");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });

if (mode === "captions") {
  const comp = await selectComposition({ serveUrl, id: "RohimCaptionGreenScreen", ...common });
  const out = path.resolve("out/rohim/Rohim_Captions_GreenScreen.mp4");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  console.log(`Captions ${comp.durationInFrames} frames -> ${out}`);
  await renderMedia({
    composition: comp, serveUrl, codec: "h264", outputLocation: out,
    crf: 18, concurrency: 2, timeoutInMilliseconds: 900000,
    onProgress: ({ renderedFrames, progress }) => { if (renderedFrames % 150 === 0 || progress === 1) console.log(`Progress ${(progress * 100).toFixed(1)}%`); },
    ...common,
  });
  console.log("Captions done");
} else {
  const start = Number(process.argv[2]);
  const end = Number(process.argv[3]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
    console.error("usage: node scripts/render-chunk.mjs <startFrame> <endFrame> | captions");
    process.exit(1);
  }
  const comp = await selectComposition({ serveUrl, id: "RohimShort", ...common });
  const out = path.resolve(`out/rohim/chunks/chunk-${start}-${end}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  console.log(`Chunk ${start}-${end} of ${comp.durationInFrames} frames -> ${out}`);
  await renderMedia({
    composition: comp, serveUrl, codec: "h264", outputLocation: out,
    frameRange: [start, end], muted: true, crf: 18, concurrency: 2,
    timeoutInMilliseconds: 900000,
    onProgress: ({ renderedFrames, progress }) => { if (renderedFrames % 150 === 0 || progress === 1) console.log(`Progress ${(progress * 100).toFixed(1)}%`); },
    ...common,
  });
  console.log("Chunk done");
}
