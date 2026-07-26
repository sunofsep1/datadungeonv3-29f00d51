import { format, isSameDay } from "date-fns";
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

function minutesLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function hourLabel(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return format(d, "h a");
}

interface DayRailProps {
  day: Date;
  items: CalendarItem[];
  defaultDurationMinutes?: number;
  contactNameFor?: (contactId: string) => string | undefined;
  onAddAt?: (day: Date, startTime: string) => void;
  onSelectItem?: (item: CalendarItem) => void;
}

/**
 * The day beside the month. Answers "what does Tuesday actually look like, and
 * can I fit an appraisal in?" without leaving the month view.
 */
export function DayRail({
  day,
  items,
  defaultDurationMinutes = 60,
  contactNameFor,
  onAddAt,
  onSelectItem,
}: DayRailProps) {
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

  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i,
  );
  const railHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX;
  const freeMinutes = gaps.reduce((sum, g) => sum + g.minutes, 0);

  const summary = [
    `${timed.length} ${timed.length === 1 ? "commitment" : "commitments"}`,
    clashes.size ? `${clashes.size / 2 >= 1 ? Math.ceil(clashes.size / 2) : 1} clash` : null,
    freeMinutes ? `${minutesLabel(freeMinutes)} free` : "fully booked",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {format(day, "EEEE d MMMM")}
            {isSameDay(day, new Date()) ? (
              <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                Today
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{summary}</p>
        </div>
        {onAddAt ? (
          <button
            type="button"
            onClick={() => onAddAt(day, "09:00")}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/80 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        ) : null}
      </div>

      {allDay.length > 0 ? (
        <div className="mt-3 space-y-1">
          {allDay.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground",
                metaFor(item).chip,
              )}
            >
              {item.title}
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative mt-4 pl-12" style={{ height: railHeight }}>
        {hours.map((hour, i) => (
          <div
            key={hour}
            className="absolute left-12 right-0 border-t border-dashed border-border/50"
            style={{ top: i * HOUR_PX }}
          >
            <span className="absolute -left-12 -top-2 text-[10.5px] tabular-nums text-muted-foreground">
              {hourLabel(hour)}
            </span>
          </div>
        ))}

        {gaps.map((gap) => {
          const top = ((gap.startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_PX;
          const height = (gap.minutes / 60) * HOUR_PX;
          return (
            <button
              key={`gap-${gap.startMinutes}`}
              type="button"
              onClick={() =>
                onAddAt?.(
                  day,
                  `${String(Math.floor(gap.startMinutes / 60)).padStart(2, "0")}:${String(
                    gap.startMinutes % 60,
                  ).padStart(2, "0")}`,
                )
              }
              className="absolute left-0 right-1 flex items-center justify-center rounded-md border border-dashed border-border/70 text-[10.5px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
              style={{ top, height: Math.max(height - 3, 18) }}
              title="Click to book this window"
            >
              {height >= 34 ? `${minutesLabel(gap.minutes)} free` : null}
            </button>
          );
        })}

        {placed.map(({ item, top, height, lane, lanes }) => {
          const meta = metaFor(item);
          const isClash = clashes.has(item.id);
          const contactName = item.contactId ? contactNameFor?.(item.contactId) : undefined;
          const blockHeight = Math.max(height * railHeight - 3, 26);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem?.(item)}
              className={cn(
                "absolute overflow-hidden rounded-md px-2 py-1 text-left text-[11.5px] font-semibold leading-tight transition-opacity hover:opacity-90",
                meta.block,
                isClash && "ring-2 ring-red-400 ring-offset-1 ring-offset-card",
              )}
              style={{
                top: top * railHeight,
                height: blockHeight,
                left: `calc(${(lane / lanes) * 100}% + 0px)`,
                width: `calc(${100 / lanes}% - 4px)`,
              }}
              title={item.title}
            >
              <span className="line-clamp-2 block">{item.title}</span>
              {blockHeight >= 40 ? (
                <span className="mt-0.5 block text-[10px] font-medium opacity-80">
                  {format(new Date(item.date), "h:mm a")}
                  {isClash ? " · overlaps" : ""}
                </span>
              ) : null}
              {blockHeight >= 62 && (contactName || item.location) ? (
                <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium opacity-80">
                  {contactName ? (
                    <>
                      <User className="h-2.5 w-2.5" />
                      {contactName}
                    </>
                  ) : (
                    <>
                      <MapPin className="h-2.5 w-2.5" />
                      {item.location}
                    </>
                  )}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {clashes.size > 0 ? (
        <div className="mt-3 flex gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p>
            <span className="font-semibold">Double-booked.</span> {Math.ceil(clashes.size / 2)}{" "}
            {Math.ceil(clashes.size / 2) === 1 ? "pair overlaps" : "pairs overlap"} on this day —
            outlined in red above.
          </p>
        </div>
      ) : null}

      {timed.length === 0 && allDay.length === 0 ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Nothing booked. Click any window above to add something.
        </p>
      ) : null}
    </div>
  );
}
