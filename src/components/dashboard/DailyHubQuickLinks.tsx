import { Link } from "react-router-dom";
import {
  Activity,
  Calendar,
  ClipboardCheck,
  FileText,
  Flame,
  Handshake,
  Home,
  ListTodo,
  Sparkles,
  Users,
  Workflow,
  LineChart,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LINKS: Array<{ to: string; label: string; hint?: string; icon: typeof Users }> = [
  { to: "/tasks", label: "Tasks", hint: "Due & open", icon: ListTodo },
  { to: "/contacts", label: "Contacts", hint: "Full list", icon: Users },
  { to: "/hot-leads", label: "Hot leads", icon: Flame },
  { to: "/listings", label: "Listings", hint: "Pipeline", icon: Home },
  { to: "/pricing", label: "Pricing", hint: "TAM & brackets", icon: LineChart },
  { to: "/automations", label: "Automations", hint: "Workflows", icon: Workflow },
  { to: "/data-health", label: "Data health", icon: Activity },
  { to: "/annual-reviews", label: "Reviews & events", hint: "Annual reviews", icon: ClipboardCheck },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/touch-report", label: "Touch report", hint: "Daily targets", icon: Handshake },
  { to: "/scripts", label: "Scripts", icon: FileText },
];

export function DailyHubQuickLinks() {
  return (
    <Card className="zoho-card p-4 border-border">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm font-semibold text-foreground">Jump to</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {LINKS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col gap-0.5 rounded-lg border border-border/80 bg-card/40 px-3 py-2.5",
              "hover:bg-accent/50 hover:border-border transition-colors text-left min-h-[3.25rem]",
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{label}</span>
            </span>
            {hint ? <span className="text-[11px] text-muted-foreground pl-6 truncate">{hint}</span> : null}
          </Link>
        ))}
      </div>
    </Card>
  );
}
