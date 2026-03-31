import { useMemo } from "react";
import { useContacts } from "@/hooks/useContacts";
import { useOpenContactTasksForUser } from "@/hooks/useContactTasks";
import { useAppointments } from "@/hooks/useAppointments";
import { buildContactUrgency, type ContactUrgencyResult } from "@/lib/contactUrgency";

type ContactUrgencyTier = "immediate" | "priority" | "planned" | "backlog";

function normalizeManualUrgencyTier(value: string | null | undefined): ContactUrgencyTier | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "immediate" || raw === "priority" || raw === "planned" || raw === "backlog") {
    return raw as ContactUrgencyTier;
  }
  const legacyMap: Record<string, ContactUrgencyTier> = {
    red: "immediate",
    orange: "priority",
    yellow: "priority",
    green: "planned",
    blue: "planned",
    purple: "backlog",
    pink: "backlog",
    gray: "backlog",
  };
  return legacyMap[raw] ?? null;
}

export function useContactUrgency() {
  const { data: contacts = [] } = useContacts();
  const { data: tasks = [] } = useOpenContactTasksForUser();
  const { data: appointments = [] } = useAppointments();

  const byContact = useMemo(() => {
    const contactMap = new Map<string, ContactUrgencyResult>();

    contacts.forEach((contact) => {
      const contactTasks = tasks.filter((task) => task.contact_id === contact.id);
      const contactAppointments = appointments.filter((appointment) => appointment.contact_id === contact.id);

      const result = buildContactUrgency({
        contactId: contact.id,
        manualTier: normalizeManualUrgencyTier((contact as { category?: string | null }).category),
        lastActivityAt: (contact as { last_activity_at?: string | null }).last_activity_at ?? null,
        taskDueAts: contactTasks.map((task) => task.due_at),
        sequenceTaskDueAts: contactTasks
          .filter((task) => Boolean(task.sequence_enrollment_id))
          .map((task) => task.due_at),
        appointmentDates: contactAppointments.map((appointment) => appointment.date),
      });

      contactMap.set(contact.id, result);
    });

    return contactMap;
  }, [appointments, contacts, tasks]);

  return {
    urgencyByContactId: byContact,
  };
}
