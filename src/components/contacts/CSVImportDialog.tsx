import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useContacts, useCreateContact, useUpdateContact, getPrimaryEmail, getPrimaryPhone } from "@/hooks/useContacts";
import { useCreateProperty } from "@/hooks/useProperties";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useTags, useCreateTag } from "@/hooks/useTags";
import { useAddContactTag } from "@/hooks/useContactTags";
import type { ContactWithMeta } from "@/hooks/useContacts";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PREVIEW_ROWS = 20;

const MAP_OPTIONS = [
  { value: "name", label: "Name *", required: true },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "mobile", label: "Mobile" },
  { value: "address", label: "Address (single)" },
  { value: "address_line1", label: "Address line 1" },
  { value: "city", label: "Suburb/City" },
  { value: "state", label: "State" },
  { value: "postcode", label: "Postcode" },
  { value: "source", label: "Source" },
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags (comma-separated)" },
  { value: "notes", label: "Notes" },
  { value: "story", label: "Story" },
  { value: "skip", label: "-- Skip --" },
];

// Australian state abbreviations
const AUSTRALIAN_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];
const AUSTRALIAN_STATE_NAMES: Record<string, string> = {
  "new south wales": "NSW",
  "victoria": "VIC",
  "queensland": "QLD",
  "south australia": "SA",
  "western australia": "WA",
  "tasmania": "TAS",
  "northern territory": "NT",
  "australian capital territory": "ACT",
};

type Step = "upload" | "mapping" | "preview" | "importing" | "complete";

function parseCSV(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.map((line) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if ((c === "," && !inQuotes) || (c === "\n" && !inQuotes)) {
        out.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    out.push(cur.trim());
    return out;
  });
}

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase().replace(/\s/g, "");
}
function normalizePhone(s: string): string {
  return s.trim().replace(/\s/g, "").replace(/^\+61/, "0");
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: existingContacts = [] } = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const createProperty = useCreateProperty();
  const createLink = useCreateContactPropertyLink();
  const { data: existingTags = [] } = useTags();
  const createTag = useCreateTag();
  const addContactTag = useAddContactTag();

  const [step, setStep] = useState<Step>("upload");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [createPropertiesFromAddress, setCreatePropertiesFromAddress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [created, setCreated] = useState(0);
  const [updated, setUpdated] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const emailToContact = useMemo(() => {
    const m = new Map<string, ContactWithMeta>();
    (existingContacts as ContactWithMeta[]).forEach((c) => {
      const e = getPrimaryEmail(c) ?? c.email;
      if (e) m.set(normalizeEmail(e), c);
    });
    return m;
  }, [existingContacts]);
  const phoneToContact = useMemo(() => {
    const m = new Map<string, ContactWithMeta>();
    (existingContacts as ContactWithMeta[]).forEach((c) => {
      const p = getPrimaryPhone(c) ?? c.phone;
      if (p) m.set(normalizePhone(p), c);
    });
    return m;
  }, [existingContacts]);

  const tagNameToId = useMemo(() => {
    const m = new Map<string, string>();
    existingTags.forEach((t) => m.set(t.name.toLowerCase().trim(), t.id));
    return m;
  }, [existingTags]);

  const reset = () => {
    setStep("upload");
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setCreatePropertiesFromAddress(false);
    setProgress(0);
    setCreated(0);
    setUpdated(0);
    setSkipped(0);
    setErrors([]);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const rows = parseCSV((r.result as string) ?? "");
      if (rows.length < 2) {
        toast({ title: "Error", description: "CSV must have headers and at least one row", variant: "destructive" });
        return;
      }
      setHeaders(rows[0]);
      setCsvData(rows.slice(1));
      const auto: Record<number, string> = {};
      rows[0].forEach((h, i) => {
        const lower = h.toLowerCase().replace(/[^a-z]/g, "");
        // Enhanced matching for Australian addresses
        let opt = MAP_OPTIONS.find(
          (o) => o.value !== "skip" && lower.includes(o.value.replace("_", "").slice(0, 4))
        );
        
        // Better matching for Australian-specific terms
        if (!opt) {
          if (lower.includes("suburb") || lower.includes("town") || lower.includes("locality")) {
            opt = MAP_OPTIONS.find((o) => o.value === "city");
          } else if (lower.includes("postcode") || lower.includes("postcode") || lower.includes("postal") || lower.includes("zip")) {
            opt = MAP_OPTIONS.find((o) => o.value === "postcode");
          } else if (lower.includes("street") || lower.includes("st") || lower.includes("road") || lower.includes("rd") || lower.includes("addr")) {
            opt = MAP_OPTIONS.find((o) => o.value === "address_line1");
          } else if (lower.includes("state") || lower.includes("st") && !lower.includes("street")) {
            opt = MAP_OPTIONS.find((o) => o.value === "state");
          }
        }
        
        if (opt) auto[i] = opt.value;
      });
      setMapping(auto);
      setStep("mapping");
    };
    r.readAsText(f);
  };

  const setMappingAt = (col: number, value: string) => {
    setMapping((prev) => ({ ...prev, [col]: value }));
  };

  const mappedRows = useMemo(() => {
    return csvData.map((row) => {
      const rec: Record<string, string> = {};
      Object.entries(mapping).forEach(([i, field]) => {
        if (field !== "skip") rec[field] = (row[parseInt(i)] ?? "").trim();
      });
      return rec;
    });
  }, [csvData, mapping]);

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    mappedRows.forEach((r, idx) => {
      if (!r.name?.trim()) errs.push(`Row ${idx + 2}: Missing name`);
      if (r.email && !EMAIL_RE.test(r.email)) errs.push(`Row ${idx + 2}: Invalid email "${r.email}"`);
    });
    return errs;
  }, [mappedRows]);

  const hasName = Object.values(mapping).includes("name");
  const previewRows = mappedRows.slice(0, PREVIEW_ROWS);
  const mappedFields = Object.entries(mapping)
    .filter(([, v]) => v !== "skip")
    .map(([i, v]) => ({ col: parseInt(i), field: v }))
    .sort((a, b) => a.col - b.col);

  const runImport = async () => {
    if (!hasName) return;
    setStep("importing");
    const errs: string[] = [];
    let cr = 0,
      up = 0,
      sk = 0;
    const total = mappedRows.length;
    const tagMap = new Map(tagNameToId);

    for (let i = 0; i < mappedRows.length; i++) {
      const r = mappedRows[i];
      const rowNum = i + 2;
      if (!r.name?.trim()) {
        errs.push(`Row ${rowNum}: Missing name`);
        sk++;
        setProgress(Math.round((i / total) * 100));
        setSkipped(sk);
        setCreated(cr);
        setUpdated(up);
        continue;
      }
      if (r.email && !EMAIL_RE.test(r.email)) {
        errs.push(`Row ${rowNum}: Invalid email`);
        sk++;
        setProgress(Math.round((i / total) * 100));
        setSkipped(sk);
        setCreated(cr);
        setUpdated(up);
        continue;
      }

      const emailNorm = r.email ? normalizeEmail(r.email) : null;
      const phoneNorm = r.phone ? normalizePhone(r.phone) : null;
      const mobileNorm = r.mobile ? normalizePhone(r.mobile) : null;
      const match =
        (emailNorm && emailToContact.get(emailNorm)) ??
        (phoneNorm && phoneToContact.get(phoneNorm)) ??
        (mobileNorm && phoneToContact.get(mobileNorm)) ??
        null;

      let contactId: string;
      try {
        if (match) {
          await updateContact.mutateAsync({
            id: match.id,
            name: r.name,
            source: r.source || null,
            status: (r.status as "hot" | "warm" | "cold" | "lead") || "lead",
            notes: r.notes || null,
            story: r.story || null,
          });
          contactId = match.id;
          up++;
        } else {
          const created = await createContact.mutateAsync({
            name: r.name,
            email: r.email || null,
            phone: r.phone || r.mobile || null,
            source: r.source || null,
            status: (r.status as "hot" | "warm" | "cold" | "lead") || "lead",
            notes: r.notes || null,
            story: r.story || null,
          });
          contactId = (created as { id: string }).id;
          cr++;
        }

        if (contactId && r.tags) {
          const tagNames = r.tags.split(",").map((t) => t.trim()).filter(Boolean);
          for (const tn of tagNames) {
            let tagId = tagMap.get(tn.toLowerCase());
            if (!tagId) {
              try {
                const createdTag = await createTag.mutateAsync({ name: tn });
                tagId = (createdTag as { id: string }).id;
                tagMap.set(tn.toLowerCase(), tagId);
              } catch {
                /* skip tag */
              }
            }
            if (tagId) {
              try {
                await addContactTag.mutateAsync({ contact_id: contactId, tag_id: tagId });
              } catch {
                /* skip link */
              }
            }
          }
        }

        // Create property from address if enabled and address data exists
        if (createPropertiesFromAddress && (r.address || r.address_line1)) {
          // Parse combined address if needed (e.g., "123 Main St, Sydney NSW 2000")
          let addressLine1 = r.address_line1 || "";
          let suburb = r.city || "";
          let state = r.state || "";
          let postcode = r.postcode || "";
          
          // If only combined address provided, try to parse it
          if (!addressLine1 && r.address) {
            const addrParts = r.address.split(",").map((p: string) => p.trim());
            addressLine1 = addrParts[0] || "";
            
            // Try to extract suburb, state, postcode from remaining parts
            if (addrParts.length > 1) {
              const lastPart = addrParts[addrParts.length - 1];
              // Check if last part contains state and postcode (e.g., "NSW 2000")
              const statePostcodeMatch = lastPart.match(/^([A-Z]{2,3})\s+(\d{4})$/);
              if (statePostcodeMatch) {
                state = statePostcodeMatch[1];
                postcode = statePostcodeMatch[2];
                suburb = addrParts.slice(1, -1).join(", ") || "";
              } else {
                // Check if it's just postcode
                const postcodeMatch = lastPart.match(/^(\d{4})$/);
                if (postcodeMatch) {
                  postcode = postcodeMatch[1];
                  suburb = addrParts.slice(1, -1).join(", ") || "";
                } else {
                  suburb = addrParts.slice(1).join(", ");
                }
              }
            }
          }
          
          // Normalize Australian state (handle full names and abbreviations)
          if (state) {
            const stateLower = state.toLowerCase();
            if (AUSTRALIAN_STATE_NAMES[stateLower]) {
              state = AUSTRALIAN_STATE_NAMES[stateLower];
            } else if (!AUSTRALIAN_STATES.includes(state.toUpperCase())) {
              // Try to match partial state names
              const matched = Object.entries(AUSTRALIAN_STATE_NAMES).find(([name]) =>
                name.includes(stateLower) || stateLower.includes(name)
              );
              if (matched) state = matched[1];
            }
          }
          
          // Validate postcode (Australian format: 4 digits)
          if (postcode) {
            postcode = postcode.replace(/\D/g, "").slice(0, 4);
          }
          
          // Only create property if we have at least address_line1
          if (addressLine1.trim()) {
            try {
              const prop = await createProperty.mutateAsync({
                address_line1: addressLine1.trim(),
                address_line2: null,
                city: suburb.trim() || null,
                state: state || null,
                postcode: postcode || null,
                country: "Australia",
              });
              await createLink.mutateAsync({ 
                contact_id: contactId, 
                property_id: prop.id, 
                role: "owner" 
              });
            } catch (e) {
              errs.push(`Row ${rowNum}: Could not create property: ${(e as Error).message}`);
            }
          } else {
            errs.push(`Row ${rowNum}: Address line 1 required for property creation`);
          }
        }
      } catch (e) {
        errs.push(`Row ${rowNum}: ${(e as Error).message}`);
        sk++;
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      setCreated(cr);
      setUpdated(up);
      setSkipped(sk);
    }

    setErrors(errs);
    qc.invalidateQueries({ queryKey: ["contacts"] });
    qc.invalidateQueries({ queryKey: ["properties"] });
    qc.invalidateQueries({ queryKey: ["tags"] });
    setStep("complete");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[700px] bg-popover border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Contacts from CSV
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">Upload a CSV file</p>
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  <Upload className="w-4 h-4" />
                  Choose File
                </div>
                <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={onFile} />
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Map columns to: contact (name, email, phone, mobile), address, source, tags. We’ll preview the first {PREVIEW_ROWS} rows, validate, and de‑duplicate by email/mobile.
            </p>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Map CSV columns to contact, channel, address, source, and tags. {csvData.length} rows.
            </p>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2">
              {headers.map((h, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1 text-sm truncate" title={h}>
                    {h}
                  </div>
                  <Select value={mapping[idx] ?? "skip"} onValueChange={(v) => setMappingAt(idx, v)}>
                    <SelectTrigger className="w-[180px] bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAP_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="create-props"
                checked={createPropertiesFromAddress}
                onCheckedChange={(v) => setCreatePropertiesFromAddress(!!v)}
              />
              <Label htmlFor="create-props" className="text-sm">
                Create properties from address columns and link contacts as owners
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={() => setStep("preview")} disabled={!hasName}>
                Next: Preview
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              First {PREVIEW_ROWS} rows (mapped). Clean and validate, then import.
            </p>
            {validationErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Validation issues</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {validationErrors.slice(0, 5).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li>… and {validationErrors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="text-xs w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {mappedFields.map(({ field }) => (
                        <th key={field} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-t border-border">
                        {mappedFields.map(({ field }) => (
                          <td key={field} className="px-2 py-1 truncate max-w-[120px]">
                            {row[field] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={runImport}>
                Import {csvData.length} rows {validationErrors.length > 0 && `(some rows will be skipped)`}
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 mt-4 text-center py-6">
            <Progress value={progress} className="h-2 max-w-xs mx-auto" />
            <p className="text-sm font-medium">Importing… {created} created, {updated} updated, {skipped} skipped</p>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4 mt-4">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-success" />
              </div>
              <p className="font-medium">Import complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                Created {created}, updated {updated}, skipped {skipped}.
              </p>
            </div>
            {errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 max-h-32 overflow-y-auto">
                <p className="text-sm font-medium text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Errors ({errors.length})
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {errors.slice(0, 8).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {errors.length > 8 && <li>… and {errors.length - 8} more</li>}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
