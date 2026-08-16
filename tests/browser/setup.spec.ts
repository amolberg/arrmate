import { expect, test } from "@playwright/test";

test("setup renders a first-run wizard with Jellyseerr + Jellyfin inputs", async ({
  page,
}) => {
  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { name: "Connect Arrmate to your stack." }),
  ).toBeVisible();
  await expect(page.getByLabel("Jellyseerr URL")).toBeVisible();
  await expect(page.getByLabel("Jellyfin URL")).toBeVisible();
  await expect(page.getByLabel("Jellyfin username")).toBeVisible();
  await expect(page.getByLabel("Jellyfin password")).toBeVisible();
  await expect(page.getByLabel("Type CONTINUE")).toBeVisible();
});

test("setup admin step renders extra service fields when admin signs in", async ({
  page,
}) => {
  await page.goto("/setup");
  await page
    .getByLabel("Jellyseerr URL")
    .fill("https://jellyseer.molberg.cloud");
  await page.getByLabel("Jellyfin URL").fill("https://jellyfin.molberg.cloud");
  await page.getByLabel("Jellyfin username").fill("testadmin");
  await page.getByLabel("Jellyfin password").fill("testadmin123");
  await page.getByLabel("Type CONTINUE").fill("CONTINUE");
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(
    page.getByRole("heading", { name: "Connect your services." }),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByLabel("Radarr URL")).toBeVisible();
  await expect(page.getByLabel("Sonarr URL")).toBeVisible();
  await expect(page.getByLabel("Bazarr URL")).toBeVisible();
  await expect(page.getByLabel("qBittorrent URL")).toBeVisible();
});

test("admin detects a failing Radarr API key without persisting harm", async ({
  page,
}) => {
  await page.goto("/setup");
  await page
    .getByLabel("Jellyseerr URL")
    .fill("https://jellyseer.molberg.cloud");
  await page.getByLabel("Jellyfin URL").fill("https://jellyfin.molberg.cloud");
  await page.getByLabel("Jellyfin username").fill("testadmin");
  await page.getByLabel("Jellyfin password").fill("testadmin123");
  await page.getByLabel("Type CONTINUE").fill("CONTINUE");
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(
    page.getByRole("heading", { name: "Connect your services." }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Radarr URL").fill("https://radarr.molberg.cloud");
  await page.getByLabel("Radarr API key").fill("definitely-not-the-key");
  await page.getByLabel("Type CONNECT SERVICES").fill("CONNECT SERVICES");
  await page.getByRole("button", { name: /Connect services/i }).click();
  await expect(page.getByText(/Radarr rejected its API key/)).toBeVisible({
    timeout: 15_000,
  });
});

test("setup submits valid Radarr + Sonarr keys and finishes", async ({
  page,
}) => {
  await page.goto("/setup");
  await page
    .getByLabel("Jellyseerr URL")
    .fill("https://jellyseer.molberg.cloud");
  await page.getByLabel("Jellyfin URL").fill("https://jellyfin.molberg.cloud");
  await page.getByLabel("Jellyfin username").fill("testadmin");
  await page.getByLabel("Jellyfin password").fill("testadmin123");
  await page.getByLabel("Type CONTINUE").fill("CONTINUE");
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(
    page.getByRole("heading", { name: "Connect your services." }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Radarr URL").fill("https://radarr.molberg.cloud");
  await page
    .getByLabel("Radarr API key")
    .fill("0e311e730d3846caaefbb1e0b578bdfa");
  await page.getByLabel("Sonarr URL").fill("https://sonarr.molberg.cloud");
  await page
    .getByLabel("Sonarr API key")
    .fill("be5ade681b3242eb929d2eb2f8d1d11c");
  await page.getByLabel("Bazarr URL").fill("https://bazarr.molberg.cloud");
  await page
    .getByLabel("Bazarr API key")
    .fill("c7078243b7117e71b1d4e467fa159e88");
  await page
    .getByLabel("qBittorrent URL")
    .fill("https://qbittorrent.molberg.cloud");
  await page.getByLabel("qBittorrent username").fill("admin");
  await page.getByLabel("qBittorrent password").fill("Herax420!!");
  await page.getByLabel("Type CONNECT SERVICES").fill("CONNECT SERVICES");
  await page.getByRole("button", { name: /Connect services/i }).click();
  await expect(
    page.getByRole("heading", { name: "Arrmate is ready to use." }),
  ).toBeVisible({ timeout: 30_000 });
});
