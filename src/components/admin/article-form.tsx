"use client";

import { Button } from "@/components/ui/button";
import { FileGalleryUploader } from "@/components/ui/file-gallery-uploader";
import { FileUploader } from "@/components/ui/file-uploader";
import type { TArticle } from "@/types/article.type";
import type { TFilePopulated } from "@/types/file.type";
import { Save } from "lucide-react";
import React, { useState } from "react";

interface ArticleFormProps {
  initialData?: Partial<TArticle>;
  onSubmit: (data: Partial<TArticle>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ArticleForm: React.FC<ArticleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading,
}) => {
  const [formData, setFormData] = useState<Partial<TArticle>>(
    initialData || {
      name: "",
      description: "",
      content: "",
      status: "draft",
      is_featured: false,
    },
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Record<string, unknown> = {
      ...formData,
      thumbnail: formData.thumbnail?._id ?? null,
      images: formData.images?.map((img) => img._id) ?? [],
    };

    onSubmit(payload as Partial<TArticle>);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Title
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-border bg-background p-3 focus:border-primary focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full rounded-xl border border-border bg-background p-3 focus:border-primary focus:outline-none"
          >
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="w-full rounded-xl border border-border bg-background p-3 min-h-[100px] focus:border-primary focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Content
        </label>
        <textarea
          name="content"
          value={formData.content}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-border bg-background p-3 min-h-[400px] focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Thumbnail
          </label>
          <FileUploader
            value={formData.thumbnail}
            onChange={(file: TFilePopulated | null) =>
              setFormData((prev) => ({ ...prev, thumbnail: file }))
            }
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Images
          </label>
          <FileGalleryUploader
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
          className="size-5 rounded border-border text-primary focus:ring-primary"
        />
        <label
          htmlFor="is_featured"
          className="text-sm font-bold uppercase tracking-widest text-muted-foreground"
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
