import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Pencil, Trash2, Search, Library, Copy, ChevronDown, Sparkles, Pin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
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

type ScriptSeed = {
  title: string;
  category: ScriptCategory;
  situation_trigger: string;
  content: string;
};

const ADVANCED_SCRIPT_SUITE: ScriptSeed[] = [
  {
    title: "Seller Discovery Ladder (advanced)",
    category: "listing_presentation",
    situation_trigger: "Use before pricing discussion to uncover motive, urgency, and friction.",
    content:
      "Start broad, then narrow: 1) 'What has you considering a move now?' 2) 'Why now instead of later?' 3) 'What happens if this drifts 6-12 months?' 4) 'Who else is impacted by this timeline?' 5) 'What would an ideal result look like for you?' End with: 'Would it help if I mapped a plan around those priorities?'",
  },
  {
    title: "Commission defence via cost-of-delay",
    category: "commission_defence",
    situation_trigger: "Prospect pushes for fee discount or compares low-fee agents.",
    content:
      "Acknowledge first: 'Fair question.' Then reframe: 'Can I ask, if we save 1% in fee but lose momentum and final price, would that still feel like a win?' Follow with evidence prompts: 'What matters most: lowest fee or highest net outcome with least stress?' 'How would you measure success after settlement?'",
  },
  {
    title: "Price expectation reset framework",
    category: "price_reduction",
    situation_trigger: "Owner anchored to a high online estimate.",
    content:
      "Use a three-step reset: 1) Validate hope: 'I can see why that number is attractive.' 2) Diagnose: 'What are you basing it on most?' 3) Bridge with market proof: 'Would it be useful to compare buyer behavior from the last 30 days, not just advertised prices?' Close with collaborative question: 'If the data shows a different number, how would you want to position for strongest competition?'",
  },
  {
    title: "Reactivation call for stale opportunities",
    category: "follow_up",
    situation_trigger: "Prospect went quiet after appraisal/proposal.",
    content:
      "Pattern interrupt opener: 'Quick one — should I close your file, or is this still a priority?' If still active: 'What changed since we last spoke?' 'What is the main blocker right now?' 'What would need to happen for this to move forward this month?' End with one small next step and a date.",
  },
];

const NEPQ_QUESTIONING_SUITE: ScriptSeed[] = [
  {
    title: "NEPQ: connection + situation opener",
    category: "cold_call",
    situation_trigger: "Early conversation when trust is low and context is unclear.",
    content:
      "Use neutral, low-pressure opens: 'I was curious, what was it that caught your attention?' 'What are you doing now for this?' 'How long have you been handling it that way?' 'What do you like and not like about the current approach?' Keep this stage diagnostic, not pitch-heavy.",
  },
  {
    title: "NEPQ: problem awareness sequence",
    category: "objection_handling",
    situation_trigger: "Need to surface impact and emotional cost behind a vague problem.",
    content:
      "Probe deeper: 'How long has this been going on?' 'What do you think is causing it?' 'Has that had an impact on you or your team? In what way?' 'Which part is most frustrating?' 'If you could change one piece, what would it be, and why that one?'",
  },
  {
    title: "NEPQ: consequence + qualifying",
    category: "follow_up",
    situation_trigger: "Prospect says 'we'll wait' or delays decision repeatedly.",
    content:
      "Escalate urgency with care: 'What if nothing changes over the next 6-12 months?' 'What does that cost in time, stress, or revenue?' 'How important is it for you to change this now?' 'Why now?' 'If this were solved, what would that do for you personally?'",
  },
  {
    title: "NEPQ: transition and commitment close",
    category: "appraisal_booking",
    situation_trigger: "After pain and desired outcomes are clear, before next-step ask.",
    content:
      "Transition language: 'Based on what you've said — especially around [problem] and [impact] — a structured plan may fit.' Check alignment: 'Does that feel like what you're looking for?' Then commit: 'Would it be appropriate to map the next step now, or how would you like to proceed?'",
  },
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
  const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);
  const [activeScript, setActiveScript] = useState<ScriptRecord | null>(null);
  const [activeView, setActiveView] = useState<"all" | "favorites" | "recent">("all");
  const [favoriteScriptIds, setFavoriteScriptIds] = useState<string[]>([]);
  const [recentScriptIds, setRecentScriptIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const favoritesRaw = localStorage.getItem("scripts:favorites");
      const recentRaw = localStorage.getItem("scripts:recent");
      if (favoritesRaw) setFavoriteScriptIds(JSON.parse(favoritesRaw));
      if (recentRaw) setRecentScriptIds(JSON.parse(recentRaw));
    } catch {
      // Keep defaults when localStorage values are malformed.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("scripts:favorites", JSON.stringify(favoriteScriptIds));
  }, [favoriteScriptIds]);

  useEffect(() => {
    localStorage.setItem("scripts:recent", JSON.stringify(recentScriptIds));
  }, [recentScriptIds]);

  const clientFilteredScripts = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return scripts;
    return scripts.filter((script) => {
      const haystack = `${script.title} ${script.content} ${script.situation_trigger ?? ""} ${script.category ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [scripts, debouncedSearch]);

  const baseScripts = serverSearchActive ? serverSearchHits : clientFilteredScripts;
  const displayScripts = useMemo(() => {
    if (activeView === "favorites") {
      const favoritesSet = new Set(favoriteScriptIds);
      return baseScripts.filter((script) => favoritesSet.has(script.id));
    }
    if (activeView === "recent") {
      const byId = new Map(baseScripts.map((script) => [script.id, script]));
      return recentScriptIds.map((id) => byId.get(id)).filter((script): script is ScriptRecord => Boolean(script));
    }
    return baseScripts;
  }, [activeView, baseScripts, favoriteScriptIds, recentScriptIds]);

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

  const importSuite = async (suiteName: string, suite: ScriptSeed[]) => {
    const existingTitles = new Set(scripts.map((s) => s.title.trim().toLowerCase()));
    const toCreate = suite.filter((s) => !existingTitles.has(s.title.trim().toLowerCase()));
    if (toCreate.length === 0) {
      toast({
        title: "Nothing to add",
        description: `All ${suiteName} titles already exist.`,
      });
      return;
    }
    try {
      await Promise.all(
        toCreate.map((script) =>
          createScript.mutateAsync({
            title: script.title,
            category: script.category,
            situation_trigger: script.situation_trigger,
            content: script.content,
          })
        )
      );
      toast({
        title: `${suiteName} added`,
        description: `Imported ${toCreate.length} script(s).`,
      });
    } catch {
      toast({
        title: "Import failed",
        description: "Some scripts could not be imported. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyScript = async (script: ScriptRecord) => {
    try {
      await navigator.clipboard.writeText(script.content ?? "");
      toast({ title: "Copied", description: `${script.title} copied to clipboard.` });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard access was denied.", variant: "destructive" });
    }
  };

  const toggleFavorite = (scriptId: string) => {
    setFavoriteScriptIds((prev) =>
      prev.includes(scriptId) ? prev.filter((id) => id !== scriptId) : [scriptId, ...prev]
    );
  };

  const markRecent = (scriptId: string) => {
    setRecentScriptIds((prev) => [scriptId, ...prev.filter((id) => id !== scriptId)].slice(0, 12));
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
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={createScript.isPending}
              onClick={() => void importSuite("Advanced seller suite", ADVANCED_SCRIPT_SUITE)}
            >
              <Sparkles className="w-4 h-4" />
              Add advanced suite
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={createScript.isPending}
              onClick={() => void importSuite("NEPQ questioning suite", NEPQ_QUESTIONING_SUITE)}
            >
              <Library className="w-4 h-4" />
              Add NEPQ suite
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

      <div className="relative max-w-lg mb-5">
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={activeView === "all" ? "default" : "outline"} onClick={() => setActiveView("all")}>
          All ({baseScripts.length})
        </Button>
        <Button
          size="sm"
          variant={activeView === "favorites" ? "default" : "outline"}
          onClick={() => setActiveView("favorites")}
        >
          Favorites ({baseScripts.filter((s) => favoriteScriptIds.includes(s.id)).length})
        </Button>
        <Button
          size="sm"
          variant={activeView === "recent" ? "default" : "outline"}
          onClick={() => setActiveView("recent")}
        >
          Recent ({Math.min(recentScriptIds.length, baseScripts.length)})
        </Button>
      </div>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {displayScripts.map((script) => (
          <Card
            key={script.id}
            className="zoho-card p-5 border-border/70 bg-card/95 shadow-sm cursor-pointer transition-colors hover:border-primary/50"
            role="button"
            tabIndex={0}
            onClick={() => {
              markRecent(script.id);
              setActiveScript(script);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                markRecent(script.id);
                setActiveScript(script);
              }
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <h3 className="text-base font-semibold leading-snug text-foreground">{script.title}</h3>
                  <p className="text-sm text-foreground/70">{categoryLabel(script.category)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={favoriteScriptIds.includes(script.id) ? "Unpin favorite" : "Pin favorite"}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFavorite(script.id);
                  }}
                >
                  <Pin className={`w-4 h-4 ${favoriteScriptIds.includes(script.id) ? "text-primary" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(event) => {
                    event.stopPropagation();
                    void copyScript(script);
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEdit(script);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(script.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {script.situation_trigger ? (
              <p className="mb-3 rounded-md bg-muted/40 px-2.5 py-2 text-sm leading-relaxed text-foreground/80">
                Trigger: {script.situation_trigger}
              </p>
            ) : null}
            <div className="rounded-md border border-border/80 bg-background/60">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-foreground/85 hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  setExpandedScriptId((prev) => (prev === script.id ? null : script.id));
                }}
              >
                <span>{expandedScriptId === script.id ? "Collapse script" : "Expand script"}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${expandedScriptId === script.id ? "rotate-180" : ""}`}
                />
              </button>
              {expandedScriptId === script.id ? (
                <ScrollArea className="h-56 border-t border-border/70 px-3 py-3">
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{script.content || "No content yet..."}</p>
                </ScrollArea>
              ) : (
                <p className="px-3 pb-3 text-[15px] leading-6 text-foreground/85 line-clamp-5">
                  {script.content || "No content yet..."}
                </p>
              )}
            </div>
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

      <Dialog open={Boolean(activeScript)} onOpenChange={(open) => !open && setActiveScript(null)}>
        <DialogContent className="w-[96vw] max-w-5xl h-[88vh] bg-[#1f2b36] border-border/80 flex flex-col p-0">
          {activeScript ? (
            <>
              <DialogHeader className="border-b border-border/70 px-6 py-4">
                <DialogTitle className="text-xl text-foreground">{activeScript.title}</DialogTitle>
                <p className="text-sm text-foreground/70">{categoryLabel(activeScript.category)}</p>
                {activeScript.situation_trigger ? (
                  <p className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-sm text-foreground/85">
                    Trigger: {activeScript.situation_trigger}
                  </p>
                ) : null}
              </DialogHeader>
              <ScrollArea className="flex-1 px-6 py-5">
                <p className="whitespace-pre-wrap text-base leading-8 text-foreground">
                  {activeScript.content || "No content yet..."}
                </p>
              </ScrollArea>
              <div className="border-t border-border/70 px-6 py-3 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => void copyScript(activeScript)} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy script
                </Button>
                <Button onClick={() => setActiveScript(null)}>Close</Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
