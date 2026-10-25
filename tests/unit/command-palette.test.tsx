// @vitest-environment jsdom

import CommandPalette from "@/components/motion/command-palette";
import { EngineProvider } from "@/components/motion/engine-provider";
import {
  PREFERENCE_COMMANDS,
  type PaletteCommand,
} from "@/lib/palette/commands";
import { getSetting, resetSettingStoreForTests } from "@/state/setting-store";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const prefetch = vi.fn();
const setPreference = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, prefetch }),
}));
vi.mock("@/providers/motion-provider", () => ({
  useMotion: () => ({ setPreference }),
}));

const commands: PaletteCommand[] = [
  { id: "nav:/", label: "Home", group: "Navigate", href: "/" },
  { id: "nav:/about", label: "About", group: "Navigate", href: "/about" },
  { id: "nav:/contact", label: "Contact", group: "Navigate", href: "/contact" },
  {
    id: "nav:mail",
    label: "Email",
    group: "Navigate",
    href: "mailto:hello@example.test",
    external: true,
  },
];

const mount = (requests = 1) =>
  render(
    <EngineProvider>
      <button>Opener</button>
      <CommandPalette commands={commands} requests={requests} />
    </EngineProvider>
  );

const input = () =>
  screen.getByRole("combobox", { name: "Search pages and settings" });

beforeEach(() => {
  resetSettingStoreForTests();
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  vi.restoreAllMocks();
});

describe("CommandPalette (M20)", () => {
  it("renders nothing until the shell asks for it", () => {
    mount(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a labelled modal dialog with a combobox that owns a listbox", () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "Command palette" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const box = input();
    const listbox = screen.getByRole("listbox", { name: "Results" });
    expect(box).toHaveAttribute("aria-controls", listbox.id);
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(box).toHaveAttribute("aria-autocomplete", "list");
    expect(
      screen
        .getAllByRole("group")
        .map((group) => group.getAttribute("aria-label"))
    ).toEqual(["Navigate", "Preferences"]);
    expect(screen.getAllByRole("option")).toHaveLength(
      commands.length + PREFERENCE_COMMANDS.length
    );
  });

  it("points aria-activedescendant at the highlighted option and moves it with the arrow keys", () => {
    mount();
    const options = () => screen.getAllByRole("option");
    expect(input()).toHaveAttribute("aria-activedescendant", options()[0]!.id);
    expect(options()[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(input()).toHaveAttribute("aria-activedescendant", options()[1]!.id);
    expect(options()[1]).toHaveAttribute("aria-selected", "true");
    expect(options()[0]).toHaveAttribute("aria-selected", "false");

    fireEvent.keyDown(input(), { key: "ArrowUp" });
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    // wraps to the last option
    expect(input()).toHaveAttribute(
      "aria-activedescendant",
      options().at(-1)!.id
    );

    fireEvent.keyDown(input(), { key: "Home" });
    expect(input()).toHaveAttribute("aria-activedescendant", options()[0]!.id);
    fireEvent.keyDown(input(), { key: "End" });
    expect(input()).toHaveAttribute(
      "aria-activedescendant",
      options().at(-1)!.id
    );
  });

  it("filters as you type, announces the count and says so when nothing matches", () => {
    mount();
    fireEvent.change(input(), { target: { value: "con" } });
    expect(
      screen.getAllByRole("option").map((option) => option.textContent)
    ).toEqual([expect.stringContaining("Contact")]);
    expect(screen.getByRole("status")).toHaveTextContent("1 result");

    fireEvent.change(input(), { target: { value: "zzzz" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("No results");
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
    expect(input()).not.toHaveAttribute("aria-activedescendant");
  });

  it("opens the highlighted page on Enter and closes", () => {
    mount();
    fireEvent.change(input(), { target: { value: "about" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/about");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a page when its option is clicked, and prefetches the highlighted one", () => {
    mount();
    expect(prefetch).toHaveBeenCalledWith("/");
    fireEvent.click(screen.getByRole("option", { name: /Contact/ }));
    expect(push).toHaveBeenCalledWith("/contact");
  });

  it("runs theme and motion commands", () => {
    mount();
    fireEvent.change(input(), { target: { value: "paper" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(getSetting().theme).toBe("light");
    expect(push).not.toHaveBeenCalled();

    cleanup();
    mount();
    fireEvent.change(input(), { target: { value: "motion: off" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(setPreference).toHaveBeenCalledWith("off");
  });

  it("opens an external link in a new tab without opener access", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    mount();
    fireEvent.change(input(), { target: { value: "email" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(open).toHaveBeenCalledWith(
      "mailto:hello@example.test",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("closes on Escape and returns focus to where it was", () => {
    const view = mount(0);
    const opener = screen.getByRole("button", { name: "Opener" });
    opener.focus();
    view.rerender(
      <EngineProvider>
        <button>Opener</button>
        <CommandPalette commands={commands} requests={1} />
      </EngineProvider>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("locks page scroll while open and releases it on close", () => {
    const view = mount(0);
    view.rerender(
      <EngineProvider>
        <button>Opener</button>
        <CommandPalette commands={commands} requests={1} />
      </EngineProvider>
    );
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("toggles on each request from the shell, and a remount does not toggle twice", () => {
    const view = mount(1);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const next = (requests: number) =>
      view.rerender(
        <EngineProvider>
          <button>Opener</button>
          <CommandPalette commands={commands} requests={requests} />
        </EngineProvider>
      );
    next(2);
    expect(screen.queryByRole("dialog")).toBeNull();
    next(3);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Opened with Escape in between, the next request still opens it
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => next(4));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes when the scrim is pressed but not when the dialog is", () => {
    mount();
    const dialog = screen.getByRole("dialog");
    fireEvent.mouseDown(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseDown(dialog.parentElement!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
