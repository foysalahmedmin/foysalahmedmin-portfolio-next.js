"use client";

import {
  useEngineControls,
  useEngineState,
} from "@/components/motion/engine-provider";
import { createGovernor } from "@/lib/motion/governor";
import { probeGpu } from "@/lib/motion/gpu";
import { decideScene } from "@/lib/motion/scene";
import { storyTime } from "@/lib/motion/story";
import {
  readTierOverride,
  readTierSignals,
  resolveTier,
  type Tier,
} from "@/lib/motion/tier";
import { useMotion } from "@/providers/motion-provider";
import { useScenePreference } from "@/state/scene-store";
import { useEffect, useRef, useState } from "react";
import { subscribeFrames } from "./frame-loop";
import { SCENE_LABELS } from "./labels";
import { QUALITY } from "./quality";
import { useHeroStory } from "./story-context";
import type { SceneController } from "./topology-scene";

/** The hero tells one beat per role. */
const HERO_BEATS = 3;
/** Milliseconds the hero may be off screen before its GPU memory is released (docs plan 6.3). */
const RELEASE_AFTER_MS = 4_000;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type SceneState =
  | "poster"
  | "loading"
  | "live"
  | "paused"
  | "released"
  | "demoted";

/**
 * The live 3D maquette over the server-rendered poster (docs plan 3.8, 6.3). The poster is always in
 * the HTML; this adds a canvas on top when the tier, the kill switches and the visitor's choices allow
 * it, and takes it away again when they stop allowing it. The canvas draws only while the hero is on
 * screen and the tab is visible, is released a few seconds after the hero leaves, comes back when it
 * returns, and steps down a tier (poster last) when the runtime governor sees a slow frame rate.
 *
 * `data-scene-state` on the host says what is happening, for the poster cross-fade and for tests.
 */
export function HeroCanvas({ enabled }: { enabled: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Array<HTMLSpanElement | null>>([]);
  const story = useHeroStory();
  const { effectiveMotion, hydrated } = useMotion();
  const { engine, status, tier } = useEngineState();
  const { publish } = useEngineControls();
  const preference = useScenePreference();
  const [sceneTier, setSceneTier] = useState<Tier | null>(null);

  const settled = status !== "idle" && status !== "loading";

  // The tier for the scene: the engine host's tier, lowered by what the graphics stack can do. A QA
  // override (?tier=) is honoured exactly and switches the governor off, so what is forced is what runs.
  useEffect(() => {
    if (!enabled || !hydrated || !settled) return;
    const element = host.current;
    const override = readTierOverride();
    if (override !== null || tier < 2) {
      setSceneTier(tier);
      return;
    }
    const gpu = probeGpu();
    if (element) {
      element.dataset.sceneGpu = !gpu.webgl2
        ? "none"
        : gpu.software
          ? "software"
          : "gpu";
    }
    const resolved = resolveTier({
      ...readTierSignals(effectiveMotion),
      webgl2: gpu.webgl2,
      softwareRenderer: gpu.software,
    });
    if (resolved < tier) {
      document.documentElement.dataset.tier = String(resolved);
      publish({ tier: resolved });
    }
    setSceneTier(Math.min(tier, resolved) as Tier);
  }, [enabled, effectiveMotion, hydrated, publish, settled, tier]);

  const decision = decideScene({
    enabled,
    preference,
    effectiveMotion: hydrated ? effectiveMotion : "reduced",
    tier: sceneTier ?? 1,
  });
  const quality = decision.quality ? QUALITY[decision.quality] : null;
  const wantsCanvas = decision.mode === "canvas" && sceneTier !== null;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const setState = (state: SceneState) => {
      element.dataset.sceneState = state;
    };
    if (!wantsCanvas || !quality) {
      setState(sceneTier !== null && sceneTier < tier ? "demoted" : "poster");
      return;
    }

    const section = element.closest<HTMLElement>("[data-pin-scene]");
    const labelElements = labels.current.filter(
      (item): item is HTMLSpanElement => item !== null
    );
    const governed = readTierOverride() === null;
    const governor = governed && sceneTier ? createGovernor(sceneTier) : null;

    let controller: SceneController | null = null;
    let unsubscribe: (() => void) | null = null;
    let releaseTimer: number | undefined;
    let cancelled = false;
    let creating = false;
    let visible = false;
    let lastFrame = 0;
    let lastProgress = 0;
    let velocity = 0;
    let skew = 0;
    let sectionTop = 0;
    let sectionHeight = 1;
    const measure = () => {
      if (!section) return;
      sectionTop = section.getBoundingClientRect().top + window.scrollY;
      sectionHeight = section.offsetHeight;
    };

    const progressNow = (): number => {
      if (section?.dataset.pinned === "true" && story) {
        return story.current.progress;
      }
      // Unpinned (touch, reduced layout): the position of the stacked beats in the page
      const room = Math.max(1, sectionHeight - window.innerHeight);
      return clamp((window.scrollY - sectionTop) / room, 0, 1);
    };

    const demote = (to: Tier) => {
      document.documentElement.dataset.tier = String(to);
      publish({ tier: to });
      setSceneTier(to);
    };

    const onFrame = (timeMs: number, deltaMs: number) => {
      if (!controller || !visible || document.hidden) return;
      const cap = quality.fpsCap;
      if (cap && timeMs - lastFrame < 1000 / cap - 1) return;
      lastFrame = timeMs;

      const progress = progressNow();
      controller.setStory(storyTime(progress, HERO_BEATS));
      const seconds = Math.max(0.001, deltaMs / 1000);
      const speed = Math.abs(progress - lastProgress) / seconds;
      velocity = lerp(velocity, clamp(speed * 1.2, 0, 1), 0.1);
      controller.setVelocity(velocity);
      if (quality.pointerRig) {
        const pointer = engine?.pointer();
        if (pointer?.active) {
          controller.setPointer(
            (pointer.x / window.innerWidth) * 2 - 1,
            (pointer.y / window.innerHeight) * 2 - 1
          );
        }
        // Scroll speed skews the big title a little, damped (M23, tier 3)
        const target = clamp(
          ((progress - lastProgress) / seconds) * 4 * (speed > 0.01 ? 1 : 0),
          -3,
          3
        );
        skew = lerp(skew, target, 0.1);
        section?.style.setProperty("--hero-skew", `${skew.toFixed(2)}deg`);
      }
      lastProgress = progress;

      controller.render(timeMs);
      if (element.dataset.sceneState !== "live") {
        const info = controller.info();
        element.dataset.sceneCalls = String(info.calls);
        element.dataset.sceneTriangles = String(info.triangles);
        element.dataset.sceneQuality = quality.name;
        setState("live");
      }

      if (governor) {
        const verdict = governor.step(deltaMs);
        if (verdict.state === "demote") demote(verdict.to);
      }
    };

    const create = async () => {
      if (controller || creating || cancelled) return;
      creating = true;
      setState("loading");
      try {
        const { createTopologyScene } = await import("./topology-scene");
        if (cancelled) return;
        measure();
        controller = createTopologyScene({
          host: element,
          quality,
          labelElements,
          light: document.documentElement.classList.contains("light"),
        });
        controller.resize(element.clientWidth, element.clientHeight);
        controller.canvas.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          demote(1);
        });
        unsubscribe = subscribeFrames(engine, onFrame);
      } catch {
        // No 3D chunk or no context: the poster stays, and the page does not notice
        if (!cancelled) demote(1);
      } finally {
        creating = false;
      }
    };

    const release = () => {
      unsubscribe?.();
      unsubscribe = null;
      controller?.dispose();
      controller = null;
      labelElements.forEach((item) => {
        item.style.opacity = "";
        item.style.transform = "";
      });
      delete element.dataset.sceneCalls;
      delete element.dataset.sceneTriangles;
      if (!cancelled) setState("released");
    };

    const intersection = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      window.clearTimeout(releaseTimer);
      if (visible) {
        if (controller) setState("live");
        else void create();
      } else if (controller) {
        setState("paused");
        releaseTimer = window.setTimeout(release, RELEASE_AFTER_MS);
      }
    });
    intersection.observe(element);

    const resize = new ResizeObserver(() => {
      measure();
      controller?.resize(element.clientWidth, element.clientHeight);
    });
    resize.observe(element);

    const theme = new MutationObserver(() =>
      controller?.setTheme(document.documentElement.classList.contains("light"))
    );
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelled = true;
      window.clearTimeout(releaseTimer);
      intersection.disconnect();
      resize.disconnect();
      theme.disconnect();
      unsubscribe?.();
      controller?.dispose();
      section?.style.removeProperty("--hero-skew");
    };
    // `tier` is read only to tell demotion from "never wanted"; the scene follows `sceneTier`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, publish, quality, sceneTier, story, wantsCanvas]);

  return (
    <div
      ref={host}
      data-hero-canvas=""
      data-scene-state="poster"
      aria-hidden="true"
      className="hero-canvas"
    >
      {SCENE_LABELS.map((label, index) => (
        <span
          key={label.id}
          ref={(node) => {
            labels.current[index] = node;
          }}
          data-scene-label={label.id}
          className="hero-label"
        >
          {label.text}
        </span>
      ))}
    </div>
  );
}
