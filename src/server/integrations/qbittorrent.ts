import "server-only";

import { QbittorrentAdapter } from "@/adapters/qbittorrent";
import { configuredServices } from "@/server/config-store";

export function qBittorrentFromEnvironment(): QbittorrentAdapter | null {
  const services = configuredServices();
  const baseUrl = services?.qbittorrentUrl ?? process.env.QBITTORRENT_URL;
  const username =
    services?.qbittorrentUsername ?? process.env.QBITTORRENT_USERNAME;
  const password =
    services?.qbittorrentPassword ?? process.env.QBITTORRENT_PASSWORD;
  if (!baseUrl || !username || !password) return null;
  if ([username, password].some((value) => value === "replace-me")) return null;
  const parsedTimeout = Number(process.env.INTEGRATION_REQUEST_TIMEOUT_MS);
  return new QbittorrentAdapter({
    baseUrl,
    username,
    password,
    timeoutMs:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : 8_000,
  });
}
