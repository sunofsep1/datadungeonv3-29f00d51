import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRef } from "react";
import { Plus, Target, Calendar, Pencil, Trash2, Sparkles, ImageIcon, Upload, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const DRAG_DATA_KEY = "vision-card-id";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const STORAGE_KEY = "datadungeon-vision-board";

interface VisionCard {
  id: string;
  title: string;
  color: string;
  targetDate: string;
  imageUrl?: string;
}

const COLORS = [
  "from-primary/30 to-primary/5 border-primary/40",
  "from-teal-500/30 to-teal-500/5 border-teal-500/40",
  "from-emerald-500/30 to-emerald-500/5 border-emerald-500/40",
  "from-amber-500/30 to-amber-500/5 border-amber-500/40",
  "from-blue-500/30 to-blue-500/5 border-blue-500/40",
  "from-rose-500/30 to-rose-500/5 border-rose-500/40",
];

const DEFAULT_CARDS: VisionCard[] = [
  { id: "1", title: "Close 12 Deals This Year", color: COLORS[0], targetDate: "2026-12-31" },
  { id: "2", title: "Build $5M Portfolio", color: COLORS[1], targetDate: "2027-06-30" },
];

function loadCards(): VisionCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VisionCard[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_CARDS;
}

function saveCards(cards: VisionCard[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // ignore
  }
}

function formatMaxSize(): string {
  const mb = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
  return mb >= 1 ? `${mb}MB` : `${MAX_IMAGE_SIZE_BYTES / 1024}KB`;
}

export function VisionBoard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cards, setCards] = useState<VisionCard[]>(() => loadCards());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<VisionCard | null>(null);
  const [formData, setFormData] = useState({ title: "", color: COLORS[0], targetDate: "", imageUrl: "" });
  const [imageError, setImageError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  useEffect(() => {
    saveCards(cards);
  }, [cards]);

  const handleSave = () => {
    if (!formData.title.trim()) return;

    const payload = {
      ...formData,
      imageUrl: formData.imageUrl.trim() || undefined,
    };
    if (editingCard) {
      setCards(cards.map((c) => (c.id === editingCard.id ? { ...c, ...payload } : c)));
    } else {
      setCards([...cards, { id: Date.now().toString(), ...payload }]);
    }
    setIsDialogOpen(false);
    setEditingCard(null);
    setFormData({ title: "", color: COLORS[0], targetDate: "", imageUrl: "" });
  };

  const handleEdit = (card: VisionCard) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      color: card.color,
      targetDate: card.targetDate,
      imageUrl: card.imageUrl || "",
    });
    setImageError(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCards(cards.filter((c) => c.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedId(cardId);
    e.dataTransfer.setData(DRAG_DATA_KEY, cardId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ""); // required for some browsers
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedId && draggedId !== cardId) setDropTargetId(cardId);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, dropTargetIdParam: string) => {
    e.preventDefault();
    setDropTargetId(null);
    const sourceId = e.dataTransfer.getData(DRAG_DATA_KEY);
    if (!sourceId || sourceId === dropTargetIdParam) return;
    const fromIndex = cards.findIndex((c) => c.id === sourceId);
    const toIndex = cards.findIndex((c) => c.id === dropTargetIdParam);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...cards];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    setCards(next);
  };

  const openAddDialog = () => {
    setEditingCard(null);
    setFormData({ title: "", color: COLORS[0], targetDate: "", imageUrl: "" });
    setImageError(null);
    setIsDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file (JPEG, PNG, GIF, WebP).");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError(`Image is too large. Max size is ${formatMaxSize()}.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFormData((prev) => ({ ...prev, imageUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <Card className="zoho-card overflow-hidden border border-white/10 shadow-lg">
      <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground tracking-tight">Vision Board</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Goals and milestones · Drag grip to reorder</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-2 border-white/20" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            Add vision
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              onDragOver={(e) => handleDragOver(e, card.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, card.id)}
              className={cn(
                "group relative rounded-xl border bg-gradient-to-b overflow-hidden",
                "shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5",
                draggedId === card.id && "opacity-50 scale-[0.98]",
                dropTargetId === card.id && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                card.color
              )}
            >
              {/* Image or placeholder */}
              <div className="aspect-[4/3] w-full relative overflow-hidden">
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <ImageIcon className="w-12 h-12 text-white/30" />
                  </div>
                )}
                {/* Gradient overlay for text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* Drag handle + actions on hover */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleDragStart(e, card.id);
                    }}
                    onDragEnd={handleDragEnd}
                    className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/20 text-white/90 cursor-grab active:cursor-grabbing touch-none"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4 pointer-events-none" />
                  </div>
                  <div className="flex gap-1.5">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-white/90 hover:bg-white text-foreground shadow"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(card);
                    }}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-white/90 hover:bg-destructive/20 text-destructive shadow"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(card.id);
                    }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  </div>
                </div>
                {/* Title and date over image */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Target className="h-4 w-4 text-primary shrink-0 opacity-90" />
                    <p className="font-semibold text-sm leading-tight line-clamp-2 drop-shadow-sm">
                      {card.title}
                    </p>
                  </div>
                  {card.targetDate && (
                    <div className="flex items-center gap-1.5 text-xs text-white/80">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{new Date(card.targetDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Click overlay to edit */}
              <button
                type="button"
                className="absolute inset-0 z-[1]"
                onClick={() => handleEdit(card)}
                aria-label={`Edit ${card.title}`}
              />
            </div>
          ))}
        </div>

        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-white/20 bg-white/[0.02]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No vision cards yet</p>
            <p className="text-xs text-muted-foreground text-center max-w-[240px] mb-4">
              Add goals with images and target dates to keep them front of mind.
            </p>
            <Button variant="outline" className="gap-2 border-white/20" onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              Add your first vision
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[440px] bg-[#242424] border-white/10 shadow-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingCard ? "Edit vision" : "Add vision"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-foreground">Vision / goal *</Label>
              <Input
                placeholder="What do you want to achieve?"
                className="bg-input border-white/10"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Image (max {formatMaxSize()})</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-white/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Choose file
                </Button>
                {formData.imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, imageUrl: "" })}
                  >
                    Clear image
                  </Button>
                )}
              </div>
              <Input
                placeholder="Or paste image URL"
                className="bg-input border-white/10 mt-1"
                value={formData.imageUrl.startsWith("data:") ? "" : formData.imageUrl}
                onChange={(e) => {
                  setFormData({ ...formData, imageUrl: e.target.value });
                  setImageError(null);
                }}
              />
              {formData.imageUrl && formData.imageUrl.startsWith("data:") && (
                <p className="text-xs text-muted-foreground">Image loaded from file.</p>
              )}
              {imageError && <p className="text-xs text-destructive">{imageError}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Target date</Label>
              <Input
                type="date"
                className="bg-input border-white/10"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Card accent</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      "h-9 w-9 rounded-lg border-2 bg-gradient-to-b transition-all",
                      color,
                      formData.color === color ? "ring-2 ring-primary ring-offset-2 ring-offset-[#242424]" : "opacity-80 hover:opacity-100"
                    )}
                    aria-label="Select color"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/20">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.title.trim()}>
              {editingCard ? "Update" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
