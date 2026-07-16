// @vitest-environment jsdom

import { RichContentRenderer } from "@/components/content/rich-content-renderer";
import type { RichContentDocument } from "@/lib/content/rich-content";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/optimized-media", () => ({
  default: ({
    src,
    alt,
    fallback,
    pillar,
  }: {
    src?: string;
    alt: string;
    fallback: string;
    pillar?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      data-fallback={fallback}
      data-pillar={pillar}
    />
  ),
}));

const document: RichContentDocument = {
  schema_version: 1,
  sanitizer_policy_version: 1,
  blocks: [
    {
      type: "media",
      file: {
        _id: "507f1f77bcf86cd799439051",
        url: "https://cdn.example.com/architecture.webp",
        alt_text: "Architecture flow",
      },
      alt: "",
    },
  ],
};

describe("RichContentRenderer media ownership", () => {
  afterEach(cleanup);

  it("uses the owning content kind and pillar for emergency media fallback", () => {
    render(
      <RichContentRenderer
        document={document}
        legacyHtml=""
        fallback="project"
        pillar="backend"
      />
    );

    expect(screen.getByRole("img", { name: "Architecture flow" })).toHaveAttribute(
      "data-fallback",
      "project"
    );
    expect(screen.getByRole("img", { name: "Architecture flow" })).toHaveAttribute(
      "data-pillar",
      "backend"
    );
  });
});
