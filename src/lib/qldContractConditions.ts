/**
 * Queensland residential contract — common buyer-side special conditions.
 * Timeframes are indicative (calendar days from contract); not legal advice.
 * @see Lawlab, Coutts, QLD government buyer guidance on finance, B&P, due diligence, cooling-off.
 */

/** String values for Select components; map to integer days on save. */
export const QLD_CONDITION_DAY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Not set" },
  { value: "5", label: "5 business days (cooling-off style window)" },
  { value: "7", label: "7 days" },
  { value: "10", label: "10 days" },
  { value: "14", label: "14 days" },
  { value: "17", label: "17 days" },
  { value: "21", label: "21 days" },
  { value: "30", label: "30 days" },
  { value: "45", label: "45 days" },
  { value: "60", label: "60 days" },
];

export type QldConditionField =
  | "contract_finance_days"
  | "contract_building_pest_days"
  | "contract_due_diligence_days"
  | "contract_subject_sale_days"
  | "contract_body_corporate_days";

export const QLD_CONTRACT_CONDITIONS: {
  field: QldConditionField;
  title: string;
  blurb: string;
}[] = [
  {
    field: "contract_finance_days",
    title: "Finance approval",
    blurb:
      "Time for the buyer to obtain formal loan approval. In QLD, 14–21 days is common; shorter if pre-approved.",
  },
  {
    field: "contract_building_pest_days",
    title: "Building & pest inspection",
    blurb:
      "Window to obtain and review reports; unsatisfied reports may allow termination or negotiation depending on contract terms. Often 7–14 days.",
  },
  {
    field: "contract_due_diligence_days",
    title: "Due diligence / searches",
    blurb:
      "Broader investigations (title, planning, flood, infrastructure). Often added as a special condition — align with your solicitor’s draft.",
  },
  {
    field: "contract_subject_sale_days",
    title: "Subject to sale of buyer’s property",
    blurb:
      "Buyer needs to sell an existing home or align simultaneous settlement. Timeframes vary with market and finance.",
  },
  {
    field: "contract_body_corporate_days",
    title: "Body corporate information (units / townhouses)",
    blurb:
      "Time to obtain and review body corporate records and levies. Common on community-title stock in QLD.",
  },
];

export function daysToSelectValue(days: number | null | undefined): string {
  if (days == null) return "";
  return String(days);
}

export function selectValueToDays(value: string): number | null {
  if (!value.trim()) return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}
