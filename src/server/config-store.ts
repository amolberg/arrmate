import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { sealSession, unsealSession } from "./auth/session-crypto";

export interface ManagedServices {
  jellyseerrUrl: string;
  radarrUrl?: string;
  radarrApiKey?: string;
  sonarrUrl?: string;
  sonarrApiKey?: string;
  bazarrUrl?: string;
  bazarrApiKey?: string;
  qbittorrentUrl?: string;
  qbittorrentUsername?: string;
  qbittorrentPassword?: string;
  jellyfinUrl?: string;
}

const filePath = () =>
  path.join(process.cwd(), ".data", "managed-services.json");
let cached: ManagedServices | null | undefined;
function key() {
  const value = process.env.AUTH_SECRET;
  return value && value.length >= 32 && !value.startsWith("replace-with")
    ? value
    : "arrmate-development-only-session-key";
}

export async function loadManagedServices(): Promise<ManagedServices | null> {
  if (cached !== undefined) return cached;
  try {
    cached = unsealSession(
      await fs.readFile(filePath(), "utf8"),
      key(),
    ) as ManagedServices;
  } catch {
    cached = null;
  }
  return cached;
}
export function configuredServices(): ManagedServices | null {
  return cached ?? null;
}

export async function saveManagedServices(
  services: ManagedServices,
): Promise<void> {
  const target = filePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, sealSession(JSON.stringify(services), key()), {
    mode: 0o600,
  });
  cached = services;
}
