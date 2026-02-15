import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(user: { user_metadata?: Record<string, unknown>; email?: string } | null): string {
  if (!user) return "";
  const fullName = user.user_metadata?.full_name as string | undefined;
  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0] ?? "";
  }
  const email = user.email;
  if (email) {
    const local = email.split("@")[0];
    return local ? local.charAt(0).toUpperCase() + local.slice(1).toLowerCase() : "";
  }
  return "";
}

export function DashboardWelcomeHeader() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const firstName = getFirstName(user);
  const greeting = getGreeting();
  const displayName = firstName ? firstName : "there";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        {/* 80s/90s LED-style digital clock */}
        <div className="inline-block">
          <div
            className="relative overflow-hidden rounded-lg px-5 py-3"
            style={{
              background: "linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)",
              boxShadow:
                "inset 0 2px 4px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          >
            <div
              className="font-mono text-2xl sm:text-3xl font-bold tabular-nums tracking-[0.15em]"
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                color: "#4ade80",
                textShadow:
                  "0 0 6px #4ade80, 0 0 12px rgba(74, 222, 128, 0.6), 0 0 24px rgba(74, 222, 128, 0.3)",
              }}
              aria-live="polite"
              aria-label={`Current time ${format(now, "h:mm:ss a")}`}
            >
              {format(now, "h:mm:ss")}
              <span
                className="ml-1.5 text-lg sm:text-xl font-medium opacity-90"
                style={{ textShadow: "0 0 4px #4ade80, 0 0 8px rgba(74, 222, 128, 0.4)" }}
              >
                {format(now, "a")}
              </span>
            </div>
            <div
              className="mt-1 text-[10px] sm:text-xs font-medium tracking-widest uppercase"
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                color: "rgba(74, 222, 128, 0.75)",
                textShadow: "0 0 4px rgba(74, 222, 128, 0.3)",
              }}
            >
              {format(now, "EEEE, MMM d")}
            </div>
          </div>
        </div>
        <h1 className="text-lg sm:text-xl font-semibold text-foreground mt-2">
          {firstName ? `${greeting}, ${displayName}!` : `${greeting}!`}
        </h1>
      </div>
    </div>
  );
}
