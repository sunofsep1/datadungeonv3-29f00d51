# Fix "Google Calendar: Failed to fetch" — Step-by-step

Follow these steps in order. You can skip a step if you’ve already done it.

---

## Step 1: Make sure you have a `.env` file

1. In your project folder (where `package.json` lives), check if a file named **`.env`** exists.
2. If it **doesn’t** exist:
   - Copy `.env.example` and rename the copy to **`.env`**.
   - On Mac/Linux in Terminal: `cp .env.example .env`
3. Open **`.env`** in your editor (Cursor, VS Code, etc.).

---

## Step 2: Put your Supabase URL and key in `.env`

1. Go to **[Supabase Dashboard](https://supabase.com/dashboard)** and sign in.
2. Open **your project** (the one you use for this app).
3. In the left sidebar click **Project Settings** (gear icon).
4. Click **API**.
5. You’ll see:
   - **Project URL** — something like `https://abcdefgh.supabase.co`
   - **anon public** (under "Project API keys") — a long string
6. In your **`.env`** file, set these two lines (use your real values):

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
   ```

   Replace:
   - `https://YOUR-PROJECT-REF.supabase.co` with your **Project URL**
   - `your-anon-key-here` with your **anon public** key

7. Save `.env`.

---

## Step 3: Restart the app

1. Stop the dev server (in the terminal where `npm run dev` is running, press **Ctrl+C**).
2. Start it again: **`npm run dev`**.
3. Open **http://localhost:8080** and go to the Dashboard.

If the calendar still says "Failed to fetch", continue to Step 4.

---

## Step 4: Deploy the Google Calendar function (optional but needed for Google Calendar)

The calendar widget talks to a "google-calendar" function on Supabase. If that function isn’t deployed, you’ll get "Failed to fetch".

### 4a. Install Supabase CLI (if you don’t have it)

In Terminal:

```bash
npm install -g supabase
```

Or use the installer: https://supabase.com/docs/guides/cli

### 4b. Log in and link your project

```bash
cd /path/to/your/datadungeon
npx supabase login
```

Follow the browser login. Then:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Replace **YOUR_PROJECT_REF** with the short ID from your Project URL (e.g. from `https://abcdefgh.supabase.co` the ref is `abcdefgh`). You can find it in Supabase Dashboard → Project Settings → General → **Reference ID**.

### 4c. Deploy the function

```bash
npx supabase functions deploy google-calendar
```

When it finishes, the function is live on your project.

### 4d. Set the function’s secrets

1. In **Supabase Dashboard** → your project.
2. Left sidebar: **Edge Functions** → click **google-calendar**.
3. Open the **Secrets** (or **Settings**) section for that function.
4. Add:
   - **REDIRECT_BASE_URL** = `http://localhost:8080`
   - **GOOGLE_CLIENT_ID** = (from Google Cloud — see Step 5 if you want to connect real Google Calendar)
   - **GOOGLE_CLIENT_SECRET** = (from Google Cloud)

If you **don’t** need real Google Calendar yet, you can skip Google credentials. The "Failed to fetch" often goes away once the function is deployed and `.env` has the correct `VITE_SUPABASE_URL`. You can add Google credentials later when you want "Connect Google Calendar" to work.

---

## Step 5: (Optional) Google Calendar OAuth — only if you want "Connect Google Calendar"

To let users connect their real Google Calendar:

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Create or select a project → **APIs & Services** → **Credentials**.
3. Create an **OAuth 2.0 Client ID** (Web application).
4. Under **Authorized redirect URIs** add:
   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-calendar?action=callback`
   (use your real Supabase project ref).
5. Copy **Client ID** and **Client secret** into the Edge Function secrets as **GOOGLE_CLIENT_ID** and **GOOGLE_CLIENT_SECRET** (Step 4d).
6. In the app: **Disconnect** (if it says connected) then **Connect Google Calendar** and sign in with Google.

---

## Quick checklist

- [ ] `.env` exists and has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Values in `.env` match Supabase Dashboard → Project Settings → API
- [ ] Restarted dev server after changing `.env`
- [ ] Deployed: `npx supabase functions deploy google-calendar`
- [ ] (Optional) Set Edge Function secrets: `REDIRECT_BASE_URL`, and Google keys if you want real Google Calendar

If you’re still stuck, say which step you’re on and what you see (e.g. an error message or screenshot).
