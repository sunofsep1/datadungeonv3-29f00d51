import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useWeeklyActivities, useActivities } from "@/hooks/useActivities";
import { Skeleton } from "@/components/ui/skeleton";

export function NumbersCharts() {
  const { data: weeklyActivities, isLoading: weeklyLoading } = useWeeklyActivities();
  const { data: allActivities, isLoading: allLoading } = useActivities();

  const weeklyData = React.useMemo(() => {
    if (!weeklyActivities) return [];
    
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayData: Record<string, { calls: number; appointments: number; offers: number }> = {};
    
    // Initialize all days
    days.forEach(day => {
      dayData[day] = { calls: 0, appointments: 0, offers: 0 };
    });
    
    weeklyActivities.forEach(activity => {
      const date = new Date(activity.date);
      const dayName = days[date.getDay()];
      dayData[dayName].calls += activity.calls_made || 0;
      dayData[dayName].appointments += activity.appointments_set || 0;
      dayData[dayName].offers += activity.offers_written || 0;
    });
    
    return days.map(day => ({
      day,
      ...dayData[day]
    }));
  }, [weeklyActivities]);

  const monthlyVolume = React.useMemo(() => {
    if (!allActivities) return [];
    
    const months: Record<string, number> = {};
    
    allActivities.forEach(activity => {
      const date = new Date(activity.date);
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      months[monthKey] = (months[monthKey] || 0) + (Number(activity.gci_earned) || 0);
    });
    
    return Object.entries(months)
      .slice(-6)
      .map(([month, volume]) => ({ month, volume }));
  }, [allActivities]);

  const conversionData = React.useMemo(() => {
    if (!allActivities || allActivities.length === 0) return [];
    
    const totals = allActivities.reduce((acc, a) => ({
      calls: acc.calls + (a.calls_made || 0),
      appointments: acc.appointments + (a.appointments_set || 0),
      listings: acc.listings + (a.listings_taken || 0),
      contracts: acc.contracts + (a.contracts_signed || 0),
      closings: acc.closings + (a.closings || 0),
    }), { calls: 0, appointments: 0, listings: 0, contracts: 0, closings: 0 });
    
    return [
      { name: "Calls to Appts", value: totals.calls > 0 ? Math.round((totals.appointments / totals.calls) * 100) : 0, color: "#a855f7" },
      { name: "Appts to Listings", value: totals.appointments > 0 ? Math.round((totals.listings / totals.appointments) * 100) : 0, color: "#14b8a6" },
      { name: "Listings to Contracts", value: totals.listings > 0 ? Math.round((totals.contracts / totals.listings) * 100) : 0, color: "#3b82f6" },
      { name: "Contracts to Close", value: totals.contracts > 0 ? Math.round((totals.closings / totals.contracts) * 100) : 0, color: "#22c55e" },
    ];
  }, [allActivities]);

  const isLoading = weeklyLoading || allLoading;
  const hasData = weeklyActivities && weeklyActivities.length > 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Weekly Activity</CardTitle></CardHeader>
          <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Sales Volume Trend</CardTitle></CardHeader>
          <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Weekly Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No activity data yet. Log your daily activities to see charts.
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Sales Volume Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No volume data yet.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Weekly Activity Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
                <Bar dataKey="calls" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="appointments" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="offers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-muted-foreground">Calls</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-teal-500" />
              <span className="text-muted-foreground">Appointments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-muted-foreground">Offers</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Volume Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Sales Volume Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyVolume.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Volume"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#22c55e" 
                    fill="url(#volumeGradient)" 
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No volume data yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Rates */}
      <Card className="bg-card border-border lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {conversionData.map((item) => (
              <div key={item.name} className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      stroke="hsl(var(--border))"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      stroke={item.color}
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${item.value * 2.2} 220`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold">{item.value}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{item.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
