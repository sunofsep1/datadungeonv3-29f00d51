import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ACTIVITY_SCHEDULE_STEP_TYPES,
  stepTypeLabel,
  type ActivityScheduleAppliesTo,
  type ActivityScheduleStepType,
} from "@/lib/activitySchedule";
import {
  useActivityScheduleTemplates,
  useActivityScheduleTemplateSteps,
  useCreateActivityScheduleTemplate,
  useSaveActivityScheduleTemplate,
  useDeleteActivityScheduleTemplate,
  useDuplicateActivityScheduleTemplate,
  type ActivityScheduleStepDraft,
  type ActivityScheduleTemplate,
} from "@/hooks/useActivitySchedules";

function newStepDraft(): ActivityScheduleStepDraft {
  return {
    id: `new-${crypto.randomUUID()}`,
    offset_days: 0,
    step_type: "task",
    title: "",
    body: "",
  };
}

function stepsToDrafts(
  steps: { id: string; offset_days: number; step_type: string; title: string; body: string | null }[],
): ActivityScheduleStepDraft[] {
  return steps.map((s) => ({
    id: s.id,
    offset_days: s.offset_days,
    step_type: s.step_type as ActivityScheduleStepType,
    title: s.title,
    body: s.body ?? "",
  }));
}

function TemplateListRow({
  template,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: ActivityScheduleTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { data: steps = [] } = useActivityScheduleTemplateSteps(template.id);
  return (
    <li className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{template.name}</p>
        {template.description ? (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
        ) : null}
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className="text-[10px] capitalize">
            {template.applies_to}
          </Badge>
          <span className="text-[10px] text-muted-foreground tabular-nums">{steps.length} steps</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDuplicate}
          aria-label="Duplicate"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function StepEditorRow({
  step,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  step: ActivityScheduleStepDraft;
  index: number;
  total: number;
  onChange: (patch: Partial<ActivityScheduleStepDraft>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border border-border/60 p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={index >= total - 1}
            onClick={() => onMove(1)}
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove step"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Days after apply</Label>
          <Input
            type="number"
            min={0}
            max={3650}
            value={step.offset_days}
            onChange={(e) => onChange({ offset_days: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={step.step_type} onValueChange={(v) => onChange({ step_type: v as ActivityScheduleStepType })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_SCHEDULE_STEP_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {stepTypeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Title</Label>
        <Input
          value={step.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Call vendor for price feedback"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notes (optional)</Label>
        <Textarea
          value={step.body}
          onChange={(e) => onChange({ body: e.target.value })}
          rows={2}
          className="resize-none text-sm"
          placeholder="Script or checklist…"
        />
      </div>
    </div>
  );
}

function ScheduleEditorSheet({
  open,
  onOpenChange,
  templateId,
  appliesToDefault,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string | null;
  appliesToDefault: ActivityScheduleAppliesTo;
}) {
  const isNew = !templateId;
  const { data: loadedSteps = [], isLoading: stepsLoading } = useActivityScheduleTemplateSteps(
    open && templateId ? templateId : undefined,
  );
  const { data: templates = [] } = useActivityScheduleTemplates();
  const existing = templates.find((t) => t.id === templateId);

  const createMut = useCreateActivityScheduleTemplate();
  const saveMut = useSaveActivityScheduleTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [appliesTo, setAppliesTo] = useState<ActivityScheduleAppliesTo>(appliesToDefault);
  const [steps, setSteps] = useState<ActivityScheduleStepDraft[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!open) {
      setInitialized(false);
      return;
    }
    if (isNew) {
      setName("");
      setDescription("");
      setAppliesTo(appliesToDefault);
      setSteps([newStepDraft()]);
      setInitialized(true);
      return;
    }
    if (stepsLoading || !existing) return;
    setName(existing.name);
    setDescription(existing.description ?? "");
    setAppliesTo(existing.applies_to);
    setSteps(loadedSteps.length ? stepsToDrafts(loadedSteps) : [newStepDraft()]);
    setInitialized(true);
  }, [open, isNew, existing?.id, existing?.name, existing?.description, existing?.applies_to, loadedSteps, stepsLoading, appliesToDefault]);

  const updateStep = useCallback((index: number, patch: Partial<ActivityScheduleStepDraft>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }, []);

  const moveStep = useCallback((index: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j]!, next[index]!];
      return next;
    });
  }, []);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Schedule name is required");
      return;
    }
    const titledSteps = steps.filter((s) => s.title.trim());
    if (!titledSteps.length) {
      toast.error("Add at least one step with a title");
      return;
    }
    try {
      if (isNew) {
        await createMut.mutateAsync({
          name: trimmedName,
          description,
          applies_to: appliesTo,
          steps: titledSteps,
        });
        toast.success("Schedule created");
      } else {
        await saveMut.mutateAsync({
          id: templateId!,
          name: trimmedName,
          description,
          steps: titledSteps,
        });
        toast.success("Schedule saved");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save schedule");
    }
  };

  const saving = createMut.isPending || saveMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-2 shrink-0">
          <SheetTitle>{isNew ? "New activity schedule" : "Edit activity schedule"}</SheetTitle>
          <SheetDescription>
            Steps run relative to when the schedule is applied. Task steps sync to the contact when applicable.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!initialized && !isNew ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New listing — vendor care" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
              {isNew ? (
                <div className="space-y-2">
                  <Label>Applies to</Label>
                  <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as ActivityScheduleAppliesTo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="listing">Listings</SelectItem>
                      <SelectItem value="contact">Contacts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Applies to</Label>
                  <p className="text-sm capitalize">{appliesTo}</p>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Steps</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSteps((p) => [...p, newStepDraft()])}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add step
                  </Button>
                </div>
                <div className="space-y-2">
                  {steps.map((step, i) => (
                    <StepEditorRow
                      key={step.id}
                      step={step}
                      index={i}
                      total={steps.length}
                      onChange={(patch) => updateStep(i, patch)}
                      onMove={(dir) => moveStep(i, dir)}
                      onRemove={() => setSteps((p) => (p.length <= 1 ? p : p.filter((_, j) => j !== i)))}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <SheetFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || !initialized}>
            {saving ? "Saving…" : "Save schedule"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function ActivityScheduleBuilderCard() {
  const { data: templates = [], isLoading } = useActivityScheduleTemplates();
  const deleteMut = useDeleteActivityScheduleTemplate();
  const duplicateMut = useDuplicateActivityScheduleTemplate();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => {
    setEditingId(null);
    if (editorOpen) {
      setEditorOpen(false);
      window.setTimeout(() => setEditorOpen(true), 0);
    } else {
      setEditorOpen(true);
    }
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      toast.success("Schedule deleted");
      setDeleteId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete schedule");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const newId = await duplicateMut.mutateAsync(id);
      toast.success("Schedule duplicated");
      openEdit(newId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not duplicate schedule");
    }
  };

  return (
    <>
      <Card className="zoho-card p-5 border-border">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Activity schedule templates</h3>
          </div>
          <Button type="button" size="sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New schedule
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Build follow-up sequences with timed steps (task, call, email, note). Apply from a listing or contact
          record.
        </p>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No templates yet. Create one above, or open a listing or contact to auto-seed starter schedules.
          </p>
        ) : (
          <ul>
            {templates.map((t) => (
              <TemplateListRow
                key={t.id}
                template={t}
                onEdit={() => openEdit(t.id)}
                onDuplicate={() => void handleDuplicate(t.id)}
                onDelete={() => setDeleteId(t.id)}
              />
            ))}
          </ul>
        )}
      </Card>

      <ScheduleEditorSheet
        key={editingId ?? "new"}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        templateId={editingId}
        appliesToDefault="listing"
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Templates that have been applied to a listing or contact cannot be deleted. This only removes the
              template definition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
