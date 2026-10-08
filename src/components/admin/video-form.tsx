"use client";

import {
  Checkbox,
  Field,
  FormSection,
  commaToList,
  fieldClass,
  toIsoDateTime,
  toLocalDateTime,
} from "@/components/admin/content-form-fields";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  DEFAULT_VIDEO_UPLOAD_MAX_BYTES,
  VIDEO_ASPECT_RATIOS,
  VIDEO_ASPECT_RATIO_LABELS,
  VIDEO_SOURCE_TYPES,
  VIDEO_SOURCE_TYPE_LABELS,
  parseYouTubeVideoId,
  toYouTubeThumbnailUrl,
  type VideoAspectRatio,
  type VideoSourceType,
} from "@/lib/content/video-contract";
import { cn } from "@/lib/utils";
import { getVideoCategories } from "@/services/category.service";
import type { TFilePopulated } from "@/types/file.type";
import type { TVideoCategory } from "@/types/video-category.type";
import type { TVideo, TVideoInput, TVideoStatus } from "@/types/video.type";
import { Save } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Props = Readonly<{
  initialData?: Partial<TVideo>;
  onSubmit: (data: TVideoInput) => void;
  onCancel: () => void;
  loading?: boolean;
}>;

type TFormState = {
  name: string;
  slug: string;
  description: string;
  keywords: string;
  category: string;
  aspect_ratio: VideoAspectRatio;
  source_type: VideoSourceType;
  youtube_url: string;
  video_file: TFilePopulated | null;
  thumbnail: TFilePopulated | null;
  duration_seconds: string;
  status: TVideoStatus;
  is_featured: boolean;
  published_at: string;
  expired_at: string;
};

/** The browser limit mirrors the server default so the message is immediate. */
const VIDEO_UPLOAD_LIMIT_BYTES =
  Number(process.env.NEXT_PUBLIC_MEDIA_VIDEO_MAX_UPLOAD_BYTES) ||
  DEFAULT_VIDEO_UPLOAD_MAX_BYTES;

const formatMegabytes = (bytes: number) =>
  `${(bytes / 1_048_576).toFixed(bytes % 1_048_576 === 0 ? 0 : 1)} MB`;

const VideoForm = ({ initialData, onSubmit, onCancel, loading }: Props) => {
  const [form, setForm] = useState<TFormState>(() => ({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    description: initialData?.description ?? "",
    keywords: (initialData?.keywords ?? []).join(", "),
    category: initialData?.category?._id ?? "",
    aspect_ratio: initialData?.aspect_ratio ?? "landscape",
    source_type: initialData?.source_type ?? "youtube",
    youtube_url: initialData?.youtube_url ?? "",
    video_file: initialData?.video_file ?? null,
    thumbnail: initialData?.thumbnail ?? null,
    duration_seconds: initialData?.duration_seconds
      ? String(initialData.duration_seconds)
      : "",
    status: initialData?.status ?? "draft",
    is_featured: initialData?.is_featured ?? false,
    published_at: toLocalDateTime(initialData?.published_at),
    expired_at: toLocalDateTime(initialData?.expired_at),
  }));
  const [categories, setCategories] = useState<TVideoCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await getVideoCategories(
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

  const youtubeId = useMemo(
    () => (form.youtube_url.trim() ? parseYouTubeVideoId(form.youtube_url) : null),
    [form.youtube_url]
  );

  const handleVideoFile = (file: TFilePopulated | null) => {
    setForm((current) => {
      const width = Number(file?.metadata?.width);
      const height = Number(file?.metadata?.height);
      const duration = Number(file?.metadata?.duration);
      return {
        ...current,
        video_file: file,
        // The file's own shape and length are the best defaults; both stay editable.
        aspect_ratio:
          width > 0 && height > 0
            ? height > width
              ? "reel"
              : "landscape"
            : current.aspect_ratio,
        duration_seconds:
          duration > 0 ? String(Math.round(duration)) : current.duration_seconds,
      };
    });
    setErrors((current) => ({ ...current, video_file: undefined }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next: Partial<Record<string, string>> = {};
    if (!form.name.trim()) next.name = "Enter a title.";
    if (!form.category) next.category = "Select an active video category.";
    if (form.source_type === "youtube" && !youtubeId) {
      next.youtube_url = "Enter a valid YouTube video link.";
    }
    if (form.source_type === "upload" && !form.video_file) {
      next.video_file = "Upload a video file.";
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    const duration = Number(form.duration_seconds);
    const payload: TVideoInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim(),
      keywords: commaToList(form.keywords),
      category: form.category,
      thumbnail: form.thumbnail?._id ?? null,
      aspect_ratio: form.aspect_ratio,
      source_type: form.source_type,
      youtube_url: form.source_type === "youtube" ? form.youtube_url.trim() : null,
      video_file: form.source_type === "upload" ? form.video_file!._id : null,
      duration_seconds:
        Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
      status: form.status,
      is_featured: form.is_featured,
      published_at: toIsoDateTime(form.published_at),
      expired_at: toIsoDateTime(form.expired_at) ?? null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <FormSection title="Basics">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Field
            label="Title"
            htmlFor="video-name"
            error={errors.name}
            className="md:col-span-2"
          >
            <input
              id="video-name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              maxLength={160}
              required
              className={fieldClass}
            />
          </Field>
          <Field label="Status" htmlFor="video-status">
            <select
              id="video-status"
              value={form.status}
              onChange={(event) => set("status", event.target.value as TVideoStatus)}
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
          <Field label="Category" htmlFor="video-category" error={errors.category}>
            <select
              id="video-category"
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
            htmlFor="video-slug"
            hint="Leave empty to generate it from the title."
          >
            <input
              id="video-slug"
              value={form.slug}
              onChange={(event) => set("slug", event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
        <Field
          label="Description (optional)"
          htmlFor="video-description"
          hint="Shown under the player and used for search engines."
        >
          <textarea
            id="video-description"
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={2000}
            className={cn(fieldClass, "min-h-28")}
          />
        </Field>
        <Field
          label="Keywords (optional)"
          htmlFor="video-keywords"
          hint="Comma separated, e.g. architecture, nextjs, automation."
        >
          <input
            id="video-keywords"
            value={form.keywords}
            onChange={(event) => set("keywords", event.target.value)}
            className={fieldClass}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Video"
        description="Choose the shape, then where the video comes from."
      >
        <fieldset className="space-y-2">
          <legend className="text-muted-foreground mb-2 text-xs font-bold tracking-widest uppercase">
            Aspect ratio
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {VIDEO_ASPECT_RATIOS.map((ratio) => (
              <label
                key={ratio}
                className={cn(
                  "border-border flex cursor-pointer items-center gap-4 rounded-xl border p-4",
                  form.aspect_ratio === ratio && "border-primary bg-primary/5"
                )}
              >
                <input
                  type="radio"
                  name="aspect_ratio"
                  value={ratio}
                  checked={form.aspect_ratio === ratio}
                  onChange={() => set("aspect_ratio", ratio)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "border-foreground/40 bg-muted block border-2",
                    ratio === "landscape"
                      ? "h-8 w-14 rounded-md"
                      : "h-14 w-8 rounded-md"
                  )}
                />
                <span className="text-sm font-bold">
                  {VIDEO_ASPECT_RATIO_LABELS[ratio]}
                  <span className="text-muted-foreground block text-xs font-normal">
                    {ratio === "landscape"
                      ? "Shown in the videos section"
                      : "Shown in the reels section"}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-muted-foreground mb-2 text-xs font-bold tracking-widest uppercase">
            Source
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {VIDEO_SOURCE_TYPES.map((source) => (
              <label
                key={source}
                className={cn(
                  "border-border flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-bold",
                  form.source_type === source && "border-primary bg-primary/5"
                )}
              >
                <input
                  type="radio"
                  name="source_type"
                  value={source}
                  checked={form.source_type === source}
                  onChange={() => set("source_type", source)}
                  className="accent-[var(--primary)]"
                />
                {VIDEO_SOURCE_TYPE_LABELS[source]}
              </label>
            ))}
          </div>
        </fieldset>

        {form.source_type === "youtube" ? (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_14rem]">
            <Field
              label="YouTube link"
              htmlFor="video-youtube"
              error={errors.youtube_url}
              hint="Any watch, youtu.be, Shorts, embed or live link works."
            >
              <input
                id="video-youtube"
                type="url"
                inputMode="url"
                placeholder="https://www.youtube.com/watch?v=…"
                value={form.youtube_url}
                onChange={(event) => set("youtube_url", event.target.value)}
                className={fieldClass}
              />
              {form.youtube_url.trim() ? (
                <p
                  className={cn(
                    "text-xs font-semibold",
                    youtubeId ? "text-success" : "text-destructive"
                  )}
                  role="status"
                >
                  {youtubeId
                    ? `Detected YouTube video ${youtubeId}`
                    : "This is not a valid YouTube video link."}
                </p>
              ) : null}
            </Field>
            {youtubeId ? (
              <div
                className={cn(
                  "border-border bg-muted relative overflow-hidden rounded-xl border",
                  form.aspect_ratio === "reel"
                    ? "mx-auto aspect-[9/16] w-32"
                    : "aspect-video"
                )}
              >
                <Image
                  src={toYouTubeThumbnailUrl(youtubeId)}
                  alt=""
                  fill
                  sizes="224px"
                  className="object-cover"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <Field
            label="Video file"
            error={errors.video_file}
            hint={`MP4 or WebM, up to ${formatMegabytes(VIDEO_UPLOAD_LIMIT_BYTES)}. Use a YouTube link for longer videos. The file is recorded as owned; change the license in the media library if it is not.`}
          >
            <FileUploader
              purpose="video_file"
              accept="video/mp4,video/webm,.mp4,.webm"
              maxSize={VIDEO_UPLOAD_LIMIT_BYTES}
              label="Upload video"
              value={form.video_file}
              onChange={handleVideoFile}
              metadata={{
                source: "uploaded",
                attribution: { license: "owned" },
              }}
              disabled={loading}
            />
          </Field>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field
            label="Thumbnail (optional)"
            hint={
              form.source_type === "youtube"
                ? "YouTube's own poster is used when this is empty."
                : "Shown before the video starts."
            }
          >
            <FileUploader
              purpose="video"
              label="Upload thumbnail"
              value={form.thumbnail}
              onChange={(file) => set("thumbnail", file)}
              disabled={loading}
            />
          </Field>
          <Field
            label="Duration in seconds (optional)"
            htmlFor="video-duration"
            hint="Filled in automatically for uploaded MP4 files."
          >
            <input
              id="video-duration"
              type="number"
              min={1}
              max={86400}
              value={form.duration_seconds}
              onChange={(event) => set("duration_seconds", event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Publishing">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Publish at (optional)" htmlFor="video-published">
            <input
              id="video-published"
              type="datetime-local"
              value={form.published_at}
              onChange={(event) => set("published_at", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Expire at (optional)" htmlFor="video-expired">
            <input
              id="video-expired"
              type="datetime-local"
              value={form.expired_at}
              onChange={(event) => set("expired_at", event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
        <Checkbox
          id="video-featured"
          label="Featured video"
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
          {initialData ? "Update Video" : "Create Video"}
        </Button>
      </div>
    </form>
  );
};

export default VideoForm;
