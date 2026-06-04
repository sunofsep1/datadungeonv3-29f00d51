# Call List Generation System

**Quick Start:** Create a JSON file, run a command, get a polished HTML call list.

## Files

- `scripts/generate-call-list.js` — Converts JSON → HTML
- `scripts/call-list-template.json` — Copy this to start a new list
- `call-lists/` — Your call list data & output

## Creating a New Call List

### 1. Create JSON Data File

Copy `scripts/call-list-template.json` and fill in your contacts:

```bash
cp scripts/call-list-template.json call-lists/my-list.json
```

Edit `call-lists/my-list.json`:

```json
{
  "title": "📞 My Call List Title",
  "subtitle": "Description · Generated DATE · Source",
  "filename": "my-list.html",
  "sections": [
    {
      "title": "HOT — Urgent (3 contacts)",
      "emoji": "🔴",
      "type": "hot",
      "contacts": [
        {
          "number": 1,
          "name": "John Smith",
          "role": "Seller, prep phase",
          "phone": "0412 345 678",
          "email": "john@example.com",
          "overdue": "5 days overdue",
          "location": "Redland Bay, QLD",
          "wants": "Lock in appraisal date",
          "note": "Hot prospect. Property ready for listing. Step 3 of sequence."
        }
      ]
    },
    {
      "title": "WARM — Active (2 contacts)",
      "emoji": "🟡",
      "type": "warm",
      "contacts": []
    },
    {
      "title": "COOL — Long-term (1 contact)",
      "emoji": "🔵",
      "type": "cold",
      "contacts": []
    }
  ],
  "footer": "Location · List Type · CRM-verified DATE · DataDungeon"
}
```

### 2. Generate HTML

```bash
node scripts/generate-call-list.js call-lists/my-list.json
```

Output: `call-lists/my-list.html` (automatically named from `filename` field in JSON)

### 3. Open or Deploy

**Local:** Open `call-lists/my-list.html` in browser

**Netlify:** Push to repo, auto-deploys

```bash
git add call-lists/
git commit -m "Add new call list: my-list"
git push
```

URL: `https://your-site.netlify.app/call-lists/my-list.html`

## Field Reference

### Top-level Fields
- `title` — Page title + header
- `subtitle` — Location, date, source info
- `filename` — Output HTML filename
- `sections` — Array of sections (HOT, WARM, COOL)
- `footer` — Footer text

### Section Fields
- `title` — e.g., "HOT — Urgent (3 contacts)"
- `emoji` — 🔴 / 🟡 / 🔵
- `type` — "hot" | "warm" | "cold" (for badge colors)
- `contacts` — Array of contact objects

### Contact Fields
- `number` — Position in list (1, 2, 3, ...)
- `name` — Full name
- `role` — Type/status (e.g., "Seller, prep phase")
- `phone` — Phone number or "📵 No phone" or empty
- `email` — Email address or empty
- `overdue` — "5 days overdue" or "Enquired 15 May" or empty
- `location` — "City, QLD 4000" or "Pre-approval ready" or empty
- `wants` — What they need next
- `note` — Context, property details, sequence info

## Examples

See `call-lists/` for examples:
- `nurture-call-list.html` — Nurture sequences (10 due contacts)
- `20-hickory-drive-buyers.html` — Buyer enquiry list (22 contacts)

## Customizing Style

Edit `scripts/generate-call-list.js` to change:
- Colors (emoji badges for hot/warm/cool)
- Layout (grid columns, spacing, fonts)
- Button labels
- Response styling on hover

## DataDungeon Integration

To auto-pull contacts from DataDungeon CRM:

1. Create a Python script that queries DataDungeon API
2. Export to JSON in the format above
3. Run `node scripts/generate-call-list.js output.json`

Example script: `scripts/export-dd-calls.py` (not yet written)

## Notes

- All lists use the same template
- Mobile-responsive (single column on small screens)
- Print-friendly (white background, clean borders)
- No external dependencies (pure HTML/CSS)
- Ready for Netlify or any static host
