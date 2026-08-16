import { HardHat, LockKeyhole, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";

import { developmentSignIn } from "@/app/actions";
import { developmentAuthEnabled } from "@/server/auth/session";

export const metadata = { title: "Local sign in" };

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
  return (
    <div className="signin-wrap">
      <div className="signin-heading">
        <p className="eyebrow">Local development</p>
        <h1>Choose a view</h1>
        <p>
          Switch roles to verify Arrmate’s permission boundaries. This is not a
          production identity provider.
        </p>
      </div>
      {enabled ? (
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
      ) : (
        <div className="security-banner">
          <LockKeyhole size={20} />
          <div>
            <strong>Local sign-in is disabled</strong>
            <p>
              Configure a production identity provider before granting access.
            </p>
          </div>
        </div>
      )}
      <Link className="text-link" href="/">
        Continue as guest
      </Link>
    </div>
  );
}
