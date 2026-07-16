"use client";

import { useMotion, type MotionPreference } from "@/providers/motion-provider";

const options: Array<{ value: MotionPreference; label: string }> = [
  { value: "system", label: "Site default" },
  { value: "full", label: "Full motion" },
  { value: "reduce", label: "Reduced motion" },
  { value: "off", label: "Motion off" },
];

export default function MotionControl() {
  const { preference, setPreference, effectiveMotion, hydrated } = useMotion();

  return (
    <label className="type-label flex items-center gap-2">
      <span className="sr-only">Motion preference</span>
      <select
        value={preference}
        disabled={!hydrated}
        onChange={(event) =>
          setPreference(event.target.value as MotionPreference)
        }
        aria-describedby="motion-preference-status"
        className="border-border bg-surface-raised text-foreground focus-visible:ring-ring h-9 max-w-40 rounded-full border px-3 text-xs tracking-normal normal-case focus-visible:ring-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span id="motion-preference-status" className="sr-only" role="status">
        Effective motion: {effectiveMotion}
      </span>
    </label>
  );
}
