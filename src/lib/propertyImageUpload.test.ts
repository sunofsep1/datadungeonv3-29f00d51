import { describe, expect, it } from "vitest";
import {
  isAllowedPropertyImage,
  propertyImageStoragePath,
  PROPERTY_IMAGE_MIME_TYPES,
} from "@/lib/propertyImageUpload";

describe("propertyImageUpload", () => {
  it("accepts common image mime types", () => {
    expect(PROPERTY_IMAGE_MIME_TYPES).toContain("image/jpeg");
    expect(isAllowedPropertyImage({ type: "image/png", name: "a.png" } as File)).toBe(true);
    expect(isAllowedPropertyImage({ type: "application/pdf", name: "a.pdf" } as File)).toBe(false);
  });

  it("builds user-scoped storage paths", () => {
    const path = propertyImageStoragePath("user-1", "prop-2", "photo.JPG");
    expect(path.startsWith("user-1/prop-2/")).toBe(true);
    expect(path.endsWith(".jpg")).toBe(true);
  });
});
