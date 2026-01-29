import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, Plus, Trash2, Heart, RefreshCw } from "lucide-react";

const DEFAULT_AFFIRMATIONS = [
  "I am a top-performing agent who delivers exceptional results.",
  "I attract ideal clients who value my expertise.",
  "Every call I make brings me closer to success.",
  "I am confident, capable, and closing deals.",
  "My pipeline is full of quality opportunities.",
];

export function AffirmationsWidget() {
  const [affirmations, setAffirmations] = useState<string[]>(DEFAULT_AFFIRMATIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showAll, setShowAll] = useState(false);

  const handleRotate = () => {
    setCurrentIndex((prev) => (prev + 1) % affirmations.length);
  };

  const handleEditCurrent = () => {
    setEditValue(affirmations[currentIndex]);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editValue.trim()) {
      const newAffirmations = [...affirmations];
      newAffirmations[currentIndex] = editValue.trim();
      setAffirmations(newAffirmations);
    }
    setIsEditing(false);
    setEditValue("");
  };

  const handleAdd = () => {
    setAffirmations([...affirmations, "New affirmation..."]);
    setCurrentIndex(affirmations.length);
  };

  const handleDelete = (index: number) => {
    if (affirmations.length <= 1) return;
    const newAffirmations = affirmations.filter((_, i) => i !== index);
    setAffirmations(newAffirmations);
    if (currentIndex >= newAffirmations.length) {
      setCurrentIndex(0);
    }
  };

  return (
    <Card className="zoho-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" />
          <h3 className="font-semibold text-white">Today's Affirmation</h3>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleRotate}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowAll(!showAll)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!showAll ? (
        <div className="relative bg-white/5 rounded-lg p-4 border border-white/10">
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-input flex-1"
                autoFocus
              />
              <Button size="icon" onClick={handleSaveEdit}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <p className="text-white font-medium italic">
                "{affirmations[currentIndex]}"
              </p>
              <button
                onClick={handleEditCurrent}
                className="absolute top-2 right-2 p-1 opacity-0 hover:opacity-100 transition-opacity"
              >
                <Pencil className="w-3 h-3 text-white/50" />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {affirmations.map((affirmation, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
              <span className="text-xs text-white/50 w-6">{index + 1}.</span>
              <span className="flex-1 text-sm text-white">{affirmation}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => handleDelete(index)}
                disabled={affirmations.length <= 1}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full mt-2" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Affirmation
          </Button>
        </div>
      )}
    </Card>
  );
}
