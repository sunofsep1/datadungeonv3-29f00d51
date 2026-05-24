import { useState } from "react";
import { Bookmark, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateSavedView,
  useDeleteSavedView,
  useSavedViews,
} from "@/hooks/useSavedViews";
import {
  parseRequirementsSearchSavedPayload,
  requirementsSearchPayloadToJson,
  type RequirementsSearchSavedPayloadV1,
} from "@/lib/savedViewPayloads";

type Props = {
  buildPayload: () => RequirementsSearchSavedPayloadV1;
  applyPayload: (p: RequirementsSearchSavedPayloadV1) => void;
};

export function RequirementsSearchSavedMenu({ buildPayload, applyPayload }: Props) {
  const { toast } = useToast();
  const { data: views = [], isLoading } = useSavedViews("requirements_search");
  const createView = useCreateSavedView("requirements_search");
  const deleteView = useDeleteSavedView("requirements_search");
  const [saveOpen, setSaveOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const handleSave = async () => {
    try {
      await createView.mutateAsync({
        name: newName,
        filters: requirementsSearchPayloadToJson(buildPayload()),
      });
      toast({ title: "Search saved" });
      setSaveOpen(false);
      setNewName("");
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="h-3.5 w-3.5" />
            Saved searches
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Requirements searches</DropdownMenuLabel>
          {isLoading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : views.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">No saved searches yet</p>
          ) : (
            views.map((v) => (
              <DropdownMenuItem
                key={v.id}
                className="flex justify-between gap-2"
                onSelect={() => {
                  const p = parseRequirementsSearchSavedPayload(v.filters);
                  if (p) applyPayload(p);
                  else toast({ title: "Could not load search", variant: "destructive" });
                }}
              >
                <span className="truncate">{v.name}</span>
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteView.mutateAsync(v.id);
                  }}
                  aria-label={`Delete ${v.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Save current search
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save requirements search</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Name</Label>
            <Input
              className="mt-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Bulimba 3 bed buyers"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={!newName.trim() || createView.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
