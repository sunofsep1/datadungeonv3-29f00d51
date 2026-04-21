/**
 * Starter nurture pack — 21 sequences (11 seller, 10 buyer).
 *
 * Cadence rationale (residential — adapt to your market):
 * - Speed-to-lead: same-day call + instant email/SMS pattern matches common high-converting lead handling.
 * - OTM (on-the-market): 2–3 touches/week in the first month aligns with peak enquiry and vendor feedback needs; tapers to weekly formal reviews.
 * - Long-cycle (12–24 mo): spacing starts ~2–4 weeks, moves to ~60–90 days, then quarterly / semi-annual so prospects don’t feel “spammed”.
 *
 * Channels: `email` = automated when sequence runner + Resend run. `task` / `prompt` = you execute (call, SMS, social DMs, prep). Titles prefix the channel for scanning.
 * Each step’s `offset_days` = days from enrollment start (absolute).
 */

export type StarterSequenceStep = {
  offset_days: number;
  step_type: "task" | "prompt" | "email";
  title: string;
  body: string;
  email_subject?: string;
  email_html?: string;
};

export type StarterNurtureSequence = {
  name: string;
  description: string;
  steps: StarterSequenceStep[];
};

const P = (html: string) =>
  `<p style="margin:0 0 12px;font-family:system-ui,sans-serif;font-size:15px;line-height:1.45;color:#1a1a1a">${html}</p>`;

export const STARTER_NURTURE_SEQUENCES: StarterNurtureSequence[] = [
  // —— SELLERS (5) ——
  {
    name: "Seller · New client — appraisal & listing path (30 days)",
    description:
      "New seller or appraisal lead: qualify fast, book appraisal, deliver strategy, written summary, listing readiness. Typical decision window 2–4 weeks.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "Call: thank-you + qualify (why, when, who else)",
        body: "Capture motivation, rough timing, other agents, target price. Book on-site appraisal before you hang up if possible.",
      },
      {
        offset_days: 0,
        step_type: "email",
        title: "Email: thanks — what happens next",
        body: "",
        email_subject: "Thanks for getting in touch",
        email_html: `${P(
          "Hi there,<br/><br/>Thank you for contacting me. I’ll phone you shortly to learn more and arrange a time to view the property."
        )}${P("For anything urgent, reply here or use the mobile in my signature.")}`,
      },
      {
        offset_days: 1,
        step_type: "task",
        title: "SMS: confirm appraisal date / access / pets",
        body: "Short text: time, parking, tenants, pets, keys or codes.",
      },
      {
        offset_days: 3,
        step_type: "task",
        title: "Social: human touch (if connected)",
        body: "Genuine comment/like on something non-real-estate — keep relationship warm.",
      },
      {
        offset_days: 5,
        step_type: "task",
        title: "Call: pre-appraisal — set agenda",
        body: "Comps, method of sale, fees, marketing overview, staging. Manage expectations on price evidence.",
      },
      {
        offset_days: 7,
        step_type: "task",
        title: "Call / visit: appraisal + campaign conversation",
        body: "Deliver range and rationale; agree when they get writing; path to listing agreement.",
      },
      {
        offset_days: 10,
        step_type: "email",
        title: "Email: written appraisal / strategy summary",
        body: "",
        email_subject: "Your property — summary & recommended approach",
        email_html: `${P(
          "Hi there,<br/><br/>Following our conversation, here is a concise written summary of comparable sales and how I’d position your home in the current market."
        )}${P("Reply with any questions — I’m happy to refine method, timing, or presentation.")}`,
      },
      {
        offset_days: 12,
        step_type: "task",
        title: "SMS: check written pack landed",
        body: "\"Hi [name], just making sure my email arrived — call me anytime.\"",
      },
      {
        offset_days: 16,
        step_type: "task",
        title: "Call: objections, method of sale & listing date",
        body: "Price pushback, auction vs private, fee clarity. Aim for listing week or honest deferral.",
      },
      {
        offset_days: 21,
        step_type: "task",
        title: "Call: listing readiness — compliance & marketing",
        body: "Photos, copy input, disclosures, signboard, launch fee if applicable.",
      },
      {
        offset_days: 30,
        step_type: "task",
        title: "Call: 30-day branch — list, pause, or 24-mo nurture",
        body: "If not ready: enroll long-cycle seller pack. If listing: move to pre-list or OTM sequence.",
      },
    ],
  },
  {
    name: "Seller · OTM — on-market intensive (90 days)",
    description:
      "Property is live: heavier contact in weeks 1–4 (often 2–3 meaningful touches/week), then structured weekly/fortnightly reviews through day 90 — matches high vendor need for feedback while enquiry is hot.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: campaign cadence & how feedback flows", body: "Opens, privates, reporting rhythm, best number for news." },
      { offset_days: 1, step_type: "task", title: "SMS: launch / first open reminder", body: "Times, access, anything to prep before buyer traffic." },
      {
        offset_days: 2,
        step_type: "email",
        title: "Email: we’re live — what to expect this week",
        body: "",
        email_subject: "Your campaign is live",
        email_html: `${P(
          "Hi there,<br/><br/>Your listing is now active. I’ll keep feedback tight and honest after each inspection round."
        )}${P("Reach me anytime on my mobile if something feels unclear.")}`,
      },
      { offset_days: 4, step_type: "task", title: "Call: first buyer feedback round", body: "Quantity + quality of interest; qualitative comments; no sugar-coating." },
      { offset_days: 6, step_type: "task", title: "SMS: mid-week check", body: "\"Quick note — how are you feeling after [opens]? More detail on the call tomorrow.\"" },
      { offset_days: 7, step_type: "task", title: "Call: end of week 1 — temperature & tweaks", body: "Access, price guide posture, presentation tweaks if needed." },
      { offset_days: 10, step_type: "task", title: "Social: listing visibility (per your vendor rules)", body: "Boost or story if agreed; tag strategy compliance." },
      { offset_days: 14, step_type: "task", title: "Call: fortnight — written digest + verbal walk-through", body: "Stats + themes; serious buyers vs noise." },
      {
        offset_days: 15,
        step_type: "email",
        title: "Email: fortnightly campaign snapshot",
        body: "",
        email_subject: "Two-week campaign update",
        email_html: `${P(
          "Hi there,<br/><br/>Here’s a short snapshot of enquiry, inspections, and buyer feedback from the first fortnight."
        )}${P("I’ll follow up by phone to talk through options.")}`,
      },
      { offset_days: 17, step_type: "task", title: "SMS: after email — open for quick questions", body: "Light text so they know you’re available." },
      { offset_days: 21, step_type: "task", title: "Call: day-21 strategy checkpoint", body: "Price evidence vs silence; photo/copy refresh; additional channel." },
      { offset_days: 24, step_type: "task", title: "Call: second monthly rhythm — momentum", body: "Repeat buyers, second inspections, any offers on foot." },
      { offset_days: 28, step_type: "task", title: "Call: week-4 formal review", body: "Evidence-based read: adjust guide, incentives, or hold firm with plan." },
      { offset_days: 35, step_type: "task", title: "Call: day 35 — buyer depth & objections", body: "Finance fallout, conditions, competing stock." },
      { offset_days: 42, step_type: "task", title: "Call: week 6 — campaign health", body: "Refresh plan or stay course; vendor psychology check." },
      {
        offset_days: 49,
        step_type: "email",
        title: "Email: mid-campaign — one-page market pulse",
        body: "",
        email_subject: "Market pulse for your campaign",
        email_html: `${P(
          "Hi there,<br/><br/>Attached (or below) is a quick pulse on what else has listed/sold nearby and what it means for our strategy."
        )}${P("Happy to discuss on the phone at your convenience.")}`,
      },
      { offset_days: 56, step_type: "task", title: "Call: week 8 review", body: "Pricing conversation with printed/pdf evidence if helps." },
      { offset_days: 63, step_type: "task", title: "SMS: short encouragement + line open", body: "Human, not hype — acknowledge campaign fatigue if real." },
      { offset_days: 70, step_type: "task", title: "Call: week 10 — offers or pivot", body: "Strong ask: any offer reality; refresh or withdraw conversation if dead." },
      { offset_days: 77, step_type: "task", title: "Call: pre–day-90 positioning", body: "Prepare options document: renew, rest, tenant, lease, rent roll." },
      { offset_days: 84, step_type: "task", title: "Social: success story or sold-neighbour (tactful)", body: "Only if appropriate — social proof without undermining their campaign." },
      { offset_days: 90, step_type: "task", title: "Call: 90-day decision — renew, adjust, pause", body: "Clear next chapter; re-enroll past-client or long nurture as fits." },
    ],
  },
  {
    name: "Seller · OTM (other agent) — 60-day trust takeover",
    description:
      "Property is on market with another agent. Intense 60-day relationship cadence to build trust without poaching behavior: educate, empathize, and be consistently useful so you are the first call if the campaign stalls.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: acknowledge current campaign, offer neutral second opinion", body: "Lead with respect for their current agent. Ask permission to be a sounding board only." },
      { offset_days: 1, step_type: "task", title: "SMS: thank-you + no-pressure support line", body: "\"Thanks for the chat. Happy to share market feedback anytime while you're on market.\"" },
      {
        offset_days: 3,
        step_type: "email",
        title: "Email: 3 things to track weekly on any campaign",
        body: "",
        email_subject: "A quick framework while your home is on market",
        email_html: `${P("Hi there,<br/><br/>As promised, here is a simple framework to monitor campaign health each week: enquiry quality, inspection-to-offer conversion, and buyer objection themes.")}${P("No pressure from me — I am happy to be a second set of eyes while you work with your current agent.")}`,
      },
      { offset_days: 5, step_type: "task", title: "Call: week-1 pulse check", body: "Ask what feedback they are hearing and how confident they feel about the strategy." },
      { offset_days: 7, step_type: "task", title: "SMS: supportive check-in", body: "\"How did this week feel from your side? If helpful I can sanity-check the feedback with you.\"" },
      { offset_days: 10, step_type: "task", title: "Call: objection map and buyer psychology", body: "Translate feedback into categories: price, presentation, positioning, access, competition." },
      {
        offset_days: 14,
        step_type: "email",
        title: "Email: vendor confidence reset (plain-English)",
        body: "",
        email_subject: "What usually changes outcomes mid-campaign",
        email_html: `${P("Hi there,<br/><br/>Many campaigns improve when sellers focus on a few controllables: clarity of price signals, stronger first impression, and fast follow-up on serious buyers.")}${P("If you want, I can walk you through this in 10 minutes with no obligations.")}`,
      },
      { offset_days: 17, step_type: "task", title: "Call: fortnight checkpoint", body: "Assess whether communication cadence with current agent is giving enough transparency." },
      { offset_days: 21, step_type: "task", title: "SMS: keep trust warm", body: "\"Still here if you want a straight read on what your campaign data is saying.\"" },
      { offset_days: 24, step_type: "task", title: "Call: strategy options if momentum is flat", body: "Discuss non-dramatic adjustments: guide framing, copy/photos refresh, inspection flow, buyer follow-up speed." },
      {
        offset_days: 28,
        step_type: "email",
        title: "Email: one-page market pulse",
        body: "",
        email_subject: "A one-page market pulse for your area",
        email_html: `${P("Hi there,<br/><br/>Here is a concise pulse on comparable stock, buyer depth, and days-on-market trends in your area.")}${P("Use this as context in your vendor reviews.")}`,
      },
      { offset_days: 32, step_type: "task", title: "Call: month-1 reset conversation", body: "Help them separate emotion from evidence and identify the most likely lever for progress." },
      { offset_days: 38, step_type: "task", title: "SMS: quick reassurance", body: "\"Campaign fatigue is real. If useful, I can share how other vendors reset momentum around week 5-6.\"" },
      { offset_days: 42, step_type: "task", title: "Call: trust deepening + contingency", body: "Ask what would make them feel fully supported if a relaunch or agency change became necessary." },
      {
        offset_days: 49,
        step_type: "email",
        title: "Email: if your campaign does not sell — next playbook",
        body: "",
        email_subject: "Your practical next-step playbook (if needed)",
        email_html: `${P("Hi there,<br/><br/>If the current campaign does not get the result, there are still strong options: re-position and relaunch, pause and reset, or switch strategy entirely.")}${P("I can provide a calm, practical plan tailored to your home whenever you want it.")}`,
      },
      { offset_days: 54, step_type: "task", title: "Call: readiness to decide next chapter", body: "Gauge whether they want a formal second-opinion meeting and timeline for decision-making." },
      { offset_days: 60, step_type: "task", title: "Call: 60-day decision touch", body: "Offer clear next step: continue support, book strategy meeting, or move to long nurture if timing changed." },
    ],
  },
  {
    name: "Seller · Future seller — long nurture (24 months)",
    description:
      "No firm sale date / “just researching”: useful, spaced touches over up to ~24 months — early months closer together, stretching to quarterly / semi-annual so you stay the advisor without pressure.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: set expectations & update consent", body: "Ask how often they want market notes; preference for call vs text vs email." },
      {
        offset_days: 14,
        step_type: "email",
        title: "Email: soft suburb / micro-market snapshot",
        body: "",
        email_subject: "A quick market snapshot for you",
        email_html: `${P(
          "Hi there,<br/><br/>No agenda — just a short note on what’s been happening for [suburb/property type] lately, since we last spoke."
        )}${P("Ping me anytime you want numbers on your specific home.")}`,
      },
      { offset_days: 30, step_type: "task", title: "Call: human check-in (life first)", body: "Job change, Reno finished, school — update your CRM notes." },
      { offset_days: 60, step_type: "task", title: "SMS: invite quick catch-up call", body: "\"Still happy to be a sounding board — free Tuesday arvo? No obligation.\"" },
      { offset_days: 90, step_type: "task", title: "Call or video: quarterly value — case study", body: "Similar home or happy vendor story; keep under 15 minutes." },
      { offset_days: 120, step_type: "prompt", title: "Prompt: desktop CMA / rough range offer (optional)", body: "If they’ve warmed: offer updated numbers ‘when you’re ready’." },
      { offset_days: 150, step_type: "task", title: "Social: engage with their content", body: "Birthday, milestone, work news — stay a person." },
      { offset_days: 180, step_type: "email", title: "Email: 6-month ‘still here’ market note", body: "", email_subject: "Six months on — a tiny update", email_html: `${P("Hi there,<br/><br/>Just a light-touch update on how the market has shifted since we last connected.")}${P("If your timing has moved closer, I’d love a call.")}` },
      { offset_days: 240, step_type: "task", title: "Call: re-qualify timing", body: "Has window moved to 0–6 months? If yes, switch to appraisal path sequence." },
      { offset_days: 300, step_type: "task", title: "Call: value touch — prep-for-sale tips", body: "Seasonal maintenance, declutter, small ROI fixes — educational." },
      {
        offset_days: 365,
        step_type: "email",
        title: "Email: 12-month anniversary",
        body: "",
        email_subject: "A year since we started chatting",
        email_html: `${P(
          "Hi there,<br/><br/>It’s been about a year since we first spoke about your property plans."
        )}${P("If a move is on the radar now or next year, I’m here — no pressure.")}`,
      },
      { offset_days: 455, step_type: "task", title: "Call: month ~15 pulse", body: "Broader life check; note if investor or upsizer storyline changed." },
      { offset_days: 545, step_type: "task", title: "SMS: spring/autumn maintenance hook (seasonal)", body: "Tie to gutters, gardens, exterior paint — helpful not salesy." },
      {
        offset_days: 640,
        step_type: "email",
        title: "Email: 21-month gentle nudge",
        body: "",
        email_subject: "Still planning ahead?",
        email_html: `${P("Hi there,<br/><br/>Thought I’d send a quick hello in case your plans have evolved.")}${P("Happy to refresh numbers whenever useful.")}`,
      },
      { offset_days: 730, step_type: "task", title: "Call: 24-month — renew nurture or graduate", body: "Explicit permission for another year of light touches or close loop warmly." },
    ],
  },
  {
    name: "Seller · Past client — relationship & referrals (12 months)",
    description:
      "After a successful sale: practical gratitude, seasonal value, referral moments spaced months apart — typical past-client rhythm is quality over quantity.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: big thank-you + log key dates", body: "Settlement feelings, kids’ schools, new suburb — gold for future." },
      {
        offset_days: 7,
        step_type: "email",
        title: "Email: congrats + ‘here if you need anything’",
        body: "",
        email_subject: "Congratulations again",
        email_html: `${P(
          "Hi there,<br/><br/>Congratulations on the sale. If anything pops up — tradies, local tips, random questions — I’m only a message away."
        )}${P("Thank you again for your trust.")}`,
      },
      { offset_days: 30, step_type: "task", title: "SMS: quick ‘how’s the move’", body: "Short, warm — no business ask." },
      { offset_days: 60, step_type: "task", title: "Call: life update + local intro if helpful", body: "Cafes, clubs, dog parks — match to what they value." },
      { offset_days: 90, step_type: "email", title: "Email: soft ‘what’s your home worth now’ curiosity", body: "", email_subject: "Curious what the market’s done?", email_html: `${P("Hi there,<br/><br/>Markets move — if you’re curious what your previous place (or new area) is doing, I can send a one-page view.")}${P("No obligation.")}` },
      { offset_days: 150, step_type: "task", title: "Social: birthday / house anniversary if known", body: "Card, story, message — whatever fits your brand." },
      { offset_days: 210, step_type: "task", title: "Call: value check-in", body: "Rates, renovations, family — light." },
      { offset_days: 270, step_type: "task", title: "Call: referral conversation (soft)", body: "‘Who do you know weighing up a move?’ — offer easy intro, no pressure." },
      {
        offset_days: 335,
        step_type: "email",
        title: "Email: year-end thanks + review invite (if appropriate)",
        body: "",
        email_subject: "Thank you for another year",
        email_html: `${P(
          "Hi there,<br/><br/>Wishing you a great end to the year. If you were happy with our work together, a short Google review means a lot."
        )}${P("Either way, I’m grateful to stay in touch.")}`,
      },
      { offset_days: 365, step_type: "task", title: "Call: 12-month anniversary of relationship", body: "Reset for another annual rhythm or hand to newsletter-only." },
    ],
  },
  {
    name: "Seller · Under contract to settlement (seller)",
    description:
      "Accepted offer through to keys: conditions, access for buyer due diligence, settlement prep — typical 30–60 day contracts in many AU markets.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: congrats — milestone map", body: "Finance/building/pest dates, settlement target, how you’ll update them." },
      { offset_days: 2, step_type: "task", title: "SMS: ‘I’m on it’ reassurance", body: "Short text that you’re tracking buyer side professionally." },
      { offset_days: 7, step_type: "task", title: "Call: condition check-in", body: "Unconditional or still waiting; any friction early." },
      { offset_days: 14, step_type: "email", title: "Email: mid-contract housekeeping", body: "", email_subject: "Midway through your sale — quick notes", email_html: `${P("Hi there,<br/><br/>Quick recap of where things sit with conditions and next dates.")}${P("Reach out if anything feels unclear.")}` },
      { offset_days: 21, step_type: "task", title: "Call: settlement prep — utilities / insurance", body: "Until settlement reminders; keys and possession clarity." },
      { offset_days: 28, step_type: "task", title: "Call: final week logistics", body: "Settlement time, moving, rent-back if any." },
      { offset_days: 35, step_type: "task", title: "Call/SMS: settlement day + thank-you", body: "Hand to past-client seller sequence when settled." },
    ],
  },
  {
    name: "Seller · Withdrawn / unsold — relist or reset (60 days)",
    description:
      "Campaign ended without sale: debrief pricing, presentation, and buyer feedback without blame; decide relist, refresh, or long nurture — typical recovery window 4–8 weeks.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: debrief — facts not feelings first", body: "Enquiry, inspections, offers, feedback themes; vendor emotional space." },
      {
        offset_days: 1,
        step_type: "email",
        title: "Email: thank you — I’m on your side",
        body: "",
        email_subject: "Thank you for trusting me with the campaign",
        email_html: `${P("Hi there,<br/><br/>I know this outcome isn’t what we hoped. I’ll call with a clear, honest read on what we learned and what I’d do differently.")}${P("There’s always a path forward.")}`,
      },
      { offset_days: 5, step_type: "task", title: "Call: pricing & positioning post-mortem", body: "Comparable refresh; guide vs achieved interest; method of sale revisit." },
      { offset_days: 10, step_type: "task", title: "SMS: one constructive ‘next chapter’ nudge", body: "Short: ‘When you’re ready to talk options — no rush.’" },
      { offset_days: 14, step_type: "prompt", title: "Prompt: refreshed CMA / desktop appraisal", body: "Optional written update for vendor file; keeps you credible." },
      { offset_days: 21, step_type: "task", title: "Call: presentation & marketing audit", body: "Photos, copy, staging, access, signboard, channel mix." },
      { offset_days: 28, step_type: "email", title: "Email: three ways sellers bounce back", body: "", email_subject: "Three common paths after an unsold campaign", email_html: `${P("Hi there,<br/><br/>Brief note on three paths other vendors take: refresh & relist, rest then re-time, or adjust method of sale.")}${P("Happy to talk through what fits you.")}` },
      { offset_days: 35, step_type: "task", title: "Social: subtle proof post (sold elsewhere)", body: "If ethical in your market — show you move stock; don’t name their home." },
      { offset_days: 42, step_type: "task", title: "Call: go / pause / pivot decision", body: "Relist date, wintering the listing, or hand to nurture pack." },
      { offset_days: 60, step_type: "task", title: "Call: 60-day — re-engage or close file kindly", body: "Permission for quarterly check-ins or warm archive." },
    ],
  },
  {
    name: "Seller · Off-market / discreet sale (45 days)",
    description:
      "Quiet-sale mandate: match buyers from database, control narrative, and protect privacy — mix of calls, bounded email updates, and SMS for time-sensitive interest.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: confidentiality & marketing boundaries", body: "What they will/won’t allow: photos, address leaks, board, portals." },
      {
        offset_days: 1,
        step_type: "email",
        title: "Email: buyer-matching brief (for your eyes only)",
        body: "",
        email_subject: "Your off-market brief — confidential",
        email_html: `${P("Hi there,<br/><br/>Here’s how I’ll describe your home to qualified buyers without exposing identity or address.")}${P("Reply with edits — we’ll keep this tight.")}`,
      },
      { offset_days: 4, step_type: "task", title: "Call: shortlist buyer conversations", body: "Who gets a look; finance-qualified first where possible." },
      { offset_days: 10, step_type: "task", title: "SMS: ‘two buyers reviewed info’ style update", body: "Vague but real — maintains trust without detail leaks." },
      { offset_days: 14, step_type: "task", title: "Call: feedback from qualified passers", body: "Price, terms, timing — no identifiers in writing if requested." },
      { offset_days: 21, step_type: "task", title: "Call: review price band vs whisper interest", body: "Adjust brief or hold firm." },
      {
        offset_days: 28,
        step_type: "email",
        title: "Email: monthly off-market pulse (no address)",
        body: "",
        email_subject: "Off-market check-in",
        email_html: `${P("Hi there,<br/><br/>Quick update on buyer appetite in your segment — still operating discreetly as agreed.")}${P("Call me for detail.")}`,
      },
      { offset_days: 35, step_type: "task", title: "Social: 1:1 intro to trusted colleague buyer (if allowed)", body: "Only with explicit vendor consent." },
      { offset_days: 45, step_type: "task", title: "Call: extend off-market or pivot to public", body: "Renew mandate or enroll OTM intensive if going live." },
    ],
  },
  {
    name: "Seller · Downsizer / rightsizing journey (90 days)",
    description:
      "Often emotionally loaded: coordinate selling larger home with finding smaller or lifestyle property; slower trust cadence with calls, SMS on milestones, and educational emails.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: hear the ‘why’ — family, health, maintenance", body: "Document sensitivities; timeline may be fuzzy — that’s normal." },
      {
        offset_days: 3,
        step_type: "email",
        title: "Email: downsizer roadmap (overview)",
        body: "",
        email_subject: "Your downsizing roadmap — high level",
        email_html: `${P("Hi there,<br/><br/>Here’s the usual flow: clarify next home, prepare this one, align settlement dates, and reduce stress with a simple checklist.")}${P("We’ll tailor every step.")}`,
      },
      { offset_days: 10, step_type: "task", title: "Call: next-home search overlap (buy + sell)", body: "Bridge finance, rent-back, extended settlement — outline options." },
      { offset_days: 21, step_type: "task", title: "SMS: declutter / donation nudge", body: "Gentle; link to charity pickup or estate sale if relevant." },
      { offset_days: 35, step_type: "task", title: "Call: emotional checkpoint before photography", body: "Family rooms, memorial items — respect pace." },
      { offset_days: 49, step_type: "prompt", title: "Prompt: rightsizing case study (similar client)", body: "Send anonymised story — builds confidence." },
      { offset_days: 63, step_type: "email", title: "Email: method of sale for downsizers", body: "", email_subject: "Auction vs private for your situation", email_html: `${P("Hi there,<br/><br/>Plain-English pros/cons for your segment — no jargon.")}${P("We can decide together on our next call.")}` },
      { offset_days: 77, step_type: "task", title: "Call: pre-list energy & support person", body: "Invite partner/adult child on call if vendor wants backup." },
      { offset_days: 90, step_type: "task", title: "Call: 90-day — list, pause, or continue prep", body: "Enroll new-client or OTM sequence when ready." },
    ],
  },
  {
    name: "Seller · Tenanted investment — listed for sale (60 days)",
    description:
      "Renters in place: notice, access for opens, rent during campaign, and buyer expectations on vacant possession — higher coordination; SMS for access windows.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: tenant notice + legal / PM handoff", body: "Entry rules, photography slots, notice periods per lease." },
      {
        offset_days: 2,
        step_type: "email",
        title: "Email: vendor — what good tenant cooperation looks like",
        body: "",
        email_subject: "Working with tenants during the campaign",
        email_html: `${P("Hi there,<br/><br/>Quick note on how we balance buyer access with tenant rights — I’ll coordinate with your property manager.")}${P("We’ll keep disruption minimal.")}`,
      },
      { offset_days: 7, step_type: "task", title: "Call: PM sync — open times & respectful comms", body: "Gift card or thank-you for cooperative tenant if your policy allows." },
      { offset_days: 14, step_type: "task", title: "SMS: weekly access summary to vendor", body: "Confirmed opens + any tenant changes." },
      { offset_days: 21, step_type: "task", title: "Call: buyer feedback — rent during campaign angle", body: "Investor vs owner-occupier buyers; yield chat." },
      { offset_days: 30, step_type: "email", title: "Email: mid-campaign — tenant + buyer update", body: "", email_subject: "Campaign update (investment property)", email_html: `${P("Hi there,<br/><br/>Here’s how inspections and tenant logistics are tracking, plus buyer themes.")}${P("Reply or call with questions.")}` },
      { offset_days: 40, step_type: "task", title: "Call: vacant possession vs leased settlement", body: "Align contract terms with tenant reality." },
      { offset_days: 50, step_type: "task", title: "Social: tasteful investor-education touch (optional)", body: "If vendor uses LinkedIn — article on yield, not their address." },
      { offset_days: 60, step_type: "task", title: "Call: 60-day — sold path or campaign refresh", body: "Pivot marketing or price if still on market." },
    ],
  },
  {
    name: "Seller · Auction — final 14 days countdown",
    description:
      "Listing headed to auction: intensify clarity and calm in the last two weeks — buyer register, reserve psychology, logistics — mix of calls, SMS, email, and social proof.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: two-week game plan — serious buyer indicator list", body: "Who’s finance-ready; who’s second inspection." },
      { offset_days: 1, step_type: "task", title: "SMS: momentum update to vendor", body: "‘Strong second inspections’ style — honest not hype." },
      {
        offset_days: 2,
        step_type: "email",
        title: "Email: what happens in auction week",
        body: "",
        email_subject: "Auction week — what to expect",
        email_html: `${P("Hi there,<br/><br/>Short outline of final opens, bidder registration, and how we’ll communicate on the day.")}${P("I’m here for nerves and questions.")}`,
      },
      { offset_days: 4, step_type: "task", title: "Call: register strength & vendor Q&A", body: "Reserve strategy conversation with evidence only — compliance with your laws." },
      { offset_days: 7, step_type: "task", title: "Call: one week out — logistics & mindset", body: "Parking, keys, early offer policy if any." },
      { offset_days: 9, step_type: "task", title: "SMS: 48-hour reminder — opens / auction time", body: "Confirm they have calendar; offer coffee before if helpful." },
      { offset_days: 11, step_type: "task", title: "Social: compliant ‘auction this Saturday’ (if vendor approves)", body: "Use approved creatives only." },
      { offset_days: 12, step_type: "email", title: "Email: auction day checklist (vendor)", body: "", email_subject: "Auction day — quick checklist", email_html: `${P("Hi there,<br/><br/>Practical list: ID, keys, phone charged, contract docs location, and who to stand with.")}${P("You’ve got this.")}` },
      { offset_days: 13, step_type: "task", title: "Call: night-before calm check", body: "Answer micro-questions; sleep tone." },
      { offset_days: 14, step_type: "task", title: "Call/SMS: post-auction same day or D+1", body: "Sold, passed in, or negotiate — immediate human contact." },
    ],
  },

  // —— BUYERS ——
  {
    name: "Buyer · New enquiry — welcome & qualify (14 days)",
    description:
      "Brand-new buyer lead: same-day warmth, finance reality, brief building. Industry pattern mirrors seller: speed + clarity in first 48 hours wins trust.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: speed lead — needs & timeline", body: "Finance stage, suburbs, must-haves, lease end, FHB vs upsizer." },
      {
        offset_days: 0,
        step_type: "email",
        title: "Email: thanks + buyer basics pack",
        body: "",
        email_subject: "Thanks — buyer search next steps",
        email_html: `${P(
          "Hi there,<br/><br/>Thanks for reaching out. I’ll call you shortly to understand what you’re looking for and how I can help."
        )}${P("In the meantime, feel free to reply with your ideal suburbs and budget band.")}`,
      },
      { offset_days: 1, step_type: "task", title: "SMS: confirm call / offer to send listings", body: "Quick text: ‘Did my email land? Happy to fire over examples.’" },
      { offset_days: 3, step_type: "task", title: "Call: finance & buying costs reality", body: "Pre-approval, stamp duty ballpark, deposit, LMI if relevant — broker referral if needed." },
      { offset_days: 5, step_type: "task", title: "Social: connect / light engage", body: "Follow or connect where professional; don’t stalk." },
      {
        offset_days: 7,
        step_type: "email",
        title: "Email: ‘how we search together’ (education)",
        body: "",
        email_subject: "How we’ll search together",
        email_html: `${P(
          "Hi there,<br/><br/>A quick note on how alerts, inspections, and off-market opportunities usually work when we team up."
        )}${P("Reply anytime you want to tweak your brief.")}`,
      },
      { offset_days: 10, step_type: "task", title: "Call: build/refine the brief on paper", body: "Non-negotiables vs nice-to-haves; school zones; pet needs." },
      { offset_days: 14, step_type: "task", title: "Call: branch — active search vs long nurture", body: "Hot buyer → enroll 90-day active. Browsing only → long nurture pack." },
    ],
  },
  {
    name: "Buyer · Active search — inspections & offers (90 days)",
    description:
      "Actively inspecting: weekly to biweekly rhythm over ~3 months matches typical search fatigue curves; pushes finance + offer readiness before burnout.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: sync alerts & off-market promise", body: "Portals, price bands, Saturday rhythm." },
      { offset_days: 5, step_type: "task", title: "Call: week-1 inspection debrief", body: "What they loved/hated — calibrate matrix." },
      { offset_days: 10, step_type: "task", title: "SMS: encourage second look at near-miss", body: "If one property was ‘almost’ — sanity check." },
      { offset_days: 14, step_type: "task", title: "Call: brief checkpoint — expand or narrow", body: "Budget, geography, property type trade-offs." },
      { offset_days: 21, step_type: "email", title: "Email: shortlist discipline — top 3 framework", body: "", email_subject: "Keeping the search focused", email_html: `${P("Hi there,<br/><br/>Here’s a simple way to rank what you’ve seen so priorities stay clear as listings flow.")}${P("We can refine on our next call.")}` },
      { offset_days: 30, step_type: "task", title: "Call: finance refresh — pre-approval & max bid", body: "Rates, ceiling, deposit path." },
      { offset_days: 45, step_type: "task", title: "Call: offer readiness — conveyancer, deposit, conditions", body: "Get professionals lined up before the right home." },
      { offset_days: 60, step_type: "task", title: "Call: 60-day reality vs fatigue", body: "Market heat; pivot suburbs or pause for sanity." },
      { offset_days: 75, step_type: "task", title: "Social: send helpful market reel/post (DM)", body: "One educational asset — not spam." },
      { offset_days: 90, step_type: "task", title: "Call: 90-day continuation plan", body: "Extend, pause, or sharpen offer strategy — maybe switch sequence." },
    ],
  },
  {
    name: "Buyer · Long nurture — no rush (24 months)",
    description:
      "Prospect with no immediate move: stay in orbit for 12–24 months with market education, seasonal relevance, and light timing checks without noise.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: permission & preferences", body: "How often + channel they like; no assumptions." },
      {
        offset_days: 21,
        step_type: "email",
        title: "Email: welcome to occasional updates",
        body: "",
        email_subject: "I’ll keep these light",
        email_html: `${P(
          "Hi there,<br/><br/>As discussed, I’ll only send useful market notes every now and then — nothing spammy."
        )}${P("Reply anytime your timing firms up.")}`,
      },
      { offset_days: 45, step_type: "task", title: "Call: quick life pulse", body: "Job, relationship, study — might change location brief." },
      { offset_days: 90, step_type: "email", title: "Email: quarterly suburbs pulse", body: "", email_subject: "A quick read on [area] entry prices", email_html: `${P("Hi there,<br/><br/>A short snapshot of what entry points have looked like lately in the areas you mentioned.")}${P("Happy to go deeper on a call when you want.")}` },
      { offset_days: 150, step_type: "task", title: "SMS: seasonal open-home invite (optional)", body: "Only if they like attending casually — ‘no pressure to buy’ tone." },
      { offset_days: 210, step_type: "task", title: "Social: DM share one saved listing", body: "Fits brief — ‘saw this and thought of you’." },
      {
        offset_days: 270,
        step_type: "email",
        title: "Email: myth-busting for future buyers",
        body: "",
        email_subject: "Bookmark: plain-English buyer notes",
        email_html: `${P("Hi there,<br/><br/>A plain-English note on deposits, auctions, or strata — save for when you’re closer to buying.")}${P("Reply with what topic you want next.")}`,
      },
      { offset_days: 365, step_type: "task", title: "Call: 12-month timing check", body: "Has the window moved to the next 6–12 months? Upgrade to active search if yes." },
      { offset_days: 455, step_type: "task", title: "Call: month ~15 — life + market", body: "Light; offer refreshed suburb note if they want." },
      { offset_days: 545, step_type: "email", title: "Email: 18-month ‘still browsing’ hello", body: "", email_subject: "Still just looking?", email_html: `${P("Hi there,<br/><br/>Markets shift — if you want a fresh read on pricing for your brief, I’m here.")}${P("No pressure to act.")}` },
      { offset_days: 640, step_type: "task", title: "SMS: seasonal maintenance for renters (if tenant)", body: "Helps renters planning to buy later — gutters, bond, rent ledger for finance." },
      { offset_days: 730, step_type: "task", title: "Call: 24-month — graduate or extend", body: "Consent for another light year; or celebrate and move to past-client style touch." },
    ],
  },
  {
    name: "Buyer · Investor / landlord — acquisition pipeline (120 days)",
    description:
      "Yield, vacancy, depreciation mindset: longer diligence cycles; ~45–90 days common when analysing; mix of calls, data emails, and SMS for auction deadlines.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: strategy — yield vs growth vs develop", body: "Hold period, leverage, entity, rough buy box." },
      {
        offset_days: 1,
        step_type: "email",
        title: "Email: investor due-diligence checklist",
        body: "",
        email_subject: "Your investor due-diligence checklist",
        email_html: `${P("Hi there,<br/><br/>Here’s a compact checklist I use with investors: cashflow, strata, tenancy, capex, and exit.")}${P("We can walk through it on a call anytime.")}`,
      },
      { offset_days: 7, step_type: "task", title: "Call: finance structure & serviceability", body: "Interest-only vs P&I; bank vs broker; existing equity." },
      { offset_days: 14, step_type: "task", title: "SMS: pocket listing / off-market nudge", body: "If you have anything suitable: ‘Seen anything this week that fits your yield target?’" },
      { offset_days: 28, step_type: "task", title: "Call: inspect shortlist — rent evidence", body: "Ask rents from PM contacts; stress-test vacancy." },
      { offset_days: 45, step_type: "email", title: "Email: suburb yield snapshot", body: "", email_subject: "Yield snapshot — [suburb]", email_html: `${P("Hi there,<br/><br/>A one-page look at indicative yields and listing volume where you’re hunting.")}${P("Let me know if you want this for another pocket.")}` },
      { offset_days: 60, step_type: "task", title: "Call: offer / DD on specific asset", body: "Strata, special levies, building age, flood overlays." },
      { offset_days: 75, step_type: "task", title: "Social: DM market graph or auction result", body: "One data point relevant to their thesis." },
      { offset_days: 90, step_type: "task", title: "Call: portfolio review — pause or persist", body: "Adjust buy box or wait for rates/stock." },
      { offset_days: 105, step_type: "task", title: "SMS: auction / deadline reminder", body: "If a target property has date — time the text 24–48h ahead." },
      { offset_days: 120, step_type: "task", title: "Call: 120-day pipeline — next 6 months", body: "Re-enroll long nurture or active buyer as fits." },
    ],
  },
  {
    name: "Buyer · Past buyer — referrals & reviews (12 months)",
    description:
      "After purchase: practical help, gentle review ask, referral moments months apart — mirrors seller past-client rhythm.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: congratulations + move-in tips", body: "Utilities, insurance, tradies you trust." },
      {
        offset_days: 5,
        step_type: "email",
        title: "Email: congrats + I’m here for random questions",
        body: "",
        email_subject: "Congratulations on the new place",
        email_html: `${P("Hi there,<br/><br/>Congratulations again. If you need a hand with local contacts or random questions, just reply.")}${P("Enjoy settling in.")}`,
      },
      { offset_days: 21, step_type: "task", title: "SMS: how’s the new home?", body: "Human check-in — no sell." },
      { offset_days: 60, step_type: "task", title: "Call: life + property chat", body: "Renovation plans? Might mean next sale one day." },
      { offset_days: 120, step_type: "email", title: "Email: soft review invite", body: "", email_subject: "If you have 60 seconds", email_html: `${P("Hi there,<br/><br/>If you enjoyed working together, a Google review really helps others find us.")}${P("Totally optional — either way, thank you.")}` },
      { offset_days: 180, step_type: "task", title: "Social: engage with their milestone post", body: "Birthday, pet, Reno — stay personal." },
      { offset_days: 240, step_type: "task", title: "Call: referral dialogue (gentle)", body: "Who’s renting, upsizing, or overwhelmed by auction news?" },
      { offset_days: 300, step_type: "email", title: "Email: annual equity / market hello", body: "", email_subject: "Quick hello — how’s the market treating you?", email_html: `${P("Hi there,<br/><br/>Just a light check-in in case you’re curious how values have moved in your pocket of the market.")}${P("I’m around if you want numbers.")}` },
      { offset_days: 365, step_type: "task", title: "Call: 12-month anniversary", body: "Stay on annual rhythm or newsletter-only." },
    ],
  },
  {
    name: "Buyer · Relocating — interstate / long-distance (90 days)",
    description:
      "Buyer not local: video inspections, fly-in strategy, schools, and time zones — slightly longer trust cycle; heavy on email summaries plus SMS for flight/auction timing.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: reality-check remote buying", body: "Which steps they can do remotely vs must be in person; risk tolerance." },
      {
        offset_days: 1,
        step_type: "email",
        title: "Email: remote buyer playbook",
        body: "",
        email_subject: "Buying from afar — how we make it work",
        email_html: `${P("Hi there,<br/><br/>Here’s how we usually handle video walk-throughs, local due diligence, and fly-in plans around key moments.")}${P("Reply with your arrival windows if known.")}`,
      },
      { offset_days: 7, step_type: "task", title: "Call: brief + suburbs locked for alerts", body: "Distance doesn’t mean vague — sharpen must-haves." },
      { offset_days: 14, step_type: "task", title: "SMS: video tour offer for new listing match", body: "When something fits: ‘Can do FaceTime Saturday AM your time.’" },
      { offset_days: 28, step_type: "task", title: "Call: schools / healthcare / commute deep-dive", body: "If family move — map their lifestyle anchors." },
      { offset_days: 42, step_type: "email", title: "Email: fly-in inspection itinerary (template)", body: "", email_subject: "Suggested fly-in itinerary", email_html: `${P("Hi there,<br/><br/>Draft Saturday: 3 inspections, one café debrief, conveyancer intro if needed.")}${P("We’ll compress or extend to match your flights.")}` },
      { offset_days: 56, step_type: "task", title: "Social: DM neighbourhood reel or council link", body: "One helpful local asset — builds confidence." },
      { offset_days: 70, step_type: "task", title: "Call: offer / DD from afar — settlement risk", body: "Building/pest by buyer’s agent or trusted inspector." },
      { offset_days: 90, step_type: "task", title: "Call: 90-day — pause search or book next trip", body: "Enroll active search or long nurture." },
    ],
  },
  {
    name: "Buyer · First home — education & readiness (75 days)",
    description:
      "First-time buyers: grants/schemes vary by state — keep emails factual and point to broker/conveyancer; pace education so they don’t stall in fear.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: timeline & deposit truth", body: "Genuine savings, gifts, FHOG eligibility questions — broker handoff." },
      {
        offset_days: 2,
        step_type: "email",
        title: "Email: FHB — costs beyond the price",
        body: "",
        email_subject: "The full cost picture (stamp duty, fees, insurance)",
        email_html: `${P("Hi there,<br/><br/>Here’s a simple breakdown of costs first-time buyers often forget — your broker and conveyancer will personalise numbers.")}${P("No silly questions — ask me anything.")}`,
      },
      { offset_days: 7, step_type: "task", title: "Call: broker / pre-approval checkpoint", body: "What they were told; max vs comfortable payment." },
      { offset_days: 14, step_type: "prompt", title: "Prompt: send ‘how auction works’ or ‘offer steps’ PDF", body: "Match to your market (auction vs private)." },
      { offset_days: 21, step_type: "task", title: "SMS: encouragement after first open homes", body: "‘How did Saturday feel?’ — normalise overwhelm." },
      { offset_days: 35, step_type: "email", title: "Email: inspections — what to photograph", body: "", email_subject: "Open home notebook (simple)", email_html: `${P("Hi there,<br/><br/>Tiny list: water pressure, cracks, noise, strata notice board, parking.")}${P("We’ll debrief on the phone.")}` },
      { offset_days: 49, step_type: "task", title: "Call: one ‘almost made offer’ debrief", body: "Fear vs red flag — coach without pressure." },
      { offset_days: 60, step_type: "task", title: "Social: share first-home myth-bust post", body: "Tag them only if they love social; else skip." },
      { offset_days: 75, step_type: "task", title: "Call: 75-day — ready for active search or pause", body: "Enroll 90-day active or long nurture." },
    ],
  },
  {
    name: "Buyer · Downsizing purchase — buy smaller (90 days)",
    description:
      "Buying down: often strata, lifts, body corporate, and emotional tie to old home — respect pace; mix calls with practical emails on lifestyle fit.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: what ‘smaller’ means — sqm, outdoor, storage", body: "Non-negotiables for next chapter." },
      {
        offset_days: 3,
        step_type: "email",
        title: "Email: downsizer buy-box — questions to ask",
        body: "",
        email_subject: "Questions when you’re buying smaller",
        email_html: `${P("Hi there,<br/><br/>Lift access, storage cages, guest parking, pets, noise, and strata sinking fund — happy to unpack on a call.")}${P("Use this list at opens.")}`,
      },
      { offset_days: 12, step_type: "task", title: "Call: sell-then-buy vs overlap finance", body: "Risk tolerance; short rent between if needed." },
      { offset_days: 24, step_type: "task", title: "SMS: after first strata inspection — debrief offer", body: "Invite quick call same night." },
      { offset_days: 38, step_type: "task", title: "Call: body corporate minutes — red flags", body: "Special levies, disputes, maintenance backlogs." },
      { offset_days: 52, step_type: "email", title: "Email: single-level vs stairs (aging in place)", body: "", email_subject: "Future-proofing your next home", email_html: `${P("Hi there,<br/><br/>Short thoughts on steps, bathrooms, and maintenance if you plan to stay 10+ years.")}${P("Purely practical — no pressure.")}` },
      { offset_days: 66, step_type: "task", title: "Call: offer strategy when emotionally drained", body: "Support; slow is ok if budget intact." },
      { offset_days: 90, step_type: "task", title: "Call: 90-day — found home or refine search", body: "Pivot suburbs or price; or long nurture." },
    ],
  },
  {
    name: "Buyer · VIP / off-market register (90 days)",
    description:
      "Wants pocket listings before they hit portals: consent to call/SMS fast; low volume high signal — you’re curating not spamming.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: VIP rules — budget proof & brief", body: "Finance position; how fast they can inspect; fee discussion if you charge buyers (your policy)." },
      {
        offset_days: 1,
        step_type: "email",
        title: "Email: what ‘off-market’ means from us",
        body: "",
        email_subject: "You’re on our priority buyer list",
        email_html: `${P("Hi there,<br/><br/>I’ll only ping you when a property genuinely matches — no spray and pray.")}${P("Reply anytime your brief changes.")}`,
      },
      { offset_days: 14, step_type: "task", title: "SMS: ‘one to watch’ vague teaser (compliant)", body: "Suburb + beds + guide band if allowed — never breach vendor privacy." },
      { offset_days: 28, step_type: "task", title: "Call: refresh brief — still active?", body: "Kill zombie leads respectfully." },
      { offset_days: 42, step_type: "task", title: "Call: pocket listing debrief (if one was shown)", body: "Fit, price, hesitation — refine or pass." },
      {
        offset_days: 56,
        step_type: "email",
        title: "Email: market pulse for their buy band",
        body: "",
        email_subject: "Quick market pulse for your brief",
        email_html: `${P("Hi there,<br/><br/>Short note on what’s moving in your segment — still holding your spot on the priority list.")}${P("Ping me if budget or suburbs shift.")}`,
      },
      { offset_days: 70, step_type: "task", title: "Social: compliant behind-scenes story (no address)", body: "Builds FOMO ethically — follow your prospecting rules." },
      { offset_days: 90, step_type: "task", title: "Call: 90-day — stay VIP or graduate to active search", body: "Renew mandate or widen to on-market alerts." },
    ],
  },
  {
    name: "Buyer · Upsizing / growing family (90 days)",
    description:
      "More space, schools, second bathroom: often coordinated with selling current home — link to finance bridge and timing; emotional + logistics heavy.",
    steps: [
      { offset_days: 0, step_type: "task", title: "Call: family needs — schools, bedrooms, work commute", body: "Kids’ ages; flexible zones; yard vs low maintenance." },
      {
        offset_days: 2,
        step_type: "email",
        title: "Email: upsizer timeline — sell / buy overlap",
        body: "",
        email_subject: "Making the jump to more space",
        email_html: `${P("Hi there,<br/><br/>Overview of common paths: sell first with rent-back, buy subject to sale, or extended settlement — your broker nails the mechanics.")}${P("I’ll align the property search.")}`,
      },
      { offset_days: 10, step_type: "task", title: "Call: finance ceiling + comfort payment", body: "Daycare + mortgage reality — coach on guardrails." },
      { offset_days: 22, step_type: "task", title: "SMS: Saturday plan — family-friendly inspection roster", body: "Shorter slots if small kids; park nearby." },
      { offset_days: 35, step_type: "task", title: "Call: school zone verification", body: "Official sources; don’t promise what departments can change." },
      { offset_days: 50, step_type: "email", title: "Email: offer strength in family suburbs", body: "", email_subject: "When stock is tight — standing out cleanly", email_html: `${P("Hi there,<br/><br/>Ideas on clean terms sellers like: flexible settlement, minimal conditions where safe, deposit presentation.")}${P("Ethical wins only.")}` },
      { offset_days: 65, step_type: "task", title: "Social: DM family-oriented amenity map", body: "Parks, clinics, pools — whatever they mentioned." },
      { offset_days: 90, step_type: "task", title: "Call: 90-day — under offer or extend hunt", body: "Celebrate fatigue honestly; reset brief if needed." },
    ],
  },
];

function normalizeStarterSequenceName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const STARTER_SEQUENCE_NAMES_NORMALIZED = new Set(
  STARTER_NURTURE_SEQUENCES.map((x) => normalizeStarterSequenceName(x.name))
);

/** True when the sequence name matches a built-in starter pack (same rules as auto-enroll name matching). */
export function isStarterNurtureSequenceName(name: string): boolean {
  return STARTER_SEQUENCE_NAMES_NORMALIZED.has(normalizeStarterSequenceName(name));
}

/** Sort order index for starter rows (non-starters get a large number). */
export function starterNurtureSequenceSortIndex(name: string): number {
  const n = normalizeStarterSequenceName(name);
  const idx = STARTER_NURTURE_SEQUENCES.findIndex((x) => normalizeStarterSequenceName(x.name) === n);
  return idx === -1 ? 9999 : idx;
}
