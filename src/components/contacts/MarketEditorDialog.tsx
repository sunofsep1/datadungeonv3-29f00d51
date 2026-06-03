import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugifyMarketId, type ContactMarket } from "@/lib/contactMarkets";

interface MarketEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markets: ContactMarket[];
  onSave: (markets: ContactMarket[]) => void;
}

type DraftMarket = ContactMarket & { suburbsText: string };

function toDraft(m: ContactMarket): DraftMarket {
  return { ...m, suburbsText: m.suburbs.join(", ") };
}

function fromDraft(d: DraftMarket, index: number, existingIds: Set<string>): ContactMarket | null {
  const label = d.label.trim();
  const suburbs = d.suburbsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!label || suburbs.length === 0) return null;
  let id = d.id.trim() || slugifyMarketId(label);
  if (!id) id = `market-${index + 1}`;
  const base = id;
  let n = 2;
  while (existingIds.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  existingIds.add(id);
  return {
    id,
    label,
    suburbs,
    state: d.state?.trim() || "QLD",
  };
}

export function MarketEditorDialog({ open, onOpenChange, markets, onSave }: MarketEditorDialogProps) {
  const [drafts, setDrafts] = useState<DraftMarket[]>(() => markets.map(toDraft));

  useEffect(() => {
    if (open) setDrafts(markets.map(toDraft));
  }, [open, markets]);

  const updateDraft = (index: number, patch: Partial<DraftMarket>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const moveDraft = (index: number, dir: -1 | 1) => {
    setDrafts((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addDraft = () => {
    setDrafts((prev) => [
      ...prev,
      {
        id: "",
        label: "",
        suburbs: [],
        suburbsText: "",
        state: "QLD",
      },
    ]);
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const ids = new Set<string>();
    const parsed: ContactMarket[] = [];
    for (let i = 0; i < drafts.length; i += 1) {
      const row = fromDraft(drafts[i], i, ids);
      if (row) parsed.push(row);
    }
    onSave(parsed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage markets</DialogTitle>
          <DialogDescription>
            Pin the suburbs you farm. Contacts appear when they own a linked property in that suburb.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {drafts.map((d, index) => (
            <div key={`${d.id}-${index}`} className="rounded-lg border border-border/60 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Market {index + 1}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={() => moveDraft(index, -1)}
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === drafts.length - 1}
                    onClick={() => moveDraft(index, 1)}
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeDraft(index)}
                    aria-label="Remove market"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`market-label-${index}`}>Display name</Label>
                <Input
                  id={`market-label-${index}`}
                  value={d.label}
                  placeholder="Victoria Point home owners"
                  onChange={(e) => updateDraft(index, { label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`market-suburbs-${index}`}>Suburbs (comma-separated)</Label>
                <Input
                  id={`market-suburbs-${index}`}
                  value={d.suburbsText}
                  placeholder="Victoria Point"
                  onChange={(e) => updateDraft(index, { suburbsText: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`market-state-${index}`}>State</Label>
                <Input
                  id={`market-state-${index}`}
                  value={d.state ?? "QLD"}
                  className="w-24"
                  onChange={(e) => updateDraft(index, { state: e.target.value })}
                />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" className="w-full" onClick={addDraft}>
            <Plus className="h-4 w-4 mr-1" />
            Add market
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save markets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
