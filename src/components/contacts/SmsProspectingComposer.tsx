import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  SMS_PROSPECTING_TEMPLATES,
  SMS_PROSPECTING_TEMPLATE_CATEGORIES,
  type SmsProspectingTemplate,
} from "@/lib/smsProspectingTemplates";
import {
  appendCommercialOptOut,
  estimateSmsSegments,
  isSignatureUnfilled,
  listUnfilledCustomSlots,
  mergeSmsPlaceholders,
  messageHasOptOutInstruction,
  SMS_CUSTOM_FIELD_HINTS,
  type SmsMergeContext,
} from "@/lib/smsTemplateMerge";
import { cn } from "@/lib/utils";

export type SmsComposerCustomFields = {
  custom1: string;
  custom2: string;
  custom3: string;
  custom4: string;
};

const EMPTY_CUSTOM: SmsComposerCustomFields = {
  custom1: "",
  custom2: "",
  custom3: "",
  custom4: "",
};

export type SmsProspectingComposerProps = {
  body: string;
  onBodyChange: (value: string) => void;
  custom: SmsComposerCustomFields;
  onCustomChange: (next: SmsComposerCustomFields) => void;
  includeOptOutIfMissing: boolean;
  onIncludeOptOutIfMissingChange: (value: boolean) => void;
  mergePreviewContext: SmsMergeContext;
  /** Wider layout for bulk dialog */
  className?: string;
};

export function defaultSmsComposerCustomFields(): SmsComposerCustomFields {
  return { ...EMPTY_CUSTOM };
}

export function buildFinalSmsBody(
  draftBody: string,
  mergeCtx: SmsMergeContext,
  includeOptOutIfMissing: boolean,
): string {
  let text = mergeSmsPlaceholders(draftBody.trim(), mergeCtx);
  if (includeOptOutIfMissing) {
    text = appendCommercialOptOut(text);
  }
  return text.trim();
}

export function SmsProspectingComposer({
  body,
  onBodyChange,
  custom,
  onCustomChange,
  includeOptOutIfMissing,
  onIncludeOptOutIfMissingChange,
  mergePreviewContext,
  className,
}: SmsProspectingComposerProps) {
  const templatesByCategory = useMemo(() => {
    const map = new Map<string, SmsProspectingTemplate[]>();
    for (const c of SMS_PROSPECTING_TEMPLATE_CATEGORIES) {
      map.set(c, SMS_PROSPECTING_TEMPLATES.filter((t) => t.category === c));
    }
    return map;
  }, []);

  const matchedTemplate = useMemo(
    () => SMS_PROSPECTING_TEMPLATES.find((t) => t.body === body),
    [body],
  );

  const [categoryFilter, setCategoryFilter] = useState<string>(SMS_PROSPECTING_TEMPLATE_CATEGORIES[0]);
  /** When the body matches a template, keep the category control aligned with that template without syncing in an effect. */
  const selectCategory = matchedTemplate?.category ?? categoryFilter;

  const applyTemplate = (t: SmsProspectingTemplate) => {
    onBodyChange(t.body);
    onIncludeOptOutIfMissingChange(t.commercial);
  };

  const unfilled = listUnfilledCustomSlots(body, custom);
  const mergedDraft = mergeSmsPlaceholders(body, { ...mergePreviewContext, ...custom });
  const mergedFinal = includeOptOutIfMissing
    ? appendCommercialOptOut(mergedDraft)
    : mergedDraft;
  const alreadyHasOptOut = messageHasOptOutInstruction(mergedDraft);
  const { length: previewLen, segments: previewSeg } = estimateSmsSegments(mergedFinal);

  return (
    <div className={cn("space-y-5", className)}>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="space-y-2.5">
          <Label className="text-sm">Template category</Label>
          <Select value={selectCategory} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-input w-full h-10">
              <SelectValue placeholder="Choose a category…" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(60vh,320px)]">
              {SMS_PROSPECTING_TEMPLATE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2.5">
          <Label className="text-sm">Template</Label>
          <Select
            value={matchedTemplate?.id}
            onValueChange={(id) => {
              const t = SMS_PROSPECTING_TEMPLATES.find((x) => x.id === id);
              if (t) applyTemplate(t);
            }}
          >
            <SelectTrigger className="bg-input w-full h-10">
              <SelectValue placeholder="Choose a template…" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(60vh,360px)]">
              {(templatesByCategory.get(categoryFilter) ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!matchedTemplate && body.trim().length > 0 ? (
            <p className="text-xs text-muted-foreground">Message edited — pick a template again to replace, or keep your custom text.</p>
          ) : null}
        </div>
      </div>

      <Collapsible defaultOpen className="group/coll">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="w-full justify-between px-0 h-9 font-normal">
            <span className="text-sm text-muted-foreground">Merge fields (address, suburb, price, summary)</span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/coll:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Your SMS signature (name + agency) is set in{" "}
            <Link to="/settings" className="text-primary underline underline-offset-2">
              Settings
            </Link>
            . Use these four slots for listing-specific details (same values for bulk sends).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {SMS_CUSTOM_FIELD_HINTS.map((h) => (
              <div key={h.key} className="space-y-2">
                <Label className="text-xs font-medium">{h.label}</Label>
                <Input
                  className="bg-input h-10 px-3.5 text-sm"
                  placeholder={h.placeholder}
                  value={custom[h.key]}
                  onChange={(e) => onCustomChange({ ...custom, [h.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="space-y-1 flex-1 min-w-0">
          <Label htmlFor="sms-opt-out-toggle" className="text-sm font-medium cursor-pointer">
            Add opt-out if missing
          </Label>
          <p id="sms-opt-out-desc" className="text-xs text-muted-foreground leading-snug">
            For commercial SMS (Spam Act AU), include a working unsubscribe line. Turn off for transactional messages (e.g.
            vendor updates) when appropriate.
            {alreadyHasOptOut ? (
              <span className="block mt-1 text-emerald-600 dark:text-emerald-400">
                This draft already mentions STOP / opt out — nothing extra will be added unless you remove it.
              </span>
            ) : null}
          </p>
        </div>
        <Switch
          id="sms-opt-out-toggle"
          checked={includeOptOutIfMissing}
          onCheckedChange={onIncludeOptOutIfMissingChange}
          aria-describedby="sms-opt-out-desc"
        />
      </div>

      <div className="space-y-2.5">
        <Label className="text-sm">Message</Label>
        <Textarea
          className="bg-input min-h-[140px] font-mono text-sm px-3.5 py-3"
          placeholder="Type a message or pick a template above. Placeholders: {{first_name}}, {{signature}}, {{custom1}}…"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          maxLength={1600}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            Draft: {body.length} chars · Preview (merged): {previewLen} chars (~{previewSeg} SMS segment
            {previewSeg === 1 ? "" : "s"})
          </span>
        </div>
      </div>

      {isSignatureUnfilled(body, mergePreviewContext.signature) ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          This message uses <code className="text-[10px]">{"{{signature}}"}</code> but your SMS signature is empty.{" "}
          <Link to="/settings" className="font-medium underline underline-offset-2">
            Add it in Settings
          </Link>{" "}
          before sending.
        </p>
      ) : null}

      {unfilled.length > 0 ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Still empty: {unfilled.join(", ")} — fill these or edit the message so it reads correctly.
        </p>
      ) : null}

      <div className="space-y-2.5">
        <Label className="text-sm text-muted-foreground">Preview as sent</Label>
        <div className="rounded-lg border border-border bg-background p-4 text-sm whitespace-pre-wrap break-words min-h-[4rem] max-h-48 overflow-y-auto">
          {mergedFinal || <span className="text-muted-foreground italic">Nothing to preview yet.</span>}
        </div>
      </div>
    </div>
  );
}
