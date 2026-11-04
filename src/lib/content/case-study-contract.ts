import {
  PLAIN_TEXT_MESSAGE,
  SAFE_KEY_MAX_LENGTH,
  SAFE_KEY_PATTERN,
  isSafePlainText,
} from "./plain-text";
import type { PillarKey } from "./pillars";
import type {
  OutcomeVerificationState,
  ProjectType,
} from "./portfolio-contract";

/**
 * Case studies share the engagement and evidence vocabulary of Projects so a
 * result is described the same way in both places. The values are declared
 * here (and checked against the Project contract at compile time) so client
 * forms can import them without pulling in the server-side sanitizer.
 */
export const CASE_STUDY_ENGAGEMENT_TYPES = [
  "client",
  "internal",
  "open_source",
  "lab",
] as const satisfies readonly ProjectType[];

export const CASE_STUDY_OUTCOME_STATES = [
  "derived",
  "verified",
  "unverified",
] as const satisfies readonly OutcomeVerificationState[];

export const CASE_STUDY_LINK_VISIBILITIES = ["public", "hidden"] as const;
export type CaseStudyLinkVisibility =
  (typeof CASE_STUDY_LINK_VISIBILITIES)[number];

export const CASE_STUDY_ENGAGEMENT_LABELS: Readonly<
  Record<ProjectType, string>
> = {
  client: "Client engagement",
  internal: "Internal product",
  open_source: "Open source",
  lab: "Lab experiment",
};

export type CaseStudyOutcome = Readonly<{
  label: string;
  value: string;
  description?: string;
  verification_state: OutcomeVerificationState;
  evidence_reference?: string;
}>;

export const CASE_STUDY_CONSTRAINT_LIMITS = { items: 6, length: 300 } as const;

export const CASE_STUDY_ARCHITECTURE_NODE_KINDS = [
  "client",
  "service",
  "data",
  "queue",
  "automation",
  "agent",
  "review",
  "external",
  "output",
] as const;
export type CaseStudyArchitectureNodeKind =
  (typeof CASE_STUDY_ARCHITECTURE_NODE_KINDS)[number];

/** Inclusive [min, max] bounds shared by the Zod schema, the Mongoose model and the renderer. */
export const CASE_STUDY_ARCHITECTURE_LIMITS = {
  alt: [10, 300],
  layers: [1, 6],
  layer: [1, 40],
  nodes: [1, 24],
  node_label: [1, 40],
  node_note: [1, 160],
  edges: [0, 48],
  edge_label: [1, 40],
  steps: [0, 8],
  step_title: [1, 80],
  step_focus: [1, 6],
} as const;

export type CaseStudyArchitectureNode = Readonly<{
  key: string;
  label: string;
  layer: string;
  kind: CaseStudyArchitectureNodeKind;
  note?: string;
}>;
export type CaseStudyArchitectureEdge = Readonly<{
  from: string;
  to: string;
  label?: string;
}>;
export type CaseStudyArchitectureStep = Readonly<{
  title: string;
  focus: readonly string[];
}>;
/** Plain-text data only; it is drawn as code-native SVG, never as uploaded markup. */
export type CaseStudyArchitecture = Readonly<{
  alt: string;
  layers: readonly string[];
  nodes: readonly CaseStudyArchitectureNode[];
  edges: readonly CaseStudyArchitectureEdge[];
  steps: readonly CaseStudyArchitectureStep[];
}>;

export type CaseStudyArchitectureIssue = Readonly<{
  path: readonly (string | number)[];
  message: string;
}>;
export type CaseStudyArchitectureResult =
  | Readonly<{ ok: true; value: CaseStudyArchitecture }>
  | Readonly<{ ok: false; issues: readonly CaseStudyArchitectureIssue[] }>;

type Path = readonly (string | number)[];

/**
 * Validates and normalises (trims) an architecture diagram. Hand-written rather than Zod so the
 * client-reachable contract stays out of the initial bundle (ADR 0009); the Zod schema wraps it.
 */
export const parseCaseStudyArchitecture = (
  input: unknown
): CaseStudyArchitectureResult => {
  const L = CASE_STUDY_ARCHITECTURE_LIMITS;
  const issues: CaseStudyArchitectureIssue[] = [];
  const fail = (path: Path, message: string) =>
    void issues.push({ path, message });

  const object = (value: unknown, path: Path, keys: readonly string[]) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      fail(path, "Expected an object");
      return {} as Record<string, unknown>;
    }
    for (const name of Object.keys(value)) {
      if (!keys.includes(name)) fail([...path, name], "Unknown field");
    }
    return value as Record<string, unknown>;
  };
  const list = (
    value: unknown,
    path: Path,
    [min, max]: readonly [number, number]
  ) => {
    if (!Array.isArray(value)) {
      fail(path, "Expected a list");
      return [];
    }
    if (value.length < min || value.length > max) {
      fail(path, `Use ${min} to ${max} items`);
    }
    return value.slice(0, max) as unknown[];
  };
  const text = (
    value: unknown,
    path: Path,
    [min, max]: readonly [number, number]
  ) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed.length < min || trimmed.length > max) {
      fail(path, `Use ${min} to ${max} characters`);
    } else if (!isSafePlainText(trimmed)) {
      fail(path, PLAIN_TEXT_MESSAGE);
    }
    return trimmed;
  };
  const optional = (
    value: unknown,
    path: Path,
    bounds: readonly [number, number]
  ) => (value === undefined ? undefined : text(value, path, bounds));
  const key = (value: unknown, path: Path) => {
    const trimmed = text(value, path, [1, SAFE_KEY_MAX_LENGTH]);
    if (trimmed && !SAFE_KEY_PATTERN.test(trimmed)) {
      fail(path, "Use a lowercase key such as api-gateway");
    }
    return trimmed;
  };

  const root = object(input, [], ["alt", "layers", "nodes", "edges", "steps"]);
  const alt = text(root.alt, ["alt"], L.alt);

  const layers = list(root.layers, ["layers"], L.layers).map((layer, index) =>
    text(layer, ["layers", index], L.layer)
  );
  layers.forEach((layer, index) => {
    if (layer && layers.indexOf(layer) !== index) {
      fail(["layers", index], "Layers must be unique");
    }
  });

  const nodes = list(root.nodes, ["nodes"], L.nodes).map((raw, index) => {
    const path = ["nodes", index];
    const node = object(raw, path, ["key", "label", "layer", "kind", "note"]);
    const layer = text(node.layer, [...path, "layer"], L.layer);
    if (layer && !layers.includes(layer)) {
      fail([...path, "layer"], "Layer must be one of the declared layers");
    }
    const kind = node.kind as CaseStudyArchitectureNodeKind;
    if (!CASE_STUDY_ARCHITECTURE_NODE_KINDS.includes(kind)) {
      fail(
        [...path, "kind"],
        `Use one of: ${CASE_STUDY_ARCHITECTURE_NODE_KINDS.join(", ")}`
      );
    }
    const note = optional(node.note, [...path, "note"], L.node_note);
    return {
      key: key(node.key, [...path, "key"]),
      label: text(node.label, [...path, "label"], L.node_label),
      layer,
      kind,
      ...(note ? { note } : {}),
    };
  });
  const nodeKeys = new Set(nodes.map((node) => node.key));
  nodes.forEach((node, index) => {
    if (nodes.findIndex((other) => other.key === node.key) !== index) {
      fail(["nodes", index, "key"], "Node keys must be unique");
    }
  });

  const seenEdges = new Set<string>();
  const edges = list(root.edges, ["edges"], L.edges).map((raw, index) => {
    const path = ["edges", index];
    const edge = object(raw, path, ["from", "to", "label"]);
    const from = text(edge.from, [...path, "from"], [1, SAFE_KEY_MAX_LENGTH]);
    const to = text(edge.to, [...path, "to"], [1, SAFE_KEY_MAX_LENGTH]);
    for (const end of ["from", "to"] as const) {
      const value = end === "from" ? from : to;
      if (value && !nodeKeys.has(value)) {
        fail([...path, end], `Unknown node "${value}"`);
      }
    }
    if (from && from === to)
      fail([...path, "to"], "An edge cannot connect a node to itself");
    else if (from && to && seenEdges.has(`${from}\u0000${to}`)) {
      fail(path, "Duplicate edge");
    }
    seenEdges.add(`${from}\u0000${to}`);
    const label = optional(edge.label, [...path, "label"], L.edge_label);
    return { from, to, ...(label ? { label } : {}) };
  });

  const steps = list(root.steps, ["steps"], L.steps).map((raw, index) => {
    const path = ["steps", index];
    const step = object(raw, path, ["title", "focus"]);
    const focus = list(step.focus, [...path, "focus"], L.step_focus).map(
      (value, position) => {
        const focusKey = text(
          value,
          [...path, "focus", position],
          [1, SAFE_KEY_MAX_LENGTH]
        );
        if (focusKey && !nodeKeys.has(focusKey)) {
          fail([...path, "focus", position], `Unknown node "${focusKey}"`);
        }
        return focusKey;
      }
    );
    return { title: text(step.title, [...path, "title"], L.step_title), focus };
  });

  return issues.length
    ? { ok: false, issues }
    : {
        ok: true,
        value: { alt, layers, nodes, edges, steps } as CaseStudyArchitecture,
      };
};

/** Turns the JSON text into either a validated diagram or the one message the editor should see. */
export const readCaseStudyArchitectureJson = (
  source: string
): { value: CaseStudyArchitecture } | { message: string } => {
  if (!source.trim()) {
    return { message: "Add architecture JSON to preview the diagram." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    return {
      message: `Invalid JSON: ${error instanceof Error ? error.message : "parse error"}`,
    };
  }
  const result = parseCaseStudyArchitecture(parsed);
  if (result.ok) return { value: result.value };
  const [first] = result.issues;
  const more = result.issues.length - 1;
  return {
    message: `${first!.path.join(".") || "architecture"}: ${first!.message}${more > 0 ? ` (+${more} more)` : ""}`,
  };
};

export type CaseStudyPublishCandidate = Readonly<{
  description?: string;
  primary_pillar?: PillarKey;
  engagement_type?: ProjectType;
  challenge?: string;
  approach?: string;
  solution?: string;
  results_summary?: string;
  outcomes?: readonly CaseStudyOutcome[];
  constraints?: readonly string[];
  architecture?: CaseStudyArchitecture | null;
}>;

/** Missing fields that block a Case study from being published. */
export const getCaseStudyPublishReadiness = (
  caseStudy: CaseStudyPublishCandidate
): string[] => {
  const issues: string[] = [];
  if (!caseStudy.description?.trim()) issues.push("description");
  if (!caseStudy.primary_pillar) issues.push("primary_pillar");
  if (!caseStudy.engagement_type) issues.push("engagement_type");
  for (const field of ["challenge", "approach", "solution"] as const) {
    if (!caseStudy[field]?.trim()) issues.push(field);
  }
  const hasResult =
    Boolean(caseStudy.results_summary?.trim()) ||
    Boolean(
      caseStudy.outcomes?.some(
        (outcome) => outcome.verification_state !== "unverified"
      )
    );
  if (!hasResult) issues.push("results");
  return issues;
};

/**
 * Fields a complete case file should have but that never block publishing, so records that
 * predate them stay publishable until they are updated.
 */
export const getCaseStudyPublishRecommendations = (
  caseStudy: Readonly<{
    constraints?: readonly string[];
    architecture?: unknown;
  }>
): string[] => {
  const recommended: string[] = [];
  if (!caseStudy.constraints?.some((item) => item.trim())) {
    recommended.push("constraints");
  }
  if (!caseStudy.architecture) recommended.push("architecture");
  return recommended;
};
