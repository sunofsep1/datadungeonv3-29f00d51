import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Inbox, Check, X, RotateCcw, UserRoundSearch, User, Home, CheckSquare, Loader2, Sparkles,
} from "lucide-react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { InvestmentBadge } from "@/components/properties/InvestmentControls";
import {
  useInjectorInbox, useInjectorMutations, useContactSearch,
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

/** Re-match a proposal to a different existing contact. */
function ReMatchPopover({ proposal, onPick }: { proposal: InjectorProposal; onPick: (id: string | null, name: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { data: results = [], isFetching } = useContactSearch(term);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <UserRoundSearch className="w-3.5 h-3.5" /> Re-match
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
              Clear match — create as a new contact
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProposalRow({ p }: { p: InjectorProposal }) {
  const { updateProposal, setProposalStatus } = useInjectorMutations();
  const rejected = p.status === "rejected";
  const pr = p.proposed ?? {};

  const editField = (key: string, value: string) => {
    updateProposal.mutate({ id: p.id, proposed: { ...pr, [key]: value || null } });
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
          {/* CONTACT */}
          {p.entity_type === "contact" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white">{str(pr.name) || "New contact"}</span>
                {p.match_contact_id ? (
                  <Badge variant="secondary" className="text-xs">matches {str(pr.match_name) || "existing"} · {str(pr.match_by) || "matched"}</Badge>
                ) : (
                  <Badge className="text-xs bg-emerald-500/15 text-emerald-300 border-emerald-500/30">New contact</Badge>
                )}
                {pr.ownership ? <Badge variant="outline" className="text-xs capitalize">{str(pr.ownership).replace(/_/g, " ")}</Badge> : null}
                <ConfidenceDot c={p.confidence} />
              </div>
              {!rejected && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input defaultValue={str(pr.mobile)} placeholder="Mobile" className="h-8 text-sm" onBlur={(e) => e.target.value !== str(pr.mobile) && editField("mobile", e.target.value)} />
                  <Input defaultValue={str(pr.email)} placeholder="Email" className="h-8 text-sm" onBlur={(e) => e.target.value !== str(pr.email) && editField("email", e.target.value)} />
                </div>
              )}
              {pr.residential_address ? <p className="text-xs text-muted-foreground">Lives: {str(pr.residential_address)}</p> : null}
              {pr.note ? <p className="text-xs text-white/70 italic">“{str(pr.note)}”</p> : null}
            </div>
          )}

          {/* PROPERTY */}
          {p.entity_type === "property" && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white">{str(pr.address)}</span>
                {str(pr.ownership_type) === "investment"
                  ? <InvestmentBadge ownershipType="investment" />
                  : <Badge variant="outline" className="text-xs capitalize">{str(pr.ownership_type).replace(/_/g, " ") || "unknown"}</Badge>}
              </div>
              {pr.ownership_reason ? <p className="text-xs text-muted-foreground">{str(pr.ownership_reason)}</p> : null}
              {pr.owner_name ? <p className="text-xs text-white/60">Owner: {str(pr.owner_name)}</p> : null}
            </div>
          )}

          {/* TASK */}
          {p.entity_type === "task" && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white">{str(pr.title)}</span>
                {pr.due ? <Badge variant="outline" className="text-xs">due {str(pr.due)}</Badge> : null}
              </div>
              <p className="text-xs text-white/60">{pr.contact_name ? `For ${str(pr.contact_name)}` : "Personal to-do"}</p>
            </div>
          )}
        </div>

        {/* per-item actions */}
        <div className="flex items-center gap-1 shrink-0">
          {p.entity_type === "contact" && !rejected && (
            <ReMatchPopover
              proposal={p}
              onPick={(id, name) => updateProposal.mutate({ id: p.id, match_contact_id: id, proposed: { ...pr, match_name: name } })}
            />
          )}
          {rejected ? (
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

function NoteCard({ note }: { note: InjectorNote }) {
  const { applyNote, dismissNote } = useInjectorMutations();
  const { toast } = useToast();
  const pendingCount = note.proposals.filter((p) => p.status === "pending").length;

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
          {note.status === "extracted" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => dismissNote.mutate(note.id)}>Dismiss</Button>
              <Button size="sm" className="gap-1" disabled={pendingCount === 0 || applyNote.isPending} onClick={onApply}>
                {applyNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Apply {pendingCount > 0 ? `(${pendingCount})` : ""}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {note.status === "error" && (
          <p className="text-sm text-rose-400/90">{note.error || "Extraction failed. It will retry automatically."}</p>
        )}
        {note.status === "received" && (
          <p className="text-sm text-muted-foreground">Waiting for the Note Master to read this note…</p>
        )}
        {note.status === "extracted" && note.proposals.length === 0 && (
          <p className="text-sm text-muted-foreground">No CRM changes found in this note.</p>
        )}
        {note.proposals.map((p) => <ProposalRow key={p.id} p={p} />)}
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
        Dictated notes from Pocket, read by the Note Master. Review each proposed change and click <span className="text-white">Apply</span> to write it into the CRM — nothing is saved until you approve it.
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
