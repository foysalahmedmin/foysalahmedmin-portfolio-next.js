"use client";

import {
  EditorActionBar,
  EditorHeader,
  EditorSection,
  SectionIndex,
  ValidationSummary,
  type ValidationIssue,
} from "@/components/console";
import { ConsoleEditor } from "@/components/templates/console-templates";
import { Button, buttonVariants } from "@/components/ui/button";
import { FileGalleryUploader } from "@/components/ui/file-gallery-uploader";
import { FileUploader } from "@/components/ui/file-uploader";
import { FormControl, formControlVariants } from "@/components/ui/form-control";
import type { StatusMarkState } from "@/components/ui/status-mark";
import { cn } from "@/lib/utils";
import { getArticleCategories } from "@/services/category.service";
import type { TArticleCategory } from "@/types/article-category.type";
import type { TArticle, TArticleInput } from "@/types/article.type";
import type { TFilePopulated } from "@/types/file.type";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

interface ArticleFormProps {
  initialData?: Partial<TArticle>;
  onSubmit: (data: TArticleInput) => void;
  onCancel: () => void;
  loading?: boolean;
  /** A failure from the last save, shown in the validation summary. */
  error?: string | null;
}

type TArticleFormState = Omit<Partial<TArticle>, "category"> & {
  category: string;
};

const toLocalDateTime = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toIsoDateTime = (value?: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const toFormState = (initialData?: Partial<TArticle>): TArticleFormState => ({
  ...initialData,
  category: initialData?.category?._id ?? "",
  name: initialData?.name ?? "",
  slug: initialData?.slug ?? "",
  description: initialData?.description ?? "",
  excerpt: initialData?.excerpt ?? "",
  content: initialData?.content ?? "",
  status: initialData?.status ?? "draft",
  is_featured: initialData?.is_featured ?? false,
  is_premium: initialData?.is_premium ?? false,
  tags: initialData?.tags ?? [],
  topics: initialData?.topics ?? [],
  primary_pillar: initialData?.primary_pillar,
  secondary_pillars: initialData?.secondary_pillars ?? [],
  reading_time_source: initialData?.reading_time_source ?? "derived",
  published_at: toLocalDateTime(initialData?.published_at),
  expired_at: toLocalDateTime(initialData?.expired_at),
});

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

type TFieldKey = keyof TArticleFormState;

/** The sections of the editor: the index links, and the fields whose edits mark each one. */
const SECTIONS: readonly {
  id: string;
  label: string;
  fields: readonly TFieldKey[];
}[] = [
  {
    id: "article-basics",
    label: "Basics",
    fields: ["name", "slug", "excerpt", "description"],
  },
  { id: "article-content", label: "Content", fields: ["content"] },
  {
    id: "article-classification",
    label: "Classification",
    fields: [
      "category",
      "primary_pillar",
      "secondary_pillars",
      "topics",
      "tags",
    ],
  },
  { id: "article-media", label: "Media", fields: ["thumbnail", "images"] },
  {
    id: "article-publishing",
    label: "Publishing",
    fields: [
      "status",
      "published_at",
      "expired_at",
      "reading_time_source",
      "reading_time_minutes",
      "is_featured",
    ],
  },
];

const STATUS_MARKS: Record<
  TArticle["status"],
  { state: StatusMarkState; label: string }
> = {
  draft: { state: "draft", label: "Draft" },
  pending: { state: "pending", label: "Pending" },
  published: { state: "published", label: "Published" },
  archived: { state: "archived", label: "Archived" },
};

/** A comparable form of a field: files by id, and "nothing" always the same empty string. */
const comparable = (state: TArticleFormState, key: TFieldKey) => {
  if (key === "thumbnail") return state.thumbnail?._id ?? "";
  if (key === "images") return state.images?.map((image) => image._id) ?? [];
  return state[key] ?? "";
};

const ArticleForm: React.FC<ArticleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading,
  error,
}) => {
  const [initialState] = useState(() => toFormState(initialData));
  const [formData, setFormData] = useState<TArticleFormState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [categories, setCategories] = useState<TArticleCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadCategories = async () => {
      setCategoriesLoading(true);
      setCategoryError(null);

      try {
        const response = await getArticleCategories(
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category) {
      setCategoryError("Select an active article category");
      return;
    }

    const payload: TArticleInput = {
      name: formData.name?.trim(),
      slug: formData.slug?.trim() || undefined,
      description: formData.description?.trim(),
      excerpt: formData.excerpt?.trim(),
      content: formData.content,
      category: formData.category,
      thumbnail: formData.thumbnail?._id ?? null,
      images: formData.images?.map((img) => img._id) ?? [],
      tags: formData.tags ?? [],
      topics: formData.topics ?? [],
      primary_pillar: formData.primary_pillar,
      secondary_pillars: formData.secondary_pillars ?? [],
      reading_time_source: formData.reading_time_source,
      reading_time_minutes:
        formData.reading_time_source === "manual"
          ? formData.reading_time_minutes
          : undefined,
      status: formData.status,
      is_featured: formData.is_featured ?? false,
      is_premium: formData.is_premium ?? false,
      published_at: toIsoDateTime(formData.published_at),
      expired_at: toIsoDateTime(formData.expired_at ?? undefined) ?? null,
      layout: formData.layout,
    };

    onSubmit(payload);
  };

  const changedKeys = SECTIONS.flatMap(({ fields }) => fields).filter(
    (key) =>
      JSON.stringify(comparable(formData, key)) !==
      JSON.stringify(comparable(initialState, key))
  );

  const issues: ValidationIssue[] = [
    ...(categoryError
      ? [
          {
            href: "#article-category",
            field: "Category",
            message: categoryError,
          },
        ]
      : []),
    ...(error ? [{ message: error }] : []),
  ];

  // Cmd/Ctrl+S saves exactly like the Save button, including native validation
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!loading) formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading]);

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <ConsoleEditor
        header={
          <EditorHeader
            title={
              initialData
                ? initialData.name || "Untitled article"
                : "New article"
            }
            back={
              <Link
                href="/admin/articles"
                aria-label="Back to articles"
                className={buttonVariants({
                  variant: "outline",
                  shape: "icon",
                })}
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Link>
            }
            status={
              initialData
                ? STATUS_MARKS[initialData.status ?? "draft"]
                : undefined
            }
            savedAt={initialData?.updated_at}
          />
        }
        validation={<ValidationSummary issues={issues} />}
        sectionIndex={
          <SectionIndex
            sections={SECTIONS.map(({ id, label, fields }) => ({
              id,
              label,
              dirty: fields.some((field) => changedKeys.includes(field)),
              error: id === "article-classification" && Boolean(categoryError),
            }))}
          />
        }
        actionBar={
          <EditorActionBar
            unsavedCount={changedKeys.length}
            discard={
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            }
            saveDraft={
              <Button type="submit" className="gap-2" isLoading={loading}>
                <Save aria-hidden="true" className="size-4" />
                {initialData ? "Update Article" : "Create Article"}
              </Button>
            }
          />
        }
      >
        <EditorSection id="article-basics" title="Basics">
          <div className="cp-fields">
            <div className="cp-field">
              <label htmlFor="article-name" className="cp-label">
                Title
              </label>
              <FormControl
                id="article-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="cp-field">
              <label htmlFor="article-slug" className="cp-label">
                Canonical slug
              </label>
              <FormControl
                id="article-slug"
                name="slug"
                value={formData.slug ?? ""}
                onChange={handleChange}
                placeholder="Generated from the article title"
              />
            </div>
          </div>
          <div className="cp-field">
            <label htmlFor="article-excerpt" className="cp-label">
              Excerpt
            </label>
            <FormControl
              as="textarea"
              id="article-excerpt"
              name="excerpt"
              value={formData.excerpt ?? ""}
              onChange={handleChange}
              maxLength={500}
              className="min-h-24 py-2"
            />
          </div>
          <div className="cp-field">
            <label htmlFor="article-description" className="cp-label">
              Description
            </label>
            <FormControl
              as="textarea"
              id="article-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="min-h-24 py-2"
            />
          </div>
        </EditorSection>

        <EditorSection id="article-content" title="Content">
          <div className="cp-field">
            <label htmlFor="article-content-body" className="cp-label">
              Content
            </label>
            <FormControl
              as="textarea"
              id="article-content-body"
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              className="min-h-96 py-2"
            />
          </div>
        </EditorSection>

        <EditorSection id="article-classification" title="Classification">
          <div className="cp-fields">
            <div className="cp-field">
              <label htmlFor="article-category" className="cp-label">
                Category
              </label>
              <FormControl
                as="select"
                id="article-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                disabled={loading || categoriesLoading}
                aria-describedby={
                  categoryError ? "article-category-error" : undefined
                }
                aria-invalid={categoryError ? true : undefined}
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
              </FormControl>
              {categoryError && (
                <p
                  id="article-category-error"
                  className="text-destructive text-sm"
                >
                  {categoryError}
                </p>
              )}
            </div>
            <div className="cp-field">
              <label htmlFor="article-primary-pillar" className="cp-label">
                Primary pillar
              </label>
              <FormControl
                as="select"
                id="article-primary-pillar"
                name="primary_pillar"
                value={formData.primary_pillar ?? ""}
                onChange={handleChange}
              >
                <option value="">Not assigned</option>
                {PILLAR_CONTRACT.map((pillar) => (
                  <option key={pillar.key} value={pillar.key}>
                    {pillar.label}
                  </option>
                ))}
              </FormControl>
            </div>
            <div className="cp-field">
              <label htmlFor="article-secondary-pillars" className="cp-label">
                Secondary pillars
              </label>
              <select
                multiple
                id="article-secondary-pillars"
                value={formData.secondary_pillars ?? []}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    secondary_pillars: Array.from(
                      event.currentTarget.selectedOptions,
                      (option) => option.value
                    ) as NonNullable<TArticle["secondary_pillars"]>,
                  }))
                }
                className={cn(
                  formControlVariants({ size: "none" }),
                  "min-h-28 px-3 py-2 text-sm"
                )}
              >
                {PILLAR_CONTRACT.map((pillar) => (
                  <option key={pillar.key} value={pillar.key}>
                    {pillar.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="cp-fields">
            <div className="cp-field">
              <label htmlFor="article-topics" className="cp-label">
                Topics (comma separated)
              </label>
              <FormControl
                id="article-topics"
                value={formData.topics?.join(", ") ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    topics: splitList(event.target.value),
                  }))
                }
              />
            </div>
            <div className="cp-field">
              <label htmlFor="article-tags" className="cp-label">
                Tags (comma separated)
              </label>
              <FormControl
                id="article-tags"
                value={formData.tags?.join(", ") ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    tags: splitList(event.target.value),
                  }))
                }
              />
            </div>
          </div>
        </EditorSection>

        <EditorSection id="article-media" title="Media">
          <div className="cp-fields">
            <div
              className="cp-field"
              role="group"
              aria-labelledby="article-thumbnail-label"
            >
              <span id="article-thumbnail-label" className="cp-label">
                Thumbnail
              </span>
              <FileUploader
                purpose="article"
                value={formData.thumbnail}
                onChange={(file: TFilePopulated | null) =>
                  setFormData((prev) => ({ ...prev, thumbnail: file }))
                }
                disabled={loading}
              />
            </div>
            <div
              className="cp-field"
              role="group"
              aria-labelledby="article-images-label"
            >
              <span id="article-images-label" className="cp-label">
                Images
              </span>
              <FileGalleryUploader
                purpose="article"
                value={formData.images ?? []}
                onChange={(files: TFilePopulated[]) =>
                  setFormData((prev) => ({ ...prev, images: files }))
                }
                disabled={loading}
              />
            </div>
          </div>
        </EditorSection>

        <EditorSection id="article-publishing" title="Publishing">
          <div className="cp-fields">
            <div className="cp-field">
              <label htmlFor="article-status" className="cp-label">
                Status
              </label>
              <FormControl
                as="select"
                id="article-status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </FormControl>
            </div>
            <div className="cp-field">
              <label htmlFor="article-published-at" className="cp-label">
                Publish at (optional)
              </label>
              <FormControl
                id="article-published-at"
                type="datetime-local"
                name="published_at"
                value={formData.published_at ?? ""}
                onChange={handleChange}
              />
            </div>
            <div className="cp-field">
              <label htmlFor="article-expired-at" className="cp-label">
                Expire at (optional)
              </label>
              <FormControl
                id="article-expired-at"
                type="datetime-local"
                name="expired_at"
                value={formData.expired_at ?? ""}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="cp-fields">
            <div className="cp-field">
              <label htmlFor="article-reading-source" className="cp-label">
                Reading time
              </label>
              <FormControl
                as="select"
                id="article-reading-source"
                name="reading_time_source"
                value={formData.reading_time_source ?? "derived"}
                onChange={handleChange}
              >
                <option value="derived">Derived</option>
                <option value="manual">Manual</option>
              </FormControl>
            </div>
            <div className="cp-field">
              <label htmlFor="article-reading-minutes" className="cp-label">
                Minutes
              </label>
              <FormControl
                id="article-reading-minutes"
                type="number"
                min={1}
                max={600}
                disabled={formData.reading_time_source !== "manual"}
                value={formData.reading_time_minutes ?? ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    reading_time_minutes: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
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
            <label htmlFor="is_featured" className="cp-label">
              Featured Article
            </label>
          </div>
        </EditorSection>
      </ConsoleEditor>
    </form>
  );
};

export default ArticleForm;
