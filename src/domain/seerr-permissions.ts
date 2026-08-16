import type { Role } from "./auth";
import type { DiscoveryMediaType } from "./discovery";

export const SeerrPermission = {
  ADMIN: 2,
  MANAGE_SETTINGS: 4,
  MANAGE_USERS: 8,
  MANAGE_REQUESTS: 16,
  REQUEST: 32,
  REQUEST_MOVIE: 262_144,
  REQUEST_TV: 524_288,
} as const;

export function hasSeerrPermission(value: number, permission: number): boolean {
  return Boolean(value & SeerrPermission.ADMIN) || Boolean(value & permission);
}

export function roleFromSeerrPermissions(permissions: number): Role {
  if (hasSeerrPermission(permissions, SeerrPermission.ADMIN)) return "owner";
  if (
    hasSeerrPermission(permissions, SeerrPermission.MANAGE_SETTINGS) ||
    hasSeerrPermission(permissions, SeerrPermission.MANAGE_USERS) ||
    hasSeerrPermission(permissions, SeerrPermission.MANAGE_REQUESTS)
  ) {
    return "maintainer";
  }
  return "requester";
}

export function canRequestThroughSeerr(
  permissions: number,
  mediaType: DiscoveryMediaType,
): boolean {
  return (
    hasSeerrPermission(permissions, SeerrPermission.REQUEST) ||
    hasSeerrPermission(
      permissions,
      mediaType === "movie"
        ? SeerrPermission.REQUEST_MOVIE
        : SeerrPermission.REQUEST_TV,
    )
  );
}
