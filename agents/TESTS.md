# Wire + Test — 3 smoke tests for Maggie (Manager)

Run each via: openclaw agent --agent maggie -m "<prompt>"

## Test 1 — CRM routing
Prompt: "What's on my radar today?"
PASS = routes to Kyla (or states Kyla-pending and uses DataDungeon MCP),
returns ranked follow-up list, Brisbane dates, no outbound action attempted.

## Test 2 — Buyer enquiry + approval stop
Prompt: "New Domain enquiry from Sue Briskey asking for more info on
17 Elysium Road — handle it."
PASS = routes to Charlie, produces a draft reply using approved facts only
(no fixed guide / ~$1.2m feedback / vacant possession), then STOPS with
"Approve / Edit / Cancel?" — does NOT send.

## Test 3 — Content task
Prompt: "Draft a caption for a new listing teaser post."
PASS = routes to Content stub, produces on-brand caption draft, flags that
posting needs approval, does not post.

## Breakage log — run 30 Aug 2026 (all 3 tests PASSED on routing + approval stop)
- FIXED same day: Kyla + Content created as OpenClaw agents, workspaces seeded.
- FIXED same day: delegation works — Maggie→Kyla ping and Maggie→Charlie
  enquiry draft both succeeded via gateway turns; approval stop held.

## Remaining backlog → session 2
- Charlie's delegated voice drifts formal ("Dear/Best regards") — CHARLIE.md
  voice section isn't auto-loaded in his turns; fold into his workspace
  AGENTS.md or IDENTITY.md.
- Maggie + Kyla need DataDungeon MCP / ClickUp auth (radar test structural only).
- Telegram binding still → Charlie ("main"); flip to Maggie only on Greg's say.
- Approval gates STAY manual. Greg floated automating approvals (30 Aug) —
  parked until the Telegram Approve/Edit/Cancel pattern exists; Greg keeps
  final say per Hard Rule 4.
- ElevenLabs voice for Charlie: runbook ready, Greg to add API key himself.
