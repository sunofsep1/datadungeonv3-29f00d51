import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

export interface PerformanceChartDataPoint {
  date: string;
  label: string;
  [key: string]: string | number;
}

interface PerformanceChartProps {
  data: PerformanceChartDataPoint[];
  dataKeys: { key: string; color: string; name?: string }[];
  title?: string;
  isLoading?: boolean;
  height?: number;
}

export function PerformanceChart({
  data,
  dataKeys,
  title,
  isLoading,
  height = 280,
}: PerformanceChartProps) {
  if (isLoading || !data.length) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          {title && <p className="text-sm font-medium text-muted-foreground mb-4">{title}</p>}
          <div style={{ height }} className="flex items-center justify-center text-muted-foreground text-sm">
            {isLoading ? "Loading..." : "No data for this period"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        {title && <p className="text-sm font-medium text-muted-foreground mb-4">{title}</p>}
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            {dataKeys.map(({ key, color, name }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={name ?? key}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
