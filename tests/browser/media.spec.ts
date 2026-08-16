import { expect, test } from "@playwright/test";

test("operations view links to the media library", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /Owner/ }).click();
  await expect(page).toHaveURL(/\/operations$/);
  await page.goto("/media");
  await expect(page.getByRole("heading", { name: "Media" })).toBeVisible();
  await expect(page.getByText("Series", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Movies", { exact: true }).first()).toBeVisible();
});

test("media tab can switch between series and movies", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /Owner/ }).click();
  await expect(page).toHaveURL(/\/operations/);
  await page.goto("/media");
  await expect(page.getByRole("heading", { name: "Media" })).toBeVisible();
  await page
    .getByRole("link", { name: /^Movies/ })
    .first()
    .click();
  await expect(page).toHaveURL(/tab=movies/);
  await page
    .getByRole("link", { name: /^Series/ })
    .first()
    .click();
  await expect(page).toHaveURL(/tab=series/);
});

test("operations view shows live transfer stats", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /Owner/ }).click();
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
  await expect(page.getByText("Past day")).toBeVisible();
  await expect(page.getByText("Past week")).toBeVisible();
  await expect(page.getByText("Past month")).toBeVisible();
  await expect(page.getByText("Past year")).toBeVisible();
});
