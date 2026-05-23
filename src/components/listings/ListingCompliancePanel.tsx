import { useEffect, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useUpdateListing } from "@/hooks/useListings";

type Props = {
  listingId: string;
  compliance_agency_agreement_signed?: boolean | null;
  compliance_id_verified?: boolean | null;
  compliance_form6_uploaded?: boolean | null;
};

export function ListingCompliancePanel({
  listingId,
  compliance_agency_agreement_signed,
  compliance_id_verified,
  compliance_form6_uploaded,
}: Props) {
  const { toast } = useToast();
  const updateListing = useUpdateListing();
  const [agencySigned, setAgencySigned] = useState(false);
  const [idVerified, setIdVerified] = useState(false);
  const [form6, setForm6] = useState(false);

  useEffect(() => {
    setAgencySigned(Boolean(compliance_agency_agreement_signed));
    setIdVerified(Boolean(compliance_id_verified));
    setForm6(Boolean(compliance_form6_uploaded));
  }, [compliance_agency_agreement_signed, compliance_id_verified, compliance_form6_uploaded]);

  const save = async (patch: Record<string, boolean>) => {
    try {
      await updateListing.mutateAsync({ id: listingId, ...patch });
    } catch (err) {
      toast({
        title: "Could not save compliance",
        description: err instanceof Error ? err.message : "Update failed",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="zoho-card p-5 border-border">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileCheck2 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Listing compliance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Agency agreement, vendor ID, and Form 6 (QLD).</p>
        </div>
      </div>
      <div className="space-y-3">
        {[
          { id: "agency", label: "Agency agreement signed", checked: agencySigned, key: "compliance_agency_agreement_signed" },
          { id: "id", label: "Vendor ID verified", checked: idVerified, key: "compliance_id_verified" },
          { id: "form6", label: "Form 6 uploaded", checked: form6, key: "compliance_form6_uploaded" },
        ].map(({ id, label, checked, key }) => (
          <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => {
                const next = Boolean(v);
                if (key === "compliance_agency_agreement_signed") setAgencySigned(next);
                if (key === "compliance_id_verified") setIdVerified(next);
                if (key === "compliance_form6_uploaded") setForm6(next);
                void save({ [key]: next });
              }}
              disabled={updateListing.isPending}
            />
            {label}
          </label>
        ))}
      </div>
    </Card>
  );
}
