# Sync production to localhost

When the [live Netlify app](https://tiny-brioche-b979f7.netlify.app) is newer than localhost, pull the latest code from GitHub.

---

## 1. Pull latest from GitHub

```bash
cd /Users/gregleigh/datadungeon-1
git pull latest main
```

If `git pull` fails on auth, use SSH (see README §11).

---

## 2. Install deps (if package.json changed)

```bash
npm install
```

---

## 3. Restart the dev server

```bash
# Stop the current server (Ctrl+C), then:
npm run dev
```

---

## 4. Hard refresh the browser

- **Mac:** Cmd + Shift + R
- **Windows:** Ctrl + Shift + R

Or open http://localhost:8080 in a private window.

---

## Backend changes

If a teammate (or you) added Supabase migrations:

```bash
npm run db:push
npm run supabase:gen-types   # optional, refreshes src/integrations/supabase/types.ts
```

---

## Quick one-liner

```bash
cd /Users/gregleigh/datadungeon-1 && git pull latest main && npm install && npm run dev
```

Then hard refresh http://localhost:8080.
