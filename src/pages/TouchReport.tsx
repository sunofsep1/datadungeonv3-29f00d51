import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, Handshake, Printer } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useTouchActivityReport, type TouchActivityRange } from "@/hooks/useTouches";

function formatTouchLabel(touchType: string): string {
  return touchType
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export default function TouchReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const selectedRange: TouchActivityRange = searchParams.get("range") === "week" ? "week" : "today";
  const { data: rows = [], isLoading } = useTouchActivityReport(selectedRange);

  const countsByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.touch_type, (map.get(row.touch_type) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const groupedContacts = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        contactName: string;
        contactId: string | null;
        lastTouchedAt: string;
        items: typeof rows;
      }
    >();

    for (const row of rows) {
      const key = row.contact_id ?? `name:${row.contact_name.toLowerCase()}`;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          key,
          contactName: row.contact_name,
          contactId: row.contact_id,
          lastTouchedAt: row.occurred_at,
          items: [row],
        });
        continue;
      }

      existing.items.push(row);
      if (new Date(row.occurred_at).getTime() > new Date(existing.lastTouchedAt).getTime()) {
        existing.lastTouchedAt = row.occurred_at;
      }
    }

    for (const group of groups.values()) {
      group.items.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.lastTouchedAt).getTime() - new Date(a.lastTouchedAt).getTime(),
    );
  }, [rows]);

  const description =
    selectedRange === "today"
      ? "Everything touched today across touches + interactions."
      : "Everything touched this week across touches + interactions.";

  const selectableContactIds = useMemo(
    () => groupedContacts.map((group) => group.contactId).filter((id): id is string => Boolean(id)),
    [groupedContacts],
  );
  const allSelected =
    selectableContactIds.length > 0 && selectableContactIds.every((id) => selectedContactIds.has(id));
  const selectedCount = selectedContactIds.size;
  const printSelectedHref = useMemo(() => {
    const params = new URLSearchParams({ range: selectedRange });
    if (selectedContactIds.size > 0) {
      params.set("contacts", Array.from(selectedContactIds).join(","));
    }
    return `/touch-report/print?${params.toString()}`;
  }, [selectedContactIds, selectedRange]);

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const toggleAllSelections = () => {
    if (allSelected) {
      setSelectedContactIds(new Set());
      return;
    }
    setSelectedContactIds(new Set(selectableContactIds));
  };

  return (
    <div className="animate-fade-in flex min-h-0 flex-1 flex-col gap-4 pb-6">
      <PageHeader title="Touch Activity Report" description={description} />

      <Card className="zoho-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={selectedRange === "today" ? "default" : "outline"}
              onClick={() => {
                setSelectedContactIds(new Set());
                setSearchParams({ range: "today" });
              }}
            >
              Today
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedRange === "week" ? "default" : "outline"}
              onClick={() => {
                setSelectedContactIds(new Set());
                setSearchParams({ range: "week" });
              }}
            >
              This week
            </Button>
            <Button asChild type="button" size="sm" variant="outline" className="gap-1.5">
              <Link to={`/touch-report/print?range=${selectedRange}`}>
                <Printer className="h-4 w-4" />
                Print report
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={selectedCount === 0}
              onClick={() => {
                if (selectedCount === 0) return;
                window.location.assign(printSelectedHref);
              }}
            >
              <Printer className="h-4 w-4" />
              Print selected{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </Button>
          </div>
          <Button asChild size="sm" variant="ghost" className="gap-1.5 w-fit">
            <Link to="/attention-hub">
              <ChevronLeft className="h-4 w-4" />
              Back to Daily Hub
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="zoho-card p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Handshake className="h-4 w-4 text-primary" />
            {rows.length} total touches across {groupedContacts.length} contacts
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {selectedRange === "today" ? "Today" : "This week"}
          </span>
          {selectableContactIds.length > 0 ? (
            <button
              type="button"
              onClick={toggleAllSelections}
              className="text-xs text-primary hover:underline"
            >
              {allSelected ? "Clear selected contacts" : "Select all contacts"}
            </button>
          ) : null}
        </div>
        {countsByType.length > 0 ? (
          <>
            <Separator className="my-3" />
            <div className="flex flex-wrap gap-2">
              {countsByType.map(([touchType, count]) => (
                <Badge key={touchType} variant="secondary">
                  {formatTouchLabel(touchType)}: {count}
                </Badge>
              ))}
            </div>
          </>
        ) : null}
      </Card>

      <Card className="zoho-card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading touches...</div>
        ) : groupedContacts.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No touches found for this period yet.
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {groupedContacts.map((group) => (
              <AccordionItem key={group.key} value={group.key} className="px-4">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-4 pr-2 text-left">
                    <div className="min-w-0 flex items-start gap-3">
                      {group.contactId ? (
                        <Checkbox
                          checked={selectedContactIds.has(group.contactId)}
                          onCheckedChange={() => toggleContactSelection(group.contactId!)}
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          aria-label={`Select ${group.contactName} for print`}
                          className="mt-1"
                        />
                      ) : (
                        <span className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                      )}
                      <div>
                      <p className="text-sm font-semibold text-foreground truncate">{group.contactName}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.items.length} touch{group.items.length === 1 ? "" : "es"} · last{" "}
                        {format(new Date(group.lastTouchedAt), "EEE d MMM, h:mm a")}
                      </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {group.items.length} item{group.items.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  {group.contactId ? (
                    <div className="mb-2">
                      <Link to={`/contacts/${group.contactId}`} className="text-xs text-primary hover:underline">
                        Open contact
                      </Link>
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    {group.items.map((row) => (
                      <div key={`${row.source}-${row.id}`} className="rounded-md border border-border/70 bg-card/50 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{formatTouchLabel(row.touch_type)}</Badge>
                          <Badge variant="secondary">{row.source === "touches" ? "Touch log" : "Interaction"}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(row.occurred_at), "EEE d MMM, h:mm a")}
                          </span>
                        </div>
                        {row.notes ? (
                          <p className="text-sm text-muted-foreground mt-1">{row.notes}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">No notes</p>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>
    </div>
  );
}
