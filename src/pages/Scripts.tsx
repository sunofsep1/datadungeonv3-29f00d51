import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Script {
  id: string;
  title: string;
  content: string;
}

export default function Scripts() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newScript, setNewScript] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSaveScript = () => {
    if (!newScript.title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }

    if (editingId) {
      setScripts(scripts.map(s => s.id === editingId ? { ...newScript, id: editingId } : s));
      toast({ title: "Success", description: "Script updated!" });
    } else {
      const script: Script = {
        id: Date.now().toString(),
        ...newScript,
      };
      setScripts([script, ...scripts]);
      toast({ title: "Success", description: "Script created!" });
    }

    setNewScript({ title: "", content: "" });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (script: Script) => {
    setNewScript({ title: script.title, content: script.content });
    setEditingId(script.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setScripts(scripts.filter(s => s.id !== id));
    toast({ title: "Deleted", description: "Script removed" });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Scripts & Dialogues"
        description="Manage your call scripts and conversation templates"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setNewScript({ title: "", content: "" });
              setEditingId(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Script
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-[#242424] border-white/10">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Script" : "Create New Script"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Script Title *</Label>
                  <Input
                    placeholder="e.g., Cold Call Introduction"
                    className="bg-input"
                    value={newScript.title}
                    onChange={(e) => setNewScript({ ...newScript, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Script Content</Label>
                  <Textarea
                    placeholder="Write your script here..."
                    className="bg-input min-h-[200px]"
                    value={newScript.content}
                    onChange={(e) => setNewScript({ ...newScript, content: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveScript}>{editingId ? "Update" : "Create"} Script</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scripts.map((script) => (
          <Card key={script.id} className="zoho-card p-4 border-white/10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{script.title}</h3>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(script)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(script.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-white/60 line-clamp-4">
              {script.content || "No content yet..."}
            </p>
          </Card>
        ))}
      </div>

      {scripts.length === 0 && (
        <div className="text-center py-12 text-white/60">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No scripts yet. Create your first call script!</p>
        </div>
      )}
    </div>
  );
}
