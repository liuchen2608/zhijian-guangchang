import { build } from "esbuild";
// MediaPipe 0.10.32 loads its WASM factory using importScripts.
// A classic, self-contained worker is required in BOTH dev and production.
await build({
  entryPoints: ["src/tracking/hand.worker.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  outfile: "public/tracking-worker.js",
  minify: true,
});
