/** Reapit-style outreach flags on contacts (per-channel DNC). */
export type ContactOutreachFlags = {
  do_not_contact?: boolean | null;
  dnc_phone?: boolean | null;
  dnc_sms?: boolean | null;
  dnc_email?: boolean | null;
  dnc_mail?: boolean | null;
  email_opt_out?: boolean | null;
  sms_opt_out?: boolean | null;
};

export function contactBlocksAllOutreach(c: ContactOutreachFlags): boolean {
  return c.do_not_contact === true;
}

export function contactCanCall(c: ContactOutreachFlags): boolean {
  if (contactBlocksAllOutreach(c)) return false;
  return c.dnc_phone !== true;
}

export function contactCanSms(c: ContactOutreachFlags): boolean {
  if (contactBlocksAllOutreach(c)) return false;
  if (c.dnc_sms === true || c.sms_opt_out === true) return false;
  return true;
}

export function contactCanEmail(c: ContactOutreachFlags): boolean {
  if (contactBlocksAllOutreach(c)) return false;
  if (c.dnc_email === true || c.email_opt_out === true) return false;
  return true;
}

export function contactCanMail(c: ContactOutreachFlags): boolean {
  if (contactBlocksAllOutreach(c)) return false;
  return c.dnc_mail !== true;
}
