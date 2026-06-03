import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STAGES = [
  { id: "appraisal", label: "Appraisal / prep" },
  { id: "listing", label: "Listed" },
  { id: "under_contract", label: "Under contract" },
  { id: "unconditional", label: "Unconditional" },
  { id: "settled", label: "Settled" },
  { id: "past_client", label: "Past client" },
] as const;

export function ListingStageAutomationCard() {
  const { user } = useAuth();
  const [stage, setStage] = useState<string>("listing");
  const [smsBody, setSmsBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDays, setTaskDueDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("listing_stage_automations")
        .select("sms_body, email_subject, email_html, task_title, task_due_days")
        .eq("user_id", user.id)
        .eq("pipeline_stage", stage)
        .maybeSingle();
      if (error) throw error;
      setSmsBody(data?.sms_body ?? "");
      setEmailSubject(data?.email_subject ?? "");
      setEmailHtml(data?.email_html ?? "");
      setTaskTitle(data?.task_title ?? "");
      setTaskDueDays(
        data?.task_due_days != null && Number.isFinite(data.task_due_days)
          ? String(data.task_due_days)
          : "",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load rule");
    } finally {
      setLoading(false);
    }
  }, [user?.id, stage]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const dueParsed = taskDueDays.trim() === "" ? null : Number.parseInt(taskDueDays.trim(), 10);
      const taskDueDaysValue =
        dueParsed != null && Number.isFinite(dueParsed) && dueParsed >= 0
          ? Math.min(3650, dueParsed)
          : null;
      const { error } = await supabase.from("listing_stage_automations").upsert(
        {
          user_id: user.id,
          pipeline_stage: stage,
          sms_body: smsBody.trim() || null,
          email_subject: emailSubject.trim() || null,
          email_html: emailHtml.trim() || null,
          task_title: taskTitle.trim() || null,
          task_due_days: taskDueDaysValue,
        },
        { onConflict: "user_id,pipeline_stage" },
      );
      if (error) throw error;
      toast.success("Saved automation for this stage");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("listing_stage_automations")
        .delete()
        .eq("user_id", user.id)
        .eq("pipeline_stage", stage);
      if (error) throw error;
      setSmsBody("");
      setEmailSubject("");
      setEmailHtml("");
      setTaskTitle("");
      setTaskDueDays("");
      toast.success("Removed rule for this stage");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="zoho-card p-6 border-border">
      <div className="flex items-center gap-3 mb-4">
        <GitBranch className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Listing stage automations</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        When you move a listing into a stage on the board, optional SMS (Mobile Message), email (Resend), and/or a listing
        task can run. Messages require a linked contact. Tokens:{" "}
        <code className="text-[10px]">{"{{listing_address}}"}</code>,{" "}
        <code className="text-[10px]">{"{{contact_name}}"}</code>.
      </p>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Pipeline stage</Label>
          <Select value={stage} onValueChange={setStage} disabled={loading}>
            <SelectTrigger className="bg-input max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>SMS body (optional)</Label>
          <Textarea
            className="bg-input min-h-[72px] text-sm"
            placeholder="Hi {{contact_name}}, update on {{listing_address}}…"
            value={smsBody}
            onChange={(e) => setSmsBody(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label>Email subject (optional)</Label>
          <Input
            className="bg-input"
            placeholder="Update on your listing"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label>Email HTML (optional)</Label>
          <Textarea
            className="bg-input min-h-[100px] text-sm font-mono"
            placeholder="<p>Hi {{contact_name}}, …</p>"
            value={emailHtml}
            onChange={(e) => setEmailHtml(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label>Listing task title (optional)</Label>
          <Input
            className="bg-input"
            placeholder="Follow up: {{listing_address}}"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label>Task due in (days, optional)</Label>
          <Input
            type="number"
            min={0}
            className="bg-input max-w-[120px]"
            placeholder="—"
            value={taskDueDays}
            onChange={(e) => setTaskDueDays(e.target.value)}
            disabled={loading}
          />
          <p className="text-[11px] text-muted-foreground">Leave blank for no due date.</p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" onClick={() => void save()} disabled={saving || loading}>
            Save rule
          </Button>
          <Button type="button" variant="outline" onClick={() => void clear()} disabled={saving || loading}>
            Clear this stage
          </Button>
        </div>
      </div>
    </Card>
  );
}
