// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import {
  ChapterPage,
  ConversationLayout,
  CtaBand,
  DetailLayout,
  DocumentLayout,
  IndexLayout,
  NarrativePage,
  PageHeader,
  StoryLayout,
  SystemPage,
} from "@/components/templates";
import { ArchetypeSkeleton } from "@/components/templates/archetype-skeleton";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { FieldError } from "@/components/ui/field-error";
import { Icon } from "@/components/ui/icon";
import { Metric } from "@/components/ui/metric";
import { Panel } from "@/components/ui/panel";
import { StatusMark, type StatusMarkState } from "@/components/ui/status-mark";
import { SystemPath } from "@/components/ui/system-path";
import { Tag } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { Toast } from "@/components/ui/toast";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const site = createEmergencyPublicSite();

afterEach(cleanup);

describe("StatusMark", () => {
  const states: StatusMarkState[] = [
    "draft",
    "published",
    "pending",
    "warning",
    "error",
    "success",
    "archived",
    "verified",
    "derived",
    "unverified",
  ];

  it.each(states)(
    "%s carries a visible text label and a decorative glyph",
    (state) => {
      const { container } = render(
        <StatusMark state={state}>Label for {state}</StatusMark>
      );
      expect(screen.getByText(`Label for ${state}`)).toBeVisible();
      const glyph = container.querySelector(".status-mark__glyph");
      expect(glyph).toHaveAttribute("aria-hidden", "true");
      expect(container.firstElementChild).toHaveAttribute("data-state", state);
    }
  );

  it("maps verification states onto the existing glyph shapes", () => {
    const { container, rerender } = render(
      <StatusMark state="verified">v</StatusMark>
    );
    expect(container.firstElementChild).toHaveAttribute(
      "data-glyph",
      "published"
    );
    rerender(<StatusMark state="derived">d</StatusMark>);
    expect(container.firstElementChild).toHaveAttribute(
      "data-glyph",
      "pending"
    );
    rerender(<StatusMark state="unverified">u</StatusMark>);
    expect(container.firstElementChild).toHaveAttribute("data-glyph", "draft");
  });
});

describe("display primitives", () => {
  it("Panel inverse declares the opposite tone and ticks adds the corner marks", () => {
    const { container } = render(
      <>
        <Panel variant="inverse">Inverse</Panel>
        <Panel ticks>Ticked</Panel>
      </>
    );
    expect(screen.getByText("Inverse")).toHaveAttribute("data-tone", "invert");
    expect(screen.getByText("Ticked")).toHaveClass("ticks");
    expect(container.querySelectorAll("[data-tone]")).toHaveLength(1);
  });

  it("Metric names its source and date", () => {
    render(
      <Metric
        value="12 wk"
        label="Median delivery"
        source="Case files"
        asOf="Oct 2026"
      />
    );
    expect(screen.getByText("Case files · as of Oct 2026")).toBeInTheDocument();
  });

  it("Tag renders its variant", () => {
    render(<Tag variant="solid">Solid</Tag>);
    expect(screen.getByText("Solid")).toHaveClass("bg-foreground");
  });

  it("FieldError leads with a heavy Error label and the message", () => {
    render(<FieldError id="e">Enter a valid address.</FieldError>);
    const node = document.getElementById("e")!;
    expect(node).toHaveTextContent("Error: Enter a valid address.");
    expect(node.querySelector("strong")).toHaveTextContent("Error:");
  });

  it("Accordion is native disclosure, grouped by name", () => {
    const { container } = render(
      <Accordion>
        <AccordionItem title="One" name="faq" open>
          First
        </AccordionItem>
        <AccordionItem title="Two" name="faq">
          Second
        </AccordionItem>
      </Accordion>
    );
    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(2);
    expect(details[0]).toHaveAttribute("open");
    expect(details[1]).toHaveAttribute("name", "faq");
  });

  it("Toast announces errors as alerts, others as status, and never relies on colour", () => {
    const { rerender } = render(<Toast tone="error" title="Not sent" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Error: Not sent");
    rerender(<Toast tone="success" title="Published r13" />);
    expect(screen.getByRole("status")).toHaveTextContent("Done: Published r13");
    const onDismiss = vi.fn();
    rerender(<Toast title="Hello" onDismiss={onDismiss} />);
    screen.getByRole("button", { name: "Dismiss notification" }).click();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe("navigation primitives", () => {
  it("SystemPath is a breadcrumb landmark with aria-current on the last item", () => {
    render(
      <SystemPath
        items={[
          { index: 1, name: "Home", href: "/" },
          { index: 2, name: "case-studies", href: "/case-studies" },
          { index: 3, name: "safe-migration" },
        ]}
      />
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toHaveTextContent("~/case-studies/safe-migration");
    expect(screen.getByText("safe-migration")).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("TextLink opens external links safely and says so", () => {
    render(
      <>
        <TextLink href="/about">About</TextLink>
        <TextLink href="https://example.com/doc">Doc</TextLink>
      </>
    );
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute(
      "target"
    );
    const external = screen.getByRole("link", { name: /Doc/ });
    expect(external).toHaveAttribute("target", "_blank");
    expect(external).toHaveAttribute("rel", "noopener noreferrer");
    expect(external).toHaveTextContent("(opens in a new tab)");
  });

  it("Icon resolves known names and renders nothing for unknown ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container, rerender } = render(
      <Icon name="house" className="size-4" />
    );
    expect(container.querySelector("svg")).not.toBeNull();
    rerender(<Icon name="HOUSE" />);
    expect(container.querySelector("svg")).not.toBeNull();
    rerender(<Icon name="not-an-icon" />);
    expect(container.querySelector("svg")).toBeNull();
    warn.mockRestore();
  });
});

describe("archetype templates", () => {
  const header = { title: "Page title", lede: "Page lede" };

  it.each([
    ["A1", ChapterPage, false, false],
    ["A2", IndexLayout, true, true],
    ["A3", StoryLayout, false, true],
    ["A4", DetailLayout, false, true],
    ["A5", NarrativePage, true, true],
    ["A6", ConversationLayout, true, false],
    ["A7", DocumentLayout, false, false],
  ] as const)(
    "%s renders one main with its archetype, header %s, CtaBand %s",
    (id, Template, withHeader, withCta) => {
      const { container } = render(
        <Template
          route="x"
          revision={3}
          site={site}
          header={withHeader ? header : null}
        >
          <p>body</p>
        </Template>
      );
      const main = container.querySelector("main")!;
      expect(container.querySelectorAll("main")).toHaveLength(1);
      expect(main).toHaveAttribute("data-archetype", id);
      expect(main).toHaveAttribute("data-public-route", "x");
      expect(main).toHaveAttribute("data-page-revision", "3");
      expect(container.querySelectorAll("[data-page-header]")).toHaveLength(
        withHeader ? 1 : 0
      );
      expect(container.querySelectorAll("[data-cta-band]")).toHaveLength(
        withCta ? 1 : 0
      );
      if (withHeader)
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          "Page title"
        );
    }
  );

  it("lets a page opt out of the CtaBand when its composition already ends with one", () => {
    const { container } = render(
      <IndexLayout route="projects" site={site} cta={false}>
        <p>body</p>
      </IndexLayout>
    );
    expect(container.querySelectorAll("[data-cta-band]")).toHaveLength(0);
  });

  it("CtaBand takes the opposite tone and is a labelled band", () => {
    const { container } = render(<CtaBand site={site} />);
    const band = container.querySelector("[data-cta-band]")!;
    expect(band).toHaveAttribute("data-band");
    expect(band).toHaveAttribute("data-tone", "invert");
    expect(band).toHaveAttribute("aria-labelledby", "cta-band-title");
  });

  it("PageHeader renders the system path as the breadcrumb", () => {
    render(
      <PageHeader
        title="Problems solved"
        path={[
          { index: 1, name: "Home", href: "/" },
          { index: 2, name: "Projects", href: "/projects" },
        ]}
      />
    );
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Problems solved"
    );
  });

  it("SystemPage is archetype A8 and ArchetypeSkeleton is busy and labelled", () => {
    const { container, unmount } = render(
      <SystemPage code="404" title="Not here" />
    );
    expect(container.querySelector("main")).toHaveAttribute(
      "data-archetype",
      "A8"
    );
    unmount();
    const skeleton = render(<ArchetypeSkeleton archetype="A2" />);
    const main = skeleton.container.querySelector("main")!;
    expect(main).toHaveAttribute("aria-busy", "true");
    expect(main).toHaveAttribute("data-archetype", "A2");
    expect(screen.getByRole("status")).toHaveTextContent("Loading content");
  });
});
