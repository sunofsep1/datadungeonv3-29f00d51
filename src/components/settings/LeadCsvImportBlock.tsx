import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useBulkCreateLeads, type LeadInsert } from "@/hooks/useLeads";
import { parseLeadsCsv, type ParsedLeadRow } from "@/lib/parseLeadsCsv";
import { toast } from "sonner";
import { FileSpreadsheet, Upload } from "lucide-react";

function toLeadInsert(r: ParsedLeadRow): LeadInsert {
  return {
    name: r.name,
    email: r.email,
    phone: r.phone,
    source: r.source ?? undefined,
    notes: r.notes,
    property_interest: r.property_interest,
    budget_min: r.budget_min,
    budget_max: r.budget_max,
    timeline: r.timeline,
    status: r.status,
  };
}

export function LeadCsvImportBlock() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<ParsedLeadRow[]>([]);
  const [parseErrors, setParseErrors] = React.useState<{ line: number; message: string }[]>([]);
  const [pendingRows, setPendingRows] = React.useState<ParsedLeadRow[]>([]);
  const [createContacts, setCreateContacts] = React.useState(true);
  const bulk = useBulkCreateLeads();

  const reset = () => {
    setFileName(null);
    setPreview([]);
    setParseErrors([]);
    setPendingRows([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const { rows, rowErrors } = parseLeadsCsv(text);
      setPendingRows(rows);
      setParseErrors(rowErrors);
      setPreview(rows.slice(0, 8));
      if (rows.length === 0 && rowErrors.length === 0) {
        toast.error("No rows parsed from file.");
      } else if (rows.length > 0) {
        toast.message(`Parsed ${rows.length} lead${rows.length !== 1 ? "s" : ""}${rowErrors.length ? ` (${rowErrors.length} row issue${rowErrors.length !== 1 ? "s" : ""})` : ""}`);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const importRows = () => {
    if (pendingRows.length === 0) return;
    const payload = pendingRows.map(toLeadInsert);
    bulk.mutate(
      { rows: payload, createContacts },
      {
      onSuccess: (res) => {
        let msg = `Imported ${res.inserted} lead${res.inserted !== 1 ? "s" : ""}.`;
        if (createContacts) {
          msg += ` Created ${res.contactsCreated} contact${res.contactsCreated !== 1 ? "s" : ""}.`;
          if (res.contactFailures.length > 0) {
            msg += ` ${res.contactFailures.length} contact row${res.contactFailures.length !== 1 ? "s" : ""} failed (leads still saved).`;
            console.warn("[csv lead import] contact failures", res.contactFailures);
          }
          if (res.leadLinkFailures.length > 0) {
            msg += ` ${res.leadLinkFailures.length} lead–contact link${res.leadLinkFailures.length !== 1 ? "s" : ""} failed (contacts exist).`;
            console.warn("[csv lead import] lead link failures", res.leadLinkFailures);
          }
        }
        toast.success(msg);
        reset();
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Import failed");
      },
    },
    );
  };

  return (
    <div className="flex items-start gap-3 pt-2 border-t border-border">
      <FileSpreadsheet className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 space-y-3 flex-1">
        <div>
          <p className="text-sm font-medium text-foreground">Import leads (CSV)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            First row: headers. Recognized columns: name (or first_name + last_name), email, phone, source, notes,
            property_interest, budget_min, budget_max, timeline, status. Up to 500 rows per file. Leads appear in your
            dashboard calendar widget and anywhere else you track leads. Use the toggle below to also create CRM contacts
            (recommended) so people appear on the Contacts page, get lead scores, and can enter nurture flows—same idea as the
            inbound lead webhook.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted/20 px-3 py-2">
          <div className="min-w-0">
            <Label htmlFor="csv-create-contacts" className="text-sm font-medium text-foreground cursor-pointer">
              Also create contacts
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mirrors the inbound webhook: warm_lead category, budgets, property interest, then classification + optional nurture
              enrollment.
            </p>
          </div>
          <Switch id="csv-create-contacts" checked={createContacts} onCheckedChange={setCreateContacts} />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={onFile}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => inputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" />
            Choose CSV
          </Button>
          {fileName ? (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Clear
            </Button>
          ) : null}
        </div>
        {fileName ? <p className="text-xs text-muted-foreground font-mono truncate">{fileName}</p> : null}
        {parseErrors.length > 0 ? (
          <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
            {parseErrors.map((e) => (
              <p key={`${e.line}-${e.message}`}>
                Line {e.line}: {e.message}
              </p>
            ))}
          </div>
        ) : null}
        {preview.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Preview (first {preview.length} of {pendingRows.length})</Label>
            <ScrollArea className="h-[160px] rounded-md border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-left p-2 font-medium">Email</th>
                    <th className="text-left p-2 font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={`${r.name}-${i}`} className="border-b border-border/60">
                      <td className="p-2 max-w-[140px] truncate">{r.name}</td>
                      <td className="p-2 max-w-[160px] truncate">{r.email ?? "—"}</td>
                      <td className="p-2 max-w-[120px] truncate">{r.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
            <Button type="button" size="sm" onClick={importRows} disabled={bulk.isPending || pendingRows.length === 0}>
              {bulk.isPending ? "Importing…" : `Import ${pendingRows.length} lead${pendingRows.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
