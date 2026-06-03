import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  applyPropertyReportToProperty,
  errorMessageFromUnknown,
} from "@/lib/applyPropertyReport";
import { splitOwnerNames } from "@/lib/ownerNameParse";
import type { ParsedPropertyReport } from "@/lib/parsePropertyReportPdf";
import { OwnerReviewDialog } from "@/components/pricefinder/OwnerReviewDialog";
import { PricefinderResearchPanel } from "@/components/pricefinder/PricefinderResearchPanel";
import { tryGeocodePropertyAfterSave } from "@/hooks/usePropertyGeocode";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  address?: string | null;
  existingReport?: Record<string, unknown> | null;
  linkedContactIds?: string[];
  linkedContactNames?: string[];
  onApplied?: () => void;
};

export function PropertyReportUploadDialog({
  open,
  onOpenChange,
  propertyId,
  address,
  existingReport,
  linkedContactIds = [],
  linkedContactNames = [],
  onApplied,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<ParsedPropertyReport | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [pendingOwners, setPendingOwners] = useState<ParsedPropertyReport | null>(null);
  const lastParsedRef = useRef<ParsedPropertyReport | null>(null);
  const finishingRef = useRef(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.includes("pdf")) {
      toast({ title: "Error", description: "Select a PDF file", variant: "destructive" });
      return;
    }
    setUploadLoading(true);
    setParsed(null);
    try {
      const { parsePropertyReportPdf } = await import("@/lib/parsePropertyReportPdf");
      const data = await parsePropertyReportPdf(file);
      setParsed(data);
      lastParsedRef.current = data;
    } catch (err) {
      toast({
        title: "Parse error",
        description: err instanceof Error ? err.message : "Could not parse PDF",
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  const handleApply = async () => {
    if (!parsed) return;
    setApplyLoading(true);
    try {
      const result = await applyPropertyReportToProperty(supabase, propertyId, parsed, existingReport);
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      await queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });

      const { data: row } = await supabase.from("properties").select("*").eq("id", propertyId).maybeSingle();
      if (row) {
        void tryGeocodePropertyAfterSave({
          id: propertyId,
          address_line1: row.address_line1,
          suburb: row.suburb ?? row.city,
          city: row.city,
          state: row.state,
          postcode: row.postcode,
          latitude: row.latitude,
          longitude: row.longitude,
        });
      }

      const description =
        result.warnings.length > 0
          ? `Property updated. ${result.warnings[0]}`
          : "Property updated from Pricefinder report";
      toast({
        title: result.partialSave ? "Saved (partial)" : "Saved",
        description,
      });

      const snapshot = parsed;
      lastParsedRef.current = snapshot;
      setParsed(null);

      const needsOwnerReview = splitOwnerNames(snapshot.owner_names).length > 0;
      if (needsOwnerReview) {
        setPendingOwners(snapshot);
        setOwnerDialogOpen(true);
        return;
      }

      onApplied?.();
      onOpenChange(false);
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: errorMessageFromUnknown(e) || "Could not save",
        variant: "destructive",
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setParsed(null);
      if (ownerDialogOpen) return;
    }
    onOpenChange(next);
  };

  const finishOwnerFlow = () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setOwnerDialogOpen(false);
    setPendingOwners(null);
    onApplied?.();
    onOpenChange(false);
    finishingRef.current = false;
  };

  return (
    <>
      <Dialog open={open && !ownerDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Pricefinder report</DialogTitle>
          </DialogHeader>
          {applyLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </p>
          ) : (
            <PricefinderResearchPanel
              propertyId={propertyId}
              address={address}
              variant="compact"
              parsedReport={parsed}
              uploadLoading={uploadLoading}
              applyLoading={applyLoading}
              onUploadReport={(e) => void handleUpload(e)}
              onApplyReport={() => void handleApply()}
              onDismissReport={() => setParsed(null)}
              showWidgetSlot={false}
            />
          )}
        </DialogContent>
      </Dialog>

      <OwnerReviewDialog
        open={ownerDialogOpen}
        onOpenChange={(next) => {
          setOwnerDialogOpen(next);
          if (!next) finishOwnerFlow();
        }}
        propertyId={propertyId}
        propertyAddress={address}
        ownerNames={pendingOwners?.owner_names ?? lastParsedRef.current?.owner_names}
        ownerPhones={pendingOwners?.owner_phones ?? lastParsedRef.current?.owner_phones}
        linkedContactIds={linkedContactIds}
        linkedContactNames={linkedContactNames}
        onComplete={finishOwnerFlow}
      />
    </>
  );
}
