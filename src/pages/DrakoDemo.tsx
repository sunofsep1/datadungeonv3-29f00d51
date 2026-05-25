/**
 * /drako-demo — interactive walking-system sandbox.
 * Accessible without auth. Click zones or buttons to move Drako around.
 * The <DrakoCompanion> is rendered at the app root and floats above this page.
 */
import { useEffect, useRef, useState } from "react";
import { getAnchorPosition } from "@/components/drako/DrakoContext";
import { useDrako } from "@/components/drako";
import { COMPANION_PX } from "@/components/drako/types";
import type { DrakoAnchor, DrakoMood } from "@/components/drako/types";

// ─── data ──────────────────────────────────────────────────────────────────

const CANVAS_ANCHORS: { anchor: DrakoAnchor; label: string; sub: string }[] = [
  { anchor: "sidebar",     label: "Sidebar",     sub: "left nav" },
  { anchor: "header",      label: "Header",      sub: "top of page" },
  { anchor: "center",      label: "Center",      sub: "main content" },
  { anchor: "table",       label: "Data Table",  sub: "contacts list" },
  { anchor: "empty-state", label: "Empty State", sub: "no results" },
];

const ALL_ANCHORS: DrakoAnchor[] = [
  "sidebar", "header", "center", "table", "empty-state", "bottom-right",
];

const ALL_MOODS: DrakoMood[] = [
  "idle", "wave", "celebrate", "confused", "thinking", "sleeping",
  "pointing", "sad", "fire-breath", "teacher", "working", "coffee-break",
  "birthday", "growth-chart",
];

const MOOD_CAPTIONS: Partial<Record<DrakoMood, string>> = {
  celebrate:     "Ripper! That's what I'm talking about.",
  sad:           "Aw no. Something went wrong, mate.",
  sleeping:      "Nothin' here but me and some dust.",
  "fire-breath": "DEAL. CLOSED. 🔥",
  confused:      "Hmm... I've got no idea, mate.",
  thinking:      "Hold on, digging through the dungeon...",
  wave:          "G'day! I live in here.",
  pointing:      "This is your command centre.",
  teacher:       "Let me show you around the dungeon.",
  working:       "Fetching your data... I'm fast, not magic.",
  "coffee-break": "You've worked hard today. Take five.",
  birthday:      "Happy anniversary, legend. 🎂",
  "growth-chart": "Look at ya go. Dungeon's filling up nicely.",
};

const MOOD_COLOR: Record<DrakoMood, string> = {
  idle:           "#607080",
  wave:           "#00BCD4",
  celebrate:      "#FFD600",
  confused:       "#FF7043",
  thinking:       "#5C6BC0",
  sleeping:       "#78909C",
  pointing:       "#00BCD4",
  sad:            "#EF5350",
  "fire-breath":  "#FF6D00",
  teacher:        "#26A69A",
  working:        "#5C6BC0",
  "coffee-break": "#8D6E63",
  birthday:       "#FFD600",
  "growth-chart": "#66BB6A",
};

// ─── ZoneMarker ─────────────────────────────────────────────────────────────

function ZoneMarker({
  anchor, label, sub, active, onClick,
}: {
  anchor: DrakoAnchor; label: string; sub: string; active: boolean; onClick: () => void;
}) {
  const [pos, setPos] = useState(() => getAnchorPosition(anchor));

  useEffect(() => {
    const update = () => setPos(getAnchorPosition(anchor));
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, [anchor]);

  const teal = "#00BCD4";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Move Drako to ${label}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style={{
        position: "fixed",
        left: pos.x - 10,
        top: pos.y - 10,
        width: COMPANION_PX + 20,
        height: COMPANION_PX + 20,
        border: `1.5px dashed ${active ? teal : "rgba(0,188,212,0.22)"}`,
        borderRadius: 12,
        background: active ? "rgba(0,188,212,0.07)" : "transparent",
        boxShadow: active ? `0 0 20px rgba(0,188,212,0.15)` : "none",
        cursor: "pointer",
        zIndex: 50,
        pointerEvents: "auto",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 7,
        gap: 2,
        userSelect: "none",
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: active ? teal : "rgba(0,188,212,0.45)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          transition: "color 0.3s",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.28)" }}>{sub}</span>
    </div>
  );
}

// ─── WalkingDots ─────────────────────────────────────────────────────────────

function WalkingDots({ active }: { active: boolean }) {
  const [n, setN] = useState(1);
  useEffect(() => {
    if (!active) { setN(1); return; }
    const id = setInterval(() => setN((v) => (v % 3) + 1), 400);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return null;
  return (
    <span style={{ color: "#00BCD4", fontWeight: 700, minWidth: 18 }}>
      {".".repeat(n)}
    </span>
  );
}

// ─── DrakoDemo ──────────────────────────────────────────────────────────────

export default function DrakoDemo() {
  const { moveTo, setMood, show, hide, mood, anchor, isWalking, isVisible } = useDrako();
  const captionTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Show Drako when demo mounts, wave hello, then settle to idle
  useEffect(() => {
    show();
    setMood("wave", { caption: "G'day! Click a zone or button to move me." });
    captionTimerRef.current = setTimeout(() => setMood("idle"), 4200);
    return () => {
      clearTimeout(captionTimerRef.current);
      hide();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMoodClick = (m: DrakoMood) => {
    clearTimeout(captionTimerRef.current);
    setMood(m, { caption: MOOD_CAPTIONS[m] });
    if (MOOD_CAPTIONS[m]) {
      captionTimerRef.current = setTimeout(() => setMood(m), 3800);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#07101e",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Canvas: clickable zone markers float here */}
      {CANVAS_ANCHORS.map(({ anchor: a, label, sub }) => (
        <ZoneMarker
          key={a}
          anchor={a}
          label={label}
          sub={sub}
          active={anchor === a}
          onClick={() => {
            clearTimeout(captionTimerRef.current);
            moveTo(a, { mood: mood === "sleeping" ? "idle" : mood });
          }}
        />
      ))}

      {/* Page title — top-center of canvas */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          pointerEvents: "none",
          zIndex: 60,
        }}
      >
        <div style={{ fontSize: 11, color: "rgba(0,188,212,0.6)", letterSpacing: "0.12em", marginBottom: 4, textTransform: "uppercase" }}>
          DataDungeon
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>
          Drako Walking System
        </div>
      </div>

      {/* Walk-sprite placeholder note */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 60,
          background: "rgba(255,109,0,0.1)",
          border: "1px solid rgba(255,109,0,0.3)",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 10,
          color: "rgba(255,109,0,0.8)",
          maxWidth: 220,
          lineHeight: 1.4,
          pointerEvents: "none",
        }}
      >
        <strong>Walk sprites:</strong> using idle↔working placeholders.
        Drop <code>drako-walk-1.webp</code> &amp; <code>drako-walk-2.webp</code> in{" "}
        <code>public/drako/</code> for real walk frames.
      </div>

      {/* ── Control panel (fixed bottom) ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(5, 12, 25, 0.96)",
          backdropFilter: "blur(12px)",
          borderTop: "1.5px solid rgba(0,188,212,0.18)",
          padding: "10px 20px 12px",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Row 1: Anchors */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "rgba(0,188,212,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", minWidth: 48 }}>
            Move
          </span>
          {ALL_ANCHORS.map((a) => (
            <button
              key={a}
              onClick={() => {
                clearTimeout(captionTimerRef.current);
                moveTo(a, { mood: mood === "sleeping" ? "idle" : mood });
              }}
              style={{
                padding: "4px 11px",
                borderRadius: 20,
                border: `1px solid ${anchor === a ? "#00BCD4" : "rgba(0,188,212,0.3)"}`,
                background: anchor === a ? "rgba(0,188,212,0.16)" : "transparent",
                color: anchor === a ? "#00BCD4" : "rgba(255,255,255,0.6)",
                fontSize: 11,
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none",
                fontWeight: anchor === a ? 600 : 400,
                textTransform: "capitalize",
              }}
            >
              {a === "bottom-right" ? "Home ⌂" : a.replace("-", " ")}
            </button>
          ))}
        </div>

        {/* Row 2: Moods */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "rgba(0,188,212,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", minWidth: 48 }}>
            Mood
          </span>
          {ALL_MOODS.map((m) => (
            <button
              key={m}
              onClick={() => handleMoodClick(m)}
              style={{
                padding: "3px 9px",
                borderRadius: 20,
                border: `1px solid ${mood === m ? MOOD_COLOR[m] : "rgba(255,255,255,0.12)"}`,
                background: mood === m ? `${MOOD_COLOR[m]}22` : "transparent",
                color: mood === m ? MOOD_COLOR[m] : "rgba(255,255,255,0.5)",
                fontSize: 10,
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none",
                fontWeight: mood === m ? 600 : 400,
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Row 3: Status + controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: isWalking ? "#FFD600" : isVisible ? "#00BCD4" : "#607080",
                boxShadow: isWalking
                  ? "0 0 6px #FFD600"
                  : isVisible
                    ? "0 0 6px rgba(0,188,212,0.6)"
                    : "none",
                transition: "all 0.3s",
              }}
            />
            <span>
              Drako:{" "}
              <span style={{ color: MOOD_COLOR[mood], fontWeight: 600 }}>{mood}</span>
              {" @ "}
              <span style={{ color: "rgba(255,255,255,0.75)" }}>
                {anchor.replace("-", "‑")}
              </span>
              {" "}
              <WalkingDots active={isWalking} />
              {!isWalking && !isVisible && (
                <span style={{ color: "#607080" }}>(hidden)</span>
              )}
            </span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 9 }}>
              60s idle → sleeping
            </span>
          </div>
          <button
            onClick={() => (isVisible ? hide() : show())}
            style={{
              padding: "4px 14px",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent",
              color: "rgba(255,255,255,0.55)",
              fontSize: 11,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {isVisible ? "Hide Drako" : "Show Drako"}
          </button>
        </div>
      </div>
    </div>
  );
}
