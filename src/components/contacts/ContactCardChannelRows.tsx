import { useState } from "react";
import { Phone, Mail, Pencil, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { useToast } from "@/hooks/use-toast";
import type { ContactWithMeta, ContactEmailRow, ContactPhoneRow } from "@/hooks/useContacts";
import { getAllEmails, getAllPhones, useUpdateContact } from "@/hooks/useContacts";
import { useCreateContactChannel, useUpdateContactChannel } from "@/hooks/useContactChannels";

type Props = {
  contactId: string;
  contact: ContactWithMeta;
};

function emailRowKey(row: ContactEmailRow): string {
  return row.source === "channel" && row.channelId ? `c:${row.channelId}` : "legacy-email";
}

function phoneRowKey(row: ContactPhoneRow): string {
  if (row.source === "channel" && row.channelId) return `c:${row.channelId}`;
  return row.legacyField === "mobile" ? "legacy-mobile" : "legacy-phone";
}

function normEmail(s: string) {
  return s.trim().toLowerCase();
}

function normPhone(s: string) {
  return s.replace(/\s+/g, "").replace(/^\+61/, "0");
}

export function ContactCardChannelRows({ contactId, contact }: Props) {
  const { toast } = useToast();
  const updateContact = useUpdateContact();
  const createChannel = useCreateContactChannel();
  const updateChannel = useUpdateContactChannel();

  const emails = getAllEmails(contact);
  const phones = getAllPhones(contact);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState<null | "email" | "phone" | "mobile">(null);
  const [addDraft, setAddDraft] = useState("");

  const cancelEdit = () => {
    setEditingKey(null);
    setDraft("");
  };

  const saveEmail = async () => {
    if (!editingKey) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    const dup = emails.some(
      (e) => emailRowKey(e) !== editingKey && normEmail(e.value) === normEmail(trimmed)
    );
    if (dup) {
      toast({
        title: "Duplicate email",
        description: "That address is already on this card.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (editingKey.startsWith("c:")) {
        await updateChannel.mutateAsync({
          id: editingKey.slice(2),
          contact_id: contactId,
          value: trimmed,
        });
      } else {
        await updateContact.mutateAsync({
          id: contactId,
          email: trimmed,
        } as Parameters<typeof updateContact.mutateAsync>[0]);
      }
      toast({ title: "Saved" });
      cancelEdit();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Could not save", description: msg, variant: "destructive" });
    }
  };

  const savePhone = async () => {
    if (!editingKey) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      toast({ title: "Number required", variant: "destructive" });
      return;
    }
    const dup = phones.some(
      (p) => phoneRowKey(p) !== editingKey && normPhone(p.value) === normPhone(trimmed)
    );
    if (dup) {
      toast({
        title: "Duplicate number",
        description: "That number is already on this card.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (editingKey.startsWith("c:")) {
        const row = phones.find((p) => p.source === "channel" && `c:${p.channelId}` === editingKey);
        await updateChannel.mutateAsync({
          id: editingKey.slice(2),
          contact_id: contactId,
          value: trimmed,
          ...(row?.channelType ? { channel_type: row.channelType } : {}),
        });
      } else if (editingKey === "legacy-mobile") {
        await updateContact.mutateAsync({
          id: contactId,
          mobile: trimmed,
        } as Parameters<typeof updateContact.mutateAsync>[0]);
      } else {
        await updateContact.mutateAsync({
          id: contactId,
          phone: trimmed,
        } as Parameters<typeof updateContact.mutateAsync>[0]);
      }
      toast({ title: "Saved" });
      cancelEdit();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Could not save", description: msg, variant: "destructive" });
    }
  };

  const submitAdd = async () => {
    if (!adding) return;
    const v = addDraft.trim();
    if (!v) {
      toast({ title: "Enter a value", variant: "destructive" });
      return;
    }
    try {
      if (adding === "email") {
        if (emails.some((e) => normEmail(e.value) === normEmail(v))) {
          toast({ title: "Duplicate email", variant: "destructive" });
          return;
        }
        await createChannel.mutateAsync({
          contact_id: contactId,
          channel_type: "email",
          value: v,
          is_primary: emails.length === 0,
        });
      } else {
        if (phones.some((p) => normPhone(p.value) === normPhone(v))) {
          toast({ title: "Duplicate number", variant: "destructive" });
          return;
        }
        await createChannel.mutateAsync({
          contact_id: contactId,
          channel_type: adding,
          value: v,
          is_primary: phones.length === 0,
        });
      }
      toast({ title: "Added" });
      setAdding(null);
      setAddDraft("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast({ title: "Could not add", description: msg, variant: "destructive" });
    }
  };

  const busy =
    updateContact.isPending || createChannel.isPending || updateChannel.isPending;

  return (
    <div className="flex flex-col gap-3 text-sm">
      {phones.map((p) => {
        const key = phoneRowKey(p);
        const isEditing = editingKey === key;
        return (
          <div
            key={key}
            className="flex items-center gap-2 rounded-lg py-2.5 px-3 border border-border bg-muted/50 shadow-sm"
          >
            <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
            {isEditing ? (
              <>
                <Input
                  className="h-8 flex-1 min-w-0 bg-background"
                  type="tel"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void savePhone();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  disabled={busy}
                />
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => void savePhone()} disabled={busy}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEdit} disabled={busy}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="text-foreground flex-1 min-w-0">{formatPhoneDisplay(p.value)}</span>
                {(p.channelType === "mobile" || p.legacyField === "mobile") && (
                  <span className="text-muted-foreground text-xs shrink-0">Mobile</span>
                )}
                {p.label !== "Phone" && p.label !== "Mobile" && (
                  <span className="text-muted-foreground text-xs shrink-0">({p.label})</span>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditingKey(key);
                    setDraft(p.value);
                  }}
                  disabled={busy}
                  aria-label="Edit number"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        );
      })}

      {emails.map((e) => {
        const key = emailRowKey(e);
        const isEditing = editingKey === key;
        return (
          <div
            key={key}
            className="flex items-center gap-2 rounded-lg py-2.5 px-3 border border-border bg-muted/50 shadow-sm"
          >
            <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
            {isEditing ? (
              <>
                <Input
                  className="h-8 flex-1 min-w-0 bg-background"
                  type="email"
                  value={draft}
                  onChange={(ev) => setDraft(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") void saveEmail();
                    if (ev.key === "Escape") cancelEdit();
                  }}
                  disabled={busy}
                />
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => void saveEmail()} disabled={busy}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={cancelEdit} disabled={busy}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="text-foreground truncate flex-1 min-w-0">{e.value}</span>
                {e.label !== "Email" && <span className="text-muted-foreground text-xs shrink-0">({e.label})</span>}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditingKey(key);
                    setDraft(e.value);
                  }}
                  disabled={busy}
                  aria-label="Edit email"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg py-2 px-3 border border-dashed border-border bg-muted/20">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {adding === "email" ? "New email" : adding === "mobile" ? "New mobile" : "New phone"}
          </span>
          <Input
            className="h-8 flex-1 min-w-[160px] max-w-sm bg-background"
            type={adding === "email" ? "email" : "tel"}
            value={addDraft}
            onChange={(ev) => setAddDraft(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") void submitAdd();
              if (ev.key === "Escape") {
                setAdding(null);
                setAddDraft("");
              }
            }}
            disabled={busy}
            placeholder={adding === "email" ? "you@example.com" : "04…"}
          />
          <Button type="button" size="sm" onClick={() => void submitAdd()} disabled={busy}>
            Add
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setAdding(null);
              setAddDraft("");
            }}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1 h-8" onClick={() => setAdding("email")} disabled={busy}>
            <Plus className="w-3.5 h-3.5" /> Email
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1 h-8" onClick={() => setAdding("phone")} disabled={busy}>
            <Plus className="w-3.5 h-3.5" /> Phone
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1 h-8" onClick={() => setAdding("mobile")} disabled={busy}>
            <Plus className="w-3.5 h-3.5" /> Mobile
          </Button>
        </div>
      )}
    </div>
  );
}
