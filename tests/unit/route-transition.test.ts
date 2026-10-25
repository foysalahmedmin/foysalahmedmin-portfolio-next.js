import {
  resolveTransitionTarget,
  type TransitionCandidate,
} from "@/lib/motion/route-transition";
import { describe, expect, it } from "vitest";

const base = (overrides: {
  event?: Partial<TransitionCandidate["event"]>;
  anchor?: Partial<TransitionCandidate["anchor"]>;
  href?: string;
}): TransitionCandidate => ({
  event: {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    ...overrides.event,
  },
  anchor: {
    href: "https://site.test/about",
    target: "",
    download: false,
    rel: "",
    optOut: false,
    ...overrides.anchor,
  },
  location: { href: overrides.href ?? "https://site.test/" },
});

describe("resolveTransitionTarget", () => {
  it("takes over a plain click on an internal link to another page", () => {
    expect(resolveTransitionTarget(base({}))).toBe("/about");
    expect(
      resolveTransitionTarget(
        base({ anchor: { href: "https://site.test/projects?page=2#list" } })
      )
    ).toBe("/projects?page=2#list");
    expect(resolveTransitionTarget(base({ anchor: { target: "_self" } }))).toBe(
      "/about"
    );
  });

  it.each([
    ["middle click", { button: 1 }],
    ["right click", { button: 2 }],
    ["command click", { metaKey: true }],
    ["control click", { ctrlKey: true }],
    ["shift click", { shiftKey: true }],
    ["alt click", { altKey: true }],
    ["a click something already handled", { defaultPrevented: true }],
  ])("leaves a %s alone", (_name, event) => {
    expect(resolveTransitionTarget(base({ event }))).toBeNull();
  });

  it("leaves new-tab links, downloads, external-rel links and opt-outs alone", () => {
    expect(
      resolveTransitionTarget(base({ anchor: { target: "_blank" } }))
    ).toBeNull();
    expect(
      resolveTransitionTarget(base({ anchor: { download: true } }))
    ).toBeNull();
    expect(
      resolveTransitionTarget(base({ anchor: { rel: "noopener external" } }))
    ).toBeNull();
    expect(
      resolveTransitionTarget(base({ anchor: { optOut: true } }))
    ).toBeNull();
  });

  it("leaves other origins, the same page and hash or query-only changes alone", () => {
    expect(
      resolveTransitionTarget(
        base({ anchor: { href: "https://other.test/about" } })
      )
    ).toBeNull();
    expect(
      resolveTransitionTarget(
        base({
          anchor: { href: "https://site.test/about#team" },
          href: "https://site.test/about",
        })
      )
    ).toBeNull();
    expect(
      resolveTransitionTarget(
        base({
          anchor: { href: "https://site.test/projects?page=2" },
          href: "https://site.test/projects",
        })
      )
    ).toBeNull();
  });

  it("leaves the admin, the API, framework paths and files alone", () => {
    for (const path of [
      "/admin",
      "/admin/projects",
      "/api/contact",
      "/_next/static/x",
      "/sitemap.xml",
      "/resume.pdf",
      "/feed.json",
    ]) {
      expect(
        resolveTransitionTarget(
          base({ anchor: { href: `https://site.test${path}` } })
        ),
        path
      ).toBeNull();
    }
  });

  it("does not mistake a page whose name merely starts like an excluded prefix", () => {
    expect(
      resolveTransitionTarget(
        base({ anchor: { href: "https://site.test/administration" } })
      )
    ).toBe("/administration");
  });

  it("ignores a malformed href", () => {
    expect(
      resolveTransitionTarget(base({ anchor: { href: "http://[" } }))
    ).toBeNull();
  });
});
