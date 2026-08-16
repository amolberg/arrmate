import { expect, test } from "@playwright/test";

test("guest sees the request-first home without fake activity", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find your next watch." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start exploring" }),
  ).toBeVisible();
  await expect(page.getByText("Nothing waiting yet")).toBeVisible();
});

test("mobile layout does not overflow horizontally", async ({ page }) => {
  await page.goto("/");
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
});

test("local owner session can open honest operations state", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /Owner/ }).click();
  await expect(page).toHaveURL(/\/operations$/);
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
  await expect(page.getByText("qBittorrent is not connected")).toBeVisible();
  await expect(page.getByText("Not connected").first()).toBeVisible();
});
