import type {
  TSiteWorkflowExample,
  TSiteWorkflowNodeKind,
} from "@/app/api/site/site.type";
import { PinBeat, PinScene } from "@/components/motion/pin-scene";
import { SectionHead } from "@/components/sections/signal/section-head";
import { Tag } from "@/components/ui/tag";
import type { CSSProperties } from "react";

/** Fixed copy: the label is part of the chapter's honesty and does not depend on the data. */
export const ILLUSTRATIVE_LABEL = "Illustrative, not a client project";
const EYEBROW = "Automation, step by step";
const FAILURE_LABEL = "When it fails";
const OFF_LABEL = "Off";

/** Drawing units. The chips are square, the wire runs through their centres and jogs in each gap. */
const VIEW_W = 1000;
const VIEW_H = 112;
const MID = VIEW_H / 2;
const JOG = 18;
const GLYPH_BOX = 20;

/** One 20 by 20 line mark per node kind: a shape, never a colour. */
const GLYPHS: Record<TSiteWorkflowNodeKind, string> = {
  input: "M3 10 H12 M8.5 6 L12.5 10 L8.5 14 M16 4 V16",
  automation: "M10 2.5 L16.5 6.25 V13.75 L10 17.5 L3.5 13.75 V6.25 Z",
  agent:
    "M10 2.5 L12.2 7.8 L17.5 10 L12.2 12.2 L10 17.5 L7.8 12.2 L2.5 10 L7.8 7.8 Z",
  review: "M3.5 10.5 L8 15 L16.5 5",
  output: "M4 4 V16 M7.5 10 H16.5 M12.5 6 L16.5 10 L12.5 14",
};

/** The tapered head: three overlapping dashes that end at the pulse, longer and fainter behind it. */
const HEAD = [
  { length: 0.16, width: 1.5, alpha: 0.3 },
  { length: 0.09, width: 2.5, alpha: 0.6 },
  { length: 0.04, width: 4, alpha: 1 },
] as const;

/** Unpinned there is no `--pin-position`; 99 reads as "after the last beat", so the diagram is finished. */
const POSITION = "var(--pin-position, 99)";

const num = (value: number) => Number(value.toFixed(3));

/**
 * The wire for `count` nodes, left to right. Every gap has the same length, so node k sits exactly
 * k / (count - 1) of the way along it, which is what lets CSS light a node without measuring anything.
 */
export const pipelineGeometry = (count: number) => {
  const column = VIEW_W / count;
  const chip = Math.min(60, column * 0.42);
  const centres = Array.from({ length: count }, (_, index) =>
    num(index * column + chip / 2)
  );
  let d = `M${centres[0]} ${MID}`;
  for (let index = 0; index < count - 1; index += 1) {
    const from = centres[index]! + chip / 2;
    const to = centres[index + 1]! - chip / 2;
    const quarter = (to - from) / 4;
    const y = MID + (index % 2 === 0 ? -JOG : JOG);
    d += ` H${num(from + quarter)} V${y} H${num(to - quarter)} V${MID} H${centres[index + 1]}`;
  }
  return { d, chip: num(chip), centres };
};

/**
 * The pulse's place on the wire (0 to 1) on the story clock: node k is reached when beat k begins and
 * the pulse moves on during the 0.3 changeover after its 0.7 hold (src/lib/motion/story.ts).
 */
export const pulseExpression = (count: number) => {
  const legs = Array.from(
    { length: count - 1 },
    (_, index) =>
      `clamp(0, (${POSITION} - ${(index + 0.7).toFixed(1)}) / 0.3, 1)`
  );
  return `calc((${legs.join(" + ")}) / ${count - 1})`;
};

/** 0 until the last beat has settled, then 1 over a short stretch: the switch flipping, the pulse going out. */
export const switchExpression = (count: number) =>
  `clamp(0, (${POSITION} - ${(count - 0.9).toFixed(1)}) / 0.2, 1)`;

/** How visible the last beat is, so the switch arrives with it. */
const arriveExpression = (count: number) =>
  `clamp(0, (${POSITION} - ${(count - 1.3).toFixed(1)}) / 0.3, 1)`;

type Props = Readonly<{
  workflow?: TSiteWorkflowExample;
  heading?: string;
}>;

/**
 * Chapter 3, the pipeline (docs plan 4.1): an illustrative automation flow, one node at a time. A
 * pinned scene on Home. Everything is in the HTML: the wire, the chips, the names, what each step does
 * and what happens when it fails, and the switch. With the engine the scroll moves a pulse of light
 * along the wire and swaps the panel under it; without it (reduced, off, touch, no JavaScript, phones)
 * the same markup is a finished diagram with every line visible, and the switch is already Off.
 *
 * All motion is CSS reading `--pin-position`, so the section ships no client code of its own.
 */
export default function PipelineSection({ workflow, heading }: Props) {
  if (!workflow || workflow.nodes.length < 2) return null;
  const { nodes } = workflow;
  const count = nodes.length;
  const { d, chip, centres } = pipelineGeometry(count);
  const glyphScale = (chip * 0.5) / GLYPH_BOX;

  const diagramStyle = {
    "--pulse": pulseExpression(count),
    "--off": switchExpression(count),
    "--arrive": arriveExpression(count),
  } as CSSProperties;

  return (
    <PinScene
      id="architecture-workflow"
      aria-labelledby="architecture-workflow-heading"
      data-chapter="pipeline"
      data-chapter-label="Automation"
      beats={count}
      length={300}
      className="pipeline"
    >
      <div className="pipeline-stage container">
        <div className="pipeline-head">
          <SectionHead
            eyebrow={EYEBROW}
            title={heading || workflow.title}
            titleId="architecture-workflow-heading"
          />
          <div className="pipeline-note">
            <Tag>{ILLUSTRATIVE_LABEL}</Tag>
            <p className="pipeline-caption">{workflow.caption}</p>
          </div>
        </div>

        <div className="pipeline-diagram" style={diagramStyle}>
          <svg
            className="pipeline-svg"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            aria-hidden="true"
            focusable="false"
          >
            <path className="pipeline-wire" d={d} pathLength={1} />
            <path className="pipeline-trail" d={d} pathLength={1} />
            {HEAD.map((head) => (
              <path
                key={head.length}
                className="pipeline-head-dash"
                d={d}
                pathLength={1}
                style={
                  {
                    "--len": head.length,
                    "--w": head.width,
                    "--a": head.alpha,
                  } as CSSProperties
                }
              />
            ))}
            <g
              className="pipeline-spark"
              style={{ offsetPath: `path("${d}")` }}
            >
              <circle className="pipeline-spark-halo" r="15" />
              <circle className="pipeline-spark-core" r="5" />
            </g>
            {nodes.map((node, index) => (
              <g
                key={node.key}
                className="pipeline-chip"
                transform={`translate(${num(centres[index]! - chip / 2)} ${num(MID - chip / 2)})`}
                style={
                  {
                    "--at": num(index / (count - 1)),
                    "--k": index,
                  } as CSSProperties
                }
              >
                <rect
                  className="pipeline-chip-ring"
                  x="-6"
                  y="-6"
                  width={chip + 12}
                  height={chip + 12}
                  rx="6"
                />
                <rect
                  className="pipeline-chip-box"
                  width={chip}
                  height={chip}
                  rx="4"
                />
                <rect
                  className="pipeline-chip-fill"
                  width={chip}
                  height={chip}
                  rx="4"
                />
                <path
                  className="pipeline-chip-glyph"
                  d={GLYPHS[node.kind]}
                  transform={`translate(${num((chip - GLYPH_BOX * glyphScale) / 2)} ${num((chip - GLYPH_BOX * glyphScale) / 2)}) scale(${num(glyphScale)})`}
                />
              </g>
            ))}
          </svg>

          <ol
            role="list"
            className="pipeline-steps"
            aria-labelledby="architecture-workflow-heading"
            style={{ "--n": count } as CSSProperties}
          >
            {nodes.map((node, index) => (
              <li
                key={node.key}
                className="pipeline-step"
                style={{ "--at": num(index / (count - 1)) } as CSSProperties}
              >
                <h3 className="pipeline-name t-eyebrow">{node.label}</h3>
                <PinBeat index={index} className="pipeline-beat">
                  <p className="pipeline-does">{node.summary}</p>
                  {node.on_failure ? (
                    <p className="pipeline-fails">
                      <span className="pipeline-fails-label t-eyebrow">
                        {FAILURE_LABEL}
                      </span>{" "}
                      {node.on_failure}
                    </p>
                  ) : null}
                </PinBeat>
              </li>
            ))}
          </ol>

          {workflow.switch_off ? (
            <div className="pipeline-off">
              <span className="pipeline-switch" aria-hidden="true">
                <span className="pipeline-knob" />
              </span>
              <p>
                <span className="pipeline-off-label t-eyebrow">
                  {OFF_LABEL}
                </span>{" "}
                {workflow.switch_off}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </PinScene>
  );
}
