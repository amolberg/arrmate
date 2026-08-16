import {
  ArrowRight,
  Clapperboard,
  Clock3,
  Film,
  Search,
  Sparkles,
  Tv,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { can } from "@/domain/auth";
import type { SeerrQuotaWindow } from "@/domain/discovery";
import { getProviderSession, getViewer } from "@/server/auth/session";
import { jellyseerrFromEnvironment } from "@/server/integrations/jellyseerr";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const viewer = await getViewer();
  const isOperator = can(viewer, "operations:view");
  const session = await getProviderSession();
  const adapter = jellyseerrFromEnvironment();
  const quotaResult =
    session && adapter
      ? await adapter.quota(session.user.id, session.upstreamCookie)
      : null;
  const quota = quotaResult?.ok ? quotaResult.data : null;

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">Sunday, 16 August</p>
          <h1>
            {viewer.role === "guest"
              ? "Find your next watch."
              : `Welcome back, ${viewer.name.split(" ")[0]}.`}
          </h1>
          <p className="page-lead">
            {isOperator
              ? "Your whole media stack, without the dashboard shuffle."
              : "Explore the library and request what should be added next."}
          </p>
        </div>
        {isOperator && (
          <Link className="text-link desktop-only" href="/operations">
            Open operations <ArrowRight size={16} />
          </Link>
        )}
      </section>

      <section className="discover-hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-art" aria-hidden="true">
          <span className="poster poster-one">
            <Film />
          </span>
          <span className="poster poster-two">
            <Tv />
          </span>
          <span className="poster poster-three">
            <Clapperboard />
          </span>
        </div>
        <div className="hero-copy">
          <span className="hero-kicker">
            <Sparkles size={14} /> One search. Every screen.
          </span>
          <h2>What should we watch next?</h2>
          <p>Search movies and series, then send a request in a few taps.</p>
          <Link className="primary-button" href="/discover">
            <Search size={17} /> Start exploring
          </Link>
        </div>
      </section>

      <section className="quota-grid" aria-label="Request allowance">
        <article className="quota-card">
          <span className="quota-icon coral">
            <Film size={19} />
          </span>
          <div>
            <span>Movie requests</span>
            <strong>{quota ? quotaValue(quota.movie) : "—"}</strong>
            <small>
              {quota ? quotaCaption(quota.movie) : "Sign in to see your limit"}
            </small>
          </div>
        </article>
        <article className="quota-card">
          <span className="quota-icon blue">
            <Tv size={19} />
          </span>
          <div>
            <span>Series requests</span>
            <strong>{quota ? quotaValue(quota.series) : "—"}</strong>
            <small>
              {quota ? quotaCaption(quota.series) : "Sign in to see your limit"}
            </small>
          </div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your queue</p>
            <h2>Recent requests</h2>
          </div>
          <Link className="text-link" href="/activity">
            View all <ArrowRight size={15} />
          </Link>
        </div>
        <div className="surface-card">
          <EmptyState
            icon={Clock3}
            title="Nothing waiting yet"
            description="Your requests and their progress will appear here once a request provider is connected."
            action={
              <Link className="secondary-button" href="/discover">
                Browse titles
              </Link>
            }
          />
        </div>
      </section>
    </div>
  );
}

function quotaValue(quota: SeerrQuotaWindow): string {
  return quota.limit ? String(quota.remaining ?? 0) : "∞";
}

function quotaCaption(quota: SeerrQuotaWindow): string {
  if (!quota.limit) return "No request limit";
  return `${quota.used} of ${quota.limit} used${quota.days ? ` · ${quota.days}d window` : ""}`;
}
