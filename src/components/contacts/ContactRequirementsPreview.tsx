import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useContactBuyerRequirements } from "@/hooks/useBuyerRequirements";
import { formatRequirementSummary } from "@/lib/buyerRequirementMatch";

type Props = {
  contactId: string;
  onViewAll: () => void;
};

export function ContactRequirementsPreview({ contactId, onViewAll }: Props) {
  const { data: requirements = [], isLoading } = useContactBuyerRequirements(contactId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading requirements…</p>;
  }

  if (requirements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No buyer briefs yet. Add requirements on the Requirements tab.
      </p>
    );
  }

  const preview = requirements.slice(0, 2);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {preview.map((r) => (
          <li key={r.id} className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
            {formatRequirementSummary(r)}
          </li>
        ))}
      </ul>
      {requirements.length > 2 ? (
        <p className="text-xs text-muted-foreground">+{requirements.length - 2} more brief{requirements.length - 2 !== 1 ? "s" : ""}</p>
      ) : null}
      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={onViewAll}>
        View all requirements
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
