// @vitest-environment jsdom

import { TestimonialsSection } from "@/components/sections/evidence-sections";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("TestimonialsSection", () => {
  afterEach(cleanup);

  it("shows an evidence-based trust alternative when no verified testimonials are public", () => {
    render(<TestimonialsSection testimonials={[]} />);

    expect(screen.getByText("No public testimonials yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Trust is represented by review gates/)
    ).toBeInTheDocument();
    expect(screen.getByText("Verified records only")).toBeInTheDocument();
    expect(screen.getByText("No placeholder client proof")).toBeInTheDocument();
  });
});
