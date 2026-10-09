const TOKENS = [
  ["dur-micro", "120 ms", "Hover, press"],
  ["dur-fast", "200 ms", "Toggles, chips"],
  ["dur-base", "360 ms", "Reveals, panels"],
  ["dur-slow", "640 ms", "Line reveals, wipes"],
  ["dur-scene", "1100 ms", "Chapter entrances"],
] as const;

const EASES = [
  ["ease-signal", "Default entrance (expo-out feel)"],
  ["ease-settle", "Layout settle"],
  ["ease-snap", "Exits and wipes"],
] as const;

/**
 * Motion tokens and easing previews. The full Motion lab (every effect in the registry, a speed
 * control and a reduced-motion toggle) is built with the motion engine in Phase 2.
 */
export function MotionSection() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground max-w-prose text-sm">
        Previews are CSS-driven and stop under the reduced-motion preference.
        The effect registry and speed control arrive in Phase 2.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Duration tokens</caption>
          <tbody>
            {TOKENS.map(([name, value, use]) => (
              <tr key={name} className="border-b">
                <td className="py-2 pr-4 font-mono">--{name}</td>
                <td className="py-2 pr-4 font-mono">{value}</td>
                <td className="py-2">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="flex flex-col gap-4" role="list">
          {EASES.map(([name, use]) => (
            <li key={name}>
              <p className="mb-1 font-mono text-xs">
                --{name} · {use}
              </p>
              <div className="bg-muted [container-type:inline-size] relative h-3 overflow-hidden rounded-sm">
                <span
                  className="bg-foreground absolute top-0 left-0 block h-3 w-8 rounded-sm motion-safe:animate-[lab-slide_2.4s_infinite]"
                  style={{ animationTimingFunction: `var(--${name})` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
