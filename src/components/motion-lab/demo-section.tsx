import { MOTION_REGISTRY } from "@/lib/motion/registry";
import { MonoLabel } from "@/components/ui/mono-label";
import type { ReactNode } from "react";

/**
 * One effect in the sandbox: its registry entry (trigger, timing, tiers, reduced behaviour) next to
 * the live demo, so what you see and what the registry promises sit side by side.
 */
export function DemoSection({
  effectId,
  children,
}: {
  effectId: string;
  children: ReactNode;
}) {
  const effect = MOTION_REGISTRY.find((entry) => entry.id === effectId);
  if (!effect) throw new Error(`Unknown motion effect ${effectId}`);

  return (
    <section
      id={`demo-${effect.id}`}
      aria-labelledby={`demo-${effect.id}-title`}
      data-lab-demo={effect.id}
      className="border-line-2 grid gap-8 border-t py-16 lg:grid-cols-[minmax(0,18rem)_1fr]"
    >
      <div className="flex flex-col gap-3">
        <MonoLabel>
          {effect.id} · {effect.meaning ?? "calm"}
        </MonoLabel>
        <h2 id={`demo-${effect.id}-title`} className="t-h4">
          {effect.name}
        </h2>
        <dl className="text-fg-secondary grid gap-2 text-sm">
          <div>
            <dt className="t-eyebrow">Trigger</dt>
            <dd>{effect.trigger}</dd>
          </div>
          <div>
            <dt className="t-eyebrow">Timing</dt>
            <dd>{effect.timing}</dd>
          </div>
          {effect.tiers ? (
            <div>
              <dt className="t-eyebrow">T3 · T2 · T1</dt>
              <dd className="font-mono">
                {effect.tiers.t3} · {effect.tiers.t2} · {effect.tiers.t1}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="t-eyebrow">Reduced or off</dt>
            <dd>{effect.reduced}</dd>
          </div>
        </dl>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
