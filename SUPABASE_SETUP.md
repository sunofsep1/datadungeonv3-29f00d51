# Supabase setup (no CLI)

If you get an error when **adding an address** to a contact (or when saving contact edits with address fields), run the SQL script below once.

## Steps

1. **Open Supabase**
   - Go to [supabase.com](https://supabase.com) and sign in.
   - Open your **Data Dungeon** project (the one whose URL and keys you use in `.env`).

2. **Open SQL Editor**
   - In the left sidebar, click **SQL Editor**.

3. **Run the setup script**
   - Open the file `supabase/RUN_THIS_IN_SUPABASE_DASHBOARD.sql` in this project.
   - Copy **all** of its contents.
   - In the SQL Editor, paste into the query box.
   - Click **Run** (or press Cmd+Enter / Ctrl+Enter).

4. **Check the result**
   - You should see "Success. No rows returned" (or similar).
   - If you see an error, copy the full message and we can fix it.

5. **Try the app again**
   - **Hard refresh** your app (Cmd+Shift+R / Ctrl+Shift+R).
   - Add or edit a contact with an address. It should save without error.

---

**What the script does**

- Adds `address_line1`, `address_line2`, `city`, `state`, `postcode`, `country` columns to `contacts`.
- Updates `contact_property_links` so the `buyer` role is allowed.
- Creates two helper functions (`create_contact_with_address`, `update_contact_with_address`) that **bypass** PostgREST's schema cache. The app uses these for contact create/update, so you won't get "schema cache" errors anymore.
- Runs `NOTIFY pgrst, 'reload schema'` so Supabase's API sees the new columns and functions.

You only need to run it once per project. Running it again is safe.

---

**Checklist (if things still don't work)**

1. **Same project?** Make sure the Supabase project in Dashboard matches the `VITE_SUPABASE_URL` in your `.env` file.
2. **Lovable / other hosts?** If you deploy via Lovable, set the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` env vars there.
3. **Columns exist?** In Supabase Dashboard -> Table Editor -> `contacts`, confirm you see `address_line1`, etc.
4. **Functions exist?** In Dashboard -> Database -> Functions, you should see `create_contact_with_address` and `update_contact_with_address`.
5. **Hard refresh** your app (Cmd+Shift+R / Ctrl+Shift+R) after running the script.
