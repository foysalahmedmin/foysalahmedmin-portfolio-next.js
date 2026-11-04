"use client";

import type { EngineStatus, MotionEngine } from "@/lib/motion/engine/types";
import type { Tier } from "@/lib/motion/tier";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type EngineState = Readonly<{
  /** The loaded motion engine, or null (reduced, off, touch, below tier 2, loading, failed). */
  engine: MotionEngine | null;
  status: EngineStatus;
  /** The resolved capability tier; 1 until the visitor's signals have been read. */
  tier: Tier;
}>;

type EngineControls = Readonly<{
  publish(next: Partial<EngineState>): void;
}>;

const DEFAULT_STATE: EngineState = { engine: null, status: "idle", tier: 1 };

const EngineStateContext = createContext<EngineState>(DEFAULT_STATE);
const EngineControlsContext = createContext<EngineControls | null>(null);

/**
 * Holds the motion engine for the public surface. Components read it with `useEngine`; the host that
 * loads the engine writes it with `useEngineControls`. With no engine every component renders its
 * server markup unchanged, which is the reduced, off, touch and no-JS experience.
 */
export function EngineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EngineState>(DEFAULT_STATE);
  const controls = useMemo<EngineControls>(
    () => ({
      publish: (next) =>
        setState((current) => {
          const merged = { ...current, ...next };
          return merged.engine === current.engine &&
            merged.status === current.status &&
            merged.tier === current.tier
            ? current
            : merged;
        }),
    }),
    []
  );

  return (
    <EngineControlsContext.Provider value={controls}>
      <EngineStateContext.Provider value={state}>
        {children}
      </EngineStateContext.Provider>
    </EngineControlsContext.Provider>
  );
}

export function useEngineState(): EngineState {
  return useContext(EngineStateContext);
}

export function useEngine(): MotionEngine | null {
  return useContext(EngineStateContext).engine;
}

export function useEngineControls(): EngineControls {
  const controls = useContext(EngineControlsContext);
  if (!controls) {
    throw new Error("useEngineControls must be used within EngineProvider");
  }
  return controls;
}
