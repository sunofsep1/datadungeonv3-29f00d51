import { Code2 } from "lucide-react";

const EDGE_FUNCTIONS = [
  "process-workflows — advance CRM workflow enrollments (cron)",
  "inbound-lead — webhook for portal / form leads",
  "send-sms — transactional SMS",
  "send-broadcast — bulk SMS campaigns",
  "appointment-reminders — email/SMS before appointments",
  "sync-anthropic-usage — pull authoritative token/spend usage",
  "google-calendar — OAuth + sync",
  "news-proxy, pricefinder-proxy, perplexity-proxy — external APIs",
];

export function OperationsEdgeIndex() {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/10 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Code2 className="h-4 w-4 text-primary shrink-0" />
        Edge functions index
      </div>
      <p className="text-xs text-muted-foreground">
        Deploy from the repo with <code className="text-[10px]">npx supabase functions deploy</code> (see{" "}
        <code className="text-[10px]">package.json</code> scripts). After deploy, run through{" "}
        <code className="text-[10px]">docs/crm-deploy-verify-checklist.md</code> in the repo.
      </p>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 marker:text-muted-foreground/60">
        {EDGE_FUNCTIONS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
