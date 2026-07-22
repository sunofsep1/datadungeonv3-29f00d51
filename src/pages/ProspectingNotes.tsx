import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NotebookPen, Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useProspectingNotes,
  useCreateProspectingNote,
  useDeleteProspectingNote,
} from "@/hooks/useProspectingNotes";

export default function ProspectingNotes() {
  const { data: notes = [], isLoading } = useProspectingNotes();
  const createNote = useCreateProspectingNote();
  const deleteNote = useDeleteProspectingNote();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleAdd = () => {
    if (!body.trim()) return;
    createNote.mutate(
      { title: title.trim() || null, body: body.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
          toast.success("Note added");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add"),
      },
    );
  };

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader title="Prospecting Notes" />

      <Card className="zoho-card mt-4 border border-border p-3 md:p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <NotebookPen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Scratch pad</h2>
            <p className="text-[11px] text-muted-foreground">
              General prospecting notes not tied to a contact — streets, complexes, market observations.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Title (optional)"
            className="h-9 border-border bg-background"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Write your note…"
            className="min-h-[90px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={handleAdd}
              disabled={!body.trim() || createNote.isPending}
            >
              {createNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add note
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : notes.length === 0 ? (
          <Card className="zoho-card border border-border p-8 text-center text-sm text-muted-foreground">
            No prospecting notes yet. Add one above.
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="group zoho-card border border-border p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {note.title ? (
                    <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
                  ) : null}
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-foreground">{note.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {note.created_at ? format(new Date(note.created_at), "d MMM yyyy · h:mma") : ""}
                    </span>
                    {(note.tags ?? []).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                    {note.source === "note_master" ? (
                      <span className="text-[10px] uppercase text-muted-foreground">via Note Master</span>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground opacity-70 hover:text-destructive group-hover:opacity-100"
                  onClick={() =>
                    deleteNote.mutate(note.id, {
                      onSuccess: () => toast.success("Removed"),
                      onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
                    })
                  }
                  disabled={deleteNote.isPending && deleteNote.variables === note.id}
                  aria-label="Delete note"
                >
                  {deleteNote.isPending && deleteNote.variables === note.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
