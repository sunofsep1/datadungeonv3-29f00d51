import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUpdateContact } from "@/hooks/useContacts";

export type ContactAmlFields = {
  id: string;
  aml_id_verified?: boolean | null;
  aml_verified_at?: string | null;
  aml_pep_clear?: boolean | null;
  aml_notes?: string | null;
};

export function ContactAmlPanel({ contact }: { contact: ContactAmlFields }) {
  const { toast } = useToast();
  const updateContact = useUpdateContact();
  const [idVerified, setIdVerified] = useState(false);
  const [pepClear, setPepClear] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setIdVerified(Boolean(contact.aml_id_verified));
    setPepClear(Boolean(contact.aml_pep_clear));
    setNotes(contact.aml_notes?.trim() ?? "");
  }, [contact]);

  const save = async (patch: Record<string, unknown>) => {
    try {
      await updateContact.mutateAsync({ id: contact.id, ...patch });
    } catch (err) {
      toast({
        title: "Could not save AML fields",
        description: err instanceof Error ? err.message : "Update failed",
        variant: "destructive",
      });
    }
  };

  const verifiedAtLabel = contact.aml_verified_at
    ? format(new Date(contact.aml_verified_at), "d MMM yyyy")
    : null;

  return (
    <Card className="zoho-card p-5 border-border">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AML / KYC</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Identity and PEP screening for vendors, buyers, and other parties (Reapit P4).
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={idVerified}
            onCheckedChange={(v) => {
              const next = Boolean(v);
              setIdVerified(next);
              void save({
                aml_id_verified: next,
                aml_verified_at: next ? new Date().toISOString() : null,
              });
            }}
            disabled={updateContact.isPending}
          />
          ID verified
          {verifiedAtLabel ? (
            <span className="text-xs text-muted-foreground">· {verifiedAtLabel}</span>
          ) : null}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={pepClear}
            onCheckedChange={(v) => {
              const next = Boolean(v);
              setPepClear(next);
              void save({ aml_pep_clear: next });
            }}
            disabled={updateContact.isPending}
          />
          PEP / sanctions cleared
        </label>
        <div className="space-y-1.5">
          <Label className="text-xs">Compliance notes</Label>
          <Textarea
            rows={2}
            className="resize-none text-sm"
            placeholder="Verification method, document ref, solicitor clearance…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              const next = notes.trim() || null;
              if (next === (contact.aml_notes?.trim() || null)) return;
              void save({ aml_notes: next });
            }}
            disabled={updateContact.isPending}
          />
        </div>
      </div>
    </Card>
  );
}
