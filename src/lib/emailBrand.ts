/**
 * Branded email rendering for the Communications Station.
 *
 * Produces the EXACT GL. Greg Leigh Property email shell used by the funnel lead
 * confirmation (see supabase/functions/_shared/sellerLeadAutomation.ts →
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
 * Wrap plain-text body (paragraphs separated by blank lines) into the branded GL. Greg
 * Leigh Property shell. Header/signature/footer are byte-for-byte the funnel confirmation
 * email.
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
        <tr><td bgcolor="#0e2140" style="background:#0e2140;padding:34px 40px 30px;text-align:center;">
          <svg height="46" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1494 882" style="display:inline-block;vertical-align:middle;"><g transform="translate(80,802) scale(1,-1)" fill="#ffffff"><path d="M405 722Q473 722 516.0 703.0Q559 684 593 657Q605 648 613 648Q632 648 638 708H661Q659 669 658.0 613.5Q657 558 657 466H634Q627 526 612.5 570.5Q598 615 559 647Q535 670 499.5 683.0Q464 696 428 696Q373 696 334.0 667.5Q295 639 270.0 590.0Q245 541 233.0 479.5Q221 418 221 352Q221 172 270.5 89.0Q320 6 413 6Q437 6 455.0 12.0Q473 18 484 26Q498 36 503.0 47.5Q508 59 508 78V176Q508 222 500.5 244.5Q493 267 471.0 275.0Q449 283 407 284V304Q428 303 457.5 302.5Q487 302 519.0 301.5Q551 301 578 301Q620 301 655.0 302.0Q690 303 712 304V284Q693 283 683.5 277.0Q674 271 670.5 253.0Q667 235 667 198V0H647Q646 17 639.5 37.0Q633 57 618 57Q611 57 599.5 53.5Q588 50 564 36Q527 15 486.0 0.5Q445 -14 400 -14Q284 -14 204.0 29.0Q124 72 83.5 152.5Q43 233 43 346Q43 460 89.5 544.0Q136 628 217.5 675.0Q299 722 405 722Z"/><g transform="translate(575,0)"><path d="M349 708V688Q315 687 297.5 680.5Q280 674 274.0 656.5Q268 639 268 602V94Q268 63 272.5 48.0Q277 33 290.5 28.0Q304 23 331 23H380Q414 23 444.0 39.0Q474 55 498.0 84.5Q522 114 538.0 155.0Q554 196 562 246H585Q582 212 582 158Q582 135 583.0 91.0Q584 47 589 0Q538 2 474.0 2.5Q410 3 360 3Q335 3 296.0 3.0Q257 3 212.0 2.5Q167 2 121.0 1.5Q75 1 34 0V20Q66 22 82.0 28.0Q98 34 103.5 52.0Q109 70 109 106V602Q109 639 103.5 656.5Q98 674 81.5 680.5Q65 687 34 688V708Q59 707 101.5 706.0Q144 705 192 705Q236 705 278.5 706.0Q321 707 349 708Z"/></g></g><rect x="1299" y="687" width="115" height="115" fill="#c8a45a"/></svg>
          <div style="margin-top:14px;font-size:12.5px;letter-spacing:.28em;text-transform:uppercase;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-weight:600;">Greg Leigh Property</div>
          <div style="margin-top:6px;font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:#c6b58a;font-family:Arial,Helvetica,sans-serif;">Queensland Sotheby&#39;s International Realty</div>
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
          <p style="margin:0;font-size:11px;line-height:1.7;color:#8a8a8a;font-family:Arial,Helvetica,sans-serif;">Greg Leigh Property · Queensland Sotheby&#39;s International Realty · Redlands · <a href="https://gregleighproperty.com.au" rel="noopener" style="color:#8a8a8a;">gregleighproperty.com.au</a><br>Prefer not to hear from me? Just reply and let me know. Each office is independently owned and operated.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
