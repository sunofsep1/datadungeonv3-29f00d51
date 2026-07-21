import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Send, Users, FileText, Clock, History, ListPlus, Trash2, Loader2 } from "lucide-react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SegmentedTabsList, SegmentedTabsTrigger } from "@/components/ui/segmented-tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useContacts, getContactDisplayName, type ContactWithMeta } from "@/hooks/useContacts";
import {
  useSmsContactLists,
  useSmsListMembers,
  useSmsScheduledBroadcasts,
  useSmsOutboundHistory,
  useSmsSuiteMutations,
  invokeProcessScheduledSms,
} from "@/hooks/useSmsSuite";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { Link } from "react-router-dom";
import { useUserCommunicationSettings } from "@/hooks/useUserCommunicationSettings";
import { isSignatureUnfilled } from "@/lib/smsTemplateMerge";
import {
  SmsProspectingComposer,
  defaultSmsComposerCustomFields,
  type SmsComposerCustomFields,
} from "@/components/contacts/SmsProspectingComposer";
import { errorMessageFromUnknown } from "@/lib/utils";

function getBroadcastUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-sms-broadcast` : null;
}

export default function SmsSuitePage() {
  const { toast } = useToast();
  const { data: lists = [] } = useSmsContactLists();
  const { data: rawTemplates = [] } = useMessageTemplates("sms");
  const templates = useMemo(
    () =>
      rawTemplates
        .filter((t) => (t.sms_body ?? "").trim())
        .map((t) => ({ id: t.id, name: t.name, body: t.sms_body ?? "" })),
    [rawTemplates],
  );
  const { data: scheduled = [] } = useSmsScheduledBroadcasts();
  const { data: history = [] } = useSmsOutboundHistory(300);
  const { data: contacts = [] } = useContacts();
  const { data: commSettings } = useUserCommunicationSettings();
  const smsSignature = commSettings?.sms_signature ?? "";
  const m = useSmsSuiteMutations();

  const [tab, setTab] = useState("send");
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const out = await invokeProcessScheduledSms();
        if (!cancelled && out.processed > 0) {
          toast({
            title: "Scheduled SMS",
            description: `Processed ${out.processed} due campaign(s).`,
          });
          m.invalidateAll();
        }
      } catch {
        /* silent on first load if fn not deployed */
      }
    })();
    return () => {
      cancelled = true;
    };
    // intentional mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRunDue = async () => {
    setDispatching(true);
    try {
      const out = await invokeProcessScheduledSms();
      toast({
        title: "Scheduled SMS",
        description:
          out.processed === 0 ? "No due campaigns." : `Processed ${out.processed} campaign(s).`,
      });
      m.invalidateAll();
    } catch (e) {
      toast({ title: "Could not run scheduler", description: errorMessageFromUnknown(e), variant: "destructive" });
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
      <PageBreadcrumbs
        items={[
          { label: "Business", href: "/marketing" },
          { label: "Communications", href: "/communications/sms" },
          { label: "SMS suite" },
        ]}
      />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            SMS suite
          </h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            Mass texting from your contact library: lists, saved templates, scheduled campaigns, and send history. Uses the
            same Mobile Message integration as bulk SMS on the Contacts page.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={handleRunDue} disabled={dispatching}>
          {dispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
          Run due scheduled sends
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <SegmentedTabsList className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <SegmentedTabsTrigger value="send" className="inline-flex items-center justify-center gap-1.5 px-2">
            <Send className="h-4 w-4 shrink-0" /> Send
          </SegmentedTabsTrigger>
          <SegmentedTabsTrigger value="lists" className="inline-flex items-center justify-center gap-1.5 px-2">
            <Users className="h-4 w-4 shrink-0" /> Lists
          </SegmentedTabsTrigger>
          <SegmentedTabsTrigger value="templates" className="inline-flex items-center justify-center gap-1.5 px-2">
            <FileText className="h-4 w-4 shrink-0" /> Templates
          </SegmentedTabsTrigger>
          <SegmentedTabsTrigger value="scheduled" className="inline-flex items-center justify-center gap-1.5 px-2">
            <Clock className="h-4 w-4 shrink-0" /> Scheduled
          </SegmentedTabsTrigger>
          <SegmentedTabsTrigger value="history" className="inline-flex items-center justify-center gap-1.5 px-2">
            <History className="h-4 w-4 shrink-0" /> History
          </SegmentedTabsTrigger>
        </SegmentedTabsList>

        <TabsContent value="send">
          <SmsSendPanel
            lists={lists}
            contacts={contacts}
            smsSignature={smsSignature}
            templates={templates}
            onSent={() => m.invalidateAll()}
          />
        </TabsContent>
        <TabsContent value="lists">
          <SmsListsPanel lists={lists} contacts={contacts} mutations={m} />
        </TabsContent>
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Templates now live in Communications</CardTitle>
              <CardDescription>
                Your branded email &amp; SMS templates are managed in one place — with live preview. The Send tab above
                pulls from that same library.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/communications">Open Communications → Templates</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="scheduled">
          <SmsScheduledPanel scheduled={scheduled} mutations={m} />
        </TabsContent>
        <TabsContent value="history">
          <SmsHistoryPanel rows={history} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type ListRow = { id: string; name: string; description: string | null };
type TemplateRow = { id: string; name: string; body: string };
type ScheduledRow = {
  id: string;
  title: string | null;
  message: string;
  scheduled_at: string;
  status: string;
  error: string | null;
  completed_at: string | null;
};

function SmsSendPanel({
  lists,
  contacts,
  smsSignature,
  templates,
  onSent,
}: {
  lists: ListRow[];
  contacts: ContactWithMeta[];
  smsSignature: string;
  templates: TemplateRow[];
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [source, setSource] = useState<"list" | "pick">("list");
  const [listId, setListId] = useState<string>("");
  const { data: listMemberIds = [] } = useSmsListMembers(listId || undefined);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [body, setBody] = useState("");
  const [custom, setCustom] = useState<SmsComposerCustomFields>(() => defaultSmsComposerCustomFields());
  const [includeOptOut, setIncludeOptOut] = useState(true);
  const [sending, setSending] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const m = useSmsSuiteMutations();

  const recipientIds = useMemo(() => {
    if (source === "list") return listMemberIds;
    return [...picked];
  }, [source, listMemberIds, picked]);

  const recipientCount = recipientIds.length;

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const sendNow = async () => {
    if (!body.trim()) {
      toast({ title: "Message required", variant: "destructive" });
      return;
    }
    if (isSignatureUnfilled(body, smsSignature)) {
      toast({
        title: "SMS signature missing",
        description: "Add it under Settings → SMS signature.",
        variant: "destructive",
      });
      return;
    }
    if (recipientCount === 0) {
      toast({ title: "No recipients", variant: "destructive" });
      return;
    }
    const url = getBroadcastUrl();
    if (!url) {
      toast({ title: "SMS not configured", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sign in required", variant: "destructive" });
        return;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact_ids: recipientIds,
          message: body.trim(),
          merge_fields: {
            custom1: custom.custom1,
            custom2: custom.custom2,
            custom3: custom.custom3,
            custom4: custom.custom4,
          },
          append_opt_out_if_missing: includeOptOut,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || res.statusText);
      toast({
        title: "SMS sent",
        description: `${data.sent ?? 0} sent · ${(data.skipped ?? []).length} skipped`,
      });
      onSent();
    } catch (e) {
      toast({ title: "Send failed", description: errorMessageFromUnknown(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const scheduleCampaign = async () => {
    if (!scheduleAt) {
      toast({ title: "Pick date & time", variant: "destructive" });
      return;
    }
    const iso = new Date(scheduleAt).toISOString();
    if (new Date(iso) <= new Date()) {
      toast({ title: "Schedule in the future", variant: "destructive" });
      return;
    }
    try {
      await m.createScheduled.mutateAsync({
        title: scheduleTitle || undefined,
        message: body.trim(),
        merge_fields: {
          custom1: custom.custom1,
          custom2: custom.custom2,
          custom3: custom.custom3,
          custom4: custom.custom4,
        },
        append_opt_out: includeOptOut,
        scheduled_at: iso,
        contact_ids: recipientIds,
      });
      toast({ title: "Campaign scheduled" });
      setScheduleOpen(false);
      setScheduleTitle("");
      setScheduleAt("");
    } catch (e) {
      toast({ title: "Schedule failed", description: errorMessageFromUnknown(e), variant: "destructive" });
    }
  };

  return (
    <Card className="zoho-card border-border">
      <CardHeader>
        <CardTitle>Send messages</CardTitle>
        <CardDescription>
          Choose an SMS list or hand-pick contacts from your library. Merge fields and templates match single-contact SMS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTitle>Compliance</AlertTitle>
          <AlertDescription>
            Marketing-style texts should include an opt-out (we can append &quot;Reply STOP to opt out&quot; when enabled).
            Respect <code className="text-xs">sms_opt_out</code> on contacts — the server skips opted-out numbers.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Recipients</Label>
            <Select value={source} onValueChange={(v) => setSource(v as "list" | "pick")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">SMS list</SelectItem>
                <SelectItem value="pick">Pick contacts</SelectItem>
              </SelectContent>
            </Select>
            {source === "list" && (
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {source === "pick" && (
              <div className="border border-border rounded-md max-h-56 overflow-y-auto p-2 space-y-1 text-sm">
                {contacts.slice(0, 400).map((c) => (
                  <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded px-1">
                    <Checkbox checked={picked.has(c.id)} onCheckedChange={() => togglePick(c.id)} />
                    <span className="truncate">{getContactDisplayName(c)}</span>
                  </label>
                ))}
                {contacts.length > 400 && (
                  <p className="text-xs text-muted-foreground px-1 pt-2">
                    Showing first 400 contacts — use a list for larger sends.
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">Recipients: {recipientCount}</p>
          </div>
          <div className="space-y-2">
            <Label>Apply saved template (optional)</Label>
            <Select
              value="_none"
              onValueChange={(v) => {
                if (v === "_none") return;
                const t = templates.find((x) => x.id === v);
                if (t) setBody(t.body);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Insert template body" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SmsProspectingComposer
          body={body}
          onBodyChange={setBody}
          custom={custom}
          onCustomChange={setCustom}
          includeOptOutIfMissing={includeOptOut}
          onIncludeOptOutIfMissingChange={setIncludeOptOut}
          mergePreviewContext={{
            first_name: "Alex",
            last_name: "",
            name: "Alex",
            signature: smsSignature,
            custom1: custom.custom1,
            custom2: custom.custom2,
            custom3: custom.custom3,
            custom4: custom.custom4,
          }}
        />

        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={() => setScheduleOpen(true)} disabled={recipientCount === 0 || !body.trim()}>
            Schedule for later
          </Button>
          <Button onClick={sendNow} disabled={sending || recipientCount === 0} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send now
          </Button>
        </div>
      </CardContent>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Schedule campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Title (optional)</Label>
              <Input value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} className="bg-input" />
            </div>
            <div>
              <Label>Send at</Label>
              <Input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="bg-input"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Opens the SMS suite or click &quot;Run due scheduled sends&quot; after this time to dispatch (or deploy a
              cron calling <code className="text-[10px]">process-scheduled-sms</code>).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={scheduleCampaign} disabled={m.createScheduled.isPending}>
              {m.createScheduled.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SmsListsPanel({
  lists,
  contacts,
  mutations,
}: {
  lists: ListRow[];
  contacts: ContactWithMeta[];
  mutations: ReturnType<typeof useSmsSuiteMutations>;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [activeList, setActiveList] = useState<string | null>(null);
  const { data: memberIds = [] } = useSmsListMembers(activeList ?? undefined);

  const create = async () => {
    if (!name.trim()) return;
    try {
      await mutations.createList.mutateAsync({ name: name.trim(), description: desc });
      setName("");
      setDesc("");
      toast({ title: "List created" });
    } catch (e) {
      toast({ title: "Failed", description: errorMessageFromUnknown(e), variant: "destructive" });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="zoho-card border-border">
        <CardHeader>
          <CardTitle>Your lists</CardTitle>
          <CardDescription>Segment contacts for campaigns. Add members from your full library.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="List name" value={name} onChange={(e) => setName(e.target.value)} className="bg-input" />
            <Button onClick={create} disabled={mutations.createList.isPending}>
              <ListPlus className="h-4 w-4 mr-1" /> Create
            </Button>
          </div>
          <Input
            placeholder="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="bg-input"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <button
                      type="button"
                      className={`text-left font-medium hover:underline ${activeList === l.id ? "text-primary" : ""}`}
                      onClick={() => setActiveList(l.id)}
                    >
                      {l.name}
                    </button>
                    {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={async () => {
                        if (!confirm(`Delete list "${l.name}"?`)) return;
                        try {
                          await mutations.deleteList.mutateAsync(l.id);
                          if (activeList === l.id) setActiveList(null);
                          toast({ title: "List deleted" });
                        } catch (e) {
                          toast({ title: "Failed", description: errorMessageFromUnknown(e), variant: "destructive" });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {lists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground text-center py-8">
                    No lists yet. Create one to use in Send or Scheduled.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="zoho-card border-border">
        <CardHeader>
          <CardTitle>List members</CardTitle>
          <CardDescription>
            {activeList ? `Add or remove contacts for the selected list.` : "Select a list on the left."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeList ? (
            <ListMemberEditor
              listId={activeList}
              contacts={contacts}
              memberIds={memberIds}
              mutations={mutations}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Select a list to edit members.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ListMemberEditor({
  listId,
  contacts,
  memberIds,
  mutations,
}: {
  listId: string;
  contacts: ContactWithMeta[];
  memberIds: string[];
  mutations: ReturnType<typeof useSmsSuiteMutations>;
}) {
  const { toast } = useToast();
  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return contacts.slice(0, 200);
    return contacts
      .filter((c) => getContactDisplayName(c).toLowerCase().includes(s))
      .slice(0, 200);
  }, [contacts, q]);

  const addOne = async (id: string) => {
    if (memberSet.has(id)) return;
    try {
      await mutations.addListMembers.mutateAsync({ listId, contactIds: [id] });
      toast({ title: "Added to list" });
    } catch (e) {
      toast({ title: "Failed", description: errorMessageFromUnknown(e), variant: "destructive" });
    }
  };

  const removeOne = async (id: string) => {
    try {
      await mutations.removeListMember.mutateAsync({ listId, contactId: id });
      toast({ title: "Removed" });
    } catch (e) {
      toast({ title: "Failed", description: errorMessageFromUnknown(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{memberIds.length} contacts in this list</p>
      <Input placeholder="Search contacts to add…" value={q} onChange={(e) => setQ(e.target.value)} className="bg-input" />
      <div className="border border-border rounded-md max-h-72 overflow-y-auto divide-y divide-border">
        {filtered.map((c) => {
          const inList = memberSet.has(c.id);
          return (
            <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="truncate">{getContactDisplayName(c)}</span>
              {inList ? (
                <Button variant="outline" size="sm" onClick={() => removeOne(c.id)}>
                  Remove
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => addOne(c.id)}>
                  Add
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SmsTemplatesPanel({
  templates,
  mutations,
}: {
  templates: TemplateRow[];
  mutations: ReturnType<typeof useSmsSuiteMutations>;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || !body.trim()) {
      toast({ title: "Name and body required", variant: "destructive" });
      return;
    }
    try {
      await mutations.saveTemplate.mutateAsync({ id: editing ?? undefined, name: name.trim(), body });
      toast({ title: editing ? "Template updated" : "Template saved" });
      setName("");
      setBody("");
      setEditing(null);
    } catch (e) {
      toast({ title: "Failed", description: errorMessageFromUnknown(e), variant: "destructive" });
    }
  };

  return (
    <Card className="zoho-card border-border">
      <CardHeader>
        <CardTitle>Saved templates</CardTitle>
        <CardDescription>
          Reusable bodies for the SMS suite (separate from Nurture). Use merge tags like {"{{first_name}}"},{" "}
          {"{{signature}}"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 max-w-xl">
          <Input
            placeholder="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-input"
          />
          <Textarea
            placeholder="Message body…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="bg-input"
          />
          <div className="flex gap-2">
            <Button onClick={save} disabled={mutations.saveTemplate.isPending}>
              {editing ? "Update" : "Save template"}
            </Button>
            {editing && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setName("");
                  setBody("");
                }}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground text-sm">{t.body}</TableCell>
                <TableCell className="space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(t.id);
                      setName(t.name);
                      setBody(t.body);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={async () => {
                      if (!confirm("Delete template?")) return;
                      try {
                        await mutations.deleteTemplate.mutateAsync(t.id);
                        toast({ title: "Deleted" });
                      } catch (e) {
                        toast({ title: "Failed", description: errorMessageFromUnknown(e), variant: "destructive" });
                      }
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SmsScheduledPanel({
  scheduled,
  mutations,
}: {
  scheduled: ScheduledRow[];
  mutations: ReturnType<typeof useSmsSuiteMutations>;
}) {
  const { toast } = useToast();

  return (
    <Card className="zoho-card border-border">
      <CardHeader>
        <CardTitle>Scheduled campaigns</CardTitle>
        <CardDescription>
          Campaigns are stored with a snapshot of recipients. After the send time, use &quot;Run due scheduled sends&quot;
          (or automate the edge function).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {scheduled.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.title || "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {format(new Date(s.scheduled_at), "d MMM yyyy, h:mm a")}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      s.status === "completed"
                        ? "text-teal"
                        : s.status === "failed"
                          ? "text-destructive"
                          : s.status === "cancelled"
                            ? "text-muted-foreground"
                            : "text-foreground"
                    }
                  >
                    {s.status}
                  </span>
                  {s.error && <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">{s.error}</p>}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{s.message}</TableCell>
                <TableCell>
                  {s.status === "scheduled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await mutations.cancelScheduled.mutateAsync(s.id);
                          toast({ title: "Cancelled" });
                        } catch (e) {
                          toast({ title: "Failed", description: errorMessageFromUnknown(e), variant: "destructive" });
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {scheduled.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No scheduled campaigns. Use Send → Schedule for later.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SmsHistoryPanel({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <Card className="zoho-card border-border">
      <CardHeader>
        <CardTitle>Send history</CardTitle>
        <CardDescription>Recent rows from sms_outbound (same log as bulk send and automations).</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={String(r.id)}>
                <TableCell className="whitespace-nowrap text-sm">
                  {r.created_at ? format(new Date(String(r.created_at)), "d MMM yyyy, h:mm a") : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">{String(r.to_phone ?? "")}</TableCell>
                <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                  {String(r.body_preview ?? "")}
                </TableCell>
                <TableCell>{String(r.status ?? "")}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                  No outbound SMS logged yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
