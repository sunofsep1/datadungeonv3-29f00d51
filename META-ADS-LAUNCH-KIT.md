# Meta Ads Launch Kit — Redlands Seller Leads

**For:** Greg Leigh · Queensland Sotheby's International Realty (Redlands, QLD)
**Funnel (live):** https://datadungeon-lead-funnel.netlify.app · **Lead source tag:** `meta_valuation_lp`
**Goal:** Vendor (seller) appraisal leads → `inbound-lead` → CRM → instant alert + prospect ack + your approved reply.

> Backend status (as of this build): `inbound-lead` v70 deployed. On each Meta seller lead it (1) SMS-alerts you, (2) sends the prospect an instant branded acknowledgement, (3) drafts your one-tap booking reply, (4) nurture-enrols timelines > 3 months. The SMS "success" logging bug is fixed.

---

## 0. Two ways to run the ads — pick the path

| Path | How leads arrive | Effort | Recommended |
|---|---|---|---|
| **A. Traffic → your landing page** | Ad click → `datadungeon-lead-funnel` → form posts to `inbound-lead` (already wired) | **Low — nothing new to build** | ✅ **Start here** |
| **B. Meta Instant Form** | Native in-feed form → Zapier → `inbound-lead` | Medium — needs Zapier + field mapping | Add later to A/B test |

Path A reuses everything you've already built and shipped. Launch on A, prove CPL, then test B for cheaper volume. §5 covers B when you're ready.

---

## 1. Campaign structure (Path A)

```
Campaign  ── Objective: Leads (or Sales) · Special Ad Category: HOUSING (mandatory)
  └ Ad set ── Location: Redlands + suburbs · Conversion: landing-page lead event
      ├ Ad 1  (video — piece to camera)
      ├ Ad 2  (single image — recent local sale)
      └ Ad 3  (carousel — suburb-by-suburb)
```

Keep it to **one campaign, one ad set, 3 ads** at launch. Let Meta optimise between the creatives before you split ad sets.

---

## 2. ⚠️ Housing Special Ad Category — do this first

Real-estate ads MUST be flagged **Housing** at campaign creation (Meta enforces anti-discrimination law). Consequences you must design around:

- **No** targeting by age, gender, or detailed demographics/interests.
- **No** tight radius — minimum ~15 mi / ~24 km around a location.
- Location targeting is broad; you cannot exclude by postcode the way normal ads can.

**So win on message, not micro-targeting:** the ad creative itself ("Thinking of selling in the Redlands?") does the qualifying. Broad reach + sharp local message is the play.

---

## 3. Targeting & budget (Path A)

- **Location (broad — exclude no one):** Per Greg's call, cast the widest sensible net. Set the pin on the bayside Redlands (Cleveland/Victoria Point/Redland Bay/Thornlands/Wellington Point/Ormiston) and **expand the radius to cover Greater Brisbane / South-East QLD** — don't restrict to just the Redlands suburbs. Housing rules already force a wide radius; lean into it. Include everyone; let the **creative** ("Thinking of selling in the Redlands?") do the self-selecting rather than the targeting.
  - *One honest trade-off to watch:* the wider you go, the more spend reaches people outside your service area. That's fine to start — just review the leads' suburbs after week 1. If too many land well outside the bayside, tighten the pin slightly; if reach/CPL is healthy, keep it broad.
- **Age/gender/interests:** leave fully open — no exclusions, no detailed targeting (Housing rules lock this anyway, which suits the "exclude no one" goal).
- **Placements:** Advantage+ (let Meta run FB + IG feeds, Stories, Reels).
- **Optimisation event:** the landing-page **Lead** event (see §4). If the Pixel isn't collecting data yet, optimise for **Landing Page Views** for the first ~week, then switch to Lead.
- **Budget:** start **$30–50 AUD/day**. At AU vendor CPL ~$30–49 that's roughly 1 lead/day to start. Give it 7 days before judging.
- **Bidding:** Highest volume (default). Don't set a cost cap until you know your real CPL.

---

## 4. Tracking — Pixel + Conversions API

1. Create/verify a **Meta Pixel** in Events Manager; add it to the landing-page `<head>` (and the domain `datadungeon-lead-funnel.netlify.app` under Verified Domains).
2. Fire a **Lead** standard event on successful form submit (the "Get my free appraisal" success state).
3. Recommended: also set up **Conversions API** (server-side) so iOS/ad-blocker loss doesn't blind your optimisation. The `lead-intake` Netlify function is the natural place to send the server event.
4. This lets Meta optimise toward people who actually *submit*, not just click — the single biggest lever on lead quality.

---

## 5. Path B (later) — Instant Form → `inbound-lead` field mapping

If/when you add a native Instant Form, map Zapier's "New Lead" → POST to `inbound-lead` with this JSON. Match the fields the funnel already sends so leads look identical in the CRM:

```json
{
  "owner_user_id": "e1bd63ad-b120-4a5a-91c0-c3189bc8938c",
  "first_name": "{{first_name}}",
  "last_name": "{{last_name}}",
  "email": "{{email}}",
  "phone": "{{phone}}",
  "source": "meta_valuation_lp",
  "property_interest": "{{address}}",
  "timeline": "{{when_selling}}",
  "lead_type": "seller"
}
```

- `Authorization: Bearer <INBOUND_WEBHOOK_SECRET>` header (same secret the landing page uses).
- `source` **must** start with `meta_` and `lead_type: seller` so the speed-to-lead automation fires (`isMetaSellerLead`).
- Keep the Instant Form's timeline options identical to the landing page ("Ready now / 0–3 / 3–6 / 6–12 / Just curious") so nurture routing works unchanged.

---

## 6. Ad copy — 3 ready-to-run variants

**Primary text and headlines below. Keep the Sotheby's brand visible — it self-selects better vendors. All claims must be true (ACL + brand standards).**

### Ad 1 — Video, piece-to-camera (the workhorse)
**On-screen / spoken (15–30s):**
> "Hi, I'm Greg Leigh with Queensland Sotheby's International Realty here in the Redlands. If you've ever wondered what your home's actually worth in today's market, I'll give you a free, no-obligation appraisal — a real local read, not an online guess. Tap below and I'll be in touch personally."

**Primary text:**
> Curious what your Redlands home is worth in today's market? Get a free, no-obligation appraisal from a local specialist — not a call centre, not an online estimate. Takes 30 seconds. 🏡

**Headline:** What's your Redlands home worth?
**Description:** Free appraisal · Local expert · No obligation
**CTA button:** Learn More (→ landing page)

### Ad 2 — Single image, recent local proof
**Primary text:**
> Thinking of selling in the Redlands? The market's moving — [suburb] homes are in demand. Find out what yours could achieve with a free, no-obligation appraisal from Greg Leigh, Queensland Sotheby's International Realty.

**Headline:** Free Redlands home appraisal
**Description:** A local expert's honest read on your property's value
**Creative:** A clean, real photo of a recent local sale or a bayside Redlands street. (If you use "Sold" or a price, it must be a genuine, verifiable result.)

### Ad 3 — Carousel, suburb-by-suburb
**Primary text:**
> How's the market in your street? Cleveland, Wellington Point, Ormiston, Redland Bay — I work all of it. Swipe to your suburb and get a free, no-obligation appraisal.

**Cards:** one per suburb, each with the suburb name + "See what your home's worth →", all linking to the landing page.
**Headline (per card):** [Suburb] home values

---

## 7. Creative direction (what makes real-estate ads convert)

- **Lead with the suburb** — local relevance beats generic every time.
- **Show your face** — a short piece-to-camera builds the trust a vendor needs before they hand over an address.
- **One CTA per ad** — "free appraisal," nothing else.
- **Refresh every 3–4 weeks** — creative fatigues fast; have the next batch ready.
- **Brand forward** — the Sotheby's badge is your differentiator against the sea of generic agent ads.

---

## 8. Launch checklist

- [ ] Campaign created with **Housing** Special Ad Category
- [ ] Pixel installed + domain verified; **Lead** event fires on submit
- [ ] Location = pin on bayside Redlands, radius expanded broad across Greater Brisbane / SEQ (exclude no one); placements Advantage+
- [ ] 3 ads uploaded (1 video, 1 image, 1 carousel)
- [ ] Budget $30–50/day, Highest-volume bidding
- [ ] **Submit one real test lead through the ad → landing page** and confirm: CRM contact created, your alert SMS lands, prospect gets the ack SMS, draft-reply notification appears
- [ ] Privacy policy live (not just a `#privacy` anchor) + SMS consent wording checked
- [ ] Day 7: review CPL. Pause any ad above ~$50/lead; scale the winner.

## 9. What to watch (targets)

| Metric | Healthy (AU real estate) | Action if off |
|---|---|---|
| Cost per lead | $26–49 AUD | > $60 → refresh creative / tighten offer |
| Click-through rate | ~2–3.75% | Low → new hook/first line |
| Landing page → submit | aim 20%+ | Low → shorten form / stronger headline |
| Lead → appraisal booked | your speed drives this | Answer/approve within 5 min |

---

*Path A needs nothing new built — you can launch this week. The backend already handles the lead the moment it lands. First dollar of spend should wait only on: Pixel + Lead event, and the live privacy policy.*
