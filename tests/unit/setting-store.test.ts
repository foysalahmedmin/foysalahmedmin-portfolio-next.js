// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const load = async () => {
  vi.resetModules();
  return import("@/state/setting-store");
};

const setPath = (path: string) => window.history.replaceState({}, "", path);

describe("setting store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setPath("/");
  });

  it("starts dark on the public site and on system in the admin (plan D-02)", async () => {
    let store = await load();
    expect(store.getSetting().theme).toBe("dark");

    setPath("/admin/projects");
    store = await load();
    expect(store.getSetting().theme).toBe("system");
  });

  it("lets a saved choice win over the first-visit default", async () => {
    window.localStorage.setItem(
      "setting",
      JSON.stringify({ theme: "light", direction: "ltr", language: "en" })
    );
    const store = await load();
    expect(store.getSetting().theme).toBe("light");
  });

  it("cycles the theme light, dark, system and persists every change", async () => {
    window.localStorage.setItem(
      "setting",
      JSON.stringify({ theme: "light", direction: "ltr", language: "en" })
    );
    const store = await load();
    store.toggleTheme();
    expect(store.getSetting().theme).toBe("dark");
    store.toggleTheme();
    expect(store.getSetting().theme).toBe("system");
    store.toggleTheme();
    expect(store.getSetting().theme).toBe("light");
    expect(JSON.parse(window.localStorage.getItem("setting")!).theme).toBe(
      "light"
    );
  });

  it("toggles language and direction without touching the theme", async () => {
    const store = await load();
    store.toggleLanguage();
    store.toggleDirection();
    expect(store.getSetting()).toMatchObject({
      theme: "dark",
      language: "bn",
      direction: "rtl",
    });
  });

  it("returns a fresh object per change and a stable one between changes (useSyncExternalStore contract)", async () => {
    const store = await load();
    const before = store.getSetting();
    expect(store.getSetting()).toBe(before);
    store.setTheme("light");
    expect(store.getSetting()).not.toBe(before);
  });

  it("survives blocked or corrupt storage", async () => {
    window.localStorage.setItem("setting", "{not json");
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = await load();
    expect(store.getSetting().theme).toBe("dark");
    spy.mockRestore();
  });
});
