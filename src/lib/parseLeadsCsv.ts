/** RFC4180-style CSV parse (quoted fields, escaped quotes). */
export function parseCsv(text: string): string[][] {
  const t = text.startsWith("\ufeff") ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let i = 0;
  let inQ = false;

  while (i < t.length) {
    const c = t[i]!;
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(cur);
      cur = "";
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(cur);
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
      cur = "";
      i++;
      continue;
    }
    if (c === "\r") {
      row.push(cur);
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
      cur = "";
      i++;
      if (t[i] === "\n") i++;
      continue;
    }
    cur += c;
    i++;
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[\s-]+/g, "_");
}

/** Maps normalized CSV header → one logical column key. */
const HEADER_MAP: Record<string, string> = {
  name: "name",
  full_name: "name",
  contact_name: "name",
  lead_name: "name",
  first_name: "first_name",
  firstname: "first_name",
  last_name: "last_name",
  lastname: "last_name",
  email: "email",
  e_mail: "email",
  mail: "email",
  phone: "phone",
  mobile: "phone",
  telephone: "phone",
  tel: "phone",
  source: "source",
  lead_source: "source",
  notes: "notes",
  note: "notes",
  comments: "notes",
  property_interest: "property_interest",
  property: "property_interest",
  listing_interest: "property_interest",
  budget_min: "budget_min",
  min_budget: "budget_min",
  budget_minimum: "budget_min",
  budget_max: "budget_max",
  max_budget: "budget_max",
  budget_maximum: "budget_max",
  timeline: "timeline",
  status: "status",
};

export function parseBudget(raw: string | undefined): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const n = Number(String(raw).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export interface ParsedLeadRow {
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  notes: string | null;
  property_interest: string | null;
  budget_min: number | null;
  budget_max: number | null;
  timeline: string | null;
  status: string | null;
}

export interface ParseLeadsCsvRowError {
  line: number;
  message: string;
}

export interface ParseLeadsCsvResult {
  rows: ParsedLeadRow[];
  rowErrors: ParseLeadsCsvRowError[];
}

const MAX_IMPORT_ROWS = 500;

/**
 * First row = headers. Requires a name (column or first+last). Max 500 data rows.
 */
export function parseLeadsCsv(text: string): ParseLeadsCsvResult {
  const grid = parseCsv(text);
  if (grid.length < 2) {
    return { rows: [], rowErrors: [{ line: 1, message: "Need a header row and at least one data row." }] };
  }

  const headerCells = grid[0]!.map((h) => normHeader(h));
  const colKeys: (string | null)[] = headerCells.map((h) => HEADER_MAP[h] ?? null);

  if (!colKeys.some(Boolean)) {
    return {
      rows: [],
      rowErrors: [{ line: 1, message: "No recognized columns. Include name (or first_name + last_name), email, or phone." }],
    };
  }

  const rows: ParsedLeadRow[] = [];
  const rowErrors: ParseLeadsCsvRowError[] = [];

  for (let r = 1; r < grid.length; r++) {
    if (rows.length >= MAX_IMPORT_ROWS) {
      rowErrors.push({ line: r + 1, message: `Stopped at ${MAX_IMPORT_ROWS} rows (limit).` });
      break;
    }

    const cells = grid[r]!;
    const get = (key: string): string => {
      const idx = colKeys.indexOf(key);
      if (idx < 0) return "";
      return (cells[idx] ?? "").trim();
    };

    const nameDirect = get("name");
    const first = get("first_name");
    const last = get("last_name");
    let name = nameDirect;
    if (!name) {
      name = [first, last].filter(Boolean).join(" ").trim();
    }
    if (!name) {
      rowErrors.push({ line: r + 1, message: "Missing name (use name or first_name + last_name)." });
      continue;
    }

    const emailRaw = get("email");
    const phoneRaw = get("phone");
    const sourceRaw = get("source");
    const notesRaw = get("notes");
    const propRaw = get("property_interest");
    const timelineRaw = get("timeline");
    const statusRaw = get("status");

    rows.push({
      name,
      email: emailRaw || null,
      phone: phoneRaw || null,
      source: sourceRaw || null,
      notes: notesRaw || null,
      property_interest: propRaw || null,
      budget_min: parseBudget(get("budget_min")),
      budget_max: parseBudget(get("budget_max")),
      timeline: timelineRaw || null,
      status: statusRaw || null,
    });
  }

  return { rows, rowErrors };
}
