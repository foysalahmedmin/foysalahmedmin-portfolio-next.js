// @vitest-environment jsdom

import { ProjectGallery } from "@/components/content/project-gallery";
import type { TFilePopulated } from "@/types/file.type";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/motion/parallax-layer", () => ({
  default: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

const image = (id: string, caption: string): TFilePopulated => ({
  _id: id,
  url: `/images/${id}.png`,
  filename: `${id}.png`,
  mimetype: "image/png",
  size: 100,
  provider: "cloudinary",
  alt_text: `${caption} visual`,
  caption,
  focal_point: { x: 0.4, y: 0.6 },
});

describe("ProjectGallery", () => {
  afterEach(cleanup);

  it("opens an accessible lightbox and supports arrow-key navigation", async () => {
    const user = userEvent.setup();
    render(
      <ProjectGallery
        images={[image("one", "Architecture"), image("two", "Operations")]}
        projectName="Platform"
        pillar="system_design"
      />
    );

    const trigger = screen.getByRole("button", {
      name: "Open image 1 of 2: Architecture",
    });
    trigger.focus();
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Architecture" })).toBeVisible();
    expect(screen.getByText("Image 1 of 2")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Operations" })).toBeVisible();
    expect(screen.getByText("Image 2 of 2")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
