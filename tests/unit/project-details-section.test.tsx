// @vitest-environment jsdom

import ProjectDetailsSection, {
  type TPublicProjectResource,
} from "@/components/(common)/projects-page/project-details-section";
import type { TProject } from "@/types/project.type";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/motion/parallax-layer", () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

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
  primary_pillar: "backend",
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

    render(
      <ProjectDetailsSection
        project={project({
          live_url: "http://localhost:3000/preview",
          source_url: "javascript:alert(1)",
        })}
        resources={resources}
        related={[]}
      />
    );

    expect(
      screen.queryByRole("link", { name: /open live product/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /view public source/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Public resources")).not.toBeInTheDocument();
    expect(screen.queryByText("Internal runbook")).not.toBeInTheDocument();
    expect(screen.queryByText("Local design file")).not.toBeInTheDocument();
  });

  it("renders only validated HTTPS public project links", () => {
    render(
      <ProjectDetailsSection
        project={project({
          live_url: "https://example.com/product",
          source_url: "https://github.com/example/repo",
        })}
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

    expect(
      screen.getByRole("link", { name: /open live product/i })
    ).toHaveAttribute("href", "https://example.com/product");
    expect(
      screen.getByRole("link", { name: /view public source/i })
    ).toHaveAttribute("href", "https://github.com/example/repo");
    expect(
      screen.getByRole("link", { name: /public architecture note/i })
    ).toHaveAttribute("href", "https://docs.example.com/architecture");
    expect(screen.queryByText("Private source mirror")).not.toBeInTheDocument();
  });
});
