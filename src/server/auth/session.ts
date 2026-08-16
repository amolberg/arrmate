import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import type { Role, Viewer } from "@/domain/auth";
import { roles } from "@/domain/auth";

const COOKIE_NAME = "arrmate-dev-session";

const developmentViewers: Record<Role, Viewer> = {
  owner: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Zeb",
    role: "owner",
  },
  maintainer: {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Media maintainer",
    role: "maintainer",
  },
  requester: {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Friend account",
    role: "requester",
  },
  guest: {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Guest",
    role: "guest",
  },
};

function key(): string {
  const configured = process.env.AUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production")
    return "arrmate-development-only-session-key";
  throw new Error("AUTH_SECRET is required in production");
}

function signature(payload: string): string {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

function encode(role: Role): string {
  const payload = Buffer.from(JSON.stringify({ role, version: 1 })).toString(
    "base64url",
  );
  return `${payload}.${signature(payload)}`;
}

function decode(token: string): Role | null {
  const [payload, provided] = token.split(".");
  if (!payload || !provided) return null;
  const expected = signature(payload);
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (
    expectedBytes.length !== providedBytes.length ||
    !timingSafeEqual(expectedBytes, providedBytes)
  ) {
    return null;
  }
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      role?: unknown;
    };
    return roles.includes(value.role as Role) ? (value.role as Role) : null;
  } catch {
    return null;
  }
}

export function developmentAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ARRMATE_ENABLE_DEV_AUTH === "true"
  );
}

export async function getViewer(): Promise<Viewer> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const role = token ? decode(token) : null;
  return developmentViewers[role ?? "guest"];
}

export async function setDevelopmentViewer(role: Role): Promise<void> {
  if (!developmentAuthEnabled())
    throw new Error("Development sign-in is disabled");
  (await cookies()).set(COOKIE_NAME, encode(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearDevelopmentViewer(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
