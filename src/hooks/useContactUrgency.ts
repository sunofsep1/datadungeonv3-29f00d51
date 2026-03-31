import { useMemo } from "react";
import { useContacts } from "@/hooks/useContacts";
import { useOpenContactTasksForUser } from "@/hooks/useContactTasks";
import { useAppointments } from "@/hooks/useAppointments";
import { buildContactUrgency, type ContactUrgencyResult } from "@/lib/contactUrgency";

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
