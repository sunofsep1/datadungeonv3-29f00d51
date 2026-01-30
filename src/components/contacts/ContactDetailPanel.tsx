import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContact } from "@/hooks/useContact";
import { useProperties, formatPropertyAddress } from "@/hooks/useProperties";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useInteractions, useCreateInteraction } from "@/hooks/useInteractions";
import { useAppointments } from "@/hooks/useAppointments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ContactKeyInfoPanel } from "./ContactKeyInfoPanel";
import { ContactAboutPanel } from "./ContactAboutPanel";
import { ContactActivityTimeline } from "./ContactActivityTimeline";
import { ContactPropertiesCard } from "./ContactPropertiesCard";

const INTERACTION_TYPES = ["call", "email", "meeting", "note", "sms", "other"];
const CHANNELS = ["phone", "email", "in-person", "video", "sms", "social"];
const LINK_ROLES = ["owner", "buyer", "tenant", "interested", "other"] as const;

interface ContactDetailPanelProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailPanel({ contactId, open, onOpenChange }: ContactDetailPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: contact, isLoading } = useContact(contactId || undefined);
  const { data: interactions = [] } = useInteractions(contactId || undefined);
  const { data: appointments = [] } = useAppointments();
  const { data: allProperties = [] } = useProperties();
  const createInteraction = useCreateInteraction();
  const createLink = useCreateContactPropertyLink();

  const [addInteractionOpen, setAddInteractionOpen] = useState(false);
  const [linkPropertyOpen, setLinkPropertyOpen] = useState(false);
  const [linkPropertyId, setLinkPropertyId] = useState("");
  const [linkRole, setLinkRole] = useState("owner");
  const [linkNotes, setLinkNotes] = useState("");
  const [newInteraction, setNewInteraction] = useState({
    type: "call",
    channel: "phone",
    subject: "",
    body: "",
  });

  const contactAppointments = contactId ? appointments.filter((apt) => apt.contact_id === contactId) : [];
  const linkedPropertyIds = useMemo(
    () => new Set((contact?.contact_property_links ?? []).map((l) => l.property_id)),
    [contact?.contact_property_links]
  );
  const availableProperties = useMemo(
    () => allProperties.filter((p) => !linkedPropertyIds.has(p.id)),
    [allProperties, linkedPropertyIds]
  );

  // Get last activity timestamp
  const lastActivity = useMemo(() => {
    if (!contact) return null;
    const allActivities: Array<{ timestamp: string }> = [
      ...interactions.map((i) => ({ timestamp: i.timestamp })),
      ...contactAppointments.map((a) => ({ timestamp: a.date })),
    ];
    if (contact.updated_at) {
      allActivities.push({ timestamp: contact.updated_at });
    }
    if (allActivities.length === 0) return null;
    const sorted = allActivities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted[0].timestamp;
  }, [contact, interactions, contactAppointments]);

  const handleLinkProperty = async () => {
    if (!contactId || !linkPropertyId) {
      toast({ title: "Error", description: "Select a property.", variant: "destructive" });
      return;
    }
    try {
      await createLink.mutateAsync({
        contact_id: contactId,
        property_id: linkPropertyId,
        role: linkRole as "owner" | "buyer" | "tenant" | "interested" | "other",
        notes: linkNotes.trim() || null,
      });
      toast({ title: "Success", description: "Property linked." });
      setLinkPropertyOpen(false);
      setLinkPropertyId("");
      setLinkRole("owner");
      setLinkNotes("");
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to link property",
        variant: "destructive",
      });
    }
  };

  const handleAddInteraction = async () => {
    if (!contactId) return;
    if (!newInteraction.subject.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subject",
        variant: "destructive",
      });
      return;
    }
    try {
      await createInteraction.mutateAsync({
        contact_id: contactId,
        type: newInteraction.type,
        channel: newInteraction.channel,
        subject: newInteraction.subject,
        body: newInteraction.body || null,
      });
      toast({ title: "Success", description: "Interaction logged!" });
      setNewInteraction({ type: "call", channel: "phone", subject: "", body: "" });
      setAddInteractionOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!contact && !isLoading) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-5xl overflow-hidden flex flex-col p-0 bg-[#242424] border-white/10 text-white">
          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ) : contact ? (
            <div className="flex flex-1 overflow-hidden">
              <div className="w-64 shrink-0 border-r border-white/10 flex flex-col overflow-y-auto">
                <ContactKeyInfoPanel
                  contact={contact}
                  lastActivity={lastActivity}
                  onViewFull={() => { onOpenChange(false); navigate(`/contacts/${contact.id}`); }}
                  onAddNote={() => setAddInteractionOpen(true)}
                />
              </div>
              <div className="flex-1 min-w-0 overflow-y-auto">
                <Tabs defaultValue="about" className="h-full flex flex-col">
                  <div className="shrink-0 px-4 pt-4 border-b border-white/10">
                    <TabsList className="bg-transparent gap-2">
                      <TabsTrigger value="about" className="data-[state=active]:bg-white/10">About</TabsTrigger>
                      <TabsTrigger value="activities" className="data-[state=active]:bg-white/10">Activities</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="about" className="flex-1 mt-0 px-4 py-4">
                    <ContactAboutPanel contact={contact} />
                  </TabsContent>
                  <TabsContent value="activities" className="flex-1 mt-0 px-4 py-4">
                    <ContactActivityTimeline
                      contactId={contactId}
                      onAddNote={() => setAddInteractionOpen(true)}
                    />
                  </TabsContent>
                </Tabs>
              </div>
              <div className="w-80 shrink-0 border-l border-white/10 flex flex-col overflow-y-auto p-4">
                <ContactPropertiesCard
                  contactId={contactId}
                  onOpenChange={onOpenChange}
                  onLinkPropertyClick={() => setLinkPropertyOpen(true)}
                  onViewProperty={(propertyId) => { onOpenChange(false); navigate(`/properties/${propertyId}`); }}
                />
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Add Interaction Dialog */}
      <Dialog open={addInteractionOpen} onOpenChange={setAddInteractionOpen}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-white/10">
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newInteraction.type}
                  onValueChange={(v) =>
                    setNewInteraction({ ...newInteraction, type: v })
                  }
                >
                  <SelectTrigger className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERACTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={newInteraction.channel}
                  onValueChange={(v) =>
                    setNewInteraction({ ...newInteraction, channel: v })
                  }
                >
                  <SelectTrigger className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                placeholder="Brief summary..."
                className="bg-input"
                value={newInteraction.subject}
                onChange={(e) =>
                  setNewInteraction({ ...newInteraction, subject: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                placeholder="Additional notes..."
                className="bg-input min-h-[80px]"
                value={newInteraction.body}
                onChange={(e) =>
                  setNewInteraction({ ...newInteraction, body: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setAddInteractionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddInteraction}
              disabled={createInteraction.isPending}
            >
              {createInteraction.isPending ? "Saving..." : "Log Interaction"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Property Dialog */}
      <Dialog open={linkPropertyOpen} onOpenChange={setLinkPropertyOpen}>
        <DialogContent className="sm:max-w-[420px] bg-popover border-white/10">
          <DialogHeader>
            <DialogTitle>Link property to contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select
                value={linkPropertyId}
                onValueChange={setLinkPropertyId}
                disabled={availableProperties.length === 0}
              >
                <SelectTrigger className="w-full bg-input">
                  <SelectValue placeholder={availableProperties.length === 0 ? "No properties available" : "Select property..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {formatPropertyAddress(p)}
                      {p.property_type && ` · ${p.property_type}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableProperties.length === 0 && (
                <p className="text-xs text-white/60">
                  Create properties first, or they may all be linked already.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select value={linkRole} onValueChange={setLinkRole}>
                <SelectTrigger className="w-full bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                className="bg-input min-h-[60px]"
                placeholder="e.g. Primary contact, joint owner..."
                value={linkNotes}
                onChange={(e) => setLinkNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setLinkPropertyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkProperty}
              disabled={!linkPropertyId || createLink.isPending}
            >
              {createLink.isPending ? "Linking..." : "Link property"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
