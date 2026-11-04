// @vitest-environment jsdom

import AnimationApplier from "@/components/appliers/animation-applier";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const motion = {
  capability: "full",
  effectiveMotion: "full",
  hydrated: true,
  documentVisible: true,
};
vi.mock("@/providers/motion-provider", () => ({ useMotion: () => motion }));

type Callback = IntersectionObserverCallback;
type Fake = { callback: Callback; observed: Element[] };
let observers: Fake[] = [];

class FakeIntersectionObserver {
  readonly fake: Fake;
  constructor(callback: Callback) {
    this.fake = { callback, observed: [] };
    observers.push(this.fake);
  }
  observe = (element: Element) => void this.fake.observed.push(element);
  unobserve = (element: Element) => {
    this.fake.observed = this.fake.observed.filter((item) => item !== element);
  };
  disconnect = vi.fn();
  takeRecords = () => [];
}

// The applier creates the reveal observer first and the first-screen classifier second
const reveal = () => observers[0]!;
const classifier = () => observers[1]!;

const report = (fake: Fake, element: Element, isIntersecting: boolean) =>
  fake.callback(
    [
      {
        isIntersecting,
        target: element,
      } as unknown as IntersectionObserverEntry,
    ],
    {} as IntersectionObserver
  );

beforeEach(() => {
  observers = [];
  Object.assign(motion, { effectiveMotion: "full", capability: "full" });
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const mountWith = (html: string) => {
  document.body.innerHTML = html;
  return render(<AnimationApplier />);
};

describe("reveal v2: the first screen is never hidden", () => {
  it("measures nothing during hydration: blocks wait for the classifier", () => {
    const spy = vi.spyOn(Element.prototype, "getBoundingClientRect");
    mountWith('<div id="a" data-reveal="up"></div>');
    expect(spy).not.toHaveBeenCalled();
    const a = document.getElementById("a")!;
    expect(a.dataset.revealReady).toBeUndefined();
    expect(a.dataset.revealVisible).toBeUndefined();
    expect(classifier().observed).toContain(a);
    spy.mockRestore();
  });

  it("leaves a block that starts on screen shown, with no start pose", () => {
    mountWith('<div id="above" data-reveal="up"></div>');
    const above = document.getElementById("above")!;
    report(classifier(), above, true);
    expect(above.dataset.revealVisible).toBe("true");
    expect(above.dataset.revealReady).toBeUndefined();
    expect(reveal().observed).not.toContain(above);
    expect(classifier().observed).not.toContain(above);
  });

  it("arms a block that starts below the fold and reveals it on entry", async () => {
    mountWith('<div id="below" data-reveal="up"></div>');
    const below = document.getElementById("below")!;
    report(classifier(), below, false);
    expect(below.dataset.revealReady).toBe("true");
    expect(below.dataset.revealVisible).toBeUndefined();
    expect(reveal().observed).toContain(below);

    report(reveal(), below, true);
    await waitFor(() => expect(below.dataset.revealVisible).toBe("true"));
    expect(reveal().observed).not.toContain(below);
  });

  it("plays a forced reveal even from the first screen (the Motion lab replay)", () => {
    mountWith('<div id="forced" data-reveal="up" data-reveal-force></div>');
    const forced = document.getElementById("forced")!;
    report(classifier(), forced, true);
    expect(forced.dataset.revealReady).toBe("true");
    expect(forced.dataset.revealVisible).toBeUndefined();
  });

  it("keeps a repeating reveal observed from the first screen", () => {
    mountWith(
      '<div id="loop" data-reveal="up" data-reveal-repeat="true"></div>'
    );
    const loop = document.getElementById("loop")!;
    report(classifier(), loop, true);
    expect(loop.dataset.revealVisible).toBe("true");
    expect(loop.dataset.revealReady).toBe("true");
    expect(reveal().observed).toContain(loop);

    report(reveal(), loop, false);
    expect(loop.dataset.revealVisible).toBe("false");
  });

  it("waits for a wipe's image to decode before revealing it", async () => {
    document.body.innerHTML =
      '<figure id="wipe" data-reveal="wipe"><img id="photo" alt="" /></figure>';
    let finish: () => void = () => undefined;
    const photo = document.getElementById("photo") as HTMLImageElement;
    photo.decode = () => new Promise<void>((resolve) => (finish = resolve));
    render(<AnimationApplier />);

    const wipe = document.getElementById("wipe")!;
    report(classifier(), wipe, false);
    report(reveal(), wipe, true);
    expect(wipe.dataset.revealVisible).toBeUndefined();
    finish();
    await waitFor(() => expect(wipe.dataset.revealVisible).toBe("true"));
  });

  it("reveals everything immediately when motion is reduced", () => {
    motion.effectiveMotion = "reduced";
    mountWith('<div id="below" data-reveal="up"></div>');
    const below = document.getElementById("below")!;
    expect(below.dataset.revealVisible).toBe("true");
    expect(below.dataset.revealReady).toBeUndefined();
    expect(classifier().observed).toHaveLength(0);
  });

  it("registers blocks added later, such as a client navigation", async () => {
    mountWith("");
    const late = document.createElement("div");
    late.id = "late";
    late.setAttribute("data-reveal", "up");
    document.body.appendChild(late);
    await waitFor(() => expect(classifier().observed).toContain(late));
    report(classifier(), late, false);
    expect(late.dataset.revealReady).toBe("true");
  });

  it("still maps the legacy fade classes", () => {
    mountWith('<div id="legacy" class="fade-up"></div>');
    expect(document.getElementById("legacy")!.dataset.reveal).toBe("up");
  });

  it("does not register a block twice", () => {
    mountWith('<div id="once" data-reveal="up"></div>');
    const once = document.getElementById("once")!;
    document.body.appendChild(document.createElement("div"));
    expect(classifier().observed.filter((item) => item === once)).toHaveLength(
      1
    );
  });
});
