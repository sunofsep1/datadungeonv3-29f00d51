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
  FileText,
  Upload,
  FileIcon,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import {
  usePropertyDocuments,
  useCreateContactDocument,
  useDeleteContactDocument,
  type ContactDocument,
  type ContactDocumentCategory,
} from "@/hooks/useContactDocuments";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES: { value: ContactDocumentCategory; label: string }[] = [
  { value: "marketing", label: "Marketing (flyers, brochures)" },
  { value: "listing_photos", label: "Listing photos / virtual tour" },
  { value: "listing_presentation", label: "Listing presentation / deck" },
  { value: "signage", label: "Signage / for-sale board" },
  { value: "report", label: "Report" },
  { value: "certificate", label: "Certificate" },
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

interface LinkedContact {
  id: string;
  name: string;
}

interface PropertySuiteCardProps {
  propertyId: string;
  linkedContacts: LinkedContact[];
}

export function PropertySuiteCard({
  propertyId,
  linkedContacts,
}: PropertySuiteCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: documents = [] } = usePropertyDocuments(propertyId);
  const createDoc = useCreateContactDocument();
  const deleteDoc = useDeleteContactDocument();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<ContactDocumentCategory>("marketing");
  const [uploadContactId, setUploadContactId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const marketingDocs = documents.filter((d) => MARKETING_CATEGORIES.includes(d.category));
  const documentDocs = documents.filter((d) => DOCUMENT_CATEGORIES.includes(d.category));

  const defaultContactId = linkedContacts[0]?.id ?? "";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadContactId(defaultContactId);
      setUploadOpen(true);
    }
    e.target.value = "";
  };

  const handleConfirmUpload = async () => {
    const contactId = uploadContactId || defaultContactId;
    if (!selectedFile || !contactId) {
      toast({ title: "Select a contact", description: "Link an owner or contact first to upload.", variant: "destructive" });
      return;
    }
    try {
      await createDoc.mutateAsync({
        contactId,
        file: selectedFile,
        propertyId,
        category: uploadCategory,
      });
      toast({ title: "Uploaded", description: `${selectedFile.name} added.` });
      setUploadOpen(false);
      setSelectedFile(null);
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (linkedContacts.length === 0) {
    return (
      <Card className="zoho-card p-8 border-border">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-6">
          Marketing &amp; documents
        </h3>
        <div className="py-12 px-6 text-center rounded-lg border border-dashed border-border bg-muted/10">
          <p className="text-sm text-muted-foreground mb-2">
            Link an owner or contact to this property to upload marketing materials and documents.
          </p>
        </div>
      </Card>
    );
  }

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
      <Card className="zoho-card p-8 border-border">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-8">
          Marketing &amp; documents
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-x-14 lg:gap-y-0">
          {/* Marketing & listing materials */}
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center justify-between gap-4 mb-5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marketing</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 shrink-0"
                onClick={() => {
                  setUploadCategory("marketing");
                  setSelectedFile(null);
                  setUploadContactId(defaultContactId);
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
                      { id: d.id, filePath: d.file_path, contactId: d.contact_id, propertyId: d.property_id },
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
                  setUploadContactId(defaultContactId);
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
                      { id: d.id, filePath: d.file_path, contactId: d.contact_id, propertyId: d.property_id },
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

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
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
            <div className="space-y-2">
              <Label>Link to contact</Label>
              <Select value={uploadContactId} onValueChange={setUploadContactId}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {linkedContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUpload}
                disabled={!selectedFile || !uploadContactId || createDoc.isPending}
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
