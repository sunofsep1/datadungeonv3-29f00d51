import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useContactConversations,
  useCreateContactConversation,
  useDeleteContactConversation,
  type ContactConversation,
} from "@/hooks/useContactConversations";

const CHANNELS = [
  { value: "call", label: "Call" },
  { value: "in_person", label: "In person" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
];

function channelLabel(value: string) {
  return CHANNELS.find((c) => c.value === value)?.label ?? value;
}

function ConversationRow({
  convo,
  onDelete,
  isDeleting,
}: {
  convo: ContactConversation;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const when = convo.occurred_at ? new Date(convo.occurred_at) : null;
  return (
    <Card className="group border border-border bg-background/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] uppercase text-primary">
            {channelLabel(convo.channel)}
          </Badge>
          {when ? (
            <span className="text-xs text-muted-foreground">{format(when, "d MMM yyyy · h:mma")}</span>
          ) : null}
          {convo.source === "note_master" ? (
            <span className="text-[10px] uppercase text-muted-foreground">via Note Master</span>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-70 hover:text-destructive group-hover:opacity-100"
          onClick={onDelete}
          disabled={isDeleting}
          aria-label="Delete conversation"
        >
          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {convo.summary ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-snug text-foreground">{convo.summary}</p>
      ) : null}
      {Array.isArray(convo.highlights) && convo.highlights.length > 0 ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          {convo.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      ) : null}
      {convo.next_steps ? (
        <p className="mt-2 text-xs text-foreground">
          <span className="font-semibold text-primary/90">Next: </span>
          {convo.next_steps}
        </p>
      ) : null}
    </Card>
  );
}

export function ContactConversationHub({ contactId }: { contactId?: string }) {
  const { data: conversations = [], isLoading } = useContactConversations(contactId);
  const createConvo = useCreateContactConversation();
  const deleteConvo = useDeleteContactConversation();

  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [summary, setSummary] = useState("");
  const [channel, setChannel] = useState("call");
  const [nextSteps, setNextSteps] = useState("");

  const handleSave = () => {
    if (!contactId || !summary.trim()) return;
    createConvo.mutate(
      {
        contact_id: contactId,
        summary: summary.trim(),
        channel,
        next_steps: nextSteps.trim() || null,
      },
      {
        onSuccess: () => {
          setSummary("");
          setNextSteps("");
          setChannel("call");
          setAdding(false);
          toast.success("Conversation logged");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
      },
    );
  };

  return (
    <Card className="zoho-card border border-border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Conversation Hub</h3>
            <p className="text-[11px] text-muted-foreground">
              What was actually said — calls and chats, newest first.
            </p>
          </div>
          {open ? (
            <ChevronUp className="ml-1 h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {conversations.length}
          </Badge>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" /> Log conversation
          </Button>
        </div>
      </div>

      {adding ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border/70 bg-background/50 p-3">
          <textarea
            autoFocus
            placeholder="What did you talk about? Capture the gist of the conversation…"
            className="min-h-[80px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-xs"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Next step (optional)"
              className="h-9 rounded-md border border-border bg-background px-3 text-xs"
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleSave}
              disabled={!summary.trim() || createConvo.isPending}
            >
              {createConvo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className={cn("py-6 text-center text-sm text-muted-foreground", adding && "hidden")}>
              No conversations logged yet. Use “Log conversation” after a call.
            </p>
          ) : (
            conversations.map((convo) => (
              <ConversationRow
                key={convo.id}
                convo={convo}
                onDelete={() =>
                  deleteConvo.mutate(
                    { id: convo.id, contact_id: convo.contact_id },
                    {
                      onSuccess: () => toast.success("Removed"),
                      onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
                    },
                  )
                }
                isDeleting={deleteConvo.isPending && deleteConvo.variables?.id === convo.id}
              />
            ))
          )}
        </div>
      ) : null}
    </Card>
  );
}

export default ContactConversationHub;
