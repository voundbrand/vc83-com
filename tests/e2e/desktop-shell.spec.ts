import { expect, test } from "@playwright/test";
import {
  createShellNavigationRetryTracker,
  finalizeShellNavigationRetries,
  gotoShellWithRetry,
} from "./utils/shell-navigation";

const DESKTOP_CONTEXT = "desktop_shell_e2e";

test.describe("Desktop Shell", () => {
  test("renders top shell, supports app deep-links, and cleans URL state", async ({ page }, testInfo) => {
    const navigationTracker = createShellNavigationRetryTracker({ abortRetryBudget: 2 });

    await test.step("desktop top shell renders", async () => {
      await gotoShellWithRetry(page, "/", navigationTracker);
      await expect(page.getByRole("button", { name: /product os/i })).toBeVisible();
    });

    await test.step("login deep-link opens expected window", async () => {
      await gotoShellWithRetry(page, `/?app=login&context=${DESKTOP_CONTEXT}`, navigationTracker);
      await expect(page.getByTestId("desktop-window-tab-login")).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get("app")).toBeNull();
    });

    await test.step("store deep-link opens expected window", async () => {
      await gotoShellWithRetry(page, `/?app=store&context=${DESKTOP_CONTEXT}`, navigationTracker);
      await expect(page.getByTestId("desktop-window-tab-store")).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get("app")).toBeNull();
    });

    await test.step("public /store full-screen keeps section deep-link parity", async () => {
      await gotoShellWithRetry(page, "/store?section=calculator", navigationTracker);
      await expect(page.getByRole("heading", { name: /pricing transparency/i })).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get("panel")).toBe("calculator");
      await expect.poll(() => new URL(page.url()).searchParams.get("section")).toBe("calculator");
    });

    await test.step("unknown deep-link is cleaned from URL", async () => {
      await gotoShellWithRetry(
        page,
        `/?app=does-not-exist&context=${DESKTOP_CONTEXT}`,
        navigationTracker
      );
      await expect.poll(() => new URL(page.url()).searchParams.get("app")).toBeNull();
      await expect(page).not.toHaveURL(/[\?&]app=/);
    });

    finalizeShellNavigationRetries(navigationTracker, testInfo);
  });
});
