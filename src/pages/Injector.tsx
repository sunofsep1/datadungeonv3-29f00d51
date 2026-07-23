import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Inbox, Check, X, RotateCcw, UserRoundSearch, User, Home, CheckSquare, Loader2, Sparkles,
  ChevronDown, ChevronUp, Plus, Trash2, FileText, Link2, AlignLeft, MousePointerClick,
} from "lucide-react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { InvestmentBadge } from "@/components/properties/InvestmentControls";
import {
  useInjectorInbox, useInjectorMutations, useContactSearch, useNoteTranscript,
  type InjectorNote, type InjectorProposal,
} from "@/hooks/useInjector";

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function ConfidenceDot({ c }: { c: number | null }) {
  const pct = Math.round((c ?? 0) * 100);
  const tone = pct >= 85 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-rose-400";
  return <span className={`text-xs font-medium ${tone}`}>{pct}%</span>;
}

/** Search + pick an existing contact — used to re-match a contact proposal or to link a task to a contact. */
function ContactPickPopover({
  proposal, onPick, label = "Re-match", clearLabel,
}: {
  proposal: InjectorProposal;
  onPick: (id: string | null, name: string | null) => void;
  label?: string;
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { data: results = [], isFetching } = useContactSearch(term);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          {label === "Re-match" ? <UserRoundSearch className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />} {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input autoFocus placeholder="Search contacts…" value={term} onChange={(e) => setTerm(e.target.value)} className="h-8 text-sm" />
        <div className="mt-2 max-h-56 overflow-y-auto">
          {isFetching && <p className="text-xs text-muted-foreground px-1 py-2">Searching…</p>}
          {!isFetching && term.length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground px-1 py-2">No matches.</p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-sm"
              onClick={() => { onPick(r.id, r.name); setOpen(false); }}
            >
              <div className="text-white">{r.name || "—"}</div>
              <div className="text-xs text-muted-foreground">{[r.mobile, r.suburb].filter(Boolean).join(" · ") || "no phone"}</div>
            </button>
          ))}
          {proposal.match_contact_id && (
            <button className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-amber-400" onClick={() => { onPick(null, null); setOpen(false); }}>
              {clearLabel ?? "Clear match — create as a new contact"}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProposalRow({ p }: { p: InjectorProposal }) {
  const { updateProposal, setProposalStatus, deleteProposal, applyNote } = useInjectorMutations();
  const { toast } = useToast();
  const rejected = p.status === "rejected";
  const pr = p.proposed ?? {};
  // Hand-added rows are created with confidence 1 and action "create" — offer a hard remove for those.
  const isManual = p.confidence === 1 && p.action === "create";

  const editField = (key: string, value: string) => {
    updateProposal.mutate({ id: p.id, proposed: { ...pr, [key]: value || null } });
  };
  const setName = (value: string) => {
    const parts = value.trim().split(/\s+/);
    updateProposal.mutate({
      id: p.id,
      proposed: {
        ...pr,
        name: value || null,
        first_name: parts[0] || null,
        last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
      },
    });
  };

  const icon =
    p.entity_type === "contact" ? <User className="w-4 h-4" /> :
    p.entity_type === "property" ? <Home className="w-4 h-4" /> :
    <CheckSquare className="w-4 h-4" />;

  return (
    <div className={`rounded-lg border border-white/10 p-3 ${rejected ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="flex-1 min-w-0">
          {/* CONTACT — every field editable, matched or new */}
          {p.entity_type === "contact" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {!rejected ? (
                  <Input defaultValue={str(pr.name)} placeholder="Contact name" className="h-8 text-sm font-medium max-w-[16rem]" onBlur={(e) => e.target.value !== str(pr.name) && setName(e.target.value)} />
                ) : (
                  <span className="font-medium text-white">{str(pr.name) || "New contact"}</span>
                )}
                {p.match_contact_id ? (
                  <Badge variant="secondary" className="text-xs">matches {str(pr.match_name) || "existing"} · {str(pr.match_by) || "matched"}</Badge>
                ) : (
                  <Badge className="text-xs bg-emerald-500/15 text-emerald-300 border-emerald-500/30">New contact</Badge>
                )}
                {pr.ownership ? <Badge variant="outline" className="text-xs capitalize">{str(pr.ownership).replace(/_/g, " ")}</Badge> : null}
                <ConfidenceDot c={p.confidence} />
              </div>
              {!rejected && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input defaultValue={str(pr.mobile)} placeholder="Mobile" className="h-8 text-sm" onBlur={(e) => e.target.value !== str(pr.mobile) && editField("mobile", e.target.value)} />
                    <Input defaultValue={str(pr.email)} placeholder="Email" className="h-8 text-sm" onBlur={(e) => e.target.value !== str(pr.email) && editField("email", e.target.value)} />
                  </div>
                  <Input defaultValue={str(pr.residential_address)} placeholder="Home / residential address" className="h-8 text-sm" onBlur={(e) => e.target.value !== str(pr.residential_address) && editField("residential_address", e.target.value)} />
                  <Textarea
                    defaultValue={str(pr.note)}
                    placeholder="Conversation note — this is what gets saved to the contact's Conversation Hub"
                    className="text-sm min-h-[3.25rem]"
                    onBlur={(e) => e.target.value !== str(pr.note) && editField("note", e.target.value)}
                  />
                </>
              )}
              {rejected && pr.note ? <p className="text-xs text-white/70 italic">“{str(pr.note)}”</p> : null}
            </div>
          )}

          {/* PROPERTY — always editable */}
          {p.entity_type === "property" && (
            <div className="space-y-2">
              {!rejected ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input defaultValue={str(pr.address)} placeholder="Property address" className="h-8 text-sm flex-1" onBlur={(e) => e.target.value !== str(pr.address) && editField("address", e.target.value)} />
                  <select
                    defaultValue={str(pr.ownership_type) || "unknown"}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm text-white"
                    onChange={(e) => editField("ownership_type", e.target.value)}
                  >
                    <option value="unknown">Ownership: unknown</option>
                    <option value="owner_occupier">Owner-occupier</option>
                    <option value="investment">Investment</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">{str(pr.address)}</span>
                  {str(pr.ownership_type) === "investment"
                    ? <InvestmentBadge ownershipType="investment" />
                    : <Badge variant="outline" className="text-xs capitalize">{str(pr.ownership_type).replace(/_/g, " ") || "unknown"}</Badge>}
                </div>
              )}
              {pr.ownership_reason ? <p className="text-xs text-muted-foreground">{str(pr.ownership_reason)}</p> : null}
              {pr.owner_name ? <p className="text-xs text-white/60">Owner: {str(pr.owner_name)}</p> : null}
            </div>
          )}

          {/* TASK — always editable */}
          {p.entity_type === "task" && (
            <div className="space-y-2">
              {!rejected ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input defaultValue={str(pr.title)} placeholder="Task / follow-up" className="h-8 text-sm flex-1" onBlur={(e) => e.target.value !== str(pr.title) && editField("title", e.target.value)} />
                  <Input type="date" defaultValue={str(pr.due)} className="h-8 text-sm sm:w-40" onChange={(e) => e.target.value !== str(pr.due) && editField("due", e.target.value)} />
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">{str(pr.title)}</span>
                  {pr.due ? <Badge variant="outline" className="text-xs">due {str(pr.due)}</Badge> : null}
                </div>
              )}
              <p className="text-xs text-white/60">{p.match_contact_id || pr.contact_name ? `For ${str(pr.contact_name) || "linked contact"}` : "Personal to-do"}</p>
            </div>
          )}
        </div>

        {/* per-item actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!rejected && (
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              title="Inject just this item into the CRM"
              disabled={applyNote.isPending}
              onClick={() =>
                applyNote.mutate(
                  { noteId: p.note_id, proposalIds: [p.id] },
                  {
                    onSuccess: () => toast({ title: "Added to CRM", description: `“${str(pr.name) || str(pr.title) || str(pr.address) || "Item"}” saved.` }),
                    onError: (e) => toast({ title: "Couldn’t add", description: String((e as Error).message), variant: "destructive" }),
                  },
                )
              }
            >
              {applyNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Inject
            </Button>
          )}
          {p.entity_type === "contact" && !rejected && (
            <ContactPickPopover
              proposal={p}
              onPick={(id, name) => updateProposal.mutate({ id: p.id, match_contact_id: id, proposed: { ...pr, match_name: name } })}
            />
          )}
          {p.entity_type === "task" && !rejected && (
            <ContactPickPopover
              proposal={p}
              label="Link contact"
              clearLabel="Clear — leave as a personal to-do"
              onPick={(id, name) => updateProposal.mutate({ id: p.id, match_contact_id: id, proposed: { ...pr, contact_name: name } })}
            />
          )}
          {isManual ? (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-300" title="Remove" onClick={() => deleteProposal.mutate(p.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          ) : rejected ? (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => setProposalStatus.mutate({ id: p.id, status: "pending" })}>
              <RotateCcw className="w-3.5 h-3.5" /> Restore
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-300" title="Reject" onClick={() => setProposalStatus.mutate({ id: p.id, status: "rejected" })}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Buttons to add a contact / property / task by hand to a note. */
function AddProposalBar({ noteId }: { noteId: string }) {
  const { addProposal } = useInjectorMutations();
  const add = (entity_type: "contact" | "property" | "task") => addProposal.mutate({ note_id: noteId, entity_type });
  return (
    <div className="flex items-center gap-2 flex-wrap pt-1">
      <span className="text-xs text-muted-foreground">Add manually:</span>
      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => add("contact")}><Plus className="w-3.5 h-3.5" /><User className="w-3.5 h-3.5" /> Contact</Button>
      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => add("task")}><Plus className="w-3.5 h-3.5" /><CheckSquare className="w-3.5 h-3.5" /> Task</Button>
      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => add("property")}><Plus className="w-3.5 h-3.5" /><Home className="w-3.5 h-3.5" /> Property</Button>
    </div>
  );
}

/** Floating action bar for text selected in the summary / transcript — the dispersal tools.
 * Turn any highlighted phrase into a task, a new contact, or a note attached to an existing contact. */
function SelectionToolbar({ noteId, selection, onDone }: { noteId: string; selection: string; onDone: () => void }) {
  const { addProposal } = useInjectorMutations();
  const { toast } = useToast();
  const [attachMode, setAttachMode] = useState(false);
  const [term, setTerm] = useState("");
  const { data: results = [], isFetching } = useContactSearch(term);
  const snippet = selection.length > 70 ? selection.slice(0, 70) + "…" : selection;

  const make = (entity_type: "task" | "contact", proposed: Record<string, unknown>) => {
    addProposal.mutate(
      { note_id: noteId, entity_type, proposed },
      {
        onSuccess: () => { toast({ title: entity_type === "task" ? "Task drafted below" : "Contact drafted below" }); onDone(); },
        onError: (e) => toast({ title: "Couldn’t add", description: String((e as Error).message), variant: "destructive" }),
      },
    );
  };
  const attach = (contactId: string, contactName: string | null) => {
    addProposal.mutate(
      { note_id: noteId, entity_type: "contact", match_contact_id: contactId, action: "update", proposed: { name: contactName, match_name: contactName, note: selection } },
      {
        onSuccess: () => { toast({ title: `Note drafted for ${contactName ?? "contact"}`, description: "Review it below, then Inject." }); onDone(); },
        onError: (e) => toast({ title: "Couldn’t attach", description: String((e as Error).message), variant: "destructive" }),
      },
    );
  };

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <MousePointerClick className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs text-white/80 italic flex-1 min-w-0 truncate">“{snippet}”</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDone}><X className="w-3.5 h-3.5" /></Button>
      </div>
      {!attachMode ? (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => make("task", { title: selection })}>
            <CheckSquare className="w-3.5 h-3.5" /> Make it a task
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => make("contact", { name: selection })}>
            <User className="w-3.5 h-3.5" /> New contact
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setAttachMode(true)}>
            <Link2 className="w-3.5 h-3.5" /> Attach to contact…
          </Button>
        </div>
      ) : (
        <div>
          <Input autoFocus placeholder="Search contacts…" value={term} onChange={(e) => setTerm(e.target.value)} className="h-8 text-sm" />
          <div className="mt-1.5 max-h-44 overflow-y-auto">
            {isFetching && <p className="text-xs text-muted-foreground px-1 py-1.5">Searching…</p>}
            {results.map((r) => (
              <button key={r.id} className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-sm" onClick={() => attach(r.id, r.name)}>
                <span className="text-white">{r.name || "—"}</span>
                <span className="text-xs text-muted-foreground ml-2">{[r.mobile, r.suburb].filter(Boolean).join(" · ")}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({ note }: { note: InjectorNote }) {
  const { applyNote, dismissNote } = useInjectorMutations();
  const { toast } = useToast();
  const [showSummary, setShowSummary] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [selection, setSelection] = useState("");
  const { data: transcript, isFetching: transcriptLoading } = useNoteTranscript(showTranscript ? note.id : null);

  const captureSelection = () => {
    const s = window.getSelection()?.toString().trim() ?? "";
    if (s.length >= 3) setSelection(s.slice(0, 2000));
  };
  const pendingCount = note.proposals.filter((p) => p.status === "pending").length;
  const canReview = note.status === "extracted" || note.status === "error";

  const onApply = () => {
    applyNote.mutate(note.id, {
      onSuccess: (r) => toast({ title: "Applied to CRM", description: `${r.applied} change${r.applied === 1 ? "" : "s"} written from “${note.title ?? "note"}”.` }),
      onError: (e) => toast({ title: "Couldn’t apply", description: String((e as Error).message), variant: "destructive" }),
    });
  };

  return (
    <Card className="zoho-card border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{note.title || "Untitled note"}</h3>
              {note.status === "error" && <Badge variant="destructive" className="text-xs">extract error</Badge>}
              {note.status === "received" && <Badge variant="secondary" className="text-xs">processing…</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(note.created_at), "d MMM yyyy, h:mma")}</p>
          </div>
          {canReview && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => dismissNote.mutate(note.id)}>Dismiss</Button>
              <Button size="sm" className="gap-1" disabled={pendingCount === 0 || applyNote.isPending} onClick={onApply}>
                {applyNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Apply all {pendingCount > 0 ? `(${pendingCount})` : ""}
              </Button>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-4 flex-wrap">
          {note.summary_md && (
            <button
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 w-fit"
              onClick={() => setShowSummary((s) => !s)}
            >
              <FileText className="w-3.5 h-3.5" />
              {showSummary ? "Hide summary" : "Read full summary"}
              {showSummary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 w-fit"
            onClick={() => setShowTranscript((s) => !s)}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            {showTranscript ? "Hide transcript" : "Read transcript"}
            {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        {(showSummary || showTranscript) && (
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" /> Highlight any text to turn it into a task, contact, or a note on a contact.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {showSummary && note.summary_md && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 max-h-96 overflow-y-auto" onMouseUp={captureSelection}>
            <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{note.summary_md}</p>
          </div>
        )}
        {showTranscript && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 max-h-96 overflow-y-auto" onMouseUp={captureSelection}>
            {transcriptLoading ? (
              <p className="text-sm text-muted-foreground">Loading transcript…</p>
            ) : transcript ? (
              <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{transcript}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No transcript stored for this note.</p>
            )}
          </div>
        )}
        {selection && (
          <SelectionToolbar noteId={note.id} selection={selection} onDone={() => setSelection("")} />
        )}
        {note.status === "error" && (
          <p className="text-sm text-rose-400/90">{note.error || "The Note Master couldn’t read this note. You can still read the summary above and add records by hand."}</p>
        )}
        {note.status === "received" && (
          <p className="text-sm text-muted-foreground">Waiting for the Note Master to read this note…</p>
        )}
        {canReview && note.proposals.length === 0 && (
          <p className="text-sm text-muted-foreground">The Note Master didn’t find anything to add. Read the summary, then add any contacts, tasks or properties yourself below.</p>
        )}
        {note.proposals.map((p) => <ProposalRow key={p.id} p={p} />)}
        {canReview && <AddProposalBar noteId={note.id} />}
      </CardContent>
    </Card>
  );
}

export default function Injector() {
  const { data: notes, isLoading } = useInjectorInbox();
  const reviewable = useMemo(() => (notes ?? []).filter((n) => n.status !== "dismissed"), [notes]);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <PageBreadcrumbs items={[{ label: "Note Inbox" }]} />
      <div className="flex items-center gap-2">
        <Inbox className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold text-white">Note Inbox</h1>
        {reviewable.length > 0 && <Badge variant="secondary">{reviewable.length}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        Dictated notes from Pocket, read by the Note Master. Open a note to read the full summary, review each proposed change — or add contacts, tasks and properties yourself — then click <span className="text-white">Apply</span> to write it into the CRM. Nothing is saved until you approve it.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : reviewable.length === 0 ? (
        <Card className="zoho-card border-white/10">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-8 h-8 text-primary/60 mx-auto mb-3" />
            <p className="text-white font-medium">Inbox zero</p>
            <p className="text-sm text-muted-foreground mt-1">New Pocket notes will appear here for review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviewable.map((n) => <NoteCard key={n.id} note={n} />)}
        </div>
      )}
    </div>
  );
}
