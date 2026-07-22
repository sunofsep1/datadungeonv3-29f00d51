import { useMemo } from "react";
import { applyTemplateMerge, renderBrandedEmailHtml } from "@/lib/emailBrand";

const SAMPLE = { first_name: "Sarah", name: "Sarah Chen" } as const;

interface TemplatePreviewProps {
  channel: "email" | "sms" | "both";
  eyebrow?: string;
  heading?: string;
  subject?: string;
  emailBody?: string;
  smsBody?: string;
}

/** Live preview of a template with sample merge data. Manual [placeholders] are left visible. */
export function TemplatePreview({ channel, eyebrow, heading, subject, emailBody, smsBody }: TemplatePreviewProps) {
  const html = useMemo(
    () =>
      renderBrandedEmailHtml({
        eyebrow: applyTemplateMerge(eyebrow ?? "", SAMPLE),
        heading: applyTemplateMerge(heading ?? "", SAMPLE),
        bodyText: applyTemplateMerge(emailBody ?? "", SAMPLE),
      }),
    [eyebrow, heading, emailBody],
  );
  const smsText = useMemo(() => applyTemplateMerge(smsBody ?? "", SAMPLE), [smsBody]);
  const showEmail = channel === "email" || channel === "both";
  const showSms = channel === "sms" || channel === "both";

  return (
    <div className="space-y-4">
      {showEmail && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            Email preview{subject ? ` · ${applyTemplateMerge(subject, SAMPLE)}` : ""}
          </p>
          <div className="rounded-lg overflow-hidden border border-border bg-white">
            <iframe
              title="Email preview"
              srcDoc={html}
              sandbox=""
              className="w-full"
              style={{ height: 460, border: "0" }}
            />
          </div>
        </div>
      )}
      {showSms && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">SMS preview</p>
          <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm whitespace-pre-wrap max-w-md">
            {smsText || <span className="text-muted-foreground">No SMS text</span>}
          </div>
        </div>
      )}
    </div>
  );
}
