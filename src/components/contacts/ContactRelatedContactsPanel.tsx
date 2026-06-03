import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import {
  CONTACT_RELATION_LABELS,
  useContactRelations,
  useAddContactRelation,
  useDeleteContactRelation,
} from "@/hooks/useContactRelations";
import { useToast } from "@/hooks/use-toast";

type Props = { contactId: string };

export function ContactRelatedContactsPanel({ contactId }: Props) {
  const { toast } = useToast();
  const { data: relations = [], isLoading } = useContactRelations(contactId);
  const { data: contacts = [] } = useContacts();
  const addRelation = useAddContactRelation();
  const deleteRelation = useDeleteContactRelation();
  const [open, setOpen] = useState(false);
  const [pickId, setPickId] = useState("");
  const [label, setLabel] = useState("partner");

  const candidates = contacts.filter((c) => c.id !== contactId && !relations.some((r) => r.related_contact_id === c.id));

  const save = async () => {
    if (!pickId) {
      toast({ title: "Choose a contact", variant: "destructive" });
      return;
    }
    try {
      await addRelation.mutateAsync({
        contact_id: contactId,
        related_contact_id: pickId,
        relation_label: label,
      });
      toast({ title: "Related contact linked" });
      setOpen(false);
      setPickId("");
    } catch (e) {
      toast({ title: "Could not link", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <Card className="zoho-card p-5 sm:p-6 border-border">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
          <Users className="w-4 h-4" />
          Related contacts ({relations.length})
        </h3>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : relations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Link partners, family, solicitors, or other related people.</p>
      ) : (
        <ul className="space-y-2">
          {relations.map((row) => {
            const c = row.related;
            const name = c ? getContactDisplayName(c) : "Contact";
            const roleLabel =
              CONTACT_RELATION_LABELS.find((l) => l.value === row.relation_label)?.label ?? row.relation_label;
            return (
              <li key={row.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 p-3">
                <div className="min-w-0">
                  <Link to={`/contacts/${row.related_contact_id}`} className="text-sm font-medium text-primary hover:underline truncate block">
                    {name}
                  </Link>
                  <p className="text-xs text-muted-foreground capitalize">{roleLabel}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive"
                  onClick={() => void deleteRelation.mutateAsync({ id: row.id, contactId })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link related contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Relationship</Label>
              <Select value={label} onValueChange={setLabel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_RELATION_LABELS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Command className="rounded-lg border border-border">
              <CommandInput placeholder="Search contacts…" />
              <CommandList>
                <CommandEmpty>No contacts available.</CommandEmpty>
                <CommandGroup>
                  {candidates.slice(0, 80).map((c) => (
                    <CommandItem key={c.id} value={getContactDisplayName(c)} onSelect={() => setPickId(c.id)}>
                      {getContactDisplayName(c)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            <Button type="button" className="w-full" disabled={!pickId || addRelation.isPending} onClick={() => void save()}>
              Link contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
