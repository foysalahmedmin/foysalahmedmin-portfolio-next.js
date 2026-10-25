import { Counter } from "@/components/motion/counter";
import { Magnetic } from "@/components/motion/magnetic";
import { PinBeat, PinScene } from "@/components/motion/pin-scene";
import Reveal from "@/components/motion/reveal";
import { TextReveal } from "@/components/motion/text-reveal";
import { TraceRail } from "@/components/motion/trace-rail";
import { DemoSection } from "@/components/motion-lab/demo-section";
import { LabStatus } from "@/components/motion-lab/lab-status";
import { Replay } from "@/components/motion-lab/replay";
import { Button } from "@/components/ui/button";
import { MonoLabel } from "@/components/ui/mono-label";
import { TextLink } from "@/components/ui/text-link";
import { OpenPaletteButton } from "@/components/motion-lab/open-palette-button";
import { REVEAL_VARIANTS } from "@/lib/motion/reveal";
import Link from "next/link";

const CHAPTERS = [
  { id: "demo-M07", label: "Reveal" },
  { id: "demo-M08", label: "Media wipe" },
  { id: "demo-M02", label: "Line settle" },
  { id: "demo-M10", label: "Count-up" },
  { id: "demo-M14", label: "Magnetic" },
  { id: "demo-pin", label: "Pin scene" },
  { id: "demo-M18", label: "Route shutter" },
  { id: "demo-M20", label: "Palette" },
] as const;

const BEATS = [
  ["Frontend", "One idea per beat, one screen or less."],
  ["Backend", "The scene answers the scroll; nothing moves on its own."],
  ["Automation", "Every beat is in the HTML in reading order."],
] as const;

export default function MotionLabPage() {
  return (
    <main data-archetype="lab" className="container pb-32">
      <TraceRail items={CHAPTERS} />

      <header className="flex flex-col gap-6 py-20">
        <MonoLabel>/lab/motion</MonoLabel>
        <h1 className="t-h1">Motion lab</h1>
        <p className="t-lead text-fg-secondary max-w-prose">
          Every built effect, running for real on the public surface. Use the
          controls above to switch motion to full, reduced or off, and
          <code className="font-mono"> ?tier=0..3 </code> to force a tier (
          <code className="font-mono">?tier=auto</code> clears it). Add{" "}
          <code className="font-mono">?debug=perf</code> for the frame overlay.
        </p>
        <LabStatus />
        <p className="text-fg-secondary text-sm">
          Scroll down: the demos below the first screen are the ones that
          animate on entry.
        </p>
      </header>

      <DemoSection effectId="M06">
        <p className="text-fg-secondary max-w-prose text-sm">
          On screens 1280 px wide and up, the rail at the left edge shows one
          tick per chapter below. The current chapter is marked, the hairline
          fills with page progress, and each tick is a link that scrolls there
          and moves focus to the section. Reduced and off motion keep the ticks
          and the current mark and hide the moving fill.
        </p>
      </DemoSection>

      <DemoSection effectId="M07">
        <Replay>
          <div className="grid gap-4 sm:grid-cols-2">
            {REVEAL_VARIANTS.filter((variant) => variant !== "wipe").map(
              (variant, index, list) => (
                <Reveal
                  key={variant}
                  variant={variant}
                  index={index}
                  count={list.length}
                  data-reveal-force=""
                  className="border-line-3 flex min-h-24 items-center border p-5"
                >
                  <span className="font-mono text-xs">{variant}</span>
                </Reveal>
              )
            )}
          </div>
        </Replay>
      </DemoSection>

      <DemoSection effectId="M08">
        <Replay>
          <Reveal
            variant="wipe"
            data-reveal-force=""
            className="border-line-3 grid aspect-[16/7] place-items-center border"
          >
            <span className="font-mono text-xs">
              clip-path wipe, image decoded first
            </span>
          </Reveal>
        </Replay>
      </DemoSection>

      <DemoSection effectId="M02">
        <div className="flex flex-col gap-10">
          <TextReveal as="h2" className="t-h2">
            Automation that you can switch off, with a human in the loop.
          </TextReveal>
          <TextReveal as="p" className="t-lead max-w-prose">
            The server renders the whole sentence. The engine splits it into
            lines only after fonts are ready, and only when it starts below the
            first screen.
          </TextReveal>
        </div>
      </DemoSection>

      <DemoSection effectId="M10">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { value: 3, label: "Roles" },
            { value: 1280, label: "Tests", suffix: "+" },
            { value: 99.5, label: "Lighthouse", decimals: 1 },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <span className="t-h2">
                <Counter
                  value={item.value}
                  decimals={item.decimals ?? 0}
                  suffix={item.suffix ?? ""}
                />
              </span>
              <MonoLabel>{item.label}</MonoLabel>
            </div>
          ))}
        </div>
      </DemoSection>

      <DemoSection effectId="M14">
        <div className="flex flex-wrap items-center gap-10 py-6">
          <Magnetic>
            <Button size="lg">Describe your problem</Button>
          </Magnetic>
          <p className="text-fg-secondary max-w-xs text-sm">
            Tier 3 only (fine pointer on a capable device). Move the pointer
            near the button; it follows with inertia and settles back.
          </p>
        </div>
      </DemoSection>

      <DemoSection effectId="M16">
        <p className="text-fg-secondary max-w-prose text-sm">
          The reticle trails the pointer on tier 3 and grows over links and
          buttons: <TextLink href="#demo-M02">a link</TextLink>,{" "}
          <Button size="sm" variant="outline">
            a button
          </Button>
          . It never replaces the native cursor.
        </p>
      </DemoSection>

      <section
        id="demo-pin"
        aria-labelledby="demo-pin-title"
        className="border-line-2 border-t py-16"
      >
        <MonoLabel>Infrastructure · 3.7.4</MonoLabel>
        <h2 id="demo-pin-title" className="t-h4 mt-3 mb-8">
          Pin scene
        </h2>
        <PinScene
          length={240}
          beats={BEATS.length}
          className="border-line-3 border"
        >
          {BEATS.map(([title, line], index) => (
            <PinBeat
              key={title}
              index={index}
              className="flex min-h-64 flex-col justify-center gap-3 p-8"
            >
              <MonoLabel>
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(BEATS.length).padStart(2, "0")}
              </MonoLabel>
              <p className="t-h3">{title}</p>
              <p className="text-fg-secondary max-w-prose">{line}</p>
            </PinBeat>
          ))}
        </PinScene>
        <p className="text-fg-secondary mt-4 text-sm">
          Pinned with the engine; stacked as a plain list without it.{" "}
          <TextLink href="#demo-M18">Skip this scene</TextLink>
        </p>
      </section>

      <DemoSection effectId="M18">
        <p className="text-fg-secondary max-w-prose text-sm">
          With full motion and View Transitions, this link wipes the next page
          in over 420 ms while the header stays put. Without them the page eases
          in, or simply changes.{" "}
          <Link href="/lab/motion/next" className="link-draw font-semibold">
            Go to the second page
          </Link>
          .
        </p>
      </DemoSection>

      <DemoSection effectId="M20">
        <div className="flex flex-wrap items-center gap-4">
          <OpenPaletteButton />
          <p className="text-fg-secondary text-sm">
            Or press <kbd className="font-mono">Ctrl</kbd>/
            <kbd className="font-mono">⌘</kbd> +{" "}
            <kbd className="font-mono">K</kbd>.
          </p>
        </div>
      </DemoSection>

      <DemoSection effectId="M26">
        <p className="max-w-prose">
          Links draw their underline from the left on hover and focus and
          retract to the right:{" "}
          <TextLink href="#demo-M07" variant="quiet">
            hover or focus this link
          </TextLink>
          .
        </p>
      </DemoSection>

      <DemoSection effectId="M33">
        <div className="grid gap-3" aria-hidden="true">
          <div data-skeleton="" className="h-6 w-2/3 rounded-sm" />
          <div data-skeleton="" className="h-6 w-full rounded-sm" />
          <div data-skeleton="" className="h-6 w-1/2 rounded-sm" />
        </div>
      </DemoSection>
    </main>
  );
}
