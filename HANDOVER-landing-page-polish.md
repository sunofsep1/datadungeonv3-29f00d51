# Handover → Work-Claude: Landing Page Polish + Sync Notes

**From:** Cowork session (Greg's home machine) · **Date:** 16 Jul 2026
**Site:** `datadungeon-lead-funnel` → https://datadungeon-lead-funnel.netlify.app
**Note:** the funnel source is NOT in the `datadungeonv3-29f00d51` repo/checkout on the home machine — it lives in your working copy. These changes are yours to apply + deploy.

---

## A. What Greg asked for

1. **Add a photo of him** to the landing page (currently `/assets/greg-avatar.jpg` is referenced but not rendering / not placed well — no photo is visible on the live hero).
2. **Tidy the layout** — "a bit skew in places and not spaced great."
3. Brand reference: his work site **https://queenslandsothebysrealty.com/** (QSIR navy + gold + serif).
4. He has a professional headshot ready (navy suit, standing on a green lawn in front of a home — on-brand, matches QSIR navy). He'll supply the file.

---

## B. The photo — integration steps

1. Greg saves the headshot as **`greg-portrait.jpg`** (≈1200px on the long edge, JPG, < 300 KB) into the funnel's **`public/assets/`** (or wherever `qsir-logo-navy.png` lives), so it serves at **`/assets/greg-portrait.jpg`**.
2. Use it as the **hero image**, not a tiny avatar. The current `greg-avatar.jpg` slot can be repurposed or replaced.
3. Add `alt="Greg Leigh, Queensland Sotheby's International Realty — Redlands"`, `loading="eager"` on the hero image, responsive `max-width:100%`.

---

## C. Layout fixes (from the live screenshots)

**Problem → fix:**

1. **Hero is a tall navy band with a big empty left half; text floats unbalanced, no photo.**
   → Make the hero a **2-column grid** on desktop: **left = copy + CTA**, **right = Greg's portrait** (full-height, object-fit: cover, subtle rounded corner or full-bleed to the navy). Collapse to **single column** on mobile: headline → short blurb → CTA → photo. This alone kills the "skew/empty" feel.

2. **The identity band (`Greg Leigh | QSIR | Cleveland · Wellington Point · Ormiston`) appears mid-page AND again in the footer — redundant.**
   → Keep it in **one** place. Simplest: drop the mid-page band, keep a clean footer version. Or keep a slim sub-hero strip and simplify the footer to logo + licence line.

3. **Inconsistent vertical spacing between sections.**
   → Standardise section padding: **desktop ~80–96px top/bottom, mobile ~48–56px**. One shared container **max-width ~1120px, centered, ~24px side padding**. Apply the same rhythm to hero, form, footer.

4. **Form step shows a short empty navy band above the card (dead space on inner steps).**
   → On the form view, either show a compact branded header (logo + one line) or remove the empty band so the card sits with balanced whitespace. Keep the 4-step progress bar.

5. **General polish:** consistent gold for CTAs (`Get my free appraisal` / `Continue`), same border-radius on buttons + inputs + card, and align the header logo, hero, and footer to the same container width so nothing looks off-centre.

**Brand tokens (match queenslandsothebysrealty.com):** deep navy background, warm cream section, **gold accent** for CTAs/rules, **serif** display for headlines (the italic gold "Redlands" treatment is good — keep it), clean sans for body. Don't over-restyle what already matches — the type and colours are close; it's mostly **layout + the photo**.

---

## D. Keep working / don't break

- The 4-step form (address autocomplete → timeline → property → contact) already posts to `inbound-lead` as `source: "meta_valuation_lp"`, `lead_type: seller`. **Don't change the field names or the source tag** — the speed-to-lead automation keys off `meta_` + `seller`.
- Privacy consent line stays; see item F.

---

## E. ⚠️ Sync note — I deployed `inbound-lead` v70 from the Cowork session

I updated the **seller-lead automation** and deployed **`inbound-lead` v70** via the Supabase MCP. Two changes:

1. **New: prospect auto-acknowledgement SMS.** On a Meta seller lead, the prospect now gets an instant branded ack ("Hi [name], thanks for requesting a property appraisal — it's Greg Leigh from Queensland Sotheby's International Realty… Reply STOP to opt out."). Greg's one-tap approval flow for the real booking reply is unchanged.
2. **Bug fix:** Mobile Message returns `status:"success"`, but the code only treated `"sent"` as delivered — so every delivered SMS logged as `failed` with `error:"Mobile Message: success"`. Added `mmDelivered()` accepting `success/sent/queued/delivered/ok`.

**Files (already written to the home checkout, matching prod v70):**
`supabase/functions/inbound-lead/index.ts` and `supabase/functions/_shared/sellerLeadAutomation.ts` (uses existing `_shared/smsCore.ts`).

**Action for you:** pull/reconcile these into your repo and commit so git = production (v70). Don't redeploy an older `inbound-lead` or you'll revert the fix + the auto-ack.

---

## F. Still open (not blocking ads, but do before scaling spend)

1. **Privacy policy** — footer links to `#privacy` (an anchor, not a page). Make it a real page/section with how data is stored/used. Required for compliant lead capture.
2. **RLS disabled on 9 tables** — `pipelines, pipeline_stages, workflows, sequences, sequence_enrollments, lists, list_memberships, deal_contacts, contact_companies`. Anyone with the anon key can read/write. Enable RLS **with policies** (don't blind-enable). `sequence_enrollments` in particular can hold contact data.
3. **Meta Pixel + Lead event** on the funnel (see META-ADS-LAUNCH-KIT.md §4) so ads optimise toward submitters.

---

*Ad targeting has been set to "broad / exclude no one" (Greater Brisbane + SEQ radius) in `META-ADS-LAUNCH-KIT.md` per Greg. The rest of the funnel backend is live and working.*
