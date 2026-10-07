export function CaptionXProLogo({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={compact ? "captionxpro-logo compact" : "captionxpro-logo"}
      viewBox="0 0 520 116"
      role="img"
      aria-label="CaptionX Pro"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" fillRule="evenodd">
        <path d="M86 25c-16-16-42-20-63-8C1 29-7 55 3 78c10 24 36 38 61 31 10-3 18-8 25-15L72 78c-4 4-9 7-15 9-13 4-27-2-34-13-7-11-6-26 3-36 10-11 27-14 40-6 3 2 6 4 8 7L86 25Z" fill="#F8FBFA"/>
        <rect x="28" y="48" width="9" height="26" rx="4.5" fill="#18E6B1"/>
        <rect x="43" y="36" width="10" height="50" rx="5" fill="#25D8E8"/>
        <rect x="59" y="48" width="9" height="26" rx="4.5" fill="#18E6B1"/>
        <text x="96" y="79" fill="#F8FBFA" fontFamily="Inter,Arial,sans-serif" fontSize="66" fontWeight="800" letterSpacing="-4">Caption</text>
        <text x="319" y="79" fill="#20E7B4" fontFamily="Inter,Arial,sans-serif" fontSize="66" fontWeight="800" letterSpacing="-4">X</text>
        <rect x="371" y="41" width="78" height="36" rx="12" fill="#0E211C" stroke="#20E7B4" strokeWidth="2"/>
        <text x="389" y="66" fill="#CFFFF0" fontFamily="Inter,Arial,sans-serif" fontSize="22" fontWeight="800" letterSpacing=".2">PRO</text>
      </g>
    </svg>
  );
}
