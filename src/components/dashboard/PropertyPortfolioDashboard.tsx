import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useProperties } from "@/hooks/useProperties";
import { Building2, DollarSign, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_COLORS = ["#00BCD4", "#4A90E2", "#22C55E", "#E6B461", "#F97316", "#6b7280"];

export function PropertyPortfolioDashboard() {
  const navigate = useNavigate();
  const { data: properties = [], isLoading } = useProperties();

  const metrics = useMemo(() => {
    const total = properties.length;
    const totalValue = properties.reduce(
      (sum, p) => sum + (Number(p.estimated_value) || Number(p.price) || 0),
      0
    );
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    properties.forEach((p) => {
      const status = p.status || "other";
      byStatus[status] = (byStatus[status] || 0) + 1;
      const type = p.property_type || "other";
      byType[type] = (byType[type] || 0) + 1;
    });
    const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
    const typeData = Object.entries(byType).map(([name, value]) => ({ name, value }));
    return { total, totalValue, statusData, typeData };
  }, [properties]);

  if (isLoading) {
    return (
      <Card className="zoho-card border-white/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Property portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="zoho-card border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Property portfolio
        </CardTitle>
        <button
          type="button"
          onClick={() => navigate("/properties")}
          className="text-sm text-primary hover:underline"
        >
          View all
        </button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-white/10 p-4 bg-white/5">
            <p className="text-xs text-white/60 mb-1">Total properties</p>
            <p className="text-2xl font-bold text-white">{metrics.total}</p>
          </div>
          <div className="rounded-lg border border-white/10 p-4 bg-white/5">
            <p className="text-xs text-white/60 mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Est. value
            </p>
            <p className="text-2xl font-bold text-white">
              {metrics.totalValue > 0
                ? `$${(metrics.totalValue / 1_000_000).toFixed(2)}M`
                : "—"}
            </p>
          </div>
        </div>

        {metrics.statusData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-3">By status</h4>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.statusData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#242424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="value" fill="#00BCD4" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {metrics.typeData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white/80 mb-3">By type</h4>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {metrics.typeData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#242424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {metrics.total === 0 && (
          <div className="text-center py-8 text-white/50">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No properties yet</p>
            <p className="text-xs mt-1">Add properties to see portfolio analytics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
