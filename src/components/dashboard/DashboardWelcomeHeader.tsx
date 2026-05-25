import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  differenceInCalendarDays,
  endOfYear,
  getISOWeek,
  getQuarter,
  parseISO,
} from "date-fns";

const BRISBANE_TZ = "Australia/Brisbane";
const MONO = "'Share Tech Mono', monospace";

function getGreeting(hour24: number): string {
  if (hour24 < 12) return "Good morning";
  if (hour24 < 17) return "Good afternoon";
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

type BrisbaneClock = {
  hours12: string;
  minutes: string;
  seconds: string;
  ampm: string;
  hour24: number;
  weekday: string;
  dayMonthYear: string;
  year: string;
  month: string;
  day: string;
  calendarDate: Date;
  isWeekend: boolean;
};

function readBrisbaneClock(now: Date): BrisbaneClock {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: BRISBANE_TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour12: true,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const hourRaw = get("hour");
  const hour12 = Number.parseInt(hourRaw, 10);
  const dayPeriod = get("dayPeriod").toLowerCase();
  let hour24 = hour12 % 12;
  if (dayPeriod === "pm") hour24 += 12;
  if (dayPeriod === "am" && hour12 === 12) hour24 = 0;

  const day = get("day");
  const monthName = get("month");
  const year = get("year");
  const monthParts = new Intl.DateTimeFormat("en-AU", {
    timeZone: BRISBANE_TZ,
    month: "2-digit",
  }).formatToParts(now);
  const monthNum = monthParts.find((p) => p.type === "month")?.value ?? "01";
  const calendarDate = parseISO(`${year}-${monthNum}-${day}T12:00:00`);

  const weekday = get("weekday");
  const isWeekend = weekday === "Saturday" || weekday === "Sunday";

  return {
    hours12: hourRaw.padStart(2, "0"),
    minutes: get("minute"),
    seconds: get("second"),
    ampm: get("dayPeriod").toUpperCase(),
    hour24,
    weekday,
    dayMonthYear: `${weekday}, ${Number(day)} ${monthName} ${year}`,
    year,
    month: monthNum,
    day,
    calendarDate,
    isWeekend,
  };
}

function dayProgressPercent(hour24: number, minute: number, second: number): number {
  const elapsed = hour24 * 3600 + minute * 60 + second;
  return Math.round((elapsed / 86400) * 100);
}

export function DashboardWelcomeHeader() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const clock = useMemo(() => readBrisbaneClock(now), [now]);
  const firstName = getFirstName(user);
  const greeting = getGreeting(clock.hour24);
  const displayName = firstName ? firstName : "there";

  const isoWeek = getISOWeek(clock.calendarDate);
  const quarter = getQuarter(clock.calendarDate);
  const daysLeftInYear = differenceInCalendarDays(endOfYear(clock.calendarDate), clock.calendarDate);
  const dayProgress = dayProgressPercent(
    clock.hour24,
    Number.parseInt(clock.minutes, 10),
    Number.parseInt(clock.seconds, 10),
  );

  const ariaTime = `${clock.hours12}:${clock.minutes}:${clock.seconds} ${clock.ampm}, ${clock.dayMonthYear}, Brisbane`;

  return (
    <div className="w-full max-w-xl">
      <div
        className="dashboard-clock-panel relative overflow-hidden rounded-xl border border-border bg-card px-6 py-5 sm:px-8 sm:py-6 shadow-inner"
        style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.18)" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div
              className="font-mono font-bold tabular-nums tracking-[0.08em] text-teal dashboard-clock-glow flex flex-wrap items-baseline gap-x-1 gap-y-0"
              style={{ fontFamily: MONO }}
              aria-live="polite"
              aria-label={`Current time ${ariaTime}`}
            >
              <span className="text-5xl sm:text-6xl lg:text-7xl leading-none">
                {clock.hours12}:{clock.minutes}
              </span>
              <span className="text-3xl sm:text-4xl lg:text-5xl leading-none text-teal/90 dashboard-clock-seconds">
                :{clock.seconds}
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl font-semibold ml-1 sm:ml-2 text-teal/80">
                {clock.ampm}
              </span>
            </div>

            <p
              className="mt-3 text-sm sm:text-base font-medium tracking-wide text-foreground/90"
              style={{ fontFamily: MONO }}
            >
              {clock.dayMonthYear}
            </p>
          </div>

          <div
            className="shrink-0 text-right text-[11px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground"
            style={{ fontFamily: MONO }}
          >
            <p className="text-primary/90 font-semibold text-sm sm:text-base tracking-[0.12em] normal-case">
              Brisbane
            </p>
            <p className="mt-0.5">AEST · UTC+10</p>
            <p className="mt-2 text-[10px] tracking-[0.16em]">
              {clock.isWeekend ? "Weekend" : "Business day"}
            </p>
          </div>
        </div>

        <div
          className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 border-t border-border/70 pt-4"
          style={{ fontFamily: MONO }}
        >
          <ClockStat label="ISO week" value={`W${isoWeek}`} />
          <ClockStat label="Quarter" value={`Q${quarter}`} />
          <ClockStat label="Year" value={clock.year} />
          <ClockStat label="Days left" value={String(daysLeftInYear)} />
        </div>

        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
            <span>Day progress</span>
            <span className="tabular-nums">{dayProgress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal/70 via-primary to-primary/80 transition-[width] duration-1000 ease-linear dashboard-clock-progress"
              style={{ width: `${dayProgress}%` }}
            />
          </div>
        </div>
      </div>

      <p
        className="mt-3 text-[15px] sm:text-base font-normal tracking-tight text-muted-foreground/90"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        aria-label={firstName ? `${greeting}, ${displayName}` : greeting}
      >
        {firstName ? (
          <>
            <span className="text-foreground/95">{greeting}</span>, {displayName}!
          </>
        ) : (
          `${greeting}!`
        )}
      </p>
    </div>
  );
}

function ClockStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-center">
      <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm sm:text-base font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
