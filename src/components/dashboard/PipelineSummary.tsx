import { Card } from "@/components/ui/card";
import { useListings } from "@/hooks/useListings";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const STAGES = [
  { key: "new", label: "New", color: "bg-blue-500" },
  { key: "contacted", label: "Contacted", color: "bg-purple-500" },
  { key: "inspection", label: "Inspection", color: "bg-amber-500" },
  { key: "offer", label: "Offer", color: "bg-orange-500" },
  { key: "under_contract", label: "Under Contract", color: "bg-teal-500" },
  { key: "settled", label: "Settled", color: "bg-green-500" },
];

export function PipelineSummary() {
  const { data: listings = [], isLoading } = useListings();
  const navigate = useNavigate();

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach((s) => (counts[s.key] = 0));
    listings.forEach((l) => {
      const stage = l.pipeline_stage || "new";
      if (counts[stage] !== undefined) counts[stage]++;
      else counts["new"]++;
    });
    return counts;
  }, [listings]);

  const total = listings.length;

  if (isLoading) {
    return (
      <Card className="zoho-card p-3">
        <Skeleton className="h-4 w-28 mb-2" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="zoho-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-foreground">Deal Pipeline</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 -mr-1"
          onClick={() => navigate("/pipeline")}
        >
          View all <ChevronRight className="w-4 h-4 ml-0.5" />
        </Button>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg border border-dashed border-white/10">
          <p className="text-sm text-muted-foreground text-center">
            No deals in the pipeline yet.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-white/20"
            onClick={() => navigate("/pipeline")}
          >
            Go to Pipeline
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {STAGES.map((stage) => {
            const count = stageCounts[stage.key];
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={stage.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">{stage.label}</span>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${stage.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total deals</span>
            <span className="text-sm font-bold text-foreground">{total}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
