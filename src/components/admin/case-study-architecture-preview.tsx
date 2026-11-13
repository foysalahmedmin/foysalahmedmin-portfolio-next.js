import { readCaseStudyArchitectureJson } from "@/lib/content/case-study-contract";
import { useId } from "react";

const COLUMN = 170;
const ROW = 50;
const WIDTH = 140;
const HEIGHT = 32;
const PAD = 12;
const HEADER = 22;

const short = (label: string) =>
  label.length > 20 ? `${label.slice(0, 19)}…` : label;

/** A small code-native SVG: nodes in layer columns, straight edges, monochrome via currentColor. */
const CaseStudyArchitecturePreview = ({
  source,
}: Readonly<{ source: string }>) => {
  const markerId = useId();
  const parsed = readCaseStudyArchitectureJson(source);
  if ("message" in parsed) {
    return (
      <p role="status" className="text-muted-foreground text-xs">
        {parsed.message}
      </p>
    );
  }

  const { alt, layers, nodes, edges } = parsed.value;
  const filled = layers.map(() => 0);
  const position = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    const column = layers.indexOf(node.layer);
    position.set(node.key, {
      x: PAD + column * COLUMN,
      y: PAD + HEADER + filled[column]! * ROW,
    });
    filled[column]! += 1;
  }
  const width = PAD * 2 + (layers.length - 1) * COLUMN + WIDTH;
  const height = PAD * 2 + HEADER + (Math.max(...filled) - 1) * ROW + HEIGHT;

  return (
    <svg
      role="img"
      aria-label={alt}
      viewBox={`0 0 ${width} ${height}`}
      className="border-border text-foreground w-full rounded-[var(--radius-lg-token)] border"
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
        >
          <path d="M0 0 6 3 0 6z" fill="currentColor" />
        </marker>
      </defs>
      {layers.map((layer, column) => (
        <text
          key={layer}
          x={PAD + column * COLUMN}
          y={PAD + 8}
          fontSize="9"
          fill="currentColor"
          opacity="0.6"
        >
          {layer.toUpperCase()}
        </text>
      ))}
      {edges.map(({ from, to }) => {
        const a = position.get(from)!;
        const b = position.get(to)!;
        const [x1, y1] = [a.x + WIDTH / 2, a.y + HEIGHT / 2];
        const [x2, y2] = [b.x + WIDTH / 2, b.y + HEIGHT / 2];
        return (
          <polyline
            key={`${from}>${to}`}
            points={`${x1},${y1} ${(x1 + x2) / 2},${(y1 + y2) / 2} ${x2},${y2}`}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.55"
            markerMid={`url(#${markerId})`}
          />
        );
      })}
      {nodes.map((node) => {
        const { x, y } = position.get(node.key)!;
        return (
          <g key={node.key}>
            <title>
              {node.note ? `${node.label}: ${node.note}` : node.label}
            </title>
            <rect
              x={x}
              y={y}
              width={WIDTH}
              height={HEIGHT}
              rx="4"
              className="fill-background"
              stroke="currentColor"
            />
            <text
              x={x + WIDTH / 2}
              y={y + HEIGHT / 2 + 3}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
            >
              {short(node.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default CaseStudyArchitecturePreview;
