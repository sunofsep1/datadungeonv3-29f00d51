import { useCallback } from "react";
import { ListChecks, Plus, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { VisionDeskCheckItem } from "@/lib/visionDeskNotes";

type VisionDeskChecklistCardProps = {
  items: VisionDeskCheckItem[];
  onItemsChange: (next: VisionDeskCheckItem[]) => void;
  newItemText: string;
  onNewItemTextChange: (v: string) => void;
  disabled?: boolean;
};

export function VisionDeskChecklistCard({
  items,
  onItemsChange,
  newItemText,
  onNewItemTextChange,
  disabled,
}: VisionDeskChecklistCardProps) {
  const addItem = useCallback(() => {
    const t = newItemText.trim();
    if (!t) return;
    onItemsChange([
      ...items,
      { id: crypto.randomUUID(), text: t, done: false },
    ]);
    onNewItemTextChange("");
  }, [items, newItemText, onItemsChange, onNewItemTextChange]);

  return (
    <Card className="zoho-card border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Next steps</h3>
      </div>
      <p className="text-xs text-muted-foreground">Lightweight checklist stored on this vision card.</p>
      <div className="flex gap-2">
        <Input
          value={newItemText}
          onChange={(e) => onNewItemTextChange(e.target.value)}
          placeholder="Add a step…"
          className="h-9 text-sm"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" size="sm" variant="secondary" className="shrink-0 gap-1" disabled={disabled} onClick={addItem}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No steps yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li key={row.id} className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/15 px-2 py-1.5">
              <Checkbox
                checked={row.done}
                disabled={disabled}
                onCheckedChange={(checked) => {
                  onItemsChange(
                    items.map((x) => (x.id === row.id ? { ...x, done: Boolean(checked) } : x))
                  );
                }}
              />
              <span className={`flex-1 text-sm ${row.done ? "line-through text-muted-foreground" : ""}`}>{row.text}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={disabled}
                onClick={() => onItemsChange(items.filter((x) => x.id !== row.id))}
                aria-label="Remove step"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
