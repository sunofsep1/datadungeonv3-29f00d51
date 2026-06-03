import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Phone, Mail, Calendar, UserPlus, Filter, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeads, useCreateLead } from "@/hooks/useLeads";
import { formatDistanceToNow } from "date-fns";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  contacted: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  qualified: "bg-green-500/20 text-green-400 border-green-500/30",
  nurturing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30",
};

function statusBadgeClass(status: string | null): string {
  const key = (status ?? "new").toLowerCase();
  return STATUS_STYLES[key] ?? "bg-muted/60 text-muted-foreground border-border";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0]!)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

export function ProspectingLeads() {
  const { data: leads = [], isLoading } = useLeads();
  const createLead = useCreateLead();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: "" });

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) {
      if (l.status?.trim()) set.add(l.status.trim());
    }
    ["new", "contacted", "qualified", "nurturing", "lost"].forEach((s) => set.add(s));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch =
        !q ||
        lead.name.toLowerCase().includes(q) ||
        (lead.email ?? "").toLowerCase().includes(q) ||
        (lead.phone ?? "").toLowerCase().includes(q) ||
        (lead.source ?? "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || (lead.status ?? "new").toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  const submitAdd = () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    createLead.mutate(
      {
        name,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        source: form.source.trim() || null,
        status: "new",
      },
      {
        onSuccess: () => {
          toast.success("Lead added");
          setForm({ name: "", email: "", phone: "", source: "" });
          setAddOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add lead"),
      },
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Lead pipeline
          </CardTitle>
          <Button type="button" size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Add lead
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9 bg-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-input">
              <Filter className="w-4 h-4 mr-2 shrink-0" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading leads…
          </div>
        ) : filteredLeads.length === 0 ? (
          <p className="text-center py-10 text-sm text-muted-foreground">
            {leads.length === 0
              ? "No leads yet. Add one or import a CSV from Settings → Integrations."
              : "No leads match your filters."}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex flex-wrap items-center gap-3 p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {initials(lead.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{lead.name}</span>
                    <Badge variant="outline" className={cn("text-xs font-normal", statusBadgeClass(lead.status))}>
                      {lead.status ?? "new"}
                    </Badge>
                    {lead.contact_id ? (
                      <Badge variant="secondary" className="text-xs font-normal">
                        In CRM
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {lead.source ? <span>Source: {lead.source}</span> : null}
                    <span>Added {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                    {lead.email ? <span className="truncate max-w-[200px]">{lead.email}</span> : null}
                    {lead.phone ? <span>{formatPhoneDisplay(lead.phone)}</span> : null}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {lead.phone ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`tel:${lead.phone.replace(/\s/g, "")}`} aria-label="Call">
                        <Phone className="w-4 h-4" />
                      </a>
                    </Button>
                  ) : null}
                  {lead.email ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`mailto:${encodeURIComponent(lead.email)}`} aria-label="Email">
                        <Mail className="w-4 h-4" />
                      </a>
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to="/dashboard" aria-label="Open calendar">
                      <Calendar className="w-4 h-4" />
                    </Link>
                  </Button>
                  {lead.contact_id ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link to={`/contacts/${lead.contact_id}`} aria-label="Open contact">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                className="bg-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                className="bg-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                className="bg-input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input
                className="bg-input"
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="e.g. website, open home"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitAdd()} disabled={createLead.isPending}>
              {createLead.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
