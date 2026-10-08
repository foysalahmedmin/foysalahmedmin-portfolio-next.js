"use client";

import {
  Checkbox,
  Field,
  FormSection,
  commaToList,
  fieldClass,
  linesToList,
  listToLines,
  toIsoDateTime,
  toLocalDateTime,
} from "@/components/admin/content-form-fields";
import { Button } from "@/components/ui/button";
import { FileGalleryUploader } from "@/components/ui/file-gallery-uploader";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  CASE_STUDY_ENGAGEMENT_LABELS,
  CASE_STUDY_ENGAGEMENT_TYPES,
  CASE_STUDY_OUTCOME_STATES,
  type CaseStudyLinkVisibility,
  type CaseStudyOutcome,
} from "@/lib/content/case-study-contract";
import { PILLAR_CONTRACT, type PillarKey } from "@/lib/content/pillars";
import type { ProjectType } from "@/lib/content/portfolio-contract";
import { cn } from "@/lib/utils";
import { getCaseStudyCategories } from "@/services/category.service";
import type { TCaseStudyCategory } from "@/types/case-study-category.type";
import type {
  TCaseStudy,
  TCaseStudyInput,
  TCaseStudyStatus,
} from "@/types/case-study.type";
import type { TFilePopulated } from "@/types/file.type";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type Props = Readonly<{
  initialData?: Partial<TCaseStudy>;
  onSubmit: (data: TCaseStudyInput) => void;
  onCancel: () => void;
  loading?: boolean;
}>;

type TOutcomeRow = {
  label: string;
  value: string;
  description: string;
  verification_state: CaseStudyOutcome["verification_state"];
  evidence_reference: string;
};

type TFormState = {
  name: string;
  slug: string;
  status: TCaseStudyStatus;
  category: string;
  description: string;
  overview: string;
  thumbnail: TFilePopulated | null;
  images: TFilePopulated[];
  is_featured: boolean;
  published_at: string;
  expired_at: string;
  client_name: string;
  show_client_name: boolean;
  client_industry: string;
  client_location: string;
  engagement_type: ProjectType | "";
  role: string;
  team_size: string;
  duration_label: string;
  started_at: string;
  ended_at: string;
  primary_pillar: PillarKey | "";
  secondary_pillars: PillarKey[];
  challenge: string;
  approach: string;
  key_decisions: string;
  solution: string;
  results_summary: string;
  outcomes: TOutcomeRow[];
  learnings: string;
  tech_stack: string;
  services: string;
  keywords: string;
  live_url: string;
  live_url_visibility: CaseStudyLinkVisibility;
  source_url: string;
  source_url_visibility: CaseStudyLinkVisibility;
  content: string;
};

const emptyOutcome = (): TOutcomeRow => ({
  label: "",
  value: "",
  description: "",
  verification_state: "derived",
  evidence_reference: "",
});

const toDateInput = (value?: string | null) => toLocalDateTime(value).slice(0, 10);

const OUTCOME_STATE_LABELS: Record<TOutcomeRow["verification_state"], string> = {
  derived: "Derived from approved data",
  verified: "Verified (needs evidence)",
  unverified: "Unverified (kept private)",
};

const CaseStudyForm = ({ initialData, onSubmit, onCancel, loading }: Props) => {
  const [form, setForm] = useState<TFormState>(() => ({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    status: initialData?.status ?? "draft",
    category: initialData?.category?._id ?? "",
    description: initialData?.description ?? "",
    overview: initialData?.overview ?? "",
    thumbnail: initialData?.thumbnail ?? null,
    images: initialData?.images ?? [],
    is_featured: initialData?.is_featured ?? false,
    published_at: toLocalDateTime(initialData?.published_at),
    expired_at: toLocalDateTime(initialData?.expired_at),
    client_name: initialData?.client_name ?? "",
    show_client_name: initialData?.show_client_name ?? false,
    client_industry: initialData?.client_industry ?? "",
    client_location: initialData?.client_location ?? "",
    engagement_type: initialData?.engagement_type ?? "",
    role: initialData?.role ?? "",
    team_size: initialData?.team_size ? String(initialData.team_size) : "",
    duration_label: initialData?.duration_label ?? "",
    started_at: toDateInput(initialData?.started_at),
    ended_at: toDateInput(initialData?.ended_at),
    primary_pillar: initialData?.primary_pillar ?? "",
    secondary_pillars: initialData?.secondary_pillars ?? [],
    challenge: initialData?.challenge ?? "",
    approach: initialData?.approach ?? "",
    key_decisions: listToLines(initialData?.key_decisions),
    solution: initialData?.solution ?? "",
    results_summary: initialData?.results_summary ?? "",
    outcomes: (initialData?.outcomes ?? []).map((outcome) => ({
      label: outcome.label,
      value: outcome.value,
      description: outcome.description ?? "",
      verification_state: outcome.verification_state,
      evidence_reference: outcome.evidence_reference ?? "",
    })),
    learnings: listToLines(initialData?.learnings),
    tech_stack: (initialData?.tech_stack ?? []).join(", "),
    services: (initialData?.services ?? []).join(", "),
    keywords: (initialData?.keywords ?? []).join(", "),
    live_url: initialData?.live_url ?? "",
    live_url_visibility: initialData?.live_url_visibility ?? "hidden",
    source_url: initialData?.source_url ?? "",
    source_url_visibility: initialData?.source_url_visibility ?? "hidden",
    content: initialData?.content ?? "",
  }));
  const [categories, setCategories] = useState<TCaseStudyCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await getCaseStudyCategories(
          { limit: 50, sort: "sequence,name" },
          { signal: controller.signal }
        );
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || "Failed to load categories");
        }
        setCategories(response.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrors((current) => ({
          ...current,
          category:
            error instanceof Error ? error.message : "Failed to load categories",
        }));
      } finally {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const set = <K extends keyof TFormState>(key: K, value: TFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const updateOutcome = (index: number, patch: Partial<TOutcomeRow>) =>
    set(
      "outcomes",
      form.outcomes.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next: Partial<Record<string, string>> = {};
    if (form.name.trim().length < 2) next.name = "Enter a title.";
    if (!form.category) next.category = "Select an active case study category.";
    form.outcomes.forEach((row, index) => {
      if (!row.label.trim() || !row.value.trim()) {
        next.outcomes = `Result ${index + 1} needs both a value and a label.`;
      } else if (
        row.verification_state === "verified" &&
        !row.evidence_reference.trim()
      ) {
        next.outcomes = `Result ${index + 1} is verified but has no evidence reference.`;
      }
    });
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    const teamSize = Number(form.team_size);
    const payload: TCaseStudyInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      status: form.status,
      category: form.category,
      description: form.description.trim(),
      overview: form.overview.trim(),
      thumbnail: form.thumbnail?._id ?? null,
      images: form.images.map((image) => image._id),
      is_featured: form.is_featured,
      published_at: toIsoDateTime(form.published_at),
      expired_at: toIsoDateTime(form.expired_at) ?? null,
      client_name: form.client_name.trim(),
      show_client_name: form.show_client_name,
      client_industry: form.client_industry.trim(),
      client_location: form.client_location.trim(),
      engagement_type: form.engagement_type || undefined,
      role: form.role.trim(),
      team_size:
        Number.isInteger(teamSize) && teamSize > 0 ? teamSize : undefined,
      duration_label: form.duration_label.trim(),
      started_at: toIsoDateTime(form.started_at),
      ended_at: toIsoDateTime(form.ended_at),
      primary_pillar: form.primary_pillar || undefined,
      secondary_pillars: form.secondary_pillars,
      challenge: form.challenge.trim(),
      approach: form.approach.trim(),
      key_decisions: linesToList(form.key_decisions),
      solution: form.solution.trim(),
      results_summary: form.results_summary.trim(),
      outcomes: form.outcomes.map((row) => ({
        label: row.label.trim(),
        value: row.value.trim(),
        ...(row.description.trim()
          ? { description: row.description.trim() }
          : {}),
        verification_state: row.verification_state,
        ...(row.evidence_reference.trim()
          ? { evidence_reference: row.evidence_reference.trim() }
          : {}),
      })),
      learnings: linesToList(form.learnings),
      tech_stack: commaToList(form.tech_stack),
      services: commaToList(form.services),
      keywords: commaToList(form.keywords),
      live_url: form.live_url.trim() || null,
      live_url_visibility: form.live_url_visibility,
      source_url: form.source_url.trim() || null,
      source_url_visibility: form.source_url_visibility,
      content: form.content,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <FormSection title="Basics">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Field
            label="Title"
            htmlFor="cs-name"
            error={errors.name}
            className="md:col-span-2"
          >
            <input
              id="cs-name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              maxLength={200}
              required
              className={fieldClass}
            />
          </Field>
          <Field label="Status" htmlFor="cs-status">
            <select
              id="cs-status"
              value={form.status}
              onChange={(event) =>
                set("status", event.target.value as TCaseStudyStatus)
              }
              className={fieldClass}
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Category" htmlFor="cs-category" error={errors.category}>
            <select
              id="cs-category"
              value={form.category}
              onChange={(event) => set("category", event.target.value)}
              disabled={loading || categoriesLoading}
              className={fieldClass}
            >
              <option value="">
                {categoriesLoading
                  ? "Loading categories…"
                  : categories.length
                    ? "Select a category"
                    : "No active categories available"}
              </option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Canonical slug"
            htmlFor="cs-slug"
            hint="Leave empty to generate it from the title."
          >
            <input
              id="cs-slug"
              value={form.slug}
              onChange={(event) => set("slug", event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
        <Field
          label="Short description"
          htmlFor="cs-description"
          hint="The one-sentence summary shown on cards (300 characters)."
        >
          <textarea
            id="cs-description"
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={300}
            className={cn(fieldClass, "min-h-24")}
          />
        </Field>
        <Field label="Overview" htmlFor="cs-overview" hint="An opening paragraph for the detail page.">
          <textarea
            id="cs-overview"
            value={form.overview}
            onChange={(event) => set("overview", event.target.value)}
            maxLength={5000}
            className={cn(fieldClass, "min-h-32")}
          />
        </Field>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Thumbnail">
            <FileUploader
              purpose="case_study"
              label="Upload thumbnail"
              value={form.thumbnail}
              onChange={(file) => set("thumbnail", file)}
              disabled={loading}
            />
          </Field>
          <Field label="Gallery images">
            <FileGalleryUploader
              purpose="case_study"
              value={form.images}
              onChange={(files: TFilePopulated[]) => set("images", files)}
              disabled={loading}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Client and engagement"
        description="Who it was for and how you worked together."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Field label="Client or product name" htmlFor="cs-client">
            <input
              id="cs-client"
              value={form.client_name}
              onChange={(event) => set("client_name", event.target.value)}
              maxLength={120}
              className={fieldClass}
            />
          </Field>
          <Field label="Industry" htmlFor="cs-industry">
            <input
              id="cs-industry"
              value={form.client_industry}
              onChange={(event) => set("client_industry", event.target.value)}
              maxLength={120}
              className={fieldClass}
            />
          </Field>
          <Field label="Location" htmlFor="cs-location">
            <input
              id="cs-location"
              value={form.client_location}
              onChange={(event) => set("client_location", event.target.value)}
              maxLength={120}
              className={fieldClass}
            />
          </Field>
        </div>
        <Checkbox
          id="cs-show-client"
          label="Show the client name publicly"
          checked={form.show_client_name}
          onChange={(checked) => set("show_client_name", checked)}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Field label="Engagement type" htmlFor="cs-engagement">
            <select
              id="cs-engagement"
              value={form.engagement_type}
              onChange={(event) =>
                set("engagement_type", event.target.value as ProjectType | "")
              }
              className={fieldClass}
            >
              <option value="">Not set</option>
              {CASE_STUDY_ENGAGEMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CASE_STUDY_ENGAGEMENT_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Team size" htmlFor="cs-team">
            <input
              id="cs-team"
              type="number"
              min={1}
              max={1000}
              value={form.team_size}
              onChange={(event) => set("team_size", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Started" htmlFor="cs-started">
            <input
              id="cs-started"
              type="date"
              value={form.started_at}
              onChange={(event) => set("started_at", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Finished" htmlFor="cs-ended">
            <input
              id="cs-ended"
              type="date"
              value={form.ended_at}
              onChange={(event) => set("ended_at", event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="My role" htmlFor="cs-role">
            <input
              id="cs-role"
              value={form.role}
              onChange={(event) => set("role", event.target.value)}
              maxLength={500}
              className={fieldClass}
            />
          </Field>
          <Field
            label="Duration label"
            htmlFor="cs-duration"
            hint='For example "8 weeks" or "Ongoing".'
          >
            <input
              id="cs-duration"
              value={form.duration_label}
              onChange={(event) => set("duration_label", event.target.value)}
              maxLength={80}
              className={fieldClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Primary role" htmlFor="cs-pillar">
            <select
              id="cs-pillar"
              value={form.primary_pillar}
              onChange={(event) =>
                set("primary_pillar", event.target.value as PillarKey | "")
              }
              className={fieldClass}
            >
              <option value="">Not assigned</option>
              {PILLAR_CONTRACT.map((pillar) => (
                <option key={pillar.key} value={pillar.key}>
                  {pillar.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Secondary roles" htmlFor="cs-secondary">
            <select
              id="cs-secondary"
              multiple
              value={form.secondary_pillars}
              onChange={(event) =>
                set(
                  "secondary_pillars",
                  Array.from(
                    event.currentTarget.selectedOptions,
                    (option) => option.value as PillarKey
                  )
                )
              }
              className={cn(fieldClass, "min-h-24")}
            >
              {PILLAR_CONTRACT.map((pillar) => (
                <option key={pillar.key} value={pillar.key}>
                  {pillar.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="The story"
        description="Problem first, then how it was solved."
      >
        <Field label="The challenge" htmlFor="cs-challenge">
          <textarea
            id="cs-challenge"
            value={form.challenge}
            onChange={(event) => set("challenge", event.target.value)}
            maxLength={5000}
            className={cn(fieldClass, "min-h-32")}
          />
        </Field>
        <Field label="The approach" htmlFor="cs-approach">
          <textarea
            id="cs-approach"
            value={form.approach}
            onChange={(event) => set("approach", event.target.value)}
            maxLength={8000}
            className={cn(fieldClass, "min-h-32")}
          />
        </Field>
        <Field
          label="Key decisions"
          htmlFor="cs-decisions"
          hint="One decision per line."
        >
          <textarea
            id="cs-decisions"
            value={form.key_decisions}
            onChange={(event) => set("key_decisions", event.target.value)}
            className={cn(fieldClass, "min-h-24")}
          />
        </Field>
        <Field label="The solution" htmlFor="cs-solution">
          <textarea
            id="cs-solution"
            value={form.solution}
            onChange={(event) => set("solution", event.target.value)}
            maxLength={8000}
            className={cn(fieldClass, "min-h-32")}
          />
        </Field>
        <Field
          label="Learnings"
          htmlFor="cs-learnings"
          hint="One learning per line."
        >
          <textarea
            id="cs-learnings"
            value={form.learnings}
            onChange={(event) => set("learnings", event.target.value)}
            className={cn(fieldClass, "min-h-24")}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Results"
        description="Unverified results are never shown publicly."
      >
        <Field label="Results summary" htmlFor="cs-results">
          <textarea
            id="cs-results"
            value={form.results_summary}
            onChange={(event) => set("results_summary", event.target.value)}
            maxLength={3000}
            className={cn(fieldClass, "min-h-24")}
          />
        </Field>
        <div className="space-y-4">
          {form.outcomes.map((row, index) => (
            <div
              key={index}
              className="border-border grid gap-4 rounded-xl border p-4 md:grid-cols-[10rem_1fr_auto]"
            >
              <input
                aria-label={`Result ${index + 1} value`}
                placeholder="Value, e.g. 40%"
                value={row.value}
                maxLength={120}
                onChange={(event) =>
                  updateOutcome(index, { value: event.target.value })
                }
                className={fieldClass}
              />
              <input
                aria-label={`Result ${index + 1} label`}
                placeholder="Label, e.g. fewer manual hand-offs"
                value={row.label}
                maxLength={120}
                onChange={(event) =>
                  updateOutcome(index, { label: event.target.value })
                }
                className={fieldClass}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="icon"
                aria-label={`Remove result ${index + 1}`}
                onClick={() =>
                  set(
                    "outcomes",
                    form.outcomes.filter((_, rowIndex) => rowIndex !== index)
                  )
                }
                className="text-destructive"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
              <input
                aria-label={`Result ${index + 1} description`}
                placeholder="Description (optional)"
                value={row.description}
                maxLength={500}
                onChange={(event) =>
                  updateOutcome(index, { description: event.target.value })
                }
                className={cn(fieldClass, "md:col-span-3")}
              />
              <select
                aria-label={`Result ${index + 1} verification`}
                value={row.verification_state}
                onChange={(event) =>
                  updateOutcome(index, {
                    verification_state: event.target
                      .value as TOutcomeRow["verification_state"],
                  })
                }
                className={fieldClass}
              >
                {CASE_STUDY_OUTCOME_STATES.map((state) => (
                  <option key={state} value={state}>
                    {OUTCOME_STATE_LABELS[state]}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Result ${index + 1} evidence reference`}
                placeholder="Private evidence reference (required when verified)"
                value={row.evidence_reference}
                maxLength={500}
                onChange={(event) =>
                  updateOutcome(index, { evidence_reference: event.target.value })
                }
                className={cn(fieldClass, "md:col-span-2")}
              />
            </div>
          ))}
          {errors.outcomes ? (
            <p role="alert" className="text-destructive text-xs font-semibold">
              {errors.outcomes}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={form.outcomes.length >= 20}
            onClick={() => set("outcomes", [...form.outcomes, emptyOutcome()])}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add result
          </Button>
        </div>
      </FormSection>

      <FormSection title="Tools, links and search">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field
            label="Tools used"
            htmlFor="cs-tools"
            hint="Comma separated, e.g. Next.js, MongoDB, n8n."
          >
            <input
              id="cs-tools"
              value={form.tech_stack}
              onChange={(event) => set("tech_stack", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field
            label="What was delivered"
            htmlFor="cs-services"
            hint="Comma separated, e.g. System design, API, Automation."
          >
            <input
              id="cs-services"
              value={form.services}
              onChange={(event) => set("services", event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
        <Field
          label="Keywords (optional)"
          htmlFor="cs-keywords"
          hint="Comma separated; used for search and sharing."
        >
          <input
            id="cs-keywords"
            value={form.keywords}
            onChange={(event) => set("keywords", event.target.value)}
            className={fieldClass}
          />
        </Field>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Field label="Live product URL" htmlFor="cs-live">
              <input
                id="cs-live"
                type="url"
                inputMode="url"
                value={form.live_url}
                onChange={(event) => set("live_url", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Checkbox
              id="cs-live-public"
              label="Show the live link publicly"
              checked={form.live_url_visibility === "public"}
              onChange={(checked) =>
                set("live_url_visibility", checked ? "public" : "hidden")
              }
            />
          </div>
          <div className="space-y-3">
            <Field label="Public source URL" htmlFor="cs-source">
              <input
                id="cs-source"
                type="url"
                inputMode="url"
                value={form.source_url}
                onChange={(event) => set("source_url", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Checkbox
              id="cs-source-public"
              label="Show the source link publicly"
              checked={form.source_url_visibility === "public"}
              onChange={(checked) =>
                set("source_url_visibility", checked ? "public" : "hidden")
              }
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Long-form content (optional)"
        description="Extra detail below the story. Safe HTML is kept; scripts and unsafe markup are removed."
      >
        <textarea
          aria-label="Long-form content"
          value={form.content}
          onChange={(event) => set("content", event.target.value)}
          className={cn(fieldClass, "min-h-64 font-mono")}
        />
      </FormSection>

      <FormSection title="Publishing">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Publish at (optional)" htmlFor="cs-published">
            <input
              id="cs-published"
              type="datetime-local"
              value={form.published_at}
              onChange={(event) => set("published_at", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Expire at (optional)" htmlFor="cs-expired">
            <input
              id="cs-expired"
              type="datetime-local"
              value={form.expired_at}
              onChange={(event) => set("expired_at", event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
        <Checkbox
          id="cs-featured"
          label="Featured case study"
          checked={form.is_featured}
          onChange={(checked) => set("is_featured", checked)}
        />
      </FormSection>

      <div className="flex justify-end gap-4 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="gap-2" isLoading={loading}>
          <Save className="size-4" aria-hidden="true" />
          {initialData ? "Update Case Study" : "Create Case Study"}
        </Button>
      </div>
    </form>
  );
};

export default CaseStudyForm;
