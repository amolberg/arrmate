import "server-only";

import { JellyfinAdapter } from "@/adapters/jellyfin";
import { configuredServices } from "@/server/config-store";

export function jellyfinFromEnvironment(): JellyfinAdapter | null {
  const baseUrl = configuredServices()?.jellyfinUrl ?? process.env.JELLYFIN_URL;
  return baseUrl
    ? new JellyfinAdapter({
        baseUrl,
        timeoutMs: Number(process.env.INTEGRATION_REQUEST_TIMEOUT_MS) || 8_000,
      })
    : null;
}
