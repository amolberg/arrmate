import "server-only";

import { JellyseerrAdapter } from "@/adapters/jellyseerr";
import { configuredServices } from "@/server/config-store";

export function jellyseerrFromEnvironment(): JellyseerrAdapter | null {
  const baseUrl = configuredServices()?.jellyseerrUrl ?? process.env.SEERR_URL;
  if (!baseUrl) return null;
  const parsedTimeout = Number(process.env.INTEGRATION_REQUEST_TIMEOUT_MS);
  return new JellyseerrAdapter({
    baseUrl,
    timeoutMs:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : 8_000,
  });
}
