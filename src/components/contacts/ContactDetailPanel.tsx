import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Plus,
  Clock,
  MapPin,
  Tag,
  X,
  User,
  FileText,
  Building2,
  Users,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContact } from "@/hooks/useContact";
import {
  getPrimaryEmail,
  getPrimaryPhone,
  getTagNames,
  getLinkedPropertyAddress,
} from "@/hooks/useContacts";
import { useProperties, formatPropertyAddress, useCreateProperty } from "@/hooks/useProperties";
import {
  useCreateContactPropertyLink,
  useDeleteContactPropertyLink,
} from "@/hooks/useContactPropertyLinks";
import { useInteractions, useCreateInteraction, Interaction } from "@/hooks/useInteractions";
import { useAppointments } from "@/hooks/useAppointments";
import { getInitials } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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
  const deleteLink = useDeleteContactPropertyLink();
  const createProperty = useCreateProperty();

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

  const contactAppointments = contactId
    ? appointments.filter((apt) => apt.contact_id === contactId)
    : [];

  // Get linked properties with full details
  const linkedProperties = useMemo(() => {
    if (!contact?.contact_property_links) return [];
    return contact.contact_property_links
      .map((link) => {
        const property = allProperties.find((p) => p.id === link.property_id);
        return property ? { ...link, property } : null;
      })
      .filter(Boolean) as Array<typeof contact.contact_property_links[0] & { property: typeof allProperties[0] }>;
  }, [contact?.contact_property_links, allProperties]);

  // Calculate counts for tabs
  const requirementsCount = 0; // Placeholder - requirements table doesn't exist yet
  const relatedContactsCount = 0; // Placeholder - contact_contact_links doesn't exist yet
  const propertiesCount = linkedProperties.length;

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

  const handleUnlinkProperty = async (
    linkId: string,
    propertyId: string
  ) => {
    if (!contactId) return;
    try {
      await deleteLink.mutateAsync({
        id: linkId,
        property_id: propertyId,
        contact_id: contactId,
      });
      toast({ title: "Removed", description: "Property unlinked." });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to unlink",
        variant: "destructive",
      });
    }
  };

  const handleCreatePropertyFromContactAddress = async () => {
    if (!contactId || !(contact as any).address_line1) {
      // No address on contact, open link dialog instead
      setLinkPropertyOpen(true);
      return;
    }
    try {
      const property = await createProperty.mutateAsync({
        address_line1: (contact as any).address_line1,
        address_line2: (contact as any).address_line2 || null,
        city: (contact as any).city || null,
        state: (contact as any).state || null,
        postcode: (contact as any).postcode || null,
        country: (contact as any).country || "Australia",
      });
      
      // Link contact as owner
      await createLink.mutateAsync({
        contact_id: contactId,
        property_id: property.id,
        role: "owner",
      });
      
      toast({ title: "Success", description: "Property created and linked!" });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create property",
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

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case "hot":
        return "hot";
      case "warm":
        return "warm";
      case "cold":
        return "cold";
      default:
        return "entered";
    }
  };

  if (!contact && !isLoading) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0 bg-[#242424] border-white/10 text-white">
          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ) : contact ? (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <AvatarCircle
                    name={contact.name}
                    size="lg"
                    initials={getInitials(contact.first_name, contact.last_name, contact.name)}
                  />
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-xl font-semibold mb-2 text-white">
                      {contact.name}
                    </SheetTitle>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StatusBadge variant={getStatusVariant(contact.status)}>
                        {contact.status || "lead"}
                      </StatusBadge>
                      {lastActivity && (
                        <span className="text-xs text-white/60 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last activity: {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-white/60">
                      {(getPrimaryPhone(contact) ?? contact.phone) && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4 shrink-0" />{" "}
                          {getPrimaryPhone(contact) ?? contact.phone}
                        </span>
                      )}
                      {(getPrimaryEmail(contact) ?? contact.email) && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-4 h-4 shrink-0" />{" "}
                          {getPrimaryEmail(contact) ?? contact.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <Tabs defaultValue="overview" className="px-6 py-4">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="contact-card">Contact Card</TabsTrigger>
                    <TabsTrigger value="requirements">
                      Requirements{requirementsCount > 0 && ` (${requirementsCount})`}
                    </TabsTrigger>
                    <TabsTrigger value="related-contacts">
                      Related Contacts{relatedContactsCount > 0 && ` (${relatedContactsCount})`}
                    </TabsTrigger>
                    <TabsTrigger value="related-properties">
                      Related Properties{propertiesCount > 0 && ` (${propertiesCount})`}
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6 mt-6">
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                      {(getPrimaryPhone(contact) ?? contact.phone) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            window.open(`tel:${getPrimaryPhone(contact) ?? contact.phone}`);
                          }}
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </Button>
                      )}
                      {(getPrimaryEmail(contact) ?? contact.email) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            window.open(`mailto:${getPrimaryEmail(contact) ?? contact.email}`);
                          }}
                        >
                          <Mail className="w-4 h-4" />
                          Email
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setAddInteractionOpen(true)}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Add Note
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/contacts/${contact.id}`);
                        }}
                      >
                        View Full
                      </Button>
                    </div>

                    {/* Tags */}
                    {getTagNames(contact).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag className="w-4 h-4 text-white/60" />
                        {getTagNames(contact).map((t) => (
                          <Badge key={t} variant="secondary" className="font-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Linked Properties */}
                    {getLinkedPropertyAddress(contact) && (
                      <Card className="zoho-card p-4 border-white/10">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <Label className="text-xs text-white/60 uppercase mb-1 block">
                              Linked Property
                            </Label>
                            <button
                              onClick={() => {
                                const propertyLink = contact.contact_property_links?.[0];
                                if (propertyLink?.property_id) {
                                  onOpenChange(false);
                                  navigate(`/properties/${propertyLink.property_id}`);
                                }
                              }}
                              className="text-sm text-white hover:underline"
                            >
                              {getLinkedPropertyAddress(contact)}
                            </button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Address */}
                    {((contact as any).address_line1 || (contact as any).city) && (
                      <Card className="zoho-card p-4 border-white/10">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <Label className="text-xs text-white/60 uppercase mb-1 block">
                              Address
                            </Label>
                            <p className="text-sm text-white">
                              {[
                                (contact as any).address_line1,
                                (contact as any).address_line2,
                                (contact as any).city,
                                (contact as any).state,
                                (contact as any).postcode,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Source */}
                    {contact.source && (
                      <div>
                        <Label className="text-xs text-white/60 uppercase mb-1 block">
                          Source
                        </Label>
                        <p className="text-sm text-white">{contact.source}</p>
                      </div>
                    )}

                    <Separator />

                    {/* Metadata Table */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <h4 className="text-xs font-semibold text-white/60 uppercase mb-3">
                        Metadata
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-white/60 block mb-1">Primary Agent</span>
                          <p className="font-medium text-white">
                            {contact.user_id ? "Current User" : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/60 block mb-1">Source</span>
                          <p className="font-medium text-white">{contact.source || "—"}</p>
                        </div>
                        <div>
                          <span className="text-white/60 block mb-1">First Created</span>
                          <p className="font-medium text-white">
                            {contact.created_at
                              ? format(new Date(contact.created_at), "PPp")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/60 block mb-1">Last Modified</span>
                          <p className="font-medium text-white">
                            {contact.updated_at
                              ? format(new Date(contact.updated_at), "PPp")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/60 block mb-1">Last Contact</span>
                          <p className="font-medium text-white">
                            {lastActivity
                              ? formatDistanceToNow(new Date(lastActivity), { addSuffix: true })
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Activity Timeline */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white">Activity Timeline</h3>
                      </div>
                      <div className="space-y-4">
                        {/* Appointments */}
                        {contactAppointments.map((apt) => (
                          <div
                            key={apt.id}
                            className="flex gap-3 pb-4 border-b border-white/10 last:border-0"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{apt.title}</p>
                              <p className="text-xs text-white/60">
                                {format(new Date(apt.date), "PPp")}
                              </p>
                              {apt.location && (
                                <p className="text-xs text-white/60">{apt.location}</p>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Interactions */}
                        {interactions.map((interaction: Interaction) => (
                          <div
                            key={interaction.id}
                            className="flex gap-3 pb-4 border-b border-white/10 last:border-0"
                          >
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="w-4 h-4 text-white/60" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm capitalize">{interaction.type}</p>
                              {interaction.subject && (
                                <p className="text-sm text-white">{interaction.subject}</p>
                              )}
                              {interaction.body && (
                                <p className="text-xs text-white/60 mt-1">
                                  {interaction.body}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-3 h-3 text-white/60" />
                                <span className="text-xs text-white/60">
                                  {formatDistanceToNow(new Date(interaction.timestamp), {
                                    addSuffix: true,
                                  })}
                                </span>
                                {interaction.channel && (
                                  <span className="text-xs bg-secondary px-1.5 py-0.5 rounded capitalize">
                                    {interaction.channel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {interactions.length === 0 && contactAppointments.length === 0 && (
                          <p className="text-white/60 text-sm text-center py-4">
                            No activity yet. Log your first interaction!
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Contact Card Tab */}
                  <TabsContent value="contact-card" className="space-y-6 mt-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-white/60 uppercase mb-1 block">
                          Name
                        </Label>
                        <p className="text-sm text-white">{contact.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-white/60 uppercase mb-1 block">
                          Status
                        </Label>
                        <StatusBadge variant={getStatusVariant(contact.status)}>
                          {contact.status || "lead"}
                        </StatusBadge>
                      </div>
                      {(getPrimaryPhone(contact) ?? contact.phone) && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            Phone
                          </Label>
                          <p className="text-sm text-white">
                            {getPrimaryPhone(contact) ?? contact.phone}
                          </p>
                        </div>
                      )}
                      {(getPrimaryEmail(contact) ?? contact.email) && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            Email
                          </Label>
                          <p className="text-sm text-white">
                            {getPrimaryEmail(contact) ?? contact.email}
                          </p>
                        </div>
                      )}
                      {contact.source && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            Source
                          </Label>
                          <p className="text-sm text-white">{contact.source}</p>
                        </div>
                      )}
                      {contact.pipeline_stage && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            Pipeline Stage
                          </Label>
                          <p className="text-sm text-white">{contact.pipeline_stage}</p>
                        </div>
                      )}
                      {contact.story && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            Story
                          </Label>
                          <p className="text-sm text-white whitespace-pre-wrap">{contact.story}</p>
                        </div>
                      )}
                      {contact.selling_intentions && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            Selling Intentions
                          </Label>
                          <p className="text-sm text-white whitespace-pre-wrap">
                            {contact.selling_intentions}
                          </p>
                        </div>
                      )}
                      {contact.current_situation_notes && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            Current Situation Notes
                          </Label>
                          <p className="text-sm text-white whitespace-pre-wrap">
                            {contact.current_situation_notes}
                          </p>
                        </div>
                      )}
                      {contact.pain_points && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            Pain Points
                          </Label>
                          <p className="text-sm text-white whitespace-pre-wrap">
                            {contact.pain_points}
                          </p>
                        </div>
                      )}
                      {contact.pleasure_points && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            Pleasure Points
                          </Label>
                          <p className="text-sm text-white whitespace-pre-wrap">
                            {contact.pleasure_points}
                          </p>
                        </div>
                      )}
                      {contact.notes && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            General Notes
                          </Label>
                          <p className="text-sm text-white whitespace-pre-wrap">{contact.notes}</p>
                        </div>
                      )}
                      {/* Address */}
                      {((contact as any).address_line1 || (contact as any).city) && (
                        <div>
                          <Label className="text-xs text-white/60 uppercase mb-1 block">
                            Address
                          </Label>
                          <p className="text-sm text-white">
                            {[
                              (contact as any).address_line1,
                              (contact as any).address_line2,
                              (contact as any).city,
                              (contact as any).state,
                              (contact as any).postcode,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Requirements Tab */}
                  <TabsContent value="requirements" className="space-y-6 mt-6">
                    <Card className="p-8 text-center border-dashed">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-white/60 opacity-50" />
                      <p className="text-sm text-white/60 mb-2">
                        No requirements have been added
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 mt-2"
                        onClick={() => {
                          // TODO: Open requirements dialog
                          toast({
                            title: "Coming soon",
                            description: "Requirements feature will be available soon",
                          });
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Click here to add
                      </Button>
                    </Card>
                  </TabsContent>

                  {/* Related Contacts Tab */}
                  <TabsContent value="related-contacts" className="space-y-6 mt-6">
                    <Card className="p-8 text-center border-dashed">
                      <Users className="w-12 h-12 mx-auto mb-4 text-white/60 opacity-50" />
                      <p className="text-sm text-white/60 mb-2">
                        No related contacts have been added
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 mt-2"
                        onClick={() => {
                          // TODO: Open related contacts dialog
                          toast({
                            title: "Coming soon",
                            description: "Related contacts feature will be available soon",
                          });
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Click here to add
                      </Button>
                    </Card>
                  </TabsContent>

                  {/* Related Properties Tab */}
                  <TabsContent value="related-properties" className="space-y-6 mt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">
                        {propertiesCount} linked
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          // If contact has address, create property from it; otherwise open link dialog
                          if ((contact as any).address_line1) {
                            handleCreatePropertyFromContactAddress();
                          } else {
                            setLinkPropertyOpen(true);
                          }
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Add property
                      </Button>
                    </div>
                    {linkedProperties.length > 0 ? (
                      <div className="space-y-4">
                        {linkedProperties.map((link) => {
                          const property = link.property;
                          if (!property) return null;
                          const address = formatPropertyAddress(property);
                          return (
                            <Card
                              key={link.id}
                              className="p-4 border-white/10 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onOpenChange(false);
                                      navigate(`/properties/${property.id}`);
                                    }}
                                    className="font-medium text-sm text-white hover:underline text-left mb-1 block"
                                  >
                                    {address}
                                  </button>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60 mb-2">
                                    {property.property_type && (
                                      <Badge variant="secondary" className="text-xs">
                                        {property.property_type}
                                      </Badge>
                                    )}
                                    {property.bedrooms != null && (
                                      <span>{property.bedrooms} bed</span>
                                    )}
                                    {property.bathrooms != null && (
                                      <span>{property.bathrooms} bath</span>
                                    )}
                                  </div>
                                  {property.price != null && property.price > 0 && (
                                    <p className="text-sm font-semibold text-white mb-2">
                                      ${property.price.toLocaleString()}
                                    </p>
                                  )}
                                  {link.role && (
                                    <Badge variant="outline" className="text-xs mb-2">
                                      {link.role}
                                    </Badge>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="gap-1 h-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenChange(false);
                                        navigate(`/properties/${property.id}`);
                                      }}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="gap-1 h-8 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnlinkProperty(link.id, property.id);
                                      }}
                                      disabled={deleteLink.isPending}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Remove association
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <Card className="p-8 text-center border-dashed">
                        <MapPin className="w-12 h-12 mx-auto mb-4 text-white/60 opacity-50" />
                        <p className="text-sm text-white/60 mb-2">
                          No properties have been linked
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 mt-2"
                          onClick={() => {
                            if ((contact as any).address_line1) {
                              handleCreatePropertyFromContactAddress();
                            } else {
                              setLinkPropertyOpen(true);
                            }
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          Click here to add
                        </Button>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </ScrollArea>
            </>
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
