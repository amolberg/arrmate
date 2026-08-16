import "server-only";

import { ArrAdapter } from "@/adapters/arr";
import { configuredServices } from "@/server/config-store";

export function arrFromEnvironment(
  kind: "sonarr" | "radarr",
): ArrAdapter | null {
  const prefix = kind.toUpperCase();
  const services = configuredServices();
  const baseUrl =
    services?.[kind === "sonarr" ? "sonarrUrl" : "radarrUrl"] ??
    process.env[`${prefix}_URL`];
  const apiKey =
    services?.[kind === "sonarr" ? "sonarrApiKey" : "radarrApiKey"] ??
    process.env[`${prefix}_API_KEY`];
  if (!baseUrl || !apiKey || apiKey === "replace-me") return null;
  const parsedTimeout = Number(process.env.INTEGRATION_REQUEST_TIMEOUT_MS);
  return new ArrAdapter({
    baseUrl,
    apiKey,
    serviceName: kind === "sonarr" ? "Sonarr" : "Radarr",
    timeoutMs:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : 8_000,
  });
}
