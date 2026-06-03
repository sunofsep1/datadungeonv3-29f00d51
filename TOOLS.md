# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

## 💰 Cost / Token Discipline (IMPORTANT)

Greg pays per-token on Claude. Be ruthless about efficiency.

**Bulk data ops (exports, reports, batch updates):** Use direct API/DB access, NOT MCP-tool-in-LLM loops.

**Data Dungeon** Supabase is reachable directly via ~/.openclaw/datadungeon-mcp.env (DATADUNGEON_SUPABASE_URL + DATADUNGEON_SUPABASE_SERVICE_ROLE_KEY). Use curl/psql to pull all rows in one shot, then process locally with Python/jq. Never use sub-agents for batch loops — they burn tokens re-reading context every step.

**Reusable scripts** go in ~/.openclaw/workspace/scripts/ so future runs cost $0 in LLM tokens.

**Sub-agents:** Only spawn for tasks needing genuine reasoning across many steps. Never for "loop through N records and do thing" — that's a shell script.

**Conversation:** Short replies when confirmation is enough. No walls of text unless asked.

Don't re-read docs already seen — note key bits here or in skill files.

Cache results: pull once, save to JSON, reuse.

## Voice Transcription

Greg sends voice notes regularly (Telegram, soon WhatsApp). Transcribe every one.

Tool: local whisper CLI (installed via brew, 2026-05-01). No API key needed.

Default command: whisper <file> --model base --language en --output_format txt --output_dir /tmp/whisper-out

base model is fast and accurate enough; bump to medium if accuracy matters.
First run downloaded base.pt (~139MB) into ~/.cache/whisper/.
Inbound voice files land in /Users/gregzee/.openclaw/media/inbound/.

After transcribing: respond to the content of the message, not just the fact that it was a voice note.

## Installed Skills (1 May 2026)

browser-automation (v1.0.1) — Multi-step web flows, login, tab management, recovery from stale refs. Use for market research, property searches, competitor data.

weather (v1.0.0) — Current weather, forecasts, rain, temperature. Used for daily 9am briefing (Redland Bay).

skill-creator (v0.1.0) — Create/edit/improve custom skills. Use for real estate-specific workflows (listing templates, client follow-up sequences, etc.)

taskflow (bundled) — Coordinate multi-step detached tasks with owner context, state, waits. Use for nurture backlog triage & deal workflows.

taskflow-inbox-triage (bundled example) — Pattern for inbox triage, intent routing, waiting. Reference for nurture sequence prioritization.

## PDF Design System (in development)

Goal: Match the aesthetic of Greg's Vesper nurture report (professional, polished, not amateurish).

**Current Tech Stack:**
- Template: HTML5 + CSS (Handlebars templating)
- Renderer: Node.js + Puppeteer (cleaner than reportlab/WeasyPrint)
- Location: /Users/gregzee/.openclaw/workspace/scripts/

contact-sheet-template.html — Main template (11KB, professional design)
render-contact-sheet.js — Puppeteer renderer
build-contacts-pdf.py — Legacy (reportlab, skip this)

**Design Elements (TODO — match Vesper):**
- Header: Contact name + title/role + status badge (🔥🟡🔵) + timeframe
- Contact info bar: Phone/email/source with icons (📞📧🔗)
- Sections: PROPERTY, MOTIVATION, CAMPAIGN, ACTIVITY (uppercase labels, clean borders)
- Colors: Navy (#1e5a96), gold accents, red for hot (🔥), amber for warm (🟡), blue for cold (🔵)
- Spacing: 1.5cm margins, light gray alternating rows, subtle borders
- Footer: Italic callout ("Ready to move. Time to check in. 📞")

**Usage:** node scripts/render-contact-sheet.js /path/to/data.json [output.pdf]

JSON format: name, role, location, status_icon, status_class, timeframe, phone, email, source, property, motivation, campaign, activity.

**Current Rating:** 3/10. Needs design refinement before going live.

---

Add whatever helps you do your job. This is your cheat sheet.