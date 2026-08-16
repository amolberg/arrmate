import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { z } from "zod";

import type { Role, Viewer } from "@/domain/auth";
import { roles } from "@/domain/auth";
import type { JellyseerrLogin } from "@/adapters/jellyseerr";
import { roleFromSeerrPermissions } from "@/domain/seerr-permissions";

import { sealSession, unsealSession } from "./session-crypto";

const DEV_COOKIE_NAME = "arrmate-dev-session";
const SESSION_COOKIE_NAME = "arrmate-session";
const SESSION_SECONDS = 60 * 60 * 12;

const providerSessionSchema = z.object({
  version: z.literal(1),
  provider: z.literal("jellyseerr"),
  user: z.object({
    id: z.number().int().positive(),
    displayName: z.string().min(1),
    permissions: z.number().int().nonnegative(),
    avatarPath: z.string().nullable(),
  }),
  upstreamCookie: z.string().startsWith("connect.sid="),
  jellyfin: z
    .object({
      token: z.string().min(1),
      userId: z.string().min(1),
      isAdministrator: z.boolean(),
    })
    .optional(),
  expiresAt: z.number().int().positive(),
});

export type ProviderSession = z.infer<typeof providerSessionSchema>;

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
  if (
    configured &&
    configured.length >= 32 &&
    !configured.startsWith("replace-with")
  ) {
    return configured;
  }
  if (process.env.NODE_ENV !== "production")
    return "arrmate-development-only-session-key";
  throw new Error("A strong AUTH_SECRET is required in production");
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
  const providerSession = await getProviderSession();
  if (providerSession) {
    return {
      id: `jellyseerr:${providerSession.user.id}`,
      name: providerSession.user.displayName,
      role: roleFromSeerrPermissions(providerSession.user.permissions),
    };
  }

  const token = (await cookies()).get(DEV_COOKIE_NAME)?.value;
  const role = token ? decode(token) : null;
  return developmentViewers[role ?? "guest"];
}

export async function getProviderSession(): Promise<ProviderSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const parsed = providerSessionSchema.safeParse(unsealSession(token, key()));
  if (!parsed.success || parsed.data.expiresAt <= Date.now()) return null;
  return parsed.data;
}

export async function setProviderSession(
  login: JellyseerrLogin,
  jellyfin?: { token: string; userId: string; isAdministrator: boolean },
): Promise<void> {
  const expiresAt = Date.now() + SESSION_SECONDS * 1_000;
  const value: ProviderSession = {
    version: 1,
    provider: "jellyseerr",
    user: login.user,
    upstreamCookie: login.sessionCookie,
    jellyfin,
    expiresAt,
  };
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sealSession(value, key()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
    priority: "high",
  });
  cookieStore.delete(DEV_COOKIE_NAME);
}

export async function setDevelopmentViewer(role: Role): Promise<void> {
  if (!developmentAuthEnabled())
    throw new Error("Development sign-in is disabled");
  const cookieStore = await cookies();
  cookieStore.set(DEV_COOKIE_NAME, encode(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function clearSessions(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_COOKIE_NAME);
  cookieStore.delete(SESSION_COOKIE_NAME);
}
