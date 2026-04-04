import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Copy, Webhook } from "lucide-react";

function copyText(label: string, value: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error("Could not copy")
  );
}

export function InboundLeadWebhookHelp() {
  const { user } = useAuth();
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const endpoint = base ? `${base}/functions/v1/inbound-lead` : "";
  const ownerId = user?.id ?? "";

  return (
    <div className="flex items-start gap-3 pt-2 border-t border-border">
      <Webhook className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 space-y-3 flex-1">
        <div>
          <p className="text-sm font-medium text-foreground">Inbound lead webhook</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            POST JSON from Zapier, Make, or your website. Set secret{" "}
            <code className="text-[10px]">INBOUND_WEBHOOK_SECRET</code> in Supabase → Edge Functions → Secrets, then send{" "}
            <code className="text-[10px]">Authorization: Bearer &lt;secret&gt;</code>. Include{" "}
            <code className="text-[10px]">owner_user_id</code> below so leads attach to you.
          </p>
        </div>
        {endpoint ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Endpoint</Label>
            <div className="flex gap-2">
              <Input readOnly value={endpoint} className="bg-input font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => copyText("URL", endpoint)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400">Set VITE_SUPABASE_URL in your env to show the endpoint.</p>
        )}
        {ownerId ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Your owner_user_id (for JSON body)</Label>
            <div className="flex gap-2">
              <Input readOnly value={ownerId} className="bg-input font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => copyText("User id", ownerId)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
