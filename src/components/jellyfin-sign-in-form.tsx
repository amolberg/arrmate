"use client";

import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { useActionState, useState } from "react";

import { jellyfinSignIn } from "@/app/actions";

export function JellyfinSignInForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(jellyfinSignIn, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="jellyfin-form" action={action}>
      <label className="field-label" htmlFor="username">
        Jellyfin username
      </label>
      <div className="input-shell">
        <UserRound size={18} aria-hidden="true" />
        <input
          id="username"
          name="username"
          autoComplete="username"
          required
          disabled={!configured || pending}
        />
      </div>
      <label className="field-label" htmlFor="password">
        Password
      </label>
      <div className="input-shell">
        <LockKeyhole size={18} aria-hidden="true" />
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          disabled={!configured || pending}
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          disabled={!configured || pending}
        >
          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {!configured && (
        <p className="form-error" role="status">
          The server owner still needs to configure Jellyseerr.
        </p>
      )}
      <button
        className="primary-button signin-button"
        type="submit"
        disabled={!configured || pending}
      >
        {pending ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <LockKeyhole size={17} />
        )}
        {pending ? "Signing in…" : "Sign in with Jellyfin"}
      </button>
      <p className="credential-note">
        Arrmate exchanges these credentials once. Your password is never stored.
      </p>
    </form>
  );
}
