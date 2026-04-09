import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDataHealth } from "@/hooks/useDataHealth";
import { useContacts, type ContactWithMeta } from "@/hooks/useContacts";
import { useListings } from "@/hooks/useListings";
import { findContactDuplicateClusters } from "@/lib/contactDuplicateClusters";
import {
  contactHasSmsDestination,
  contactHasUsableEmail,
  isContactUnreachableForAutomation,
} from "@/lib/contactAutomationReachability";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { Activity, Users, Home, ArrowRight, PieChart, Copy, LayoutGrid, Workflow } from "lucide-react";

function pctComplete(total: number, missing: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, ((total - missing) / total) * 100));
}

const MAX_DUPLICATE_CLUSTERS = 6;
const MAX_AUTOMATION_SAMPLE = 6;

export default function DataHealth() {
  const { data, isLoading, isError, refetch } = useDataHealth();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: listings = [], isLoading: listingsLoading } = useListings();

  const duplicateClusters = useMemo(
    () =>
      findContactDuplicateClusters(
        contacts.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          mobile: c.mobile,
        }))
      ),
    [contacts]
  );

  const listingsHygiene = useMemo(() => {
    const active = listings.filter((l) => String(l.status ?? "active").toLowerCase() !== "withdrawn");
    const missingVendor = active.filter((l) => !l.contact_id).length;
    const missingPrice = active.filter((l) => !l.price || Number(l.price) <= 0).length;
    return { activeCount: active.length, missingVendor, missingPrice };
  }, [listings]);

  const automationReach = useMemo(() => {
    const list = contacts as ContactWithMeta[];
    const unreachable = list.filter((c) => isContactUnreachableForAutomation(c));
    const missingEmail = list.filter((c) => !contactHasUsableEmail(c)).length;
    const missingSms = list.filter((c) => !contactHasSmsDestination(c)).length;
    return { unreachable, missingEmail, missingSms };
  }, [contacts]);

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

          <Card className="zoho-card p-5 border-border space-y-4">
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">Possible duplicate contacts</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Same email, or same phone / mobile (normalised). Review and merge or archive extras — this runs in your browser from your loaded contacts.
            </p>
            {contactsLoading ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : duplicateClusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No duplicate email or phone groups detected.</p>
            ) : (
              <ul className="space-y-3">
                {duplicateClusters.slice(0, MAX_DUPLICATE_CLUSTERS).map((cl) => (
                  <li
                    key={cl.clusterKey}
                    className="rounded-lg border border-border/80 bg-muted/20 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {cl.matchOn === "email" ? "Email" : "Phone"}
                      </Badge>
                      <span className="text-foreground font-medium break-all">
                        {cl.matchOn === "phone" ? formatPhoneDisplay(cl.displayLabel) : cl.displayLabel}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {cl.contacts.length} records
                      </span>
                    </div>
                    <ul className="flex flex-wrap gap-x-3 gap-y-1">
                      {cl.contacts.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/contacts/${p.id}`}
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {p.name?.trim() || "Unnamed"}
                            <ArrowRight className="w-3 h-3 opacity-70" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
            {!contactsLoading && duplicateClusters.length > MAX_DUPLICATE_CLUSTERS ? (
              <p className="text-xs text-muted-foreground">
                Showing first {MAX_DUPLICATE_CLUSTERS} of {duplicateClusters.length} groups.
              </p>
            ) : null}
          </Card>

          <Card className="zoho-card p-5 border-border space-y-4">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">Automation reachability</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Email and SMS workflow steps need a contact email or a mobile/phone number. People with neither cannot be reached by those automations.
            </p>
            {contactsLoading ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : (
              <>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex justify-between gap-2">
                    <span>No email &amp; no SMS number</span>
                    <span className="text-foreground tabular-nums">{automationReach.unreachable.length}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Missing email (any)</span>
                    <span className="text-foreground tabular-nums">{automationReach.missingEmail}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Missing SMS number (any)</span>
                    <span className="text-foreground tabular-nums">{automationReach.missingSms}</span>
                  </li>
                </ul>
                {automationReach.unreachable.length > 0 ? (
                  <ul className="space-y-1.5">
                    {automationReach.unreachable.slice(0, MAX_AUTOMATION_SAMPLE).map((c) => (
                      <li key={c.id}>
                        <Link
                          to={`/contacts/${c.id}`}
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {c.name?.trim() || "Unnamed"}
                          <ArrowRight className="w-3 h-3 opacity-70" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Every contact has at least email or a phone number.</p>
                )}
                {automationReach.unreachable.length > MAX_AUTOMATION_SAMPLE ? (
                  <p className="text-xs text-muted-foreground">
                    Showing first {MAX_AUTOMATION_SAMPLE} of {automationReach.unreachable.length}.
                  </p>
                ) : null}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contacts?smart=automation_blocked" className="inline-flex items-center gap-1">
                    Open full queue <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              </>
            )}
          </Card>

          <Card className="zoho-card p-5 border-border space-y-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">Listings hygiene</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Active listings (not withdrawn) missing a linked vendor or a guide price — fix these for cleaner pipeline and GCI math.
            </p>
            {listingsLoading ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : (
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex justify-between gap-2">
                  <span>Active listings</span>
                  <span className="text-foreground tabular-nums">{listingsHygiene.activeCount}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Missing vendor link</span>
                  <span className="text-foreground tabular-nums">{listingsHygiene.missingVendor}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Missing guide price</span>
                  <span className="text-foreground tabular-nums">{listingsHygiene.missingPrice}</span>
                </li>
              </ul>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/listings?view=table" className="inline-flex items-center gap-1">
                Open listings table <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
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
