import { isMotionLabEnabled } from "@/lib/motion/lab";
import {
  CONSOLE_EFFECTS,
  PUBLIC_EFFECTS,
  type MotionEffect,
} from "@/lib/motion/registry";
import {
  dur,
  ease,
  easeFn,
  scrubLag,
  staggerLine,
  type EaseToken,
} from "@/lib/motion/tokens";

const EASE_USE: Record<EaseToken, string> = {
  signal: "Default entrance (expo-out feel)",
  settle: "Layout settle",
  snap: "Exits and wipes",
};

const DUR_USE: Record<keyof typeof dur, string> = {
  micro: "Hover, press",
  fast: "Toggles, chips",
  base: "Reveals, panels",
  slow: "Line reveals, wipes",
  scene: "Chapter entrances",
};

/** An easing curve drawn from the same function the scripted motion uses. */
function Curve({ token }: { token: EaseToken }) {
  const size = 96;
  const points = Array.from({ length: 41 }, (_, step) => {
    const x = step / 40;
    return `${(x * size).toFixed(1)},${((1 - easeFn[token](x)) * size).toFixed(1)}`;
  }).join(" ");

  return (
    <svg
      viewBox={`-4 -4 ${size + 8} ${size + 8}`}
      className="size-24 shrink-0"
      role="img"
      aria-label={`${token} easing curve`}
    >
      <rect
        x="0"
        y="0"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

const tierText = (effect: MotionEffect) =>
  effect.tiers
    ? [effect.tiers.t3, effect.tiers.t2, effect.tiers.t1]
        .map((value) => (value === "none" ? "—" : value))
        .join(" · ")
    : "CSS only";

function RegistryTable({
  title,
  effects,
}: {
  title: string;
  effects: readonly MotionEffect[];
}) {
  const built = effects.filter((effect) => effect.built).length;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="type-heading-3">
        {title}{" "}
        <span className="text-muted-foreground text-base font-normal">
          {built} of {effects.length} built
        </span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-2 pr-4 font-medium">
                ID
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Effect
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Trigger
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Timing
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                T3 · T2 · T1
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Reduced or off
              </th>
              <th scope="col" className="py-2 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {effects.map((effect) => (
              <tr key={effect.id} className="border-b align-top">
                <td className="py-2 pr-4 font-mono">{effect.id}</td>
                <td className="py-2 pr-4">
                  {effect.name}
                  {effect.meaning ? (
                    <span className="text-muted-foreground block text-xs">
                      {effect.meaning}
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-4">{effect.trigger}</td>
                <td className="py-2 pr-4 font-mono text-xs">{effect.timing}</td>
                <td className="py-2 pr-4 font-mono text-xs">
                  {tierText(effect)}
                </td>
                <td className="py-2 pr-4">{effect.reduced}</td>
                <td className="py-2 whitespace-nowrap">
                  {effect.built ? (
                    <span className="font-semibold">Built</span>
                  ) : (
                    <span className="text-muted-foreground">
                      Phase {effect.phase}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * The Motion lab: tokens, the easing curves drawn from the shared functions, and the effect registry.
 * Live demos run on the public surface at /lab/motion because no animation library may be imported
 * from the admin (docs plan 6.1).
 */
export function MotionSection() {
  const labEnabled = isMotionLabEnabled();

  return (
    <div className="flex flex-col gap-10">
      <p className="text-muted-foreground max-w-prose text-sm">
        {labEnabled ? (
          <>
            The effects run for real in the{" "}
            <a href="/lab/motion" className="underline underline-offset-4">
              Motion lab
            </a>{" "}
            on the public surface: switch motion to full, reduced or off, force
            a tier with <code className="font-mono">?tier=0..3</code>, add{" "}
            <code className="font-mono">?debug=perf</code> for the frame
            overlay.
          </>
        ) : (
          <>
            The Motion lab at <code className="font-mono">/lab/motion</code> is
            off in this build. Run <code className="font-mono">pnpm dev</code>,
            or start a production build with{" "}
            <code className="font-mono">MOTION_LAB=1</code>.
          </>
        )}
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Duration and scroll tokens</caption>
          <tbody>
            {(Object.keys(dur) as Array<keyof typeof dur>).map((name) => (
              <tr key={name} className="border-b">
                <td className="py-2 pr-4 font-mono">dur.{name}</td>
                <td className="py-2 pr-4 font-mono">{dur[name]} ms</td>
                <td className="py-2">{DUR_USE[name]}</td>
              </tr>
            ))}
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono">scrub.lag</td>
              <td className="py-2 pr-4 font-mono">{scrubLag} s</td>
              <td className="py-2">Scroll-linked smoothing</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono">stagger.line</td>
              <td className="py-2 pr-4 font-mono">{staggerLine} ms</td>
              <td className="py-2">Headline lines</td>
            </tr>
          </tbody>
        </table>

        <ul className="flex flex-col gap-4" role="list">
          {(Object.keys(ease) as EaseToken[]).map((token) => (
            <li key={token} className="flex items-center gap-4">
              <Curve token={token} />
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-mono text-xs">
                  ease.{token} · cubic-bezier({ease[token].join(", ")})
                </p>
                <p className="text-muted-foreground mb-2 text-xs">
                  {EASE_USE[token]}
                </p>
                <div className="bg-muted relative h-3 overflow-hidden rounded-sm">
                  <span
                    className="bg-foreground absolute top-0 left-0 block h-3 w-8 rounded-sm motion-safe:animate-[lab-slide_2.4s_infinite]"
                    style={{
                      animationTimingFunction: `var(--ease-${token}, cubic-bezier(${ease[token].join(",")}))`,
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <RegistryTable title="Public effects" effects={PUBLIC_EFFECTS} />
      <RegistryTable
        title="Console effects (calm preset)"
        effects={CONSOLE_EFFECTS}
      />
    </div>
  );
}
