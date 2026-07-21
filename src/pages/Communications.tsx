import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Mail, MessageSquare, Plus, Copy, Pencil, Trash2, FileText, History } from "lucide-react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SegmentedTabsList, SegmentedTabsTrigger } from "@/components/ui/segmented-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useMessageTemplates,
  useMessageTemplateMutations,
  type MessageTemplate,
} from "@/hooks/useMessageTemplates";
import { useCommunicationsHistory } from "@/hooks/useCommunicationsHistory";
import { TemplateEditorDialog } from "@/components/communications/TemplateEditorDialog";

function ChannelBadge({ channel }: { channel: string }) {
  const label = channel === "email" ? "Email" : channel === "sms" ? "SMS" : "Email + SMS";
  return <Badge variant="secondary" className="text-[10px]">{label}</Badge>;
}

function TemplatesTab() {
  const { toast } = useToast();
  const { data: templates = [], isLoading } = useMessageTemplates(undefined, true);
  const { duplicate, remove, toggleActive } = useMessageTemplateMutations();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, MessageTemplate[]>();
    for (const t of templates) {
      const arr = m.get(t.category) ?? [];
      arr.push(t);
      m.set(t.category, arr);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [templates]);

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (t: MessageTemplate) => { setEditing(t); setEditorOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} templates · your voice, your branding</p>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New template</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {grouped.map(([category, list]) => (
        <Card key={category}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm capitalize">{category}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {list.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate ${t.is_active ? "" : "text-muted-foreground line-through"}`}>{t.name}</span>
                      <ChannelBadge channel={t.channel} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{t.email_subject || t.sms_body || ""}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => toggleActive.mutate({ id: t.id, is_active: !t.is_active })}>
                      {t.is_active ? "Active" : "Off"}
                    </Button>
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" title="Duplicate" onClick={() => duplicate.mutate(t)}><Copy className="h-4 w-4" /></Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete template "${t.name}"?`)) {
                          remove.mutate(t.id, { onSuccess: () => toast({ title: "Template deleted" }) });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <TemplateEditorDialog open={editorOpen} onOpenChange={setEditorOpen} template={editing} />
    </div>
  );
}

function HistoryTab() {
  const { data: items = [], isLoading } = useCommunicationsHistory();
  const [channel, setChannel] = useState<"all" | "email" | "sms">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((i) => {
      if (channel !== "all" && i.channel !== channel) return false;
      if (!query) return true;
      return (
        i.toLabel.toLowerCase().includes(query) ||
        (i.subject ?? "").toLowerCase().includes(query) ||
        i.preview.toLowerCase().includes(query)
      );
    });
  }, [items, channel, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={channel} onValueChange={(v) => setChannel(v as "all" | "email" | "sms")}>
          <SelectTrigger className="w-40 bg-input"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <Input className="max-w-xs bg-input" placeholder="Search name, subject, text…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} sent</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">When</TableHead>
                <TableHead className="w-20">Channel</TableHead>
                <TableHead className="w-40">To</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-20">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground text-sm">Loading…</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground text-sm">No messages yet.</TableCell></TableRow>
              )}
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs text-muted-foreground">{i.when ? format(new Date(i.when), "d MMM, h:mma") : ""}</TableCell>
                  <TableCell>
                    {i.channel === "email"
                      ? <span className="inline-flex items-center gap-1 text-xs"><Mail className="h-3 w-3" /> Email</span>
                      : <span className="inline-flex items-center gap-1 text-xs"><MessageSquare className="h-3 w-3" /> SMS</span>}
                  </TableCell>
                  <TableCell className="text-sm truncate">{i.toLabel}</TableCell>
                  <TableCell className="text-sm">
                    {i.subject && <span className="font-medium">{i.subject} · </span>}
                    <span className="text-muted-foreground">{i.preview}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={i.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{i.status ?? "sent"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Communications() {
  const [tab, setTab] = useState("templates");
  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-6xl mx-auto">
      <PageBreadcrumbs items={[{ label: "Communications" }, { label: "Templates & history" }]} />
      <div>
        <h1 className="text-2xl font-semibold">Communications</h1>
        <p className="text-sm text-muted-foreground">Your branded email &amp; SMS templates, and everything you've sent — in one place.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <SegmentedTabsList className="grid-cols-2 max-w-sm">
          <SegmentedTabsTrigger value="templates" className="inline-flex items-center justify-center gap-1.5">
            <FileText className="h-4 w-4" /> Templates
          </SegmentedTabsTrigger>
          <SegmentedTabsTrigger value="history" className="inline-flex items-center justify-center gap-1.5">
            <History className="h-4 w-4" /> History
          </SegmentedTabsTrigger>
        </SegmentedTabsList>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}
