import { describe, expect, it } from "vitest";
import { leadTemperatureForListingPipelineStage } from "@/lib/leadCategoryDerivation";

describe("leadTemperatureForListingPipelineStage", () => {
  it("defaults appraisal stage to warm when derived is cold", () => {
    expect(leadTemperatureForListingPipelineStage("appraisal", "LEAD_COLD")).toBe("LEAD_WARM");
    expect(leadTemperatureForListingPipelineStage("new", "LEAD_COLD")).toBe("LEAD_WARM");
  });

  it("keeps hot and archived on appraisal stage", () => {
    expect(leadTemperatureForListingPipelineStage("appraisal", "LEAD_HOT")).toBe("LEAD_HOT");
    expect(leadTemperatureForListingPipelineStage("appraisal", "LEAD_ARCHIVED")).toBe("LEAD_ARCHIVED");
  });

  it("does not override warm on listed stage", () => {
    expect(leadTemperatureForListingPipelineStage("listing", "LEAD_COLD")).toBe("LEAD_COLD");
    expect(leadTemperatureForListingPipelineStage("listing", "LEAD_WARM")).toBe("LEAD_WARM");
  });
});
