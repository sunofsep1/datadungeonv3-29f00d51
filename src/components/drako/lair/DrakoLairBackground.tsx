import { useState } from "react";
import { cn } from "@/lib/utils";

export const DRAKO_LAIR_BG = "/drako/lair/dungeon-bg.png";
export const DRAKO_TROPHY_WALL_BG = "/drako/lair/trophy-wall-bg.png";

interface DrakoLairBackgroundProps {
  className?: string;
}

export function DrakoLairBackground({ className }: DrakoLairBackgroundProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none bg-black/40", className)}>
      <img
        src={DRAKO_LAIR_BG}
        alt=""
        aria-hidden
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-[center_62%] transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
      {/* CSS fallback while loading or if image missing */}
      {!loaded && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 100%, hsl(var(--primary) / 0.12), transparent 70%), linear-gradient(180deg, hsl(240 18% 8%) 0%, hsl(240 22% 5%) 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, hsl(var(--foreground) / 0.06) 0px, hsl(var(--foreground) / 0.06) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(0deg, hsl(var(--foreground) / 0.04) 0px, hsl(var(--foreground) / 0.04) 1px, transparent 1px, transparent 48px)",
            }}
          />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
    </div>
  );
}
