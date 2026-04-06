import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Handshake, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import { useLogTouch } from "@/hooks/useLogTouch";
import { TOUCH_TYPE_OPTIONS } from "@/lib/touchTypes";
import { getLogTouchEventName, type OpenLogTouchDetail } from "@/lib/openLogTouch";
import { cn } from "@/lib/utils";

export function LogTouchDialog() {
  const { toast } = useToast();
  const location = useLocation();
  const { data: contacts = [] } = useContacts();
  const logTouch = useLogTouch();

  const [open, setOpen] = useState(false);
  const [initialContactId, setInitialContactId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [touchType, setTouchType] = useState("call");
  const [notes, setNotes] = useState("");

  const routeContactId = useMemo(() => {
    const m = location.pathname.match(/^\/contacts\/([^/]+)\/?$/);
    if (!m) return null;
    const id = m[1];
    if (!id || id === "print") return null;
    return id;
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenLogTouchDetail>).detail ?? {};
      setInitialContactId(detail.contactId ?? null);
      setOpen(true);
    };
    const name = getLogTouchEventName();
    window.addEventListener(name, handler);
    return () => window.removeEventListener(name, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = initialContactId || routeContactId;
    if (id && contacts.length > 0) {
      const c = contacts.find((x) => x.id === id);
      if (c) setSelectedContactId(c.id);
      return;
    }
    if (!initialContactId && !routeContactId) setSelectedContactId(null);
  }, [open, initialContactId, routeContactId, contacts]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts.slice(0, 80);
    return contacts
      .filter((c) => {
        const name = getContactDisplayName(c).toLowerCase();
        const email = (c.email ?? "").toLowerCase();
        const phone = (c.phone ?? "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      })
      .slice(0, 80);
  }, [contacts, search]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  const resetForm = useCallback(() => {
    setSearch("");
    setTouchType("call");
    setNotes("");
    setInitialContactId(null);
    setSelectedContactId(null);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  const handleSubmit = async () => {
    if (!selectedContactId) {
      toast({ title: "Pick a contact", description: "Select who this touch was with.", variant: "destructive" });
      return;
    }
    try {
      await logTouch.mutateAsync({
        contact_id: selectedContactId,
        touch_type: touchType,
        notes: notes.trim() || null,
      });
      toast({ title: "Touch logged", description: "Last touch date updated on the contact." });
      handleOpenChange(false);
    } catch (err) {
      toast({
        title: "Could not log touch",
        description: err instanceof Error ? err.message : "Check migrations and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-popover border-border text-popover-foreground max-h-[90vh] flex flex-col"
        aria-describedby="log-touch-desc"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            Log touch
          </DialogTitle>
          <DialogDescription id="log-touch-desc">
            Record a playbook touch. It updates the contact&apos;s last touch date and your daily scorecard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto min-h-0 flex-1">
          <div className="space-y-2">
            <Label>Contact</Label>
            {selectedContact ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                <span className="text-sm font-medium text-foreground truncate">{getContactDisplayName(selectedContact)}</span>
                <Button type="button" variant="ghost" size="sm" className="shrink-0 text-xs h-8" onClick={() => setSelectedContactId(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name, email, phone…"
                    className="pl-9 bg-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-[200px] rounded-md border border-border">
                  <ul className="p-1">
                    {filteredContacts.length === 0 ? (
                      <li className="px-2 py-6 text-center text-sm text-muted-foreground">No matches</li>
                    ) : (
                      filteredContacts.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className={cn(
                              "w-full text-left rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors",
                              selectedContactId === c.id && "bg-accent",
                            )}
                            onClick={() => setSelectedContactId(c.id)}
                          >
                            {getContactDisplayName(c)}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </ScrollArea>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label>Touch type</Label>
            <Select value={touchType} onValueChange={setTouchType}>
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOUCH_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="log-touch-notes">Notes (optional)</Label>
            <Textarea
              id="log-touch-notes"
              placeholder="What you did or promised next…"
              className="bg-input min-h-[72px] resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={logTouch.isPending || !selectedContactId}>
            {logTouch.isPending ? "Saving…" : "Save touch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
