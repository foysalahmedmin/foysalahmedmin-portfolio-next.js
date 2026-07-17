// @vitest-environment jsdom

import PageRendererPreview from "@/components/admin/page-renderer-preview";
import { clearAdminPagePreviewBestEffort } from "@/services/site-page-admin.service";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/site-page-admin.service", () => ({
  clearAdminPagePreviewBestEffort: vi.fn(),
}));

describe("Page renderer preview lifecycle", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("unmounts the opaque frame while the admin window is unfocused", () => {
    const focus = vi.spyOn(document, "hasFocus").mockReturnValue(false);
    render(
      <PageRendererPreview
        routeKey="home"
        revision={4}
        expiresAt={new Date(Date.now() + 600_000).toISOString()}
        onClose={vi.fn()}
        onExpired={vi.fn()}
      />
    );

    expect(
      screen.getByTitle("home Page public renderer preview")
    ).toHaveAttribute("sandbox", "allow-scripts");
    fireEvent.blur(window);
    expect(
      screen.queryByTitle("home Page public renderer preview")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/not focused/i);

    focus.mockReturnValue(true);
    fireEvent.focus(window);
    expect(
      screen.getByTitle("home Page public renderer preview")
    ).toBeInTheDocument();
  });

  it("pauses on tab hiding and rechecks without destroying a valid session", () => {
    const focus = vi.spyOn(document, "hasFocus").mockReturnValue(true);
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");
    const onExpired = vi.fn();
    render(
      <PageRendererPreview
        routeKey="home"
        revision={4}
        expiresAt={new Date(Date.now() + 600_000).toISOString()}
        onClose={vi.fn()}
        onExpired={onExpired}
      />
    );

    visibility.mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    expect(
      screen.queryByTitle("home Page public renderer preview")
    ).not.toBeInTheDocument();
    expect(onExpired).not.toHaveBeenCalled();
    expect(clearAdminPagePreviewBestEffort).not.toHaveBeenCalled();

    visibility.mockReturnValue("visible");
    focus.mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(
      screen.getByTitle("home Page public renderer preview")
    ).toBeInTheDocument();
  });

  it("uses the absolute server expiry and clears the cookie best-effort", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T12:00:00.000Z"));
    const onExpired = vi.fn();
    render(
      <PageRendererPreview
        routeKey="terms"
        revision={9}
        expiresAt="2026-07-17T12:00:02.000Z"
        onClose={vi.fn()}
        onExpired={onExpired}
      />
    );

    act(() => vi.advanceTimersByTime(2_000));
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(clearAdminPagePreviewBestEffort).toHaveBeenCalledWith("terms");
    expect(
      screen.queryByTitle("terms Page public renderer preview")
    ).not.toBeInTheDocument();
  });

  it("rechecks the absolute deadline before focus can remount a paused frame", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T12:00:00.000Z"));
    const focus = vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const onExpired = vi.fn();
    render(
      <PageRendererPreview
        routeKey="about"
        revision={2}
        expiresAt="2026-07-17T12:00:02.000Z"
        onClose={vi.fn()}
        onExpired={onExpired}
      />
    );
    fireEvent.blur(window);
    expect(
      screen.queryByTitle("about Page public renderer preview")
    ).not.toBeInTheDocument();

    vi.setSystemTime(new Date("2026-07-17T12:00:03.000Z"));
    focus.mockReturnValue(true);
    fireEvent.focus(window);

    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(clearAdminPagePreviewBestEffort).toHaveBeenCalledWith("about");
    expect(
      screen.queryByTitle("about Page public renderer preview")
    ).not.toBeInTheDocument();
  });
});
