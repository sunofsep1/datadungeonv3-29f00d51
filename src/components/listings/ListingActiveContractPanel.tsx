import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import {
  Calendar,
  Check,
  ChevronRight,
  FileText,
  Pencil,
  Upload,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import { useListingOffers, useUpdateListingOffer, type ListingOffer } from "@/hooks/useListingOffers";
import { useListingContactLinks } from "@/hooks/useListingContactLinks";
import { useContactRelations } from "@/hooks/useContactRelations";
import {
  useOfferConditions,
  useUpdateOfferCondition,
  useCompleteAllOfferConditions,
} from "@/hooks/useOfferConditions";
import {
  useListingContractDocuments,
  useCreateListingContractDocument,
  useDeleteListingContractDocument,
  uploadContractDocumentFile,
  type ListingContractDocType,
} from "@/hooks/useListingContractDocuments";
import { ContractEditDialog } from "@/components/listings/ContractEditDialog";
import { ContractParseReviewDialog } from "@/components/listings/ContractParseReviewDialog";
import {
  pickActiveContractOffer,
  shouldShowActiveContractPanel,
} from "@/lib/listingOfferPipelineSync";
import {
  effectiveConditionStatus,
  conditionStatusClass,
  conditionStatusLabel,
} from "@/lib/offerConditions";
import { formatOfferPrice, offerStatusLabel } from "@/lib/listingOffers";
import { parseSalesContractPdf } from "@/lib/parseSalesContractPdf";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  listingAddress?: string | null;
  pipelineStage?: string | null;
  onListingUpdated?: () => void;
};

function formatDateLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(`${iso.slice(0, 10)}T12:00:00`), "d MMM yyyy");
  } catch {
    return iso.slice(0, 10);
  }
}

export function ListingActiveContractPanel({
  listingId,
  listingAddress,
  pipelineStage,
  onListingUpdated,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: offers = [] } = useListingOffers(listingId);
  const { data: contacts = [] } = useContacts();
  const { data: links = [] } = useListingContactLinks(listingId);
  const updateOffer = useUpdateListingOffer();
  const updateCondition = useUpdateOfferCondition();
  const completeAllConditions = useCompleteAllOfferConditions();
  const createDoc = useCreateListingContractDocument();
  const deleteDoc = useDeleteListingContractDocument();

  const [editOpen, setEditOpen] = useState(false);
  const [parseOpen, setParseOpen] = useState(false);
  const [parsedFile, setParsedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const letterInputRef = useRef<HTMLInputElement>(null);

  const activeOffer = useMemo(() => pickActiveContractOffer(offers), [offers]);
  const { data: conditions = [] } = useOfferConditions(activeOffer?.id);
  const { data: documents = [] } = useListingContractDocuments(activeOffer?.id);
  const { data: buyerRelations = [] } = useContactRelations(activeOffer?.buyer_contact_id ?? undefined);

  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  if (!shouldShowActiveContractPanel(pipelineStage, offers) || !activeOffer) return null;

  const primaryBuyer = activeOffer.buyer_contact_id
    ? contactsById.get(activeOffer.buyer_contact_id)
    : null;
  const primaryName = primaryBuyer ? getContactDisplayName(primaryBuyer) : "Buyer";

  const coBuyers = links
    .filter((l) => l.role === "key_buyer" && l.contact_id !== activeOffer.buyer_contact_id)
    .map((l) => {
      const c = l.contacts ?? contactsById.get(l.contact_id);
      return { id: l.contact_id, name: c ? getContactDisplayName(c) : "Co-buyer" };
    });

  const partners = buyerRelations
    .filter((r) => r.relation_label === "partner" || r.relation_label === "household")
    .map((r) => ({
      id: r.related_contact_id,
      name: r.related?.name
        ? getContactDisplayName(r.related)
        : getContactDisplayName(contactsById.get(r.related_contact_id) ?? { id: r.related_contact_id }),
    }))
    .filter((p) => p.id !== activeOffer.buyer_contact_id && !coBuyers.some((c) => c.id === p.id));

  const allBuyers = [
    { id: activeOffer.buyer_contact_id, name: primaryName, primary: true },
    ...coBuyers.map((c) => ({ ...c, primary: false })),
    ...partners.map((p) => ({ ...p, primary: false })),
  ].filter((b) => b.id);

  const settlementIso =
    activeOffer.expected_settlement_date ??
    activeOffer.settlement_date ??
    null;
  const daysToSettlement = settlementIso
    ? differenceInCalendarDays(parseISO(`${settlementIso.slice(0, 10)}T12:00:00`), new Date())
    : null;

  const nextCondition = [...conditions]
    .map((c) => ({ ...c, eff: effectiveConditionStatus(c.status, c.due_date) }))
    .filter((c) => c.eff === "pending" || c.eff === "overdue")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  const statusBadge =
    activeOffer.status === "unconditional"
      ? "Unconditional"
      : activeOffer.status === "conditional"
        ? "Under contract"
        : offerStatusLabel(activeOffer.status);

  const handleGoUnconditional = async () => {
    try {
      await completeAllConditions.mutateAsync({ offer_id: activeOffer.id });
      await updateOffer.mutateAsync({
        id: activeOffer.id,
        listing_id: listingId,
        status: "unconditional",
        expected_unconditional_date: format(new Date(), "yyyy-MM-dd"),
        portal_status: "under_contract",
      });
      toast({ title: "Marked unconditional" });
      onListingUpdated?.();
    } catch (e) {
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async (file: File, docType: ListingContractDocType) => {
    if (!user || !activeOffer) return;
    setUploading(true);
    try {
      if (docType === "signed_contract" && file.type.includes("pdf")) {
        setParsedFile(file);
        setParseOpen(true);
        setUploading(false);
        return;
      }
      const { storage_path } = await uploadContractDocumentFile(
        user.id,
        listingId,
        activeOffer.id,
        file,
      );
      await createDoc.mutateAsync({
        listing_id: listingId,
        offer_id: activeOffer.id,
        doc_type: docType,
        title: file.name,
        storage_path,
        file_name: file.name,
        mime_type: file.type,
        source: docType === "solicitor_letter" ? "solicitor" : "upload",
      });
      toast({ title: "Document uploaded" });
      onListingUpdated?.();
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Could not upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleContractFilePick = async (file: File) => {
    if (!user || !activeOffer) return;
    try {
      const parsed = await parseSalesContractPdf(file);
      setParsedFile(file);
      setParseOpen(true);
      void parsed;
    } catch {
      await handleUpload(file, "signed_contract");
    }
  };

  return (
    <>
      <Card className="zoho-card border-primary/30 bg-primary/5 p-4 sm:p-5 scroll-mt-28" id="listing-active-contract">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Active contract
              </h3>
              <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                {statusBadge}
              </Badge>
              <span className="text-xs text-muted-foreground">{activeOffer.ref_code}</span>
            </div>
            {listingAddress && (
              <p className="text-xs text-muted-foreground mt-0.5">{listingAddress}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit contract
            </Button>
            {activeOffer.status === "conditional" && (
              <Button type="button" size="sm" className="gap-1" onClick={() => void handleGoUnconditional()}>
                Go unconditional
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="rounded-lg border border-border bg-card/80 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Sale price</p>
            <p className="text-lg font-semibold tabular-nums">{formatOfferPrice(activeOffer.offer_price)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card/80 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="h-3 w-3" /> Buyers
            </p>
            <ul className="space-y-1">
              {allBuyers.map((b) => (
                <li key={b.id!} className="text-sm">
                  <Link to={`/contacts/${b.id}`} className="text-primary hover:underline font-medium">
                    {b.name}
                    {b.primary ? " (primary)" : ""}
                  </Link>
                </li>
              ))}
              {allBuyers.length === 0 && (
                <li className="text-sm text-muted-foreground">No buyer linked</li>
              )}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card/80 p-3 space-y-2 text-sm">
            <DateRow label="Contract / exchange" value={formatDateLabel(activeOffer.exchange_date)} />
            <DateRow
              label="Expected unconditional"
              value={formatDateLabel(activeOffer.expected_unconditional_date)}
            />
            <DateRow
              label="Settlement"
              value={formatDateLabel(settlementIso)}
              hint={
                daysToSettlement != null
                  ? daysToSettlement >= 0
                    ? `${daysToSettlement} days`
                    : `${Math.abs(daysToSettlement)} days ago`
                  : undefined
              }
            />
          </div>
        </div>

        {conditions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Conditions
              {nextCondition?.eff === "overdue" && (
                <span className="ml-2 text-destructive inline-flex items-center gap-1 normal-case">
                  <AlertTriangle className="h-3 w-3" /> Overdue item
                </span>
              )}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {conditions.map((c) => {
                const eff = effectiveConditionStatus(c.status, c.due_date);
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-card/60 px-2.5 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.label}</p>
                      <p className="text-muted-foreground">{formatDateLabel(c.due_date)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={cn("rounded border px-1.5 py-0.5 text-[10px]", conditionStatusClass(eff))}>
                        {conditionStatusLabel(eff)}
                      </span>
                      {eff !== "complete" && eff !== "waived" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() =>
                            void updateCondition.mutateAsync({
                              id: c.id,
                              offer_id: c.offer_id,
                              status: "complete",
                            })
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contract documents
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={contractInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleContractFilePick(f);
                  e.target.value = "";
                }}
              />
              <input
                ref={letterInputRef}
                type="file"
                accept="application/pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f, "solicitor_letter");
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1 h-8"
                disabled={uploading}
                onClick={() => contractInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Contract PDF
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1 h-8"
                disabled={uploading}
                onClick={() => letterInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Solicitor letter
              </Button>
            </div>
          </div>
          {documents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <ul className="space-y-1">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-xs rounded border border-border/60 px-2 py-1.5">
                  <span className="truncate">
                    {d.title ?? d.file_name}
                    <Badge variant="outline" className="ml-2 text-[9px]">
                      {d.doc_type.replace(/_/g, " ")}
                    </Badge>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-destructive"
                    onClick={() =>
                      void deleteDoc.mutateAsync({
                        id: d.id,
                        offer_id: d.offer_id,
                        storage_path: d.storage_path,
                      })
                    }
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-2 h-auto p-0 gap-1 text-xs"
          onClick={() => {
            document.getElementById("listing-offers")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          All offers & history <ChevronRight className="h-3 w-3" />
        </Button>
      </Card>

      <ContractEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        offer={activeOffer}
        listingId={listingId}
      />

      {parsedFile && activeOffer && (
        <ContractParseReviewDialog
          open={parseOpen}
          onOpenChange={(o) => {
            setParseOpen(o);
            if (!o) setParsedFile(null);
          }}
          file={parsedFile}
          offer={activeOffer}
          listingId={listingId}
          onSaved={() => {
            setParseOpen(false);
            setParsedFile(null);
            onListingUpdated?.();
          }}
        />
      )}
    </>
  );
}

function DateRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground flex items-center gap-1">
        <Calendar className="h-3 w-3 shrink-0" />
        {label}
      </span>
      <span className="font-medium tabular-nums">
        {value}
        {hint && <span className="text-muted-foreground font-normal ml-1">({hint})</span>}
      </span>
    </div>
  );
}
