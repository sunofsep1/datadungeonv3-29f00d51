import { useCallback, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Mail,
  FileText,
  Upload,
  FileIcon,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import {
  useContactDocuments,
  useCreateContactDocument,
  useDeleteContactDocument,
  type ContactDocument,
  type ContactDocumentCategory,
} from "@/hooks/useContactDocuments";
import { useProperties, formatPropertyAddress } from "@/hooks/useProperties";
import type { Interaction } from "@/hooks/useInteractions";
import { cn } from "@/lib/utils";

const MAX_BYTES = 20 * 1024 * 1024;

const CATEGORIES: { value: ContactDocumentCategory; label: string }[] = [
  { value: "correspondence", label: "Correspondence" },
  { value: "report", label: "Report" },
  { value: "certificate", label: "Certificate" },
  { value: "marketing", label: "Marketing (flyers, brochures)" },
  { value: "listing_photos", label: "Listing photos / virtual tour" },
  { value: "listing_presentation", label: "Listing presentation / deck" },
  { value: "signage", label: "Signage / for-sale board" },
  { value: "appraisal", label: "Appraisal / valuation" },
  { value: "contract", label: "Contract / offer" },
  { value: "disclosure", label: "Disclosure" },
  { value: "other", label: "Other" },
];

const MARKETING_CATEGORIES: ContactDocumentCategory[] = [
  "marketing",
  "listing_photos",
  "listing_presentation",
  "signage",
];

const DOCUMENT_CATEGORIES: ContactDocumentCategory[] = [
  "report",
  "certificate",
  "appraisal",
  "contract",
  "disclosure",
  "other",
];

type SuiteTab = "correspondence" | "marketing" | "documents";

const TAB_DEFAULT_CATEGORY: Record<SuiteTab, ContactDocumentCategory> = {
  correspondence: "correspondence",
  marketing: "marketing",
  documents: "report",
};

interface ContactSuiteCardProps {
  contactId: string;
  interactions: Interaction[];
  linkedPropertyIds: string[];
  variant?: "page" | "sheet";
}

type BatchRow = {
  id: string;
  file: File;
  phase: "queued" | "uploading" | "done" | "error";
  error?: string;
};

function validateFile(file: File): string | null {
  if (file.size > MAX_BYTES) return "File exceeds 20 MB limit.";
  return null;
}

export function ContactSuiteCard({
  contactId,
  interactions,
  linkedPropertyIds,
  variant = "page",
}: ContactSuiteCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: documents = [] } = useContactDocuments(contactId);
  const createDoc = useCreateContactDocument();
  const deleteDoc = useDeleteContactDocument();
  const { data: properties = [] } = useProperties();

  const [tab, setTab] = useState<SuiteTab>("correspondence");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<ContactDocumentCategory>("correspondence");
  const [uploadPropertyId, setUploadPropertyId] = useState<string>("none");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [batch, setBatch] = useState<BatchRow[]>([]);

  const emailInteractions = interactions.filter((i) => i.type === "email");
  const correspondenceDocs = documents.filter((d) => d.category === "correspondence");
  const marketingDocs = documents.filter((d) => MARKETING_CATEGORIES.includes(d.category));
  const documentDocs = documents.filter((d) => DOCUMENT_CATEGORIES.includes(d.category));

  const linkedProperties = Array.isArray(properties)
    ? properties.filter((p) => p?.id && Array.isArray(linkedPropertyIds) && linkedPropertyIds.includes(p.id))
    : [];

  const openFilePicker = (category: ContactDocumentCategory) => {
    setUploadCategory(category);
    setSelectedFile(null);
    fileInputRef.current?.click();
  };

  const runBatchUpload = useCallback(
    async (files: File[], category: ContactDocumentCategory) => {
      const propertyId = uploadPropertyId && uploadPropertyId !== "none" ? uploadPropertyId : null;
      const rows: BatchRow[] = files.map((file, i) => ({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        phase: "queued" as const,
      }));
      setBatch((prev) => [...prev, ...rows]);

      for (const row of rows) {
        const err = validateFile(row.file);
        if (err) {
          setBatch((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, phase: "error", error: err } : r)),
          );
          continue;
        }
        setBatch((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, phase: "uploading" } : r)),
        );
        try {
          await createDoc.mutateAsync({
            contactId,
            file: row.file,
            propertyId,
            category,
          });
          setBatch((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, phase: "done" } : r)),
          );
        } catch (e) {
          setBatch((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? { ...r, phase: "error", error: (e as Error).message ?? "Upload failed" }
                : r,
            ),
          );
        }
      }
      setTimeout(() => {
        setBatch((prev) => prev.filter((r) => r.phase !== "done"));
      }, 4000);
    },
    [contactId, createDoc, uploadPropertyId],
  );

  const onDropFiles = (e: React.DragEvent, category: ContactDocumentCategory) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length === 0) return;
    void runBatchUpload(files, category);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) {
      e.target.value = "";
      return;
    }
    const files = Array.from(list);
    if (files.length === 1) {
      setSelectedFile(files[0]);
      setUploadOpen(true);
    } else {
      void runBatchUpload(files, uploadCategory);
    }
    e.target.value = "";
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !contactId) return;
    const err = validateFile(selectedFile);
    if (err) return;
    try {
      await createDoc.mutateAsync({
        contactId,
        file: selectedFile,
        propertyId: uploadPropertyId && uploadPropertyId !== "none" ? uploadPropertyId : null,
        category: uploadCategory,
      });
      setUploadOpen(false);
      setSelectedFile(null);
    } catch {
      /* toast optional */
    }
  };

  const dropZone = (category: ContactDocumentCategory) => (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openFilePicker(category);
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragActive(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDropFiles(e, category)}
      onClick={() => openFilePicker(category)}
      className={cn(
        "rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm transition-colors cursor-pointer",
        dragActive && "border-primary bg-primary/5",
        variant === "sheet" && "py-6",
      )}
    >
      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" aria-hidden />
      <p className="text-foreground font-medium">Drag and drop files here</p>
      <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
      <p className="text-[11px] text-muted-foreground mt-2">PDF, DOCX, JPG, PNG — max 20 MB per file</p>
    </div>
  );

  const propertySelect =
    linkedProperties.length > 0 ? (
      <div className="space-y-2 mb-4">
        <Label className="text-xs text-muted-foreground">Link uploads to property (optional)</Label>
        <Select value={uploadPropertyId || "none"} onValueChange={setUploadPropertyId}>
          <SelectTrigger className="bg-input h-9">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {linkedProperties.map((p) => {
              if (!p?.id) return null;
              const label = (() => {
                try {
                  return formatPropertyAddress(p) || p.address_line1 || p.id || "Property";
                } catch {
                  return p.address_line1 || p.id || "Property";
                }
              })();
              return (
                <SelectItem key={p.id} value={p.id}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    ) : null;

  const batchList =
    batch.length > 0 ? (
      <ul className="space-y-2 mt-4 border-t border-border pt-3">
        {batch.map((row) => (
          <li key={row.id} className="rounded-md border border-border bg-muted/15 px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-foreground">{row.file.name}</span>
              <span className="shrink-0 text-muted-foreground capitalize">{row.phase}</span>
            </div>
            {row.phase === "uploading" ? <Progress className="mt-2 h-1" value={66} /> : null}
            {row.phase === "error" && row.error ? (
              <p className="text-destructive mt-1">{row.error}</p>
            ) : null}
          </li>
        ))}
      </ul>
    ) : null;

  const correspondenceBlock = (
    <div className="space-y-4 min-w-0">
      {variant === "page" ? propertySelect : null}
      {dropZone("correspondence")}
      {batchList}
      <div className="space-y-3 max-h-[min(360px,45vh)] overflow-y-auto min-w-0 pr-1">
        {emailInteractions.map((i) => (
          <div
            key={i.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{i.subject || "Email"}</p>
              {i.body && <p className="text-xs text-muted-foreground line-clamp-2">{i.body}</p>}
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(i.timestamp), "PP")}</p>
            </div>
          </div>
        ))}
        {correspondenceDocs.map((d) => (
          <DocumentRow
            key={d.id}
            doc={d}
            categoryLabel={CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}
            onDelete={() =>
              deleteDoc.mutate(
                { id: d.id, filePath: d.file_path, contactId, propertyId: d.property_id },
                { onError: () => {} },
              )
            }
            onOpen={() => d.signed_url && window.open(d.signed_url)}
          />
        ))}
        {emailInteractions.length === 0 && correspondenceDocs.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center rounded-lg border border-dashed border-border bg-muted/10">
            No correspondence yet. Log emails or upload files above.
          </p>
        )}
      </div>
    </div>
  );

  const marketingBlock = (
    <div className="space-y-4 min-w-0">
      {variant === "page" ? propertySelect : null}
      {dropZone("marketing")}
      {batchList}
      <div className="space-y-3 max-h-[min(360px,45vh)] overflow-y-auto min-w-0 pr-1">
        {marketingDocs.map((d) => (
          <DocumentRow
            key={d.id}
            doc={d}
            categoryLabel={CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}
            onDelete={() =>
              deleteDoc.mutate(
                { id: d.id, filePath: d.file_path, contactId, propertyId: d.property_id },
                { onError: () => {} },
              )
            }
            onOpen={() => d.signed_url && window.open(d.signed_url)}
          />
        ))}
        {marketingDocs.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center rounded-lg border border-dashed border-border bg-muted/10">
            No marketing materials yet.
          </p>
        )}
      </div>
    </div>
  );

  const documentsBlock = (
    <div className="space-y-4 min-w-0">
      {variant === "page" ? propertySelect : null}
      {dropZone("report")}
      {batchList}
      <div className="space-y-3 max-h-[min(360px,45vh)] overflow-y-auto min-w-0 pr-1">
        {documentDocs.map((d) => (
          <DocumentRow
            key={d.id}
            doc={d}
            categoryLabel={CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}
            onDelete={() =>
              deleteDoc.mutate(
                { id: d.id, filePath: d.file_path, contactId, propertyId: d.property_id },
                { onError: () => {} },
              )
            }
            onOpen={() => d.signed_url && window.open(d.signed_url)}
          />
        ))}
        {documentDocs.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center rounded-lg border border-dashed border-border bg-muted/10">
            No documents yet.
          </p>
        )}
      </div>
    </div>
  );

  const sheetList = (tabKey: SuiteTab) => {
    const docs =
      tabKey === "correspondence"
        ? correspondenceDocs
        : tabKey === "marketing"
          ? marketingDocs
          : documentDocs;
    const emails = tabKey === "correspondence" ? emailInteractions : [];
    const empty = docs.length === 0 && emails.length === 0;
    return (
      <div className="space-y-4 max-h-[min(400px,50vh)] overflow-y-auto pr-1">
        {empty ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
            No files yet — drag and drop or click to upload.
          </p>
        ) : (
          <ul className="space-y-2">
            {emails.map((i) => (
              <li
                key={i.id}
                className="flex gap-2 p-2 rounded-lg border border-border text-xs bg-muted/15"
              >
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{i.subject || "Email"}</span>
              </li>
            ))}
            {docs.map((d) => (
              <DocumentRow
                key={d.id}
                doc={d}
                compact
                categoryLabel={CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}
                onDelete={() =>
                  deleteDoc.mutate(
                    { id: d.id, filePath: d.file_path, contactId, propertyId: d.property_id },
                    { onError: () => {} },
                  )
                }
                onOpen={() => d.signed_url && window.open(d.signed_url)}
              />
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,image/*,video/*"
        onChange={handleFileChange}
        aria-label="Choose files to upload"
      />

      {variant === "sheet" ? (
        <Card className="zoho-card p-5 border-border min-w-0">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
            Correspondence, marketing &amp; files
          </h3>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = v as SuiteTab;
              setTab(next);
              setUploadCategory(TAB_DEFAULT_CATEGORY[next]);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
              <TabsTrigger value="correspondence" className="text-xs">
                Correspondence
              </TabsTrigger>
              <TabsTrigger value="marketing" className="text-xs">
                Marketing
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">
                Documents
              </TabsTrigger>
            </TabsList>
            <TabsContent value="correspondence" className="mt-4 space-y-4 min-w-0">
              {dropZone("correspondence")}
              {batchList}
              {sheetList("correspondence")}
            </TabsContent>
            <TabsContent value="marketing" className="mt-4 space-y-4 min-w-0">
              {dropZone("marketing")}
              {batchList}
              {sheetList("marketing")}
            </TabsContent>
            <TabsContent value="documents" className="mt-4 space-y-4 min-w-0">
              {dropZone("report")}
              {batchList}
              {sheetList("documents")}
            </TabsContent>
          </Tabs>
        </Card>
      ) : (
        <Card className="zoho-card p-6 sm:p-8 border-border print:border print:border-gray-300 print-section">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-6">
            Correspondence, marketing &amp; files
          </h3>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = v as SuiteTab;
              setTab(next);
              setUploadCategory(TAB_DEFAULT_CATEGORY[next]);
            }}
            className="w-full min-w-0"
          >
            <TabsList className="grid w-full max-w-xl grid-cols-3">
              <TabsTrigger value="correspondence">Correspondence</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
            <TabsContent value="correspondence" className="mt-6">
              {correspondenceBlock}
            </TabsContent>
            <TabsContent value="marketing" className="mt-6">
              {marketingBlock}
            </TabsContent>
            <TabsContent value="documents" className="mt-6">
              {documentsBlock}
            </TabsContent>
          </Tabs>
        </Card>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen} modal>
        <DialogContent className="sm:max-w-[400px] bg-background text-foreground border-border">
          <DialogHeader>
            <DialogTitle>Upload file</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" /> {selectedFile ? "Change file" : "Choose file"}
              </Button>
              {selectedFile && (
                <span className="text-sm text-foreground truncate">
                  <FileIcon className="w-4 h-4 inline mr-2" />
                  {selectedFile.name}
                </span>
              )}
            </div>
            {selectedFile && validateFile(selectedFile) ? (
              <p className="text-sm text-destructive">{validateFile(selectedFile)}</p>
            ) : null}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={uploadCategory}
                onValueChange={(v) => setUploadCategory(v as ContactDocumentCategory)}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {linkedProperties.length > 0 && (
              <div className="space-y-2">
                <Label>Link to property (optional)</Label>
                <Select value={uploadPropertyId || "none"} onValueChange={setUploadPropertyId}>
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {linkedProperties.map((p) => {
                      if (!p?.id) return null;
                      const label = (() => {
                        try {
                          return formatPropertyAddress(p) || p.address_line1 || p.id || "Property";
                        } catch {
                          return p.address_line1 || p.id || "Property";
                        }
                      })();
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleConfirmUpload()}
                disabled={!selectedFile || createDoc.isPending || Boolean(selectedFile && validateFile(selectedFile))}
              >
                {createDoc.isPending ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DocumentRow({
  doc,
  categoryLabel,
  onDelete,
  onOpen,
  compact,
}: {
  doc: ContactDocument;
  categoryLabel?: string;
  onDelete: () => void;
  onOpen: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors group",
        compact ? "p-2" : "p-3",
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="text-sm font-medium truncate block text-left hover:underline text-foreground"
        >
          {doc.name}
        </button>
        <p className="text-xs text-muted-foreground mt-0.5">
          {format(new Date(doc.created_at), "PP")}
          {categoryLabel && ` · ${categoryLabel}`}
          {doc.property_id && " · Linked"}
        </p>
      </div>
      <div className="flex gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpen}>
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
