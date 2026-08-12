/**
 * Branded email rendering for the Communications Station.
 *
 * Produces the EXACT Queensland Sotheby's International Realty email shell used by
 * the funnel lead confirmation (see supabase/functions/_shared/sellerLeadAutomation.ts →
 * composeProspectAckEmail). Client-side render so we can pass finished HTML to the
 * existing `send-email` edge function unchanged.
 */
import { mergeSmsPlaceholders, type SmsMergeContext } from "@/lib/smsTemplateMerge";

export function escapeEmailHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Extra named merge tokens on top of the shared SMS merge (first_name, name, signature, custom1-4). */
export type TemplateMergeContext = SmsMergeContext & {
  agent_name?: string;
  agent_phone?: string;
  office?: string;
};

/**
 * Merge template placeholders. Reuses the shared SMS merge for name/signature/custom
 * fields, then resolves the agent tokens. Manual placeholders written as [property address],
 * [suburb], [time], [price], [offer] are intentionally left in place for the sender to fill.
 */
export function applyTemplateMerge(text: string, ctx: TemplateMergeContext): string {
  let s = mergeSmsPlaceholders(text ?? "", ctx);
  const pairs: [RegExp, string][] = [
    [/\{\{\s*agent_name\s*\}\}/gi, ctx.agent_name ?? "Greg Leigh"],
    [/\{\{\s*agent_phone\s*\}\}/gi, ctx.agent_phone ?? "0466 805 992"],
    [/\{\{\s*office\s*\}\}/gi, ctx.office ?? "Queensland Sotheby's International Realty"],
  ];
  for (const [re, val] of pairs) s = s.replace(re, val);
  return s;
}

/** True when a template still has unfilled manual placeholders like [property address]. */
export function findUnfilledPlaceholders(text: string): string[] {
  const found = new Set<string>();
  const re = /\[([a-z][a-z0-9 /_-]{1,40})\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text ?? "")) !== null) found.add(`[${m[1]}]`);
  return [...found];
}

/**
 * Wrap plain-text body (paragraphs separated by blank lines) into the branded QSIR shell.
 * Header/signature/footer are byte-for-byte the funnel confirmation email.
 */
export function renderBrandedEmailHtml(opts: {
  eyebrow?: string;
  heading?: string;
  bodyText: string;
}): string {
  const eyebrow = (opts.eyebrow ?? "").trim();
  const heading = (opts.heading ?? "").trim();
  const paras = (opts.bodyText ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 18px;font-size:16px;line-height:1.75;">${escapeEmailHtml(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("\n          ");

  const eyebrowHtml = eyebrow
    ? `<p style="margin:0 0 10px;font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#b08d3f;font-family:Arial,Helvetica,sans-serif;">${escapeEmailHtml(eyebrow)}</p>`
    : "";
  const headingHtml = heading
    ? `<h1 style="margin:0 0 24px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-weight:600;font-size:33px;line-height:1.2;color:#0e2140;">${escapeEmailHtml(heading)}</h1>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&display=swap');</style></head>
<body style="margin:0;padding:0;background:#f3efe7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e8e1d4;">
        <tr><td bgcolor="#0e2140" style="background:#0e2140;padding:34px 40px;text-align:center;">
          <img src="https://redlandshomevalue.com.au/assets/qsir-email-logo.png" width="360" alt="Queensland Sotheby&#39;s International Realty" style="display:inline-block;width:100%;max-width:360px;height:auto;border:0;">
        </td></tr>
        <tr><td style="height:3px;line-height:3px;font-size:0;background:#b08d3f;">&nbsp;</td></tr>
        <tr><td style="padding:46px 48px 40px;font-family:Georgia,'Times New Roman',serif;color:#20242e;">
          ${eyebrowHtml}
          ${headingHtml}
          ${paras}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e1d4;"><tr><td style="padding-top:24px;">
            <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:#0e2140;line-height:1.2;">Greg Leigh</div>
            <div style="margin-top:5px;font-size:13px;line-height:1.7;color:#6b6b6b;font-family:Arial,Helvetica,sans-serif;">Local Redlands Property Specialist<br>Queensland Sotheby&#39;s International Realty<br><a href="https://gregleighproperty.com.au" rel="noopener" style="color:#b08d3f;text-decoration:none;">gregleighproperty.com.au</a></div>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:#f3efe7;padding:22px 40px;text-align:center;border-top:1px solid #e8e1d4;">
          <p style="margin:0;font-size:11px;line-height:1.7;color:#8a8a8a;font-family:Arial,Helvetica,sans-serif;">Greg Leigh · Queensland Sotheby&#39;s International Realty · Redlands · <a href="https://gregleighproperty.com.au" rel="noopener" style="color:#8a8a8a;">gregleighproperty.com.au</a><br>Prefer not to hear from me? Just reply and let me know. Each office is independently owned and operated.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
