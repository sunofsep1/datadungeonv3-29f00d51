import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { STARTER_NURTURE_SEQUENCES } from "@/lib/starterNurtureSequences";
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
  const { data: sequences = [], isLoading: seqLoading } = useNurtureSequencesList();
  const { data: completedEnrollments = [], isLoading: completedLoading } = useCompletedNurtureEnrollments(30);
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
  const [sequenceSearch, setSequenceSearch] = useState("");

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
    const existingNames = new Set(sequences.map((s) => s.name.trim()));
    let added = 0;
    for (const starter of STARTER_NURTURE_SEQUENCES) {
      if (existingNames.has(starter.name)) continue;
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
        existingNames.add(starter.name);
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

  const filteredSequences = sequences.filter((s) =>
    s.name.toLowerCase().includes(sequenceSearch.trim().toLowerCase())
  );

  return (
    <div className="animate-fade-in min-h-[60vh] max-w-7xl">
      <PageHeader
        title="Nurture"
        description="Compact pipeline and sequence control."
      />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-5 xl:gap-6">
        {/* Left: live pipeline */}
        <div className="min-w-0 flex-1 lg:min-w-0">
          <NurtureLiveEnrollments variant="page" />
        </div>

        {/* Middle: starter + new sequence */}
        <aside className="w-full min-w-0 shrink-0 space-y-6 lg:sticky lg:top-24 lg:w-[min(100%,24rem)] xl:w-[26rem]">
          <Card className="zoho-card border-border border-dashed bg-muted/20 p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <GitBranch className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">Starter sequences</h2>
                  <p className="text-sm text-muted-foreground mt-1">Import templates</p>
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
                Import starter sequences
              </Button>
            </div>
          </Card>

          <Card className="zoho-card border-border p-5 sm:p-6">
            <h2 className="font-semibold text-foreground mb-3">New sequence</h2>
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
        </aside>

        {/* Far right: your sequences list */}
        <aside className="w-full min-w-0 shrink-0 lg:sticky lg:top-24 lg:w-[min(100%,17.5rem)] xl:w-80">
          <Card className="zoho-card border-border p-5 sm:p-6 mb-4">
            <h2 className="font-semibold text-foreground mb-3">Your sequences</h2>
            <Input
              className="bg-input mb-3"
              placeholder="Filter sequences..."
              value={sequenceSearch}
              onChange={(e) => setSequenceSearch(e.target.value)}
            />
            {seqLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : filteredSequences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sequences yet.</p>
            ) : (
              <ul className="space-y-2">
                {filteredSequences.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2 sm:px-3 sm:py-2.5"
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
          </Card>
          <Card className="zoho-card border-border p-5 sm:p-6">
            <h2 className="font-semibold text-foreground mb-3">Completed</h2>
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
