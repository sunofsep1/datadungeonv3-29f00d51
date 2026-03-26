import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useNurtureSequencesList,
  useCompletedNurtureEnrollments,
  useCreateNurtureSequence,
  useUpdateNurtureSequence,
  useDeleteNurtureSequence,
  type NurtureSequenceStep,
} from "@/hooks/useNurtureSequences";
import { Plus, Trash2, Loader2, GitBranch, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  STARTER_NURTURE_SEQUENCES,
  isStarterNurtureSequenceName,
  starterNurtureSequenceSortIndex,
} from "@/lib/starterNurtureSequences";
import { errorMessageFromUnknown } from "@/lib/utils";
import { NurtureLiveEnrollments } from "@/components/nurture/NurtureLiveEnrollments";
import { format } from "date-fns";

type SequenceStepDraft = {
  offset_days: number;
  step_type: "task" | "email" | "prompt";
  title: string;
  body: string;
  email_subject: string;
  email_html: string;
};

const emptyStep = (): SequenceStepDraft => ({
  offset_days: 0,
  step_type: "task",
  title: "",
  body: "",
  email_subject: "",
  email_html: "",
});

/** Stable fallback — `data ?? []` would allocate a new array every render and break memo/effects. */
const EMPTY_NURTURE_SEQUENCES: never[] = [];

function selectionSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

function stepsToDraft(steps: NurtureSequenceStep[]): SequenceStepDraft[] {
  if (steps.length === 0) return [emptyStep()];
  return steps.map((s) => ({
    offset_days: s.offset_days,
    step_type: (s.step_type === "email" || s.step_type === "prompt" ? s.step_type : "task") as SequenceStepDraft["step_type"],
    title: s.title ?? "",
    body: s.body ?? "",
    email_subject: s.email_subject ?? "",
    email_html: s.email_html ?? "",
  }));
}

function draftStepsToPayload(steps: SequenceStepDraft[]) {
  return steps
    .filter((x) => x.title.trim())
    .map((x) => ({
      offset_days: Math.max(0, Number(x.offset_days) || 0),
      step_type: x.step_type,
      title: x.title.trim(),
      body: x.body.trim() || undefined,
      email_subject: x.step_type === "email" ? x.email_subject.trim() || undefined : undefined,
      email_html: x.step_type === "email" ? x.email_html.trim() || undefined : undefined,
    }));
}

function SequenceStepsFields({
  steps,
  setSteps,
}: {
  steps: SequenceStepDraft[];
  setSteps: Dispatch<SetStateAction<SequenceStepDraft[]>>;
}) {
  const update = (i: number, patch: Partial<SequenceStepDraft>) => {
    setSteps((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };
  const remove = (i: number) => setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));

  return (
    <div className="space-y-3">
      <Label>Steps (days from enrollment)</Label>
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col gap-2 border border-border rounded-lg p-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                type="number"
                min={0}
                className="bg-input w-24"
                value={step.offset_days}
                onChange={(e) => update(i, { offset_days: parseInt(e.target.value, 10) || 0 })}
              />
              <span className="text-xs text-muted-foreground">days after start</span>
              <select
                className="bg-input border border-border rounded-md text-sm px-2 py-1.5"
                value={step.step_type}
                onChange={(e) => update(i, { step_type: e.target.value as SequenceStepDraft["step_type"] })}
              >
                <option value="task">Task</option>
                <option value="prompt">Prompt</option>
                <option value="email">Email</option>
              </select>
            </div>
            {steps.length > 1 && (
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => remove(i)}>
                Remove step
              </Button>
            )}
          </div>
          <Input className="bg-input" placeholder="Title" value={step.title} onChange={(e) => update(i, { title: e.target.value })} />
          <Textarea
            className="bg-input text-sm min-h-[50px]"
            placeholder="Body / task notes"
            value={step.body}
            onChange={(e) => update(i, { body: e.target.value })}
          />
          {step.step_type === "email" && (
            <>
              <Input
                className="bg-input"
                placeholder="Email subject"
                value={step.email_subject}
                onChange={(e) => update(i, { email_subject: e.target.value })}
              />
              <Textarea
                className="bg-input text-sm min-h-[80px]"
                placeholder="HTML body"
                value={step.email_html}
                onChange={(e) => update(i, { email_html: e.target.value })}
              />
            </>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setSteps((s) => [...s, { ...emptyStep(), offset_days: 3 }])}
        className="gap-1"
      >
        <Plus className="w-4 h-4" /> Add step
      </Button>
    </div>
  );
}

export default function Nurture() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: sequencesData, isLoading: seqLoading } = useNurtureSequencesList();
  const { data: completedEnrollments = [], isLoading: completedLoading } = useCompletedNurtureEnrollments(30);
  const sequences = sequencesData ?? EMPTY_NURTURE_SEQUENCES;
  const createSeq = useCreateNurtureSequence();
  const updateSeq = useUpdateNurtureSequence();
  const deleteSeq = useDeleteNurtureSequence();

  const [seqName, setSeqName] = useState("");
  const [seqDesc, setSeqDesc] = useState("");
  const [seqSteps, setSeqSteps] = useState<SequenceStepDraft[]>([emptyStep()]);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSteps, setEditSteps] = useState<SequenceStepDraft[]>([emptyStep()]);

  const [selectedCustomIds, setSelectedCustomIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { starterSequences, customSequences } = useMemo(() => {
    const starters: typeof sequences = [];
    const custom: typeof sequences = [];
    for (const s of sequences) {
      if (isStarterNurtureSequenceName(s.name)) starters.push(s);
      else custom.push(s);
    }
    starters.sort((a, b) => starterNurtureSequenceSortIndex(a.name) - starterNurtureSequenceSortIndex(b.name));
    return { starterSequences: starters, customSequences: custom };
  }, [sequences]);

  useEffect(() => {
    const allowed = new Set(customSequences.map((s) => s.id));
    setSelectedCustomIds((prev) => {
      const next = new Set([...prev].filter((id) => allowed.has(id)));
      return selectionSetsEqual(prev, next) ? prev : next;
    });
  }, [customSequences]);

  const allCustomSelected = customSequences.length > 0 && selectedCustomIds.size === customSequences.length;

  const openEdit = useCallback((seq: (typeof sequences)[number]) => {
    setEditingId(seq.id);
    setEditName(seq.name);
    setEditDesc(seq.description ?? "");
    setEditActive(seq.is_active);
    setEditSteps(stepsToDraft(seq.steps ?? []));
    setEditOpen(true);
  }, []);

  const editParam = searchParams.get("edit");
  useEffect(() => {
    if (!editParam || seqLoading) return;
    const seq = sequences.find((s) => s.id === editParam);
    if (seq) {
      openEdit(seq);
      setSearchParams({}, { replace: true });
    }
  }, [editParam, seqLoading, sequences, openEdit, setSearchParams]);

  const handleImportStarterSequences = async () => {
    const norm = (n: string) => n.trim().toLowerCase().replace(/\s+/g, " ");
    const existingNames = new Set(sequences.map((s) => norm(s.name)));
    let added = 0;
    for (const starter of STARTER_NURTURE_SEQUENCES) {
      if (existingNames.has(norm(starter.name))) continue;
      try {
        await createSeq.mutateAsync({
          name: starter.name,
          description: starter.description,
          steps: starter.steps.map((s) => ({
            offset_days: s.offset_days,
            step_type: s.step_type,
            title: s.title,
            body: s.body,
            email_subject: s.email_subject,
            email_html: s.email_html,
          })),
        });
        added++;
        existingNames.add(norm(starter.name));
      } catch (e) {
        toast.error(errorMessageFromUnknown(e));
        return;
      }
    }
    if (added === 0) {
      toast.message("Starter sequences already in your list", {
        description: "Delete a copy first if you want to re-import with the same names.",
      });
    } else {
      toast.success(`Added ${added} starter sequence${added === 1 ? "" : "s"}`);
    }
  };

  const handleCreateSequence = () => {
    const name = seqName.trim();
    if (!name) {
      toast.error("Enter a sequence name");
      return;
    }
    const steps = draftStepsToPayload(seqSteps);
    if (steps.length === 0) {
      toast.error("Add at least one step with a title");
      return;
    }
    createSeq.mutate(
      { name, description: seqDesc.trim() || undefined, steps },
      {
        onSuccess: () => {
          toast.success("Sequence created");
          setSeqName("");
          setSeqDesc("");
          setSeqSteps([emptyStep()]);
        },
        onError: (e) => toast.error(errorMessageFromUnknown(e)),
      }
    );
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) {
      toast.error("Enter a sequence name");
      return;
    }
    const steps = draftStepsToPayload(editSteps);
    if (steps.length === 0) {
      toast.error("Add at least one step with a title");
      return;
    }
    updateSeq.mutate(
      { id: editingId, name, description: editDesc.trim() || null, is_active: editActive, steps },
      {
        onSuccess: () => {
          toast.success("Sequence updated");
          setEditOpen(false);
          setEditingId(null);
        },
        onError: (e) => toast.error(errorMessageFromUnknown(e)),
      }
    );
  };

  const toggleCustomSelected = (id: string, checked: boolean) => {
    setSelectedCustomIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkDeleteCustom = async () => {
    const ids = [...selectedCustomIds];
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      for (const id of ids) {
        await deleteSeq.mutateAsync(id);
      }
      toast.success(`Deleted ${ids.length} sequence${ids.length === 1 ? "" : "s"}`);
      setSelectedCustomIds(new Set());
      setBulkDeleteOpen(false);
    } catch (e) {
      toast.error(errorMessageFromUnknown(e));
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in min-h-[60vh] max-w-[1600px]">
      <PageHeader title="Nurture" />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-5 xl:gap-6">
        <div className="min-w-0 flex-1 lg:min-w-0">
          <NurtureLiveEnrollments variant="page" />
        </div>

        <aside className="w-full min-w-0 shrink-0 space-y-6 lg:sticky lg:top-24 lg:w-[min(100%,26rem)] xl:w-[28rem]">
          <Card className="zoho-card border-border border-dashed bg-muted/20 p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <GitBranch className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">Starter sequences</h2>
                  <p className="text-sm text-muted-foreground mt-1">{STARTER_NURTURE_SEQUENCES.length} templates</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto shrink-0 self-start"
                onClick={() => void handleImportStarterSequences()}
                disabled={createSeq.isPending || seqLoading}
              >
                {createSeq.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Import missing starter sequences
              </Button>
              {seqLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : starterSequences.length === 0 ? (
                <p className="text-sm text-muted-foreground">None imported.</p>
              ) : (
                <ul className="space-y-2 max-h-[min(40vh,320px)] overflow-y-auto pr-1">
                  {starterSequences.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-2 sm:px-3 sm:py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate text-sm">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.steps?.length ?? 0} steps · {s.is_active ? "Active" : "Inactive"}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Edit sequence"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Delete sequence"
                          onClick={() =>
                            deleteSeq.mutate(s.id, {
                              onSuccess: () => toast.success("Deleted"),
                              onError: (e) => toast.error(errorMessageFromUnknown(e)),
                            })
                          }
                          disabled={deleteSeq.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card className="zoho-card border-border p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground">Your sequences</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Custom packs and anything that isn’t a starter catalog name. Remove old experiments with the checkboxes below.
                </p>
              </div>
              {customSequences.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 text-xs"
                  onClick={() => {
                    if (allCustomSelected) setSelectedCustomIds(new Set());
                    else setSelectedCustomIds(new Set(customSequences.map((s) => s.id)));
                  }}
                >
                  {allCustomSelected ? "Clear selection" : "Select all"}
                </Button>
              ) : null}
            </div>
            {seqLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : customSequences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom sequence yet — add one below or rename a starter to “move” it here.</p>
            ) : (
              <>
                <ul className="space-y-2 max-h-[min(45vh,380px)] overflow-y-auto pr-1">
                  {customSequences.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-2 py-2 sm:px-2.5 sm:py-2.5"
                    >
                      <Checkbox
                        checked={selectedCustomIds.has(s.id)}
                        onCheckedChange={(c) => toggleCustomSelected(s.id, c === true)}
                        className="shrink-0"
                        aria-label={`Select ${s.name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate text-sm">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.steps?.length ?? 0} steps · {s.is_active ? "Active" : "Inactive"}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Edit sequence"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Delete sequence"
                          onClick={() =>
                            deleteSeq.mutate(s.id, {
                              onSuccess: () => toast.success("Deleted"),
                              onError: (e) => toast.error(errorMessageFromUnknown(e)),
                            })
                          }
                          disabled={deleteSeq.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                {selectedCustomIds.size > 0 ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-3 w-full sm:w-auto"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    Delete selected ({selectedCustomIds.size})
                  </Button>
                ) : null}
              </>
            )}
          </Card>

          <Card className="zoho-card border-border p-5 sm:p-6">
            <h2 className="font-semibold text-foreground mb-1">New sequence</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Adds to <span className="text-foreground/90">Your sequences</span> unless you use a starter catalog name. Steps run from the enrollment
              date; tasks and prompts create contact tasks; emails send when the runner runs (contact needs email).
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input className="bg-input" value={seqName} onChange={(e) => setSeqName(e.target.value)} placeholder="e.g. Long-term nurture" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea className="bg-input min-h-[60px]" value={seqDesc} onChange={(e) => setSeqDesc(e.target.value)} />
              </div>
              <SequenceStepsFields steps={seqSteps} setSteps={setSeqSteps} />
              <Button onClick={handleCreateSequence} disabled={createSeq.isPending} className="w-full sm:w-auto">
                {createSeq.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save sequence
              </Button>
            </div>
          </Card>

          <Card className="zoho-card border-border p-5 sm:p-6">
            <h2 className="font-semibold text-foreground mb-3">Completed enrollments</h2>
            <p className="text-xs text-muted-foreground mb-3">Last 30 days (finished nurture runs).</p>
            {completedLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : completedEnrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed enrollments.</p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-auto">
                {completedEnrollments.map((row) => (
                  <li key={row.id} className="rounded-md border border-border px-2.5 py-2">
                    <p className="text-sm font-medium truncate">{row.contact_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.sequence_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.completed_at ? format(new Date(row.completed_at), "d MMM yyyy, h:mm a") : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCustomIds.size} sequence{selectedCustomIds.size === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the templates and any active enrollments on those sequences (contacts will no longer advance those nurtures). This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={bulkDeleting}
              onClick={() => void handleBulkDeleteCustom()}
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingId(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
          <SheetHeader>
            <SheetTitle>Edit sequence</SheetTitle>
            <SheetDescription>
              Changes apply to the template. Contacts already enrolled keep their progress index; if you remove or reorder steps, double-check active
              enrollments on the contact.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4 pb-8">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input className="bg-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea className="bg-input min-h-[60px]" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Inactive sequences cannot be selected when enrolling a contact.</p>
              </div>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>
            <SequenceStepsFields steps={editSteps} setSteps={setEditSteps} />
            <Button onClick={handleSaveEdit} disabled={updateSeq.isPending} className="w-full sm:w-auto">
              {updateSeq.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
