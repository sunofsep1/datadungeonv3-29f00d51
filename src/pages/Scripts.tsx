import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Pencil, Trash2, Search, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateScript,
  useDeleteScript,
  useScriptSearch,
  useScripts,
  useSeedScriptsFromLibrary,
  useUpdateScript,
  type ScriptCategory,
  type ScriptRecord,
} from "@/hooks/useScripts";

const SCRIPT_CATEGORIES: Array<{ value: ScriptCategory; label: string }> = [
  { value: "listing_presentation", label: "Listing presentation" },
  { value: "objection_handling", label: "Objection handling" },
  { value: "follow_up", label: "Follow up" },
  { value: "cold_call", label: "Cold call" },
  { value: "price_reduction", label: "Price reduction" },
  { value: "commission_defence", label: "Commission defence" },
  { value: "appraisal_booking", label: "Appraisal booking" },
  { value: "annual_review", label: "Annual review" },
  { value: "text_template", label: "Text template" },
  { value: "other", label: "Other" },
];

function categoryLabel(category: string | null): string {
  const match = SCRIPT_CATEGORIES.find((item) => item.value === category);
  return match?.label ?? "Other";
}

export default function Scripts() {
  const { data: scripts = [] } = useScripts();
  const seedLibrary = useSeedScriptsFromLibrary();
  const createScript = useCreateScript();
  const updateScript = useUpdateScript();
  const deleteScript = useDeleteScript();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const serverSearchActive = debouncedSearch.trim().length >= 2;
  const { data: serverSearchHits = [], isFetching: serverSearchLoading } = useScriptSearch(
    debouncedSearch,
    serverSearchActive
  );
  const [newScript, setNewScript] = useState({
    title: "",
    category: "follow_up" as ScriptCategory,
    situation_trigger: "",
    content: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const clientFilteredScripts = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return scripts;
    return scripts.filter((script) => {
      const haystack = `${script.title} ${script.content} ${script.situation_trigger ?? ""} ${script.category ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [scripts, debouncedSearch]);

  const displayScripts = serverSearchActive ? serverSearchHits : clientFilteredScripts;

  const resetForm = () => {
    setNewScript({
      title: "",
      category: "follow_up",
      situation_trigger: "",
      content: "",
    });
    setEditingId(null);
  };

  const handleSaveScript = async () => {
    if (!newScript.title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }
    if (!newScript.content.trim()) {
      toast({ title: "Error", description: "Please enter script content", variant: "destructive" });
      return;
    }

    try {
      if (editingId) {
        await updateScript.mutateAsync({
          id: editingId,
          title: newScript.title.trim(),
          category: newScript.category,
          situation_trigger: newScript.situation_trigger.trim() || null,
          content: newScript.content.trim(),
        });
        toast({ title: "Success", description: "Script updated!" });
      } else {
        await createScript.mutateAsync({
          title: newScript.title.trim(),
          category: newScript.category,
          situation_trigger: newScript.situation_trigger.trim() || null,
          content: newScript.content.trim(),
        });
        toast({ title: "Success", description: "Script created!" });
      }
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save script. Please check database migrations and try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (script: ScriptRecord) => {
    setNewScript({
      title: script.title,
      category: (script.category as ScriptCategory) ?? "follow_up",
      situation_trigger: script.situation_trigger ?? "",
      content: script.content,
    });
    setEditingId(script.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScript.mutateAsync(id);
      toast({ title: "Deleted", description: "Script removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete script", variant: "destructive" });
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Scripts & Dialogues"
        description="Manage your call scripts and conversation templates"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={seedLibrary.isPending}
              onClick={() =>
                seedLibrary.mutate(undefined, {
                  onSuccess: (n) =>
                    toast({
                      title: n > 0 ? "Starter scripts added" : "Nothing to add",
                      description:
                        n > 0
                          ? `Imported ${n} script(s) from the library (skips titles you already have).`
                          : "Every library title is already in your scripts.",
                    }),
                  onError: () =>
                    toast({
                      title: "Could not import",
                      description: "Apply migration 20260404210000 and try again.",
                      variant: "destructive",
                    }),
                })
              }
            >
              <Library className="w-4 h-4" />
              {seedLibrary.isPending ? "Importing…" : "Add starter scripts"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Script
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-[#242424] border-white/10">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Script" : "Create New Script"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Script Title *</Label>
                  <Input
                    placeholder="e.g., Cold Call Introduction"
                    className="bg-input"
                    value={newScript.title}
                    onChange={(e) => setNewScript({ ...newScript, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={newScript.category}
                    onValueChange={(value) =>
                      setNewScript({ ...newScript, category: value as ScriptCategory })
                    }
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCRIPT_CATEGORIES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Situation trigger</Label>
                  <Input
                    placeholder="e.g., Prospect asks about commission"
                    className="bg-input"
                    value={newScript.situation_trigger}
                    onChange={(e) =>
                      setNewScript({ ...newScript, situation_trigger: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Script Content *</Label>
                  <Textarea
                    placeholder="Write your script here..."
                    className="bg-input min-h-[200px]"
                    value={newScript.content}
                    onChange={(e) => setNewScript({ ...newScript, content: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveScript}>{editingId ? "Update" : "Create"} Script</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search (2+ chars uses full-text index)..."
          className="bg-input pl-9"
        />
      </div>
      {serverSearchLoading ? (
        <p className="text-xs text-muted-foreground mb-2">Searching…</p>
      ) : null}

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayScripts.map((script) => (
          <Card key={script.id} className="zoho-card p-4 border-white/10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">{script.title}</h3>
                  <p className="text-xs text-muted-foreground">{categoryLabel(script.category)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(script)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(script.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {script.situation_trigger ? (
              <p className="text-xs text-muted-foreground mb-2">
                Trigger: {script.situation_trigger}
              </p>
            ) : null}
            <p className="text-sm text-white/60 line-clamp-4">
              {script.content || "No content yet..."}
            </p>
          </Card>
        ))}
      </div>

      {!serverSearchLoading && displayScripts.length === 0 && (
        <div className="text-center py-12 text-white/60">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>
            {scripts.length === 0
              ? "No scripts yet. Create your first call script!"
              : serverSearchActive
                ? "No scripts match that search."
                : "No scripts match your filter."}
          </p>
        </div>
      )}
    </div>
  );
}
