# Drako CRM Integration Guide

Drako is a floating pixel-art dragon mascot that reacts to CRM events. He already walks, talks, idles, and sleeps — this guide tells you exactly where to wire him into DataDungeon's existing pages.

---

## The API (one import, three calls)

```tsx
import { useDrako } from "@/components/drako";

const { moveTo, setMood, show, hide } = useDrako();

// Move Drako to a zone and optionally change mood at the same time
moveTo("center", { mood: "celebrate" });

// Set mood + optional caption (caption auto-dismisses after ~3s if you want)
setMood("fire-breath", { caption: "DEAL. CLOSED. 🔥" });

// Just a mood change, no movement
setMood("thinking");
```

### Available moods

| Mood | When to use |
|------|-------------|
| `idle` | Default resting state |
| `wave` | Greet, page load, nurture sent |
| `celebrate` | Task ticked off, contact saved, goal hit |
| `fire-breath` | Listing sold, deal closed, hot lead |
| `thinking` | AI/async operation starting |
| `working` | Long fetch in progress |
| `confused` | Error, validation fail, no results |
| `sad` | Delete action, bad news |
| `sleeping` | Empty page, no activity (auto after 60s idle) |
| `pointing` | Onboarding, first-time hint |
| `teacher` | Tip/tutorial card visible |
| `growth-chart` | Pipeline stage advanced, performance up |
| `birthday` | Contact birthday or anniversary today |
| `coffee-break` | Session idle >30min, end of day |

### Available anchor zones

`"sidebar"` · `"header"` · `"center"` · `"table"` · `"empty-state"` · `"bottom-right"` (home)

---

## Integration points

### 1. Task / Todo completed
**File:** `src/pages/Tasks.tsx`  
**Where:** The todo toggle handler around line 120 — look for `{ id: todo.id, completed: !todo.completed }` inside a mutation call. The `onError` callback already has a toast; add Drako to the success path alongside it.

```tsx
// Add at top of the Tasks component:
const { setMood } = useDrako();

// In the mutation's onSuccess (or directly after the mutate call succeeds):
if (!todo.completed) { // about to mark complete
  setMood("celebrate", { caption: "Ripper! Knocked that one off." });
}
```

---

### 2. Listing marked Sold
**File:** `src/pages/ListingDetail.tsx`  
**Where:** `handleStatusChange` function (~line 332). The "Mark Sold" button calls `handleStatusChange("sold")` at line 882.

```tsx
const { moveTo } = useDrako();

const handleStatusChange = async (status: ListingStatus) => {
  // ... existing logic ...
  await updateListing.mutateAsync({ id, status });
  toast({ title: "Updated", description: `Status set to ${status}` });

  // Add this:
  if (status === "sold") {
    moveTo("center", { mood: "fire-breath" });
    setTimeout(() => setMood("celebrate", { caption: "DEAL. CLOSED. 🔥" }), 1200);
  }
};
```

---

### 3. Contact saved (ContactDetail)
**File:** `src/pages/ContactDetail.tsx`  
**Where:** `handleSaveEdit` function (~line 400). The save calls `updateContact.mutateAsync(payload)`.

```tsx
const { setMood } = useDrako();

// After successful save (in the try block, after mutateAsync resolves):
setMood("wave", { caption: "Contact locked in, mate." });
```

---

### 4. Empty state (Contacts list)
**File:** `src/pages/Contacts.tsx`  
**Where:** Line 2778 — `{filteredAndSortedContacts.length === 0 ? (` — this renders the empty state UI.

```tsx
// Inside the empty-state branch, add a useEffect that fires when it becomes visible:
useEffect(() => {
  if (filteredAndSortedContacts.length === 0) {
    moveTo("empty-state", { mood: "sleeping" });
  } else {
    moveTo("bottom-right", { mood: "idle" });
  }
}, [filteredAndSortedContacts.length]);
```

---

### 5. AttentionHub page load (daily greeting)
**File:** `src/pages/AttentionHub.tsx`  
**Where:** Add a one-time `useEffect` at the top of the component.

```tsx
const { moveTo } = useDrako();

useEffect(() => {
  // Greet once per session when landing on the hub
  const key = `drako-greeted-${new Date().toDateString()}`;
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    moveTo("header", { mood: "wave" });
    setTimeout(() => setMood("idle"), 3500);
  }
}, []);
```

---

### 6. Hot Leads page
**File:** `src/pages/HotLeads.tsx`  
**Where:** On mount, or when the hot leads list loads and has results.

```tsx
useEffect(() => {
  if (hotLeads && hotLeads.length > 0) {
    moveTo("table", { mood: "fire-breath" });
    setTimeout(() => setMood("pointing", { caption: "These ones need you today." }), 1600);
  }
}, [hotLeads?.length]);
```

---

### 7. Nurture step completed
**File:** `src/pages/Tasks.tsx` (also used in `Nurture.tsx`)  
**Where:** `completeStep` mutation's `onSuccess`. The hook is `useCompleteNurtureStepAndAdvance()`.

```tsx
// In the onSuccess of completeStep:
setMood("wave", { caption: "Nurture step done — sequence rolling." });
```

---

### 8. Pipeline stage advanced (Listings board)
**File:** `src/pages/ListingsSalesBoard.tsx` or `src/pages/Pipeline.tsx`  
**Where:** Any mutation that advances a pipeline stage (look for `pipeline_stage` update calls).

```tsx
// On successful stage change:
setMood("growth-chart", { caption: "Moving on up. Keep it going." });
```

---

## Notes for Cursor

- `useDrako()` is safe to call in any component inside `<DrakoProvider>` — the provider wraps the entire app in `App.tsx`.
- Don't call `show()` or `hide()` in page components — Drako's visibility is managed globally and he auto-shows on the demo. Just call `setMood` or `moveTo`.
- Caption strings auto-dismiss after Drako's idle timer (they're cleared when mood changes). You don't need to manually clear them.
- Keep captions short (≤8 words), Australian tone where it fits the moment.
- `moveTo` triggers a spring-physics walk animation. `setMood` changes the sprite in place. For big moments (sold, celebrate), do `moveTo` first and chain `setMood` with a `setTimeout` for the one-two punch.
- TypeScript: both `mood` and `anchor` are strictly typed — hover for the union types or import `DrakoMood` / `DrakoAnchor` from `@/components/drako`.
