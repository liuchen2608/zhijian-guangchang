import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
test("5分钟轻量光场稳定性（自动演示，非真人识别）", async ({ page }) => {
  test.skip(process.env.RUN_PERF !== "1", "单独运行 npm run test:perf");
  test.setTimeout(330000);
  await page.goto("/");
  await page.locator("#quality").selectOption("low");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const sample = await page.evaluate(async () => {
    const start = performance.now();
    let last = start,
      frames = 0,
      bucket = 0,
      bucketStart = start;
    const fps: number[] = [];
    return new Promise<{
      seconds: number;
      frames: number;
      averageFps: number;
      minBucketFps: number;
      under24Buckets: number;
    }>((resolve) => {
      function tick(now: number) {
        if (now - last > 0) {
          frames++;
          bucket++;
        }
        last = now;
        if (now - bucketStart >= 1000) {
          fps.push((bucket * 1000) / (now - bucketStart));
          bucket = 0;
          bucketStart = now;
        }
        if (now - start >= 300000)
          resolve({
            seconds: (now - start) / 1000,
            frames,
            averageFps: (frames * 1000) / (now - start),
            minBucketFps: Math.min(...fps),
            under24Buckets: fps.filter((n) => n < 24).length,
          });
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  });
  await writeFile(
    "docs/performance-sample.json",
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        browser: await page.evaluate(() => navigator.userAgent),
        input: "自动演示，无真实摄像头识别",
        quality: "low",
        particles: 4000,
        ...sample,
        errors,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  expect(sample.averageFps).toBeGreaterThanOrEqual(30);
});
