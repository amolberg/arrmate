import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="Arrmate home">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {!compact && (
        <span className="brand-wordmark">
          Arr<span>mate</span>
        </span>
      )}
    </Link>
  );
}
