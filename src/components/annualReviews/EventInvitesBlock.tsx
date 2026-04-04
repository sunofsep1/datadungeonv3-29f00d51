import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  useAddEventInvites,
  useContactsForEventInvites,
  useEventInvites,
  useRemoveEventInvite,
  useUpdateEventInviteRsvp,
  type ContactPickerRow,
  type EventInviteWithContact,
} from "@/hooks/useAnnualReviews";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2, Trash2 } from "lucide-react";

const RSVP_OPTIONS = [
  { value: "invited", label: "Invited" },
  { value: "confirmed", label: "Confirmed" },
  { value: "declined", label: "Declined" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No show" },
] as const;

function pickerLabel(c: ContactPickerRow): string {
  const n = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  if (n) return n;
  if (c.name?.trim()) return c.name.trim();
  return c.email?.trim() ?? "Contact";
}

function inviteContactLabel(row: EventInviteWithContact): string {
  const c = row.contact;
  if (!c) return "Contact";
  return pickerLabel(c as ContactPickerRow);
}

export function EventInvitesBlock({ eventId }: { eventId: string }) {
  const { data: invites = [], isLoading } = useEventInvites(eventId);
  const { data: contacts = [], isLoading: contactsLoading } = useContactsForEventInvites();
  const addInvites = useAddEventInvites();
  const updateRsvp = useUpdateEventInviteRsvp();
  const removeInvite = useRemoveEventInvite();
  const { toast } = useToast();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const invitedSet = useMemo(() => new Set(invites.map((i) => i.contact_id)), [invites]);

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (invitedSet.has(c.id)) return false;
      if (!q) return true;
      const hay = `${pickerLabel(c)} ${c.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contacts, query, invitedSet]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) {
      toast({ title: "Select contacts", variant: "destructive" });
      return;
    }
    try {
      await addInvites.mutateAsync({ eventId, contactIds: ids });
      setSelected(new Set());
      setPickerOpen(false);
      setQuery("");
      toast({ title: `Added ${ids.length} invite${ids.length === 1 ? "" : "s"}` });
    } catch (e) {
      toast({
        title: "Could not add invites",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Invites ({invites.length})
        </p>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Add invites
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(100vw-2rem,380px)] p-0" align="end">
            <div className="p-3 border-b border-border">
              <Label className="text-xs text-muted-foreground">Search contacts</Label>
              <Input
                className="mt-1 h-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or email"
              />
            </div>
            <ScrollArea className="h-[220px]">
              {contactsLoading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : filteredContacts.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {contacts.length === 0 ? "No contacts yet." : "No matches or all already invited."}
                </p>
              ) : (
                <ul className="p-2 space-y-1">
                  {filteredContacts.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                      <Checkbox
                        id={`pick-${c.id}`}
                        checked={selected.has(c.id)}
                        onCheckedChange={() => toggleSelect(c.id)}
                      />
                      <label htmlFor={`pick-${c.id}`} className="text-sm flex-1 cursor-pointer leading-tight">
                        {pickerLabel(c)}
                        {c.email ? (
                          <span className="block text-xs text-muted-foreground truncate">{c.email}</span>
                        ) : null}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
            <div className="p-3 border-t border-border flex justify-between items-center gap-2">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Button
                type="button"
                size="sm"
                disabled={addInvites.isPending || selected.size === 0}
                onClick={() => void handleAddSelected()}
              >
                {addInvites.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to event"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invites…
        </p>
      ) : invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invites yet.</p>
      ) : (
        <ul className="space-y-2">
          {invites.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border border-border/60 bg-muted/10 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{inviteContactLabel(inv)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Invited {new Date(inv.invited_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={inv.rsvp_status}
                  onValueChange={(v) =>
                    updateRsvp.mutate({ inviteId: inv.id, eventId, rsvp_status: v })
                  }
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RSVP_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Remove invite"
                  disabled={removeInvite.isPending}
                  onClick={() =>
                    void removeInvite
                      .mutateAsync({ inviteId: inv.id, eventId })
                      .then(() => toast({ title: "Invite removed" }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
