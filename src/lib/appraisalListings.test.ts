import { describe, expect, it } from "vitest";
import {
  filterAppraisalPipelineListings,
  isAppraisalPipelineListing,
  pipelineDetailBackPath,
  pipelineRecordNoun,
} from "@/lib/appraisalListings";

describe("isAppraisalPipelineListing", () => {
  it("includes appraisal stage listings", () => {
    expect(isAppraisalPipelineListing({ pipeline_stage: "appraisal", status: "active" })).toBe(true);
    expect(isAppraisalPipelineListing({ pipeline_stage: "new", status: "active" })).toBe(true);
  });

  it("excludes other stages and withdrawn", () => {
    expect(isAppraisalPipelineListing({ pipeline_stage: "listing", status: "active" })).toBe(false);
    expect(isAppraisalPipelineListing({ pipeline_stage: "appraisal", status: "withdrawn" })).toBe(false);
  });
});

describe("filterAppraisalPipelineListings", () => {
  it("returns only appraisal-stage rows", () => {
    const rows = [
      { id: "1", pipeline_stage: "appraisal", status: "active" },
      { id: "2", pipeline_stage: "listing", status: "active" },
      { id: "3", pipeline_stage: "appraisal", status: "withdrawn" },
    ];
    expect(filterAppraisalPipelineListings(rows).map((r) => r.id)).toEqual(["1"]);
  });
});

describe("pipelineRecordNoun", () => {
  it("returns Appraisal for appraisal stage", () => {
    expect(pipelineRecordNoun("appraisal")).toBe("Appraisal");
    expect(pipelineRecordNoun("new")).toBe("Appraisal");
  });

  it("returns Listing for listed and later stages", () => {
    expect(pipelineRecordNoun("listing")).toBe("Listing");
    expect(pipelineRecordNoun("under_contract")).toBe("Listing");
  });
});

describe("pipelineDetailBackPath", () => {
  it("routes appraisal stage back to appraisals hub", () => {
    expect(pipelineDetailBackPath("appraisal")).toBe("/appraisals");
  });

  it("routes listed stage back to listings board", () => {
    expect(pipelineDetailBackPath("listing")).toBe("/listings");
  });
});
