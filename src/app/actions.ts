"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { Role } from "@/domain/auth";
import { authorize, can, roles } from "@/domain/auth";
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
import {
  clearSetupSession,
  readSetupSession,
  writeSetupSession,
} from "@/server/auth/setup-session";
import { JellyseerrAdapter } from "@/adapters/jellyseerr";
import { ArrAdapter } from "@/adapters/arr";
import { BazarrAdapter } from "@/adapters/bazarr";
import { QbittorrentAdapter } from "@/adapters/qbittorrent";
import { JellyfinAdapter } from "@/adapters/jellyfin";
import { configuredServices, saveManagedServices } from "@/server/config-store";
import { jellyseerrFromEnvironment } from "@/server/integrations/jellyseerr";
import { jellyfinFromEnvironment } from "@/server/integrations/jellyfin";
import { bazarrFromEnvironment } from "@/server/integrations/bazarr";
import { getSonarrAdapter, getRadarrAdapter } from "@/server/media";
import { assertAuditAvailable, recordSystemAudit } from "@/db/audit-store";

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
  seasons: z.array(z.coerce.number().int().positive()).max(100).optional(),
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
  const jellyfin = jellyfinFromEnvironment();
  const jellyfinResult = jellyfin
    ? await jellyfin.login(input.data.username, input.data.password)
    : null;
  await setProviderSession(
    result.data,
    jellyfinResult?.ok ? jellyfinResult.data : undefined,
  );
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
    seasons: formData.getAll("seasons"),
  });
  const fallback = "/discover?request=invalid";
  if (!input.success) redirect(fallback);

  const returnPath = `/discover/${input.data.mediaType}/${input.data.mediaId}`;
  if (input.data.mediaType === "series" && !input.data.seasons?.length) {
    redirect(`${returnPath}?request=seasons`);
  }

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
    redirect(`${returnPath}?request=forbidden`);
  }

  const adapter = jellyseerrFromEnvironment();
  if (!adapter) redirect(`${returnPath}?request=unavailable`);
  const result = await adapter.createRequest(
    input.data.mediaId,
    input.data.mediaType,
    session.upstreamCookie,
    input.data.seasons,
  );
  redirect(
    `${returnPath}?request=${result.ok ? result.data.status : result.error.code}`,
  );
}

const newUserSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(12).max(256),
  confirmation: z.literal("CREATE USER"),
});

const resetPasswordSchema = z.object({
  userId: z.string().min(1).max(128),
  password: z.string().min(12).max(256),
  confirmation: z.literal("RESET PASSWORD"),
});

async function jellyfinAdminSession() {
  const session = await getProviderSession();
  if (!session?.jellyfin?.isAdministrator) return null;
  const adapter = jellyfinFromEnvironment();
  return adapter ? { session, adapter } : null;
}

export async function createJellyfinUser(formData: FormData) {
  const input = newUserSchema.safeParse({
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!input.success) redirect("/settings/people?mutation=invalid");
  const context = await jellyfinAdminSession();
  if (!context) redirect("/settings/people?mutation=forbidden");
  try {
    await assertAuditAvailable();
  } catch {
    redirect("/settings/people?mutation=audit-unavailable");
  }
  const created = await context.adapter.createUser(
    context.session.jellyfin!.token,
    input.data.displayName,
  );
  if (!created.ok) redirect(`/settings/people?mutation=${created.error.code}`);
  const password = await context.adapter.setPassword(
    context.session.jellyfin!.token,
    created.data.id,
    input.data.password,
  );
  if (!password.ok)
    redirect(`/settings/people?mutation=${password.error.code}`);
  try {
    await recordSystemAudit({
      action: "jellyfin.user.create",
      targetType: "jellyfin-user",
      targetId: created.data.id,
      outcome: "success",
      metadata: { displayName: created.data.displayName },
    });
  } catch {
    redirect("/settings/people?mutation=audit-unavailable");
  }
  redirect(
    `/settings/people?user=${encodeURIComponent(created.data.id)}&mutation=created`,
  );
}

export async function resetJellyfinPassword(formData: FormData) {
  const input = resetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!input.success) redirect("/settings/people?mutation=invalid");
  const context = await jellyfinAdminSession();
  if (!context) redirect("/settings/people?mutation=forbidden");
  try {
    await assertAuditAvailable();
  } catch {
    redirect(
      `/settings/people?user=${encodeURIComponent(input.data.userId)}&mutation=audit-unavailable`,
    );
  }
  const result = await context.adapter.setPassword(
    context.session.jellyfin!.token,
    input.data.userId,
    input.data.password,
  );
  if (!result.ok)
    redirect(
      `/settings/people?user=${encodeURIComponent(input.data.userId)}&mutation=${result.error.code}`,
    );
  try {
    await recordSystemAudit({
      action: "jellyfin.user.password_reset",
      targetType: "jellyfin-user",
      targetId: input.data.userId,
      outcome: "success",
    });
  } catch {
    redirect(
      `/settings/people?user=${encodeURIComponent(input.data.userId)}&mutation=audit-unavailable`,
    );
  }
  redirect(
    `/settings/people?user=${encodeURIComponent(input.data.userId)}&mutation=password-reset`,
  );
}

const setupStepOneSchema = z.object({
  jellyseerrUrl: z.string().url(),
  jellyfinUrl: z.string().url(),
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(512),
  confirmation: z.literal("CONTINUE"),
});

export async function completeJellyseerrSetup(formData: FormData) {
  const parsed = setupStepOneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/setup?error=invalid");
  const { jellyseerrUrl, jellyfinUrl, username, password } = parsed.data;

  const seerr = new JellyseerrAdapter({ baseUrl: jellyseerrUrl });
  const login = await seerr.login(username, password);
  if (!login.ok) redirect(`/setup?error=${login.error.code}`);

  const jellyfin = new JellyfinAdapter({ baseUrl: jellyfinUrl });
  const jellyfinLogin = await jellyfin.login(username, password);
  if (!jellyfinLogin.ok)
    redirect(`/setup?error=jellyfin-${jellyfinLogin.error.code}`);

  const expiresAt = Date.now() + 30 * 60 * 1000;
  await writeSetupSession({
    version: 1,
    jellyseerrUrl,
    jellyfinUserId: jellyfinLogin.data.userId,
    jellyfinToken: jellyfinLogin.data.token,
    isAdministrator: jellyfinLogin.data.isAdministrator,
    displayName: jellyfinLogin.data.displayName,
    expiresAt,
  });

  // Persist Jellyseerr + Jellyfin URLs right away so request flow works,
  // and we re-test the Jellyseerr URL by saving what we just verified.
  const existing = configuredServices();
  await saveManagedServices({
    ...(existing ?? {}),
    jellyseerrUrl,
    jellyfinUrl,
  });

  redirect(
    jellyfinLogin.data.isAdministrator
      ? "/setup?step=admin"
      : "/setup?step=ready",
  );
}

const setupStepTwoSchema = z.object({
  confirmation: z.literal("CONNECT SERVICES"),
  radarrUrl: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  radarrApiKey: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  sonarrUrl: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  sonarrApiKey: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  bazarrUrl: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  bazarrApiKey: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  qbittorrentUrl: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  qbittorrentUsername: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  qbittorrentPassword: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export async function completeServicesSetup(formData: FormData) {
  const setup = await readSetupSession();
  if (!setup) redirect("/setup?error=session-expired");
  if (!setup.isAdministrator) redirect("/setup?step=ready");

  const parsed = setupStepTwoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/setup?step=admin&error=invalid");

  const data = parsed.data;
  const baseUrl = setup.jellyseerrUrl;
  const verified = configuredServices() ?? { jellyseerrUrl: baseUrl };

  if (data.radarrUrl || data.radarrApiKey) {
    if (!data.radarrUrl || !data.radarrApiKey)
      redirect("/setup?step=admin&error=radarr-partial");
    const adapter = new ArrAdapter({
      baseUrl: data.radarrUrl,
      apiKey: data.radarrApiKey,
      serviceName: "Radarr",
    });
    const health = await adapter.health();
    if (!health.ok)
      redirect(`/setup?step=admin&error=radarr-${health.error.code}`);
    verified.radarrUrl = data.radarrUrl;
    verified.radarrApiKey = data.radarrApiKey;
  }

  if (data.sonarrUrl || data.sonarrApiKey) {
    if (!data.sonarrUrl || !data.sonarrApiKey)
      redirect("/setup?step=admin&error=sonarr-partial");
    const adapter = new ArrAdapter({
      baseUrl: data.sonarrUrl,
      apiKey: data.sonarrApiKey,
      serviceName: "Sonarr",
    });
    const health = await adapter.health();
    if (!health.ok)
      redirect(`/setup?step=admin&error=sonarr-${health.error.code}`);
    verified.sonarrUrl = data.sonarrUrl;
    verified.sonarrApiKey = data.sonarrApiKey;
  }

  if (data.bazarrUrl || data.bazarrApiKey) {
    if (!data.bazarrUrl || !data.bazarrApiKey)
      redirect("/setup?step=admin&error=bazarr-partial");
    const adapter = new BazarrAdapter({
      baseUrl: data.bazarrUrl,
      apiKey: data.bazarrApiKey,
    });
    const health = await adapter.health();
    if (!health.ok)
      redirect(`/setup?step=admin&error=bazarr-${health.error.code}`);
    verified.bazarrUrl = data.bazarrUrl;
    verified.bazarrApiKey = data.bazarrApiKey;
  }

  if (
    data.qbittorrentUrl ||
    data.qbittorrentUsername ||
    data.qbittorrentPassword
  ) {
    if (
      !data.qbittorrentUrl ||
      !data.qbittorrentUsername ||
      !data.qbittorrentPassword
    ) {
      redirect("/setup?step=admin&error=qbit-partial");
    }
    const adapter = new QbittorrentAdapter({
      baseUrl: data.qbittorrentUrl,
      username: data.qbittorrentUsername,
      password: data.qbittorrentPassword,
    });
    const health = await adapter.health();
    if (!health.ok)
      redirect(`/setup?step=admin&error=qbit-${health.error.code}`);
    verified.qbittorrentUrl = data.qbittorrentUrl;
    verified.qbittorrentUsername = data.qbittorrentUsername;
    verified.qbittorrentPassword = data.qbittorrentPassword;
  }

  await saveManagedServices(verified);
  await clearSetupSession();
  redirect("/setup?step=ready");
}

export async function skipServicesSetup() {
  await clearSetupSession();
  redirect("/setup?step=ready");
}

const releaseSearchSchema = z.object({
  guid: z.string().min(1).max(2048),
  indexerId: z.coerce.number().int().positive(),
  downloadUrl: z.string().optional(),
  mediaKind: z.enum(["series", "movie"]),
  mediaId: z.coerce.number().int().positive(),
  returnTo: z.string().min(1),
});

export async function grabRelease(formData: FormData) {
  const viewer = await getViewer();
  if (!can(viewer, "operations:view")) redirect("/sign-in");
  const input = releaseSearchSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) {
    redirect(`/media?error=invalid`);
  }
  const adapter =
    input.data.mediaKind === "series" ? getSonarrAdapter() : getRadarrAdapter();
  if (!adapter) redirect(`/media?error=not-connected`);
  const result = await adapter.captureRelease(
    input.data.guid,
    input.data.indexerId,
    input.data.downloadUrl ?? null,
  );
  if (!result.ok) {
    redirect(`${input.data.returnTo}&grab=${result.error.code}`);
  }
  try {
    await recordSystemAudit({
      action: `${input.data.mediaKind}.release.grab`,
      targetType: `${input.data.mediaKind}-release`,
      targetId: input.data.guid,
      outcome: "success",
      metadata: {
        mediaId: input.data.mediaId,
        indexerId: input.data.indexerId,
      },
    });
  } catch {
    // Audit store not available; continue.
  }
  redirect(`${input.data.returnTo}&grab=accepted`);
}

const releaseBlocklistSchema = z.object({
  guid: z.string().min(1).max(2048),
  mediaKind: z.enum(["series", "movie"]),
  mediaId: z.coerce.number().int().positive(),
  returnTo: z.string().min(1),
});

export async function blocklistRelease(formData: FormData) {
  const viewer = await getViewer();
  if (!can(viewer, "operations:view")) redirect("/sign-in");
  const input = releaseBlocklistSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) redirect(`/media?error=invalid`);
  const adapter =
    input.data.mediaKind === "series" ? getSonarrAdapter() : getRadarrAdapter();
  if (!adapter) redirect(`/media?error=not-connected`);
  const result = await adapter.blocklistRelease(input.data.guid);
  if (!result.ok) {
    redirect(`${input.data.returnTo}&block=${result.error.code}`);
  }
  try {
    await recordSystemAudit({
      action: `${input.data.mediaKind}.release.blocklist`,
      targetType: `${input.data.mediaKind}-release`,
      targetId: input.data.guid,
      outcome: "success",
      metadata: { mediaId: input.data.mediaId },
    });
  } catch {
    // Audit store not available.
  }
  redirect(`${input.data.returnTo}&block=accepted`);
}

const deleteMediaSchema = z.object({
  mediaKind: z.enum(["series", "movie"]),
  mediaId: z.coerce.number().int().positive(),
  fileId: z.string().min(1),
  confirmation: z.literal("DELETE FILE"),
  returnTo: z.string().min(1),
});

export async function deleteMediaFile(formData: FormData) {
  const viewer = await getViewer();
  if (!can(viewer, "operations:view")) redirect("/sign-in");
  const input = deleteMediaSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) redirect(`/media?error=invalid`);
  const adapter =
    input.data.mediaKind === "series" ? getSonarrAdapter() : getRadarrAdapter();
  if (!adapter) redirect(`/media?error=not-connected`);
  const fileId = Number(input.data.fileId);
  if (!Number.isSafeInteger(fileId) || fileId <= 0)
    redirect(`/media?error=invalid-file-id`);
  const result =
    input.data.mediaKind === "series"
      ? await adapter.deleteEpisodeFile(fileId)
      : await adapter.deleteMovieFile(fileId);
  if (!result.ok) {
    redirect(`${input.data.returnTo}&delete=${result.error.code}`);
  }
  try {
    await recordSystemAudit({
      action: `${input.data.mediaKind}.file.delete`,
      targetType: `${input.data.mediaKind}-file`,
      targetId: String(fileId),
      outcome: "success",
      metadata: { mediaId: input.data.mediaId },
    });
  } catch {
    // Audit store not available.
  }
  redirect(`${input.data.returnTo}&delete=accepted`);
}

const downloadSubtitleSchema = z.object({
  mediaKind: z.enum(["series", "movie"]),
  radarrId: z.coerce.number().int().optional(),
  seriesId: z.coerce.number().int().optional(),
  episodeId: z.coerce.number().int().optional(),
  provider: z.string().min(1),
  subtitle: z.string().min(1),
  hi: z.string().optional(),
  forced: z.string().optional(),
  returnTo: z.string().min(1),
});

export async function downloadSubtitle(formData: FormData) {
  const viewer = await getViewer();
  if (!can(viewer, "operations:view")) redirect("/sign-in");
  const input = downloadSubtitleSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) redirect(`/media?error=invalid`);
  const bazarr = bazarrFromEnvironment();
  if (!bazarr) redirect(`/media?error=bazarr-not-connected`);
  const hi = input.data.hi === "true";
  const forced = input.data.forced === "true";
  const result =
    input.data.mediaKind === "series"
      ? await bazarr.downloadEpisodeSubtitle({
          seriesId: input.data.seriesId!,
          episodeId: input.data.episodeId!,
          provider: input.data.provider,
          subtitle: input.data.subtitle,
          hi,
          forced,
        })
      : await bazarr.downloadMovieSubtitle({
          radarrId: input.data.radarrId!,
          provider: input.data.provider,
          subtitle: input.data.subtitle,
          hi,
          forced,
        });
  if (!result.ok) {
    redirect(`${input.data.returnTo}&subtitle=${result.error.code}`);
  }
  redirect(`${input.data.returnTo}&subtitle=accepted`);
}

const deleteSubtitleSchema = z.object({
  mediaKind: z.enum(["series", "movie"]),
  seriesId: z.string().optional(),
  episodeId: z.string().optional(),
  radarrId: z.string().optional(),
  language: z.string().min(1),
  forced: z.string().optional(),
  hi: z.string().optional(),
  path: z.string().min(1),
  returnTo: z.string().min(1),
});

export async function deleteSubtitle(formData: FormData) {
  const viewer = await getViewer();
  if (!can(viewer, "operations:view")) redirect("/sign-in");
  const input = deleteSubtitleSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) redirect(`/media?error=invalid`);
  const bazarr = bazarrFromEnvironment();
  if (!bazarr) redirect(`/media?error=bazarr-not-connected`);
  const forced = input.data.forced === "true";
  const hi = input.data.hi === "true";
  const result =
    input.data.mediaKind === "series"
      ? await bazarr.deleteEpisodeSubtitle({
          seriesId: Number(input.data.seriesId),
          episodeId: Number(input.data.episodeId),
          language: input.data.language,
          forced,
          hi,
          path: input.data.path,
        })
      : await bazarr.deleteMovieSubtitle({
          radarrId: Number(input.data.radarrId),
          language: input.data.language,
          forced,
          hi,
          path: input.data.path,
        });
  if (!result.ok) {
    redirect(`${input.data.returnTo}&delete-subtitle=${result.error.code}`);
  }
  redirect(`${input.data.returnTo}&delete-subtitle=accepted`);
}
