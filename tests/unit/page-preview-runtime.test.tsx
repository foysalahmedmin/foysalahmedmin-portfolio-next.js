// @vitest-environment jsdom

import PagePreviewRuntime from "@/components/admin/page-preview-runtime";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/providers/motion-provider", () => ({
  MotionModeOverride: ({
    mode,
    children,
  }: {
    mode: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="motion-override" data-mode={mode}>
      {children}
    </div>
  ),
}));
vi.mock("@/providers/parallax-provider", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Page preview display runtime", () => {
  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove("light", "dark");
    delete document.documentElement.dataset.motion;
    delete document.documentElement.dataset.previewMotion;
    delete document.documentElement.dataset.previewTheme;
  });

  it("applies normal and reduced motion to both DOM policy and motion context", async () => {
    const { rerender } = render(
      <PagePreviewRuntime theme="dark" motion="normal">
        <p>preview</p>
      </PagePreviewRuntime>
    );
    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
      expect(document.documentElement).toHaveAttribute(
        "data-preview-motion",
        "normal"
      );
      expect(document.documentElement).toHaveAttribute("data-motion", "full");
    });
    expect(screen.getByTestId("motion-override")).toHaveAttribute(
      "data-mode",
      "full"
    );

    rerender(
      <PagePreviewRuntime theme="light" motion="reduced">
        <p>preview</p>
      </PagePreviewRuntime>
    );
    await waitFor(() => {
      expect(document.documentElement).toHaveClass("light");
      expect(document.documentElement).toHaveAttribute(
        "data-preview-motion",
        "reduced"
      );
      expect(document.documentElement).toHaveAttribute(
        "data-motion",
        "reduced"
      );
    });
    expect(screen.getByTestId("motion-override")).toHaveAttribute(
      "data-mode",
      "reduced"
    );
  });
});
