import { format, isToday } from "date-fns";
import { AlertTriangle, MapPin, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clashingIds,
  findGaps,
  layoutDay,
  metaFor,
  type CalendarItem,
} from "@/lib/calendarEvents";

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 18;
const HOUR_PX = 44;

function hourLabel(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return format(d, "h a");
}

function minutesLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function slotTime(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface WeekViewProps {
  /** The seven days to show, Monday-first. */
  days: Date[];
  itemsForDay: (day: Date) => CalendarItem[];
  defaultDurationMinutes?: number;
  contactNameFor?: (contactId: string) => string | undefined;
  onAddAt?: (day: Date, startTime: string) => void;
  onSelectItem?: (item: CalendarItem) => void;
}

/**
 * The week as a real timetable, not a flat list. Each day is a column sharing
 * one 7am–6pm axis; overlapping bookings sit side-by-side in lanes, event
 * colours come from the same {@link metaFor} table the month grid uses, clashes
 * are ringed red, and free windows are clickable to book into — the same
 * treatment the day rail and month view already give a single day.
 */
export function WeekView({
  days,
  itemsForDay,
  defaultDurationMinutes = 60,
  contactNameFor,
  onAddAt,
  onSelectItem,
}: WeekViewProps) {
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i,
  );
  const railHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX;

  const perDay = days.map((day) => {
    const items = itemsForDay(day);
    const timed = items.filter((i) => !i.allDay);
    const allDay = items.filter((i) => i.allDay);
    const placed = layoutDay(timed, day, {
      dayStartHour: DAY_START_HOUR,
      dayEndHour: DAY_END_HOUR,
      defaultDurationMinutes,
    });
    const gaps = findGaps(timed, day, {
      dayStartHour: DAY_START_HOUR,
      dayEndHour: DAY_END_HOUR,
      minGapMinutes: 60,
      defaultDurationMinutes,
    });
    const clashes = clashingIds(timed, defaultDurationMinutes);
    return { day, timed, allDay, placed, gaps, clashes };
  });

  const weekClashPairs = perDay.reduce(
    (sum, d) => sum + Math.ceil(d.clashes.size / 2),
    0,
  );
  const hasAllDay = perDay.some((d) => d.allDay.length > 0);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        {/* Day headers */}
        <div className="flex">
          <div className="w-12 shrink-0" />
          <div className="grid flex-1 grid-cols-7 gap-px">
            {perDay.map(({ day, timed, clashes }) => {
              const weekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onAddAt?.(day, "09:00")}
                  title="Click to add a booking on this day"
                  className={cn(
                    "flex flex-col items-center rounded-t-lg px-1 py-1.5 text-center transition-colors hover:bg-muted/60",
                    isToday(day) && "bg-primary/10",
                    weekend && !isToday(day) && "bg-muted/20",
                  )}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {format(day, "EEE")}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full text-xs tabular-nums",
                        isToday(day)
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "font-medium text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {clashes.size > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Double-booked" />
                    ) : null}
                  </span>
                  <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {timed.length || ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* All-day row */}
        {hasAllDay ? (
          <div className="flex border-t border-border/60">
            <div className="flex w-12 shrink-0 items-start justify-end pr-1 pt-1 text-[9px] uppercase tracking-wide text-muted-foreground">
              all day
            </div>
            <div className="grid flex-1 grid-cols-7 gap-px">
              {perDay.map(({ day, allDay }) => (
                <div key={day.toISOString()} className="space-y-0.5 p-0.5">
                  {allDay.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem?.(item)}
                      title={item.title}
                      className={cn(
                        "block w-full truncate rounded border-l-2 px-1 py-0.5 text-left text-[10px] leading-tight text-foreground",
                        metaFor(item).bar,
                        metaFor(item).chip,
                      )}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Timed grid */}
        <div className="flex border-t border-border/60">
          {/* Hour gutter */}
          <div className="relative w-12 shrink-0" style={{ height: railHeight }}>
            {hours.map((hour, i) => (
              <span
                key={hour}
                className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: i * HOUR_PX }}
              >
                {hourLabel(hour)}
              </span>
            ))}
          </div>

          {/* Day columns */}
          <div className="grid flex-1 grid-cols-7 gap-px">
            {perDay.map(({ day, placed, gaps, clashes }) => {
              const weekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative",
                    isToday(day)
                      ? "bg-primary/[0.04]"
                      : weekend
                        ? "bg-muted/15"
                        : "bg-card/40",
                  )}
                  style={{ height: railHeight }}
                >
                  {/* Hour gridlines */}
                  {hours.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-dashed border-border/40"
                      style={{ top: i * HOUR_PX }}
                    />
                  ))}

                  {/* Free windows */}
                  {gaps.map((gap) => {
                    const top = ((gap.startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_PX;
                    const height = (gap.minutes / 60) * HOUR_PX;
                    return (
                      <button
                        key={`gap-${gap.startMinutes}`}
                        type="button"
                        onClick={() => onAddAt?.(day, slotTime(gap.startMinutes))}
                        title="Click to book this window"
                        className="absolute inset-x-0.5 flex items-center justify-center rounded border border-dashed border-border/60 text-[9px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                        style={{ top, height: Math.max(height - 2, 14) }}
                      >
                        {height >= 30 ? `${minutesLabel(gap.minutes)} free` : null}
                      </button>
                    );
                  })}

                  {/* Timed blocks */}
                  {placed.map(({ item, top, height, lane, lanes }) => {
                    const meta = metaFor(item);
                    const isClash = clashes.has(item.id);
                    const contactName = item.contactId
                      ? contactNameFor?.(item.contactId)
                      : undefined;
                    const blockHeight = Math.max(height * railHeight - 2, 22);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectItem?.(item)}
                        title={`${format(new Date(item.date), "h:mm a")} — ${item.title}${
                          isClash ? " (overlaps another booking)" : ""
                        }`}
                        className={cn(
                          "absolute overflow-hidden rounded px-1 py-0.5 text-left text-[10px] font-semibold leading-tight transition-opacity hover:opacity-90",
                          meta.block,
                          isClash && "ring-2 ring-red-400 ring-offset-1 ring-offset-card",
                        )}
                        style={{
                          top: top * railHeight,
                          height: blockHeight,
                          left: `calc(${(lane / lanes) * 100}% + 1px)`,
                          width: `calc(${100 / lanes}% - 2px)`,
                        }}
                      >
                        <span className="line-clamp-2 block">{item.title}</span>
                        {blockHeight >= 34 ? (
                          <span className="mt-0.5 block text-[9px] font-medium opacity-80">
                            {format(new Date(item.date), "h:mm a")}
                          </span>
                        ) : null}
                        {blockHeight >= 54 && (contactName || item.location) ? (
                          <span className="mt-0.5 flex items-center gap-1 text-[9px] font-medium opacity-80">
                            {contactName ? (
                              <>
                                <User className="h-2.5 w-2.5" />
                                {contactName}
                              </>
                            ) : (
                              <>
                                <MapPin className="h-2.5 w-2.5" />
                                <span className="truncate">{item.location}</span>
                              </>
                            )}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {weekClashPairs > 0 ? (
        <div className="mt-3 flex gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p>
            <span className="font-semibold">Double-booked.</span> {weekClashPairs}{" "}
            {weekClashPairs === 1 ? "overlap" : "overlaps"} this week — outlined in red above.
          </p>
        </div>
      ) : null}
    </div>
  );
}
