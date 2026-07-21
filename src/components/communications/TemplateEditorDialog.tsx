import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TemplatePreview } from "@/components/communications/TemplatePreview";
import {
  useMessageTemplateMutations,
  type MessageTemplate,
  type MessageTemplateChannel,
} from "@/hooks/useMessageTemplates";

const CATEGORIES = ["appraisal", "follow-up", "listing", "buyer", "nurture", "farming", "admin", "general"];

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MessageTemplate | null;
}

export function TemplateEditorDialog({ open, onOpenChange, template }: TemplateEditorDialogProps) {
  const { toast } = useToast();
  const { create, update } = useMessageTemplateMutations();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [channel, setChannel] = useState<MessageTemplateChannel>("both");
  const [eyebrow, setEyebrow] = useState("");
  const [heading, setHeading] = useState("");
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smsBody, setSmsBody] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setCategory(template?.category ?? "general");
    setChannel(template?.channel ?? "both");
    setEyebrow(template?.email_eyebrow ?? "");
    setHeading(template?.email_heading ?? "");
    setSubject(template?.email_subject ?? "");
    setEmailBody(template?.email_body ?? "");
    setSmsBody(template?.sms_body ?? "");
  }, [open, template]);

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Give the template a name.", variant: "destructive" });
      return;
    }
    const payload = {
      name: name.trim(),
      category,
      channel,
      email_eyebrow: eyebrow.trim() || null,
      email_heading: heading.trim() || null,
      email_subject: subject.trim() || null,
      email_body: emailBody.trim() || null,
      sms_body: smsBody.trim() || null,
    };
    try {
      if (template) {
        await update.mutateAsync({ id: template.id, ...payload });
        toast({ title: "Template updated" });
      } else {
        await create.mutateAsync(payload);
        toast({ title: "Template created" });
      }
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Save failed", variant: "destructive" });
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle>{template ? "Edit template" : "New template"}</DialogTitle>
          <DialogDescription>
            Use {"{{first_name}}"} for the client's name. Write manual fill-ins as [property address], [suburb], [time],
            [price] — you complete these in the composer before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2 mt-2">
          {/* Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Name</Label>
                <Input className="bg-input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as MessageTemplateChannel)}>
                  <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Email + SMS</SelectItem>
                    <SelectItem value="email">Email only</SelectItem>
                    <SelectItem value="sms">SMS only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(channel === "email" || channel === "both") && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Eyebrow (small gold label)</Label>
                    <Input className="bg-input" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Your Free Appraisal" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Heading</Label>
                    <Input className="bg-input" value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Thank you, {{first_name}}." />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subject</Label>
                  <Input className="bg-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Body (blank line = new paragraph)</Label>
                  <Textarea className="bg-input min-h-[160px]" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
                </div>
              </div>
            )}

            {(channel === "sms" || channel === "both") && (
              <div className="space-y-1 rounded-lg border border-border p-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SMS text</Label>
                <Textarea className="bg-input min-h-[90px]" value={smsBody} onChange={(e) => setSmsBody(e.target.value)} />
                <p className="text-xs text-muted-foreground">{smsBody.length} chars · ~{smsBody.length === 0 ? 0 : Math.ceil(smsBody.length / 153)} segment(s)</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : template ? "Save changes" : "Create template"}</Button>
            </div>
          </div>

          {/* Preview */}
          <div className="md:border-l md:border-border md:pl-6">
            <TemplatePreview
              channel={channel}
              eyebrow={eyebrow}
              heading={heading}
              subject={subject}
              emailBody={emailBody}
              smsBody={smsBody}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
