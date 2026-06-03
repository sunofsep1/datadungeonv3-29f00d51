/**
 * SMS prospecting templates (AU / real estate), aligned with merge fields in smsTemplateMerge.
 * Source: SMS Prospecting Template Pack — Greg Leigh / Mobile Message conventions.
 */

export type SmsProspectingTemplate = {
  id: string;
  category: string;
  label: string;
  body: string;
  /** Commercial / marketing — default “include opt-out” on; transactional vendor/buyer messages may omit. */
  commercial: boolean;
};

export const SMS_PROSPECTING_TEMPLATE_CATEGORIES = [
  "New listing announcements",
  "Buyer prospect follow-ups",
  "Appraisal & listing pitches",
  "Market updates & nurture",
  "Open home / inspection",
  "Post-sale & referral",
  "Investor prospecting",
  "Seasonal & event-based",
  "Database reactivation",
] as const;

export const SMS_PROSPECTING_TEMPLATES: SmsProspectingTemplate[] = [
  {
    id: "1a",
    category: "New listing announcements",
    label: "1A — Just listed (buyer match)",
    commercial: true,
    body: "Hi {{first_name}}, a property just listed in {{custom2}} that matches what you're looking for — {{custom4}} at {{custom1}}. Want me to arrange a private viewing? {{signature}}. Reply STOP to opt out",
  },
  {
    id: "1b",
    category: "New listing announcements",
    label: "1B — Just listed (neighbours)",
    commercial: true,
    body: "Hi {{first_name}}, I've just listed a home near you at {{custom1}}, {{custom2}}. If you know anyone looking to buy or are curious about local values, happy to chat. {{signature}}. Reply STOP to opt out",
  },
  {
    id: "1c",
    category: "New listing announcements",
    label: "1C — Price guide / new to market",
    commercial: true,
    body: "Hi {{first_name}}, new to market in {{custom2}}: {{custom4}} with guide {{custom3}}. Photos and full details available — want me to send the link? {{signature}}. Reply STOP to opt out",
  },
  {
    id: "1d",
    category: "New listing announcements",
    label: "1D — Off-market listing",
    commercial: true,
    body: "Hi {{first_name}}, I have an off-market opportunity in {{custom2}} before it hits the portals — {{custom4}}. Keen for first look? {{signature}}. Reply STOP to opt out",
  },
  {
    id: "1e",
    category: "New listing announcements",
    label: "1E — Auction announcement",
    commercial: true,
    body: "Hi {{first_name}}, {{custom1}} in {{custom2}} is heading to auction on {{custom3}}. Great opportunity for a {{custom4}}. Want me to send you the contract? {{signature}}. Reply STOP to opt out",
  },
  {
    id: "2a",
    category: "Buyer prospect follow-ups",
    label: "2A — Post-inspection follow-up",
    commercial: true,
    body: "Hi {{first_name}}, thanks for coming through {{custom1}} today. What did you think? Happy to answer any questions or send the contract if you'd like to take a closer look. {{signature}}. STOP to opt out",
  },
  {
    id: "2b",
    category: "Buyer prospect follow-ups",
    label: "2B — Portal enquiry follow-up",
    commercial: true,
    body: "Hi {{first_name}}, thanks for your enquiry on {{custom1}}. I can arrange a private viewing this week — what day works best for you? {{signature}}. Reply STOP to opt out",
  },
  {
    id: "2c",
    category: "Buyer prospect follow-ups",
    label: "2C — Missed call / no-show",
    commercial: true,
    body: "Hi {{first_name}}, I tried to call you about {{custom1}} in {{custom2}}. No rush — if you're still interested, reply here and I'll send through the details. {{signature}}. STOP to opt out",
  },
  {
    id: "2d",
    category: "Buyer prospect follow-ups",
    label: "2D — Buyer nurture (nothing matched)",
    commercial: true,
    body: "Hi {{first_name}}, still keeping an eye out for the right {{custom4}} in {{custom2}} for you. A few new ones coming soon — shall I send details as they come up? {{signature}}. STOP to opt out",
  },
  {
    id: "2e",
    category: "Buyer prospect follow-ups",
    label: "2E — Contract sent follow-up",
    commercial: true,
    body: "Hi {{first_name}}, just sent through the contract for {{custom1}}. Let me know if you have any questions or want to discuss next steps. {{signature}}. STOP to opt out",
  },
  {
    id: "3a",
    category: "Appraisal & listing pitches",
    label: "3A — Appraisal offer (warm lead)",
    commercial: true,
    body: "Hi {{first_name}}, I've been active in {{custom2}} lately and thought you might be curious what your home at {{custom1}} could be worth in today's market. Happy to pop by for a no-obligation chat. {{signature}}. STOP to opt out",
  },
  {
    id: "3b",
    category: "Appraisal & listing pitches",
    label: "3B — Recent sale trigger",
    commercial: true,
    body: "Hi {{first_name}}, a home near you just sold — {{custom1}} for {{custom3}}. With results like that in {{custom2}}, it's worth knowing where your property sits. Want a quick update? {{signature}}. STOP to opt out",
  },
  {
    id: "3c",
    category: "Appraisal & listing pitches",
    label: "3C — Low stock / seller's market",
    commercial: true,
    body: "Hi {{first_name}}, only {{custom3}} homes are currently listed in {{custom2}} — lowest in months. If you've thought about selling, buyer demand is strong right now. Worth a chat? {{signature}}. STOP to opt out",
  },
  {
    id: "3d",
    category: "Appraisal & listing pitches",
    label: "3D — CMA / market report offer",
    commercial: true,
    body: "Hi {{first_name}}, I've put together a free market report for {{custom2}} — covers recent sales, price trends and days on market. Want me to send it through? {{signature}}. STOP to opt out",
  },
  {
    id: "3e",
    category: "Appraisal & listing pitches",
    label: "3E — Past appraisal re-engagement",
    commercial: true,
    body: "Hi {{first_name}}, it's been a while since we spoke about your property at {{custom1}}. The market's moved since then — happy to give you a fresh update if timing's better now. {{signature}}. STOP to opt out",
  },
  {
    id: "3f",
    category: "Appraisal & listing pitches",
    label: "3F — Just sold nearby (listing pitch)",
    commercial: true,
    body: "Hi {{first_name}}, just sold {{custom1}} in {{custom2}} — strong result at {{custom3}}. If you're curious how that compares to your place, happy to run the numbers. {{signature}}. STOP to opt out",
  },
  {
    id: "4a",
    category: "Market updates & nurture",
    label: "4A — Monthly market snapshot",
    commercial: true,
    body: "Hi {{first_name}}, quick {{custom2}} update: {{custom3}} sales last month, median days on market {{custom4}}. Buyers are active — happy to chat about what this means for you. {{signature}}. STOP to opt out",
  },
  {
    id: "4b",
    category: "Market updates & nurture",
    label: "4B — Interest rate update",
    commercial: true,
    body: "Hi {{first_name}}, the RBA held rates steady this month at {{custom3}}. Good news for buyers and sellers in {{custom2}}. Want to know how it affects your situation? {{signature}}. STOP to opt out",
  },
  {
    id: "4c",
    category: "Market updates & nurture",
    label: "4C — Quarterly review",
    commercial: true,
    body: "Hi {{first_name}}, just wrapped up the Q{{custom3}} numbers for {{custom2}} — some strong results. I've got a summary if you'd like to see how the area's tracking. {{signature}}. STOP to opt out",
  },
  {
    id: "4d",
    category: "Market updates & nurture",
    label: "4D — Local news / infrastructure",
    commercial: true,
    body: "Hi {{first_name}}, great news for {{custom2}} — {{custom3}}. This kind of development usually lifts local property values. Worth keeping in mind. {{signature}}. STOP to opt out",
  },
  {
    id: "4e",
    category: "Market updates & nurture",
    label: "4E — Rental yield / investor update",
    commercial: true,
    body: "Hi {{first_name}}, rental yields in {{custom2}} are sitting at {{custom3}} — one of the strongest in the Redlands. Good time to review your investment strategy. {{signature}}. STOP to opt out",
  },
  {
    id: "5a",
    category: "Open home / inspection",
    label: "5A — Open home invitation",
    commercial: true,
    body: "Hi {{first_name}}, open home this {{custom3}} at {{custom1}}, {{custom2}} — {{custom4}}. Come and have a look, I'd love to see you there. {{signature}}. STOP to opt out",
  },
  {
    id: "5b",
    category: "Open home / inspection",
    label: "5B — Open home reminder (day of)",
    commercial: true,
    body: "Hi {{first_name}}, reminder: open home today at {{custom1}}, {{custom2}} from {{custom3}}. See you there! {{signature}}. STOP to opt out",
  },
  {
    id: "5c",
    category: "Open home / inspection",
    label: "5C — Open home results (vendor)",
    commercial: false,
    body: "Hi {{first_name}}, good turnout today — {{custom3}} groups through {{custom1}}. Positive feedback overall. I'll call you tonight to go through it in detail. {{signature}}",
  },
  {
    id: "5d",
    category: "Open home / inspection",
    label: "5D — Private viewing offer",
    commercial: true,
    body: "Hi {{first_name}}, {{custom1}} in {{custom2}} has had strong interest. If you'd like a private viewing before the next open, I can arrange something this week. {{signature}}. STOP to opt out",
  },
  {
    id: "6a",
    category: "Post-sale & referral",
    label: "6A — Just sold (database)",
    commercial: true,
    body: "Hi {{first_name}}, great result — just sold {{custom1}} in {{custom2}} for {{custom3}}. Another happy seller in your area. If you ever need real estate advice, I'm here. {{signature}}. STOP to opt out",
  },
  {
    id: "6b",
    category: "Post-sale & referral",
    label: "6B — Settlement congrats (buyer)",
    commercial: false,
    body: "Hi {{first_name}}, congratulations — settlement complete on {{custom1}}! Welcome to {{custom2}}. If there's anything you need or anyone I can recommend, don't hesitate to reach out. {{signature}}",
  },
  {
    id: "6c",
    category: "Post-sale & referral",
    label: "6C — Referral request",
    commercial: true,
    body: "Hi {{first_name}}, hope you're enjoying {{custom1}}! If you know anyone thinking about buying or selling in the area, I'd really appreciate the referral. {{signature}}. STOP to opt out",
  },
  {
    id: "6d",
    category: "Post-sale & referral",
    label: "6D — Google review request",
    commercial: true,
    body: "Hi {{first_name}}, I'm really glad we got a great result on {{custom1}}. If you had a good experience, would you mind leaving a quick Google review? It means a lot. Here's the link: {{custom3}}. {{signature}}",
  },
  {
    id: "7a",
    category: "Investor prospecting",
    label: "7A — Investment opportunity alert",
    commercial: true,
    body: "Hi {{first_name}}, a strong investment opportunity just listed in {{custom2}} — {{custom4}}, {{custom3}} yield potential. Want me to send through the numbers? {{signature}}. STOP to opt out",
  },
  {
    id: "7b",
    category: "Investor prospecting",
    label: "7B — Portfolio review offer",
    commercial: true,
    body: "Hi {{first_name}}, with market conditions shifting in {{custom2}}, it might be a good time to review your portfolio. Happy to run through current values and rental data. {{signature}}. STOP to opt out",
  },
  {
    id: "7c",
    category: "Investor prospecting",
    label: "7C — Rental market update",
    commercial: true,
    body: "Hi {{first_name}}, vacancy rates in {{custom2}} are at {{custom3}} — tenants are competing for properties. If you're thinking of buying or selling an investment, let's chat. {{signature}}. STOP to opt out",
  },
  {
    id: "8a",
    category: "Seasonal & event-based",
    label: "8A — New Year kickoff",
    commercial: true,
    body: "Hi {{first_name}}, happy new year! The {{custom2}} market is off to a strong start. If 2026 is your year to buy or sell, I'd love to help. {{signature}}. STOP to opt out",
  },
  {
    id: "8b",
    category: "Seasonal & event-based",
    label: "8B — End of financial year",
    commercial: true,
    body: "Hi {{first_name}}, with EOFY around the corner, now's the time to review your property position — whether that's selling to settle a CGT event or buying to claim depreciation. Worth a chat? {{signature}}. STOP to opt out",
  },
  {
    id: "8c",
    category: "Seasonal & event-based",
    label: "8C — Spring selling season",
    commercial: true,
    body: "Hi {{first_name}}, spring market is heating up in {{custom2}}. If you're thinking of selling, the next 8-10 weeks are historically the busiest. Shall we have a chat? {{signature}}. STOP to opt out",
  },
  {
    id: "8d",
    category: "Seasonal & event-based",
    label: "8D — Pre-Christmas push",
    commercial: true,
    body: "Hi {{first_name}}, the market doesn't slow down over Christmas like people think. Serious buyers are still active in {{custom2}}. If you want to test the market before the new year, let's talk. {{signature}}. STOP to opt out",
  },
  {
    id: "8e",
    category: "Seasonal & event-based",
    label: "8E — Post-auction clearance rate",
    commercial: true,
    body: "Hi {{first_name}}, auction clearance rates in SEQ hit {{custom3}} this weekend — strong buyer confidence. If you've been thinking about selling in {{custom2}}, the demand is real. {{signature}}. STOP to opt out",
  },
  {
    id: "9a",
    category: "Database reactivation",
    label: "9A — Simple check-in",
    commercial: true,
    body: "Hi {{first_name}}, {{signature}}. It's been a while — just checking in. Are you still thinking about real estate in {{custom2}}, or has anything changed? No pressure at all. STOP to opt out",
  },
  {
    id: "9b",
    category: "Database reactivation",
    label: "9B — Things have changed",
    commercial: true,
    body: "Hi {{first_name}}, a lot has changed in {{custom2}} since we last spoke — prices, stock levels, buyer demand. Worth a fresh look if you're still considering a move. {{signature}}. STOP to opt out",
  },
  {
    id: "9c",
    category: "Database reactivation",
    label: "9C — Value-first re-engagement",
    commercial: true,
    body: "Hi {{first_name}}, I've just put together a free suburb report for {{custom2}} with the latest sales data and trends. Want me to send it to you? {{signature}}. STOP to opt out",
  },
  {
    id: "9d",
    category: "Database reactivation",
    label: "9D — Direct ask",
    commercial: true,
    body: "Hi {{first_name}}, I'll keep this short — are you still in the market to buy or sell in {{custom2}}? If so, I'd love to help. If not, no worries at all. {{signature}}. STOP to opt out",
  },
];

export function getSmsTemplateById(id: string): SmsProspectingTemplate | undefined {
  return SMS_PROSPECTING_TEMPLATES.find((t) => t.id === id);
}
