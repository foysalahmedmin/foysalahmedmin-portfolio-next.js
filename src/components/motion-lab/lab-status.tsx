"use client";

import { useEngineState } from "@/components/motion/engine-provider";
import { useMotion } from "@/providers/motion-provider";

/** Live readout of what the engine resolved for this visit. */
export function LabStatus() {
  const { engine, status, tier } = useEngineState();
  const { effectiveMotion, capability, preference } = useMotion();

  const rows: Array<[string, string]> = [
    ["Motion preference", preference],
    ["Effective motion", effectiveMotion],
    ["Pointer capability", capability],
    ["Tier", `T${tier}`],
    ["Engine", status],
    ["Smooth scroll", engine?.lenis ? "on" : "off"],
  ];

  return (
    <dl
      data-lab-status=""
      className="border-line-2 grid grid-cols-2 gap-x-6 gap-y-2 border p-4 font-mono text-xs sm:grid-cols-3"
    >
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-fg-secondary">{label}</dt>
          <dd data-lab-value={label} className="mt-0.5 font-semibold">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
