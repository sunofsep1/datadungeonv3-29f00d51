import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMarkNotificationRead } from "@/hooks/useNotifications";
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";
import type { SellerLeadDraftReply } from "@/lib/sellerLeadNotifications";

/**
 * One-tap approval affordance for a `seller_lead_draft_reply` notification.
 * Loads the lead's phone, opens the SMS composer pre-filled with the drafted
 * reply, and marks the notification read once the agent sends. Reuses the
 * existing send-sms path (via SendSmsDialog) — the reply is never auto-sent.
 */
export function SellerLeadDraftReplyButton({ draft }: { draft: SellerLeadDraftReply }) {
  const { toast } = useToast();
  const markRead = useMarkNotificationRead();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState<{
    phone: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
  } | null>(null);

  const handleReview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("phone, first_name, last_name, name")
        .eq("id", draft.contactId)
        .maybeSingle();
      if (error) throw error;
      const phone = (data?.phone ?? "").trim();
      if (!phone) {
        toast({
          title: "No mobile on this lead",
          description: "Add a phone number to the contact, then send from their profile.",
          variant: "destructive",
        });
        return;
      }
      setContact({
        phone,
        firstName: data?.first_name ?? null,
        lastName: data?.last_name ?? null,
        name: data?.name ?? null,
      });
      setOpen(true);
    } catch (e) {
      toast({
        title: "Could not load the lead",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 text-xs border-primary/50 text-primary hover:bg-primary/10"
        onClick={handleReview}
        disabled={loading}
      >
        <Send className="mr-1 h-3 w-3" />
        {loading ? "Loading…" : "Review & send"}
      </Button>
      {contact ? (
        <SendSmsDialog
          open={open}
          onOpenChange={setOpen}
          to={contact.phone}
          contactId={draft.contactId}
          contactName={contact.name ?? undefined}
          firstName={contact.firstName}
          lastName={contact.lastName}
          initialBody={draft.draftBody}
          onSent={() => markRead.mutate(draft.notificationId)}
        />
      ) : null}
    </>
  );
}
