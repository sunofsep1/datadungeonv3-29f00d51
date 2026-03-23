/**
 * Starter nurture sequences — timed steps from enrollment day 0 (seller / buyer / past client).
 * Includes multiple seller and buyer journey templates (appraisal, listing, campaign, contract, etc.).
 * Each step’s `offset_days` is days after enrollment (not after the previous step).
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

export const STARTER_NURTURE_SEQUENCES: StarterNurtureSequence[] = [
  {
    name: "New seller — 30-day sequence",
    description:
      "Timed tasks for a new seller lead: qualify, pre-list, appraisal, prep, follow-up. Enroll when someone is a fresh seller lead.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Qualify motivation & timeline",
        body: "Day 1: why now, settlement timing, competition, constraints.",
      },
      {
        offset_days: 1,
        step_type: "task",
        title: "[Sequence] Send pre-list pack",
        body: "Market snapshot, process, fee conversation; confirm appraisal expectations.",
      },
      {
        offset_days: 3,
        step_type: "task",
        title: "[Sequence] Book appraisal (firm date/time)",
        body: "Lock the appointment; confirm access, pets, tenants.",
      },
      {
        offset_days: 7,
        step_type: "task",
        title: "[Sequence] Pre-appraisal property prep checklist",
        body: "Street appeal, repairs, declutter, compliance items that apply.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] Appraisal meeting — agree outcomes",
        body: "Range, method of sale, staging, photography timeline.",
      },
      {
        offset_days: 21,
        step_type: "task",
        title: "[Sequence] Post-appraisal follow-up",
        body: "Answer questions; written summary if promised; confirm next step.",
      },
      {
        offset_days: 30,
        step_type: "task",
        title: "[Sequence] 30-day milestone — listing path",
        body: "Go / no-go; if listing, lock marketing start date.",
      },
    ],
  },
  {
    name: "Active buyer — 90-day sequence",
    description:
      "90-day touch pattern: brief, alerts, check-ins, inspections, offer readiness. Enroll when someone is actively searching.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Confirm brief & budget",
        body: "Suburbs, must-haves, finance status, timeframe.",
      },
      {
        offset_days: 1,
        step_type: "task",
        title: "[Sequence] Send “how we work” + search alerts",
        body: "Portal alerts, off-market, inspection rhythm.",
      },
      {
        offset_days: 7,
        step_type: "task",
        title: "[Sequence] Week 1 check-in",
        body: "New listings + one market insight for their brief.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] Week 2 — book inspections block",
        body: "Aim for concrete Saturday / weekday slots.",
      },
      {
        offset_days: 30,
        step_type: "task",
        title: "[Sequence] 30-day review — adjust brief",
        body: "Shortlist, objections, refine search.",
      },
      {
        offset_days: 60,
        step_type: "task",
        title: "[Sequence] 60-day pulse — offer readiness",
        body: "Finance, deposit, building/pest, terms they’re comfortable with.",
      },
      {
        offset_days: 90,
        step_type: "task",
        title: "[Sequence] 90-day wrap — next steps",
        body: "Extend search, pause, or pivot suburbs/price band.",
      },
    ],
  },
  {
    name: "Past client — 12-month sequence",
    description:
      "12-month stay-in-touch: value touches, personal check-ins, referral moment, anniversary. Enroll after sale or for key sphere contacts.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Log key dates & preferences",
        body: "Anniversary, family notes, anything they shared — for future touches.",
      },
      {
        offset_days: 30,
        step_type: "task",
        title: "[Sequence] Month 1 — value touch",
        body: "Suburb pulse or ‘what’s your home worth?’ — soft, helpful.",
      },
      {
        offset_days: 120,
        step_type: "task",
        title: "[Sequence] ~Month 4 — personal check-in",
        body: "Life first; property second. Voice note or call.",
      },
      {
        offset_days: 210,
        step_type: "task",
        title: "[Sequence] ~Month 7 — local / seasonal tip",
        body: "Something relevant: rates, school intake, storm season — pick one.",
      },
      {
        offset_days: 300,
        step_type: "task",
        title: "[Sequence] ~Month 10 — referral prompt",
        body: "‘Know anyone thinking of moving?’ + offer a short intro call.",
      },
      {
        offset_days: 365,
        step_type: "task",
        title: "[Sequence] 12-month anniversary + review",
        body: "Congratulate their year; review ask if appropriate.",
      },
    ],
  },

  // —— Seller journeys (5) ——
  {
    name: "Seller — appraisal to listing decision (21 days)",
    description:
      "From fresh seller lead to signed listing path: qualify, appraisal, strategy, and go/no-go. Enroll when they want a market opinion or are comparing agents.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Qualify & book appraisal",
        body: "Why selling, timing, motivation, competition; lock a firm appraisal date/time and send what to expect.",
      },
      {
        offset_days: 2,
        step_type: "task",
        title: "[Sequence] Pre-appraisal prep reminder",
        body: "Access, pets, tenants, recent sales info they have; quick curb appeal tidy if needed.",
      },
      {
        offset_days: 7,
        step_type: "task",
        title: "[Sequence] Appraisal — price, method, marketing",
        body: "Comparable evidence, suggested range, auction vs private treaty, fee structure, staging/photo timeline.",
      },
      {
        offset_days: 10,
        step_type: "task",
        title: "[Sequence] Post-appraisal follow-up",
        body: "Answer objections; written summary if promised; confirm listing agreement or second meeting.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] Listing readiness checklist",
        body: "Compliance items, declutter plan, photography date, target go-live week.",
      },
      {
        offset_days: 21,
        step_type: "task",
        title: "[Sequence] 21-day decision — list or nurture",
        body: "If not listing: long-term nurture consent. If listing: lock marketing start and campaign deposit.",
      },
    ],
  },
  {
    name: "Seller — pre-listing & go-live (28 days)",
    description:
      "After they’ve chosen you: styling, photos, copy, compliance, then launch. Enroll when the listing agreement is signed and you’re heading to market.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Kickoff — timeline & method of sale",
        body: "Target launch date, auction/private dates, vendor expectations, communication rhythm.",
      },
      {
        offset_days: 3,
        step_type: "task",
        title: "[Sequence] Staging / styling locked in",
        body: "Book stylist or confirm owner prep; furniture plan if applicable.",
      },
      {
        offset_days: 7,
        step_type: "task",
        title: "[Sequence] Photography & floorplan",
        body: "Weather/weather backup; access; pets; highlight features list from vendor.",
      },
      {
        offset_days: 10,
        step_type: "task",
        title: "[Sequence] Copy & marketing pack review",
        body: "Headline, body, disclaimers; vendor approves before upload.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] Compliance & disclosures",
        body: "Smoke alarms, pool/spa, strata docs if unit; vendor declarations complete.",
      },
      {
        offset_days: 21,
        step_type: "task",
        title: "[Sequence] Pre-launch — portals & signboard",
        body: "Draft listings queued, signboard order, open home times pencilled.",
      },
      {
        offset_days: 28,
        step_type: "task",
        title: "[Sequence] Week one live — campaign check-in",
        body: "Early inquiry summary; feedback themes; confirm next opens or adjustments.",
      },
    ],
  },
  {
    name: "Seller — on-market campaign (45 days)",
    description:
      "While listed: opens, feedback, pricing conversations. Enroll when the property is live or within a few days of launch.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Campaign plan — opens & private inspections",
        body: "Confirm schedule; vendor knows how feedback will be shared.",
      },
      {
        offset_days: 3,
        step_type: "task",
        title: "[Sequence] First feedback digest",
        body: "Buyer comments, web stats if available; quick call or email to vendor.",
      },
      {
        offset_days: 7,
        step_type: "task",
        title: "[Sequence] Week 1 review",
        body: "Serious interest vs tyre-kickers; any early offer strategy.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] Fortnight campaign pulse",
        body: "Second inspections; discuss price guide or marketing refresh if quiet.",
      },
      {
        offset_days: 21,
        step_type: "task",
        title: "[Sequence] Three-week strategy checkpoint",
        body: "Adjustments: photos, copy tweak, additional channel, incentives.",
      },
      {
        offset_days: 30,
        step_type: "task",
        title: "[Sequence] 30-day review",
        body: "Formal sit-down: evidence-based recommendation (price, method, presentation).",
      },
      {
        offset_days: 45,
        step_type: "task",
        title: "[Sequence] 45-day decision",
        body: "Renew campaign, pause, or pivot — clear next 2 weeks.",
      },
    ],
  },
  {
    name: "Seller — under contract to settlement (30 days)",
    description:
      "Accepted offer through to keys: conditions, settlement prep, handover. Enroll when the contract is signed (subject to conditions as applicable).",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Congratulations — timeline & milestones",
        body: "Key dates: finance, building/pest, settlement; who does what; how you’ll update them.",
      },
      {
        offset_days: 3,
        step_type: "task",
        title: "[Sequence] Track buyer conditions",
        body: "Check in with buyer side if appropriate; remind vendor of access for inspections.",
      },
      {
        offset_days: 7,
        step_type: "task",
        title: "[Sequence] Mid-point pulse",
        body: "Unconditional or still waiting; any issues flagged early.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] Settlement prep — utilities & insurance",
        body: "Final meter reads, landlord/strata notices if relevant; insure until settlement.",
      },
      {
        offset_days: 21,
        step_type: "task",
        title: "[Sequence] Final week — keys & possession",
        body: "Confirm settlement time; key handover; any rent / tenant plan.",
      },
      {
        offset_days: 30,
        step_type: "task",
        title: "[Sequence] Post-settlement — thank-you & review",
        body: "Thank them; ask for review when appropriate; file for referrals.",
      },
    ],
  },
  {
    name: "Seller — not ready / long nurture (90 days)",
    description:
      "Respectful pipeline for ‘maybe later’ sellers: stay useful without pressure. Enroll when timing is 6–12+ months out or they’re researching only.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Set expectations & consent",
        body: "Acknowledge timeline; ask how often they want market updates; no hard sell.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] Suburb / micro-market snapshot",
        body: "2–3 recent sales or trends — short, helpful, branded.",
      },
      {
        offset_days: 30,
        step_type: "task",
        title: "[Sequence] Value touch — case study or testimonial",
        body: "Similar home or client story; keeps you top of mind.",
      },
      {
        offset_days: 45,
        step_type: "task",
        title: "[Sequence] Human check-in",
        body: "Call or voice note: life changes, job, renovation — adjust your notes.",
      },
      {
        offset_days: 60,
        step_type: "task",
        title: "[Sequence] Soft CMA or desktop appraisal offer",
        body: "‘Happy to refresh numbers when you’re ready’ — optional booking link.",
      },
      {
        offset_days: 90,
        step_type: "task",
        title: "[Sequence] 90-day — re-qualify timing",
        body: "Has window moved? Re-enroll in a shorter seller sequence if they’re warming up.",
      },
    ],
  },

  // —— Buyer journeys (5) ——
  {
    name: "Buyer — first home & early search (30 days)",
    description:
      "Education + finance + shortlist for newer buyers. Enroll at enquiry or first meeting before they’re inspecting weekly.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Budget, deposit & finance path",
        body: "Pre-approval status; broker referral if needed; realistic range including stamp duty and costs.",
      },
      {
        offset_days: 3,
        step_type: "task",
        title: "[Sequence] How buying works — timeline & costs",
        body: "Offer, cooling off if applicable, B&P, settlement, conveyancer role.",
      },
      {
        offset_days: 7,
        step_type: "task",
        title: "[Sequence] Build the brief",
        body: "Suburbs, non-negotiables, nice-to-haves, school catchments if relevant.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] Plan first inspection fortnight",
        body: "Aim for volume to calibrate; debrief template for what they liked/disliked.",
      },
      {
        offset_days: 21,
        step_type: "task",
        title: "[Sequence] Refine after first looks",
        body: "Adjust suburbs or property type; check pre-approval still matches.",
      },
      {
        offset_days: 30,
        step_type: "task",
        title: "[Sequence] Ready for active search?",
        body: "If yes: enroll ‘Active search’ sequence. If no: extend education touches.",
      },
    ],
  },
  {
    name: "Buyer — active search & inspections (60 days)",
    description:
      "High-touch while they’re comparing properties weekly. Enroll when they’re booking inspections and receiving alerts.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Sync alerts & off-market",
        body: "Confirm portals, price bands, instant alerts; any pocket listings you know.",
      },
      {
        offset_days: 5,
        step_type: "task",
        title: "[Sequence] Week 1 — inspection rhythm",
        body: "Target 3+ properties; capture likes/dislikes for brief refinement.",
      },
      {
        offset_days: 12,
        step_type: "task",
        title: "[Sequence] Brief checkpoint",
        body: "Too competitive? Expand radius? Up budget? Downsize must-haves?",
      },
      {
        offset_days: 20,
        step_type: "task",
        title: "[Sequence] Finance health check",
        body: "Pre-approval expiry, rate changes, max bid still valid.",
      },
      {
        offset_days: 30,
        step_type: "task",
        title: "[Sequence] Shortlist top 2–3",
        body: "Compare pros/cons; strata levies; future development overlays if needed.",
      },
      {
        offset_days: 45,
        step_type: "task",
        title: "[Sequence] Offer readiness",
        body: "Deposit path, B&P book, conveyancer on standby, settlement flexibility.",
      },
      {
        offset_days: 60,
        step_type: "task",
        title: "[Sequence] 60-day — pivot or persist",
        body: "Market reality vs expectations; pause, widen search, or push to offer sequence.",
      },
    ],
  },
  {
    name: "Buyer — offer & negotiation (21 days)",
    description:
      "From serious interest to accepted offer. Enroll when they’re ready to bid on a specific property or are in multi-offer.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Due diligence sprint",
        body: "Strata report, planning overlays, flood/bushfire if relevant; price rationale.",
      },
      {
        offset_days: 2,
        step_type: "task",
        title: "[Sequence] Offer structure",
        body: "Deposit, settlement, fixtures, rent-back, subject conditions — align with finance.",
      },
      {
        offset_days: 5,
        step_type: "task",
        title: "[Sequence] Present offer & follow up",
        body: "Confirm receipt; stay close to listing agent; manage vendor response timing.",
      },
      {
        offset_days: 10,
        step_type: "task",
        title: "[Sequence] Negotiation checkpoint",
        body: "Counters; walk-away number; emotional vs rational decision.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] If accepted — next steps pack",
        body: "Conveyancer, unconditional path, insurance from contract if required.",
      },
      {
        offset_days: 21,
        step_type: "task",
        title: "[Sequence] If not successful — debrief",
        body: "Lessons; brief update; next property pipeline.",
      },
    ],
  },
  {
    name: "Buyer — under contract to settlement (35 days)",
    description:
      "After acceptance: finance, conditions, settlement prep. Enroll when contract is signed (conditional or unconditional per your market).",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Milestone map — finance & conditions",
        body: "Finance due date, B&P, strata if unit; who orders what.",
      },
      {
        offset_days: 3,
        step_type: "task",
        title: "[Sequence] Broker / lender touchpoint",
        body: "Valuation ordered; any extra docs; stay ahead of deadlines.",
      },
      {
        offset_days: 7,
        step_type: "task",
        title: "[Sequence] Inspections & reports",
        body: "Book B&P; review results; negotiate only if contract allows.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] Conveyancer — settlement statement prep",
        body: "Adjustments, stamp duty, incoming funds timeline.",
      },
      {
        offset_days: 21,
        step_type: "task",
        title: "[Sequence] Insurance & utilities",
        body: "Building insurance from when required; power/water/nbn planning.",
      },
      {
        offset_days: 28,
        step_type: "task",
        title: "[Sequence] Pre-settlement inspection",
        body: "Checklist; photos if issues; liaison with agent/vendor.",
      },
      {
        offset_days: 35,
        step_type: "task",
        title: "[Sequence] Settlement day — keys & handover",
        body: "Confirm time; celebrate; move to post-purchase nurture if you use it.",
      },
    ],
  },
  {
    name: "Buyer — post-purchase & move-in (30 days)",
    description:
      "After settlement: practical help, relationship, referrals. Enroll at key handover or week of settlement.",
    steps: [
      {
        offset_days: 0,
        step_type: "task",
        title: "[Sequence] Congratulations — move-in checklist",
        body: "Mail redirect, cleaners, locksmiths, smoke alarm test — short list.",
      },
      {
        offset_days: 5,
        step_type: "task",
        title: "[Sequence] Local intro",
        body: "Tradies, cafes, schools, dog parks — match to what they care about.",
      },
      {
        offset_days: 14,
        step_type: "task",
        title: "[Sequence] How’s the new place?",
        body: "Human check-in; surface any issues you can help navigate (non-legal).",
      },
      {
        offset_days: 21,
        step_type: "task",
        title: "[Sequence] Review & referral moment",
        body: "Google review if happy; ‘know anyone looking?’ soft ask.",
      },
      {
        offset_days: 30,
        step_type: "task",
        title: "[Sequence] Ongoing relationship",
        body: "Add to past-client or investor nurture; market snapshot opt-in.",
      },
    ],
  },
];
