import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataHealth } from "@/hooks/useDataHealth";
import { Activity, Users, Home, ArrowRight, PieChart } from "lucide-react";

function pctComplete(total: number, missing: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((total - missing) / total) * 100));
}

export default function DataHealth() {
  const { data, isLoading, isError, refetch } = useDataHealth();
  const score = data?.health_score ?? 0;
  const totalC = data?.total_contacts ?? 0;
  const totalP = data?.total_properties ?? 0;
  const catPct = pctComplete(totalC, data?.contacts_missing_category ?? 0);
  const touchPct = pctComplete(totalC, data?.contacts_missing_touch_date ?? 0);
  const propPct = pctComplete(totalP, data?.properties_missing_details ?? 0);

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      <PageHeader
        title="Data health"
        description="Database completeness and hygiene — turn gaps into fixable queues."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <Card className="zoho-card p-6 border-border">
          <p className="text-sm text-muted-foreground">Could not load health metrics. Ensure the get_data_health migration is applied.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : (
        <>
          <Card className="zoho-card p-6 border-border">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Overall score</h2>
            </div>
            <div className="flex items-end gap-4 mb-2">
              <span className="text-4xl font-bold tabular-nums text-foreground">{Math.round(score)}</span>
              <span className="text-sm text-muted-foreground pb-1">/ 100</span>
            </div>
            <Progress value={Math.min(100, Math.max(0, score))} className="h-2" />
            {data?.checks_mode ? (
              <p className="text-[11px] text-muted-foreground mt-3">{data.checks_mode}</p>
            ) : null}
          </Card>

          <Card className="zoho-card p-5 border-border space-y-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">Where the gaps are</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Percent of records passing each check. Use the links below to work the queues that drag the score down.
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Contacts with category set</span>
                  <span className="tabular-nums text-foreground">{Math.round(catPct)}%</span>
                </div>
                <Progress value={catPct} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Contacts with last touch date</span>
                  <span className="tabular-nums text-foreground">{Math.round(touchPct)}%</span>
                </div>
                <Progress value={touchPct} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Properties with key details</span>
                  <span className="tabular-nums text-foreground">{Math.round(propPct)}%</span>
                </div>
                <Progress value={propPct} className="h-1.5" />
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="zoho-card p-5 border-border space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground">Contacts</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex justify-between gap-2">
                  <span>Total</span>
                  <span className="text-foreground tabular-nums">{data?.total_contacts ?? 0}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Missing category</span>
                  <span className="text-foreground tabular-nums">{data?.contacts_missing_category ?? 0}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Missing last touch date</span>
                  <span className="text-foreground tabular-nums">{data?.contacts_missing_touch_date ?? 0}</span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contacts">Open contacts</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contacts?smart=top_100" className="inline-flex items-center gap-1">
                    Top 100 <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contacts?smart=hot_lead" className="inline-flex items-center gap-1">
                    Hot leads <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contacts?smart=warm_lead" className="inline-flex items-center gap-1">
                    Warm leads <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contacts?smart=past_client" className="inline-flex items-center gap-1">
                    Past clients <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contacts?smart=no_next_touch" className="inline-flex items-center gap-1">
                    No next touch <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contacts?smart=stale" className="inline-flex items-center gap-1">
                    Stale touches <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </Card>

            <Card className="zoho-card p-5 border-border space-y-3">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground">Properties</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex justify-between gap-2">
                  <span>Total</span>
                  <span className="text-foreground tabular-nums">{data?.total_properties ?? 0}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Missing key details</span>
                  <span className="text-foreground tabular-nums">{data?.properties_missing_details ?? 0}</span>
                </li>
              </ul>
              <Button variant="outline" size="sm" asChild>
                <Link to="/properties">Open properties</Link>
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
