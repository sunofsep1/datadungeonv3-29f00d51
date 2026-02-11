import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PerformanceMetricCardProps {
  title: string;
  value: string | number;
  comparison?: string;
  isLoading?: boolean;
  className?: string;
}

export function PerformanceMetricCard({
  title,
  value,
  comparison,
  isLoading,
  className,
}: PerformanceMetricCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
        {comparison && (
          <p className="text-xs text-muted-foreground mt-1">{comparison}</p>
        )}
      </CardContent>
    </Card>
  );
}
