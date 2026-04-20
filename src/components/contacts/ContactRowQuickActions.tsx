import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
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
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCrmWorkflowEnrollmentsForContact,
  useCrmWorkflowsList,
  useStartCrmWorkflowEnrollment,
} from "@/hooks/useCrmWorkflows";
import { useCreateContactTask } from "@/hooks/useContactTasks";
import { useToast } from "@/hooks/use-toast";
import { getAllPhones, getContactDisplayName, useUpdateContact, type ContactWithMeta } from "@/hooks/useContacts";
import { openLogTouch } from "@/lib/openLogTouch";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { FileText, GitBranch, Handshake, ListTodo, MessageSquare, MoreHorizontal, Pencil, Tag, Trash2 } from "lucide-react";

type Props = {
  contact: ContactWithMeta;
  onEdit: () => void;
  onScripts: () => void;
  onDelete: () => void;
};

const CLASSIFICATION_OPTIONS = [
  { value: "top_100", label: "Top 100" },
  { value: "past_client", label: "Past client" },
  { value: "referral_partner", label: "Referral partner" },
  { value: "hot_lead", label: "Hot lead" },
  { value: "warm_lead", label: "Warm lead" },
  { value: "seller_nurture", label: "Seller nurture" },
] as const;

const URGENCY_LANE_OPTIONS = [
  { value: "immediate", label: "Immediate" },
  { value: "priority", label: "Priority" },
  { value: "planned", label: "Planned" },
  { value: "backlog", label: "Backlog" },
] as const;

function normalizeClassification(value: string): (typeof CLASSIFICATION_OPTIONS)[number]["value"] {
  const raw = String(value ?? "").trim().toLowerCase();
  const hit = CLASSIFICATION_OPTIONS.find((o) => o.value === raw);
  return hit ? hit.value : "warm_lead";
}

function defaultTaskDueIso(): string {
  const d = setMilliseconds(setSeconds(setMinutes(setHours(addDays(new Date(), 1), 9), 0), 0), 0);
  return d.toISOString();
}

export function ContactRowQuickActions({ contact, onEdit, onScripts, onDelete }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateContact = useUpdateContact();
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("Follow up");
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [workflowId, setWorkflowId] = useState<string>("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsTo, setSmsTo] = useState("");

  const { data: workflows = [] } = useCrmWorkflowsList();
  const { data: enrollments = [] } = useCrmWorkflowEnrollmentsForContact(workflowOpen ? contact.id : undefined);
  const startEnrollment = useStartCrmWorkflowEnrollment();
  const createTask = useCreateContactTask();

  const activeWorkflowIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of enrollments) {
      if (e.status === "active") s.add(e.workflow_id);
    }
    return s;
  }, [enrollments]);

  const contactWorkflows = useMemo(
    () =>
      workflows.filter((w) => w.is_active && w.trigger_object === "contact" && w.trigger_type === "manual"),
    [workflows]
  );

  const label = getContactDisplayName(contact);

  const smsNumberRows = getAllPhones(contact).flatMap((p) =>
    p.value.split(/[;,]/).map((part) => {
      const num = part.trim();
      if (!num) return null;
      return { num, label: p.label };
    })
  ).filter(Boolean) as { num: string; label: string }[];

  const handlePatchContact = (updates: Record<string, string>, okTitle: string) => {
    updateContact.mutate(
      { id: contact.id, ...updates },
      {
        onSuccess: () => toast({ title: okTitle }),
        onError: (e) =>
          toast({
            title: "Update failed",
            description: e instanceof Error ? e.message : "Try again.",
            variant: "destructive",
          }),
      }
    );
  };

  const handleCreateTask = () => {
    const t = taskTitle.trim();
    if (!t) {
      toast({ title: "Add a title", description: "Task title cannot be empty.", variant: "destructive" });
      return;
    }
    createTask.mutate(
      { contact_id: contact.id, title: t, due_at: defaultTaskDueIso() },
      {
        onSuccess: () => {
          toast({ title: "Task created", description: `Due tomorrow · ${label}` });
          setTaskOpen(false);
          setTaskTitle("Follow up");
        },
        onError: (e) => {
          toast({
            title: "Could not create task",
            description: e instanceof Error ? e.message : "Try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleEnroll = () => {
    if (!workflowId) {
      toast({ title: "Pick a workflow", variant: "destructive" });
      return;
    }
    startEnrollment.mutate(
      { workflowId, contactId: contact.id },
      {
        onSuccess: () => {
          toast({ title: "Enrolled", description: `${label} was added to the workflow.` });
          setWorkflowOpen(false);
          setWorkflowId("");
        },
        onError: (e) => {
          toast({
            title: "Enrollment failed",
            description: e instanceof Error ? e.message : "Try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="More actions"
            aria-label={`More actions for ${label}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              openLogTouch({ contactId: contact.id });
            }}
          >
            <Handshake className="w-4 h-4 mr-2" />
            Log touch
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setTaskOpen(true);
            }}
          >
            <ListTodo className="w-4 h-4 mr-2" />
            Quick task
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setWorkflowOpen(true);
            }}
          >
            <GitBranch className="w-4 h-4 mr-2" />
            Add to workflow
          </DropdownMenuItem>
          {smsNumberRows.length > 0 ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <MessageSquare className="w-4 h-4 mr-2" />
                Send SMS
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-[12rem]">
                {smsNumberRows.map(({ num, label: phoneLabel }) => (
                  <DropdownMenuItem
                    key={`${phoneLabel}-${num}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSmsTo(num);
                      setSmsOpen(true);
                    }}
                  >
                    <span className="truncate">
                      {phoneLabel !== "Phone" ? `${phoneLabel}: ` : null}
                      {formatPhoneDisplay(num)}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem disabled>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send SMS (no number)
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Tag className="w-4 h-4 mr-2" />
              Classification
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-[11rem]">
              {CLASSIFICATION_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePatchContact({ contact_category: normalizeClassification(opt.value) }, "Classification updated");
                  }}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Urgency lane</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-[10rem]">
              {URGENCY_LANE_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePatchContact({ category: opt.value }, "Urgency lane updated");
                  }}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onScripts();
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Scripts
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SendSmsDialog
        open={smsOpen}
        onOpenChange={setSmsOpen}
        to={smsTo}
        contactId={contact.id}
        contactName={label === "—" ? undefined : label}
        firstName={contact.first_name}
        lastName={contact.last_name}
        onSent={() => {
          void queryClient.invalidateQueries({ queryKey: ["contacts"] });
          void queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
        }}
      />

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Quick task</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor={`qt-${contact.id}`}>Title</Label>
            <Input
              id={`qt-${contact.id}`}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="bg-input"
              placeholder="Follow up"
            />
            <p className="text-xs text-muted-foreground">Due tomorrow at 9:00 (local). Open the contact or Tasks to adjust.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={createTask.isPending}>
              {createTask.isPending ? "Saving…" : "Create task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={workflowOpen} onOpenChange={(o) => { setWorkflowOpen(o); if (!o) setWorkflowId(""); }}>
        <DialogContent className="sm:max-w-md bg-card border-border" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Add to workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Active manual workflows for contacts. Workflows run on the server schedule (see Automations).
            </p>
            {contactWorkflows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active manual contact workflows. Create one under Automations.</p>
            ) : (
              <div className="space-y-2">
                <Label>Workflow</Label>
                <Select value={workflowId || undefined} onValueChange={setWorkflowId}>
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="Choose workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactWorkflows.map((w) => {
                      const blocked = activeWorkflowIds.has(w.id);
                      return (
                        <SelectItem key={w.id} value={w.id} disabled={blocked}>
                          {w.name}
                          {blocked ? " (already active)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkflowOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnroll} disabled={!workflowId || startEnrollment.isPending || contactWorkflows.length === 0}>
              {startEnrollment.isPending ? "Enrolling…" : "Enroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {label}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete();
                setDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
