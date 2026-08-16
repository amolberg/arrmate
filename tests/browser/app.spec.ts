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

test("sign-in uses Jellyfin identity and is honest when unconfigured", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await expect(
    page.getByRole("heading", { name: "Welcome to Arrmate." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Arrmate home" }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Jellyfin username")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in with Jellyfin" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /The server owner still needs to configure Jellyseerr\.|Arrmate exchanges these credentials once/,
    ),
  ).toBeVisible();
});

test("local owner session can open honest operations state", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /Owner/ }).click();
  await expect(page).toHaveURL(/\/operations$/);
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
  await expect(
    page.getByText(
      /qBittorrent is not connected|Queue is clear|Live adapter data/,
    ),
  ).toBeVisible();
  await expect(page.getByText("Not connected").first()).toBeVisible();
  await expect(page.getByText("Jellyseerr", { exact: true })).toBeVisible();
  await expect(page.getByText("Lidarr", { exact: true })).toBeVisible();
});

test("media details stay honest when discovery is disconnected", async ({
  page,
}) => {
  await page.goto("/discover/movie/42");
  await expect(
    page.getByRole("heading", {
      name: /Discovery isn’t connected|Sign in to view details/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Back to results/ }),
  ).toBeVisible();
});

test("activity stays honest when request history is disconnected", async ({
  page,
}) => {
  await page.goto("/activity");
  await expect(
    page.getByRole("heading", {
      name: /Activity isn’t connected|Sign in to see activity/,
    }),
  ).toBeVisible();
});
