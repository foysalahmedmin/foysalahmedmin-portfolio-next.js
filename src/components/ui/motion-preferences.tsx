"use client";

import { useMotion, type MotionPreference } from "@/providers/motion-provider";
import {
  setScenePreference,
  useScenePreference,
  type ScenePreference,
} from "@/state/scene-store";

type Option<T extends string> = Readonly<{ value: T; label: string }>;

const MOTION_OPTIONS: readonly Option<MotionPreference>[] = [
  { value: "system", label: "Auto" },
  { value: "full", label: "Full" },
  { value: "reduce", label: "Reduced" },
  { value: "off", label: "Off" },
];

const SCENE_OPTIONS: readonly Option<ScenePreference>[] = [
  { value: "auto", label: "Live" },
  { value: "still", label: "Still" },
];

function Segmented<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
}: {
  legend: string;
  name: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 items-center gap-3 border-0 p-0">
      <legend className="sr-only">{legend}</legend>
      <span aria-hidden="true" className="t-eyebrow text-fg-secondary">
        {legend}
      </span>
      <div className="border-line-3 flex border">
        {options.map((option) => (
          <label key={option.value} className="relative flex">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="text-fg-secondary hover:text-foreground flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-3 text-xs font-semibold transition-colors peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The visitor's motion and 3D preferences (docs plan 6.4). Motion: follow the site, full, reduced or
 * off. 3D scene: live or a still image. Both persist, both can also be set from the command palette,
 * and the OS reduced-motion setting always caps motion at reduced.
 */
export default function MotionPreferences() {
  const { preference, setPreference, effectiveMotion, hydrated } = useMotion();
  const scene = useScenePreference();

  return (
    <div
      data-motion-preferences=""
      className="flex flex-wrap items-center gap-x-6 gap-y-3"
    >
      <Segmented
        legend="Motion"
        name="motion-preference"
        options={MOTION_OPTIONS}
        value={preference}
        onChange={setPreference}
        disabled={!hydrated}
      />
      <Segmented
        legend="3D scene"
        name="scene-preference"
        options={SCENE_OPTIONS}
        value={scene}
        onChange={setScenePreference}
        disabled={!hydrated}
      />
      <span role="status" className="sr-only">
        Effective motion: {effectiveMotion}
      </span>
    </div>
  );
}
