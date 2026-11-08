// @vitest-environment jsdom

import ContactContentSection from "@/components/(common)/contact-page/contact-content-section";
import type { ContactTopic } from "@/components/(common)/contact-page/topic";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const site = () => {
  const value = createEmergencyPublicSite();
  value.next_steps = [
    {
      key: "describe",
      title: "You describe the problem",
      summary: "A few lines.",
      enabled: true,
    },
    {
      key: "answer",
      title: "I reply with a straight answer",
      summary: "Whether I can help.",
      enabled: true,
    },
  ];
  value.contact.public_email = "owner@example.com";
  value.contact.working_hours = "Weekdays, 09:00 to 17:00 (UTC+6)";
  return value;
};

const PROBLEM: ContactTopic = {
  key: "software-keeps-breaking",
  kind: "problem",
  group: "systems",
  label: "Our software keeps breaking as we grow.",
  subject: "Re: Our software keeps breaking as we grow.",
};

describe("contact page layout", () => {
  it("lists what happens next from the Site data, in order, without numerals", () => {
    render(<ContactContentSection site={site()} />);

    const list = screen.getByRole("list", { name: "What happens next" });
    const items = list.querySelectorAll("li");
    expect([...items].map((item) => item.textContent)).toEqual([
      "You describe the problemA few lines.",
      "I reply with a straight answerWhether I can help.",
    ]);
    expect(list.tagName).toBe("OL");
    const css = readFileSync(
      "src/assets/styles/public/pages-conversation.css",
      "utf8"
    );
    expect(css).toMatch(/\.cv-steps \{[^}]*list-style: none/);
  });

  it("hides what happens next when the Site has no steps", () => {
    const empty = site();
    empty.next_steps = [];
    render(<ContactContentSection site={empty} />);

    expect(screen.queryByText("What happens next")).toBeNull();
    expect(
      screen.queryByRole("list", { name: "What happens next" })
    ).toBeNull();
    // The form is still there
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
  });

  it("shows the public email and working hours only when published", () => {
    const { unmount } = render(<ContactContentSection site={site()} />);
    expect(
      screen.getByRole("link", { name: "owner@example.com" })
    ).toHaveAttribute("href", "mailto:owner@example.com");
    expect(
      screen.getByText("Weekdays, 09:00 to 17:00 (UTC+6)")
    ).toBeInTheDocument();
    unmount();

    const bare = site();
    delete bare.contact.public_email;
    delete bare.contact.working_hours;
    render(<ContactContentSection site={bare} />);
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
    expect(screen.queryByText("Working hours")).toBeNull();
  });

  it("embeds no map, and has no call-to-action band", () => {
    const withMap = site();
    withMap.contact.map_policy = "city_only";
    withMap.contact.location = "Dhaka";
    const { container } = render(<ContactContentSection site={withMap} />);

    expect(
      container.querySelector("iframe, [data-map], a[href*='maps']")
    ).toBeNull();
    expect(container.querySelector("[data-cta-band]")).toBeNull();
  });

  it("renders the same form with and without a topic", () => {
    const { unmount } = render(<ContactContentSection site={site()} />);
    const plain = ["Full Name", "Email Address", "Subject", "Message"].map(
      (label) => screen.getByLabelText(label).tagName
    );
    expect(screen.getByLabelText("Subject")).toHaveValue("");
    expect(screen.queryByRole("link", { name: /remove topic/i })).toBeNull();
    unmount();

    render(<ContactContentSection site={site()} topic={PROBLEM} />);
    expect(
      ["Full Name", "Email Address", "Subject", "Message"].map(
        (label) => screen.getByLabelText(label).tagName
      )
    ).toEqual(plain);
  });
});

describe("contact topic", () => {
  it("shows the topic as a removable chip and pre-fills the subject", () => {
    render(<ContactContentSection site={site()} topic={PROBLEM} />);

    expect(screen.getByLabelText("Subject")).toHaveValue(PROBLEM.subject);
    expect(screen.getByRole("radio", { name: "Systems" })).toBeChecked();
    const remove = screen.getByRole("link", {
      name: `Remove topic: ${PROBLEM.label}`,
    });
    expect(remove).toHaveAttribute("href", "/contact");
  });

  it("checks no group for an engagement model topic", () => {
    render(
      <ContactContentSection
        site={site()}
        topic={{
          key: "architecture-review",
          kind: "model",
          group: null,
          label: "Architecture review",
          subject: "Re: Architecture review",
        }}
        startLabels={["We only have an idea", "Speed"]}
      />
    );

    expect(screen.getByLabelText("Subject")).toHaveValue(
      "Re: Architecture review"
    );
    for (const name of ["Systems", "AI Automation", "Something else"]) {
      expect(screen.getByRole("radio", { name })).not.toBeChecked();
    }
    expect(
      screen.getByText("From the finder: We only have an idea · Speed")
    ).toBeInTheDocument();
  });

  it("renders the topic as text, never as markup", () => {
    const { container } = render(
      <ContactContentSection
        site={site()}
        topic={{ ...PROBLEM, label: '<img src=x onerror="alert(1)">' }}
      />
    );

    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.getByText('<img src=x onerror="alert(1)">')
    ).toBeInTheDocument();
  });

  it("rewrites the subject on a chip change only while it is still the page's line", async () => {
    const user = userEvent.setup();
    render(<ContactContentSection site={site()} topic={PROBLEM} />);

    await user.click(screen.getByRole("radio", { name: "AI Automation" }));
    expect(screen.getByLabelText("Subject")).toHaveValue("AI Automation: ");

    await user.click(screen.getByRole("radio", { name: "Systems" }));
    expect(screen.getByLabelText("Subject")).toHaveValue(PROBLEM.subject);

    await user.type(screen.getByLabelText("Subject"), " and more");
    await user.click(screen.getByRole("radio", { name: "Something else" }));
    expect(screen.getByLabelText("Subject")).toHaveValue(
      `${PROBLEM.subject} and more`
    );
  });

  it("sends exactly the same request body as before, topic or not", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          success: true,
          status: 201,
          message: "Your message was received.",
          data: { receipt: "MIN-1234567890ABCDEF", duplicate: false },
        },
        { status: 201 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ContactContentSection site={site()} topic={PROBLEM} />);

    await user.click(screen.getByRole("radio", { name: "AI Automation" }));
    await user.type(screen.getByLabelText("Full Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email Address"), "ada@example.com");
    await user.type(screen.getByLabelText("Subject"), "automation");
    await user.type(
      screen.getByLabelText("Message"),
      "Please review the architecture for this platform."
    );
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/contacts");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      "company_website",
      "email",
      "form_started_at",
      "message",
      "name",
      "subject",
    ]);
    expect(body).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      subject: "AI Automation: automation",
      company_website: "",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Reference: MIN-1234567890ABCDEF"
    );
  });
});
