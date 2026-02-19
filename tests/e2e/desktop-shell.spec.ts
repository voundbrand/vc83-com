import { expect, test } from "@playwright/test";

const DESKTOP_CONTEXT = "desktop_shell_e2e";

test.describe("Desktop Shell", () => {
  test("renders top shell, supports app deep-links, and cleans URL state", async ({ page }) => {
    await test.step("desktop top shell renders", async () => {
      await page.goto("/", { waitUntil: "commit" });
      await expect(page.getByRole("button", { name: /product os/i })).toBeVisible();
    });

    await test.step("login deep-link opens expected window", async () => {
      await page.goto(`/?app=login&context=${DESKTOP_CONTEXT}`, { waitUntil: "commit" });
      await expect(page.getByTestId("desktop-window-tab-login")).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get("app")).toBeNull();
    });

    await test.step("store deep-link opens expected window", async () => {
      await page.goto(`/?app=store&context=${DESKTOP_CONTEXT}`, { waitUntil: "commit" });
      await expect(page.getByTestId("desktop-window-tab-store")).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get("app")).toBeNull();
    });

    await test.step("public /store full-screen keeps section deep-link parity", async () => {
      await page.goto("/store?section=calculator", { waitUntil: "commit" });
      await expect(page.getByRole("heading", { name: /pricing transparency/i })).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get("panel")).toBe("calculator");
      await expect.poll(() => new URL(page.url()).searchParams.get("section")).toBe("calculator");
    });

    await test.step("unknown deep-link is cleaned from URL", async () => {
      await page.goto(`/?app=does-not-exist&context=${DESKTOP_CONTEXT}`, { waitUntil: "commit" });
      await expect.poll(() => new URL(page.url()).searchParams.get("app")).toBeNull();
      await expect(page).not.toHaveURL(/[\?&]app=/);
    });
  });
});
