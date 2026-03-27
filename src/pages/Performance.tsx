import * as React from "react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { NumbersKPIGrid } from "@/components/agent-ops/NumbersKPIGrid";
import { NumbersCharts } from "@/components/agent-ops/NumbersCharts";
import { LogActivityForm } from "@/components/agent-ops/LogActivityForm";
import { GoalsSection } from "@/components/agent-ops/GoalsSection";
import { CallsTracker } from "@/components/performance/CallsTracker";
import { GoalsManager } from "@/components/performance/GoalsManager";
import { PerformanceMetricCard } from "@/components/performance/PerformanceMetricCard";
import { PerformanceChart, type PerformanceChartDataPoint } from "@/components/performance/PerformanceChart";
import { DateRangePicker, getDefaultDateRange, type DateRange } from "@/components/performance/DateRangePicker";
import { ExportReportButton, type ExportRow } from "@/components/performance/ExportReportButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useActivities } from "@/hooks/useActivities";
import { useContacts } from "@/hooks/useContacts";
import { useAppointments } from "@/hooks/useAppointments";
import { useListings } from "@/hooks/useListings";
import { listingKanbanColumnId } from "@/lib/listingKanbanStages";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import { format, subDays, parseISO, startOfWeek } from "date-fns";

export default function Performance() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const { data: activities = [], isLoading: activitiesLoading } = useActivities();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: appointments = [], isLoading: appointmentsLoading } = useAppointments();
  const { data: listings = [], isLoading: listingsLoading } = useListings();
  const { commissionRate, setCommissionRate } = useCommissionRate();

  const rangeStart = dateRange.start.getTime();
  const rangeEnd = dateRange.end.getTime();
  const rangeDays = Math.ceil((rangeEnd - rangeStart) / (24 * 60 * 60 * 1000));
  const prevStart = subDays(dateRange.start, rangeDays);
  const prevEnd = subDays(dateRange.end, rangeDays);

  const { salesTotals, contactTotals, prevSalesTotals, chartData } = useMemo(() => {
    const inRange = (d: string) => {
      try {
        const t = parseISO(d).getTime();
        return t >= rangeStart && t <= rangeEnd;
      } catch {
        return false;
      }
    };
    const inPrevRange = (d: string) => {
      try {
        const t = parseISO(d).getTime();
        return t >= prevStart.getTime() && t <= prevEnd.getTime();
      } catch {
        return false;
      }
    };

    let closings = 0;
    let gci = 0;
    let prevClosings = 0;
    let prevGci = 0;
    const byWeek: Record<string, { closings: number; gci: number }> = {};

    activities.forEach((a) => {
      const dateStr = typeof a.date === "string" ? a.date : "";
      if (inRange(dateStr)) {
        closings += Number(a.closings) || 0;
        gci += Number(a.gci_earned) || 0;
        const weekKey = format(startOfWeek(parseISO(dateStr)), "yyyy-MM-dd");
        if (!byWeek[weekKey]) byWeek[weekKey] = { closings: 0, gci: 0 };
        byWeek[weekKey].closings += Number(a.closings) || 0;
        byWeek[weekKey].gci += Number(a.gci_earned) || 0;
      }
      if (inPrevRange(dateStr)) {
        prevClosings += Number(a.closings) || 0;
        prevGci += Number(a.gci_earned) || 0;
      }
    });

    const contactByStatus: Record<string, number> = {};
    contacts.forEach((c) => {
      const s = (c.status as string) || "lead";
      contactByStatus[s] = (contactByStatus[s] || 0) + 1;
    });
    const totalContacts = contacts.length;
    const hot = contactByStatus["hot"] || 0;
    const warm = contactByStatus["warm"] || 0;
    const cold = contactByStatus["cold"] || 0;
    const lead = contactByStatus["lead"] || 0;

    const chartData: PerformanceChartDataPoint[] = Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        label: format(parseISO(date), "MMM d"),
        closings: v.closings,
        gci: v.gci,
      }));

    const prevPct = (curr: number, prev: number) =>
      prev === 0 ? (curr === 0 ? "" : "↑ 100%") : `↑ ${Math.round(((curr - prev) / prev) * 100)}%`;
    const downPct = (curr: number, prev: number) =>
      prev === 0 ? "" : `↓ ${Math.round(((prev - curr) / prev) * 100)}%`;

    return {
      salesTotals: { closings, gci },
      contactTotals: { total: totalContacts, hot, warm, cold, lead },
      prevSalesTotals: { closings: prevClosings, gci: prevGci },
      chartData,
      prevPct,
      downPct,
    };
  }, [activities, contacts, rangeStart, rangeEnd, prevStart, prevEnd]);

  const comparisonClosings =
    salesTotals.closings >= prevSalesTotals.closings
      ? `↑ ${prevSalesTotals.closings === 0 ? "—" : Math.round(((salesTotals.closings - prevSalesTotals.closings) / prevSalesTotals.closings) * 100) + "%"} vs previous period`
      : `↓ ${Math.round(((prevSalesTotals.closings - salesTotals.closings) / prevSalesTotals.closings) * 100)}% vs previous period`;
  const comparisonGci =
    salesTotals.gci >= prevSalesTotals.gci
      ? `↑ ${prevSalesTotals.gci === 0 ? "—" : Math.round(((salesTotals.gci - prevSalesTotals.gci) / prevSalesTotals.gci) * 100) + "%"} vs previous period`
      : `↓ ${prevSalesTotals.gci === 0 ? "" : Math.round(((prevSalesTotals.gci - salesTotals.gci) / prevSalesTotals.gci) * 100) + "%"} vs previous period`;

  const projectedPipelineGci = useMemo(() => {
    const activePipelineValue = listings
      .filter((l) => {
        const stage = listingKanbanColumnId(l.pipeline_stage);
        return stage === "appraisal" || stage === "listing" || stage === "under_contract" || stage === "unconditional";
      })
      .reduce((sum, l) => sum + (Number(l.price) || 0), 0);
    return (activePipelineValue * commissionRate) / 100;
  }, [listings, commissionRate]);

  const exportData: ExportRow[] = useMemo(
    () => [
      { metric: "Closings", value: salesTotals.closings, period: "current" },
      { metric: "GCI Earned", value: salesTotals.gci, period: "current" },
      { metric: "Total Contacts", value: contactTotals.total, period: "current" },
      { metric: "Projected GCI (pipeline)", value: projectedPipelineGci, period: "current" },
      { metric: "Hot", value: contactTotals.hot, period: "current" },
      { metric: "Warm", value: contactTotals.warm, period: "current" },
      { metric: "Cold", value: contactTotals.cold, period: "current" },
      { metric: "Lead", value: contactTotals.lead, period: "current" },
      { metric: "Appointments", value: appointments.length, period: "current" },
    ],
    [salesTotals, contactTotals, appointments.length, projectedPipelineGci]
  );

  const isLoadingOverview = activitiesLoading || contactsLoading || appointmentsLoading || listingsLoading;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Performance & Goals"
        description="Track your KPIs, log activities, and manage your goals"
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/10 border border-white/10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="numbers">Daily Numbers</TabsTrigger>
          <TabsTrigger value="goals">Goals & Targets</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <ExportReportButton
              filename="performance-report"
              data={exportData}
              columns={[
                { key: "metric", label: "Metric" },
                { key: "value", label: "Value" },
                { key: "period", label: "Period" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PerformanceMetricCard
              title="Closings"
              value={salesTotals.closings}
              comparison={comparisonClosings}
              isLoading={isLoadingOverview}
            />
            <PerformanceMetricCard
              title="GCI Earned"
              value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(salesTotals.gci)}
              comparison={comparisonGci}
              isLoading={isLoadingOverview}
            />
            <PerformanceMetricCard
              title="Total Contacts"
              value={contactTotals.total}
              isLoading={isLoadingOverview}
            />
            <PerformanceMetricCard
              title="Appointments"
              value={appointments.length}
              isLoading={isLoadingOverview}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <PerformanceMetricCard
              title="Projected GCI"
              value={new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(projectedPipelineGci)}
              comparison={`Based on active pipeline at ${commissionRate.toFixed(1)}%`}
              isLoading={isLoadingOverview}
            />
            <Card className="zoho-card p-4 border-border lg:col-span-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Default commission rate</p>
                  <p className="text-xs text-muted-foreground">Used for projected GCI across Listings and Performance.</p>
                </div>
                <div className="w-full sm:w-48">
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                  />
                </div>
              </div>
            </Card>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PerformanceMetricCard title="Hot" value={contactTotals.hot} isLoading={isLoadingOverview} />
            <PerformanceMetricCard title="Warm" value={contactTotals.warm} isLoading={isLoadingOverview} />
            <PerformanceMetricCard title="Cold" value={contactTotals.cold} isLoading={isLoadingOverview} />
            <PerformanceMetricCard title="Lead" value={contactTotals.lead} isLoading={isLoadingOverview} />
          </div>
          <PerformanceChart
            title="Closings & GCI by week"
            data={chartData}
            dataKeys={[
              { key: "closings", color: "hsl(var(--chart-1))", name: "Closings" },
              { key: "gci", color: "hsl(var(--chart-2))", name: "GCI" },
            ]}
            isLoading={isLoadingOverview}
          />
        </TabsContent>

        <TabsContent value="numbers" className="space-y-6">
          <LogActivityForm />
          <NumbersKPIGrid />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoalsManager />
            <CallsTracker />
          </div>
          <GoalsSection />
        </TabsContent>

        <TabsContent value="analytics">
          <NumbersCharts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
