import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar, DollarSign, Users, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  status: "planning" | "active" | "completed" | "cancelled";
  type: "outreach" | "nurture" | "retention";
  startDate: string;
  budget: number;
  contacts: number;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState<{ name: string; type: Campaign["type"]; status: Campaign["status"]; startDate: string; budget: string; contacts: string }>({ name: "", type: "outreach", status: "planning", startDate: "", budget: "", contacts: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    planning: campaigns.filter((c) => c.status === "planning").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
  };

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveCampaign = () => {
    if (!newCampaign.name.trim()) {
      toast({ title: "Error", description: "Please enter a campaign name", variant: "destructive" });
      return;
    }

    if (editingId) {
      setCampaigns(campaigns.map(c => c.id === editingId ? {
        ...c,
        name: newCampaign.name,
        type: newCampaign.type,
        status: newCampaign.status,
        startDate: newCampaign.startDate,
        budget: Number(newCampaign.budget) || 0,
        contacts: Number(newCampaign.contacts) || 0,
      } : c));
      toast({ title: "Success", description: "Campaign updated!" });
    } else {
      const campaign: Campaign = {
        id: Date.now().toString(),
        name: newCampaign.name,
        type: newCampaign.type,
        status: newCampaign.status,
        startDate: newCampaign.startDate,
        budget: Number(newCampaign.budget) || 0,
        contacts: Number(newCampaign.contacts) || 0,
      };
      setCampaigns([campaign, ...campaigns]);
      toast({ title: "Success", description: "Campaign created!" });
    }

    setNewCampaign({ name: "", type: "outreach", status: "planning", startDate: "", budget: "", contacts: "" });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (campaign: Campaign) => {
    setNewCampaign({
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      startDate: campaign.startDate,
      budget: campaign.budget.toString(),
      contacts: campaign.contacts.toString(),
    });
    setEditingId(campaign.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
    toast({ title: "Deleted", description: "Campaign removed" });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Campaigns"
        description="Manage your marketing campaigns"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setNewCampaign({ name: "", type: "outreach", status: "planning", startDate: "", budget: "", contacts: "" });
              setEditingId(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] bg-popover border-border">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Campaign" : "New Campaign"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Campaign Name *</Label>
                  <Input
                    placeholder="Campaign name"
                    className="bg-input"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newCampaign.type}
                      onValueChange={(value: Campaign["type"]) => setNewCampaign({ ...newCampaign, type: value })}
                    >
                      <SelectTrigger className="bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outreach">Outreach</SelectItem>
                        <SelectItem value="nurture">Nurture</SelectItem>
                        <SelectItem value="retention">Retention</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={newCampaign.status}
                      onValueChange={(value: Campaign["status"]) => setNewCampaign({ ...newCampaign, status: value })}
                    >
                      <SelectTrigger className="bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    className="bg-input"
                    value={newCampaign.startDate}
                    onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      className="bg-input"
                      value={newCampaign.budget}
                      onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Contacts</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      className="bg-input"
                      value={newCampaign.contacts}
                      onChange={(e) => setNewCampaign({ ...newCampaign, contacts: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveCampaign}>{editingId ? "Update" : "Create"} Campaign</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard value={stats.total} label="Total Campaigns" variant="total" />
        <StatCard value={stats.active} label="Active" variant="active" />
        <StatCard value={stats.planning} label="Planning" variant="planning" />
        <StatCard value={stats.completed} label="Completed" variant="completed" />
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          className="pl-10 bg-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Campaigns List */}
      <div className="space-y-3">
        {filteredCampaigns.map((campaign) => (
          <div key={campaign.id} className="campaign-row">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground">{campaign.name}</span>
                <StatusBadge variant={campaign.status}>{campaign.status}</StatusBadge>
                <StatusBadge variant="outreach">{campaign.type}</StatusBadge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {campaign.startDate}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {formatCurrency(campaign.budget)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {campaign.contacts} contacts
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(campaign)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(campaign.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No campaigns found. Create your first campaign!</p>
        </div>
      )}
    </div>
  );
}
