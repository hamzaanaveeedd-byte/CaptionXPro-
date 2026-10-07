import { CAPTIONXPRO_LOGO_FILE } from "@/lib/brand";

export function CaptionXProLogo({ compact = false }: { compact?: boolean }) {
  return (
    <img
      src={CAPTIONXPRO_LOGO_FILE}
      alt="CaptionX Pro"
      className={compact ? "captionxpro-logo compact" : "captionxpro-logo"}
    />
  );
}
