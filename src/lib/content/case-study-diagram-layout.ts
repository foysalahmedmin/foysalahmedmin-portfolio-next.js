import type {
  CaseStudyArchitecture,
  CaseStudyArchitectureNodeKind,
} from "./case-study-contract";

/**
 * Pure geometry for the public case-study diagram: layers become columns, nodes stack inside their layer
 * in the order they were written, edges are straight lines with an arrowhead. No DOM, no randomness, so the
 * same data always draws the same picture and the SVG can be tested without a browser.
 *
 * The diagram is drawn in a monospace face, so wrapping by character count is exact enough to guarantee
 * that no label is cut: every label is wrapped (never shortened) and the node grows to hold its lines.
 */
export const DIAGRAM_METRICS = {
  padding: 16,
  nodeWidth: 156,
  nodePadX: 12,
  nodePadY: 10,
  captionHeight: 14,
  captionGap: 6,
  lineHeight: 17,
  columnGap: 124,
  rowGap: 44,
  headerLineHeight: 13,
  headerGap: 18,
  labelChars: 15,
  layerChars: 22,
  edgeChars: 11,
  edgeLineHeight: 12,
  arrowLength: 9,
  arrowHalfWidth: 4,
} as const;

/** A word for each node kind, shown beside its glyph so the kind never depends on shape alone. */
export const DIAGRAM_KIND_LABELS: Readonly<
  Record<CaseStudyArchitectureNodeKind, string>
> = {
  client: "Client",
  service: "Service",
  data: "Data store",
  queue: "Queue",
  automation: "Automation",
  agent: "AI agent",
  review: "Human review",
  external: "External",
  output: "Output",
};

export type DiagramNodeLayout = Readonly<{
  key: string;
  label: string;
  kind: CaseStudyArchitectureNodeKind;
  kindLabel: string;
  note?: string;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lines: readonly string[];
}>;

export type DiagramEdgeLayout = Readonly<{
  id: string;
  from: string;
  to: string;
  label?: string;
  /** Line from the source border to the target border; the arrowhead is a separate closed path. */
  d: string;
  arrow: string;
  labelLines: readonly string[];
  /** Baseline of the first label line. */
  labelX: number;
  labelY: number;
  labelAnchor: "middle" | "start";
}>;

export type DiagramColumnLayout = Readonly<{
  layer: string;
  x: number;
  lines: readonly string[];
}>;

export type DiagramLayout = Readonly<{
  width: number;
  height: number;
  /** Where the first node of a column starts; also the baseline of the last layer-heading line. */
  headerHeight: number;
  columns: readonly DiagramColumnLayout[];
  nodes: readonly DiagramNodeLayout[];
  edges: readonly DiagramEdgeLayout[];
}>;

/**
 * Wraps on spaces; a word longer than a line is broken after a `_`, `-`, `.` or `/` when one falls inside
 * the line (so `schema_migrations` reads `schema_` / `migrations`), otherwise hard-broken. Never drops or
 * shortens text.
 */
export const wrapText = (text: string, max: number): string[] => {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (rest.length > max) {
      if (line) {
        lines.push(line);
        line = "";
      }
      const window = rest.slice(0, max);
      const soft = Math.max(
        window.lastIndexOf("_"),
        window.lastIndexOf("-"),
        window.lastIndexOf("."),
        window.lastIndexOf("/")
      );
      const cut = soft > 2 ? soft + 1 : max;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (!line) line = rest;
    else if (line.length + 1 + rest.length <= max) line += ` ${rest}`;
    else {
      lines.push(line);
      line = rest;
    }
  }
  if (line) lines.push(line);
  return lines;
};

export const edgeId = (edge: Readonly<{ from: string; to: string }>) =>
  `${edge.from}->${edge.to}`;

const round = (value: number) => Math.round(value * 10) / 10;

export const layoutCaseStudyDiagram = (
  architecture: CaseStudyArchitecture
): DiagramLayout => {
  const M = DIAGRAM_METRICS;
  const layerLines = architecture.layers.map((layer) =>
    wrapText(layer, M.layerChars)
  );
  const headerHeight =
    Math.max(1, ...layerLines.map((lines) => lines.length)) *
      M.headerLineHeight +
    M.headerGap;

  const drafts = architecture.nodes.map((node) => {
    const lines = wrapText(node.label, M.labelChars);
    return {
      node,
      lines,
      column: Math.max(0, architecture.layers.indexOf(node.layer)),
      height:
        M.nodePadY * 2 +
        M.captionHeight +
        M.captionGap +
        lines.length * M.lineHeight,
    };
  });

  const columnHeights = architecture.layers.map((_, column) => {
    const stack = drafts.filter((draft) => draft.column === column);
    return stack.length
      ? stack.reduce((sum, draft) => sum + draft.height, 0) +
          (stack.length - 1) * M.rowGap
      : 0;
  });
  const tallest = Math.max(0, ...columnHeights);

  const cursor = architecture.layers.map(
    (_, column) =>
      M.padding +
      headerHeight +
      Math.round((tallest - (columnHeights[column] ?? 0)) / 2)
  );
  const nodes: DiagramNodeLayout[] = drafts.map(
    ({ node, lines, column, height }) => {
      const y = cursor[column]!;
      cursor[column] = y + height + M.rowGap;
      return {
        key: node.key,
        label: node.label,
        kind: node.kind,
        kindLabel: DIAGRAM_KIND_LABELS[node.kind],
        ...(node.note ? { note: node.note } : {}),
        column,
        x: M.padding + column * (M.nodeWidth + M.columnGap),
        y,
        width: M.nodeWidth,
        height,
        lines,
      };
    }
  );
  const byKey = new Map(nodes.map((node) => [node.key, node]));

  const edges: DiagramEdgeLayout[] = [];
  for (const edge of architecture.edges) {
    const a = byKey.get(edge.from);
    const b = byKey.get(edge.to);
    if (!a || !b) continue;

    const sideways = a.column !== b.column;
    const dir = b.column > a.column ? 1 : -1;
    const down = b.y > a.y;
    const start = sideways
      ? { x: dir > 0 ? a.x + a.width : a.x, y: a.y + a.height / 2 }
      : { x: a.x + a.width / 2, y: down ? a.y + a.height : a.y };
    const end = sideways
      ? { x: dir > 0 ? b.x : b.x + b.width, y: b.y + b.height / 2 }
      : { x: b.x + b.width / 2, y: down ? b.y : b.y + b.height };

    const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
    const ux = (end.x - start.x) / length;
    const uy = (end.y - start.y) / length;
    const baseX = end.x - ux * M.arrowLength;
    const baseY = end.y - uy * M.arrowLength;
    const arrow = `M${round(end.x)} ${round(end.y)}L${round(baseX - uy * M.arrowHalfWidth)} ${round(baseY + ux * M.arrowHalfWidth)}L${round(baseX + uy * M.arrowHalfWidth)} ${round(baseY - ux * M.arrowHalfWidth)}Z`;

    // The label sits in the first gap the edge crosses, so it never lands on a node it passes behind. Edges that
    // fan out of one node put their labels near the targets and edges that fan in put them near the sources
    // (where the lines are furthest apart), so neighbouring labels do not overlap.
    let labelX: number;
    let labelMiddle: number;
    if (sideways) {
      const fanOut = architecture.edges.filter((other) => {
        const o = byKey.get(other.to);
        return (
          other.from === edge.from &&
          o &&
          o.column !== a.column &&
          (o.column > a.column ? 1 : -1) === dir
        );
      }).length;
      const fanIn = architecture.edges.filter((other) => {
        const o = byKey.get(other.from);
        return (
          other.to === edge.to &&
          o &&
          o.column !== b.column &&
          (b.column > o.column ? 1 : -1) === dir
        );
      }).length;
      const along =
        fanOut > 1 && fanIn <= 1 ? 0.72 : fanIn > 1 && fanOut <= 1 ? 0.28 : 0.5;
      const gapStart = dir > 0 ? a.x + a.width : a.x - M.columnGap;
      // `along` is measured from the source side: mirror it for edges that run leftwards
      labelX = gapStart + (dir > 0 ? along : 1 - along) * M.columnGap;
      const t = (labelX - start.x) / (end.x - start.x);
      labelMiddle = start.y + t * (end.y - start.y);
    } else {
      labelX = start.x + 8;
      labelMiddle = start.y + (down ? 1 : -1) * (M.rowGap / 2);
    }
    const labelLines = edge.label ? wrapText(edge.label, M.edgeChars) : [];

    edges.push({
      id: edgeId(edge),
      from: edge.from,
      to: edge.to,
      ...(edge.label ? { label: edge.label } : {}),
      d: `M${round(start.x)} ${round(start.y)}L${round(end.x)} ${round(end.y)}`,
      arrow,
      labelLines,
      labelX: round(labelX),
      // Centre the block on the line, then step down to the first baseline
      labelY: round(
        labelMiddle - ((labelLines.length - 1) * M.edgeLineHeight) / 2 + 4
      ),
      labelAnchor: sideways ? "middle" : "start",
    });
  }

  return {
    width:
      M.padding * 2 +
      architecture.layers.length * M.nodeWidth +
      (architecture.layers.length - 1) * M.columnGap,
    height: M.padding * 2 + headerHeight + tallest,
    headerHeight,
    columns: architecture.layers.map((layer, column) => ({
      layer,
      x: M.padding + column * (M.nodeWidth + M.columnGap),
      lines: layerLines[column]!,
    })),
    nodes,
    edges,
  };
};

/**
 * The ids a chapter lights when it concerns `focus` nodes: those nodes plus every edge that enters or
 * leaves them, so the light visibly travels in and out of the part being described.
 */
export const highlightIdsForFocus = (
  architecture: CaseStudyArchitecture,
  focus: readonly string[]
): string[] => {
  const known = new Set(architecture.nodes.map((node) => node.key));
  const nodes = focus.filter(
    (key, index) => known.has(key) && focus.indexOf(key) === index
  );
  const lit = new Set(nodes);
  const edges = architecture.edges
    .filter((edge) => lit.has(edge.from) || lit.has(edge.to))
    .map(edgeId);
  return [...nodes, ...edges];
};

/** What the system produces: the nodes written as outputs and the edges that reach them. */
export const outputHighlightIds = (
  architecture: CaseStudyArchitecture
): string[] =>
  highlightIdsForFocus(
    architecture,
    architecture.nodes
      .filter((node) => node.kind === "output")
      .map((node) => node.key)
  );
