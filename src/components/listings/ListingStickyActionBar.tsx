import {
  Phone,
  MessageSquarePlus,
  StickyNote,
  CalendarPlus,
  Mail,
  GitBranch,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type ListingActionModalKey =
  | "call_vendor"
  | "log_enquiry"
  | "log_feedback"
  | "add_note"
  | "book_inspection"
  | "vendor_update"
  | "change_stage"
  | "match_buyers";

type ListingStickyActionBarProps = {
  onOpenAction: (key: ListingActionModalKey) => void;
};

const actions: { key: ListingActionModalKey; label: string; icon: typeof Phone }[] = [
  { key: "call_vendor", label: "Call vendor", icon: Phone },
  { key: "log_enquiry", label: "Log enquiry", icon: UserPlus },
  { key: "log_feedback", label: "Log feedback", icon: MessageSquarePlus },
  { key: "add_note", label: "Add note", icon: StickyNote },
  { key: "book_inspection", label: "Book inspection", icon: CalendarPlus },
  { key: "vendor_update", label: "Send vendor update", icon: Mail },
  { key: "change_stage", label: "Change stage", icon: GitBranch },
  { key: "match_buyers", label: "Match buyers", icon: Users },
];

export function ListingStickyActionBar({ onOpenAction }: ListingStickyActionBarProps) {
  return (
    <div className="mt-2 pt-3 pb-1 border-t border-border/60">
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin [scrollbar-width:thin]">
        {actions.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 h-9 gap-1.5 text-xs font-medium bg-secondary/80 hover:bg-secondary border border-border/50"
            onClick={() => onOpenAction(key)}
          >
            <Icon className="w-3.5 h-3.5 opacity-80" />
            {label}
            {key === "change_stage" ? " →" : null}
          </Button>
        ))}
      </div>
    </div>
  );
}
