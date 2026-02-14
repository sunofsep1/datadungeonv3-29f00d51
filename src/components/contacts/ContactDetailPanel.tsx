import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContact } from "@/hooks/useContact";
import { getPrimaryEmail } from "@/hooks/useContacts";
import { useProperties } from "@/hooks/useProperties";
import { useInteractions, useCreateInteraction } from "@/hooks/useInteractions";
import { useAppointments } from "@/hooks/useAppointments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ContactKeyInfoPanel } from "./ContactKeyInfoPanel";
import { EmailComposeDialog } from "./EmailComposeDialog";
import { SendSmsDialog } from "./SendSmsDialog";
import { getAllPhones } from "@/hooks/useContacts";
import { ContactAboutPanel } from "./ContactAboutPanel";
import { ContactActivityTimeline } from "./ContactActivityTimeline";
import { ContactPropertiesCard } from "./ContactPropertiesCard";
import { PropertiesTab } from "./tabs/PropertiesTab";
import { AddressesTab } from "./tabs/AddressesTab";
import { LinkPropertyModal } from "./modals/LinkPropertyModal";

const INTERACTION_TYPES = ["call", "email", "meeting", "note", "sms", "other"];
const CHANNELS = ["phone", "email", "in-person", "video", "sms", "social"];

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
  const createInteraction = useCreateInteraction();

  const [addInteractionOpen, setAddInteractionOpen] = useState(false);
  const [emailComposeOpen, setEmailComposeOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsToNumber, setSmsToNumber] = useState("");
  const [linkPropertyOpen, setLinkPropertyOpen] = useState(false);
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
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl overflow-hidden flex flex-col p-0 bg-[#1a1a1a] border-l border-white/10 text-white shadow-xl"
        >
          {isLoading ? (
            <div className="p-8 flex items-center justify-center min-h-[200px]">
              <div className="animate-pulse space-y-4 w-full max-w-xs">
                <div className="h-10 bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-white/10 rounded w-1/2" />
                <div className="h-4 bg-white/10 rounded w-2/3" />
              </div>
            </div>
          ) : contact ? (
            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
              {/* Left: key info — compact, scannable */}
              <div className="shrink-0 w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-white/10 bg-[#242424] flex flex-col">
                <ContactKeyInfoPanel
                  contact={contact}
                  lastActivity={lastActivity}
                  onViewFull={() => { onOpenChange(false); navigate(`/contacts/${contact.id}`); }}
                  onAddNote={() => setAddInteractionOpen(true)}
                  onSendEmail={() => setEmailComposeOpen(true)}
                  onSendSms={(phone) => { setSmsToNumber(phone); setSmsDialogOpen(true); }}
                />
              </div>
              {/* Center: main content */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <Tabs defaultValue="about" className="h-full flex flex-col">
                  <div className="shrink-0 px-4 pt-4 pb-2 border-b border-white/10 bg-[#1a1a1a]">
                    <TabsList className="bg-white/5 p-0.5 rounded-lg gap-0.5 h-9">
                      <TabsTrigger value="about" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70 rounded-md px-3 text-sm">About</TabsTrigger>
                      <TabsTrigger value="activities" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70 rounded-md px-3 text-sm">Activity</TabsTrigger>
                      <TabsTrigger value="properties" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70 rounded-md px-3 text-sm">Properties</TabsTrigger>
                      <TabsTrigger value="addresses" className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-white/70 rounded-md px-3 text-sm">Addresses</TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <TabsContent value="about" className="mt-0 px-4 py-5 pb-8">
                      <ContactAboutPanel contact={contact} />
                    </TabsContent>
                    <TabsContent value="activities" className="mt-0 px-4 py-5 pb-8">
                      <ContactActivityTimeline
                        contactId={contactId}
                        onAddNote={() => setAddInteractionOpen(true)}
                      />
                    </TabsContent>
                    <TabsContent value="properties" className="mt-0 px-4 py-5 pb-8">
                      <PropertiesTab
                        contactId={contactId}
                        onLinkPropertyClick={() => setLinkPropertyOpen(true)}
                        onViewProperty={(propertyId) => { onOpenChange(false); navigate(`/properties/${propertyId}`); }}
                        onOpenChange={onOpenChange}
                      />
                    </TabsContent>
                    <TabsContent value="addresses" className="mt-0 px-4 py-5 pb-8">
                      <AddressesTab contactId={contactId} />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
              {/* Right: linked properties — hide on small screens to avoid cramping */}
              <div className="hidden lg:flex w-72 shrink-0 border-l border-white/10 flex-col overflow-y-auto bg-[#242424]/50 p-4">
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

      <LinkPropertyModal
        open={linkPropertyOpen}
        onOpenChange={setLinkPropertyOpen}
        contactId={contactId}
        linkedPropertyIds={linkedPropertyIds}
      />

      {contact && contactId && (() => {
        const email = getPrimaryEmail(contact) ?? contact.email;
        return email ? (
          <EmailComposeDialog
            open={emailComposeOpen}
            onOpenChange={setEmailComposeOpen}
            to={email}
            contactName={contact.name ?? undefined}
            onSent={() => createInteraction.mutate({ contact_id: contactId, type: "email", channel: "email", subject: "Email sent", body: null })}
          />
        ) : null;
      })()}
      {contact && contactId && getAllPhones(contact).length > 0 && (
        <SendSmsDialog
          open={smsDialogOpen}
          onOpenChange={setSmsDialogOpen}
          to={smsToNumber || (getAllPhones(contact)[0]?.value ?? "")}
          contactName={contact.name ?? undefined}
          onSent={() => createInteraction.mutate({ contact_id: contactId, type: "sms", channel: "sms", subject: "SMS sent", body: null })}
        />
      )}
    </>
  );
}
