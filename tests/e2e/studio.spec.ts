import { test, expect } from "@playwright/test";
test("光场、鼠标四种模式、质量与偏好恢复", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "让光，随你而动。" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/studio-desktop.png" });
  await page.locator("#source-mouse").click();
  await page.mouse.move(720, 410);
  for (const mode of ["follow", "attract", "scatter"]) {
    await page.locator(`[data-mode=${mode}]`).click();
    await expect(page.locator(`[data-mode=${mode}]`)).toHaveClass(/active/);
  }
  await page.locator("[data-mode=wave]").click();
  await page.locator("#quality").selectOption("low");
  await expect(page.locator("#diagnostic-text")).toContainText("4,000");
  await page.locator("#preview-toggle").click();
  await expect(page.locator("#preview-body")).toBeHidden();
  await page.reload();
  await expect(page.locator("#quality")).toHaveValue("low");
  await expect(page.locator("#preview-body")).toBeHidden();
  await expect(page.locator("#device-state")).toHaveText("摄像头未开启");
  expect(errors).toEqual([]);
});
test("拒绝摄像头有明确恢复入口，桌面窄屏无横向溢出", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () =>
        Promise.reject(new DOMException("denied", "NotAllowedError")),
    });
  });
  await page.goto("/");
  await page.locator("#camera-toggle").click();
  await expect(page.locator("#error")).toContainText("摄像头未获授权");
  await page.locator("#source-mouse").click();
  await expect(page.locator("#error")).toBeHidden();
  await page.setViewportSize({ width: 1024, height: 768 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("#camera-toggle")).toBeInViewport();
  await expect(page.locator("[data-mode=wave]")).toBeInViewport();
});
test("资源真实加载与模型初始化冒烟（合成视频，不代表真实手势）", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const c = document.createElement("canvas");
        c.width = 640;
        c.height = 480;
        const ctx = c.getContext("2d")!;
        setInterval(() => {
          ctx.fillStyle = "#333";
          ctx.fillRect(0, 0, 640, 480);
        }, 40);
        const stream=c.captureStream(25);Object.assign(window,{testStream:stream});return stream;
      },
    });
  });
  await page.goto("/");
  await page.locator("#camera-toggle").click();
  await expect
    .poll(
      async () => {
        const error = await page.locator("#error").textContent();
        if (error) throw Error(error);
        return page.locator("#camera-toggle").textContent();
      },
      { timeout: 30000 },
    )
    .toContain("关闭摄像头");
  await expect(page.locator("#error")).toBeHidden();
  await expect(page.locator("#status")).toHaveText("等待手部", {
    timeout: 10000,
  });
  await expect.poll(async()=>page.locator('#diagnostic-text').textContent()).toMatch(/识别 CPU/);
  await page.waitForTimeout(2500);
  await expect(page.locator("#error")).toBeHidden();
  await page.locator("#camera-toggle").click();
  await expect(page.locator("#device-state")).toHaveText("摄像头未开启");
  expect(await page.evaluate(()=>((window as Window&{testStream?:MediaStream}).testStream?.getTracks()??[]).every(t=>t.readyState==='ended'))).toBe(true);
});

test('模型资源失败关闭视频，允许重试与鼠标演示',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d')!;ctx.fillRect(0,0,640,480);const stream=c.captureStream(15);Object.assign(window,{testStream:stream});return stream}})});
 await page.route('**/models/hand_landmarker.task',route=>route.abort());
 await page.goto('/');await page.locator('#camera-toggle').click();await expect(page.locator('#error')).toBeVisible({timeout:30000});await expect(page.locator('#device-state')).toHaveText('摄像头未开启');expect(await page.evaluate(()=>((window as Window&{testStream?:MediaStream}).testStream?.getTracks()??[]).every(t=>t.readyState==='ended'))).toBe(true);await page.locator('#source-mouse').click();await expect(page.locator('#status')).toHaveText('鼠标演示中');
});
