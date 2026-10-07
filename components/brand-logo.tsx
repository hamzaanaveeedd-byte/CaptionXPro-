import Link from "next/link";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className = "" }: BrandLogoProps) {
  return (
    <Link href="/" className={`captionx-brand ${compact ? "compact" : ""} ${className}`.trim()} aria-label="Captionx home">
      <img
        src="/captionx-wordmark.png"
        alt="Captionx"
        width={760}
        height={220}
        className="captionx-brand-image"
        loading="eager"
        decoding="sync"
      />
    </Link>
  );
}

// Backward-compatible export for older V2.5 toolbar builds.
// This lets both `BrandLogo` and the earlier `CaptionxLogo` import compile safely.
export const CaptionxLogo = BrandLogo;
