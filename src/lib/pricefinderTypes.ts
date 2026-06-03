/** Response from pricefinder-proxy property enrich. */
export type PricefinderPropertyData = {
  address: string;
  lot_plan: string | null;
  last_sale_date: string | null;
  last_sale_price: number | null;
  land_area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  property_type: string | null;
};

export type PricefinderSuburbStats = {
  suburb: string;
  state: string;
  sample_size: number;
  median_last_sale_price: number | null;
  recent_sales_count: number;
  note?: string;
};

export type PricefinderRequest =
  | { full_address?: string; address?: string; propertyId?: string }
  | {
      action: "suburb_stats";
      suburb: string;
      state?: string;
      postcode?: string;
    }
  | { action: "health" };

export type PricefinderErrorResponse = {
  error?: string;
  message?: string;
  status?: number;
};
