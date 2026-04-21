import { useMemo, useState } from "react";
import { Mail, MessageSquare, User } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";
import { EmailComposeDialog } from "@/components/contacts/EmailComposeDialog";
import { useContacts, getContactDisplayName, getPrimaryEmail, getPrimaryPhone } from "@/hooks/useContacts";

type VisionDeskOutreachCardProps = {
  visionTitle: string;
};

export function VisionDeskOutreachCard({ visionTitle }: VisionDeskOutreachCardProps) {
  const { data: contacts = [] } = useContacts();
  const [q, setQ] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const [smsOpen, setSmsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const selected = useMemo(
    () => (contactId ? contacts.find((c) => c.id === contactId) ?? null : null),
    [contactId, contacts]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = !needle
      ? contacts
      : contacts.filter((c) => getContactDisplayName(c).toLowerCase().includes(needle));
    return list.slice(0, 80);
  }, [contacts, q]);

  const phone = selected ? getPrimaryPhone(selected) : null;
  const email = selected ? getPrimaryEmail(selected) : null;
  const name = selected ? getContactDisplayName(selected) : null;

  return (
    <>
      <Card className="zoho-card border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Text &amp; email</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Pick someone from your contacts, then compose an SMS or email while you work on{" "}
          <span className="text-foreground font-medium">{visionTitle}</span>.
        </p>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Search contacts</Label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name…"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Contact</Label>
          <select
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            value={contactId ?? ""}
            onChange={(e) => setContactId(e.target.value || null)}
          >
            <option value="">Select…</option>
            {filtered.map((c) => (
              <option key={c.id} value={c.id}>
                {getContactDisplayName(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" className="gap-1" disabled={!phone} onClick={() => setSmsOpen(true)}>
            <MessageSquare className="h-3.5 w-3.5" />
            SMS
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1" disabled={!email} onClick={() => setEmailOpen(true)}>
            <Mail className="h-3.5 w-3.5" />
            Email
          </Button>
        </div>
        {!selected ? null : !phone && !email ? (
          <p className="text-[11px] text-muted-foreground">Add a phone or email on this contact to enable outreach.</p>
        ) : null}
      </Card>

      {selected && phone ? (
        <SendSmsDialog
          open={smsOpen}
          onOpenChange={setSmsOpen}
          to={phone}
          contactId={selected.id}
          contactName={name ?? undefined}
          firstName={selected.first_name ?? null}
          lastName={selected.last_name ?? null}
        />
      ) : null}
      {selected && email ? (
        <EmailComposeDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          to={email}
          contactId={selected.id}
          contactName={name ?? undefined}
        />
      ) : null}
    </>
  );
}
