/**
 * Shared model for the calendar views.
 *
 * The Calendar page merges two sources — appointments from our own database and
 * events pulled from Google — into one list. Everything visual (colour, lane
 * layout, gap detection, clash warnings) is derived here rather than inside the
 * components, so the month grid and the day rail can never disagree about what
 * a day actually looks like.
 */

export type CalendarItemSource = "app" | "google";

export interface CalendarItem {
  id: string;
  /** Underlying appointment id, when the item came from our own table. */
  appointmentId?: string;
  title: string;
  /** ISO start. */
  date: string;
  /** ISO end. Null when unknown — consumers fall back to a default duration. */
  end?: string | null;
  allDay?: boolean;
  source: CalendarItemSource;
  type?: string | null;
  location?: string | null;
  contactId?: string | null;
  notes?: string | null;
  htmlLink?: string;
}

interface TypeMeta {
  label: string;
  /** Small filled dot / density marker. */
  dot: string;
  /** Left colour bar on a month chip. */
  bar: string;
  /** Solid block in the day rail. */
  block: string;
  /** Chip background in the month grid. */
  chip: string;
}

/**
 * Tailwind needs literal class names, so these are written out in full rather
 * than composed from a colour token.
 */
export const EVENT_TYPE_META: Record<string, TypeMeta> = {
  appraisal: {
    label: "Appraisal",
    dot: "bg-purple-400",
    bar: "border-l-purple-400",
    block: "bg-purple-500 text-purple-50",
    chip: "bg-purple-500/10",
  },
  listing_appt: {
    label: "Listing appt",
    dot: "bg-amber-400",
    bar: "border-l-amber-400",
    block: "bg-amber-500 text-amber-950",
    chip: "bg-amber-500/10",
  },
  open_home: {
    label: "Open home",
    dot: "bg-emerald-400",
    bar: "border-l-emerald-400",
    block: "bg-emerald-500 text-emerald-950",
    chip: "bg-emerald-500/10",
  },
  inspection: {
    label: "Inspection",
    dot: "bg-blue-400",
    bar: "border-l-blue-400",
    block: "bg-blue-500 text-blue-50",
    chip: "bg-blue-500/10",
  },
  valuation: {
    label: "Valuation",
    dot: "bg-indigo-400",
    bar: "border-l-indigo-400",
    block: "bg-indigo-500 text-indigo-50",
    chip: "bg-indigo-500/10",
  },
  settlement: {
    label: "Settlement",
    dot: "bg-green-400",
    bar: "border-l-green-400",
    block: "bg-green-500 text-green-950",
    chip: "bg-green-500/10",
  },
  prospecting: {
    label: "Prospecting",
    dot: "bg-sky-400",
    bar: "border-l-sky-400",
    block: "bg-sky-500 text-sky-950",
    chip: "bg-sky-500/10",
  },
  call: {
    label: "Call",
    dot: "bg-teal-400",
    bar: "border-l-teal-400",
    block: "bg-teal-500 text-teal-950",
    chip: "bg-teal-500/10",
  },
  team: {
    label: "Team",
    dot: "bg-pink-400",
    bar: "border-l-pink-400",
    block: "bg-pink-500 text-pink-50",
    chip: "bg-pink-500/10",
  },
  personal: {
    label: "Personal",
    dot: "bg-slate-400",
    bar: "border-l-slate-400",
    block: "bg-slate-500 text-slate-50",
    chip: "bg-slate-500/10",
  },
  meeting: {
    label: "Meeting",
    dot: "bg-cyan-400",
    bar: "border-l-cyan-400",
    block: "bg-cyan-500 text-cyan-950",
    chip: "bg-cyan-500/10",
  },
};

const GOOGLE_META: TypeMeta = {
  label: "Google",
  dot: "bg-zinc-400",
  bar: "border-l-zinc-400",
  block: "bg-zinc-500 text-zinc-50",
  chip: "bg-zinc-500/10",
};

/** Order the filter chips appear in. */
export const FILTER_TYPES = [
  "prospecting",
  "listing_appt",
  "appraisal",
  "open_home",
  "inspection",
  "valuation",
  "settlement",
  "call",
  "team",
  "personal",
  "meeting",
] as const;

export function metaFor(item: Pick<CalendarItem, "source" | "type">): TypeMeta {
  if (item.source === "google") return GOOGLE_META;
  return EVENT_TYPE_META[item.type ?? ""] ?? EVENT_TYPE_META.meeting;
}

export function typeLabel(type: string): string {
  return EVENT_TYPE_META[type]?.label ?? type;
}

/* ------------------------------------------------------------------------ */
/* Timing                                                                     */
/* ------------------------------------------------------------------------ */

const MS_PER_MINUTE = 60_000;

/**
 * Resolve an item to a concrete start/end pair in milliseconds.
 * Items with no stored end fall back to the user's default duration.
 */
export function itemSpan(item: CalendarItem, defaultDurationMinutes = 60) {
  const start = new Date(item.date).getTime();
  const stored = item.end ? new Date(item.end).getTime() : NaN;
  const end =
    Number.isFinite(stored) && stored > start
      ? stored
      : start + defaultDurationMinutes * MS_PER_MINUTE;
  return { start, end };
}

/**
 * Pairs of items whose times overlap. Used to flag double-bookings — the 9am
 * "25 calls" block sitting underneath the 10am Daily 5, for instance.
 */
export function findClashes(
  items: CalendarItem[],
  defaultDurationMinutes = 60,
): Array<[CalendarItem, CalendarItem]> {
  const timed = items
    .filter((i) => !i.allDay)
    .map((i) => ({ item: i, ...itemSpan(i, defaultDurationMinutes) }))
    .sort((a, b) => a.start - b.start);

  const pairs: Array<[CalendarItem, CalendarItem]> = [];
  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      if (timed[j].start >= timed[i].end) break;
      pairs.push([timed[i].item, timed[j].item]);
    }
  }
  return pairs;
}

export function clashingIds(items: CalendarItem[], defaultDurationMinutes = 60): Set<string> {
  const ids = new Set<string>();
  findClashes(items, defaultDurationMinutes).forEach(([a, b]) => {
    ids.add(a.id);
    ids.add(b.id);
  });
  return ids;
}

export interface Gap {
  startMinutes: number;
  endMinutes: number;
  minutes: number;
}

/**
 * Free windows inside the working day, in minutes from midnight. This is the
 * "can I fit an appraisal in on Thursday?" answer.
 */
export function findGaps(
  items: CalendarItem[],
  day: Date,
  opts: { dayStartHour?: number; dayEndHour?: number; minGapMinutes?: number; defaultDurationMinutes?: number } = {},
): Gap[] {
  const {
    dayStartHour = 7,
    dayEndHour = 18,
    minGapMinutes = 45,
    defaultDurationMinutes = 60,
  } = opts;

  const dayStart = new Date(day);
  dayStart.setHours(dayStartHour, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(dayEndHour, 0, 0, 0);

  const busy = items
    .filter((i) => !i.allDay)
    .map((i) => itemSpan(i, defaultDurationMinutes))
    .filter((s) => s.end > dayStart.getTime() && s.start < dayEnd.getTime())
    .sort((a, b) => a.start - b.start);

  // Merge overlapping busy blocks so a double-booking doesn't create a fake gap.
  const merged: Array<{ start: number; end: number }> = [];
  busy.forEach((b) => {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
    else merged.push({ ...b });
  });

  const gaps: Gap[] = [];
  let cursor = dayStart.getTime();
  const toMinutes = (ms: number) => Math.round((ms - dayStart.getTime()) / MS_PER_MINUTE) + dayStartHour * 60;

  merged.forEach((b) => {
    if (b.start - cursor >= minGapMinutes * MS_PER_MINUTE) {
      gaps.push({
        startMinutes: toMinutes(cursor),
        endMinutes: toMinutes(b.start),
        minutes: Math.round((b.start - cursor) / MS_PER_MINUTE),
      });
    }
    cursor = Math.max(cursor, b.end);
  });

  if (dayEnd.getTime() - cursor >= minGapMinutes * MS_PER_MINUTE) {
    gaps.push({
      startMinutes: toMinutes(cursor),
      endMinutes: toMinutes(dayEnd.getTime()),
      minutes: Math.round((dayEnd.getTime() - cursor) / MS_PER_MINUTE),
    });
  }

  return gaps;
}

export interface PositionedItem {
  item: CalendarItem;
  /** Fraction of the rail height, 0–1. */
  top: number;
  height: number;
  /** Which of `lanes` columns this block sits in. */
  lane: number;
  lanes: number;
}

/**
 * Place timed items into side-by-side lanes so overlapping blocks stay legible
 * instead of stacking on top of each other.
 */
export function layoutDay(
  items: CalendarItem[],
  day: Date,
  opts: { dayStartHour?: number; dayEndHour?: number; defaultDurationMinutes?: number } = {},
): PositionedItem[] {
  const { dayStartHour = 7, dayEndHour = 18, defaultDurationMinutes = 60 } = opts;

  const dayStart = new Date(day);
  dayStart.setHours(dayStartHour, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(dayEndHour, 0, 0, 0);
  const windowMs = dayEnd.getTime() - dayStart.getTime();
  if (windowMs <= 0) return [];

  const placed: PositionedItem[] = [];

  items
    .filter((i) => !i.allDay)
    .map((i) => ({ item: i, ...itemSpan(i, defaultDurationMinutes) }))
    .sort((a, b) => a.start - b.start)
    .forEach(({ item, start, end }) => {
      const clampedStart = Math.max(start, dayStart.getTime());
      const clampedEnd = Math.min(end, dayEnd.getTime());
      if (clampedEnd <= dayStart.getTime() || clampedStart >= dayEnd.getTime()) return;

      const top = (clampedStart - dayStart.getTime()) / windowMs;
      const height = Math.max((clampedEnd - clampedStart) / windowMs, 0.03);

      // Anything already placed that overlaps this one shares its lanes.
      const overlapping = placed.filter((p) => top < p.top + p.height && top + height > p.top);
      const lane = overlapping.length;
      const lanes = lane + 1;
      overlapping.forEach((p) => {
        if (p.lanes < lanes) p.lanes = lanes;
      });

      placed.push({ item, top, height, lane, lanes });
    });

  return placed;
}

/** Coarse "how full is this day" signal for the month grid density dots. */
export function dayLoad(items: CalendarItem[]): 0 | 1 | 2 | 3 {
  const timed = items.filter((i) => !i.allDay).length;
  if (timed === 0) return 0;
  if (timed <= 1) return 1;
  if (timed <= 3) return 2;
  return 3;
}
