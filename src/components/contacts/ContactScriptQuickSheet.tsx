import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, FileText, Library, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useScripts, type ScriptRecord } from "@/hooks/useScripts";
import { rankScriptsForContact } from "@/lib/scriptSuggestionsForContact";

const CATEGORY_LABELS: Record<string, string> = {
  listing_presentation: "Listing",
  objection_handling: "Objection",
  follow_up: "Follow-up",
  cold_call: "Cold call",
  price_reduction: "Price reduction",
  commission_defence: "Commission",
  appraisal_booking: "Appraisal",
  annual_review: "Annual review",
  text_template: "Text",
  other: "Other",
};

function categoryLabel(category: string | null | undefined): string {
  const k = String(category ?? "other");
  return CATEGORY_LABELS[k] ?? k.replace(/_/g, " ");
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactCategory: string | null | undefined;
};

export function ContactScriptQuickSheet({ open, onOpenChange, contactCategory }: Props) {
  const { toast } = useToast();
  const { data: scripts = [], isLoading } = useScripts();
  const [query, setQuery] = useState("");

  const ranked = useMemo(
    () => rankScriptsForContact(scripts, contactCategory),
    [scripts, contactCategory],
  );

  const q = query.trim().toLowerCase();

  const searchHits = useMemo(() => {
    if (!q) return [];
    return ranked.filter((s) => {
      const hay = `${s.title} ${s.content} ${s.situation_trigger ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [ranked, q]);

  const suggested = useMemo(() => ranked.slice(0, 6), [ranked]);
  const moreScripts = useMemo(() => ranked.slice(6), [ranked]);

  const copyContent = async (s: ScriptRecord) => {
    const text = s.content?.trim();
    if (!text) {
      toast({ title: "Nothing to copy", description: "This script has no body yet.", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: s.title });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard permission denied.", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="p-6 pb-4 space-y-1 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-left">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            Scripts for this contact
          </SheetTitle>
          <SheetDescription className="text-left">
            Suggested playbooks match your contact category. Copy text for calls, SMS, or notes.
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter scripts…"
              className="pl-8 h-9 text-sm bg-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-6">
          <div className="pb-4 space-y-6">
            {q ? (
              <section>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Matches
                </p>
                {isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading scripts…</p>
                ) : searchHits.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No scripts match your filter.</p>
                ) : (
                  <ul className="space-y-2">
                    {searchHits.map((s) => (
                      <ScriptRow key={s.id} script={s} onCopy={() => copyContent(s)} />
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <>
                <section>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Suggested for this playbook
                  </p>
                  {isLoading ? (
                    <p className="text-xs text-muted-foreground">Loading scripts…</p>
                  ) : suggested.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No scripts yet. Open the library to seed templates.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {suggested.map((s) => (
                        <ScriptRow key={s.id} script={s} onCopy={() => copyContent(s)} />
                      ))}
                    </ul>
                  )}
                </section>
                {moreScripts.length > 0 ? (
                  <section>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      More scripts
                    </p>
                    <ul className="space-y-2">
                      {moreScripts.map((s) => (
                        <ScriptRow key={s.id} script={s} onCopy={() => copyContent(s)} />
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border mt-auto space-y-2 bg-muted/20">
          <Button variant="outline" size="sm" className="w-full gap-2" asChild>
            <Link to="/scripts" onClick={() => onOpenChange(false)}>
              <Library className="h-3.5 w-3.5" />
              Open full script library
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ScriptRow({ script, onCopy }: { script: ScriptRecord; onCopy: () => void }) {
  const [open, setOpen] = useState(false);
  const preview = script.content?.trim().slice(0, 160) ?? "";

  return (
    <li className="rounded-lg border border-border/70 bg-card/40 overflow-hidden">
      <div className="p-3 flex gap-2 items-start">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-foreground leading-tight">{script.title}</span>
            <Badge variant="secondary" className="text-[10px] font-normal">
              {categoryLabel(script.category)}
            </Badge>
          </div>
          {script.situation_trigger?.trim() ? (
            <p className="text-[11px] text-muted-foreground line-clamp-2">{script.situation_trigger}</p>
          ) : null}
          {open ? (
            <pre className="text-[11px] whitespace-pre-wrap text-foreground/90 bg-muted/30 rounded p-2 max-h-40 overflow-y-auto mt-1">
              {script.content}
            </pre>
          ) : preview ? (
            <p className="text-[11px] text-muted-foreground line-clamp-2">{preview}{script.content && script.content.length > 160 ? "…" : ""}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button type="button" variant="secondary" size="sm" className="h-8 px-2 text-xs" onClick={onCopy}>
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-[10px]" onClick={() => setOpen((v) => !v)}>
            {open ? "Less" : "More"}
          </Button>
        </div>
      </div>
    </li>
  );
}
