// @vitest-environment jsdom

import {
  ConsoleEditor,
  ConsoleEmpty,
  ConsoleError,
  ConsoleFilteredEmpty,
  ConsoleInbox,
  ConsoleList,
  ConsoleListSkeleton,
  ConsolePageHeader,
  ConsoleToolbar,
  EditorActionBar,
  EditorHeader,
  EditorSection,
  SectionIndex,
  ValidationSummary,
} from "@/components/console";
import {
  ConsoleAuth,
  ConsoleOverview,
  ConsoleSettings,
} from "@/components/templates";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

describe("C2 list pattern", () => {
  it("renders the page header slots: eyebrow, title, one-line description, primary action", () => {
    render(
      <ConsolePageHeader
        eyebrow="Governance"
        title="Audit log"
        description="Bounded, privacy-safe events."
        actions={<button type="button">New event</button>}
      />
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Audit log" })
    ).toBeVisible();
    expect(screen.getByText("Governance")).toBeVisible();
    expect(screen.getByText("Bounded, privacy-safe events.")).toBeVisible();
    expect(screen.getByRole("button", { name: "New event" })).toBeVisible();
  });

  it("composes the C2 region: header, toolbar, content, and is not a second main landmark", () => {
    const { container } = render(
      <ConsoleList
        title="Articles"
        description="Everything you publish."
        toolbar={<ConsoleToolbar search={<input aria-label="Search" />} />}
      >
        <p>table</p>
      </ConsoleList>
    );
    const region = container.firstElementChild as HTMLElement;
    expect(region).toHaveAttribute("data-archetype", "C2");
    expect(region.tagName).toBe("DIV");
    expect(screen.queryByRole("main")).toBeNull();
    expect(screen.getByRole("heading", { name: "Articles" })).toBeVisible();
    expect(screen.getByRole("group", { name: "List controls" })).toBeVisible();
    expect(screen.getByText("table")).toBeVisible();
  });

  it("toolbar renders only the slots it is given, and can be a search form", () => {
    const { rerender } = render(
      <ConsoleToolbar
        search={<input aria-label="Search" />}
        chips={
          <button type="button" className="cp-chip" aria-pressed="true">
            Published
          </button>
        }
        sort={<select aria-label="Sort" />}
        density={<button type="button">Compact</button>}
      >
        <span>extra</span>
      </ConsoleToolbar>
    );
    const toolbar = screen.getByRole("group", { name: "List controls" });
    for (const name of ["Search", "Sort"]) {
      expect(within(toolbar).getAllByLabelText(name)).toHaveLength(1);
    }
    expect(
      within(toolbar).getByRole("button", { name: "Published" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(within(toolbar).getByText("extra")).toBeVisible();
    expect(toolbar.querySelector(".cp-toolbar__end")).not.toBeNull();

    rerender(<ConsoleToolbar as="form" label="Filter articles" />);
    const form = screen.getByRole("search", { name: "Filter articles" });
    expect(form.tagName).toBe("FORM");
    expect(form.querySelector(".cp-toolbar__end")).toBeNull();
    expect(form.querySelector(".cp-toolbar__search")).toBeNull();
  });

  it("skeleton reserves rows and columns and announces loading", () => {
    const { container } = render(
      <ConsoleListSkeleton rows={5} columns={3} label="Loading articles" />
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading articles…")).toBeInTheDocument();
    expect(container.querySelectorAll(".cp-skeleton__row")).toHaveLength(5);
    expect(container.querySelectorAll(".cp-skeleton__cell")).toHaveLength(15);
  });

  it("empty state says what it is and offers the action", () => {
    render(
      <ConsoleEmpty
        title="No articles yet"
        description="Articles you write appear here."
        action={<Link href="/admin/articles/new">New article</Link>}
      />
    );
    expect(
      screen.getByRole("heading", { name: "No articles yet" })
    ).toBeVisible();
    expect(screen.getByText("Articles you write appear here.")).toBeVisible();
    expect(screen.getByRole("link", { name: "New article" })).toHaveAttribute(
      "href",
      "/admin/articles/new"
    );
  });

  it("filtered-empty offers a clear link, or a clear button for client adopters", async () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <ConsoleFilteredEmpty clearHref="/admin/articles" />
    );
    expect(
      screen.getByRole("heading", { name: "No results match these filters" })
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/admin/articles"
    );

    rerender(<ConsoleFilteredEmpty onClear={onClear} clearLabel="Reset" />);
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("error state is announced, names what failed and offers a retry", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ConsoleError
        title="Could not load articles"
        description="The service did not answer."
        onRetry={onRetry}
      />
    );
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Could not load articles")).toBeVisible();
    expect(
      within(alert).getByText("The service did not answer.")
    ).toBeVisible();
    // the error mark carries a text label, not only a shape
    expect(within(alert).getByText("Error")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<ConsoleError retryHref="/admin/articles" retryLabel="Reload" />);
    expect(screen.getByRole("link", { name: "Reload" })).toHaveAttribute(
      "href",
      "/admin/articles"
    );
  });
});

describe("C3 editor pattern", () => {
  const sections = [
    { id: "sec-basics", label: "Basics" },
    { id: "sec-content", label: "Content", dirty: true },
    { id: "sec-publishing", label: "Publishing", error: true },
  ];

  it("section index links match the section ids and mark dirty and error sections with a label", () => {
    render(
      <>
        <SectionIndex sections={sections} />
        {sections.map((section) => (
          <EditorSection key={section.id} id={section.id} title={section.label}>
            fields
          </EditorSection>
        ))}
      </>
    );
    const nav = screen.getByRole("navigation", { name: "Sections" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["#sec-basics", "#sec-content", "#sec-publishing"]);
    for (const section of sections) {
      const target = document.getElementById(section.id)!;
      expect(target).toHaveAttribute(
        "aria-labelledby",
        `${section.id}-heading`
      );
      expect(
        within(target).getByRole("heading", { level: 2, name: section.label })
      ).toBeVisible();
    }
    expect(within(nav).getByText("Edited")).toBeVisible();
    expect(within(nav).getByText("Error")).toBeVisible();
    expect(
      within(nav).getByRole("link", { name: /Basics/ })
    ).not.toHaveAttribute("data-dirty");
  });

  it("header shows the record title, a status mark, the revision and the last saved time", () => {
    render(
      <EditorHeader
        title="Edge caching notes"
        status={{ state: "published", label: "Published" }}
        revision="r13"
        savedAt="2026-11-08T10:42:00.000Z"
      />
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Edge caching notes" })
    ).toBeVisible();
    expect(
      screen.getByText("Published").closest(".status-mark")
    ).toHaveAttribute("data-state", "published");
    expect(screen.getByText("r13")).toBeVisible();
    const time = screen.getByText(/Nov 8, 2026/);
    expect(time).toHaveAttribute("datetime", "2026-11-08T10:42:00.000Z");
    expect(time).toHaveTextContent("UTC");
  });

  it("header leaves revision and last saved out when the record has none", () => {
    render(<EditorHeader title="New article" />);
    expect(screen.queryByText(/Revision/)).toBeNull();
    expect(screen.queryByText(/Last saved/)).toBeNull();
  });

  it("action bar shows the unsaved count, singular and plural, and its slots", () => {
    const { rerender } = render(
      <EditorActionBar
        unsavedCount={3}
        discard={<button type="button">Discard</button>}
        saveDraft={<button type="submit">Save draft</button>}
        preview={<button type="button">Preview</button>}
        publish={<button type="button">Publish</button>}
      />
    );
    const bar = screen.getByRole("group", { name: "Editor actions" });
    expect(within(bar).getByText("3 unsaved changes")).toBeVisible();
    expect(bar).toHaveAttribute("data-dirty", "true");
    for (const name of ["Discard", "Save draft", "Preview", "Publish"]) {
      expect(within(bar).getByRole("button", { name })).toBeVisible();
    }

    rerender(<EditorActionBar unsavedCount={1} />);
    expect(screen.getByText("1 unsaved change")).toBeVisible();

    rerender(<EditorActionBar unsavedCount={0} />);
    expect(screen.getByText("No unsaved changes")).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Editor actions" })
    ).toHaveAttribute("data-dirty", "false");
  });

  it("validation summary lists every problem with a jump link, and renders nothing when clean", () => {
    const { container, rerender } = render(
      <ValidationSummary
        issues={[
          {
            href: "#article-category",
            field: "Category",
            message: "Select an active article category",
          },
          { message: "Failed to update article" },
        ]}
      />
    );
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("2 problems to fix")).toBeVisible();
    expect(
      within(alert).getByRole("link", {
        name: "Select an active article category",
      })
    ).toHaveAttribute("href", "#article-category");
    expect(within(alert).getByText("Failed to update article")).toBeVisible();
    expect(within(alert).getAllByRole("link")).toHaveLength(1);

    rerender(<ValidationSummary issues={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("composes the C3 region around the sections, with the index only when given", () => {
    const { container, rerender } = render(
      <ConsoleEditor
        header={<EditorHeader title="Record" />}
        validation={<ValidationSummary issues={[{ message: "Broken" }]} />}
        sectionIndex={<SectionIndex sections={[{ id: "a", label: "A" }]} />}
        actionBar={<EditorActionBar unsavedCount={2} />}
      >
        <EditorSection id="a" title="A">
          body
        </EditorSection>
      </ConsoleEditor>
    );
    const region = container.firstElementChild as HTMLElement;
    expect(region).toHaveAttribute("data-archetype", "C3");
    expect(region.querySelector(".cp-editor__body")).toHaveAttribute(
      "data-index"
    );
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByText("2 unsaved changes")).toBeVisible();

    rerender(<ConsoleEditor header={<EditorHeader title="Record" />} />);
    expect(container.querySelector(".cp-editor__body")).not.toHaveAttribute(
      "data-index"
    );
  });
});

describe("region landmarks", () => {
  it("only the auth region is a main; the other regions sit inside the shell's main", () => {
    const { container } = render(
      <>
        <ConsoleAuth>auth</ConsoleAuth>
        <ConsoleOverview>overview</ConsoleOverview>
        <ConsoleSettings>settings</ConsoleSettings>
      </>
    );
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(Array.from(container.children).map((node) => node.tagName)).toEqual([
      "MAIN",
      "DIV",
      "DIV",
    ]);
  });
});

describe("C4 inbox pattern", () => {
  it("renders list and detail panes, and the view decides which one shows on small screens", () => {
    const { container, rerender } = render(
      <ConsoleInbox list={<p>messages</p>} detail={<p>message body</p>} />
    );
    const inbox = container.querySelector(".cp-inbox") as HTMLElement;
    expect(inbox).toHaveAttribute("data-view", "list");
    expect(screen.getByRole("region", { name: "Messages" })).toHaveTextContent(
      "messages"
    );
    expect(screen.getByRole("region", { name: "Message" })).toHaveTextContent(
      "message body"
    );

    rerender(
      <ConsoleInbox
        view="detail"
        list={<p>messages</p>}
        detail={<p>message body</p>}
      />
    );
    expect(container.querySelector(".cp-inbox")).toHaveAttribute(
      "data-view",
      "detail"
    );
    expect(container.firstElementChild).toHaveAttribute("data-archetype", "C4");
  });
});

/*
 * The stylesheet contract: every rule is scoped to the console surface (the public site must not change)
 * and the only backdrop-filter is on the overlays.
 */
describe("console-patterns.css", () => {
  const css = readFileSync(
    join(process.cwd(), "src/assets/styles/public/console-patterns.css"),
    "utf8"
  )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // drop at-rule preludes (@media, @supports) so only style rules are left
    .replace(/@[a-z-]+[^{;]*\{/g, "{");

  const splitTopLevel = (value: string) => {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of value) {
      if (char === "(" || char === "[") depth += 1;
      if (char === ")" || char === "]") depth -= 1;
      if (char === "," && depth === 0) {
        parts.push(current);
        current = "";
      } else current += char;
    }
    parts.push(current);
    return parts.map((part) => part.trim()).filter(Boolean);
  };

  const rules = Array.from(css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)).map(
    (match) => ({
      selector: match[1]!.replace(/\s+/g, " ").trim(),
      body: match[2]!,
    })
  );

  it("has rules", () => {
    expect(rules.length).toBeGreaterThan(80);
  });

  it('scopes every selector to [data-surface="console"]', () => {
    const unscoped = rules.flatMap(({ selector }) =>
      splitTopLevel(selector).filter(
        (part) => !part.startsWith('[data-surface="console"]')
      )
    );
    expect(unscoped).toEqual([]);
  });

  it("uses backdrop-filter on overlays only", () => {
    const offenders = rules.filter(
      ({ selector, body }) =>
        /backdrop-filter:\s*(?!none)/.test(body) &&
        !/modal-content|drawer-content/.test(selector)
    );
    expect(offenders.map(({ selector }) => selector)).toEqual([]);
    // the sticky bars are solid
    for (const cls of [".cp-toolbar", ".cp-actionbar", ".cp-index"]) {
      const sticky = rules.find(({ selector }) => selector.endsWith(cls));
      expect(sticky?.body, cls).not.toMatch(/backdrop-filter/);
      expect(sticky?.body, cls).toMatch(/background:\s*var\(--background\)/);
    }
  });

  it("draws the status marks by shape: heavier warning label, inverted error label", () => {
    const warning = rules.find(({ selector }) =>
      selector.includes('[data-state="warning"] .status-mark__label')
    );
    expect(warning?.body).toMatch(/font-weight:\s*700/);
    const inverted = rules.find(
      ({ selector, body }) =>
        selector.includes('[data-state="error"] .status-mark__label') &&
        /background:\s*var\(--foreground\)/.test(body) &&
        /color:\s*var\(--background\)/.test(body)
    );
    expect(inverted).toBeDefined();
  });
});
