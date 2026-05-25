import { describe, expect, it } from "vitest";
import {
  facebookProfileUrl,
  instagramProfileUrl,
  linkedinProfileUrl,
  twitterProfileUrl,
} from "@/lib/contactSocialLinks";

describe("contactSocialLinks", () => {
  it("builds profile URLs from handles", () => {
    expect(twitterProfileUrl("@greg")).toBe("https://x.com/greg");
    expect(instagramProfileUrl("myagency")).toBe("https://instagram.com/myagency");
    expect(linkedinProfileUrl("https://linkedin.com/in/greg")).toBe("https://linkedin.com/in/greg");
    expect(facebookProfileUrl("@page")).toBe("https://facebook.com/page");
  });
});
