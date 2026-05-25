"use client";

import { Button } from "@/components/ui/button";
import { FileGalleryUploader } from "@/components/ui/file-gallery-uploader";
import { FileUploader } from "@/components/ui/file-uploader";
import type { TProject } from "@/types/project.type";
import type { TFilePopulated } from "@/types/file.type";
import { Save } from "lucide-react";
import React, { useState } from "react";

interface ProjectFormProps {
  initialData?: Partial<TProject>;
  onSubmit: (data: Partial<TProject>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading,
}) => {
  const [formData, setFormData] = useState<Partial<TProject>>(
    initialData || {
      name: "",
      description: "",
      content: "",
      status: "planned",
      is_featured: false,
      tags: [],
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

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, tags }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Record<string, unknown> = {
      ...formData,
      thumbnail: formData.thumbnail?._id ?? null,
      images: formData.images?.map((img) => img._id) ?? [],
    };

    onSubmit(payload as Partial<TProject>);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Project Name
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
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Short Description
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
          className="w-full rounded-xl border border-border bg-background p-3 min-h-[300px] focus:border-primary focus:outline-none"
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Tags (comma separated)
          </label>
          <input
            value={formData.tags?.join(", ")}
            onChange={handleTagsChange}
            placeholder="nextjs, tailwind, nodejs"
            className="w-full rounded-xl border border-border bg-background p-3 focus:border-primary focus:outline-none"
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
            className="size-5 rounded border-border text-primary focus:ring-primary"
          />
          <label
            htmlFor="is_featured"
            className="text-sm font-bold uppercase tracking-widest text-muted-foreground"
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
