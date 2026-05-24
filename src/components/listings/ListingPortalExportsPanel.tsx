import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Globe, Plus, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useListingPortalConfigs,
  useListingPortalFeedLogs,
  useUpsertListingPortalConfig,
  useAddListingPortalFeedLog,
} from "@/hooks/useListingPortals";
import {
  LISTING_PORTALS,
  PORTAL_STATUS_OPTIONS,
  portalLabel,
  portalStatusLabel,
  type ListingPortalKey,
  type PortalStatus,
} from "@/lib/listingPortals";
import {
  useListingPortalHits,
  useUpsertListingPortalHit,
} from "@/hooks/useListingPortalHits";
import { buildMonthlyHitsChart, totalHitsInPeriod } from "@/lib/listingPortalHits";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  formatListingAddressForPortal,
  LISTING_ADDRESS_DISPLAY_OPTIONS,
  listingAddressDisplayLabel,
  parseListingAddressDisplayMode,
  type ListingAddressDisplayMode,
} from "@/lib/listingAddressDisplay";
import { useUpdateListing } from "@/hooks/useListings";
import { MapPin } from "lucide-react";

type Props = {
  listingId: string;
  listingAddress?: string | null;
  addressDisplayMode?: string | null;
  hideAddressPortal?: boolean;
  onListingUpdated?: () => void;
};

function statusClass(status: string): string {
  if (status === "live" || status === "processed") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (status === "error") return "bg-destructive/10 text-destructive border-destructive/30";
  if (status === "syncing" || status === "pending") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function ListingPortalExportsPanel({
  listingId,
  listingAddress,
  addressDisplayMode,
  hideAddressPortal = false,
  onListingUpdated,
}: Props) {
  const { toast } = useToast();
  const updateListing = useUpdateListing();
  const { data: configs = [], isLoading } = useListingPortalConfigs(listingId);
  const { data: logs = [], isLoading: logsLoading } = useListingPortalFeedLogs(listingId);
  const upsert = useUpsertListingPortalConfig();
  const addLog = useAddListingPortalFeedLog();

  const { data: hits = [], isLoading: hitsLoading } = useListingPortalHits(listingId);
  const upsertHit = useUpsertListingPortalHit();

  const [logOpen, setLogOpen] = useState(false);
  const [hitsOpen, setHitsOpen] = useState(false);
  const [logPortal, setLogPortal] = useState<ListingPortalKey>("realestate_com_au");
  const [logMessage, setLogMessage] = useState("");
  const [logPortalId, setLogPortalId] = useState("");

  const [hitMonth, setHitMonth] = useState(format(new Date(), "yyyy-MM"));
  const [hitCount, setHitCount] = useState("");
  const [hitPortal, setHitPortal] = useState<string>("__all__");
  const [hitNotes, setHitNotes] = useState("");

  const configByKey = useMemo(() => new Map(configs.map((c) => [c.portal_key, c])), [configs]);
  const enabledCount = configs.filter((c) => c.enabled).length;
  const hitsChart = useMemo(() => buildMonthlyHitsChart(hits), [hits]);
  const hitsTotal12m = useMemo(() => totalHitsInPeriod(hits), [hits]);

  const displayMode = parseListingAddressDisplayMode(addressDisplayMode);
  const portalAddressLine = useMemo(
    () => formatListingAddressForPortal(listingAddress, displayMode, hideAddressPortal),
    [listingAddress, displayMode, hideAddressPortal],
  );

  const saveAddressCompliance = async (patch: {
    address_display_mode?: ListingAddressDisplayMode;
    hide_address_portal?: boolean;
  }) => {
    try {
      await updateListing.mutateAsync({ id: listingId, ...patch });
      onListingUpdated?.();
    } catch (e) {
      toast({
        title: "Could not save address settings",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const togglePortal = async (portalKey: ListingPortalKey, enabled: boolean) => {
    try {
      await upsert.mutateAsync({
        listing_id: listingId,
        portal_key: portalKey,
        enabled,
        last_status: enabled ? "pending" : "not_listed",
        log_export: enabled,
        last_message: enabled ? "Export enabled — awaiting syndication" : "Removed from export",
      });
      toast({ title: enabled ? "Portal enabled" : "Portal disabled", description: portalLabel(portalKey) });
    } catch (e) {
      toast({
        title: "Could not update portal",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const pushPortal = async (portalKey: ListingPortalKey, status: PortalStatus = "syncing") => {
    const cur = configByKey.get(portalKey);
    if (!cur?.enabled) {
      toast({ title: "Enable portal first", variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({
        listing_id: listingId,
        portal_key: portalKey,
        enabled: true,
        last_status: status,
        portal_listing_id: cur.portal_listing_id,
        log_export: true,
        last_message:
          status === "live"
            ? "Marked live on portal (manual sync)"
            : "Export queued — ready for syndication feed",
      });
      toast({
        title: status === "live" ? "Marked live" : "Export queued",
        description: portalLabel(portalKey),
      });
    } catch (e) {
      toast({
        title: "Could not push",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const pushAllEnabled = async () => {
    const enabled = LISTING_PORTALS.filter((p) => configByKey.get(p.key)?.enabled);
    if (enabled.length === 0) {
      toast({ title: "No portals enabled", description: "Turn on at least one portal export." });
      return;
    }
    let ok = 0;
    for (const portal of enabled) {
      try {
        await upsert.mutateAsync({
          listing_id: listingId,
          portal_key: portal.key,
          enabled: true,
          last_status: "syncing",
          portal_listing_id: configByKey.get(portal.key)?.portal_listing_id,
          log_export: true,
          last_message: "Bulk push queued — manual syndication",
        });
        ok++;
      } catch {
        /* continue */
      }
    }
    toast({
      title: ok > 0 ? `${ok} portal${ok !== 1 ? "s" : ""} queued` : "Push failed",
      description: "Feed log updated. Connect live APIs when credentials are available.",
    });
  };

  const setStatus = async (portalKey: ListingPortalKey, status: PortalStatus) => {
    const cur = configByKey.get(portalKey);
    try {
      await upsert.mutateAsync({
        listing_id: listingId,
        portal_key: portalKey,
        enabled: cur?.enabled ?? true,
        last_status: status,
        portal_listing_id: cur?.portal_listing_id,
        last_message: cur?.last_message,
        log_export: true,
      });
      toast({ title: "Status updated", description: `${portalLabel(portalKey)} → ${portalStatusLabel(status)}` });
    } catch (e) {
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const saveManualLog = async () => {
    try {
      await addLog.mutateAsync({
        listing_id: listingId,
        portal_key: logPortal,
        message: logMessage,
        portal_listing_id: logPortalId || null,
        processed: true,
        status: "processed",
      });
      toast({ title: "Feed log added" });
      setLogOpen(false);
      setLogMessage("");
      setLogPortalId("");
    } catch (e) {
      toast({
        title: "Could not save log",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const saveHit = async () => {
    const count = Number.parseInt(hitCount, 10);
    if (!Number.isFinite(count) || count < 0) {
      toast({ title: "Enter a valid hit count", variant: "destructive" });
      return;
    }
    try {
      await upsertHit.mutateAsync({
        listing_id: listingId,
        hit_month: `${hitMonth}-01`,
        hit_count: count,
        portal_key: hitPortal === "__all__" ? null : hitPortal,
        notes: hitNotes,
      });
      toast({ title: "Monthly hits saved" });
      setHitsOpen(false);
      setHitCount("");
      setHitNotes("");
    } catch (e) {
      toast({
        title: "Could not save hits",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="zoho-card p-4 sm:p-5 border-border">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Portal exports
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabledCount} portal{enabledCount !== 1 ? "s" : ""} enabled · {hitsTotal12m.toLocaleString()} hits logged
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            type="button"
            size="sm"
            variant="default"
            className="gap-1 h-8"
            disabled={upsert.isPending || enabledCount === 0}
            onClick={() => void pushAllEnabled()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Push enabled
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 h-8" onClick={() => setHitsOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Log hits
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 h-8" onClick={() => setLogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Log entry
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/15 p-3 mb-4 space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">Portal address</p>
            <p className="text-sm font-medium mt-1">{portalAddressLine}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {listingAddressDisplayLabel(displayMode)}
              {hideAddressPortal ? " · Street hidden on portals" : ""}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Address display</Label>
            <Select
              value={displayMode}
              onValueChange={(v) =>
                void saveAddressCompliance({
                  address_display_mode: parseListingAddressDisplayMode(v),
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LISTING_ADDRESS_DISPLAY_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <Switch
              id="hide-address-portal"
              checked={hideAddressPortal}
              onCheckedChange={(checked) =>
                void saveAddressCompliance({ hide_address_portal: checked })
              }
            />
            <Label htmlFor="hide-address-portal" className="text-xs cursor-pointer">
              Hide street on portal exports (silent sale)
            </Label>
          </div>
        </div>
      </div>

      <Tabs defaultValue="portals">
        <TabsList className="h-8 mb-3">
          <TabsTrigger value="portals" className="text-xs px-3">Portals</TabsTrigger>
          <TabsTrigger value="feed" className="text-xs px-3">Feed log ({logs.length})</TabsTrigger>
          <TabsTrigger value="hits" className="text-xs px-3">Hits</TabsTrigger>
        </TabsList>

        <TabsContent value="portals" className="mt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-2">
              {LISTING_PORTALS.map((portal) => {
                const cfg = configByKey.get(portal.key);
                const enabled = cfg?.enabled ?? false;
                const status = cfg?.last_status ?? "not_listed";
                return (
                  <li
                    key={portal.key}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-border/70 bg-muted/10 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => void togglePortal(portal.key, v)}
                        disabled={upsert.isPending}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{portal.label}</p>
                        {cfg?.portal_listing_id ? (
                          <p className="text-[10px] text-muted-foreground truncate">ID {cfg.portal_listing_id}</p>
                        ) : null}
                        {cfg?.last_message ? (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{cfg.last_message}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("text-[10px]", statusClass(status))}>
                        {portalStatusLabel(status)}
                      </Badge>
                      {enabled ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={upsert.isPending}
                            onClick={() => void pushPortal(portal.key, "syncing")}
                          >
                            Push
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={upsert.isPending}
                            onClick={() => void pushPortal(portal.key, "live")}
                          >
                            Live
                          </Button>
                        </>
                      ) : null}
                      <Select
                        value={status}
                        onValueChange={(v) => void setStatus(portal.key, v as PortalStatus)}
                      >
                        <SelectTrigger className="h-8 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PORTAL_STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="text-xs">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {cfg?.last_pushed_at ? (
                        <span className="text-[10px] text-muted-foreground hidden lg:inline tabular-nums">
                          {format(new Date(cfg.last_pushed_at), "d MMM")}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="feed" className="mt-0">
          {logsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              No feed log entries yet. Enable a portal or add a manual log.
            </p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {logs.map((row) => (
                <li key={row.id} className="rounded-lg border border-border/70 bg-muted/10 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{portalLabel(row.portal_key)}</span>
                    <Badge variant="outline" className={cn("text-[10px]", statusClass(row.status))}>
                      {row.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                    Export {format(new Date(row.exported_at), "d MMM yyyy, h:mm a")}
                    {row.processed_at
                      ? ` · Processed ${format(new Date(row.processed_at), "d MMM yyyy, h:mm a")}`
                      : ""}
                  </p>
                  {row.portal_listing_id ? (
                    <p className="text-xs text-muted-foreground">Portal ID: {row.portal_listing_id}</p>
                  ) : null}
                  {row.message ? <p className="text-xs mt-1">{row.message}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="hits" className="mt-0">
          {hitsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : hitsChart.every((p) => p.hits === 0) ? (
            <p className="text-sm text-muted-foreground">
              No monthly hits logged yet. Add portal traffic manually until syndication feeds are connected.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hitsChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      formatter={(value: number) => [value.toLocaleString(), "Hits"]}
                    />
                    <Bar dataKey="hits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1 max-h-40 overflow-y-auto text-xs">
                {hits.slice(0, 12).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2 py-1 border-b border-border/50 last:border-0">
                    <span>
                      {format(new Date(row.hit_month), "MMM yyyy")}
                      {row.portal_key ? ` · ${portalLabel(row.portal_key)}` : " · All portals"}
                      {row.notes ? ` — ${row.notes}` : ""}
                    </span>
                    <span className="tabular-nums font-medium">{row.hit_count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add feed log entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Portal</Label>
              <Select value={logPortal} onValueChange={(v) => setLogPortal(v as ListingPortalKey)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_PORTALS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Portal listing ID</Label>
              <Input className="mt-1" value={logPortalId} onChange={(e) => setLogPortalId(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={logMessage}
                onChange={(e) => setLogMessage(e.target.value)}
                placeholder="e.g. update display price within 10% of search price"
              />
            </div>
            <Button type="button" className="w-full" onClick={() => void saveManualLog()} disabled={addLog.isPending}>
              Save log
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={hitsOpen} onOpenChange={setHitsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log monthly hits</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Month</Label>
              <Input
                type="month"
                className="mt-1"
                value={hitMonth}
                onChange={(e) => setHitMonth(e.target.value)}
              />
            </div>
            <div>
              <Label>Hit count</Label>
              <Input
                className="mt-1"
                inputMode="numeric"
                value={hitCount}
                onChange={(e) => setHitCount(e.target.value)}
                placeholder="e.g. 842"
              />
            </div>
            <div>
              <Label>Portal (optional)</Label>
              <Select value={hitPortal} onValueChange={setHitPortal}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All portals (total)</SelectItem>
                  {LISTING_PORTALS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" rows={2} value={hitNotes} onChange={(e) => setHitNotes(e.target.value)} />
            </div>
            <Button type="button" className="w-full" onClick={() => void saveHit()} disabled={upsertHit.isPending}>
              Save hits
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
