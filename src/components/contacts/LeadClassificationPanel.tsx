import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  ROLE_CATEGORIES,
  TIMEFRAME_CATEGORIES,
  LEAD_TEMPERATURES,
  JOURNEY_STAGES,
  RELATIONSHIP_CATEGORIES,
  ROLE_CATEGORY_LABELS,
  TIMEFRAME_LABELS,
  LEAD_TEMPERATURE_LABELS,
  JOURNEY_STAGE_LABELS,
  RELATIONSHIP_LABELS,
  parseClassificationMeta,
  parseTimeframeCategory,
  parseLeadTemperature,
  type ClassificationMeta,
  type JourneyStage,
} from "@/lib/leadCategories";
import { suggestedSequenceNamesForJourneyStage } from "@/lib/leadCategoryDerivation";
import {
  recalculateLeadTemperatureForced,
  recalculateLeadTemperatureForcedListing,
} from "@/lib/leadCategoryService";
import { tryAutoEnrollNurtureForContact } from "@/lib/nurtureAutoEnroll";
import { invalidateContactInteractions } from "@/lib/contactActivityLog";
import { Loader2, Tags } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

export type ClassificationRecord = {
  role_category?: string | null;
  timeframe_category?: string | null;
  lead_temperature?: string | null;
  journey_stage?: string | null;
  relationship_category?: string | null;
  classification_meta?: Json | null;
  do_not_contact?: boolean | null;
};

type EntityMode = "contact" | "listing";

function mergeMeta(prev: ClassificationMeta, field: keyof ClassificationMeta, source: "manual"): ClassificationMeta {
  return { ...prev, [field]: { source } };
}

const CLASSIFICATION_COLUMNS = [
  "classification_meta",
  "role_category",
  "timeframe_category",
  "lead_temperature",
  "journey_stage",
  "relationship_category",
] as const;

function supabaseUpdateErrorText(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { message?: string; details?: string; hint?: string };
    return [e.message, e.details, e.hint].filter(Boolean).join(" — ") || "Could not save";
  }
  if (error instanceof Error) return error.message;
  return "Could not save";
}

/** PostgREST / Postgres: missing migration columns or stale schema cache. */
function isLikelyClassificationSchemaError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  const msg = String(e.message ?? "").toLowerCase();
  const code = String(e.code ?? "");
  if (code === "42703" || code === "PGRST204") return true;
  if (msg.includes("column") && msg.includes("does not exist")) return true;
  if (msg.includes("could not find") && msg.includes("column")) return true;
  if (msg.includes("schema cache")) return true;
  for (const c of CLASSIFICATION_COLUMNS) {
    if (msg.includes(c)) return true;
  }
  return false;
}

const SCALAR_CLASSIFICATION_KEYS = [
  "role_category",
  "timeframe_category",
  "lead_temperature",
  "journey_stage",
  "relationship_category",
] as const;

/** True only when failing on `classification_meta` — retrying without it still sends scalars (pointless if role_category etc. are missing). */
function shouldRetryClassificationWithoutMetaOnly(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? "").toLowerCase();
  if (!msg.includes("classification_meta")) return false;
  return !SCALAR_CLASSIFICATION_KEYS.some((k) => msg.includes(k));
}

const CLASSIFICATION_SETUP_HINT = "Lead classification migration not applied on the server.";

function SourceHint({ manual }: { manual: boolean }) {
  return (
    <span className="text-[10px] text-muted-foreground tabular-nums">
      {manual ? "Manual" : "Auto"}
    </span>
  );
}

function autoEnrollFailureCopy(
  reason: "skipped_do_not_contact" | "skipped_lead_archived" | "skipped_referral_partner" | "no_candidates"
): { hint: string; toastDescription: string } {
  switch (reason) {
    case "skipped_do_not_contact":
      return {
        hint: "Do-not-contact on.",
        toastDescription: "Do-not-contact enabled.",
      };
    case "skipped_lead_archived":
      return {
        hint: "Lead archived.",
        toastDescription: "Lead archived.",
      };
    case "skipped_referral_partner":
      return {
        hint: "Referral partner role.",
        toastDescription: "Referral partner skipped.",
      };
    case "no_candidates":
      return {
        hint: "No matching sequence name for this classification.",
        toastDescription: "No sequence matched this classification.",
      };
  }
}

export function LeadClassificationPanel({
  mode,
  entityId,
  record,
  linkedContactId,
  linkedContactDoNotContact,
}: {
  mode: EntityMode;
  entityId: string;
  record: ClassificationRecord | null | undefined;
  /** When saving listing classification, auto-enroll this contact (if set). */
  linkedContactId?: string | null;
  /** Linked contact’s do-not-contact when `mode === "listing"` (listing row has no DNC). */
  linkedContactDoNotContact?: boolean | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  /** True after save failed because PostgREST has no classification columns (migration not applied). */
  const [classificationDbMissing, setClassificationDbMissing] = useState(false);
  /** Latest auto-enroll outcome for on-card visibility (toasts can be missed). */
  const [sequenceAutoEnrollHint, setSequenceAutoEnrollHint] = useState<string | null>(null);

  const meta = useMemo(() => parseClassificationMeta(record?.classification_meta), [record?.classification_meta]);

  const [role, setRole] = useState(record?.role_category ?? "");
  const [timeframe, setTimeframe] = useState(parseTimeframeCategory(record?.timeframe_category));
  const [temperature, setTemperature] = useState(parseLeadTemperature(record?.lead_temperature));
  const [journey, setJourney] = useState(record?.journey_stage ?? "");
  const [relationship, setRelationship] = useState(record?.relationship_category ?? "");

  useEffect(() => {
    if (!record) return;
    setRole(record.role_category ?? "");
    setTimeframe(parseTimeframeCategory(record.timeframe_category));
    setTemperature(parseLeadTemperature(record.lead_temperature));
    setJourney(record.journey_stage ?? "");
    setRelationship(record.relationship_category ?? "");
  }, [record]);

  if (!record && !entityId) return null;

  const suggestions = useMemo(() => {
    const st = journey ? (journey as JourneyStage) : null;
    const dnc = mode === "contact" ? record?.do_not_contact : linkedContactDoNotContact;
    return suggestedSequenceNamesForJourneyStage(st, {
      leadTemperature: temperature,
      doNotContact: dnc,
      roleCategory: role.trim() || null,
    });
  }, [journey, temperature, mode, record?.do_not_contact, linkedContactDoNotContact, role]);

  const table = mode === "contact" ? "contacts" : "listings";

  const runAutoEnrollAfterSave = async (
    contactId: string,
    patch: Record<string, unknown>
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const j = (patch.journey_stage !== undefined ? patch.journey_stage : journey) as string | null | undefined;
    const r = (patch.role_category !== undefined ? patch.role_category : role) as string | null | undefined;
    const temp = (patch.lead_temperature !== undefined ? patch.lead_temperature : temperature) as string;
    try {
      const result = await tryAutoEnrollNurtureForContact(supabase, user.id, contactId, {
        journey_stage: j ?? null,
        role_category: (r as string) || null,
        lead_temperature: temp,
        do_not_contact: mode === "contact" ? record?.do_not_contact : linkedContactDoNotContact ?? null,
      });
      if (result.ok) {
        setSequenceAutoEnrollHint(`Sequence started: ${result.sequenceName}`);
        toast({
          title: "Nurture sequence started",
          description: result.sequenceName,
        });
      } else if (result.reason === "no_matching_sequence" && result.candidates?.length) {
        const want = result.candidates[0];
        const msg = `No nurture sequence matched “${want}” (exact name). Seed starter packs on the Nurture page or rename a sequence to match.`;
        setSequenceAutoEnrollHint(msg);
        toast({
          title: "Saved — auto-enroll skipped",
          description: msg,
        });
      } else if (result.reason === "already_enrolled") {
        setSequenceAutoEnrollHint("Already on the matching nurture sequence — no change.");
        toast({
          title: "Nurture sequence unchanged",
          description: "This contact is already enrolled in the pack that matches this classification.",
        });
      } else if (
        result.reason === "skipped_do_not_contact" ||
        result.reason === "skipped_lead_archived" ||
        result.reason === "skipped_referral_partner" ||
        result.reason === "no_candidates"
      ) {
        const { hint, toastDescription } = autoEnrollFailureCopy(result.reason);
        setSequenceAutoEnrollHint(hint);
        toast({
          title: "Auto-enroll skipped",
          description: toastDescription,
        });
      }
    } catch {
      /* nurture tables / RLS */
    }
    await queryClient.invalidateQueries({ queryKey: ["nurture_sequence_enrollments"] });
    invalidateContactInteractions(queryClient, contactId);
  };

  const persist = async (patch: Record<string, unknown>, metaPatch: ClassificationMeta) => {
    setSaving(true);
    try {
      const metaJson = JSON.parse(JSON.stringify(metaPatch)) as Record<string, unknown>;
      const fullPayload = { ...patch, classification_meta: metaJson } as Record<string, unknown>;

      let { error } = await supabase.from(table).update(fullPayload as never).eq("id", entityId);

      // Only `classification_meta` unknown: retry without it. If `role_category` etc. are missing, retry would 400 again — skip.
      if (error && shouldRetryClassificationWithoutMetaOnly(error)) {
        const { classification_meta: _m, ...scalarsOnly } = fullPayload;
        const res = await supabase.from(table).update(scalarsOnly as never).eq("id", entityId);
        error = res.error;
        if (!error) {
          setClassificationDbMissing(false);
          toast({
            title: "Saved (partial)",
            description:
              "Saved without metadata JSON. Add classification_meta when the migration is applied, or reload the API schema.",
          });
          await queryClient.invalidateQueries({ queryKey: mode === "contact" ? ["contact", entityId] : ["listing", entityId] });
          await queryClient.invalidateQueries({ queryKey: mode === "contact" ? ["contacts"] : ["listings"] });
          if (mode === "contact") await runAutoEnrollAfterSave(entityId, patch);
          else if (linkedContactId) await runAutoEnrollAfterSave(linkedContactId, patch);
          return;
        }
      }

      if (error && isLikelyClassificationSchemaError(error)) {
        setClassificationDbMissing(true);
        toast({
          title: "Classification columns missing in Supabase",
          description: CLASSIFICATION_SETUP_HINT,
          variant: "destructive",
        });
        return;
      }

      if (error) throw error;

      setClassificationDbMissing(false);
      toast({ title: "Saved", description: "Classification updated" });
      await queryClient.invalidateQueries({ queryKey: mode === "contact" ? ["contact", entityId] : ["listing", entityId] });
      await queryClient.invalidateQueries({ queryKey: mode === "contact" ? ["contacts"] : ["listings"] });
      if (mode === "contact") {
        await runAutoEnrollAfterSave(entityId, patch);
      } else if (linkedContactId) {
        await runAutoEnrollAfterSave(linkedContactId, patch);
      }
    } catch (e) {
      toast({
        title: "Error",
        description: supabaseUpdateErrorText(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onFieldCommit = async (
    field: "role_category" | "timeframe_category" | "lead_temperature" | "journey_stage" | "relationship_category",
    value: string,
    metaKey: keyof ClassificationMeta
  ) => {
    const nextMeta = mergeMeta(meta, metaKey, "manual");
    await persist({ [field]: value || null }, nextMeta);
  };

  const handleRecalculateTemperature = async () => {
    setRecalcLoading(true);
    try {
      if (mode === "contact") {
        await recalculateLeadTemperatureForced(supabase, entityId);
        await queryClient.invalidateQueries({ queryKey: ["contact", entityId] });
        await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      } else {
        await recalculateLeadTemperatureForcedListing(supabase, entityId);
        await queryClient.invalidateQueries({ queryKey: ["listing", entityId] });
        await queryClient.invalidateQueries({ queryKey: ["listings"] });
      }
      toast({ title: "Temperature recalculated" });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Recalculate failed",
        variant: "destructive",
      });
    } finally {
      setRecalcLoading(false);
    }
  };

  return (
    <Card className="zoho-card p-6 border-border print:hidden">
      {classificationDbMissing && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground">
          <p className="font-medium text-destructive">{CLASSIFICATION_SETUP_HINT}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Tags className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Classification</h3>
          {saving && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-normal normal-case">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving…
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={recalcLoading}
          onClick={() => void handleRecalculateTemperature()}
        >
          {recalcLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Recalculate temperature
        </Button>
      </div>
      {sequenceAutoEnrollHint && (
        <div className="mb-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground">
          <span className="font-medium text-muted-foreground">Last nurture auto-enroll: </span>
          {sequenceAutoEnrollHint}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Role</Label>
            {meta.role_category?.source === "manual" ? <SourceHint manual /> : <SourceHint manual={false} />}
          </div>
          <Select
            value={role || "__none__"}
            onValueChange={(v) => {
              const val = v === "__none__" ? "" : v;
              setRole(val);
              void onFieldCommit("role_category", val, "role_category");
            }}
            disabled={saving}
          >
            <SelectTrigger className="bg-input h-9">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not set</SelectItem>
              {ROLE_CATEGORIES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_CATEGORY_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Timeframe</Label>
            {meta.timeframe_category?.source === "manual" ? <SourceHint manual /> : <SourceHint manual={false} />}
          </div>
          <Select
            value={timeframe}
            onValueChange={(v) => {
              setTimeframe(v as typeof timeframe);
              void onFieldCommit("timeframe_category", v, "timeframe_category");
            }}
            disabled={saving}
          >
            <SelectTrigger className="bg-input h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAME_CATEGORIES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIMEFRAME_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Lead temperature</Label>
            {meta.lead_temperature?.source === "manual" ? <SourceHint manual /> : <SourceHint manual={false} />}
          </div>
          <Select
            value={temperature}
            onValueChange={(v) => {
              setTemperature(v as typeof temperature);
              void onFieldCommit("lead_temperature", v, "lead_temperature");
            }}
            disabled={saving}
          >
            <SelectTrigger className="bg-input h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_TEMPERATURES.map((t) => (
                <SelectItem key={t} value={t}>
                  {LEAD_TEMPERATURE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Journey stage</Label>
            {meta.journey_stage?.source === "manual" ? <SourceHint manual /> : <SourceHint manual={false} />}
          </div>
          <Select
            value={journey || "__none__"}
            onValueChange={(v) => {
              const val = v === "__none__" ? "" : v;
              setJourney(val);
              void onFieldCommit("journey_stage", val, "journey_stage");
            }}
            disabled={saving}
          >
            <SelectTrigger className="bg-input h-9">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(280px,50vh)]">
              <SelectItem value="__none__">Not set</SelectItem>
              {JOURNEY_STAGES.map((j) => (
                <SelectItem key={j} value={j}>
                  {JOURNEY_STAGE_LABELS[j]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Relationship</Label>
            {meta.relationship_category?.source === "manual" ? <SourceHint manual /> : <SourceHint manual={false} />}
          </div>
          <Select
            value={relationship || "__none__"}
            onValueChange={(v) => {
              const val = v === "__none__" ? "" : v;
              setRelationship(val);
              void onFieldCommit("relationship_category", val, "relationship_category");
            }}
            disabled={saving}
          >
            <SelectTrigger className="bg-input h-9">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not set</SelectItem>
              {RELATIONSHIP_CATEGORIES.map((r) => (
                <SelectItem key={r} value={r}>
                  {RELATIONSHIP_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {suggestions.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
          <span className="font-medium text-foreground">Sequence ideas: </span>
          {suggestions.join(" · ")}
        </p>
      )}
    </Card>
  );
}
