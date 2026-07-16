"use client";

import { Button } from "@/components/ui/button";
import { FileGalleryUploader } from "@/components/ui/file-gallery-uploader";
import { FileUploader } from "@/components/ui/file-uploader";
import { getProjectCategories } from "@/services/category.service";
import type { TFilePopulated } from "@/types/file.type";
import type { TProjectCategory } from "@/types/project-category.type";
import type { TProject, TProjectInput } from "@/types/project.type";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";
import { Save } from "lucide-react";
import React, { useEffect, useState } from "react";

interface ProjectFormProps {
  initialData?: Partial<TProject>;
  onSubmit: (data: TProjectInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

type TProjectFormState = Omit<Partial<TProject>, "category"> & {
  category: string;
};

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading,
}) => {
  const [formData, setFormData] = useState<TProjectFormState>(() => ({
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
  }));
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            Project Name
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="border-border bg-background focus:border-primary w-full rounded-xl border p-3 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            Legacy workflow status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="border-border bg-background focus:border-primary w-full rounded-xl border p-3 focus:outline-none"
          >
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="project-category"
            className="text-muted-foreground text-sm font-bold tracking-widest uppercase"
          >
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
            className="border-border bg-background focus:border-primary w-full rounded-xl border p-3 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
            <p id="project-category-error" className="text-destructive text-sm">
              {categoryError}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            Canonical slug
          </label>
          <input
            name="slug"
            value={formData.slug ?? ""}
            onChange={handleChange}
            placeholder="Generated from the project name"
            className="border-border bg-background focus:border-primary w-full rounded-xl border p-3 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
            Delivery
            <select
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
              className="border-border bg-background mt-2 w-full rounded-xl border p-3"
            >
              <option value="">Use legacy status until migrated</option>
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
            Publication
            <select
              name="publication_status"
              value={formData.publication_status ?? ""}
              onChange={handleChange}
              className="border-border bg-background mt-2 w-full rounded-xl border p-3"
            >
              <option value="">Use legacy visibility until migrated</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
          Project type
          <select
            name="project_type"
            value={formData.project_type ?? ""}
            onChange={handleChange}
            className="border-border bg-background mt-2 w-full rounded-xl border p-3"
          >
            <option value="">Not classified</option>
            <option value="client">Client</option>
            <option value="internal">Internal</option>
            <option value="open_source">Open source</option>
            <option value="lab">Lab</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
          Primary pillar
          <select
            name="primary_pillar"
            value={formData.primary_pillar ?? ""}
            onChange={handleChange}
            className="border-border bg-background mt-2 w-full rounded-xl border p-3"
          >
            <option value="">Not assigned</option>
            {PILLAR_CONTRACT.map((pillar) => (
              <option key={pillar.key} value={pillar.key}>
                {pillar.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
          Secondary pillars
          <select
            multiple
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
            className="border-border bg-background mt-2 min-h-28 w-full rounded-xl border p-3"
          >
            {PILLAR_CONTRACT.map((pillar) => (
              <option key={pillar.key} value={pillar.key}>
                {pillar.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
          Short Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="border-border bg-background focus:border-primary min-h-[100px] w-full rounded-xl border p-3 focus:outline-none"
        />
      </div>

      <fieldset className="border-border space-y-5 rounded-2xl border p-5">
        <legend className="px-2 text-sm font-bold tracking-widest uppercase">
          Case-study evidence
        </legend>
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
            <label key={field} className="space-y-2 text-sm font-semibold">
              {label}
              <textarea
                name={field}
                value={formData[field] ?? ""}
                onChange={handleChange}
                className="border-border bg-background mt-1 min-h-28 w-full rounded-xl border p-3"
              />
            </label>
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
            <label key={field} className="space-y-2 text-sm font-semibold">
              {label} (one per line)
              <textarea
                value={formData[field]?.join("\n") ?? ""}
                onChange={(event) =>
                  handleListChange(field, event.target.value)
                }
                className="border-border bg-background mt-1 min-h-32 w-full rounded-xl border p-3"
              />
            </label>
          ))}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Outcome metrics</p>
            <button
              type="button"
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
              className="border-border rounded-lg border px-3 py-2 text-sm font-semibold"
            >
              Add outcome
            </button>
          </div>
          {(formData.outcomes ?? []).map((outcome, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-3 rounded-xl border p-3 md:grid-cols-[1fr_1fr_10rem_1fr_auto]"
            >
              <input
                aria-label={`Outcome ${index + 1} label`}
                value={outcome.label}
                onChange={(event) =>
                  updateOutcome(index, { label: event.target.value })
                }
                placeholder="Metric label"
                className="border-border bg-background rounded-lg border p-2"
              />
              <input
                aria-label={`Outcome ${index + 1} value`}
                value={outcome.value}
                onChange={(event) =>
                  updateOutcome(index, { value: event.target.value })
                }
                placeholder="Value"
                className="border-border bg-background rounded-lg border p-2"
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
                className="border-border bg-background rounded-lg border p-2"
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
                className="border-border bg-background rounded-lg border p-2"
              />
              <button
                type="button"
                aria-label={`Remove outcome ${index + 1}`}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    outcomes: (prev.outcomes ?? []).filter(
                      (_, outcomeIndex) => outcomeIndex !== index
                    ),
                  }))
                }
                className="text-destructive px-2 text-sm font-semibold"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(
          [
            ["live_url", "live_url_visibility", "Live URL"],
            ["source_url", "source_url_visibility", "Source URL"],
          ] as const
        ).map(([urlField, visibilityField, label]) => (
          <div key={urlField} className="grid grid-cols-[1fr_9rem] gap-3">
            <label className="space-y-2 text-sm font-semibold">
              {label} (HTTPS)
              <input
                name={urlField}
                type="url"
                value={formData[urlField] ?? ""}
                onChange={handleChange}
                className="border-border bg-background mt-1 w-full rounded-xl border p-3"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold">
              Visibility
              <select
                name={visibilityField}
                value={formData[visibilityField] ?? "hidden"}
                onChange={handleChange}
                className="border-border bg-background mt-1 w-full rounded-xl border p-3"
              >
                <option value="hidden">Hidden</option>
                <option value="private">Admin only</option>
                <option value="public">Public</option>
              </select>
            </label>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
          Content
        </label>
        <textarea
          name="content"
          value={formData.content}
          onChange={handleChange}
          required
          className="border-border bg-background focus:border-primary min-h-[300px] w-full rounded-xl border p-3 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            Thumbnail
          </label>
          <FileUploader
            purpose="project"
            value={formData.thumbnail}
            onChange={(file: TFilePopulated | null) =>
              setFormData((prev) => ({ ...prev, thumbnail: file }))
            }
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            Images
          </label>
          <FileGalleryUploader
            purpose="project"
            value={formData.images ?? []}
            onChange={(files: TFilePopulated[]) =>
              setFormData((prev) => ({ ...prev, images: files }))
            }
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            Tags (comma separated)
          </label>
          <input
            value={formData.tags?.join(", ")}
            onChange={handleTagsChange}
            placeholder="nextjs, tailwind, nodejs"
            className="border-border bg-background focus:border-primary w-full rounded-xl border p-3 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3 pt-8">
          <input
            type="checkbox"
            id="is_featured"
            checked={formData.is_featured}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                is_featured: e.target.checked,
              }))
            }
            className="border-border text-primary focus:ring-primary size-5 rounded"
          />
          <label
            htmlFor="is_featured"
            className="text-muted-foreground text-sm font-bold tracking-widest uppercase"
          >
            Featured Project
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" className="gap-2" isLoading={loading}>
          <Save className="size-4" />
          {initialData ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
};

export default ProjectForm;
