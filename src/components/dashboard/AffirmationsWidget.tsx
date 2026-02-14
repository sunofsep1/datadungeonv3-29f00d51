import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, Plus, Trash2, Heart, ChevronLeft, ChevronRight, List, Quote, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "datadungeon-affirmations";
const DRAG_DATA_KEY = "affirmation-index";

const DEFAULT_AFFIRMATIONS = [
  "I am a top-performing agent who delivers exceptional results.",
  "I attract ideal clients who value my expertise.",
  "Every call I make brings me closer to success.",
  "I am confident, capable, and closing deals.",
  "My pipeline is full of quality opportunities.",
];

function loadAffirmations(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [...DEFAULT_AFFIRMATIONS];
}

function saveAffirmations(list: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function AffirmationsWidget() {
  const [affirmations, setAffirmations] = useState<string[]>(loadAffirmations);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    saveAffirmations(affirmations);
  }, [affirmations]);

  // Keep current index in bounds
  useEffect(() => {
    if (affirmations.length === 0) return;
    setCurrentIndex((i) => Math.min(i, affirmations.length - 1));
  }, [affirmations.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + affirmations.length) % affirmations.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % affirmations.length);
  };

  const handleEditCurrent = () => {
    setEditValue(affirmations[currentIndex] ?? "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editValue.trim()) {
      const next = [...affirmations];
      next[currentIndex] = editValue.trim();
      setAffirmations(next);
    }
    setIsEditing(false);
    setEditValue("");
  };

  const handleAdd = () => {
    setAffirmations([...affirmations, "New affirmation..."]);
    setShowAll(true);
  };

  const handleDelete = (index: number) => {
    if (affirmations.length <= 1) return;
    const next = affirmations.filter((_, i) => i !== index);
    setAffirmations(next);
    if (currentIndex >= next.length) setCurrentIndex(Math.max(0, next.length - 1));
    else if (index < currentIndex) setCurrentIndex((i) => i - 1);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData(DRAG_DATA_KEY, String(index));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIndex(index);
  };

  const handleDragLeave = () => setDropTargetIndex(null);

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DRAG_DATA_KEY);
    if (raw === "") return;
    const from = parseInt(raw, 10);
    if (Number.isNaN(from) || from === targetIndex) {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      return;
    }
    const next = [...affirmations];
    const [item] = next.splice(from, 1);
    next.splice(targetIndex, 0, item);
    setAffirmations(next);
    setCurrentIndex((i) => {
      if (i === from) return targetIndex;
      if (from < targetIndex && i <= targetIndex && i > from) return i - 1;
      if (from > targetIndex && i >= targetIndex && i < from) return i + 1;
      return i;
    });
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const isEmpty = affirmations.length === 0;
  const current = affirmations[currentIndex];

  return (
    <Card className="zoho-card overflow-hidden border border-white/10 shadow-lg">
      <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20">
              <Heart className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground tracking-tight">Today&apos;s Affirmation</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {showAll ? "Drag grip to reorder · Edit or add below" : "Tap arrows to cycle · Manage to edit list"}
              </p>
            </div>
          </div>
          {!showAll && !isEmpty && (
            <Button size="sm" variant="outline" className="gap-2 border-white/20" onClick={() => setShowAll(true)}>
              <List className="h-4 w-4" />
              Manage
            </Button>
          )}
          {showAll && (
            <Button size="sm" variant="ghost" className="gap-2" onClick={() => setShowAll(false)}>
              <Quote className="h-4 w-4" />
              Back to view
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {isEmpty ? (
          <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-8 text-center">
            <p className="text-muted-foreground text-sm mb-4">Add a daily affirmation to stay focused.</p>
            <Button size="sm" className="gap-2" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Add affirmation
            </Button>
          </div>
        ) : !showAll ? (
          <div className="rounded-xl border border-white/10 bg-gradient-to-b from-rose-500/10 to-transparent p-5">
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                  className="bg-background/80 flex-1 border-white/20"
                  autoFocus
                  aria-label="Edit affirmation"
                />
                <Button size="icon" onClick={handleSaveEdit} aria-label="Save">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative group/quote">
                <p className="text-foreground font-medium text-lg leading-relaxed pr-8">
                  &ldquo;{current}&rdquo;
                </p>
                <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover/quote:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleEditCurrent}
                    aria-label="Edit this affirmation"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 border-white/20"
                    onClick={handlePrev}
                    disabled={affirmations.length <= 1}
                    aria-label="Previous affirmation"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentIndex + 1} of {affirmations.length}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 border-white/20"
                    onClick={handleNext}
                    disabled={affirmations.length <= 1}
                    aria-label="Next affirmation"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {affirmations.map((affirmation, index) => (
              <div
                key={index}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border bg-white/[0.03] border-white/10 transition-all",
                  draggedIndex === index && "opacity-50",
                  dropTargetIndex === index && "ring-2 ring-primary/50 ring-offset-2 ring-offset-card"
                )}
              >
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center justify-center h-8 w-8 shrink-0 rounded-md bg-white/10 text-muted-foreground cursor-grab active:cursor-grabbing touch-none hover:bg-white/15"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4 pointer-events-none" />
                </div>
                <span className="flex-1 text-sm text-foreground min-w-0">{affirmation}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(index)}
                  disabled={affirmations.length <= 1}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full mt-2 gap-2 border-white/20" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Add affirmation
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
