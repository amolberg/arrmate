import { HardHat, LockKeyhole, UserRound, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { developmentSignIn } from "@/app/actions";
import { JellyfinSignInForm } from "@/components/jellyfin-sign-in-form";
import { developmentAuthEnabled } from "@/server/auth/session";
import { jellyseerrFromEnvironment } from "@/server/integrations/jellyseerr";

export const metadata = { title: "Sign in" };

const options = [
  {
    role: "owner",
    label: "Owner",
    copy: "Full setup, people, and operations access",
    icon: LockKeyhole,
  },
  {
    role: "maintainer",
    label: "Maintainer",
    copy: "Operate media without security settings",
    icon: HardHat,
  },
  {
    role: "requester",
    label: "Requester",
    copy: "Discover, request, and follow progress",
    icon: UserRound,
  },
  {
    role: "guest",
    label: "Guest",
    copy: "Preview the least-privileged public view",
    icon: UsersRound,
  },
];

export default function SignInPage() {
  const enabled = developmentAuthEnabled();
  const configured = jellyseerrFromEnvironment() !== null;
  return (
    <div className="signin-layout">
      <section className="signin-panel">
        <div className="signin-heading">
          <p className="eyebrow">One account. Your whole library.</p>
          <h1>Welcome to Arrmate.</h1>
          <p>Use the same credentials you already use to watch on Jellyfin.</p>
        </div>
        <JellyfinSignInForm configured={configured} />
        {!configured && (
          <Link className="text-link" href="/setup">
            Need to connect Arrmate first? Run setup
          </Link>
        )}
        <Link className="text-link" href="/">
          Continue as guest
        </Link>
      </section>
      <aside
        className="signin-art"
        aria-label="Arrmate media library illustration"
      >
        <Image
          src="/assets/arrmate-orbit.svg"
          alt=""
          fill
          priority
          sizes="(min-width: 900px) 50vw, 100vw"
        />
        <div className="signin-art-copy">
          <span>Private by design</span>
          <strong>Your media. Your rules. One beautifully calm place.</strong>
        </div>
      </aside>
      {enabled && (
        <details className="dev-access" open>
          <summary>Development role switcher</summary>
          <form className="role-grid" action={developmentSignIn}>
            {options.map(({ role, label, copy, icon: Icon }) => (
              <button
                type="submit"
                name="role"
                value={role}
                className="role-option"
                key={role}
              >
                <span className="role-icon">
                  <Icon size={20} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{copy}</small>
                </span>
              </button>
            ))}
          </form>
        </details>
      )}
    </div>
  );
}
