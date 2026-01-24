import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Check, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateContact } from "@/hooks/useContacts";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONTACT_FIELDS = [
  { value: "name", label: "Name *", required: true },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "source", label: "Source" },
  { value: "status", label: "Status" },
  { value: "notes", label: "Notes" },
  { value: "story", label: "Story" },
  { value: "pipeline_stage", label: "Pipeline Stage" },
  { value: "selling_intentions", label: "Selling Intentions" },
  { value: "current_situation_notes", label: "Current Situation Notes" },
  { value: "pain_points", label: "Pain Points" },
  { value: "pleasure_points", label: "Pleasure Points" },
  { value: "skip", label: "-- Skip Column --" },
];

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const createContact = useCreateContact();

  const resetState = () => {
    setStep("upload");
    setCsvData([]);
    setHeaders([]);
    setColumnMapping({});
    setImportProgress(0);
    setImportedCount(0);
    setSkippedCount(0);
    setErrors([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      const parsedData = lines.map(line => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });

      if (parsedData.length < 2) {
        toast({ title: "Error", description: "CSV must have headers and at least one data row", variant: "destructive" });
        return;
      }

      setHeaders(parsedData[0]);
      setCsvData(parsedData.slice(1));
      
      // Auto-map columns based on header names
      const autoMapping: Record<number, string> = {};
      parsedData[0].forEach((header, index) => {
        const headerLower = header.toLowerCase().replace(/[^a-z]/g, "");
        const matchedField = CONTACT_FIELDS.find(f => 
          f.value !== "skip" && headerLower.includes(f.value.replace("_", ""))
        );
        if (matchedField) {
          autoMapping[index] = matchedField.value;
        }
      });
      setColumnMapping(autoMapping);
      setStep("mapping");
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (columnIndex: number, fieldValue: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [columnIndex]: fieldValue,
    }));
  };

  const validateMapping = () => {
    const hasNameMapping = Object.values(columnMapping).includes("name");
    if (!hasNameMapping) {
      toast({ title: "Error", description: "You must map a column to 'Name'", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleStartImport = async () => {
    if (!validateMapping()) return;
    
    setStep("importing");
    const newErrors: string[] = [];
    let imported = 0;
    let skipped = 0;
    const batchSize = 10;

    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, Math.min(i + batchSize, csvData.length));
      
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const contact: Record<string, string | null> = {};
        
        Object.entries(columnMapping).forEach(([colIndex, field]) => {
          if (field !== "skip") {
            contact[field] = row[parseInt(colIndex)] || null;
          }
        });

        if (!contact.name || !contact.name.trim()) {
          newErrors.push(`Row ${i + j + 2}: Missing required field 'name'`);
          skipped++;
          continue;
        }

        try {
          await createContact.mutateAsync({
            name: contact.name,
            email: contact.email || null,
            phone: contact.phone || null,
            source: contact.source || null,
            status: contact.status || "lead",
            notes: contact.notes || null,
            story: contact.story || null,
            pipeline_stage: contact.pipeline_stage || null,
            selling_intentions: contact.selling_intentions || null,
            current_situation_notes: contact.current_situation_notes || null,
            pain_points: contact.pain_points || null,
            pleasure_points: contact.pleasure_points || null,
          });
          imported++;
        } catch (error: any) {
          newErrors.push(`Row ${i + j + 2}: ${error.message || "Failed to import"}`);
          skipped++;
        }
      }

      setImportProgress(Math.round(((i + batch.length) / csvData.length) * 100));
      setImportedCount(imported);
      setSkippedCount(skipped);
    }

    setErrors(newErrors);
    setStep("complete");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { 
      if (!isOpen) resetState();
      onOpenChange(isOpen); 
    }}>
      <DialogContent className="sm:max-w-[600px] bg-popover border-border max-h-[80vh] overflow-y-auto">
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
              <p className="text-sm text-muted-foreground mb-4">
                Upload a CSV file with your contacts
              </p>
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  <Upload className="w-4 h-4" />
                  Choose File
                </div>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported fields: Name (required), Email, Phone, Source, Status, Notes, Story, Pipeline Stage, Selling Intentions, Current Situation Notes, Pain Points, Pleasure Points
            </p>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Map your CSV columns to contact fields. Found {csvData.length} rows to import.
            </p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1 text-sm font-medium truncate" title={header}>
                    {header}
                  </div>
                  <Select
                    value={columnMapping[index] || "skip"}
                    onValueChange={(value) => handleMappingChange(index, value)}
                  >
                    <SelectTrigger className="w-[180px] bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            {/* Preview */}
            <div className="border border-border rounded-lg p-3 bg-secondary/30">
              <p className="text-xs font-medium mb-2">Preview (first 3 rows):</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      {Object.entries(columnMapping)
                        .filter(([_, field]) => field !== "skip")
                        .map(([colIndex, field]) => (
                          <th key={colIndex} className="px-2 py-1 text-left font-medium text-muted-foreground">
                            {field}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 3).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.entries(columnMapping)
                          .filter(([_, field]) => field !== "skip")
                          .map(([colIndex]) => (
                            <td key={colIndex} className="px-2 py-1 truncate max-w-[100px]">
                              {row[parseInt(colIndex)] || "-"}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={handleStartImport}>
                Import {csvData.length} Contacts
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 mt-4 text-center">
            <div className="py-8">
              <Progress value={importProgress} className="h-2 mb-4" />
              <p className="text-lg font-medium">
                Importing... {importedCount}/{csvData.length}
              </p>
              <p className="text-sm text-muted-foreground">
                Please wait while we import your contacts
              </p>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4 mt-4">
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-success" />
              </div>
              <p className="text-lg font-medium">Import Complete!</p>
              <p className="text-sm text-muted-foreground mt-2">
                {importedCount} contacts imported, {skippedCount} skipped
              </p>
            </div>

            {errors.length > 0 && (
              <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/10 max-h-[150px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Errors ({errors.length})</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {errors.slice(0, 10).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {errors.length > 10 && <li>...and {errors.length - 10} more</li>}
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
