import { useListings } from "@/hooks/useListings";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import { ListingPipelineFunnelCard } from "@/components/reports/ListingPipelineFunnelCard";

export function PipelineSummary() {
  const { data: listings = [], isLoading } = useListings();
  const { commissionRate } = useCommissionRate();

  return (
    <ListingPipelineFunnelCard
      listings={listings}
      commissionRate={commissionRate}
      isLoading={isLoading}
      variant="dashboard"
    />
  );
}
