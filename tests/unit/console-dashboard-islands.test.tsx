// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as SiteService from "@/services/site-page-admin.service";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  publish: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/services/site-page-admin.service", async () => {
  const actual = await vi.importActual<typeof SiteService>(
    "@/services/site-page-admin.service"
  );
  return { ...actual, publishAdminSiteClient: mocks.publish };
});

import {
  RefreshControl,
  STALE_AFTER_MS,
} from "@/components/admin/dashboard/refresh-control";
import { PublishAction } from "@/components/admin/site-review/publish-action";
import { EditorialRequestError } from "@/services/site-page-admin.service";

afterEach(cleanup);

describe("RefreshControl", () => {
  const GENERATED = "2026-11-08T04:42:00.000Z";
  let now = 1_000_000;

  beforeEach(() => {
    now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
  });

  const focusTab = () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  };

  it("shows the refreshed time and a manual Refresh that calls router.refresh", () => {
    render(<RefreshControl generatedAt={GENERATED} />);
    expect(screen.getByText("10:42")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the tab regains focus after 60 s, not before", () => {
    render(<RefreshControl generatedAt={GENERATED} />);
    now += STALE_AFTER_MS - 1;
    focusTab();
    expect(mocks.refresh).not.toHaveBeenCalled();
    now += 1;
    focusTab();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    // The clock restarted: coming back straight away does not refresh again.
    focusTab();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the same button label while it refreshes (no layout shift)", () => {
    render(<RefreshControl generatedAt={GENERATED} />);
    const button = screen.getByRole("button", { name: "Refresh" });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
  });
});

describe("PublishAction", () => {
  beforeEach(() => {
    mocks.publish.mockReset();
    mocks.refresh.mockReset();
  });

  const setup = (props = {}) =>
    render(
      <PublishAction
        expectedRevision={13}
        publishedRevision={12}
        changeCount={3}
        {...props}
      />
    );

  it("asks for confirmation before it calls the publish service with the reviewed revision", async () => {
    mocks.publish.mockResolvedValue({ site: {}, cache_invalidated: true });
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Publish revision r13" })
    );
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Confirm publish" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm publish" }));
    await waitFor(() => expect(mocks.publish).toHaveBeenCalledWith(13));
    await waitFor(() =>
      expect(
        screen.getByText(/Site published and public cache refreshed/)
      ).toBeTruthy()
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("cancel publishes nothing and brings the button back", () => {
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Publish revision r13" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Publish revision r13" })
    ).toBeTruthy();
  });

  it("explains a revision conflict and publishes nothing", async () => {
    mocks.publish.mockRejectedValue(
      new EditorialRequestError({
        status: 409,
        code: "SITE_REVISION_CONFLICT",
        message: "conflict",
        currentRevision: 14,
      })
    );
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Publish revision r13" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm publish" }));
    await waitFor(() =>
      expect(screen.getByText(/A newer revision \(r14\) exists/)).toBeTruthy()
    );
    expect(screen.getByText(/Nothing was published/)).toBeTruthy();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("is disabled when the draft revision is already the published one", () => {
    setup({ publishedRevision: 13 });
    const button = screen.getByRole("button", {
      name: "Current revision published",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
