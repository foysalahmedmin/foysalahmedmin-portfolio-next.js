// @vitest-environment jsdom

import { Counter } from "@/components/motion/counter";
import { Cursor } from "@/components/motion/cursor";
import {
  EngineProvider,
  useEngine,
  useEngineControls,
} from "@/components/motion/engine-provider";
import { Magnetic } from "@/components/motion/magnetic";
import { PinBeat, PinScene } from "@/components/motion/pin-scene";
import Reveal from "@/components/motion/reveal";
import { TextReveal } from "@/components/motion/text-reveal";
import { TraceRail } from "@/components/motion/trace-rail";
import type { MotionEngine, PointerSnapshot } from "@/lib/motion/engine/types";
import type { Tier } from "@/lib/motion/tier";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Profiler, useEffect, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

/** A stand-in for the engine: it records what the components ask of it and lets a test drive the pointer. */
function createFakeEngine() {
  const pointerListeners = new Set<(pointer: PointerSnapshot) => void>();
  const cleanups = {
    magnetic: vi.fn(),
    counter: vi.fn(),
    textReveal: vi.fn(),
    cursor: vi.fn(),
    pinScene: vi.fn(),
  };
  const behaviors = {
    magnetic: vi.fn(
      (_element: HTMLElement, _options: unknown) => cleanups.magnetic
    ),
    counter: vi.fn(
      (_element: HTMLElement, _options: unknown) => cleanups.counter
    ),
    textReveal: vi.fn((_element: HTMLElement) => cleanups.textReveal),
    cursor: vi.fn((_element: HTMLElement) => cleanups.cursor),
    pinScene: vi.fn(
      (_element: HTMLElement, _options: unknown) => cleanups.pinScene
    ),
  };
  const engine = {
    behaviors,
    lenis: null,
    onPointer: (listener: (pointer: PointerSnapshot) => void) => {
      pointerListeners.add(listener);
      return () => pointerListeners.delete(listener);
    },
    scrollTo: vi.fn(),
  } as unknown as MotionEngine;

  return {
    engine,
    behaviors,
    cleanups,
    movePointer(pointer: PointerSnapshot) {
      pointerListeners.forEach((listener) => listener(pointer));
    },
    listenerCount: () => pointerListeners.size,
  };
}

function PublishEngine({
  engine,
  tier,
  children,
}: {
  engine: MotionEngine | null;
  tier: Tier;
  children: ReactNode;
}) {
  const { publish } = useEngineControls();
  useEffect(() => {
    publish({ engine, status: engine ? "ready" : "disabled", tier });
  }, [engine, publish, tier]);
  return <>{children}</>;
}

const withEngine = (
  engine: MotionEngine | null,
  tier: Tier,
  children: ReactNode
) => (
  <EngineProvider>
    <PublishEngine engine={engine} tier={tier}>
      {children}
    </PublishEngine>
  </EngineProvider>
);

describe("EngineProvider", () => {
  function Probe() {
    const engine = useEngine();
    return <p>{engine ? "engine" : "no engine"}</p>;
  }

  it("has no engine until one is published, and none outside a provider", () => {
    render(<Probe />);
    expect(screen.getByText("no engine")).toBeInTheDocument();
    cleanup();

    const fake = createFakeEngine();
    render(withEngine(fake.engine, 3, <Probe />));
    expect(screen.getByText("engine")).toBeInTheDocument();
  });

  it("does not re-render consumers for an identical publish", () => {
    const fake = createFakeEngine();
    let renders = 0;
    function Consumer() {
      useEngine();
      return null;
    }
    function Republish() {
      const { publish } = useEngineControls();
      return (
        <button
          onClick={() =>
            publish({ engine: fake.engine, status: "ready", tier: 3 })
          }
        >
          again
        </button>
      );
    }
    render(
      <EngineProvider>
        <Profiler id="consumer" onRender={() => (renders += 1)}>
          <Consumer />
        </Profiler>
        <Republish />
      </EngineProvider>
    );
    fireEvent.click(screen.getByText("again"));
    const afterFirst = renders;
    fireEvent.click(screen.getByText("again"));
    fireEvent.click(screen.getByText("again"));
    expect(renders).toBe(afterFirst);
  });
});

describe("Magnetic (M14)", () => {
  it("renders once, whatever the pointer does (rule F3)", () => {
    const fake = createFakeEngine();
    let commits = 0;
    const view = render(
      withEngine(
        fake.engine,
        3,
        <Profiler id="magnetic" onRender={() => (commits += 1)}>
          <Magnetic>
            <button>Talk</button>
          </Magnetic>
        </Profiler>
      )
    );
    expect(fake.behaviors.magnetic).toHaveBeenCalledTimes(1);
    expect(fake.listenerCount()).toBe(0); // the fake behaviour subscribes nothing itself

    // A pointer sequence reaches the behaviour through the engine, never through React
    const settled = commits;
    for (let step = 0; step < 200; step += 1) {
      fake.movePointer({ x: step, y: step / 2, active: true });
    }
    expect(commits).toBe(settled);
    view.unmount();
    expect(fake.cleanups.magnetic).toHaveBeenCalledTimes(1);
  });

  it("registers no pointer or mouse listener of its own", () => {
    const fake = createFakeEngine();
    const windowSpy = vi.spyOn(window, "addEventListener");
    const documentSpy = vi.spyOn(document, "addEventListener");
    render(
      withEngine(
        fake.engine,
        3,
        <Magnetic>
          <button>Talk</button>
        </Magnetic>
      )
    );
    const names = [...windowSpy.mock.calls, ...documentSpy.mock.calls].map(
      (call) => call[0]
    );
    expect(names.filter((name) => /pointer|mouse/.test(String(name)))).toEqual(
      []
    );
  });

  it("is a plain wrapper below tier 3 and without an engine", () => {
    const fake = createFakeEngine();
    render(
      withEngine(
        fake.engine,
        2,
        <Magnetic>
          <button>Tier two</button>
        </Magnetic>
      )
    );
    expect(fake.behaviors.magnetic).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Tier two" })
    ).toBeInTheDocument();
    cleanup();

    render(
      withEngine(
        null,
        3,
        <Magnetic>
          <button>No engine</button>
        </Magnetic>
      )
    );
    expect(
      screen.getByRole("button", { name: "No engine" })
    ).toBeInTheDocument();
  });
});

describe("Counter (M10)", () => {
  it("renders the final number for screen readers and as the visual text", () => {
    render(<Counter value={1280} suffix="+" />);
    const final = screen.getAllByText("1,280+");
    expect(final).toHaveLength(2);
    expect(
      final.some((node) => node.getAttribute("aria-hidden") === "true")
    ).toBe(true);
    expect(final.some((node) => node.classList.contains("sr-only"))).toBe(true);
  });

  it("asks the engine to count only when there is one", () => {
    const fake = createFakeEngine();
    const view = render(
      withEngine(fake.engine, 3, <Counter value={99.5} decimals={1} />)
    );
    expect(fake.behaviors.counter).toHaveBeenCalledTimes(1);
    const [element, options] = fake.behaviors.counter.mock.calls[0]!;
    expect(element.dataset).toHaveProperty("counter");
    expect(options).toMatchObject({ value: 99.5, decimals: 1, locale: "en" });
    view.unmount();
    expect(fake.cleanups.counter).toHaveBeenCalledTimes(1);

    cleanup();
    render(withEngine(null, 1, <Counter value={7} />));
    expect(screen.getAllByText("7")).toHaveLength(2);
  });
});

describe("TextReveal (M02)", () => {
  it("is the plain text without an engine", () => {
    render(<TextReveal as="h2">A statement of intent.</TextReveal>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "A statement of intent."
    );
  });

  it("enhances once with the engine and reverts on unmount", () => {
    const fake = createFakeEngine();
    const view = render(
      withEngine(fake.engine, 3, <TextReveal as="h2">Lines</TextReveal>)
    );
    expect(fake.behaviors.textReveal).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(fake.cleanups.textReveal).toHaveBeenCalledTimes(1);
  });

  it("remounts for a new headline rather than fighting the split DOM", () => {
    const fake = createFakeEngine();
    const view = render(
      withEngine(fake.engine, 3, <TextReveal as="h2">First</TextReveal>)
    );
    view.rerender(
      withEngine(fake.engine, 3, <TextReveal as="h2">Second</TextReveal>)
    );
    expect(fake.cleanups.textReveal).toHaveBeenCalledTimes(1);
    expect(fake.behaviors.textReveal).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading")).toHaveTextContent("Second");
  });
});

describe("PinScene", () => {
  const scene = (
    <PinScene length={240} beats={2}>
      <PinBeat index={0}>First beat</PinBeat>
      <PinBeat index={1}>Second beat</PinBeat>
    </PinScene>
  );

  it("stacks the beats in reading order with no pin when there is no engine", () => {
    const { container } = render(scene);
    const root = container.querySelector("[data-pin-scene]")!;
    expect(root).not.toHaveAttribute("data-pinned");
    const stage = root.querySelector("[data-pin-stage]")!;
    expect(
      Array.from(stage.children).map((child) => child.textContent)
    ).toEqual(["First beat", "Second beat"]);
    expect(root.querySelectorAll("[data-pin-beat]")).toHaveLength(2);
  });

  it("pins through the engine with its length and beat count", () => {
    const fake = createFakeEngine();
    const view = render(withEngine(fake.engine, 3, scene));
    expect(fake.behaviors.pinScene).toHaveBeenCalledTimes(1);
    expect(fake.behaviors.pinScene.mock.calls[0]![1]).toEqual({
      length: 240,
      beats: 2,
    });
    view.unmount();
    expect(fake.cleanups.pinScene).toHaveBeenCalledTimes(1);
  });
});

describe("Cursor (M16)", () => {
  it("exists only with an engine on tier 3", () => {
    const fake = createFakeEngine();
    const tierTwo = render(withEngine(fake.engine, 2, <Cursor />));
    expect(tierTwo.container.querySelector("[data-cursor]")).toBeNull();
    tierTwo.unmount();

    const tierThree = render(withEngine(fake.engine, 3, <Cursor />));
    expect(tierThree.container.querySelector("[data-cursor]")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(fake.behaviors.cursor).toHaveBeenCalledTimes(1);
  });
});

describe("Reveal (M07)", () => {
  it("renders complete, visible markup with the chosen element and variant", () => {
    render(
      <Reveal as="li" variant="left" data-testid="item">
        Content
      </Reveal>
    );
    const item = screen.getByTestId("item");
    expect(item.tagName).toBe("LI");
    expect(item).toHaveAttribute("data-reveal", "left");
    expect(item).toHaveTextContent("Content");
    expect(item.hasAttribute("data-reveal-ready")).toBe(false);
  });

  it("adds the capped stagger to the delay", () => {
    render(
      <>
        <Reveal data-testid="a" index={2} count={4} delay={100} />
        <Reveal data-testid="b" index={30} />
        <Reveal data-testid="c" />
      </>
    );
    expect(
      screen.getByTestId("a").style.getPropertyValue("--reveal-delay")
    ).toBe("260ms");
    // Without a group size the delay is capped at the 600 ms budget
    expect(
      screen.getByTestId("b").style.getPropertyValue("--reveal-delay")
    ).toBe("600ms");
    expect(
      screen.getByTestId("c").style.getPropertyValue("--reveal-delay")
    ).toBe("0ms");
  });
});

describe("TraceRail (M06)", () => {
  const items = [
    { id: "alpha", label: "Alpha" },
    { id: "beta", label: "Beta" },
  ] as const;

  function setup() {
    const observers: Array<{
      callback: IntersectionObserverCallback;
      observed: Element[];
    }> = [];
    class FakeObserver {
      observed: Element[] = [];
      constructor(callback: IntersectionObserverCallback) {
        observers.push({ callback, observed: this.observed });
      }
      observe = (element: Element) => void this.observed.push(element);
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    document.body.innerHTML =
      '<section id="alpha"></section><section id="beta"></section>';
    return observers;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("labels the navigation, numbers the chapters and marks the current one", () => {
    setup();
    render(<TraceRail items={items} />, {
      container: document.body.appendChild(document.createElement("div")),
    });
    expect(
      screen.getByRole("navigation", { name: "Chapters" })
    ).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#alpha",
      "#beta",
    ]);
    expect(links[0]).toHaveAttribute("aria-current", "location");
    expect(links[1]).not.toHaveAttribute("aria-current");
    expect(links[0]).toHaveTextContent("01 Alpha");
  });

  it("moves the current mark when a chapter crosses the middle of the screen", () => {
    const observers = setup();
    render(<TraceRail items={items} />, {
      container: document.body.appendChild(document.createElement("div")),
    });
    const target = document.getElementById("beta")!;
    act(() => {
      observers[0]!.callback(
        [
          {
            isIntersecting: true,
            target,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver
      );
    });
    expect(screen.getAllByRole("link")[1]).toHaveAttribute(
      "aria-current",
      "location"
    );
    expect(screen.getAllByRole("link")[0]).not.toHaveAttribute("aria-current");
  });

  it("moves focus to the chapter on click, unless the engine already handled it", () => {
    setup();
    render(<TraceRail items={items} />, {
      container: document.body.appendChild(document.createElement("div")),
    });
    const section = document.getElementById("beta")!;
    const link = screen.getAllByRole("link")[1]!;

    fireEvent.click(link);
    expect(section).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toBe(section);

    (document.activeElement as HTMLElement).blur();
    link.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    fireEvent.click(link);
    expect(document.activeElement).not.toBe(section);
  });
});
