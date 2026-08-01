/**
 * A colorful, glowing gradient wave transitioning the hero into the rest
 * of the page — the "dynamic background" layer the flat single-tone hero
 * background was missing. Renders as a filled shape (not just a subtle
 * tint) so it reads as a real design element, not a texture.
 */
export function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 180"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wave-fill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--magenta)" stopOpacity="0.5" />
          <stop offset="45%" stopColor="var(--violet)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="wave-fill-soft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--magenta)" stopOpacity="0.22" />
          <stop offset="50%" stopColor="var(--violet)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d="M0,90 C220,150 380,20 620,60 C860,100 980,10 1220,50 C1330,70 1400,55 1440,45 L1440,180 L0,180 Z"
        fill="url(#wave-fill-soft)"
      />
      <path
        d="M0,120 C240,170 400,60 660,95 C900,128 1000,50 1240,90 C1340,106 1400,95 1440,85 L1440,180 L0,180 Z"
        fill="url(#wave-fill)"
      />
    </svg>
  );
}
