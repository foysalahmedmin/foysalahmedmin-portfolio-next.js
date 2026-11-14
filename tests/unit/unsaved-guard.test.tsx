// @vitest-environment jsdom
import { EditorActionBar } from "@/components/console";
import { UnsavedChangesGuard } from "@/components/console/unsaved-guard";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const click = (anchor: HTMLAnchorElement, init: MouseEventInit = {}) => {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  anchor.dispatchEvent(event);
  return event;
};

const link = (href: string, attributes: Record<string, string> = {}) => {
  const anchor = document.createElement("a");
  anchor.href = href;
  for (const [key, value] of Object.entries(attributes))
    anchor.setAttribute(key, value);
  document.body.append(anchor);
  return anchor;
};

describe("UnsavedChangesGuard", () => {
  it("does nothing while the editor is clean", () => {
    const confirm = vi.spyOn(window, "confirm");
    render(<UnsavedChangesGuard dirty={false} />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(click(link("/admin/articles")).defaultPrevented).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks the browser to warn on reload and close when dirty", () => {
    render(<UnsavedChangesGuard dirty />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("confirms a click on an in-app link and cancels it when declined", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<UnsavedChangesGuard dirty />);
    const event = click(link("/admin/articles"));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets the click through when the user confirms", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<UnsavedChangesGuard dirty />);
    expect(click(link("/admin/articles")).defaultPrevented).toBe(false);
  });

  it("ignores hash links on the page, new tabs, modified clicks and other origins", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<UnsavedChangesGuard dirty />);
    const here = window.location.pathname + window.location.search;
    expect(click(link(`${here}#publishing`)).defaultPrevented).toBe(false);
    expect(
      click(link("/admin/articles", { target: "_blank" })).defaultPrevented
    ).toBe(false);
    expect(
      click(link("/admin/articles"), { ctrlKey: true }).defaultPrevented
    ).toBe(false);
    expect(click(link("https://example.com/")).defaultPrevented).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("stops guarding once the editor is clean again", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { rerender } = render(<UnsavedChangesGuard dirty />);
    rerender(<UnsavedChangesGuard dirty={false} />);
    expect(click(link("/admin/articles")).defaultPrevented).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("is part of the editor action bar, driven by the unsaved count", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { rerender } = render(<EditorActionBar unsavedCount={2} />);
    expect(click(link("/admin/pages")).defaultPrevented).toBe(true);
    rerender(<EditorActionBar unsavedCount={0} />);
    expect(click(link("/admin/pages")).defaultPrevented).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
