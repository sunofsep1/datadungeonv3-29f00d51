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
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const firstName = getFirstName(user);
  const greeting = getGreeting();
  const displayName = firstName ? firstName : "there";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
            {format(now, "h:mm a")}
          </span>
          <span className="text-sm sm:text-base text-white/60">
            {format(now, "EEEE, d MMMM yyyy")}
          </span>
        </div>
        <h1 className="text-lg sm:text-xl font-semibold text-white mt-1">
          {firstName ? `${greeting}, ${displayName}!` : `${greeting}!`}
        </h1>
      </div>
    </div>
  );
}
