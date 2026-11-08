/**
 * A small static fragment of the hero maquette: squares joined by orthogonal lines. Decorative only
 * (no WebGL, no script): it takes its colour from `currentColor`, set by `.cfx-topology`.
 */
const NODES = [
  [8, 18],
  [88, 18],
  [168, 18],
  [48, 66],
  [128, 66],
  [88, 114],
  [188, 90],
] as const;

const LINES = [
  "M20 24H88",
  "M100 24H168",
  "M94 30V72H60",
  "M94 48H134V66",
  "M134 78V120H100",
  "M54 78V120H88",
  "M174 30V96H188",
] as const;

export function Topology() {
  return (
    <svg
      className="cfx-topology"
      viewBox="0 0 208 132"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        {LINES.map((d) => (
          <path key={d} d={d} vectorEffect="non-scaling-stroke" />
        ))}
        {NODES.map(([x, y], index) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="12"
            height="12"
            vectorEffect="non-scaling-stroke"
            // One node is lit: the same "active node" mark the maquette uses.
            fill={index === 1 ? "currentColor" : "none"}
          />
        ))}
      </g>
    </svg>
  );
}
