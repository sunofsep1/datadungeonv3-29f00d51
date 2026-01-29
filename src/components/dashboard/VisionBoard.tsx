import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Target, Calendar, Pencil, Trash2, Sparkles } from "lucide-react";

interface VisionCard {
  id: string;
  title: string;
  color: string;
  targetDate: string;
}

const COLORS = [
  "bg-primary/20 border-primary/50",
  "bg-teal/20 border-teal/50",
  "bg-success/20 border-success/50",
  "bg-warning/20 border-warning/50",
  "bg-info/20 border-info/50",
  "bg-destructive/20 border-destructive/50",
];

export function VisionBoard() {
  const [cards, setCards] = useState<VisionCard[]>([
    { id: "1", title: "Close 12 Deals This Year", color: COLORS[0], targetDate: "2026-12-31" },
    { id: "2", title: "Build $5M Portfolio", color: COLORS[1], targetDate: "2027-06-30" },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<VisionCard | null>(null);
  const [formData, setFormData] = useState({ title: "", color: COLORS[0], targetDate: "" });

  const handleSave = () => {
    if (!formData.title.trim()) return;
    
    if (editingCard) {
      setCards(cards.map(c => c.id === editingCard.id ? { ...c, ...formData } : c));
    } else {
      setCards([...cards, { id: Date.now().toString(), ...formData }]);
    }
    setIsDialogOpen(false);
    setEditingCard(null);
    setFormData({ title: "", color: COLORS[0], targetDate: "" });
  };

  const handleEdit = (card: VisionCard) => {
    setEditingCard(card);
    setFormData({ title: card.title, color: card.color, targetDate: card.targetDate });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
  };

  return (
    <Card className="zoho-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 zoho-accent" />
          <h3 className="font-semibold text-white">Vision Board</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setEditingCard(null); setFormData({ title: "", color: COLORS[0], targetDate: "" }); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`relative p-3 rounded-lg border ${card.color} group`}
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={() => handleEdit(card)} className="p-1 hover:bg-background/50 rounded">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => handleDelete(card.id)} className="p-1 hover:bg-background/50 rounded text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <Target className="w-4 h-4 mb-2 zoho-accent" />
            <p className="text-sm font-medium text-white line-clamp-2">{card.title}</p>
            {card.targetDate && (
              <div className="flex items-center gap-1 mt-2 text-xs text-white/60">
                <Calendar className="w-3 h-3" />
                {new Date(card.targetDate).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {cards.length === 0 && (
        <div className="text-center py-6 text-white/60">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Add your first vision card</p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
          <DialogHeader>
            <DialogTitle>{editingCard ? "Edit Vision" : "Add Vision"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Vision / Goal *</Label>
              <Input
                placeholder="What do you want to achieve?"
                className="bg-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input
                type="date"
                className="bg-input"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-lg border-2 ${color} ${formData.color === color ? "ring-2 ring-primary" : ""}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingCard ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
