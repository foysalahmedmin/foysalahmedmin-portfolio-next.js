"use client";

import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { updateSelf } from "@/services/user.service";
import type { TFilePopulated } from "@/types/file.type";
import type { TUser } from "@/types/user.type";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [formData, setFormData] = useState<
    Partial<Pick<TUser, "name" | "email" | "image">>
  >({
    name: "",
    email: "",
    image: null,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/self", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (res?.data) {
          setFormData({
            name: res.data.name || "",
            email: res.data.email || "",
            image: res.data.image ?? null,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateSelf({
        name: formData.name,
        email: formData.email,
        image: (formData.image as TFilePopulated | null)?._id ?? null,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your profile information
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            Profile Image
          </label>
          <FileUploader
            purpose="profile"
            value={formData.image as TFilePopulated | null}
            onChange={(file) =>
              setFormData((prev) => ({ ...prev, image: file }))
            }
            label="Upload profile photo"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
            Name
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
            Email
          </label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="border-border bg-background focus:border-primary w-full rounded-xl border p-3 focus:outline-none"
          />
        </div>

        {error && (
          <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
            Profile updated successfully.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" className="gap-2" isLoading={loading}>
            <Save className="size-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
