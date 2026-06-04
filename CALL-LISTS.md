# 📞 Call List System

You now have a template system for generating call lists in the 20 Hickory Drive style.

## What You Have

✅ **Generator:** `scripts/generate-call-list.js`
- Converts JSON data → polished HTML
- No dependencies (pure Node.js)
- ~2 seconds to generate

✅ **Template:** `scripts/call-list-template.json`
- Copy to start a new list
- Fill in your contacts in JSON format
- Run generator → done

✅ **Ready Lists**
- `nurture-call-list.html` — Your 10 overdue nurture calls
- `call-lists/20-hickory-drive-buyers.html` — 22 buyer enquiries example

✅ **Documentation**
- `call-lists/SYSTEM.md` — Complete reference guide
- `call-lists/README.md` — Quick overview

## Quick Start

### Create a new call list:

```bash
# 1. Copy template
cp scripts/call-list-template.json call-lists/my-list.json

# 2. Edit my-list.json with your contacts (JSON format)

# 3. Generate HTML
node scripts/generate-call-list.js call-lists/my-list.json

# 4. Open call-lists/my-list.html in browser or commit to git
```

## Design

All lists use the same clean format:
- 🔴 HOT — Urgent calls
- 🟡 WARM — Active but less urgent
- 🔵 COOL — Long-term nurture

Each contact card shows:
- Number + Name + Role
- Phone / Email / Location
- "Wants:" action / next step
- Note with context
- Called / Follow-up buttons

Mobile responsive, print-friendly, no external dependencies.

## Examples to Copy

The JSON format is self-explanatory. See:
- `call-lists/20-hickory-drive-buyers.json` (22 buyer contacts)

Fields:
- `number`: Position (1, 2, 3...)
- `name`: Full name
- `role`: Type/status
- `phone`: Phone or "📵 No phone"
- `email`: Email address
- `overdue`: Days overdue or enquiry date
- `location`: Suburb or status
- `wants`: Next action
- `note`: Context & details

## Deploying to Netlify

```bash
git add call-lists/
git commit -m "Add: property buyer list"
git push
```

Auto-publishes to: `https://your-site.netlify.app/call-lists/my-list.html`

## Making All Your Calls Like This

For each call list you need:
1. Gather contacts in a spreadsheet/CRM
2. Export or manually format as JSON
3. Run generator
4. Commit to git or open locally

Once you have a workflow (e.g., weekly export from DataDungeon), we can automate the JSON export step.

---

**Files:**
- Generator: `scripts/generate-call-list.js`
- Template: `scripts/call-list-template.json`
- Docs: `call-lists/SYSTEM.md` + `call-lists/README.md`
- Examples: `call-lists/*.json` + `call-lists/*.html`
