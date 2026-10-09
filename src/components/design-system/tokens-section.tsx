import { MONO_RAMP, SEMANTIC_TOKENS } from "@/lib/design/mono-ramp";
import { LabFrame } from "./lab-frame";

export function RampSection() {
  return (
    <ol
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      role="list"
      aria-label="Monochrome ramp"
    >
      {MONO_RAMP.map(({ step, hex, role }) => (
        <li
          key={step}
          className="border-border overflow-hidden rounded-md border"
        >
          <div
            className="h-16"
            style={{ backgroundColor: `var(--mono-${step})` }}
            aria-hidden="true"
          />
          <div className="p-3">
            <p className="font-mono text-xs font-bold">
              mono-{step} · {hex}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              {role}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SemanticSection() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {(["ink", "paper"] as const).map((tone) => (
        <LabFrame key={tone} title="Semantic tokens" tone={tone}>
          <ul className="grid gap-2 sm:grid-cols-2" role="list">
            {SEMANTIC_TOKENS.map((token) => (
              <li key={token} className="flex items-center gap-3">
                <span
                  className="size-8 shrink-0 rounded-sm border"
                  style={{
                    backgroundColor: `var(--${token})`,
                    borderColor: "var(--line-3)",
                  }}
                  aria-hidden="true"
                />
                <span className="font-mono text-xs">--{token}</span>
              </li>
            ))}
          </ul>
          <p className="t-caption text-muted-foreground mt-4">
            State is never a hue: destructive, success, warning and info resolve
            to the same greys and are told apart by glyph, label, weight and
            pattern.
          </p>
        </LabFrame>
      ))}
    </div>
  );
}
