import { test, expect } from "@playwright/test";

test("摄像头被页面权限策略阻止时准确说明原因", async ({ page }) => {
  await page.route("**/", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "permissions-policy": "camera=()" },
    });
  });
  await page.goto("/");
  await page.locator("#camera-toggle").click();
  await expect(page.locator("#error")).toHaveAttribute(
    "data-code",
    "CAMERA_POLICY_BLOCKED",
  );
  await expect(page.locator("#error")).toContainText("页面权限策略");
  await page.locator("#source-mouse").click();
  await expect(page.locator("#error")).toBeHidden();
});

test("浏览器拒绝授权时提供系统权限指引和重试入口", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () =>
        Promise.reject(new DOMException("denied", "NotAllowedError")),
    });
  });
  await page.goto("/");
  await page.locator("#camera-toggle").click();
  await expect(page.locator("#error")).toContainText("系统设置");
  await expect(page.locator("#camera-toggle")).toBeEnabled();
  await expect(page.locator("#camera-help")).toBeVisible();
});
