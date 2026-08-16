import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";

import { sealSession, unsealSession } from "./session-crypto";

const SETUP_COOKIE_NAME = "arrmate-setup-session";
const SETUP_SECONDS = 60 * 30;

const setupSessionSchema = z.object({
  version: z.literal(1),
  jellyseerrUrl: z.string().url(),
  jellyfinToken: z.string().min(1),
  jellyfinUserId: z.string().min(1),
  isAdministrator: z.boolean(),
  displayName: z.string().min(1),
  expiresAt: z.number().int().positive(),
});

export type SetupSession = z.infer<typeof setupSessionSchema>;

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

export async function readSetupSession(): Promise<SetupSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SETUP_COOKIE_NAME)?.value;
  if (!token) return null;
  const parsed = setupSessionSchema.safeParse(unsealSession(token, key()));
  if (!parsed.success || parsed.data.expiresAt <= Date.now()) return null;
  return parsed.data;
}

export async function writeSetupSession(session: SetupSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SETUP_COOKIE_NAME, sealSession(session, key()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SETUP_SECONDS,
  });
}

export async function clearSetupSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SETUP_COOKIE_NAME);
}
