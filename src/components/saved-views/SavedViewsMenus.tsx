import { useState, useEffect } from "react";
import { Bookmark, Loader2, Plus, Trash2, Star, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  useSavedViews,
  useCreateSavedView,
  useDeleteSavedView,
  useUpdateSavedViewName,
  useSetDefaultSavedView,
  type SavedViewObjectType,
  type SavedViewRow,
} from "@/hooks/useSavedViews";
import {
  parseContactsSavedViewPayload,
  parseTasksSavedViewPayload,
  contactsPayloadToJson,
  tasksPayloadToJson,
  type ContactsSavedViewPayloadV1,
  type TasksSavedViewPayloadV1,
} from "@/lib/savedViewPayloads";
import {
  getContactsOpenDefaultSavedView,
  getTasksOpenDefaultSavedView,
  setContactsOpenDefaultSavedView,
  setTasksOpenDefaultSavedView,
} from "@/lib/savedViewsClientPrefs";

type ContactsProps = {
  objectType: "contacts";
  buildPayload: () => ContactsSavedViewPayloadV1;
  applyPayload: (p: ContactsSavedViewPayloadV1) => void;
};

type TasksProps = {
  objectType: "tasks";
  buildPayload: () => TasksSavedViewPayloadV1;
  applyPayload: (p: TasksSavedViewPayloadV1) => void;
};

type Props = ContactsProps | TasksProps;

export function SavedViewsMenu(props: Props) {
  const { toast } = useToast();
  const ot: SavedViewObjectType = props.objectType;
  const { data: views = [], isLoading } = useSavedViews(ot);
  const createView = useCreateSavedView(ot);
  const deleteView = useDeleteSavedView(ot);
  const updateName = useUpdateSavedViewName(ot);
  const setDefaultView = useSetDefaultSavedView(ot);
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameTarget, setRenameTarget] = useState<SavedViewRow | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [openDefaultOnVisit, setOpenDefaultOnVisit] = useState(false);

  useEffect(() => {
    if (!manageOpen) return;
    setOpenDefaultOnVisit(ot === "contacts" ? getContactsOpenDefaultSavedView() : getTasksOpenDefaultSavedView());
  }, [manageOpen, ot]);

  const persistOpenDefaultOnVisit = (checked: boolean) => {
    if (ot === "contacts") setContactsOpenDefaultSavedView(checked);
    else setTasksOpenDefaultSavedView(checked);
    setOpenDefaultOnVisit(checked);
  };

  const handleSave = () => {
    const name = newName.trim();
    if (!name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const payload = props.buildPayload();
    const json =
      ot === "contacts"
        ? contactsPayloadToJson(payload as ContactsSavedViewPayloadV1)
        : tasksPayloadToJson(payload as TasksSavedViewPayloadV1);
    createView.mutate(
      { name, filters: json },
      {
        onSuccess: () => {
          toast({ title: "Saved", description: `View “${name}” saved.` });
          setSaveOpen(false);
          setNewName("");
        },
        onError: (e) => {
          toast({
            title: "Could not save",
            description:
              e instanceof Error
                ? e.message
                : "Run pending migrations (saved_views) or check RLS.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleApply = (raw: unknown) => {
    if (props.objectType === "contacts") {
      const p = parseContactsSavedViewPayload(raw);
      if (!p) {
        toast({ title: "Invalid view", description: "This saved view could not be read.", variant: "destructive" });
        return;
      }
      props.applyPayload(p);
      toast({ title: "View applied" });
      return;
    }
    const p = parseTasksSavedViewPayload(raw);
    if (!p) {
      toast({ title: "Invalid view", description: "This saved view could not be read.", variant: "destructive" });
      return;
    }
    props.applyPayload(p);
    toast({ title: "View applied" });
  };

  const openRename = (v: SavedViewRow) => {
    setRenameTarget(v);
    setRenameInput(v.name);
  };

  const submitRename = () => {
    if (!renameTarget) return;
    const name = renameInput.trim();
    if (!name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    updateName.mutate(
      { id: renameTarget.id, name },
      {
        onSuccess: () => {
          toast({ title: "Renamed" });
          setRenameTarget(null);
        },
        onError: (err) =>
          toast({
            title: "Rename failed",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );
  };

  const toggleStar = (v: SavedViewRow) => {
    const isDef = Boolean(v.is_default);
    setDefaultView.mutate(isDef ? null : v.id, {
      onSuccess: () =>
        toast({
          title: isDef ? "Default cleared" : "Default set",
          description: isDef ? undefined : `“${v.name}” is now your default view.`,
        }),
      onError: (err) =>
        toast({
          title: "Could not update default",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        }),
    });
  };

  /** Open dialog after dropdown closes — avoids Radix menu + dialog focus/pointer races. */
  const openSaveDialogAfterMenu = () => {
    window.setTimeout(() => setSaveOpen(true), 0);
  };
  const openManageDialogAfterMenu = () => {
    window.setTimeout(() => setManageOpen(true), 0);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="h-4 w-4" />
            Saved views
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {ot === "contacts" ? "Contacts filters" : "Tasks layout"}
          </DropdownMenuLabel>
          <DropdownMenuItem className="gap-2" onSelect={openSaveDialogAfterMenu}>
            <Plus className="h-4 w-4" />
            Save current…
          </DropdownMenuItem>
          {views.length > 0 && (
            <DropdownMenuItem onSelect={openManageDialogAfterMenu}>Manage…</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {isLoading ? (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          ) : views.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No saved views yet. Save one to reuse this layout later.
            </div>
          ) : (
            views.map((v) => (
              <DropdownMenuItem key={v.id} onSelect={() => handleApply(v.filters)} className="gap-2">
                {v.is_default ? (
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" aria-hidden />
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                <span className="truncate">{v.name}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen} modal>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="saved-view-name">Name</Label>
            <Input
              id="saved-view-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Hot + Thornlands"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createView.isPending}>
              {createView.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen} modal>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage saved views</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="flex items-start gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2">
              <Checkbox
                id="saved-view-open-default"
                checked={openDefaultOnVisit}
                onCheckedChange={(c) => persistOpenDefaultOnVisit(c === true)}
              />
              <label htmlFor="saved-view-open-default" className="text-xs leading-snug text-muted-foreground cursor-pointer">
                {ot === "contacts"
                  ? "When I open Contacts, apply my starred default view (skipped if the URL sets ?smart=…)."
                  : "When I open Tasks, apply my starred default view."}
              </label>
            </div>
            <ul className="max-h-56 overflow-y-auto divide-y divide-border text-sm">
              {views.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="truncate min-w-0 font-medium">{v.name}</span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${v.is_default ? "text-amber-500" : "text-muted-foreground"}`}
                      disabled={setDefaultView.isPending}
                      onClick={() => toggleStar(v)}
                      aria-label={v.is_default ? "Clear as default" : "Set as default"}
                      title={v.is_default ? "Clear default" : "Set as default"}
                    >
                      <Star className={`h-4 w-4 ${v.is_default ? "fill-current" : ""}`} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => openRename(v)}
                      aria-label={`Rename ${v.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={deleteView.isPending}
                      onClick={() =>
                        deleteView.mutate(v.id, {
                          onSuccess: () => toast({ title: "Removed", description: v.name }),
                          onError: (err) =>
                            toast({
                              title: "Delete failed",
                              description: err instanceof Error ? err.message : "Try again.",
                              variant: "destructive",
                            }),
                        })
                      }
                      aria-label={`Delete ${v.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)} modal>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename view</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="saved-view-rename">Name</Label>
            <Input
              id="saved-view-rename"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitRename} disabled={updateName.isPending}>
              {updateName.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
