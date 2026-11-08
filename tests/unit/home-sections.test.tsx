// @vitest-environment jsdom

import type { TPublicFAQDto } from "@/app/api/faqs/faq.type";
import { FAQSection } from "@/components/sections/evidence-sections";
import ProcessStepsSection from "@/components/sections/process-steps-section";
import { stripLeadingNumber } from "@/lib/text/strip-number";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const steps = ["Understand", "Shape", "Build", "Launch"].map((word, index) => ({
  key: `step-${index}`,
  title: `${index + 1}. ${word} the thing`,
  summary: `Summary ${word}`,
  deliverable: `Output ${word}`,
  enabled: index !== 3 ? true : false,
}));

describe("stripLeadingNumber", () => {
  it("removes a number the content put in front of its own title", () => {
    expect(stripLeadingNumber("1. Understand the problem")).toBe(
      "Understand the problem"
    );
    expect(stripLeadingNumber("12) Ship it")).toBe("Ship it");
    expect(stripLeadingNumber("3 - Measure")).toBe("Measure");
  });

  it("leaves titles that merely contain digits alone", () => {
    expect(stripLeadingNumber("24/7 support")).toBe("24/7 support");
    expect(stripLeadingNumber("Phase 2 review")).toBe("Phase 2 review");
    expect(stripLeadingNumber("2. ")).toBe("2. ");
  });
});

describe("FAQSection", () => {
  const faqs = [0, 1, 2].map((index) => ({
    slug: `faq-${index}`,
    question: `Question ${index}?`,
    answer: `<p>Answer ${index}</p>`,
  })) as unknown as TPublicFAQDto[];

  it("is a centred accordion with the first answer open and no answer numbers", () => {
    const { container } = render(<FAQSection faqs={faqs} />);
    expect(
      screen.getByRole("heading", { name: "Questions before we start" })
    ).toBeInTheDocument();
    const items = container.querySelectorAll("details");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute("open");
    expect(items[1]).not.toHaveAttribute("open");
    // exclusive group: opening one closes the others
    expect(Array.from(items).map((item) => item.getAttribute("name"))).toEqual([
      "faq",
      "faq",
      "faq",
    ]);
    expect(container.textContent).not.toMatch(/Answer\s*0\d/i);
    expect(container.querySelector("ol")).toBeNull();
  });

  it("explains an empty list instead of rendering a blank section", () => {
    render(<FAQSection faqs={[]} />);
    expect(screen.getByText("No faqs are published yet")).toBeInTheDocument();
  });
});
