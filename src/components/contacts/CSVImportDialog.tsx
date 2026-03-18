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
import { useProperties, useCreateProperty } from "@/hooks/useProperties";
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
  { value: "address", label: "Address / Linked property address" },
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
function normalizeAddressKey(addr: { address_line1: string; city?: string; state?: string; postcode?: string }): string {
  const a = (addr.address_line1 || "").trim().toLowerCase().replace(/\s+/g, " ");
  const c = (addr.city || "").trim().toLowerCase().replace(/\s+/g, " ");
  const s = (addr.state || "").trim().toUpperCase();
  const p = (addr.postcode || "").replace(/\D/g, "").slice(0, 4);
  return [a, c, s, p].filter(Boolean).join("|");
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: existingContacts = [] } = useContacts();
  const { data: existingProperties = [] } = useProperties();
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
  const [createPropertiesFromAddress, setCreatePropertiesFromAddress] = useState(true);
  const [progress, setProgress] = useState(0);
  const [created, setCreated] = useState(0);
  const [updated, setUpdated] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [propertiesCreated, setPropertiesCreated] = useState(0);
  const [linksCreated, setLinksCreated] = useState(0);
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

  const addressToProperty = useMemo(() => {
    const m = new Map<string, string>();
    existingProperties.forEach((p) => {
      const key = normalizeAddressKey({
        address_line1: p.address_line1 ?? "",
        city: p.city ?? "",
        state: p.state ?? "",
        postcode: p.postcode ?? "",
      });
      if (key) m.set(key, p.id);
    });
    return m;
  }, [existingProperties]);

  const reset = () => {
    setStep("upload");
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setCreatePropertiesFromAddress(true);
    setProgress(0);
    setCreated(0);
    setUpdated(0);
    setSkipped(0);
    setPropertiesCreated(0);
    setLinksCreated(0);
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
        let opt: (typeof MAP_OPTIONS)[0] | undefined;
        // HubSpot-style: "Linked property address" / "Property address"
        if ((lower.includes("linked") && lower.includes("address")) || (lower.includes("property") && lower.includes("address"))) {
          opt = MAP_OPTIONS.find((o) => o.value === "address");
        }
        // Explicit matching for common address parts (check before generic)
        if (!opt) {
          if (
            lower.includes("addressline1") ||
            (lower.includes("addressline") && lower.includes("1")) ||
            lower.includes("streetaddress") ||
            lower.includes("streetaddr") ||
            (lower.includes("addr") && (lower.includes("line1") || (lower.includes("1") && !lower.includes("2"))))
          ) {
            opt = MAP_OPTIONS.find((o) => o.value === "address_line1");
          } else if (lower.includes("suburb") || lower.includes("town") || lower.includes("locality") || lower === "city") {
            opt = MAP_OPTIONS.find((o) => o.value === "city");
          } else if (lower.includes("postcode") || lower.includes("postal") || lower.includes("zip")) {
            opt = MAP_OPTIONS.find((o) => o.value === "postcode");
          } else if (
            lower.includes("street") ||
            (lower.includes("road") && !lower.includes("postal")) ||
            ((lower === "rd" || lower === "st") && lower.length <= 3)
          ) {
            opt = MAP_OPTIONS.find((o) => o.value === "address_line1");
          } else if ((lower.includes("state") || lower.includes("region") || lower.includes("province")) && !lower.includes("address")) {
            opt = MAP_OPTIONS.find((o) => o.value === "state");
          } else if (lower.includes("addr") && !lower.includes("line2")) {
            opt = MAP_OPTIONS.find((o) => o.value === "address");
          } else if (lower === "phones" || lower.includes("phone")) {
            opt = MAP_OPTIONS.find((o) => o.value === "phone");
          } else if (lower === "emails" || lower.includes("email")) {
            opt = MAP_OPTIONS.find((o) => o.value === "email");
          }
        }
        if (!opt) {
          opt = MAP_OPTIONS.find((o) => o.value !== "skip" && lower.includes(o.value.replace("_", "").slice(0, 4)));
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
      sk = 0,
      propsCreated = 0,
      linksCreated = 0;
    const total = mappedRows.length;
    const tagMap = new Map(tagNameToId);

    // Track contacts created/updated in this batch to prevent duplicates within the CSV
    const batchEmailToContact = new Map<string, { id: string }>(
      Array.from(emailToContact.entries()).map(([k, c]) => [k, { id: c.id }])
    );
    const batchPhoneToContact = new Map<string, { id: string }>(
      Array.from(phoneToContact.entries()).map(([k, c]) => [k, { id: c.id }])
    );
    // Track properties by address to prevent duplicate properties from same CSV or existing DB
    const batchAddressToProperty = new Map<string, string>(addressToProperty);

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
        (emailNorm && batchEmailToContact.get(emailNorm)) ??
        (phoneNorm && batchPhoneToContact.get(phoneNorm)) ??
        (mobileNorm && batchPhoneToContact.get(mobileNorm)) ??
        null;

      let contactId: string;
      try {
        // Resolve address fields for this row (used for contact_addresses and property creation)
        const resolveAddress = (): { addressLine1: string; suburb: string; state: string; postcode: string } => {
          let addressLine1 = (r.address_line1 || "").trim();
          let suburb = (r.city || "").trim();
          let state = (r.state || "").trim();
          let postcode = (r.postcode || "").trim();

          if (r.address) {
            const addrParts = r.address.split(",").map((p: string) => p.trim()).filter(Boolean);
            const first = addrParts[0] || "";
            if (!addressLine1) addressLine1 = first;

            if (addrParts.length > 1) {
              const rest = addrParts.slice(1).join(", ");
              const statePostcodeMatch = rest.match(/\b([A-Z]{2,3})\s*(\d{4})\b/i);
              if (statePostcodeMatch) {
                if (!state) state = statePostcodeMatch[1].toUpperCase();
                if (!postcode) postcode = statePostcodeMatch[2];
                if (!suburb) suburb = rest.substring(0, statePostcodeMatch.index).trim().replace(/^,\s*|,\s*$/g, "");
              } else {
                const postcodeOnly = rest.match(/\b(\d{4})\b/);
                if (postcodeOnly && !postcode) {
                  postcode = postcodeOnly[1];
                  if (!suburb) suburb = rest.replace(postcodeOnly[0], "").replace(/^,\s*|,\s*$/g, "").trim();
                } else if (!suburb) {
                  suburb = rest;
                }
              }
            } else if (first && (!suburb || !state || !postcode)) {
              // Single-part combined e.g. "123 Main St Sydney NSW 2000" or "Sydney NSW 2000"
              const sp = first.match(/\b([A-Z]{2,3})\s*(\d{4})\b/i);
              if (sp) {
                if (!state) state = sp[1].toUpperCase();
                if (!postcode) postcode = sp[2];
                if (!addressLine1) addressLine1 = first.replace(sp[0], "").trim().replace(/^,\s*|,\s*$/g, "");
              }
            }
          }
          return { addressLine1, suburb, state, postcode };
        };
        const addr = resolveAddress();

        const contactPayload = {
          name: r.name,
          email: r.email || null,
          phone: r.phone || r.mobile || null,
          source: r.source || null,
          status: (r.status as "hot" | "warm" | "cold" | "lead") || "lead",
          notes: r.notes || null,
          story: r.story || null,
          ...(addr.addressLine1 || addr.suburb || addr.state || addr.postcode
            ? {
                address_line1: addr.addressLine1 || null,
                city: addr.suburb || null,
                state: addr.state || null,
                postcode: addr.postcode || null,
                country: "Australia",
              }
            : {}),
        };

        if (match) {
          await updateContact.mutateAsync({
            id: match.id,
            ...contactPayload,
          });
          contactId = match.id;
          up++;
        } else {
          const created = await createContact.mutateAsync(contactPayload);
          contactId = (created as { id: string }).id;
          cr++;
        }

        // Add to batch maps so duplicate rows in this CSV update instead of creating
        const ref = { id: contactId };
        if (emailNorm) batchEmailToContact.set(emailNorm, ref);
        if (phoneNorm) batchPhoneToContact.set(phoneNorm, ref);
        if (mobileNorm) batchPhoneToContact.set(mobileNorm, ref);

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
        if (createPropertiesFromAddress && (addr.addressLine1 || addr.suburb || addr.state || addr.postcode)) {
          const addressLine1 = addr.addressLine1;
          const suburb = addr.suburb;
          let state = addr.state;
          let postcode = addr.postcode;
          
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
          
          // Create property when we have at least street or suburb (use suburb as line1 if no street)
          const propLine1 = addressLine1.trim() || suburb.trim() || null;
          if (propLine1) {
            try {
              const addrKey = normalizeAddressKey({
                address_line1: propLine1,
                city: suburb.trim(),
                state: state || undefined,
                postcode: postcode || undefined,
              });
              let propertyId = batchAddressToProperty.get(addrKey);
              if (!propertyId) {
                const prop = await createProperty.mutateAsync({
                  address_line1: propLine1,
                  address_line2: null,
                  city: suburb.trim() || null,
                  state: state || null,
                  postcode: postcode || null,
                  country: "Australia",
                });
                propertyId = (prop as { id: string }).id;
                batchAddressToProperty.set(addrKey, propertyId);
                propsCreated++;
              }
              try {
                await createLink.mutateAsync({ 
                  contact_id: contactId, 
                  property_id: propertyId, 
                  role: "owner" 
                });
                linksCreated++;
              } catch (linkErr) {
                // Ignore duplicate link (contact already linked to this property)
                const msg = (linkErr as Error).message.toLowerCase();
                if (!msg.includes("duplicate") && !msg.includes("unique") && !msg.includes("already exists")) {
                  errs.push(`Row ${rowNum}: Could not link property: ${(linkErr as Error).message}`);
                }
              }
            } catch (e) {
              errs.push(`Row ${rowNum}: Could not create property: ${(e as Error).message}`);
            }
          }
          // If address columns are mapped but we couldn't extract street/suburb, skip property creation (contact still imported)
        }
      } catch (e) {
        errs.push(`Row ${rowNum}: ${(e as Error).message}`);
        sk++;
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      setCreated(cr);
      setUpdated(up);
      setSkipped(sk);
      setPropertiesCreated(propsCreated);
      setLinksCreated(linksCreated);
    }

    setErrors(errs);
    qc.invalidateQueries({ queryKey: ["contacts"] });
    qc.invalidateQueries({ queryKey: ["properties"] });
    qc.invalidateQueries({ queryKey: ["contact"] });
    qc.invalidateQueries({ queryKey: ["property"] });
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
              Map columns to: contact (name, email, phone, mobile), address, source, tags. We’ll preview the first {PREVIEW_ROWS} rows, validate, and de‑duplicate contacts by email/phone and properties by address.
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
            <p className="text-sm font-medium">Importing… {created} contacts created, {updated} updated, {skipped} skipped</p>
            <p className="text-xs text-muted-foreground">{propertiesCreated} properties, {linksCreated} owner links</p>
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
                {created} contacts created, {updated} updated, {skipped} skipped.
              </p>
              {createPropertiesFromAddress && (
                <p className="text-sm text-muted-foreground mt-1">
                  {propertiesCreated} properties created, {linksCreated} owner links.
                </p>
              )}
              {createPropertiesFromAddress && propertiesCreated === 0 && linksCreated === 0 && (created > 0 || updated > 0) && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  No properties linked. Map address columns (Address, Suburb/City, State, Postcode) and ensure the checkbox is checked.
                </p>
              )}
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
