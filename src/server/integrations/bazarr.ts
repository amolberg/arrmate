import "server-only";
import { BazarrAdapter } from "@/adapters/bazarr";
import { configuredServices } from "@/server/config-store";
export function bazarrFromEnvironment(): BazarrAdapter | null {
  const services = configuredServices();
  const baseUrl = services?.bazarrUrl ?? process.env.BAZARR_URL;
  const apiKey = services?.bazarrApiKey ?? process.env.BAZARR_API_KEY;
  if (!baseUrl || !apiKey || apiKey === "replace-me") return null;
  return new BazarrAdapter({
    baseUrl,
    apiKey,
    timeoutMs: Number(process.env.INTEGRATION_REQUEST_TIMEOUT_MS) || 8_000,
  });
}
