"use client";

import {
  Checkbox,
  ContentEditorFrame,
  Field,
  changedFields,
  fieldClass,
  type ContentSection,
  type ContentStatusMark,
} from "@/components/admin/content-form-fields";
import { EditorSection, type ValidationIssue } from "@/components/console";
import { Button } from "@/components/ui/button";
import { FileGalleryUploader } from "@/components/ui/file-gallery-uploader";
import { FileUploader } from "@/components/ui/file-uploader";
import { getProjectCategories } from "@/services/category.service";
import type { TFilePopulated } from "@/types/file.type";
import type { TProjectCategory } from "@/types/project-category.type";
import type { TProject, TProjectInput } from "@/types/project.type";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

interface ProjectFormProps {
  initialData?: Partial<TProject>;
  onSubmit: (data: TProjectInput) => void;
  onCancel: () => void;
  loading?: boolean;
  /** A failure from the last save, shown in the validation summary. */
  error?: string | null;
}

type TProjectFormState = Omit<Partial<TProject>, "category"> & {
  category: string;
};

const toFormState = (initialData?: Partial<TProject>): TProjectFormState => ({
  ...initialData,
  category: initialData?.category?._id ?? "",
  name: initialData?.name ?? "",
  slug: initialData?.slug ?? "",
  description: initialData?.description ?? "",
  content: initialData?.content ?? "",
  status: initialData?.status ?? "planned",
  delivery_status: initialData ? initialData.delivery_status : "planned",
  publication_status: initialData ? initialData.publication_status : "draft",
  project_type: initialData?.project_type,
  primary_pillar: initialData?.primary_pillar,
  secondary_pillars: initialData?.secondary_pillars ?? [],
  constraints: initialData?.constraints ?? [],
  decisions: initialData?.decisions ?? [],
  learnings: initialData?.learnings ?? [],
  outcomes: initialData?.outcomes ?? [],
  live_url_visibility: initialData?.live_url_visibility ?? "hidden",
  source_url_visibility: initialData?.source_url_visibility ?? "hidden",
  is_featured: initialData?.is_featured ?? false,
  is_premium: initialData?.is_premium ?? false,
  tags: initialData?.tags ?? [],
});

/** The sections of the editor: the index links, and the form fields whose edits mark each one. */
const SECTIONS: readonly ContentSection[] = [
  {
    id: "project-basics",
    label: "Basics",
    fields: ["name", "slug", "description"],
  },
  {
    id: "project-classification",
    label: "Classification",
    fields: [
      "category",
      "project_type",
      "primary_pillar",
      "secondary_pillars",
      "tags",
    ],
  },
  {
    id: "project-status",
    label: "Status and visibility",
    fields: ["status", "delivery_status", "publication_status", "is_featured"],
  },
  {
    id: "project-evidence",
    label: "Case-study evidence",
    fields: [
      "problem",
      "role",
      "architecture",
      "implementation",
      "security",
      "performance_reliability",
      "constraints",
      "decisions",
      "learnings",
      "outcomes",
    ],
  },
  {
    id: "project-links",
    label: "Links",
    fields: [
      "live_url",
      "live_url_visibility",
      "source_url",
      "source_url_visibility",
    ],
  },
  { id: "project-content", label: "Content", fields: ["content"] },
  { id: "project-media", label: "Media", fields: ["thumbnail", "images"] },
];

const PUBLICATION_MARKS: Record<
  NonNullable<TProject["publication_status"]>,
  ContentStatusMark
> = {
  draft: { state: "draft", label: "Draft" },
  published: { state: "published", label: "Published" },
  archived: { state: "archived", label: "Archived" },
};

/** Records that predate the split status fields show their legacy workflow status. */
const LEGACY_MARKS: Record<TProject["status"], ContentStatusMark> = {
  planned: { state: "draft", label: "Planned" },
  in_progress: { state: "pending", label: "In progress" },
  on_hold: { state: "warning", label: "On hold" },
  completed: { state: "success", label: "Completed" },
  cancelled: { state: "archived", label: "Cancelled" },
};

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading,
  error,
}) => {
  const [initialState] = useState(() => toFormState(initialData));
  const [formData, setFormData] = useState<TProjectFormState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [categories, setCategories] = useState<TProjectCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadCategories = async () => {
      setCategoriesLoading(true);
      setCategoryError(null);

      try {
        const response = await getProjectCategories(
          { limit: 50, sort: "sequence,name" },
          { signal: controller.signal }
        );

        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || "Failed to load categories");
        }

        setCategories(response.data);
        setFormData((current) =>
          response.data.some((category) => category._id === current.category)
            ? current
            : { ...current, category: "" }
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setCategoryError(
          error instanceof Error ? error.message : "Failed to load categories"
        );
      } finally {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      }
    };

    void loadCategories();
    return () => controller.abort();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "category") setCategoryError(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setFormData((prev) => ({ ...prev, tags }));
  };

  const handleListChange = (
    field: "constraints" | "decisions" | "learnings",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  };

  const updateOutcome = (
    index: number,
    patch: Partial<NonNullable<TProject["outcomes"]>[number]>
  ) => {
    setFormData((prev) => ({
      ...prev,
      outcomes: (prev.outcomes ?? []).map((outcome, outcomeIndex) =>
        outcomeIndex === index ? { ...outcome, ...patch } : outcome
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category) {
      setCategoryError("Select an active project category");
      return;
    }

    const payload: TProjectInput = {
      name: formData.name?.trim(),
      slug: formData.slug?.trim() || undefined,
      description: formData.description?.trim(),
      content: formData.content,
      category: formData.category,
      thumbnail: formData.thumbnail?._id ?? null,
      images: formData.images?.map((img) => img._id) ?? [],
      tags: formData.tags ?? [],
      status: formData.status,
      delivery_status: formData.delivery_status,
      publication_status: formData.publication_status,
      project_type: formData.project_type,
      primary_pillar: formData.primary_pillar,
      secondary_pillars: formData.secondary_pillars ?? [],
      problem: formData.problem?.trim(),
      constraints: formData.constraints ?? [],
      role: formData.role?.trim(),
      architecture: formData.architecture?.trim(),
      decisions: formData.decisions ?? [],
      implementation: formData.implementation?.trim(),
      security: formData.security?.trim(),
      performance_reliability: formData.performance_reliability?.trim(),
      outcomes: formData.outcomes ?? [],
      learnings: formData.learnings ?? [],
      live_url: formData.live_url?.trim() || null,
      live_url_visibility: formData.live_url_visibility,
      source_url: formData.source_url?.trim() || null,
      source_url_visibility: formData.source_url_visibility,
      is_featured: formData.is_featured ?? false,
      is_premium: formData.is_premium ?? false,
      started_at: formData.started_at,
      ended_at: formData.ended_at,
      layout: formData.layout,
    };

    onSubmit(payload);
  };

  const issues: ValidationIssue[] = [
    ...(categoryError
      ? [
          {
            href: "#project-category",
            field: "Category",
            message: categoryError,
          },
        ]
      : []),
    ...(error ? [{ message: error }] : []),
  ];

  return (
    <ContentEditorFrame
      formRef={formRef}
      onSubmit={handleSubmit}
      title={
        initialData ? initialData.name || "Untitled project" : "New project"
      }
      backHref="/admin/projects"
      backLabel="Back to projects"
      status={
        initialData
          ? initialData.publication_status
            ? PUBLICATION_MARKS[initialData.publication_status]
            : LEGACY_MARKS[initialData.status ?? "planned"]
          : undefined
      }
      savedAt={initialData?.updated_at}
      sections={SECTIONS}
      changed={changedFields(formData, initialState)}
      errored={categoryError ? ["category"] : []}
      issues={issues}
      loading={loading}
      onCancel={onCancel}
      submitLabel={initialData ? "Update Project" : "Create Project"}
    >
      <EditorSection id="project-basics" title="Basics">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Project Name" htmlFor="project-name">
            <input
              id="project-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={fieldClass}
            />
          </Field>
          <Field label="Canonical slug" htmlFor="project-slug">
            <input
              id="project-slug"
              name="slug"
              value={formData.slug ?? ""}
              onChange={handleChange}
              placeholder="Generated from the project name"
              className={fieldClass}
            />
          </Field>
        </div>
        <Field label="Short Description" htmlFor="project-description">
          <textarea
            id="project-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={cn(fieldClass, "min-h-24")}
          />
        </Field>
      </EditorSection>

      <EditorSection id="project-classification" title="Classification">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="cp-field">
            <label htmlFor="project-category" className="cp-label">
              Category
            </label>
            <select
              id="project-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              disabled={loading || categoriesLoading}
              aria-describedby={
                categoryError ? "project-category-error" : undefined
              }
              aria-invalid={categoryError ? true : undefined}
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
            {categoryError && (
              <p
                id="project-category-error"
                className="text-destructive text-sm"
              >
                {categoryError}
              </p>
            )}
          </div>
          <Field label="Project type" htmlFor="project-type">
            <select
              id="project-type"
              name="project_type"
              value={formData.project_type ?? ""}
              onChange={handleChange}
              className={fieldClass}
            >
              <option value="">Not classified</option>
              <option value="client">Client</option>
              <option value="internal">Internal</option>
              <option value="open_source">Open source</option>
              <option value="lab">Lab</option>
            </select>
          </Field>
          <Field label="Primary pillar" htmlFor="project-primary-pillar">
            <select
              id="project-primary-pillar"
              name="primary_pillar"
              value={formData.primary_pillar ?? ""}
              onChange={handleChange}
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
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Secondary pillars" htmlFor="project-secondary-pillars">
            <select
              multiple
              id="project-secondary-pillars"
              value={formData.secondary_pillars ?? []}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  secondary_pillars: Array.from(
                    event.currentTarget.selectedOptions,
                    (option) => option.value
                  ) as NonNullable<TProject["secondary_pillars"]>,
                }))
              }
              className={cn(fieldClass, "min-h-28")}
            >
              {PILLAR_CONTRACT.map((pillar) => (
                <option key={pillar.key} value={pillar.key}>
                  {pillar.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags (comma separated)" htmlFor="project-tags">
            <input
              id="project-tags"
              value={formData.tags?.join(", ")}
              onChange={handleTagsChange}
              placeholder="nextjs, tailwind, nodejs"
              className={fieldClass}
            />
          </Field>
        </div>
      </EditorSection>

      <EditorSection id="project-status" title="Status and visibility">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Field label="Legacy workflow status" htmlFor="project-status-legacy">
            <select
              id="project-status-legacy"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={fieldClass}
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <Field label="Delivery" htmlFor="project-delivery">
            <select
              id="project-delivery"
              name="delivery_status"
              value={formData.delivery_status ?? ""}
              onChange={(event) => {
                const delivery = event.target.value as
                  | NonNullable<TProject["delivery_status"]>
                  | "";
                setFormData((prev) => ({
                  ...prev,
                  delivery_status: delivery || undefined,
                  status: delivery
                    ? delivery === "active"
                      ? "in_progress"
                      : delivery === "completed"
                        ? "completed"
                        : "planned"
                    : prev.status,
                }));
              }}
              className={fieldClass}
            >
              <option value="">Use legacy status until migrated</option>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label="Publication" htmlFor="project-publication">
            <select
              id="project-publication"
              name="publication_status"
              value={formData.publication_status ?? ""}
              onChange={handleChange}
              className={fieldClass}
            >
              <option value="">Use legacy visibility until migrated</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        </div>
        <Checkbox
          id="is_featured"
          label="Featured Project"
          checked={Boolean(formData.is_featured)}
          onChange={(checked) =>
            setFormData((prev) => ({ ...prev, is_featured: checked }))
          }
        />
      </EditorSection>

      <EditorSection id="project-evidence" title="Case-study evidence">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(
            [
              ["problem", "Problem"],
              ["role", "Your role"],
              ["architecture", "Architecture"],
              ["implementation", "Implementation"],
              ["security", "Security"],
              ["performance_reliability", "Performance & reliability"],
            ] as const
          ).map(([field, label]) => (
            <Field key={field} label={label} htmlFor={`project-${field}`}>
              <textarea
                id={`project-${field}`}
                name={field}
                value={formData[field] ?? ""}
                onChange={handleChange}
                className={cn(fieldClass, "min-h-28")}
              />
            </Field>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(
            [
              ["constraints", "Constraints"],
              ["decisions", "Decisions"],
              ["learnings", "Learnings"],
            ] as const
          ).map(([field, label]) => (
            <Field
              key={field}
              label={`${label} (one per line)`}
              htmlFor={`project-${field}`}
            >
              <textarea
                id={`project-${field}`}
                value={formData[field]?.join("\n") ?? ""}
                onChange={(event) =>
                  handleListChange(field, event.target.value)
                }
                className={cn(fieldClass, "min-h-32")}
              />
            </Field>
          ))}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="cp-label">Outcome metrics</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  outcomes: [
                    ...(prev.outcomes ?? []),
                    {
                      label: "",
                      value: "",
                      verification_state: "unverified",
                    },
                  ],
                }))
              }
            >
              Add outcome
            </Button>
          </div>
          {(formData.outcomes ?? []).map((outcome, index) => (
            <div
              key={index}
              className="cwa-row grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_10rem_1fr_auto]"
            >
              <input
                aria-label={`Outcome ${index + 1} label`}
                value={outcome.label}
                onChange={(event) =>
                  updateOutcome(index, { label: event.target.value })
                }
                placeholder="Metric label"
                className={fieldClass}
              />
              <input
                aria-label={`Outcome ${index + 1} value`}
                value={outcome.value}
                onChange={(event) =>
                  updateOutcome(index, { value: event.target.value })
                }
                placeholder="Value"
                className={fieldClass}
              />
              <select
                aria-label={`Outcome ${index + 1} verification`}
                value={outcome.verification_state}
                onChange={(event) =>
                  updateOutcome(index, {
                    verification_state: event.target
                      .value as typeof outcome.verification_state,
                  })
                }
                className={fieldClass}
              >
                <option value="unverified">Unverified</option>
                <option value="derived">Derived</option>
                <option value="verified">Verified</option>
              </select>
              <input
                aria-label={`Outcome ${index + 1} evidence reference`}
                value={outcome.evidence_reference ?? ""}
                onChange={(event) =>
                  updateOutcome(index, {
                    evidence_reference: event.target.value || undefined,
                  })
                }
                placeholder="Private evidence reference"
                className={fieldClass}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove outcome ${index + 1}`}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    outcomes: (prev.outcomes ?? []).filter(
                      (_, outcomeIndex) => outcomeIndex !== index
                    ),
                  }))
                }
                className="text-destructive"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </EditorSection>

      <EditorSection id="project-links" title="Links">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(
            [
              ["live_url", "live_url_visibility", "Live URL"],
              ["source_url", "source_url_visibility", "Source URL"],
            ] as const
          ).map(([urlField, visibilityField, label]) => (
            <div key={urlField} className="grid grid-cols-[1fr_9rem] gap-3">
              <Field label={`${label} (HTTPS)`} htmlFor={`project-${urlField}`}>
                <input
                  id={`project-${urlField}`}
                  name={urlField}
                  type="url"
                  value={formData[urlField] ?? ""}
                  onChange={handleChange}
                  className={fieldClass}
                />
              </Field>
              <Field label="Visibility" htmlFor={`project-${visibilityField}`}>
                <select
                  id={`project-${visibilityField}`}
                  name={visibilityField}
                  value={formData[visibilityField] ?? "hidden"}
                  onChange={handleChange}
                  className={fieldClass}
                >
                  <option value="hidden">Hidden</option>
                  <option value="private">Admin only</option>
                  <option value="public">Public</option>
                </select>
              </Field>
            </div>
          ))}
        </div>
      </EditorSection>

      <EditorSection id="project-content" title="Content">
        <Field label="Content" htmlFor="project-content-body">
          <textarea
            id="project-content-body"
            name="content"
            value={formData.content}
            onChange={handleChange}
            required
            className={cn(fieldClass, "min-h-72")}
          />
        </Field>
      </EditorSection>

      <EditorSection id="project-media" title="Media">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Thumbnail">
            <FileUploader
              purpose="project"
              value={formData.thumbnail}
              onChange={(file: TFilePopulated | null) =>
                setFormData((prev) => ({ ...prev, thumbnail: file }))
              }
              disabled={loading}
            />
          </Field>
          <Field label="Images">
            <FileGalleryUploader
              purpose="project"
              value={formData.images ?? []}
              onChange={(files: TFilePopulated[]) =>
                setFormData((prev) => ({ ...prev, images: files }))
              }
              disabled={loading}
            />
          </Field>
        </div>
      </EditorSection>
    </ContentEditorFrame>
  );
};

export default ProjectForm;
