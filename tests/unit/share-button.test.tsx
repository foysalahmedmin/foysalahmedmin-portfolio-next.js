// @vitest-environment jsdom

import ShareButton from "@/components/content/share-button";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("ShareButton", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses the native share contract when it is available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    const user = userEvent.setup();
    render(<ShareButton title="Secure article" />);

    await user.click(
      screen.getByRole("button", { name: "Share Secure article" })
    );

    expect(share).toHaveBeenCalledWith({
      title: "Secure article",
      url: window.location.href,
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Share dialog opened."
    );
  });

  it("copies the canonical browser URL when native share is unavailable", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<ShareButton title="Fallback article" />);

    await user.click(
      screen.getByRole("button", { name: "Share Fallback article" })
    );

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Link copied to clipboard."
    );
  });
});
