export const roles = ["owner", "maintainer", "requester", "guest"] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "dashboard:view",
  "operations:view",
  "discovery:search",
  "request:create",
  "request:view-own",
  "download:manage",
  "media:delete",
  "media:replace",
  "subtitle:search",
  "integration:manage",
  "user:manage",
  "quota:manage",
  "audit:view",
  "security:manage",
] as const;

export type Permission = (typeof permissions)[number];

export interface Viewer {
  id: string;
  name: string;
  role: Role;
}

const everyPermission = new Set<Permission>(permissions);

const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  owner: everyPermission,
  maintainer: new Set([
    "dashboard:view",
    "operations:view",
    "discovery:search",
    "request:create",
    "request:view-own",
    "download:manage",
    "media:delete",
    "media:replace",
    "subtitle:search",
    "audit:view",
  ]),
  requester: new Set([
    "dashboard:view",
    "discovery:search",
    "request:create",
    "request:view-own",
    "subtitle:search",
  ]),
  guest: new Set([
    "dashboard:view",
    "discovery:search",
    "request:create",
    "request:view-own",
  ]),
};

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";

  constructor(permission: Permission) {
    super(`Permission required: ${permission}`);
    this.name = "AuthorizationError";
  }
}

export function can(viewer: Viewer, permission: Permission): boolean {
  return rolePermissions[viewer.role].has(permission);
}

export function authorize(viewer: Viewer, permission: Permission): void {
  if (!can(viewer, permission)) {
    throw new AuthorizationError(permission);
  }
}
