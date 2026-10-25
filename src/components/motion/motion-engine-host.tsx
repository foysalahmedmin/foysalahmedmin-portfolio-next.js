"use client";

import { useMotion } from "@/providers/motion-provider";
import {
  readTierOverride,
  readTierSignals,
  resolveEnginePolicy,
  resolveTier,
} from "@/lib/motion/tier";
import { reportEngineFailure } from "@/lib/motion/engine-telemetry";
import type { MotionEngine } from "@/lib/motion/engine/types";
import { useEffect } from "react";
import { useEngineControls } from "./engine-provider";

/**
 * Resolves the capability tier, then loads the motion engine when the policy allows it
 * (full motion, fine pointer, tier 2 or above). Everything is mirrored on <html> as
 * `data-tier` and `data-motion-engine` so CSS, tests and the Motion lab can read the state.
 *
 * Failure isolation (docs plan 3.7.1, F13): a load error leaves the page exactly as the server
 * rendered it, flips the session to the CSS tier and reports one privacy-safe event.
 */
export function MotionEngineHost() {
  const { effectiveMotion, hydrated } = useMotion();
  const { publish } = useEngineControls();

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;

    const signals = readTierSignals(effectiveMotion);
    const tier = resolveTier(signals, readTierOverride());
    const policy = resolveEnginePolicy({
      tier,
      effectiveMotion,
      finePointer: signals.finePointer,
    });
    root.dataset.tier = String(tier);

    if (!policy.load) {
      root.dataset.motionEngine = "off";
      publish({ engine: null, status: "disabled", tier });
      return;
    }

    let cancelled = false;
    let engine: MotionEngine | null = null;
    root.dataset.motionEngine = "loading";
    publish({ engine: null, status: "loading", tier });

    const load = () => {
      import("@/lib/motion/engine")
        .then(({ createEngine }) => {
          if (cancelled) return;
          engine = createEngine({ smooth: policy.smooth });
          root.dataset.motionEngine = "ready";
          publish({ engine, status: "ready", tier });
        })
        .catch(() => {
          if (cancelled) return;
          root.dataset.motionEngine = "failed";
          publish({ engine: null, status: "failed", tier: 1 });
          reportEngineFailure("gsap");
        });
    };

    // Deferred past hydration and the first paint so the engine never competes with LCP
    const hasIdle = typeof window.requestIdleCallback === "function";
    const handle = hasIdle
      ? window.requestIdleCallback(load, { timeout: 2_000 })
      : window.setTimeout(load, 200);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      engine?.destroy();
      root.dataset.motionEngine = "off";
      publish({ engine: null, status: "idle" });
    };
  }, [effectiveMotion, hydrated, publish]);

  return null;
}
