import { Glass } from "@/components/ui/glass";
import { LabFrame } from "./lab-frame";

/**
 * Glass tiers over a rich backdrop (a blueprint texture on a mid-dark grey). The backdrop stays at or
 * below mono-700 behind dark glass text (docs plan 3.5, enforced by tests/unit/token-contrast.test.ts).
 */
export function GlassSection() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {(["ink", "paper"] as const).map((tone) => (
        <LabFrame key={tone} title="Glass tiers" tone={tone}>
          <div
            className="tx-blueprint relative isolate flex flex-col gap-4 overflow-hidden rounded-md p-6"
            style={{
              backgroundColor:
                tone === "ink" ? "var(--mono-800)" : "var(--mono-300)",
            }}
          >
            <Glass tier={1} className="p-4">
              <p className="t-eyebrow">Tier 1 · chips and header</p>
            </Glass>
            <Glass tier={2} className="p-6">
              <p className="t-h4">Tier 2 · panels</p>
              <p className="t-caption text-fg-secondary mt-2">
                Body text sits at alpha 0.08 or less over a backdrop at or below
                mono-700.
              </p>
            </Glass>
            <Glass tier={3} className="p-6">
              <p className="t-h4">Tier 3 · overlays</p>
              <p className="t-caption text-fg-secondary mt-2">
                Only on top of the overlay scrim: palette, dialogs, toasts.
              </p>
            </Glass>
          </div>
        </LabFrame>
      ))}
    </div>
  );
}
