import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarPlus, Copy, Download, Printer, QrCode, Trash2, UserPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import {
  useListingOpenInspections,
  useCreateListingOpenInspection,
  useDeleteListingOpenInspection,
  useAddInspectionAttendee,
} from "@/hooks/useListingOpenInspections";
import {
  OFI_OPEN_TYPES,
  DEFAULT_OFI_DURATION_MINUTES,
  addMinutesToIso,
  buildOfiCheckInUrl,
  buildOfiBrochurePrintUrl,
  ofiQrImageUrl,
  partitionInspections,
} from "@/lib/ofiInspection";
import { cn } from "@/lib/utils";

type Props = { listingId: string; listingAddress?: string | null };

export function ListingOpenInspectionsPanel({ listingId, listingAddress }: Props) {
  const { toast } = useToast();
  const { data: rows = [], isLoading } = useListingOpenInspections(listingId);
  const createInspection = useCreateListingOpenInspection();
  const deleteInspection = useDeleteListingOpenInspection();
  const addAttendee = useAddInspectionAttendee();
  const { data: contacts = [] } = useContacts();

  const [startLocal, setStartLocal] = useState("");
  const [durationMin, setDurationMin] = useState(String(DEFAULT_OFI_DURATION_MINUTES));
  const [openType, setOpenType] = useState("advertised");
  const [attendeeDialog, setAttendeeDialog] = useState<{ inspectionId: string } | null>(null);
  const [pickContactId, setPickContactId] = useState("");

  const { upcoming, past } = useMemo(() => partitionInspections(rows), [rows]);

  const schedule = async () => {
    if (!startLocal.trim()) {
      toast({ title: "Pick date & time", variant: "destructive" });
      return;
    }
    const starts = new Date(startLocal);
    if (Number.isNaN(starts.getTime())) {
      toast({ title: "Invalid date", variant: "destructive" });
      return;
    }
    const mins = Math.max(15, Number(durationMin) || DEFAULT_OFI_DURATION_MINUTES);
    try {
      await createInspection.mutateAsync({
        listing_id: listingId,
        starts_at: starts.toISOString(),
        ends_at: addMinutesToIso(starts.toISOString(), mins),
        open_type: openType as "advertised" | "by_appointment",
      });
      toast({ title: "Inspection scheduled", description: "QR check-in link is ready below." });
      setStartLocal("");
    } catch (e) {
      toast({ title: "Could not schedule", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const copyCheckIn = async (token: string) => {
    const url = buildOfiCheckInUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Check-in link copied" });
    } catch {
      toast({ title: url, description: "Copy this URL for attendees" });
    }
  };

  const saveAttendee = async () => {
    if (!attendeeDialog || !pickContactId) return;
    try {
      await addAttendee.mutateAsync({
        inspection_id: attendeeDialog.inspectionId,
        listing_id: listingId,
        contact_id: pickContactId,
      });
      toast({ title: "Attendee added", description: "Linked as prospective buyer on this listing when applicable." });
      setAttendeeDialog(null);
      setPickContactId("");
    } catch (e) {
      toast({ title: "Could not add", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <Card className="zoho-card p-4 border-border lg:col-span-2">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground/90 flex items-center gap-2">
            <CalendarPlus className="w-4 h-4" />
            Open for inspection
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {upcoming.length} upcoming · {past.length} past · self check-in via QR
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/20 p-3 mb-4 space-y-3">
        {listingAddress ? <p className="text-xs text-muted-foreground truncate">{listingAddress}</p> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ofi-start">Date & time</Label>
            <Input
              id="ofi-start"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ofi-duration">Duration (minutes)</Label>
            <Input
              id="ofi-duration"
              type="number"
              min={15}
              step={15}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Open type</Label>
            <Select value={openType} onValueChange={setOpenType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFI_OPEN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => void schedule()} disabled={createInspection.isPending}>
          <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
          Add open time
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading inspections…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open inspections yet. Schedule one above — buyers can self check-in via QR.
        </p>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <InspectionSection
              title="Upcoming"
              items={upcoming}
              onCopy={copyCheckIn}
              onDelete={(inspId) => void deleteInspection.mutateAsync({ id: inspId, listingId })}
              onAddAttendee={(inspectionId) => {
                setPickContactId("");
                setAttendeeDialog({ inspectionId });
              }}
            />
          )}
          {past.length > 0 && (
            <InspectionSection
              title="Past"
              items={past}
              muted
              onCopy={copyCheckIn}
              onDelete={(inspId) => void deleteInspection.mutateAsync({ id: inspId, listingId })}
              onAddAttendee={(inspectionId) => {
                setPickContactId("");
                setAttendeeDialog({ inspectionId });
              }}
            />
          )}
        </div>
      )}

      <Dialog open={attendeeDialog != null} onOpenChange={(o) => !o && setAttendeeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add attendee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Contact</Label>
            <Command className="rounded-lg border border-border">
              <CommandInput placeholder="Search contacts…" />
              <CommandList>
                <CommandEmpty>No contacts found.</CommandEmpty>
                <CommandGroup>
                  {contacts.slice(0, 80).map((c) => (
                    <CommandItem key={c.id} value={getContactDisplayName(c)} onSelect={() => setPickContactId(c.id)}>
                      {getContactDisplayName(c)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            <Button type="button" className="w-full" disabled={!pickContactId || addAttendee.isPending} onClick={() => void saveAttendee()}>
              Add to inspection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function InspectionSection({
  title,
  items,
  muted,
  onCopy,
  onDelete,
  onAddAttendee,
}: {
  title: string;
  items: Array<{
    id: string;
    starts_at: string;
    ends_at: string;
    open_type: string;
    check_in_token: string;
    attendeeCount: number;
    attendees: Array<{
      id: string;
      contact_id: string | null;
      guest_name: string | null;
      contacts?: { id: string; name: string | null; first_name: string | null; last_name: string | null } | null;
    }>;
  }>;
  muted?: boolean;
  onCopy: (token: string) => void;
  onDelete: (id: string) => void;
  onAddAttendee: (inspectionId: string) => void;
}) {
  return (
    <div>
      <p className={cn("text-[10px] uppercase tracking-wide font-semibold mb-2", muted ? "text-muted-foreground" : "text-primary")}>
        {title}
      </p>
      <ul className="space-y-2">
        {items.map((row) => (
          <InspectionRow key={row.id} row={row} onCopy={onCopy} onDelete={onDelete} onAddAttendee={onAddAttendee} />
        ))}
      </ul>
    </div>
  );
}

function InspectionRow({
  row,
  onCopy,
  onDelete,
  onAddAttendee,
}: {
  row: InspectionSection["items"][number];
  onCopy: (token: string) => void;
  onDelete: (id: string) => void;
  onAddAttendee: (inspectionId: string) => void;
}) {
  const checkInUrl = buildOfiCheckInUrl(row.check_in_token);
  const typeLabel = OFI_OPEN_TYPES.find((t) => t.value === row.open_type)?.label ?? row.open_type;
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-lg border border-border/70 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-card/50">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {format(new Date(row.starts_at), "EEE d MMM yyyy, h:mm a")}
            <span className="text-muted-foreground font-normal">
              {" "}
              – {format(new Date(row.ends_at), "h:mm a")}
            </span>
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {typeLabel} · <Users className="inline w-3 h-3 -mt-0.5" /> {row.attendeeCount} attendee
            {row.attendeeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => onCopy(row.check_in_token)}>
            <Copy className="w-3 h-3 mr-1" />
            Link
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" asChild>
            <a href={buildOfiBrochurePrintUrl(row.check_in_token) + "?auto=1"} target="_blank" rel="noreferrer">
              <Printer className="w-3 h-3 mr-1" />
              Brochure
            </a>
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" asChild>
            <a href={ofiQrImageUrl(checkInUrl)} download={`ofi-${row.id}.png`} target="_blank" rel="noreferrer">
              <Download className="w-3 h-3 mr-1" />
              QR
            </a>
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => onAddAttendee(row.id)}>
            <UserPlus className="w-3 h-3 mr-1" />
            Attendee
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(row.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full h-8 rounded-none border-t border-border/50 text-xs text-muted-foreground">
            <QrCode className="w-3 h-3 mr-1" />
            {open ? "Hide" : "Show"} check-in & attendees
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3 pt-2 border-t border-border/40 bg-muted/10">
          <p className="text-[11px] text-muted-foreground break-all mb-2">{checkInUrl}</p>
          <img src={ofiQrImageUrl(checkInUrl, 160)} alt="Check-in QR code" className="mx-auto rounded-md border border-border bg-white p-2 mb-2" />
          {row.attendees.length === 0 ? (
            <p className="text-xs text-muted-foreground">No check-ins yet.</p>
          ) : (
            <ul className="space-y-1">
              {row.attendees.map((a) => {
                const name = a.contacts
                  ? getContactDisplayName(a.contacts)
                  : a.guest_name?.trim() || "Guest";
                return (
                  <li key={a.id} className="text-xs flex justify-between gap-2">
                    {a.contact_id ? (
                      <Link to={`/contacts/${a.contact_id}`} className="text-primary hover:underline truncate">
                        {name}
                      </Link>
                    ) : (
                      <span className="truncate">{name}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
