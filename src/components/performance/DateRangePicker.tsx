import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subDays, subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export type DateRangePreset = "7" | "30" | "90" | "year" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
  preset: DateRangePreset;
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
];

function getRangeForPreset(preset: DateRangePreset): { start: Date; end: Date } {
  const end = new Date();
  switch (preset) {
    case "7":
      return { start: subDays(end, 7), end };
    case "30":
      return { start: subDays(end, 30), end };
    case "90":
      return { start: subDays(end, 90), end };
    case "year":
      return {
        start: startOfMonth(new Date(end.getFullYear(), 0, 1)),
        end: endOfMonth(end),
      };
    default:
      return { start: subDays(end, 30), end };
  }
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const handlePresetChange = (preset: DateRangePreset) => {
    const { start, end } = getRangeForPreset(preset);
    onChange({ start, end, preset });
  };

  return (
    <div className={className}>
      <Select
        value={value.preset}
        onValueChange={(v) => handlePresetChange(v as DateRangePreset)}
      >
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground mt-1">
        {format(value.start, "MMM d, yyyy")} – {format(value.end, "MMM d, yyyy")}
      </p>
    </div>
  );
}

export function getDefaultDateRange(): DateRange {
  const preset: DateRangePreset = "30";
  const { start, end } = getRangeForPreset(preset);
  return { start, end, preset };
}
