import { PinScene } from "@/components/motion/pin-scene";
import { SectionHead } from "@/components/sections/signal/section-head";
import { Glass } from "@/components/ui/glass";
import {
  PILLAR_KEYS,
  getPillarLabel,
  type PillarKey,
} from "@/lib/content/pillars";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

export type StackItem = Readonly<{
  key: string;
  label: string;
  /** The outcome (or summary) of the layer. */
  summary?: string;
  capabilities: readonly string[];
  deliverables: readonly string[];
  technologies: readonly string[];
  pillar?: PillarKey;
}>;

// Fixed copy (plan 5.4): true whatever the data holds.
const STACK_COPY = {
  eyebrow: "/stack",
  heading: "Three layers. Take one, or all.",
  lead: "Every system has the same three layers. I can own one of them or the whole stack.",
  outcome: "Outcome",
  capabilities: "Capabilities",
  deliverables: "Deliverables",
  technologies: "Technologies",
} as const;

const MAX_SLABS = 3;

/** Each role owns a texture, not a hue (plan 3.4). */
const TEXTURE: Record<PillarKey, string> = {
  system_architect: "tx-blueprint",
  software_developer: "tx-lines",
  ai_automation: "tx-dots",
};

/**
 * The layers as a real system stacks them: architecture is the foundation (first), software sits on it,
 * automation is on top (last). A layer with no known role keeps its place after the known ones; at most
 * three are shown, taken in the order they were given.
 */
export const orderSlabs = (items: readonly StackItem[]): StackItem[] =>
  items
    .slice(0, MAX_SLABS)
    .map((item, index) => ({
      item,
      index,
      rank: item.pillar ? PILLAR_KEYS.indexOf(item.pillar) : -1,
    }))
    .sort(
      (a, b) =>
        (a.rank < 0 ? PILLAR_KEYS.length : a.rank) -
          (b.rank < 0 ? PILLAR_KEYS.length : b.rank) || a.index - b.index
    )
    .map(({ item }) => item);

const Spec = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="slab-spec">
    <dt className="t-eyebrow">{label}</dt>
    <dd>{children}</dd>
  </div>
);

const List = ({
  items,
  className,
}: {
  items: readonly string[];
  className: string;
}) => (
  <ul className={className}>
    {items.map((entry) => (
      <li key={entry}>{entry}</li>
    ))}
  </ul>
);

/**
 * Chapter 2, "stack" (docs plan 4.1): the offers as layers of one system. Pinned, three glass slabs start
 * stacked tight and separate as `--pin-progress` runs from 0 to about 0.6; then a mono leader line draws
 * from each slab to its specs. All of it is CSS on `--pin-progress` (transform and opacity only, no
 * script of its own). Unpinned (reduced, off, touch, no JavaScript, small or short windows) the same
 * markup is three plain panels in reading order with every spec visible.
 */
export default function ServicesStack({
  items,
  heading,
  className,
}: {
  items: readonly StackItem[];
  heading?: string;
  className?: string;
}) {
  const slabs = orderSlabs(items);
  if (slabs.length === 0) return null;

  return (
    <PinScene
      id="services"
      aria-labelledby="services-heading"
      data-chapter="stack"
      data-chapter-label="Solutions"
      data-tone="ink"
      length={170}
      beats={1}
      className={cn("slab-scene", className)}
    >
      <div className="slab-inner container">
        <SectionHead
          className="slab-head"
          eyebrow={STACK_COPY.eyebrow}
          title={heading || STACK_COPY.heading}
          titleId="services-heading"
          lead={STACK_COPY.lead}
        />

        <ol
          className="slab-list"
          style={{ "--count": slabs.length } as CSSProperties}
        >
          {slabs.map((slab, n) => {
            const capabilities = slab.capabilities.slice(0, 4);
            const deliverables = slab.deliverables.slice(0, 4);
            const technologies = slab.technologies.slice(0, 6);
            const role = slab.pillar ? getPillarLabel(slab.pillar) : undefined;
            const hasA = Boolean(slab.summary) || capabilities.length > 0;
            const hasB = deliverables.length > 0 || technologies.length > 0;

            return (
              <li
                key={slab.key}
                className="slab"
                style={{ "--n": n } as CSSProperties}
                data-pillar={slab.pillar}
              >
                <Glass tier={2} className="slab-plate ticks" aria-hidden="true">
                  <span
                    className={cn(
                      "slab-texture",
                      slab.pillar ? TEXTURE[slab.pillar] : "tx-lines"
                    )}
                  />
                </Glass>

                <div className="slab-label">
                  {role && role !== slab.label && (
                    <p className="t-eyebrow">{role}</p>
                  )}
                  <h3 className="slab-title">{slab.label}</h3>
                </div>

                {hasA && (
                  <div className="slab-a">
                    <dl className="slab-specs">
                      {slab.summary && (
                        <Spec label={STACK_COPY.outcome}>
                          <p>{slab.summary}</p>
                        </Spec>
                      )}
                      {capabilities.length > 0 && (
                        <Spec label={STACK_COPY.capabilities}>
                          <List items={capabilities} className="slab-caps" />
                        </Spec>
                      )}
                    </dl>
                  </div>
                )}

                {hasB && (
                  <div className="slab-b">
                    <dl className="slab-specs">
                      {deliverables.length > 0 && (
                        <Spec label={STACK_COPY.deliverables}>
                          <List items={deliverables} className="slab-dels" />
                        </Spec>
                      )}
                      {technologies.length > 0 && (
                        <Spec label={STACK_COPY.technologies}>
                          <List items={technologies} className="slab-tech" />
                        </Spec>
                      )}
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </PinScene>
  );
}
