import { Calendar, Flag, Home, Mail, Search, Tag, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { domToneClasses, formatCampaignDate, formatRelativeShort } from "@/lib/listingCampaignDashboard";

type ListingCampaignKpiRowProps = {
  domDays: number | null;
  enquiryCount: number;
  lastEnquiryAt: string | null;
  inspectionCount: number;
  nextInspectionAt: string | null;
  offersCount: number;
  buyerMatchesCount: number;
  campaignStartAt: string | null;
  createdAt: string;
};

function Tile({
  icon: Icon,
  label,
  value,
  sub,
  className = "",
}: {
  icon: typeof Home;
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <Card className={`p-4 rounded-xl border border-border bg-card/40 min-w-[140px] flex-1 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
      {sub ? <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{sub}</p> : null}
    </Card>
  );
}

export function ListingCampaignKpiRow({
  domDays,
  enquiryCount,
  lastEnquiryAt,
  inspectionCount,
  nextInspectionAt,
  offersCount,
  buyerMatchesCount,
  campaignStartAt,
  createdAt,
}: ListingCampaignKpiRowProps) {
  const domStyles = domToneClasses(domDays);
  const start = campaignStartAt || createdAt;

  return (
    <div className="mb-6">
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Campaign momentum
      </h3>
      <div className="flex flex-wrap gap-3">
        <Card className={`p-4 rounded-xl border min-w-[140px] flex-1 ${domStyles.border} ${domStyles.bg}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Home className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">DOM</span>
          </div>
          <p className={`text-lg font-bold tabular-nums ${domStyles.text}`}>
            {domDays != null ? `${domDays}d` : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {domDays == null
              ? "N/A at this stage"
              : domDays < 14
                ? "Under 14 days"
                : domDays <= 30
                  ? "14–30 days"
                  : "30+ days"}
          </p>
        </Card>

        <Tile icon={Mail} label="Enquiries" value={String(enquiryCount)} sub="Total logged" />
        <Tile
          icon={Search}
          label="Last enquiry"
          value={lastEnquiryAt ? formatRelativeShort(lastEnquiryAt) : "—"}
          sub={lastEnquiryAt ? formatCampaignDate(lastEnquiryAt) : "Log enquiries to track"}
        />
        <Tile icon={Calendar} label="Inspections" value={String(inspectionCount)} sub="Held / booked" />
        <Tile
          icon={Calendar}
          label="Next inspection"
          value={nextInspectionAt ? formatCampaignDate(nextInspectionAt) : "—"}
          sub={nextInspectionAt ? formatRelativeShort(nextInspectionAt) : "None scheduled"}
        />
        <Tile icon={Tag} label="Offers" value={String(offersCount)} sub="Received" />
        <Tile icon={Users} label="Buyer matches" value={String(buyerMatchesCount)} sub="In your database" />
        <Tile
          icon={Flag}
          label="Campaign start"
          value={formatCampaignDate(start)}
          sub={start ? formatRelativeShort(start) : "—"}
        />
      </div>
    </div>
  );
}
