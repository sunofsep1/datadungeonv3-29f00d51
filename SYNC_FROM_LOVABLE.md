# Get Lovable’s latest version on localhost

When the [live app](https://datadungeonv3.lovable.app) is newer than localhost, follow these steps.

---

## 1. Sync Lovable → GitHub

Lovable syncs edits to GitHub when you save. To ensure the latest is pushed:

1. Open your project in [Lovable](https://lovable.dev)
2. Make a small edit (e.g. add a space and remove it) and save
3. Or look for a GitHub icon / **Sync** / **Push** button and use it

---

## 2. Pull latest into your local project

```bash
cd /Users/gregzee/datadungeon
git pull origin main
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

Or open the app in an incognito/private window.

---

## Quick one-liner

```bash
cd /Users/gregzee/datadungeon && git pull origin main && npm run dev
```

Then hard refresh http://localhost:8080.
