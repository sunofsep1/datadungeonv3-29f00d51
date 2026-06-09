import { cn } from "@/lib/utils";

interface AvatarCircleProps {
  /** Display name for avatar. */
  name?: string | null;
  /** Override initials (e.g. from first/last name). If not provided, derived from name. */
  initials?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  /** Two-tone gradient from the avatar palette (name-hashed). */
  variant?: "solid" | "duotone";
  /** Offset palette index — use to alternate colours in lists (e.g. every second card). */
  paletteShift?: number;
  /** Force exact duotone pair (CSS var names, e.g. `--avatar-5`). Overrides name hash. */
  duotonePair?: readonly [string, string];
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

const paletteTokens = [
  "--avatar-1",
  "--avatar-2",
  "--avatar-3",
  "--avatar-4",
  "--avatar-5",
  "--avatar-6",
  "--avatar-7",
  "--avatar-8",
];

function hashName(name: string | undefined | null): number {
  const s = name ?? "";
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getPaletteTokenForName(name: string | undefined | null, paletteShift = 0): string {
  return paletteTokens[(hashName(name) + paletteShift) % paletteTokens.length];
}

function getDuotoneTokensForName(name: string | undefined | null, paletteShift = 0): [string, string] {
  const idx = (hashName(name) + paletteShift) % paletteTokens.length;
  const secondary = (idx + 3) % paletteTokens.length;
  return [paletteTokens[idx], paletteTokens[secondary]];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AvatarCircle({
  name,
  initials: initialsProp,
  color,
  size = "md",
  variant = "solid",
  paletteShift = 0,
  duotonePair,
  className,
}: AvatarCircleProps) {
  const displayName = name ?? "";
  const token = getPaletteTokenForName(displayName, paletteShift);
  const [duoA, duoB] = duotonePair ?? getDuotoneTokensForName(displayName, paletteShift);
  const style = color
    ? { backgroundColor: color, color: "hsl(var(--avatar-foreground))" }
    : variant === "duotone"
      ? {
          backgroundImage: `linear-gradient(145deg, hsl(var(${duoA})) 0%, hsl(var(${duoA})) 38%, hsl(var(${duoB})) 100%)`,
          color: "hsl(var(--avatar-foreground))",
          boxShadow: `inset 0 1px 0 hsl(var(${duoA}) / 0.35), inset 0 -8px 16px hsl(var(${duoB}) / 0.25)`,
        }
      : {
          backgroundColor: `hsl(var(${token}))`,
          color: "hsl(var(--avatar-foreground))",
        };
  const initials = initialsProp ?? (displayName.trim() ? getInitials(displayName) : "?");

  return (
    <div
      style={style}
      className={cn(
        "rounded-full flex items-center justify-center font-semibold",
        variant === "duotone" && "relative overflow-hidden",
        sizeClasses[size],
        className
      )}
    >
      {variant === "duotone" ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/10"
        />
      ) : null}
      <span className="relative z-[1] drop-shadow-sm">{initials}</span>
    </div>
  );
}
