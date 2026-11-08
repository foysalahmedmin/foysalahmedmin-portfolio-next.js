import type { TPublicServiceDto } from "@/app/api/services/service.type";
import type { TPublicSiteDto } from "@/app/api/site/site.type";
import {
  resolveContactTopic,
  resolveStartLabels,
  SUBJECT_MAX,
  subjectForGroup,
  topicSubject,
} from "@/components/(common)/contact-page/topic";
import { describe, expect, it, vi } from "vitest";

const service = (
  overrides: Partial<TPublicServiceDto> & Pick<TPublicServiceDto, "slug">
): TPublicServiceDto => ({
  locale: "en",
  title: overrides.slug,
  secondary_pillars: [],
  sequence: 0,
  is_featured: true,
  published_at: "2026-07-17T00:00:00.000Z",
  outcome: "",
  capabilities: [],
  deliverables: [],
  technologies: [],
  problems: [],
  ...overrides,
});

const SERVICES = [
  service({
    slug: "architecture-system-design",
    primary_pillar: "system_architect",
    problems: [
      {
        key: "software-keeps-breaking",
        pain: "Our software keeps breaking as we grow.",
        approach: "Map the failure points.",
      },
    ],
  }),
  service({
    slug: "ai-automation",
    primary_pillar: "ai_automation",
    problems: [
      {
        key: "repetitive-error-prone-steps",
        pain: "My team spends hours on repetitive, error-prone steps.",
        approach: "Automate the steps.",
      },
    ],
  }),
];

const site = {
  engagement_models: [
    {
      key: "architecture-review",
      name: "Architecture review",
      you_get: [],
      verification: "verified",
      enabled: true,
    },
  ],
} as unknown as Pick<TPublicSiteDto, "engagement_models">;

const FINDER: NonNullable<TPublicSiteDto["finder"]> = {
  enabled: true,
  steps: [
    {
      key: "stage",
      question: "Where are you now?",
      options: [
        { key: "idea", label: "We only have an idea", tags: [] },
        { key: "hurts", label: "It works but it hurts", tags: [] },
      ],
    },
    {
      key: "priority",
      question: "What matters most?",
      options: [{ key: "speed", label: "Speed", tags: [] }],
    },
  ],
  outcomes: [],
};

describe("resolveContactTopic", () => {
  it("maps a problem key to its service group and pain sentence", async () => {
    const load = vi.fn().mockResolvedValue(SERVICES);

    expect(
      await resolveContactTopic("software-keeps-breaking", site, load)
    ).toEqual({
      key: "software-keeps-breaking",
      kind: "problem",
      group: "systems",
      label: "Our software keeps breaking as we grow.",
      subject: "Re: Our software keeps breaking as we grow.",
    });
    expect(
      await resolveContactTopic("repetitive-error-prone-steps", site, load)
    ).toMatchObject({ kind: "problem", group: "ai_automation" });
  });

  it("maps an engagement model key to its name without reading services", async () => {
    const load = vi.fn().mockResolvedValue(SERVICES);

    expect(
      await resolveContactTopic("architecture-review", site, load)
    ).toEqual({
      key: "architecture-review",
      kind: "model",
      group: null,
      label: "Architecture review",
      subject: "Re: Architecture review",
    });
    expect(load).not.toHaveBeenCalled();
  });

  it("does not read services when there is no topic", async () => {
    const load = vi.fn().mockResolvedValue(SERVICES);

    expect(await resolveContactTopic(undefined, site, load)).toBeNull();
    expect(await resolveContactTopic("", site, load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("ignores an unknown or hostile key and never carries it forward", async () => {
    const load = vi.fn().mockResolvedValue(SERVICES);
    const hostile = '"><script>alert(1)</script>';

    expect(await resolveContactTopic("nope", site, load)).toBeNull();
    expect(await resolveContactTopic(hostile, site, load)).toBeNull();
    expect(await resolveContactTopic("__proto__", site, load)).toBeNull();
  });

  it("takes the first value of a repeated parameter", async () => {
    const load = vi.fn().mockResolvedValue(SERVICES);

    expect(
      await resolveContactTopic(
        ["architecture-review", "software-keeps-breaking"],
        site,
        load
      )
    ).toMatchObject({ label: "Architecture review" });
  });
});

describe("topic subject", () => {
  it("fits the subject limit the form validates", () => {
    const long = "x".repeat(300);
    const subject = topicSubject(long);

    expect(subject).toHaveLength(SUBJECT_MAX);
    expect(subject.endsWith("…")).toBe(true);
    expect(topicSubject("Short")).toBe("Re: Short");
  });

  it("offers the resolved line for its own group and the group word otherwise", () => {
    const topic = {
      key: "k",
      kind: "problem" as const,
      group: "systems" as const,
      label: "Pain",
      subject: "Re: Pain",
    };

    expect(subjectForGroup("systems", topic)).toBe("Re: Pain");
    expect(subjectForGroup("ai_automation", topic)).toBe("AI Automation: ");
    expect(subjectForGroup("other", topic)).toBe("");
    expect(subjectForGroup("systems", null)).toBe("Systems: ");
  });
});

describe("resolveStartLabels", () => {
  it("returns the labels of the finder answers in the order given", () => {
    expect(resolveStartLabels("hurts,speed", FINDER)).toEqual([
      "It works but it hurts",
      "Speed",
    ]);
  });

  it("drops unknown keys and duplicates", () => {
    expect(resolveStartLabels("idea,<b>,idea,,x", FINDER)).toEqual([
      "We only have an idea",
    ]);
  });

  it("is empty without a finder, a value or a match", () => {
    expect(resolveStartLabels("idea", undefined)).toEqual([]);
    expect(resolveStartLabels(undefined, FINDER)).toEqual([]);
    expect(resolveStartLabels("nope", FINDER)).toEqual([]);
  });
});
