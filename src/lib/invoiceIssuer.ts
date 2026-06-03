export const DEFAULT_REIMBURSEMENT_NOTE =
  "Reimbursement of marketing and advertising expenses paid from personal funds on behalf of the agency. No ABN quoted: this reimbursement is not a supply of goods or services. It is an internal expense reimbursement between an employee/contractor and their principal agency. No ABN withholding is required.";

export const GREG_INVOICE_ISSUER = {
  name: "Greg Leigh",
  title: "Real Estate Sales Executive",
  agency: "Queensland Sotheby's International Realty",
  suburb: "Thornlands, QLD",
  email: "sunofsep@gmail.com",
  bank: {
    institution: "Westpac — Choice Basic",
    bsb: "734-059",
    account: "837828",
  },
} as const;

export const DEFAULT_AGENCY_COUNTERPARTY = {
  name: "Queensland Sotheby's International Realty",
  attention: "Accounts Department",
} as const;
