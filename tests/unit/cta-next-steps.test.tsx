// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type { TPublicSiteDto, TSiteNextStep } from "@/app/api/site/site.type";
import type { TPublicFAQDto } from "@/app/api/faqs/faq.type";
import ContactCTASection from "@/components/sections/contact-cta-section";
import { FAQSection } from "@/components/sections/evidence-sections";
import { createSiteContentV8 } from "@/lib/seed/foundation-site-content";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

const nextSteps = createSiteContentV8()
  .next_steps as unknown as TSiteNextStep[];

const site = (over: Partial<TPublicSiteDto> = {}): TPublicSiteDto => ({
  ...createEmergencyPublicSite(),
  next_steps: nextSteps,
  ...over,
});

describe("ContactCTASection: what happens after you write", () => {
  it("adds the sequence above the statement for the banner layout", () => {
    const { container } = render(
      <ContactCTASection site={site()} layout="banner" />
    );
    const list = screen.getByRole("list", {
      name: "What happens after you write",
    });
    expect(list.tagName).toBe("OL");
    const steps = within(list).getAllByRole("listitem");
    expect(steps).toHaveLength(nextSteps.length);
    nextSteps.forEach((step, index) => {
      expect(within(steps[index]!).getByText(step.title)).toBeInTheDocument();
      expect(within(steps[index]!).getByText(step.summary)).toBeInTheDocument();
    });

    // Above the statement, inside the one band
    const heading = screen.getByRole("heading", { level: 2 });
    expect(
      list.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild).toHaveAttribute("data-cta-band");
    expect(container.firstElementChild).toHaveAttribute("data-tone", "invert");
  });

  it("order is carried by the list and a wire: no visible numerals", () => {
    render(<ContactCTASection site={site()} layout="banner" />);
    const list = screen.getByRole("list", {
      name: "What happens after you write",
    });
    expect(list).toHaveAttribute("data-scroll-progress");
    within(list)
      .getAllByRole("listitem")
      .forEach((step, index) => {
        expect(step.textContent).not.toMatch(/^\s*\d/);
        expect(step.style.getPropertyValue("--t")).toBe(
          String(index / nextSteps.length)
        );
      });
  });

  it("keeps the primary action and the email", () => {
    render(
      <ContactCTASection
        site={site({
          contact: {
            ...createEmergencyPublicSite().contact,
            public_email: "hello@example.com",
          },
        })}
        layout="banner"
      />
    );
    expect(
      screen.getByRole("link", { name: /Start a conversation/ })
    ).toHaveAttribute("href", "/contact");
    expect(
      screen.getByRole("link", { name: "hello@example.com" })
    ).toHaveAttribute("href", "mailto:hello@example.com");
  });

  it("is the same band as before for any other layout, or when there are no steps", () => {
    const plain = render(<ContactCTASection site={site()} />).container
      .innerHTML;
    cleanup();
    expect(
      screen.queryByRole("list", { name: "What happens after you write" })
    ).toBeNull();

    const other = render(<ContactCTASection site={site()} layout="split" />)
      .container.innerHTML;
    cleanup();
    const empty = render(
      <ContactCTASection site={site({ next_steps: [] })} layout="banner" />
    ).container.innerHTML;

    expect(plain).not.toContain("What happens after you write");
    expect(other).toBe(plain);
    expect(empty).toBe(plain);
  });
});

describe("FAQSection: centred accordion, mono category label", () => {
  const faq = (index: number, category: string) =>
    ({
      slug: `faq-${index}`,
      question: `Question ${index}?`,
      answer: `<p>Answer ${index}</p>`,
      category,
    }) as unknown as TPublicFAQDto;

  it("labels each question with its category when the list mixes categories", () => {
    const { container } = render(
      <FAQSection
        faqs={[faq(0, "engagement"), faq(1, "process"), faq(2, "technical")]}
        layout="list"
      />
    );
    expect(container.querySelector("section#faq")).not.toBeNull();
    expect(container.querySelectorAll("details")).toHaveLength(3);
    const labels = Array.from(
      container.querySelectorAll("summary .t-eyebrow")
    ).map((node) => node.textContent);
    expect(labels).toEqual(["engagement", "process", "technical"]);
    expect(screen.getByText("Question 1?")).toBeInTheDocument();
  });

  it("leaves the label out when every question shares one category", () => {
    const { container } = render(
      <FAQSection faqs={[faq(0, "engagement"), faq(1, "engagement")]} />
    );
    expect(container.querySelector("summary .t-eyebrow")).toBeNull();
  });
});
