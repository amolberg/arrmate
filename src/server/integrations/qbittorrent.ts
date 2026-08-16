import "server-only";

import { QbittorrentAdapter } from "@/adapters/qbittorrent";

export function qBittorrentFromEnvironment(): QbittorrentAdapter | null {
  const { QBITTORRENT_URL, QBITTORRENT_USERNAME, QBITTORRENT_PASSWORD } =
    process.env;
  if (!QBITTORRENT_URL || !QBITTORRENT_USERNAME || !QBITTORRENT_PASSWORD)
    return null;
  if (
    [QBITTORRENT_USERNAME, QBITTORRENT_PASSWORD].some(
      (value) => value === "replace-me",
    )
  ) {
    return null;
  }
  const parsedTimeout = Number(process.env.INTEGRATION_REQUEST_TIMEOUT_MS);
  return new QbittorrentAdapter({
    baseUrl: QBITTORRENT_URL,
    username: QBITTORRENT_USERNAME,
    password: QBITTORRENT_PASSWORD,
    timeoutMs:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : 8_000,
  });
}
