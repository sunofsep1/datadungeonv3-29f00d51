import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Plus, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import {
  LISTING_CONTACT_ROLES,
  useListingContactLinks,
  useAddListingContactLink,
  useDeleteListingContactLink,
} from "@/hooks/useListingContactLinks";
import { useToast } from "@/hooks/use-toast";

type Props = { listingId: string; initialVisible?: number };

const DEFAULT_VISIBLE = 5;

export function ListingContactLinksPanel({ listingId, initialVisible = DEFAULT_VISIBLE }: Props) {
  const { toast } = useToast();
  const { data: links = [], isLoading } = useListingContactLinks(listingId);
  const { data: contacts = [] } = useContacts();
  const addLink = useAddListingContactLink();
  const deleteLink = useDeleteListingContactLink();
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [role, setRole] = useState("vendor");
  const [showAll, setShowAll] = useState(false);

  const visibleLinks = showAll ? links : links.slice(0, initialVisible);
  const hiddenCount = Math.max(0, links.length - initialVisible);

  const save = async () => {
    if (!contactId) {
      toast({ title: "Choose a contact", variant: "destructive" });
      return;
    }
    try {
      await addLink.mutateAsync({ listing_id: listingId, contact_id: contactId, role });
      toast({ title: "Contact linked" });
      setOpen(false);
      setContactId("");
    } catch (e) {
      toast({ title: "Could not link", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <Card className="zoho-card p-4 border-border">
      <PanelHeader onAdd={() => setOpen(true)} count={links.length} />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No linked people yet (vendor, buyer, solicitor, etc.).</p>
      ) : (
        <>
        <ul className="space-y-1">
          {visibleLinks.map((link) => {
            const c = link.contacts;
            const name = c ? getContactDisplayName(c) : "Contact";
            const roleLabel = LISTING_CONTACT_ROLES.find((r) => r.value === link.role)?.label ?? link.role;
            return (
              <li key={link.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5">
                <div className="min-w-0">
                  <Link to={`/contacts/${link.contact_id}`} className="text-sm font-medium text-primary hover:underline truncate block">
                    {name}
                  </Link>
                  <p className="text-[11px] text-muted-foreground capitalize">{roleLabel.replace(/_/g, " ")}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => void deleteLink.mutateAsync({ id: link.id, listingId })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            );
          })}
        </ul>
        {!showAll && hiddenCount > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 w-full text-xs text-muted-foreground" onClick={() => setShowAll(true)}>
            <ChevronDown className="h-3.5 w-3.5 mr-1" />
            Show {hiddenCount} more
          </Button>
        ) : null}
        {showAll && links.length > initialVisible ? (
          <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 w-full text-xs text-muted-foreground" onClick={() => setShowAll(false)}>
            <ChevronUp className="h-3.5 w-3.5 mr-1" />
            Show less
          </Button>
        ) : null}
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link contact to listing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LISTING_CONTACT_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contact</Label>
              <Command className="border rounded-md mt-1">
                <CommandInput placeholder="Search contacts…" />
                <CommandList>
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    {contacts.slice(0, 200).map((c) => (
                      <CommandItem key={c.id} value={getContactDisplayName(c)} onSelect={() => setContactId(c.id)}>
                        {getContactDisplayName(c)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
            <Button type="button" className="w-full" onClick={() => void save()} disabled={addLink.isPending}>Link contact</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PanelHeader({ onAdd, count }: { onAdd: () => void; count: number }) {
  return (
    <div className="flex items-center justify-between mb-3 gap-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" /> People on listing ({count})
      </h3>
      <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={onAdd}><Plus className="h-3.5 w-3.5" /> Add</Button>
    </div>
  );
}
