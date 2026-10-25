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

describe("ProcessStepsSection", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    // A row wider than its box, so the arrows have somewhere to go
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(1200);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
  });

  afterEach(() => vi.restoreAllMocks());

  it("shows the enabled steps as numberless cards in a row with the standard arrows", () => {
    const { container } = render(<ProcessStepsSection steps={steps} />);
    const list = screen.getByRole("list", { name: "Working process steps" });
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.querySelector("h3")?.textContent)).toEqual([
      "Understand the thing",
      "Shape the thing",
      "Build the thing",
    ]);
    expect(container.textContent).not.toMatch(/\b0[1-9]\b/);
    expect(container.textContent).toContain("You get");

    // Standard arrows: previous is disabled at the start, next moves one card smoothly
    const previous = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(previous).toBeDisabled();
    const scrollBy = vi.fn();
    list.scrollBy = scrollBy as unknown as typeof list.scrollBy;
    Object.defineProperty(cards[0]!, "offsetWidth", { value: 300 });
    fireEvent.click(next);
    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth", left: expect.any(Number) })
    );
  });

  it("does not render without steps", () => {
    const { container } = render(
      <ProcessStepsSection
        steps={steps.map((s) => ({ ...s, enabled: false }))}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("uses plain scrolling, not smooth, when the visitor asked for less motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<ProcessStepsSection steps={steps} />);
    const list = screen.getByRole("list", { name: "Working process steps" });
    const scrollBy = vi.fn();
    list.scrollBy = scrollBy as unknown as typeof list.scrollBy;
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "auto" })
    );
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
