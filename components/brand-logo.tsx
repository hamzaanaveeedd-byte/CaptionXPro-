import { CaptionXProLogo } from "@/components/captionxpro-logo";

/**
 * Backward-compatible logo exports.
 * Keep these aliases so older CaptionX/CaptionX Pro files cannot break the build
 * if GitHub still contains a stale import during an incremental replacement.
 */
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <CaptionXProLogo compact={compact} />;
}

export const CaptionxLogo = BrandLogo;
export { CaptionXProLogo };
