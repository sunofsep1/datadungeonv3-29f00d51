import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactExpandableSection } from "./ContactExpandableSection";

describe("ContactExpandableSection", () => {
  it("starts collapsed and toggles aria-expanded on header click", async () => {
    const user = userEvent.setup();
    render(
      <ContactExpandableSection title="Test section" defaultOpen={false} summary={<span>Summary line</span>}>
        <p>Expanded body</p>
      </ContactExpandableSection>,
    );

    const trigger = screen.getByRole("button", { name: /test section/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Summary line")).toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Expanded body")).toBeInTheDocument();
  });
});
