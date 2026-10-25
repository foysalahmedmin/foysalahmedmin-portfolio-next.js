"use client";

import { useEffect, useRef } from "react";
import { useEngineState } from "./engine-provider";

/**
 * A reticle that trails the pointer (M16). Tier 3 only. The native cursor is never hidden: the reticle
 * is an addition, grows over links and buttons, and steps aside over text fields.
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const { engine, tier } = useEngineState();
  const enabled = engine !== null && tier === 3;

  useEffect(() => {
    const element = ref.current;
    if (!engine || !enabled || !element) return;
    return engine.behaviors.cursor(element);
  }, [engine, enabled]);

  if (!enabled) return null;
  return <div ref={ref} data-cursor="" aria-hidden="true" />;
}
