import * as React from "react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail, Eye, MousePointer, Users, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts, getPrimaryEmail } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Campaign {
  id: string;
  name: string;
  type: "email" | "drip" | "newsletter";
  status: "active" | "paused" | "completed" | "draft";
  sent: number;
  opened: number;
  clicked: number;
  startDate: string;
}

const initialCampaigns: Campaign[] = [];

function getBroadcastUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-broadcast` : null;
}

const statusColors = {
  active: "bg-success/20 text-success border-success/30",
  paused: "bg-warning/20 text-warning border-warning/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  draft: "bg-muted text-muted-foreground border-muted",
};

export function CampaignManager() {
  const { toast } = useToast();
  const { data: contacts = [] } = useContacts();
  const [campaigns] = useState<Campaign[]>(initialCampaigns);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSegment, setBroadcastSegment] = useState<"all" | "hot">("all");
  const [sending, setSending] = useState(false);

  const emailsToSend = useMemo(() => {
    const filtered = broadcastSegment === "hot"
      ? contacts.filter((c) => c.status === "hot")
      : contacts;
    const withEmail = filtered
      .map((c) => getPrimaryEmail(c) ?? c.email)
      .filter((e): e is string => !!e && e.includes("@"));
    return [...new Set(withEmail)];
  }, [contacts, broadcastSegment]);

  const handleSendBroadcast = async () => {
    if (!broadcastSubject.trim()) {
      toast({ title: "Error", description: "Please enter a subject", variant: "destructive" });
      return;
    }
    if (emailsToSend.length === 0) {
      toast({ title: "Error", description: "No contacts with email addresses", variant: "destructive" });
      return;
    }
    const url = getBroadcastUrl();
    if (!url) {
      toast({ title: "Error", description: "Email service not configured", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Please sign in", variant: "destructive" });
        return;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: emailsToSend,
          subject: broadcastSubject.trim(),
          html: broadcastBody.trim().replace(/\n/g, "<br>") || "<p></p>",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send");
      toast({ title: "Success", description: `Broadcast sent to ${data.sent ?? emailsToSend.length} recipients` });
      setBroadcastOpen(false);
      setBroadcastSubject("");
      setBroadcastBody("");
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const totalSent = campaigns.reduce((acc, c) => acc + c.sent, 0);
  const totalOpened = campaigns.reduce((acc, c) => acc + c.opened, 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  return (
    <>
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Email Campaigns
          </CardTitle>
          <Button size="sm" className="gap-2" onClick={() => setBroadcastOpen(true)}>
            <Plus className="w-4 h-4" />
            Send Broadcast
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-purple-400" />
            <p className="text-xl font-bold">{totalSent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Emails Sent</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <Eye className="w-5 h-5 mx-auto mb-1 text-teal-400" />
            <p className="text-xl font-bold">{avgOpenRate}%</p>
            <p className="text-xs text-muted-foreground">Avg Open Rate</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg text-center">
            <MousePointer className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <p className="text-xl font-bold">{campaigns.filter(c => c.status === "active").length}</p>
            <p className="text-xs text-muted-foreground">Active Campaigns</p>
          </div>
        </div>

        {/* Empty state / Drip coming soon */}
        {campaigns.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-8 px-4 rounded-lg border border-dashed border-white/10">
            <Mail className="w-12 h-12 text-white/40" />
            <div className="text-center space-y-2">
              <p className="text-sm text-white/80 font-medium">Send broadcast emails to your contacts</p>
              <p className="text-xs text-white/60">Select a segment, compose your message, and send to all contacts with email addresses.</p>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setBroadcastOpen(true)}>
              <Plus className="w-4 h-4" /> Send Broadcast
            </Button>
            <p className="text-xs text-white/50">Drip sequences coming soon</p>
          </div>
        )}

        {/* Campaign List */}
        <div className="space-y-2">
          {campaigns.map((campaign) => {
            const openRate = campaign.sent > 0 ? Math.round((campaign.opened / campaign.sent) * 100) : 0;
            const clickRate = campaign.opened > 0 ? Math.round((campaign.clicked / campaign.opened) * 100) : 0;
            
            return (
              <div key={campaign.id} className="p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{campaign.name}</span>
                    <Badge className={cn("text-xs", statusColors[campaign.status])}>
                      {campaign.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {campaign.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {campaign.status === "active" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Pause className="w-3 h-3" />
                      </Button>
                    )}
                    {campaign.status === "paused" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                  <span>Sent: {campaign.sent.toLocaleString()}</span>
                  <span>Opens: {openRate}%</span>
                  <span>Clicks: {clickRate}%</span>
                  <span>Started: {campaign.startDate}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
      <DialogContent className="sm:max-w-[500px] bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Send Broadcast Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Segment</Label>
            <Select value={broadcastSegment} onValueChange={(v: "all" | "hot") => setBroadcastSegment(v)}>
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contacts ({emailsToSend.length})</SelectItem>
                <SelectItem value="hot">Hot leads only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {emailsToSend.length} contact{emailsToSend.length !== 1 ? "s" : ""} with email addresses
            </p>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              className="bg-input"
              placeholder="Email subject"
              value={broadcastSubject}
              onChange={(e) => setBroadcastSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              className="bg-input min-h-[160px]"
              placeholder="Write your message..."
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
            <Button onClick={handleSendBroadcast} disabled={sending || emailsToSend.length === 0}>
              {sending ? "Sending..." : `Send to ${emailsToSend.length}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
