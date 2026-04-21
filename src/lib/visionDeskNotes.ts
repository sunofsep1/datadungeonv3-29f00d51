export const VISION_DESK_MARKER = "\n\n<<<VISION_DESK_DATA>>>\n";

export type VisionDeskMemo = { path: string; createdAt: string };
export type VisionDeskCheckItem = { id: string; text: string; done: boolean };

export type VisionDeskData = {
  v: 1;
  memos: VisionDeskMemo[];
  checklist: VisionDeskCheckItem[];
  scratch: string;
};

export const emptyVisionDesk = (): VisionDeskData => ({
  v: 1,
  memos: [],
  checklist: [],
  scratch: "",
});

function normalizeDesk(raw: unknown): VisionDeskData {
  const base = emptyVisionDesk();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const memos = Array.isArray(o.memos) ? o.memos : [];
  const checklist = Array.isArray(o.checklist) ? o.checklist : [];
  return {
    v: 1,
    memos: memos
      .filter((m): m is VisionDeskMemo => {
        if (!m || typeof m !== "object") return false;
        const x = m as Record<string, unknown>;
        return typeof x.path === "string" && typeof x.createdAt === "string";
      })
      .map((m) => ({ path: m.path, createdAt: m.createdAt })),
    checklist: checklist
      .filter((c): c is VisionDeskCheckItem => {
        if (!c || typeof c !== "object") return false;
        const x = c as Record<string, unknown>;
        return typeof x.id === "string" && typeof x.text === "string" && typeof x.done === "boolean";
      })
      .map((c) => ({ id: c.id, text: c.text, done: c.done })),
    scratch: typeof o.scratch === "string" ? o.scratch : "",
  };
}

export function splitVisionNotes(raw: string | null | undefined): { userNotes: string; desk: VisionDeskData } {
  const s = raw ?? "";
  const i = s.lastIndexOf(VISION_DESK_MARKER);
  if (i === -1) {
    return { userNotes: s, desk: emptyVisionDesk() };
  }
  const userNotes = s.slice(0, i);
  const jsonPart = s.slice(i + VISION_DESK_MARKER.length).trim();
  if (!jsonPart) {
    return { userNotes, desk: emptyVisionDesk() };
  }
  try {
    return { userNotes, desk: normalizeDesk(JSON.parse(jsonPart)) };
  } catch {
    return { userNotes: s, desk: emptyVisionDesk() };
  }
}

export function joinVisionNotes(userNotes: string, desk: VisionDeskData): string {
  const trimmed = userNotes.replace(/\s+$/, "");
  const hasDeskPayload =
    desk.memos.length > 0 ||
    desk.checklist.length > 0 ||
    (typeof desk.scratch === "string" && desk.scratch.trim().length > 0);
  if (!hasDeskPayload) {
    return trimmed;
  }
  return `${trimmed}${VISION_DESK_MARKER}${JSON.stringify(desk)}`;
}
