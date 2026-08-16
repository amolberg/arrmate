import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/app/actions";
import type { Viewer } from "@/domain/auth";
import { can } from "@/domain/auth";

import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({
  children,
  viewer,
}: {
  children: ReactNode;
  viewer: Viewer;
}) {
  const showOperations = can(viewer, "operations:view");
  const isGuest = viewer.role === "guest";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <p className="sidebar-label">Your media stack</p>
        <NavLinks showOperations={showOperations} desktop />
        <div className="sidebar-foot">
          <div className="privacy-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Private by design</span>
          </div>
          <div className="profile-block">
            <span className="avatar">{initials(viewer.name)}</span>
            <span className="profile-copy">
              <strong>{viewer.name}</strong>
              <small>{viewer.role}</small>
            </span>
            {!isGuest && (
              <form action={signOut}>
                <button
                  className="icon-button"
                  type="submit"
                  aria-label="Sign out"
                >
                  <LogOut size={17} />
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>

      <div className="app-column">
        <header className="mobile-header">
          <Brand />
          {isGuest ? (
            <Link className="small-button" href="/sign-in">
              Sign in
            </Link>
          ) : (
            <Link
              className="avatar avatar-link"
              href="/sign-in"
              aria-label="Switch local role"
            >
              {initials(viewer.name)}
            </Link>
          )}
        </header>
        <main className="page-content">{children}</main>
        <NavLinks showOperations={showOperations} />
      </div>
    </div>
  );
}
