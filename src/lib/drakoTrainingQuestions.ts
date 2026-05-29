/**
 * drakoTrainingQuestions.ts
 * Question bank for "Drako's Trials" — an in-CRM Australian real estate
 * training game (multiple choice).
 *
 * IMPORTANT: This is sales-coaching / training content, not legal advice.
 * Compliance rules vary by state and territory and change over time.
 * Always verify against current legislation and your agency's policies.
 *
 * Adding questions: just push more objects into QUESTIONS. The game picks a
 * shuffled subset per round, so the bank can grow indefinitely.
 */

export type TrainingCategory =
  | "objections"
  | "listing"
  | "compliance"
  | "negotiation";

export interface TrainingCategoryMeta {
  id: TrainingCategory;
  label: string;
  blurb: string;
  /** Emoji-free short icon hint used by the page (lucide name). */
  icon: "shield" | "scroll" | "scale" | "handshake";
}

export const CATEGORY_META: TrainingCategoryMeta[] = [
  {
    id: "objections",
    label: "Vendor Objections",
    blurb: "Handle the classic seller pushbacks — price, fee, timing, exclusivity.",
    icon: "shield",
  },
  {
    id: "listing",
    label: "Listing & Appraisal",
    blurb: "Appraisals, CMAs, listing presentations and method of sale.",
    icon: "scroll",
  },
  {
    id: "compliance",
    label: "Compliance & Legal",
    blurb: "Aussie practice: disclosure, underquoting, trust money, cooling-off.",
    icon: "scale",
  },
  {
    id: "negotiation",
    label: "Buyer & Negotiation",
    blurb: "Qualifying buyers, managing offers and closing the deal.",
    icon: "handshake",
  },
];

export interface TrainingQuestion {
  id: string;
  category: TrainingCategory;
  difficulty: 1 | 2 | 3;
  /** The objection or scenario. */
  prompt: string;
  options: string[];
  /** Index into options of the best answer. */
  correctIndex: number;
  /** Why the answer is best — shown after answering. */
  explanation: string;
}

export const QUESTIONS: TrainingQuestion[] = [
  // ---------------------------------------------------------------- OBJECTIONS
  {
    id: "obj-fee-cheaper",
    category: "objections",
    difficulty: 1,
    prompt:
      'Vendor: "The agent down the road only charges 1.5%. Why are you more expensive?"',
    options: [
      "Immediately match their rate so you don't lose the listing.",
      "Shift the conversation from rate to net result — what ends up in their pocket after a stronger sale and marketing campaign.",
      "Tell them the cheaper agent must be desperate for business.",
      "Explain you have fixed overheads and can't move on price.",
    ],
    correctIndex: 1,
    explanation:
      "Commission is a percentage of the result, not the cost. Reframe to net proceeds: a slightly higher fee that delivers a materially higher sale price leaves the vendor better off. Discounting on the spot also signals your negotiation skill on their behalf is weak.",
  },
  {
    id: "obj-price-higher",
    category: "objections",
    difficulty: 2,
    prompt:
      'Vendor wants to list $80k above your appraised range "to leave room to negotiate."',
    options: [
      "Agree — a high price gives bargaining room and keeps the vendor happy.",
      "Refuse to take the listing under any circumstances.",
      "Walk them through recent comparable sales and the cost of overpricing: fewer enquiries, longer days on market, and an eventual price drop that signals weakness.",
      "List at their price quietly and plan to condition them down later.",
    ],
    correctIndex: 2,
    explanation:
      "Overpricing typically lengthens days on market and reduces buyer enquiry during the critical first weeks. Educate with comparable evidence up front rather than 'buying' the listing at an unrealistic price and conditioning later, which erodes trust.",
  },
  {
    id: "obj-open-listing",
    category: "objections",
    difficulty: 2,
    prompt:
      'Vendor: "I\'d rather list with a few agents (open listing) so I get more reach."',
    options: [
      "Agree — more agents always means more buyers.",
      "Explain that an exclusive agency concentrates accountability and marketing investment in one agent, while open listings often mean none of them commit budget or effort.",
      "Tell them open listings are illegal.",
      "Refuse to discuss it and end the meeting.",
    ],
    correctIndex: 1,
    explanation:
      "With an open listing no single agent is incentivised to invest in marketing or fully commit, and buyer enquiry gets fragmented. An exclusive agency aligns the agent's effort and spend with a single, accountable outcome.",
  },
  {
    id: "obj-wait-spring",
    category: "objections",
    difficulty: 2,
    prompt:
      'Vendor: "Let\'s just wait until spring — the market will be better then."',
    options: [
      "Agree immediately; spring is always the best time to sell.",
      "Acknowledge the seasonality belief, then discuss current buyer demand vs. listing competition — spring often brings more stock and therefore more competition for the same buyers.",
      "Tell them the market will crash so they must sell today.",
      "Drop the appraisal price to scare them into acting now.",
    ],
    correctIndex: 1,
    explanation:
      "Spring brings more buyers but also more competing listings, which can dilute attention on any one property. The right call depends on the local supply/demand balance now — present the data rather than relying on a seasonal rule of thumb or fear tactics.",
  },
  {
    id: "obj-think-about-it",
    category: "objections",
    difficulty: 1,
    prompt:
      'At the listing presentation the vendor says: "We need to think about it."',
    options: [
      "Pack up and tell them to call when ready.",
      "Pressure them to sign on the spot before they change their mind.",
      "Ask what specifically they'd like to think about — surfacing the real concern (price, fee, timing, trust) so you can address it directly.",
      "Lower your commission to force a decision.",
    ],
    correctIndex: 2,
    explanation:
      '"We need to think about it" is rarely the real objection. A calm, curious question isolates the actual concern so you can resolve it, rather than guessing or discounting.',
  },
  {
    id: "obj-friend-agent",
    category: "objections",
    difficulty: 1,
    prompt:
      'Vendor: "We have a friend in real estate we feel we should use."',
    options: [
      "Criticise the friend's track record to win the business.",
      "Acknowledge the relationship, then ask about the friend's recent results and local-area experience so the vendor compares on outcome, not just loyalty.",
      "Tell them friends never sell well for each other.",
      "Give up — you can't compete with a personal relationship.",
    ],
    correctIndex: 1,
    explanation:
      "Don't attack the relationship. Redirect to objective criteria — recent comparable sales, local market knowledge, marketing plan — so the vendor weighs the decision on results rather than obligation.",
  },

  // ------------------------------------------------------------------ LISTING
  {
    id: "lst-appraisal-vs-valuation",
    category: "listing",
    difficulty: 2,
    prompt:
      "What is the key difference between an agent's appraisal and a formal property valuation?",
    options: [
      "There is no difference; the terms are interchangeable.",
      "An appraisal is an agent's opinion of likely selling price; a valuation is a formal, legally recognised assessment by a registered/certified practising valuer.",
      "A valuation is always lower than an appraisal.",
      "Only an appraisal can be used by a bank for lending.",
    ],
    correctIndex: 1,
    explanation:
      "An agent's appraisal is an estimate of market value/likely selling range and is not a sworn document. A valuation is prepared by a qualified valuer and is what lenders rely on. Never present an appraisal as a valuation.",
  },
  {
    id: "lst-cma-basis",
    category: "listing",
    difficulty: 1,
    prompt:
      "A comparative market analysis (CMA) should be built primarily on what?",
    options: [
      "The vendor's outstanding mortgage balance.",
      "What the vendor 'needs' to fund their next purchase.",
      "Recent comparable sales and current competing listings in the local area.",
      "The original purchase price plus a fixed annual growth percentage.",
    ],
    correctIndex: 2,
    explanation:
      "Market value is set by recent comparable sales and current competition — not by the vendor's debt, needs, or a flat growth assumption. Those personal factors are motivations, not evidence of value.",
  },
  {
    id: "lst-method-of-sale",
    category: "listing",
    difficulty: 2,
    prompt:
      "When is an auction campaign often most suitable?",
    options: [
      "When the property is hard to value, unique, or likely to attract strong competing buyer demand.",
      "Whenever the vendor wants a guaranteed sale price before the campaign.",
      "Only for properties below the median price.",
      "When the vendor wants to avoid any marketing costs.",
    ],
    correctIndex: 0,
    explanation:
      "Auctions create competition and a deadline, which suits unique or hard-to-price homes with genuine demand. They don't guarantee a price, and they typically involve a structured (often vendor-paid) marketing spend.",
  },
  {
    id: "lst-marketing-spend",
    category: "listing",
    difficulty: 1,
    prompt:
      "Why is a tailored marketing plan a core part of the listing presentation?",
    options: [
      "It lets the agency profit from advertising fees.",
      "It maximises buyer reach and competition for the property, which supports the best price — and sets clear expectations with the vendor.",
      "It is legally required to spend a minimum amount on every listing.",
      "It replaces the need for accurate pricing.",
    ],
    correctIndex: 1,
    explanation:
      "Marketing exists to put the property in front of the largest pool of qualified buyers, driving competition and price. Agreeing the plan and budget up front also avoids friction mid-campaign.",
  },
  {
    id: "lst-days-on-market",
    category: "listing",
    difficulty: 2,
    prompt:
      "Why are the first two to three weeks of a campaign usually the most important?",
    options: [
      "Portals delete listings after three weeks.",
      "Buyer interest and enquiry typically peak when a listing is fresh; a price that's too high wastes this window.",
      "Cooling-off periods only apply in the first three weeks.",
      "Commission is only earned if the property sells in three weeks.",
    ],
    correctIndex: 1,
    explanation:
      "New listings attract the most attention. If the price deters buyers during this peak-enquiry window, the property can go stale and later attract lower offers — reinforcing why correct pricing from day one matters.",
  },

  // --------------------------------------------------------------- COMPLIANCE
  {
    id: "cmp-underquoting",
    category: "compliance",
    difficulty: 2,
    prompt:
      "Under Australian consumer/property law (e.g. NSW, VIC), underquoting refers to:",
    options: [
      "Advertising a property at or below a price the agent believes is too low to be accepted.",
      "Marketing a property at a price less than the agent's reasonable estimate of its likely selling price (or below the price in the agency agreement).",
      "Quoting a buyer a lower commission than the vendor.",
      "Telling a vendor their property is worth less than it is.",
    ],
    correctIndex: 1,
    explanation:
      "Underquoting — illegal in states like NSW and Victoria — is advertising or quoting a price below the agent's genuine estimated selling price (or below the figure recorded in the agency agreement / a rejected written offer). Penalties apply. Specifics vary by state, so check current local rules.",
  },
  {
    id: "cmp-cooling-off-auction",
    category: "compliance",
    difficulty: 2,
    prompt:
      "A buyer purchases a property under the hammer at auction. What about cooling-off rights?",
    options: [
      "They get the standard cooling-off period like any sale.",
      "There is generally no cooling-off period for a property bought at auction.",
      "Cooling-off is doubled for auction purchases.",
      "Cooling-off applies only if they paid a deposit.",
    ],
    correctIndex: 1,
    explanation:
      "Across Australian jurisdictions, a sale made at auction (and typically a private-treaty sale on the same day before/after an auction) does not attract a cooling-off period. Cooling-off lengths for ordinary private-treaty sales vary by state — verify the current figure for your jurisdiction.",
  },
  {
    id: "cmp-trust-account",
    category: "compliance",
    difficulty: 1,
    prompt:
      "Where must a deposit paid to a real estate agency be held?",
    options: [
      "In the agent's personal bank account until settlement.",
      "In the agency's general operating account.",
      "In a dedicated, audited trust account, kept separate from the agency's own money.",
      "With the selling agent in cash until the vendor collects it.",
    ],
    correctIndex: 2,
    explanation:
      "Client money such as deposits must be held in a licensed agent's statutory trust account, separated from business funds and subject to strict record-keeping and auditing. Misuse of trust money is a serious offence.",
  },
  {
    id: "cmp-material-facts",
    category: "compliance",
    difficulty: 3,
    prompt:
      "An agent becomes aware the property had significant flooding two years ago. What should they do?",
    options: [
      "Stay silent — buyers should do their own due diligence.",
      "Only mention it if a buyer directly asks.",
      "Disclose it — material facts that could affect a buyer's decision must not be concealed or misrepresented.",
      "Tell buyers it has never flooded to protect the sale.",
    ],
    correctIndex: 2,
    explanation:
      "Agents must not engage in misleading or deceptive conduct and must disclose material facts (some are specifically prescribed, e.g. in NSW). Concealing a known material defect exposes the agent and vendor to serious liability. Exact disclosure regimes vary by state (e.g. VIC's vendor statement / Section 32).",
  },
  {
    id: "cmp-agency-agreement",
    category: "compliance",
    difficulty: 1,
    prompt:
      "Before marketing a property, the agent must generally have:",
    options: [
      "A verbal handshake agreement with the vendor.",
      "A signed written agency agreement with the vendor setting out the terms and fees.",
      "Only the vendor's email confirmation.",
      "Approval from the buyer's solicitor.",
    ],
    correctIndex: 1,
    explanation:
      "A written, signed agency agreement is required before an agent can act and be entitled to commission. It must disclose fees and, in many states, the estimated selling price. Some states also give the vendor a short cooling-off period on the agreement itself.",
  },
  {
    id: "cmp-firb",
    category: "compliance",
    difficulty: 3,
    prompt:
      "A foreign (non-resident) buyer wants to purchase an established dwelling. What's the key consideration?",
    options: [
      "Foreign buyers face no special rules.",
      "Foreign buyers generally need Foreign Investment Review Board (FIRB) approval, and there are restrictions on purchasing established dwellings.",
      "Foreign buyers can only buy at auction.",
      "Foreign buyers must pay the full price in cash on the day.",
    ],
    correctIndex: 1,
    explanation:
      "Non-resident foreign persons generally require FIRB approval and face restrictions — they're typically limited to new dwellings or vacant land rather than established homes, with limited exceptions. Get specialist/legal advice for these transactions.",
  },

  // -------------------------------------------------------------- NEGOTIATION
  {
    id: "neg-qualify-buyer",
    category: "negotiation",
    difficulty: 1,
    prompt:
      "What's the most useful early step when qualifying a buyer enquiry?",
    options: [
      "Ask only for their name and move on.",
      "Understand their budget, finance position (e.g. pre-approval), motivation and timeframe.",
      "Assume everyone at the open home is a serious buyer.",
      "Quote a price well below the range to get them excited.",
    ],
    correctIndex: 1,
    explanation:
      "Qualifying — budget, finance readiness, motivation and timeframe — lets you focus effort on genuine buyers and gives the vendor accurate feedback. It also avoids progressing offers that can't actually proceed to finance.",
  },
  {
    id: "neg-multiple-offers",
    category: "negotiation",
    difficulty: 2,
    prompt:
      "You receive multiple written offers on a private-treaty listing. Best practice is to:",
    options: [
      "Secretly tell each buyer a fake higher number to push them up.",
      "Handle all offers fairly and transparently, presenting them to the vendor, while following your legal disclosure obligations.",
      "Accept the first offer without telling the vendor about the others.",
      "Only present the highest offer and discard the rest.",
    ],
    correctIndex: 1,
    explanation:
      "All genuine offers should be presented to the vendor (the decision-maker), and buyers must be dealt with honestly. Fabricating competing offers (a 'dummy bid' equivalent) is misleading conduct and unlawful.",
  },
  {
    id: "neg-vendor-decides",
    category: "negotiation",
    difficulty: 1,
    prompt:
      "Who ultimately decides whether to accept an offer?",
    options: [
      "The agent, because they know the market best.",
      "The vendor — the agent advises and negotiates, but the decision is the vendor's.",
      "Whichever buyer offers first.",
      "The buyer's conveyancer.",
    ],
    correctIndex: 1,
    explanation:
      "The agent acts on the vendor's instructions. You advise, present offers and negotiate, but accepting or rejecting an offer is always the vendor's call.",
  },
  {
    id: "neg-lowball",
    category: "negotiation",
    difficulty: 2,
    prompt:
      "A buyer submits a lowball offer well under the range. The best response is to:",
    options: [
      "Reject it rudely so they don't waste your time.",
      "Present it to the vendor and keep the buyer engaged — anchor them back toward value with comparable evidence rather than dismissing them.",
      "Hide it from the vendor because it's too low.",
      "Immediately tell them the vendor will never accept and hang up.",
    ],
    correctIndex: 1,
    explanation:
      "A low offer is still a buyer in the market. Present it (it's the vendor's decision), then work the buyer up with evidence. Many strong sales start from a modest opening offer that's nurtured upward.",
  },
  {
    id: "neg-create-urgency",
    category: "negotiation",
    difficulty: 2,
    prompt:
      "Which approach ethically encourages a hesitant but interested buyer to act?",
    options: [
      "Invent other buyers and fake deadlines.",
      "Share genuine market activity — real enquiry levels, scheduled inspections or offers — and the real campaign timeline.",
      "Tell them the price will definitely rise tomorrow.",
      "Refuse to answer their questions to create mystery.",
    ],
    correctIndex: 1,
    explanation:
      "Real urgency comes from genuine competition and a clear, honest timeline. Fabricating buyers or deadlines is misleading and deceptive conduct, with serious legal and reputational risk.",
  },
  {
    id: "neg-finance-clause",
    category: "negotiation",
    difficulty: 3,
    prompt:
      "Two offers arrive: one slightly higher but subject to finance, one slightly lower with unconditional/cash terms. What should the agent do?",
    options: [
      "Always recommend the highest dollar figure regardless of conditions.",
      "Explain the trade-off to the vendor — price vs. certainty/risk of the conditional offer falling over — and let the vendor decide.",
      "Only present the unconditional offer.",
      "Accept the cash offer on the vendor's behalf to be safe.",
    ],
    correctIndex: 1,
    explanation:
      "Headline price isn't everything: a conditional (subject-to-finance) offer carries fall-over risk, while an unconditional offer provides certainty. The agent's job is to lay out the trade-offs clearly so the vendor makes an informed choice.",
  },
];

/** Convenience: questions for a single category. */
export function questionsForCategory(cat: TrainingCategory): TrainingQuestion[] {
  return QUESTIONS.filter((q) => q.category === cat);
}
