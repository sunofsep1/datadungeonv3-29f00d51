import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export interface ExportRow {
  [key: string]: string | number | null;
}

interface ExportReportButtonProps {
  filename?: string;
  data: ExportRow[];
  columns: { key: string; label: string }[];
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

function escapeCsvValue(val: string | number | null): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function ExportReportButton({
  filename = "performance-report",
  data,
  columns,
  disabled,
  variant = "outline",
  size = "sm",
  className,
}: ExportReportButtonProps) {
  const handleExport = () => {
    const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
    const rows = data.map((row) =>
      columns.map((c) => escapeCsvValue(row[c.key] != null ? String(row[c.key]) : null)).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  );
}
