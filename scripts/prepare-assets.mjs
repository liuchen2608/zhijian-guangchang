import {
  mkdir,
  copyFile,
  readdir,
  readFile,
  writeFile,
  rename,
} from "node:fs/promises";
import { createHash } from "node:crypto";
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
await mkdir("public/models", { recursive: true });
await mkdir("public/wasm", { recursive: true });
const path = "public/models/hand_landmarker.task";
try {
  await readFile(path);
} catch {
  const res = await fetch(modelUrl, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw Error(`模型下载失败 HTTP ${res.status}`);
  await writeFile(`${path}.tmp`, Buffer.from(await res.arrayBuffer()));
  await rename(`${path}.tmp`, path);
}
const files = await readdir("node_modules/@mediapipe/tasks-vision/wasm");
for (const file of files)
  if (/\.(wasm|js)$/.test(file))
    await copyFile(
      `node_modules/@mediapipe/tasks-vision/wasm/${file}`,
      `public/wasm/${file}`,
    );
const pkg = JSON.parse(
  await readFile("node_modules/@mediapipe/tasks-vision/package.json", "utf8"),
);
const resources = [];
for (const file of [
  path,
  ...files.filter((f) => /\.(wasm|js)$/.test(f)).map((f) => `public/wasm/${f}`),
]) {
  const b = await readFile(file);
  if (b.length < 1000) throw Error(`资源异常: ${file}`);
  resources.push({
    file,
    bytes: b.length,
    sha256: createHash("sha256").update(b).digest("hex"),
  });
}
await writeFile(
  "docs/model-assets.json",
  JSON.stringify(
    {
      modelUrl,
      sdkVersion: pkg.version,
      preparedAt: new Date().toISOString(),
      license: "Apache-2.0; see model card and package LICENSE",
      modelCard:
        "https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20(Lite_Full)%20with%20Fairness%20Oct%202021.pdf",
      resources,
    },
    null,
    2,
  ),
);
console.log("模型与 WASM 已准备，哈希记录于 docs/model-assets.json");
