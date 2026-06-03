import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreateAppointment, useUpdateAppointment, type Appointment } from "@/hooks/useAppointments";
import { addHours, format } from "date-fns";

const getGcalUrl = () => {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/google-calendar` : null;
};

export type CreateAppointmentWithGcalParams = {
  title: string;
  date: string;
  location?: string | null;
  notes?: string | null;
  type?: string | null;
  contact_id?: string | null;
  syncToGoogle?: boolean;
  endDateTime?: string;
};

/**
 * Single path: create appointment in DB then optionally sync to Google Calendar.
 * Surfaces sync errors via toast. Optionally stores google_event_id on the appointment.
 */
export function useCreateAppointmentWithGcal() {
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const { toast } = useToast();

  const createWithGcal = useCallback(
    async (params: CreateAppointmentWithGcalParams): Promise<Appointment> => {
      const {
        title,
        date,
        location = null,
        notes = null,
        type = "meeting",
        contact_id = null,
        syncToGoogle = true,
        endDateTime: endParam,
      } = params;

      const appointment = await createAppointment.mutateAsync({
        title,
        date,
        location,
        notes,
        type,
        contact_id,
      });

      if (syncToGoogle) {
        const gcalUrl = getGcalUrl();
        if (gcalUrl) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const endDateTime =
                endParam || format(addHours(new Date(date), 1), "yyyy-MM-dd'T'HH:mm:ss");
              const gcalRes = await fetch(`${gcalUrl}?action=create-event`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  summary: title,
                  description: notes || "",
                  start: date,
                  end: endDateTime,
                  location: location || "",
                }),
              });
              const gcalData = await gcalRes.json().catch(() => ({}));

              if (!gcalRes.ok) {
                const msg =
                  gcalData?.error === "Not connected" || gcalData?.needsAuth
                    ? "Connect Google Calendar in the calendar widget to sync events."
                    : gcalData?.error ?? `Error ${gcalRes.status}. Check connection or try connecting Google again.`;
                toast({
                  title: "Google Calendar sync failed",
                  description: msg,
                  variant: "destructive",
                });
              } else {
                if (gcalData?.event?.id) {
                  await updateAppointment.mutateAsync({
                    id: appointment.id,
                    google_event_id: gcalData.event.id,
                  });
                }
                toast({ title: "Synced", description: "Added to Google Calendar" });
              }
            }
          } catch (e) {
            console.error("Google Calendar sync failed:", e);
            toast({
              title: "Google Calendar sync failed",
              description:
                e instanceof Error ? e.message : "Could not reach calendar. Check connection.",
              variant: "destructive",
            });
          }
        }
      }

      return appointment;
    },
    [createAppointment, updateAppointment, toast]
  );

  return {
    mutateAsync: createWithGcal,
    isPending: createAppointment.isPending,
  };
}
