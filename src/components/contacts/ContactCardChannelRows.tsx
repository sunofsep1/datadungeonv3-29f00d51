import { useState } from "react";
import { Pencil, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { useToast } from "@/hooks/use-toast";
import type { ContactWithMeta, ContactEmailRow, ContactPhoneRow } from "@/hooks/useContacts";
import { getAllEmails, getAllPhones, useUpdateContact } from "@/hooks/useContacts";
import { useCreateContactChannel, useUpdateContactChannel } from "@/hooks/useContactChannels";
import { cn } from "@/lib/utils";

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

const SLOT_CLASS =
  "rounded-lg border border-border/80 bg-background/60 p-3 min-h-[4.25rem] flex flex-col gap-1";

function phoneSlotMeta(p: ContactPhoneRow): { code: string; label: string } {
  if (p.channelType === "mobile" || p.legacyField === "mobile") {
    return { code: "M", label: "Mobile" };
  }
  if (p.label && p.label !== "Phone" && p.label !== "Mobile") {
    return { code: p.label.charAt(0).toUpperCase(), label: p.label };
  }
  return { code: "P", label: "Phone" };
}

function emailSlotMeta(e: ContactEmailRow): { code: string; label: string } {
  if (e.label && e.label !== "Email") {
    return { code: "E", label: e.label };
  }
  return { code: "E", label: "Email" };
}

function ChannelSlot({
  code,
  label,
  children,
  actions,
}: {
  code: string;
  label: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className={SLOT_CLASS}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-foreground/80">
            {code}
          </span>
          <span className="truncate">{label}</span>
        </div>
        {actions}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
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

  const editActions = (onSave: () => void) => (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={() => void onSave()}
        disabled={busy}
        aria-label="Save"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={cancelEdit}
        disabled={busy}
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const editButton = (key: string, value: string, ariaLabel: string) => (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={() => {
        setEditingKey(key);
        setDraft(value);
      }}
      disabled={busy}
      aria-label={ariaLabel}
    >
      <Pencil className="h-3 w-3" />
    </Button>
  );

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {phones.map((p) => {
          const key = phoneRowKey(p);
          const isEditing = editingKey === key;
          const { code, label } = phoneSlotMeta(p);
          const telHref = `tel:${p.value.replace(/\s+/g, "")}`;

          return (
            <ChannelSlot
              key={key}
              code={code}
              label={label}
              actions={
                isEditing ? editActions(savePhone) : editButton(key, p.value, "Edit number")
              }
            >
              {isEditing ? (
                <Input
                  className="h-8 border-border/80 bg-background/80"
                  type="tel"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void savePhone();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  disabled={busy}
                />
              ) : (
                <a
                  href={telHref}
                  className="truncate text-sm font-medium text-primary hover:underline"
                >
                  {formatPhoneDisplay(p.value)}
                </a>
              )}
            </ChannelSlot>
          );
        })}

        {emails.map((e) => {
          const key = emailRowKey(e);
          const isEditing = editingKey === key;
          const { code, label } = emailSlotMeta(e);

          return (
            <ChannelSlot
              key={key}
              code={code}
              label={label}
              actions={
                isEditing ? editActions(saveEmail) : editButton(key, e.value, "Edit email")
              }
            >
              {isEditing ? (
                <Input
                  className="h-8 border-border/80 bg-background/80"
                  type="email"
                  value={draft}
                  onChange={(ev) => setDraft(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") void saveEmail();
                    if (ev.key === "Escape") cancelEdit();
                  }}
                  disabled={busy}
                />
              ) : (
                <a
                  href={`mailto:${e.value}`}
                  className="truncate text-sm font-medium text-primary hover:underline"
                >
                  {e.value}
                </a>
              )}
            </ChannelSlot>
          );
        })}
      </div>

      {adding ? (
        <div className={cn(SLOT_CLASS, "border-dashed sm:col-span-2 xl:col-span-4")}>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-foreground/80">
              +
            </span>
            <span>
              {adding === "email" ? "New email" : adding === "mobile" ? "New mobile" : "New phone"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-8 min-w-[160px] flex-1 max-w-sm border-border/80 bg-background/80"
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
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 border-border/80 bg-background/60 hover:bg-background/80"
            onClick={() => setAdding("email")}
            disabled={busy}
          >
            <Plus className="h-3.5 w-3.5" /> Email
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 border-border/80 bg-background/60 hover:bg-background/80"
            onClick={() => setAdding("phone")}
            disabled={busy}
          >
            <Plus className="h-3.5 w-3.5" /> Phone
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 border-border/80 bg-background/60 hover:bg-background/80"
            onClick={() => setAdding("mobile")}
            disabled={busy}
          >
            <Plus className="h-3.5 w-3.5" /> Mobile
          </Button>
        </div>
      )}
    </div>
  );
}
