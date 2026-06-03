import { cn } from "@/lib/utils";

interface AvatarCircleProps {
  /** Display name for avatar. */
  name?: string | null;
  /** Override initials (e.g. from first/last name). If not provided, derived from name. */
  initials?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
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

function getPaletteTokenForName(name: string | undefined | null): string {
  const s = name ?? "";
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  return paletteTokens[Math.abs(hash) % paletteTokens.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AvatarCircle({ name, initials: initialsProp, color, size = "md", className }: AvatarCircleProps) {
  const displayName = name ?? "";
  const token = getPaletteTokenForName(displayName);
  const style = color
    ? { backgroundColor: color }
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
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
