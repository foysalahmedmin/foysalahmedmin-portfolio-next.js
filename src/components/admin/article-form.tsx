"use client";

import { Button } from "@/components/ui/button";
import { FileGalleryUploader } from "@/components/ui/file-gallery-uploader";
import { FileUploader } from "@/components/ui/file-uploader";
import { getArticleCategories } from "@/services/category.service";
import type { TArticleCategory } from "@/types/article-category.type";
import type { TArticle, TArticleInput } from "@/types/article.type";
import type { TFilePopulated } from "@/types/file.type";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";
import { Save } from "lucide-react";
import React, { useEffect, useState } from "react";

interface ArticleFormProps {
  initialData?: Partial<TArticle>;
  onSubmit: (data: TArticleInput) => void;
  onCancel: () => void;
  loading?: boolean;
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

const ArticleForm: React.FC<ArticleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading,
}) => {
  const [formData, setFormData] = useState<TArticleFormState>(() => ({
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
  }));
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            Title
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
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="border-border bg-background focus:border-primary w-full rounded-xl border p-3 focus:outline-none"
          >
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="article-category"
            className="text-muted-foreground text-sm font-bold tracking-widest uppercase"
          >
            Category
          </label>
          <select
            id="article-category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            disabled={loading || categoriesLoading}
            aria-describedby={
              categoryError ? "article-category-error" : undefined
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
            <p id="article-category-error" className="text-destructive text-sm">
              {categoryError}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
          Canonical slug
          <input
            name="slug"
            value={formData.slug ?? ""}
            onChange={handleChange}
            placeholder="Generated from the article title"
            className="border-border bg-background mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
          Excerpt
          <textarea
            name="excerpt"
            value={formData.excerpt ?? ""}
            onChange={handleChange}
            maxLength={500}
            className="border-border bg-background mt-2 min-h-24 w-full rounded-xl border p-3"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
          Publish at (optional)
          <input
            type="datetime-local"
            name="published_at"
            value={formData.published_at ?? ""}
            onChange={handleChange}
            className="border-border bg-background mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
          Expire at (optional)
          <input
            type="datetime-local"
            name="expired_at"
            value={formData.expired_at ?? ""}
            onChange={handleChange}
            className="border-border bg-background mt-2 w-full rounded-xl border p-3"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
                ) as NonNullable<TArticle["secondary_pillars"]>,
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
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
            Reading time
            <select
              name="reading_time_source"
              value={formData.reading_time_source ?? "derived"}
              onChange={handleChange}
              className="border-border bg-background mt-2 w-full rounded-xl border p-3"
            >
              <option value="derived">Derived</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
            Minutes
            <input
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
              className="border-border bg-background mt-2 w-full rounded-xl border p-3"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
          Topics (comma separated)
          <input
            value={formData.topics?.join(", ") ?? ""}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                topics: event.target.value
                  .split(",")
                  .map((topic) => topic.trim())
                  .filter(Boolean),
              }))
            }
            className="border-border bg-background mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <label className="space-y-2 text-sm font-bold tracking-widest uppercase">
          Tags (comma separated)
          <input
            value={formData.tags?.join(", ") ?? ""}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                tags: event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              }))
            }
            className="border-border bg-background mt-2 w-full rounded-xl border p-3"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="border-border bg-background focus:border-primary min-h-[100px] w-full rounded-xl border p-3 focus:outline-none"
        />
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
          className="border-border bg-background focus:border-primary min-h-[400px] w-full rounded-xl border p-3 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            Thumbnail
          </label>
          <FileUploader
            purpose="article"
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
            purpose="article"
            value={formData.images ?? []}
            onChange={(files: TFilePopulated[]) =>
              setFormData((prev) => ({ ...prev, images: files }))
            }
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_featured"
          checked={formData.is_featured}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))
          }
          className="border-border text-primary focus:ring-primary size-5 rounded"
        />
        <label
          htmlFor="is_featured"
          className="text-muted-foreground text-sm font-bold tracking-widest uppercase"
        >
          Featured Article
        </label>
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
          {initialData ? "Update Article" : "Create Article"}
        </Button>
      </div>
    </form>
  );
};

export default ArticleForm;
