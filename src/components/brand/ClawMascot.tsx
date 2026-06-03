import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
};

/**
 * Original claw-style mascot for AI Ops branding.
 * Inspired by playful "claw bot" motifs, but intentionally custom-drawn.
 */
export function ClawMascot({ className, size = 44 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="DataDungeon claw mascot"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="clawBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff6b6b" />
          <stop offset="100%" stopColor="#ff4d8d" />
        </linearGradient>
      </defs>
      <path d="M22 50c-7 0-12-5-12-12s5-12 12-12h20c7 0 12 5 12 12s-5 12-12 12H22z" fill="url(#clawBody)" />
      <path d="M18 34c-6 0-10-5-10-10 0-4 2-7 5-9" fill="none" stroke="#ff6b6b" strokeWidth="6" strokeLinecap="round" />
      <path d="M46 34c6 0 10-5 10-10 0-4-2-7-5-9" fill="none" stroke="#ff4d8d" strokeWidth="6" strokeLinecap="round" />
      <circle cx="25" cy="38" r="3.5" fill="#101523" />
      <circle cx="39" cy="38" r="3.5" fill="#101523" />
      <path d="M25 45c2.5 2 11.5 2 14 0" fill="none" stroke="#101523" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24.2" cy="36.9" r="1" fill="#fff" />
      <circle cx="38.2" cy="36.9" r="1" fill="#fff" />
    </svg>
  );
}
