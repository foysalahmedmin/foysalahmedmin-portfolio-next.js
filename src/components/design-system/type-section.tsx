import { TonePair } from "./lab-frame";

const steps = [
  ["t-wordmark", "Wordmark", "step-6"],
  ["t-h1", "Page statement", "step-5"],
  ["t-h2", "Section statement", "step-4"],
  ["t-h3", "Subsection", "step-3"],
  ["t-h4", "Card title", "step-2"],
] as const;

export function TypeSection() {
  return (
    <div className="flex flex-col gap-6">
      <TonePair title="Display scale (Archivo, width is semantic)" stacked>
        <div className="flex flex-col gap-6">
          {steps.map(([className, label, step]) => (
            <div key={className}>
              <p className="t-eyebrow text-fg-secondary mb-2">
                {label} · {step}
              </p>
              <p className={`${className} overflow-hidden`}>Signal</p>
            </div>
          ))}
          <div>
            <p className="t-eyebrow text-fg-secondary mb-2">
              Width axis · wdth 62 → 125
            </p>
            <div className="font-display flex flex-col gap-1 text-3xl font-bold">
              <span style={{ fontStretch: "62%" }}>Condensed 62</span>
              <span style={{ fontStretch: "100%" }}>Normal 100</span>
              <span style={{ fontStretch: "125%" }}>Expanded 125</span>
            </div>
          </div>
        </div>
      </TonePair>
      <TonePair title="Text and Mono">
        <div className="flex flex-col gap-4">
          <p className="t-lead">
            Lead (step-1): one sentence that states the problem and the outcome.
          </p>
          <p className="t-body t-measure">
            Body (step-0, Instrument Sans): measure is 62 to 68 characters so
            reading stays easy at every width. Numbers use tabular figures.
          </p>
          <p className="t-caption text-muted-foreground">
            Caption (step--1): metadata and notes.
          </p>
          <p className="t-eyebrow">
            /system-path · eyebrow (Martian Mono, wdth 75)
          </p>
          <p className="t-mono text-2xl">1,284 · 99.95% · r12</p>
        </div>
      </TonePair>
    </div>
  );
}
