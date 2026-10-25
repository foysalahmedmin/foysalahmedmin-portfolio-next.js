/** The DOM labels projected onto the scene (docs plan 3.8): real text, so it stays crisp, selectable and translatable. */
export type SceneLabel = Readonly<{
  id: string;
  text: string;
  /** Which role beat shows it: 0 architect, 1 developer, 2 automation. */
  role: 0 | 1 | 2;
  /** World position of the anchor (x, z) and the height of the thing it labels. */
  x: number;
  z: number;
  height: number;
  /** Labels on the service stacks ride up with the exploded view. */
  lifts?: boolean;
}>;

export const SCENE_LABELS: readonly SceneLabel[] = [
  { id: "gateway", text: "Gateway", role: 0, x: -4.2, z: 0, height: 1.4 },
  { id: "data", text: "Data model", role: 0, x: 3.2, z: -2.8, height: 1.9 },
  { id: "queue", text: "Queue", role: 0, x: 3.2, z: 0, height: 0.7 },
  {
    id: "services",
    text: "Services",
    role: 1,
    x: -0.6,
    z: 0,
    height: 1.2,
    lifts: true,
  },
  {
    id: "admin",
    text: "Admin tools",
    role: 1,
    x: -0.6,
    z: 2.8,
    height: 1.2,
    lifts: true,
  },
  {
    id: "tests",
    text: "Tests",
    role: 1,
    x: -0.6,
    z: -2.8,
    height: 1.2,
    lifts: true,
  },
  { id: "agent", text: "AI agent", role: 2, x: 6.3, z: 1.2, height: 1.6 },
  { id: "review", text: "Review gate", role: 2, x: 9.2, z: 1.2, height: 1.2 },
  { id: "output", text: "Output", role: 2, x: 11.6, z: 0, height: 0.9 },
];
