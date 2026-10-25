// @vitest-environment jsdom

import MotionPreferences from "@/components/ui/motion-preferences";
import {
  getScenePreference,
  resetScenePreferenceForTests,
} from "@/state/scene-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setPreference = vi.fn();
const motion = {
  preference: "system",
  setPreference,
  effectiveMotion: "full",
  hydrated: true,
};
vi.mock("@/providers/motion-provider", () => ({ useMotion: () => motion }));

beforeEach(() => {
  resetScenePreferenceForTests();
  window.localStorage.clear();
  Object.assign(motion, { preference: "system", hydrated: true });
});
afterEach(cleanup);

describe("MotionPreferences", () => {
  it("offers motion and 3D scene as two labelled radio groups", () => {
    render(<MotionPreferences />);
    const groups = screen.getAllByRole("group");
    expect(
      groups.map((group) => group.querySelector("legend")?.textContent)
    ).toEqual(["Motion", "3D scene"]);
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(screen.getByRole("radio", { name: "Auto" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Live" })).toBeChecked();
  });

  it("changes the motion preference", () => {
    render(<MotionPreferences />);
    fireEvent.click(screen.getByRole("radio", { name: "Reduced" }));
    expect(setPreference).toHaveBeenCalledWith("reduce");
    fireEvent.click(screen.getByRole("radio", { name: "Off" }));
    expect(setPreference).toHaveBeenCalledWith("off");
  });

  it("stores the 3D scene choice and mirrors it on the document", () => {
    render(<MotionPreferences />);
    fireEvent.click(screen.getByRole("radio", { name: "Still" }));
    expect(getScenePreference()).toBe("still");
    expect(window.localStorage.getItem("portfolio:scene-preference")).toBe(
      "still"
    );
    expect(document.documentElement.dataset.scene).toBe("still");
    expect(screen.getByRole("radio", { name: "Still" })).toBeChecked();
  });

  it("announces the effective motion and disables the controls until hydrated", () => {
    motion.hydrated = false;
    render(<MotionPreferences />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Effective motion: full"
    );
    for (const radio of screen.getAllByRole("radio"))
      expect(radio).toBeDisabled();
  });
});
