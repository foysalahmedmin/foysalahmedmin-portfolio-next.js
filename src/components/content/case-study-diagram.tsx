import type {
  CaseStudyArchitecture,
  CaseStudyArchitectureNodeKind,
} from "@/lib/content/case-study-contract";
import {
  DIAGRAM_KIND_LABELS,
  DIAGRAM_METRICS as M,
  layoutCaseStudyDiagram,
} from "@/lib/content/case-study-diagram-layout";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

/**
 * A glyph per node kind, drawn in a 12 x 12 box with strokes only. The kind is also written next to it
 * (and the diagram has a text equivalent), so the glyph is never the only carrier of meaning.
 */
const GLYPHS: Readonly<Record<CaseStudyArchitectureNodeKind, string>> = {
  client: "M0.7 1.5h10.6v7H0.7zM3.5 11h5",
  service: "M0.7 1h10.6v4H0.7zM0.7 7h10.6v4H0.7z",
  data: "M1 2.6C1 1.4 3.2 0.7 6 0.7s5 0.7 5 1.9v6.8c0 1.2-2.2 1.9-5 1.9s-5-0.7-5-1.9zM1 2.6c0 1.2 2.2 1.9 5 1.9s5-0.7 5-1.9",
  queue: "M0.7 2h10.6M0.7 6h10.6M0.7 10h10.6M8.5 4l2.8 2-2.8 2",
  automation: "M7 0.5 1.5 7H5.7L5 11.5 10.5 5H6.3z",
  agent: "M6 0.6 11.4 6 6 11.4 0.6 6zM6 3.6 8.4 6 6 8.4 3.6 6z",
  review:
    "M6 0.7a5.3 5.3 0 1 0 0 10.6A5.3 5.3 0 0 0 6 0.7zM3.4 6.2 5.2 8l3.4-3.8",
  external: "M5 1.2H1.2v9.6h9.6V7M7 0.7h4.3V5M11.3 0.7 5.6 6.4",
  output: "M0.7 6h9M6.4 2.2 10.2 6 6.4 9.8",
};

const NodeText = ({
  lines,
  x,
  top,
}: {
  lines: readonly string[];
  x: number;
  top: number;
}) => (
  <text className="story-node__label">
    {lines.map((line, index) => (
      <tspan key={index} x={x} y={top + index * M.lineHeight + 13}>
        {line}
      </tspan>
    ))}
  </text>
);

/**
 * The case-study architecture as code-native SVG, built only from the validated structured data: layers are
 * columns, kinds are glyph plus word (external is dashed, review is double-ruled), edges point at their
 * target. Every node and edge carries `data-highlight-id` so the engine can light the ones a chapter
 * concerns; without the engine the whole diagram reads at rest. Pure markup, no client JavaScript.
 */
export function CaseStudyDiagram({
  architecture,
  title = "Architecture diagram",
  idPrefix = "story-diagram",
  className,
}: {
  architecture: CaseStudyArchitecture;
  title?: string;
  /** Ids inside the SVG; change it only when two diagrams share a page. */
  idPrefix?: string;
  className?: string;
}) {
  const layout = layoutCaseStudyDiagram(architecture);
  const nameByKey = new Map(layout.nodes.map((node) => [node.key, node.label]));
  const ruleY = M.padding + layout.headerHeight - M.headerGap + 4;

  return (
    <figure
      className={cn("story-diagram", className)}
      aria-labelledby={`${idPrefix}-title`}
    >
      <div
        className="story-diagram__scroll"
        role="group"
        aria-label="Architecture diagram, scrolls sideways"
        tabIndex={0}
      >
        <svg
          role="img"
          aria-labelledby={`${idPrefix}-title ${idPrefix}-desc`}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="story-svg"
          style={{ "--diagram-width": layout.width } as CSSProperties}
          focusable="false"
        >
          <title id={`${idPrefix}-title`}>{title}</title>
          <desc id={`${idPrefix}-desc`}>{architecture.alt}</desc>

          {layout.columns.map((column) => (
            <g key={column.layer} className="story-layer">
              <text className="story-layer__name">
                {column.lines.map((line, index) => (
                  <tspan
                    key={index}
                    x={column.x}
                    y={M.padding + (index + 1) * M.headerLineHeight - 3}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
              <path
                className="story-layer__rule"
                d={`M${column.x} ${ruleY}h${M.nodeWidth}`}
              />
            </g>
          ))}

          {layout.edges.map((edge) => (
            <g
              key={edge.id}
              className="story-edge"
              data-highlight-id={edge.id}
              data-from={edge.from}
              data-to={edge.to}
            >
              <path className="story-edge__line" d={edge.d} />
              {/* The light that travels the line when a chapter reaches it (pathLength 1: one draw, any length) */}
              <path className="story-edge__pulse" d={edge.d} pathLength={1} />
              <path className="story-edge__arrow" d={edge.arrow} />
            </g>
          ))}

          {layout.nodes.map((node) => (
            <g
              key={node.key}
              className="story-node"
              data-highlight-id={node.key}
              data-kind={node.kind}
            >
              <title>
                {node.note ? `${node.label}: ${node.note}` : node.label}
              </title>
              <rect
                className="story-node__box"
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx={2}
              />
              {node.kind === "review" ? (
                <rect
                  className="story-node__inner"
                  x={node.x + 3}
                  y={node.y + 3}
                  width={node.width - 6}
                  height={node.height - 6}
                  rx={1}
                />
              ) : null}
              <path
                className="story-node__glyph"
                d={GLYPHS[node.kind]}
                transform={`translate(${node.x + M.nodePadX} ${node.y + M.nodePadY})`}
              />
              <text
                className="story-node__kind"
                x={node.x + M.nodePadX + 18}
                y={node.y + M.nodePadY + 10}
              >
                {node.kindLabel}
              </text>
              <NodeText
                lines={node.lines}
                x={node.x + M.nodePadX}
                top={node.y + M.nodePadY + M.captionHeight + M.captionGap}
              />
            </g>
          ))}

          {/* Labels last, so a line passing behind a node can never cover one */}
          {layout.edges.map((edge) =>
            edge.labelLines.length ? (
              <text
                key={edge.id}
                className="story-edge__label"
                textAnchor={edge.labelAnchor}
              >
                {edge.labelLines.map((line, index) => (
                  <tspan
                    key={index}
                    x={edge.labelX}
                    y={edge.labelY + index * M.edgeLineHeight}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
            ) : null
          )}
        </svg>
      </div>

      <details className="story-diagram__text">
        <summary>
          Diagram as text
          <span className="story-diagram__glyph" aria-hidden="true" />
        </summary>
        <p>{architecture.alt}</p>
        <p className="t-eyebrow story-diagram__text-label">Components</p>
        <ul role="list">
          {architecture.nodes.map((node) => (
            <li key={node.key}>
              <strong>{node.label}</strong>{" "}
              <span className="story-diagram__meta">
                {DIAGRAM_KIND_LABELS[node.kind]}, {node.layer}
              </span>
              {node.note ? <span>. {node.note}</span> : null}
            </li>
          ))}
        </ul>
        {architecture.edges.length ? (
          <>
            <p className="t-eyebrow story-diagram__text-label">Connections</p>
            <ul role="list">
              {architecture.edges.map((edge) => (
                <li key={`${edge.from}->${edge.to}`}>
                  <span>{nameByKey.get(edge.from)}</span>
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only"> to </span>
                  <span>{nameByKey.get(edge.to)}</span>
                  {edge.label ? (
                    <span className="story-diagram__meta"> ({edge.label})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </details>
    </figure>
  );
}
