"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { Role } from "@/domain/auth";
import { authorize, roles } from "@/domain/auth";
import type { DiscoveryMediaType } from "@/domain/discovery";
import { canRequestThroughSeerr } from "@/domain/seerr-permissions";
import {
  clearSessions,
  developmentAuthEnabled,
  getProviderSession,
  getViewer,
  setProviderSession,
  setDevelopmentViewer,
} from "@/server/auth/session";
import { jellyseerrFromEnvironment } from "@/server/integrations/jellyseerr";

export interface SignInState {
  error?: string;
}

const signInSchema = z.object({
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(512),
});

const requestSchema = z.object({
  mediaId: z.coerce.number().int().positive(),
  mediaType: z.enum(["movie", "series"]),
});

export async function jellyfinSignIn(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const input = signInSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!input.success)
    return { error: "Enter your Jellyfin username and password." };

  const adapter = jellyseerrFromEnvironment();
  if (!adapter)
    return { error: "Jellyseerr sign-in has not been configured yet." };
  const result = await adapter.login(input.data.username, input.data.password);
  if (!result.ok) return { error: result.error.message };
  await setProviderSession(result.data);
  redirect("/");
}

export async function developmentSignIn(formData: FormData) {
  if (!developmentAuthEnabled()) redirect("/sign-in?error=disabled");
  const role = formData.get("role");
  if (!roles.includes(role as Role)) redirect("/sign-in?error=role");
  await setDevelopmentViewer(role as Role);
  redirect(role === "owner" || role === "maintainer" ? "/operations" : "/");
}

export async function signOut() {
  const session = await getProviderSession();
  const adapter = jellyseerrFromEnvironment();
  if (session && adapter) await adapter.logout(session.upstreamCookie);
  await clearSessions();
  redirect("/");
}

export async function createMediaRequest(formData: FormData) {
  const input = requestSchema.safeParse({
    mediaId: formData.get("mediaId"),
    mediaType: formData.get("mediaType"),
  });
  if (!input.success) redirect("/discover?request=invalid");

  const viewer = await getViewer();
  authorize(viewer, "request:create");
  const session = await getProviderSession();
  if (!session) redirect("/sign-in");
  if (
    !canRequestThroughSeerr(
      session.user.permissions,
      input.data.mediaType as DiscoveryMediaType,
    )
  ) {
    redirect("/discover?request=forbidden");
  }

  const adapter = jellyseerrFromEnvironment();
  if (!adapter) redirect("/discover?request=unavailable");
  const result = await adapter.createRequest(
    input.data.mediaId,
    input.data.mediaType,
    session.upstreamCookie,
  );
  redirect(
    `/discover?request=${result.ok ? result.data.status : result.error.code}`,
  );
}
