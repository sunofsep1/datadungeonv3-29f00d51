import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPrimaryEmail, type ContactWithMeta } from "@/hooks/useContacts";

function getSendBroadcastUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-broadcast` : null;
}

interface CampaignEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ContactWithMeta[];
  onSent?: () => void;
}

export function CampaignEmailDialog({
  open,
  onOpenChange,
  contacts,
  onSent,
}: CampaignEmailDialogProps) {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const contactsWithEmail = useMemo(() => {
    return contacts.filter((c) => {
      const email = getPrimaryEmail(c);
      return email && email.includes("@");
    });
  }, [contacts]);

  const selectedEmails = useMemo(() => {
    return contactsWithEmail.filter((c) => selectedIds.has(c.id)).map((c) => getPrimaryEmail(c)).filter((e): e is string => Boolean(e));
  }, [contactsWithEmail, selectedIds]);

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === contactsWithEmail.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contactsWithEmail.map((c) => c.id)));
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast({ title: "Error", description: "Please enter a subject", variant: "destructive" });
      return;
    }
    if (selectedEmails.length === 0) {
      toast({ title: "Error", description: "Select at least one contact with an email", variant: "destructive" });
      return;
    }
    const url = getSendBroadcastUrl();
    if (!url) {
      toast({ title: "Error", description: "Email service not configured", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Please sign in to send email", variant: "destructive" });
        return;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: selectedEmails,
          subject: subject.trim(),
          html: body.trim().replace(/\n/g, "<br>") || "<p></p>",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || res.statusText || "Failed to send");
      }
      const sent = (data as { sent?: number }).sent ?? selectedEmails.length;
      toast({ title: "Success", description: `Email sent to ${sent} contact(s).` });
      setSubject("");
      setBody("");
      setSelectedIds(new Set());
      onOpenChange(false);
      onSent?.();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to send campaign email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSubject("");
      setBody("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-popover border-border" aria-describedby="campaign-email-desc">
        <DialogHeader>
          <DialogTitle>Send campaign email</DialogTitle>
          <DialogDescription id="campaign-email-desc">
            Select contacts and send one email to all. Uses your configured email service.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recipients</Label>
              <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                {selectedIds.size === contactsWithEmail.length ? "Deselect all" : "Select all"}
              </Button>
            </div>
            <ScrollArea className="h-[140px] rounded-md border border-border p-2 bg-input/50">
              {contactsWithEmail.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts with email addresses.</p>
              ) : (
                <div className="space-y-2">
                  {contactsWithEmail.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleContact(c.id)}
                      />
                      <span className="text-sm truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {getPrimaryEmail(c) ?? ""}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              className="bg-input"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              className="bg-input min-h-[120px]"
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || selectedEmails.length === 0}>
              {sending ? "Sending..." : `Send to ${selectedEmails.length}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
