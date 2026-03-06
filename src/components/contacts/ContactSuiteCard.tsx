import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import type { Interaction } from "@/hooks/useInteractions";

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

interface ContactSuiteCardProps {
  contactId: string;
  interactions: Interaction[];
  linkedPropertyIds: string[];
}

export function ContactSuiteCard({
  contactId,
  interactions,
  linkedPropertyIds,
}: ContactSuiteCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: documents = [] } = useContactDocuments(contactId);
  const createDoc = useCreateContactDocument();
  const deleteDoc = useDeleteContactDocument();
  const { data: properties = [] } = useProperties();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<ContactDocumentCategory>("correspondence");
  const [uploadPropertyId, setUploadPropertyId] = useState<string>("none");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const emailInteractions = interactions.filter((i) => i.type === "email");
  const correspondenceDocs = documents.filter((d) => d.category === "correspondence");
  const marketingDocs = documents.filter((d) => MARKETING_CATEGORIES.includes(d.category));
  const documentDocs = documents.filter((d) => DOCUMENT_CATEGORIES.includes(d.category));

  const linkedProperties = Array.isArray(properties)
    ? properties.filter((p) => p?.id && Array.isArray(linkedPropertyIds) && linkedPropertyIds.includes(p.id))
    : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadOpen(true);
    }
    e.target.value = "";
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !contactId) return;
    try {
      await createDoc.mutateAsync({
        contactId,
        file: selectedFile,
        propertyId: uploadPropertyId && uploadPropertyId !== "none" ? uploadPropertyId : null,
        category: uploadCategory,
      });
      toast({ title: "Uploaded", description: `${selectedFile.name} added.` });
      setUploadOpen(false);
      setSelectedFile(null);
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,image/*,video/*"
        onChange={handleFileChange}
        aria-label="Choose file to upload"
      />
      <Card className="zoho-card p-8 border-border print:border print:border-gray-300 print-section">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-8">
          Correspondence, marketing &amp; files
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-x-14 lg:gap-y-0">
          {/* Correspondence */}
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center justify-between gap-4 mb-5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Correspondence</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 shrink-0"
                onClick={() => {
                  setUploadCategory("correspondence");
                  setSelectedFile(null);
                  setUploadPropertyId("none");
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-4 h-4" /> Upload
              </Button>
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto min-w-0 pr-1">
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
                    {i.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{i.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(i.timestamp), "PP")}
                    </p>
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
                      { onError: () => {} }
                    )
                  }
                  onOpen={() => d.signed_url && window.open(d.signed_url)}
                />
              ))}
              {emailInteractions.length === 0 && correspondenceDocs.length === 0 && (
                <p className="text-sm text-muted-foreground py-10 px-4 text-center rounded-lg border border-dashed border-border bg-muted/10">
                  No correspondence yet. Log emails or upload PDFs.
                </p>
              )}
            </div>
          </div>

          {/* Marketing & listing materials */}
          <div className="min-w-0 flex flex-col pt-10 border-t border-border lg:pt-0 lg:border-t-0 lg:border-l lg:border-border lg:pl-10">
            <div className="flex items-center justify-between gap-4 mb-5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marketing</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 shrink-0"
                onClick={() => {
                  setUploadCategory("marketing");
                  setSelectedFile(null);
                  setUploadPropertyId("none");
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-4 h-4" /> Upload
              </Button>
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto min-w-0 pr-1">
              {marketingDocs.map((d) => (
                <DocumentRow
                  key={d.id}
                  doc={d}
                  categoryLabel={CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}
                  onDelete={() =>
                    deleteDoc.mutate(
                      { id: d.id, filePath: d.file_path, contactId, propertyId: d.property_id },
                      { onError: () => {} }
                    )
                  }
                  onOpen={() => d.signed_url && window.open(d.signed_url)}
                />
              ))}
              {marketingDocs.length === 0 && (
                <p className="text-sm text-muted-foreground py-10 px-4 text-center rounded-lg border border-dashed border-border bg-muted/10">
                  No marketing materials yet. Upload flyers, photos, signage, etc.
                </p>
              )}
            </div>
          </div>

          {/* Documents (reports, contracts, etc.) */}
          <div className="min-w-0 flex flex-col pt-10 border-t border-border lg:pt-0 lg:border-t-0 lg:border-l lg:border-border lg:pl-10">
            <div className="flex items-center justify-between gap-4 mb-5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 shrink-0"
                onClick={() => {
                  setUploadCategory("report");
                  setSelectedFile(null);
                  setUploadPropertyId("none");
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-4 h-4" /> Upload
              </Button>
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto min-w-0 pr-1">
              {documentDocs.map((d) => (
                <DocumentRow
                  key={d.id}
                  doc={d}
                  categoryLabel={CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}
                  onDelete={() =>
                    deleteDoc.mutate(
                      { id: d.id, filePath: d.file_path, contactId, propertyId: d.property_id },
                      { onError: () => {} }
                    )
                  }
                  onOpen={() => d.signed_url && window.open(d.signed_url)}
                />
              ))}
              {documentDocs.length === 0 && (
                <p className="text-sm text-muted-foreground py-10 px-4 text-center rounded-lg border border-dashed border-border bg-muted/10">
                  No documents yet. Upload reports, contracts, appraisals, etc.
                </p>
              )}
            </div>
          </div>
        </div>

      </Card>

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
            {Array.isArray(linkedProperties) && linkedProperties.length > 0 && (
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
                onClick={handleConfirmUpload}
                disabled={!selectedFile || createDoc.isPending}
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
}: {
  doc: ContactDocument;
  categoryLabel?: string;
  onDelete: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors group">
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

