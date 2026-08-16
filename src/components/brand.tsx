import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="Arrmate home">
      <Image
        className="brand-mark"
        src="/assets/arrmate-mark.svg"
        alt=""
        width={34}
        height={34}
        priority
      />
      {!compact && (
        <span className="brand-wordmark">
          Arr<span>mate</span>
        </span>
      )}
    </Link>
  );
}
