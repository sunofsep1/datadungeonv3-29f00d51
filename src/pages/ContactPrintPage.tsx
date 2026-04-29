/**
 * Standalone print view for a contact. Rendered without MainLayout so it can
 * be opened in an iframe for print preview or in a new window for printing.
 * No sidebar or app chrome.
 */
import { useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { format, isValid, parseISO } from "date-fns";
import { THEME_HTML_CLASSES } from "@/contexts/ThemeContext";
import { useContact } from "@/hooks/useContact";
import { useProperties } from "@/hooks/useProperties";
import { useContactTasks } from "@/hooks/useContactTasks";
import { useAppointments } from "@/hooks/useAppointments";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useScripts } from "@/hooks/useScripts";
import {
  useNurtureEnrollmentsForContact,
  useNurtureSequencesList,
} from "@/hooks/useNurtureSequences";
import { rankScriptsForContact } from "@/lib/scriptSuggestionsForContact";
import { buildContactUrgency } from "@/lib/contactUrgency";
import {
  ContactPrintLayout,
  type LinkedPropertyForPrint,
  type NurtureJourneyForPrint,
} from "@/components/contacts/ContactPrintLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { PrintReportLayout } from "@/components/print/PrintReportLayout";

export default function ContactPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const includeDateOfBirth = searchParams.get("dob") === "1";

  /**
   * Always use light theme tokens for this route so the iframe / new-tab preview looks like paper,
   * not the app’s dark palette. (Print @media rules also force white; this fixes on-screen preview.)
   */
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove(...([...THEME_HTML_CLASSES] as string[]));
    html.classList.add("light");
  }, []);
  const { data: contact, isLoading, isError } = useContact(id);
  const { data: allProperties = [] } = useProperties();
  const { data: enrollments = [] } = useNurtureEnrollmentsForContact(id);
  const { data: sequencesList = [] } = useNurtureSequencesList();
  const { data: contactTasks = [] } = useContactTasks(id);
  const { data: allAppointments = [] } = useAppointments();
  const { data: activityTop = [] } = useActivityLog({ contactId: id ?? null, limit: 1 });
  const { data: scripts = [] } = useScripts();

  const linkedProperties: LinkedPropertyForPrint[] = (contact?.contact_property_links ?? [])
    .map((link) => {
      const property = allProperties.find((p) => p.id === link.property_id);
      return property
        ? {
            id: link.id!,
            property_id: link.property_id,
            role: link.role ?? null,
            notes: link.notes ?? null,
            property: {
              id: property.id,
              address_line1: property.address_line1 ?? null,
              address_line2: property.address_line2 ?? null,
              city: property.city ?? null,
              state: property.state ?? null,
              postcode: property.postcode ?? null,
              country: property.country ?? null,
              property_type: property.property_type ?? null,
              bedrooms: property.bedrooms ?? null,
              bathrooms: property.bathrooms ?? null,
              price: property.price ?? null,
            },
          }
        : null;
    })
    .filter(Boolean) as LinkedPropertyForPrint[];

  const nurtureJourneys: NurtureJourneyForPrint[] = useMemo(() => {
    const seqMap = new Map(sequencesList.map((s) => [s.id, s]));
    return enrollments.map((e) => {
      const seq = seqMap.get(e.sequence_id);
      const steps = (seq?.steps ?? [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((st) => ({
          title: st.title ?? `Step ${(st.sort_order ?? 0) + 1}`,
          stepType: st.step_type ?? null,
        }));
      return {
        enrollmentId: e.id,
        sequenceName: seq?.name?.trim() || "Sequence",
        sequenceDescription: seq?.description?.trim() ?? null,
        startedAt: e.started_at,
        nextStepAt: e.next_step_at,
        currentStepIndex: e.current_step_index,
        totalSteps: steps.length,
        pauseFollowupCadence: Boolean(e.pause_followup_cadence),
        pauseReason: e.pause_reason ?? null,
        steps,
      };
    });
  }, [enrollments, sequencesList]);

  const contactAppointments = useMemo(
    () => (id ? allAppointments.filter((a) => a.contact_id === id) : []),
    [allAppointments, id],
  );

  const printBrief = useMemo(() => {
    if (!contact || !id) return undefined;
    const cc = (contact as { contact_category?: string | null }).contact_category?.trim() ?? null;
    const classificationKey = String(cc ?? "").toLowerCase();
    const classificationLabel =
      classificationKey === "top_100"
        ? "Top 100"
        : classificationKey === "past_client"
          ? "Past client"
          : classificationKey === "referral_partner"
            ? "Referral partner"
            : classificationKey === "hot_lead"
              ? "Hot lead"
              : classificationKey === "warm_lead"
                ? "Warm lead"
                : classificationKey === "seller_nurture"
                  ? "Seller nurture"
                  : cc
                    ? cc.replace(/_/g, " ")
                    : null;

    const urgency = buildContactUrgency({
      contactId: id,
      manualTier: null,
      lastActivityAt: (contact as { last_activity_at?: string | null }).last_activity_at ?? null,
      taskDueAts: contactTasks.map((t) => t.due_at),
      sequenceTaskDueAts: contactTasks
        .filter((t) => Boolean(t.sequence_enrollment_id))
        .map((t) => t.due_at),
      appointmentDates: contactAppointments.map((a) => a.date),
    });

    const nextRaw = (contact as { next_touch_date?: string | null }).next_touch_date?.trim();
    let nextTouchDisplay: string | null = null;
    if (nextRaw) {
      const d = parseISO(`${nextRaw.slice(0, 10)}T12:00:00`);
      nextTouchDisplay = isValid(d) ? format(d, "d MMMM yyyy") : nextRaw;
    }

    const j0 = nurtureJourneys[0];
    const activeNurtureHeadline = j0
      ? `${j0.sequenceName} · step ${Math.min(j0.currentStepIndex + 1, Math.max(j0.totalSteps, 1))} of ${j0.totalSteps || "—"}`
      : null;

    const ranked = rankScriptsForContact(scripts, cc);
    const talkingPointTitles = ranked
      .slice(0, 5)
      .map((s) => (s.title?.trim() ? s.title.trim() : "Script"))
      .filter(Boolean);

    const ltd = (contact as { last_touch_date?: string | null }).last_touch_date?.trim();
    let lastTouchSnapshot: string | null = null;
    if (ltd) {
      const d = parseISO(`${ltd.slice(0, 10)}T12:00:00`);
      lastTouchSnapshot = `Last touch: ${isValid(d) ? format(d, "d MMMM yyyy") : ltd} (CRM field)`;
    } else if (activityTop[0]) {
      const row = activityTop[0];
      const d = parseISO(row.occurred_at);
      lastTouchSnapshot = `Last touch: ${isValid(d) ? format(d, "d MMMM yyyy, h:mm a") : row.occurred_at} via ${row.activity_type.replace(/_/g, " ")}`;
    }

    const nurtureSnapshot = j0
      ? `Active nurture: ${j0.sequenceName} — step ${Math.min(j0.currentStepIndex + 1, Math.max(j0.totalSteps, 1))} of ${j0.totalSteps || "—"}`
      : "Active nurture: none";

    return {
      classificationLabel,
      urgency,
      nextTouchDisplay,
      activeNurtureHeadline,
      talkingPointTitles,
      lastTouchSnapshot,
      nurtureSnapshot,
    };
  }, [contact, id, contactTasks, contactAppointments, activityTop, scripts, nurtureJourneys]);

  if (isLoading) {
    return (
      <PrintReportLayout onClose={() => navigate(-1)}>
        <div className="contact-print-document">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PrintReportLayout>
    );
  }

  if (isError || !contact) {
    return (
      <PrintReportLayout onClose={() => navigate(-1)}>
        <p className="p-6 text-muted-foreground">Contact not found.</p>
      </PrintReportLayout>
    );
  }

  return (
    <PrintReportLayout onClose={() => navigate(-1)}>
      <ContactPrintLayout
        contact={contact}
        linkedProperties={linkedProperties}
        nurtureJourneys={nurtureJourneys}
        includeDateOfBirth={includeDateOfBirth}
        printBrief={printBrief}
      />
    </PrintReportLayout>
  );
}
