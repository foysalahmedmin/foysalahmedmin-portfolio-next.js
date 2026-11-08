// @vitest-environment jsdom

import ProjectDetailsSection, {
  getPublicProjectLinks,
  type TPublicProjectResource,
} from "@/components/(common)/projects-page/project-details-section";
import type { TProject } from "@/types/project.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/optimized-media", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt || ""} />,
}));

vi.mock("@/components/content/rich-content-renderer", () => ({
  RichContentRenderer: () => <div>Rendered case-study body</div>,
}));

vi.mock("@/components/content/project-gallery", () => ({
  ProjectGallery: () => <div>Project gallery</div>,
}));

const project = (overrides: Partial<TProject> = {}): TProject => ({
  _id: "project-1",
  slug: "safe-project",
  name: "Safe Project",
  description: "A safe public project.",
  content: "<p>Body</p>",
  status: "completed",
  is_featured: true,
  is_premium: false,
  primary_pillar: "software_developer",
  project_type: "internal",
  delivery_status: "completed",
  role: "Full-stack engineer",
  architecture: "A public-safe architecture summary.",
  implementation: "Built with typed contracts.",
  security: "No private link exposure.",
  performance_reliability: "Predictable fallback states.",
  outcomes: [
    {
      label: "Review state",
      value: "Verified",
      verification_state: "verified",
    },
  ],
  tags: ["Next.js"],
  ...overrides,
});

describe("ProjectDetailsSection", () => {
  afterEach(cleanup);

  it("hides live/source/resource controls when URLs are not public-safe", () => {
    const resources: TPublicProjectResource[] = [
      {
        _id: "resource-1",
        title: "Internal runbook",
        type: "documentation",
        url: "http://127.0.0.1/runbook",
      },
      {
        _id: "resource-2",
        title: "Local design file",
        type: "design",
        url: "https://design.local/file",
      },
    ];
    const unsafe = project({
      live_url: "http://localhost:3000/preview",
      source_url: "javascript:alert(1)",
    });

    render(
      <ProjectDetailsSection
        project={unsafe}
        resources={resources}
        related={[]}
      />
    );

    expect(getPublicProjectLinks(unsafe)).toEqual([]);
    expect(screen.queryByText("Public resources")).not.toBeInTheDocument();
    expect(screen.queryByText("Internal runbook")).not.toBeInTheDocument();
    expect(screen.queryByText("Local design file")).not.toBeInTheDocument();
  });

  it("tells the project in the case-file vocabulary, without its own header or CTA", () => {
    const { container } = render(
      <ProjectDetailsSection
        project={project({
          problem: "Orders were re-typed by hand and often went wrong.",
          constraints: ["A two-person team"],
          decisions: ["Automate the slowest hand-off first"],
          learnings: ["Small releases kept the team confident"],
        })}
        resources={[]}
        related={[]}
      />
    );

    const titles = Array.from(
      container.querySelectorAll("article section h2")
    ).map((heading) => heading.textContent);
    expect(titles).toEqual(["Problem", "Approach", "Result"]);
    // The A4 template owns the header (the only h1) and the CtaBand
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Facing a similar problem?" })
    ).toBeNull();

    // Every field the old page showed is still there
    expect(
      screen.getByText("Orders were re-typed by hand and often went wrong.")
    ).toBeInTheDocument();
    expect(screen.getByText("A two-person team")).toBeInTheDocument();
    expect(
      screen.getByText("A public-safe architecture summary.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Automate the slowest hand-off first")
    ).toBeInTheDocument();
    expect(screen.getByText("Built with typed contracts.")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Evidence verified")).toBeInTheDocument();
    expect(screen.getByText("No private link exposure.")).toBeInTheDocument();
    expect(
      screen.getByText("Predictable fallback states.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Small releases kept the team confident")
    ).toBeInTheDocument();
    // Decisions are an ordered list: the wire carries the order, no numerals are printed
    expect(container.querySelector("ol.lab-wire")).toHaveTextContent(
      "Automate the slowest hand-off first"
    );
  });

  it("puts role, type, status, year and stack in the facts aside", () => {
    render(
      <ProjectDetailsSection
        project={project({
          started_at: "2023-03-01T00:00:00.000Z",
          ended_at: "2024-06-01T00:00:00.000Z",
          tags: ["Next.js", "MongoDB"],
        })}
        resources={[]}
        related={[]}
      />
    );
    const facts = screen.getByRole("complementary");
    const term = (label: string) =>
      within(facts).getByText(label, { selector: "dt" }).nextElementSibling;
    expect(term("Role")).toHaveTextContent("Software Developer");
    expect(term("Role")).toHaveTextContent("Full-stack engineer");
    expect(term("Type")).toHaveTextContent("Internal");
    expect(term("Status")).toHaveTextContent("Completed");
    expect(term("Year")).toHaveTextContent("2023–2024");
    expect(term("Stack")).toHaveTextContent("Next.js");
    expect(term("Stack")).toHaveTextContent("MongoDB");
  });

  it("lists related projects as links", () => {
    render(
      <ProjectDetailsSection
        project={project()}
        resources={[]}
        related={[
          {
            _id: "p2",
            slug: "queue-platform",
            name: "Queue platform",
            description: "Reliable delivery.",
            status: "completed",
            is_featured: false,
            is_premium: false,
            primary_pillar: "software_developer",
          },
        ]}
      />
    );
    expect(
      screen.getByRole("link", { name: "Queue platform" })
    ).toHaveAttribute("href", "/projects/queue-platform");
  });

  it("renders only validated HTTPS public project links and resources", () => {
    const safe = project({
      live_url: "https://example.com/product",
      source_url: "https://github.com/example/repo",
    });
    render(
      <ProjectDetailsSection
        project={safe}
        resources={[
          {
            _id: "resource-1",
            title: "Public architecture note",
            type: "documentation",
            url: "https://docs.example.com/architecture",
          },
          {
            _id: "resource-2",
            title: "Private source mirror",
            type: "repository",
            url: "https://mirror.internal/repo",
          },
        ]}
        related={[]}
      />
    );

    expect(getPublicProjectLinks(safe)).toEqual([
      { label: "Open live product", href: "https://example.com/product" },
      { label: "View public source", href: "https://github.com/example/repo" },
    ]);
    expect(
      screen.getByRole("link", { name: /public architecture note/i })
    ).toHaveAttribute("href", "https://docs.example.com/architecture");
    expect(screen.queryByText("Private source mirror")).not.toBeInTheDocument();
  });
});
