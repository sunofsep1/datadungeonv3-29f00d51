import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Target, Calendar, Pencil, Trash2, Sparkles, ImageIcon, Upload, GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DRAG_DATA_KEY = "vision-card-id";
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

interface VisionCard {
  id: string;
  title: string;
  color: string;
  target_date: string | null;
  image_url: string | null;
  image_path?: string | null;
  sort_order: number;
}

const COLORS = [
  "from-primary/30 to-primary/5 border-primary/40",
  "from-teal-500/30 to-teal-500/5 border-teal-500/40",
  "from-emerald-500/30 to-emerald-500/5 border-emerald-500/40",
  "from-amber-500/30 to-amber-500/5 border-amber-500/40",
  "from-blue-500/30 to-blue-500/5 border-blue-500/40",
  "from-rose-500/30 to-rose-500/5 border-rose-500/40",
];

function formatMaxSize(): string {
  const mb = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
  return mb >= 1 ? `${mb}MB` : `${MAX_IMAGE_SIZE_BYTES / 1024}KB`;
}

/** Extract storage path from a Supabase signed URL so we can create a fresh signed URL. */
function parseStoragePathFromSignedUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url || typeof url !== "string") return null;
  const marker = `/object/sign/${bucket}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const start = i + marker.length;
  const end = url.indexOf("?", start);
  const path = end === -1 ? url.slice(start) : url.slice(start, end);
  return path ? decodeURIComponent(path) : null;
}

export function VisionBoard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cards, setCards] = useState<VisionCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<VisionCard | null>(null);
  const [formData, setFormData] = useState({ title: "", color: COLORS[0], targetDate: "", imageUrl: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [loadedImageIds, setLoadedImageIds] = useState<Set<string>>(new Set());

  const fetchCards = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("vision_board_items")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch vision board:", error);
      setIsLoading(false);
      return;
    }

    const rows = (data ?? []) as VisionCard[];
    const SIGNED_URL_EXPIRY = 60 * 60 * 24;

    const withFreshUrls = await Promise.all(
      rows.map(async (card) => {
        const path = card.image_path ?? parseStoragePathFromSignedUrl(card.image_url, "vision-board");
        if (path) {
          const { data: urlData } = await supabase.storage
            .from("vision-board")
            .createSignedUrl(path, SIGNED_URL_EXPIRY);
          return { ...card, image_url: urlData?.signedUrl ?? card.image_url };
        }
        return card;
      })
    );

    setCards(withFreshUrls);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const cardsImageKey = useMemo(
    () => cards.map((c) => `${c.id}:${c.image_url ?? ""}`).join(","),
    [cards]
  );
  useEffect(() => {
    setLoadedImageIds(new Set());
  }, [cardsImageKey]);

  const uploadImage = async (file: File): Promise<{ url: string; path: string } | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("vision-board").upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
      return null;
    }
    const { data: urlData, error: urlError } = await supabase.storage
      .from("vision-board")
      .createSignedUrl(path, 60 * 60 * 24);
    if (urlError || !urlData?.signedUrl) {
      console.error("Signed URL error:", urlError);
      toast.error("Failed to get image URL");
      return null;
    }
    return { url: urlData.signedUrl, path };
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !user) return;
    setIsSaving(true);

    let imageUrl = formData.imageUrl.trim() || null;

    let imagePath: string | null = null;
    if (selectedFile) {
      const uploaded = await uploadImage(selectedFile);
      if (uploaded) {
        imageUrl = uploaded.url;
        imagePath = uploaded.path;
      } else {
        setIsSaving(false);
        return;
      }
    }

    if (editingCard) {
      const { error } = await supabase
        .from("vision_board_items")
        .update({
          title: formData.title.trim(),
          color: formData.color,
          target_date: formData.targetDate || null,
          image_url: imageUrl,
          ...(imagePath !== null && { image_path: imagePath }),
        })
        .eq("id", editingCard.id);

      if (error) {
        toast.error("Failed to update vision card");
        console.error(error);
      }
    } else {
      const { error } = await supabase
        .from("vision_board_items")
        .insert({
          user_id: user.id,
          title: formData.title.trim(),
          color: formData.color,
          target_date: formData.targetDate || null,
          image_url: imageUrl,
          image_path: imagePath ?? undefined,
          sort_order: cards.length,
        });

      if (error) {
        toast.error("Failed to add vision card");
        console.error(error);
      }
    }

    setIsSaving(false);
    setIsDialogOpen(false);
    setEditingCard(null);
    setSelectedFile(null);
    setFormData({ title: "", color: COLORS[0], targetDate: "", imageUrl: "" });
    fetchCards();
  };

  const handleEdit = (card: VisionCard) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      color: card.color,
      targetDate: card.target_date ?? "",
      imageUrl: card.image_url ?? "",
    });
    setSelectedFile(null);
    setImageError(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vision_board_items").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete vision card");
      return;
    }
    setCards(cards.filter((c) => c.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedId(cardId);
    e.dataTransfer.setData(DRAG_DATA_KEY, cardId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
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

  const handleDrop = async (e: React.DragEvent, dropTargetIdParam: string) => {
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

    // Update sort_order in DB
    const updates = next.map((card, i) =>
      supabase.from("vision_board_items").update({ sort_order: i }).eq("id", card.id)
    );
    await Promise.all(updates);
  };

  const openAddDialog = () => {
    setEditingCard(null);
    setFormData({ title: "", color: COLORS[0], targetDate: "", imageUrl: "" });
    setSelectedFile(null);
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
    setSelectedFile(file);
    // Show preview
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <Card className="zoho-card overflow-hidden border border-border shadow-lg">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
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
          <Button size="sm" variant="outline" className="gap-2 border-border" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            Add vision
          </Button>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                <div className="aspect-[4/3] w-full relative overflow-hidden bg-muted/50">
                  {card.image_url ? (
                    <>
                      {!loadedImageIds.has(card.id) && (
                        <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden />
                      )}
                      <img
                        src={card.image_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className={cn(
                          "absolute inset-0 w-full h-full object-cover transition-opacity duration-200",
                          loadedImageIds.has(card.id) ? "opacity-100" : "opacity-0"
                        )}
                        onLoad={() => setLoadedImageIds((prev) => new Set(prev).add(card.id))}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          setLoadedImageIds((prev) => new Set(prev).add(card.id));
                        }}
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <ImageIcon className="w-12 h-12 text-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, card.id);
                      }}
                      onDragEnd={handleDragEnd}
                      className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted text-foreground cursor-grab active:cursor-grabbing touch-none"
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
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-foreground">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Target className="h-4 w-4 text-primary shrink-0 opacity-90" />
                      <p className="font-semibold text-sm leading-tight line-clamp-2 drop-shadow-sm">
                        {card.title}
                      </p>
                    </div>
                    {card.target_date && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{new Date(card.target_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="absolute inset-0 z-[1]"
                  onClick={() => navigate(`/vision/${card.id}`)}
                  aria-label={`Open ${card.title}`}
                />
              </div>
            ))}
          </div>
        )}

        {!isLoading && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No vision cards yet</p>
            <p className="text-xs text-muted-foreground text-center max-w-[240px] mb-4">
              Add goals with images and target dates to keep them front of mind.
            </p>
            <Button variant="outline" className="gap-2 border-border" onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              Add your first vision
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[440px] bg-card border-border shadow-2xl" aria-describedby={undefined}>
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
                className="bg-input border-border"
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
                  className="gap-2 border-border"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Choose file
                </Button>
                {(formData.imageUrl || selectedFile) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFormData({ ...formData, imageUrl: "" });
                      setSelectedFile(null);
                    }}
                  >
                    Clear image
                  </Button>
                )}
              </div>
              <Input
                placeholder="Or paste image URL"
                className="bg-input border-border mt-1"
                value={formData.imageUrl.startsWith("data:") ? "" : formData.imageUrl}
                onChange={(e) => {
                  setFormData({ ...formData, imageUrl: e.target.value });
                  setSelectedFile(null);
                  setImageError(null);
                }}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">Image loaded from file: {selectedFile.name}</p>
              )}
              {imageError && <p className="text-xs text-destructive">{imageError}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Target date</Label>
              <Input
                type="date"
                className="bg-input border-border"
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
                      formData.color === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100"
                    )}
                    aria-label="Select color"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.title.trim() || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingCard ? "Update" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
