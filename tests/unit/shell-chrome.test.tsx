// @vitest-environment jsdom

import { ChapterRail } from "@/components/motion/chapter-rail";
import { MobileActionBar } from "@/components/partials/mobile-action-bar";
import {
  useHeaderHide,
  useNavIndicator,
} from "@/components/partials/Header/use-header-chrome";
import { flipTheme, nextTheme } from "@/lib/motion/theme-flip";
import {
  getSetting,
  resetSettingStoreForTests,
  setTheme,
} from "@/state/setting-store";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

/** requestAnimationFrame the tests flush by hand, so the hooks' "one frame at a time" guards are real. */
function stubFrames() {
  const queue: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  return () => {
    const batch = queue.splice(0);
    act(() => batch.forEach((callback) => callback(0)));
  };
}

const scrollTo = (y: number) => {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  fireEvent.scroll(window);
};

beforeEach(() => {
  pathname = "/";
  scrollTo(0);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-motion");
  document.documentElement.removeAttribute("data-vt");
  document.documentElement.className = "";
});

describe("theme flip (M21)", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    window.localStorage.clear();
    resetSettingStoreForTests();
    setTheme("light");
  });

  it("cycles light, dark, system", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
    expect(nextTheme("system")).toBe("light");
  });

  it("changes the theme at once when the browser has no view transitions", () => {
    document.documentElement.dataset.motion = "full";
    flipTheme({ x: 10, y: 20 });
    expect(getSetting().theme).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.dataset.vt).toBeUndefined();
  });

  it("changes the theme at once under reduced and off motion, even where transitions exist", () => {
    const start = vi.fn((update: () => void) => {
      update();
      return { finished: Promise.resolve() };
    });
    Object.defineProperty(document, "startViewTransition", {
      value: start,
      configurable: true,
    });
    for (const motion of ["reduced", "off"]) {
      document.documentElement.dataset.motion = motion;
      flipTheme({ x: 0, y: 0 });
    }
    expect(start).not.toHaveBeenCalled();
    expect(getSetting().theme).toBe("system");
    Reflect.deleteProperty(document, "startViewTransition");
  });

  it("reveals from the button inside a view transition and cleans up after it", async () => {
    document.documentElement.dataset.motion = "full";
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    const start = vi.fn((update: () => void) => {
      update();
      return { finished };
    });
    Object.defineProperty(document, "startViewTransition", {
      value: start,
      configurable: true,
    });

    flipTheme({ x: 123.6, y: 45.2 });
    const root = document.documentElement;
    expect(start).toHaveBeenCalledTimes(1);
    expect(root.style.getPropertyValue("--flip-x")).toBe("124px");
    expect(root.style.getPropertyValue("--flip-y")).toBe("45px");
    expect(root.dataset.vt).toBe("theme");
    // the class changes inside the callback, so both states are captured
    expect(root).toHaveClass("dark");
    expect(getSetting().theme).toBe("dark");

    finish();
    await finished;
    await Promise.resolve();
    expect(root.dataset.vt).toBeUndefined();
    Reflect.deleteProperty(document, "startViewTransition");
  });
});

describe("header that gets out of the way (M35)", () => {
  function Harness({ locked = false }: { locked?: boolean }) {
    const ref = useRef<HTMLElement>(null);
    useHeaderHide(ref, locked);
    return (
      <header ref={ref} data-testid="header">
        <button>inside</button>
      </header>
    );
  }

  it("hides after a long scroll down and returns on a small scroll up", () => {
    const flush = stubFrames();
    render(<Harness />);
    const header = screen.getByTestId("header");

    for (const y of [60, 120, 200, 300]) {
      scrollTo(y);
      flush();
    }
    expect(header.dataset.hidden).toBe("true");

    scrollTo(290);
    flush();
    expect(header.dataset.hidden).toBeUndefined();
  });

  it("stays put near the top and ignores tiny jitters", () => {
    const flush = stubFrames();
    render(<Harness />);
    const header = screen.getByTestId("header");
    scrollTo(70);
    flush();
    expect(header.dataset.hidden).toBeUndefined();

    scrollTo(100);
    flush();
    scrollTo(98);
    flush();
    expect(header.dataset.hidden).toBeUndefined();
  });

  it("never hides while keyboard focus is inside, and comes back when focus enters", () => {
    const flush = stubFrames();
    render(<Harness />);
    const header = screen.getByTestId("header");
    screen.getByText("inside").focus();
    for (const y of [150, 300, 450]) {
      scrollTo(y);
      flush();
    }
    expect(header.dataset.hidden).toBeUndefined();

    (document.activeElement as HTMLElement).blur();
    for (const y of [600, 750]) {
      scrollTo(y);
      flush();
    }
    expect(header.dataset.hidden).toBe("true");
    fireEvent.focusIn(header);
    expect(header.dataset.hidden).toBeUndefined();
  });

  it("does not hide while something holds the header open", () => {
    const flush = stubFrames();
    render(<Harness locked />);
    const header = screen.getByTestId("header");
    for (const y of [150, 400, 800]) {
      scrollTo(y);
      flush();
    }
    expect(header.dataset.hidden).toBeUndefined();
  });

  it("handles scroll events one frame at a time and tidies up on unmount", () => {
    const flush = stubFrames();
    const view = render(<Harness />);
    const header = screen.getByTestId("header");
    scrollTo(500);
    scrollTo(900);
    scrollTo(1300);
    flush();
    expect(header.dataset.hidden).toBe("true");
    view.unmount();
    expect(header.dataset.hidden).toBeUndefined();
  });
});

describe("sliding navigation indicator (M28)", () => {
  class FakeResizeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(public callback: ResizeObserverCallback) {}
  }

  function Harness({ path = "/" }: { path?: string }) {
    const ref = useRef<HTMLElement>(null);
    useNavIndicator(ref, path);
    return (
      <nav ref={ref} data-testid="nav">
        <a
          data-nav-link
          href="#home"
          aria-current={path === "/" ? "page" : undefined}
        >
          Home
        </a>
        <a
          data-nav-link
          href="#about"
          aria-current={path === "/about" ? "page" : undefined}
        >
          About
        </a>
      </nav>
    );
  }

  const measure = (links: HTMLElement[]) => {
    const boxes = [
      { left: 0, width: 80 },
      { left: 100, width: 90 },
    ];
    links.forEach((link, index) => {
      Object.defineProperty(link, "offsetLeft", { value: boxes[index]!.left });
      Object.defineProperty(link, "offsetWidth", {
        value: boxes[index]!.width,
      });
    });
  };

  it("rests under the current page, follows hover and focus, and returns", () => {
    const flush = stubFrames();
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    // measure before the effect reads them: lay the links out on the prototype for this test
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.textContent === "About" ? 100 : 0;
      }
    );
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.textContent === "About" ? 90 : 80;
      }
    );

    render(<Harness path="/" />);
    const nav = screen.getByTestId("nav");
    const [home, about] = Array.from(nav.querySelectorAll<HTMLElement>("a"));
    void measure;

    // 12 px of padding each side is excluded
    expect(nav.style.getPropertyValue("--ind-x")).toBe("12px");
    expect(nav.style.getPropertyValue("--ind-w")).toBe("56");
    // no sweep from the left edge on first placement
    expect(nav.dataset.indicator).toBeUndefined();
    flush();
    expect(nav.dataset.indicator).toBe("ready");

    fireEvent.pointerEnter(about!);
    expect(nav.style.getPropertyValue("--ind-x")).toBe("112px");
    expect(nav.style.getPropertyValue("--ind-w")).toBe("66");
    fireEvent.pointerLeave(about!);
    expect(nav.style.getPropertyValue("--ind-x")).toBe("12px");

    fireEvent.focus(about!);
    expect(nav.style.getPropertyValue("--ind-x")).toBe("112px");
    fireEvent.blur(about!);
    expect(nav.style.getPropertyValue("--ind-x")).toBe("12px");
    expect(home).toBeTruthy();
    vi.restoreAllMocks();
  });

  it("has no indicator when no link is current", () => {
    stubFrames();
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    render(<Harness path="/somewhere-else" />);
    expect(screen.getByTestId("nav").style.getPropertyValue("--ind-w")).toBe(
      "0"
    );
  });
});

describe("mobile action bar", () => {
  const cta = {
    key: "cta",
    label: "Contact",
    href: "/contact",
    external: false,
  };

  function observers() {
    const created: Array<{ callback: IntersectionObserverCallback }> = [];
    class FakeObserver {
      constructor(callback: IntersectionObserverCallback) {
        created.push({ callback });
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    return created;
  }
  const bar = () => document.querySelector<HTMLElement>("[data-mobile-bar]")!;

  it("appears after the first screens and offers the action and the search", () => {
    const flush = stubFrames();
    observers();
    render(<MobileActionBar cta={cta} />);
    expect(bar().dataset.visible).toBe("false");
    expect(
      screen.getByRole("link", { name: "Start a project" })
    ).toHaveAttribute("href", "/contact");
    expect(
      screen.getByRole("button", { name: "Open command palette" })
    ).toHaveAttribute("aria-haspopup", "dialog");

    scrollTo(900);
    flush();
    expect(bar().dataset.visible).toBe("true");
    scrollTo(100);
    flush();
    expect(bar().dataset.visible).toBe("false");
  });

  it("gets out of the way while someone types", () => {
    const flush = stubFrames();
    observers();
    render(
      <>
        <input aria-label="field" />
        <MobileActionBar cta={cta} />
      </>
    );
    scrollTo(900);
    flush();
    expect(bar().dataset.visible).toBe("true");

    fireEvent.focusIn(screen.getByLabelText("field"));
    expect(bar().dataset.visible).toBe("false");
    fireEvent.focusOut(screen.getByLabelText("field"));
    expect(bar().dataset.visible).toBe("true");
  });

  it("gets out of the way over the footer", () => {
    const flush = stubFrames();
    const created = observers();
    document.body.insertAdjacentHTML(
      "beforeend",
      "<footer data-footer></footer>"
    );
    render(<MobileActionBar cta={cta} />);
    scrollTo(900);
    flush();
    expect(bar().dataset.visible).toBe("true");

    act(() =>
      created[0]!.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    );
    expect(bar().dataset.visible).toBe("false");
  });

  it("does not exist on the contact page, where the form is the action, or in the admin", () => {
    stubFrames();
    observers();
    for (const path of ["/contact", "/admin/pages"]) {
      pathname = path;
      const view = render(<MobileActionBar cta={cta} />);
      expect(document.querySelector("[data-mobile-bar]")).toBeNull();
      view.unmount();
    }
  });
});

describe("chapter rail", () => {
  it("lists the chapters the page actually has, in order, with friendly names", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
      }
    );
    document.body.innerHTML = `
      <main>
        <section id="ingress"></section>
        <section id="pillar-showcase"></section>
        <div data-chapter="custom-one" data-chapter-label="Custom"></div>
        <section id="unknown-thing"></section>
        <section></section>
      </main>`;
    render(<ChapterRail />, {
      container: document.body.appendChild(document.createElement("div")),
    });
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#ingress",
      "#pillar-showcase",
      "#custom-one",
      "#unknown-thing",
    ]);
    expect(links.map((link) => link.textContent)).toEqual([
      "01 Ingress",
      "02 Practice",
      "03 Custom",
      "04 Unknown Thing",
    ]);
    expect(
      screen.getByRole("navigation", { name: "Page chapters" })
    ).toBeInTheDocument();
  });

  it("renders nothing for a page with fewer than two chapters", () => {
    document.body.innerHTML = '<main><section id="only"></section></main>';
    render(<ChapterRail />, {
      container: document.body.appendChild(document.createElement("div")),
    });
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
