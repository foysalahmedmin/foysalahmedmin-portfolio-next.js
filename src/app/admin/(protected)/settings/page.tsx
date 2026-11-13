"use client";

import { ConsoleNotice } from "@/components/admin/console-notice";
import { ConsolePageHeader, EditorSection } from "@/components/console";
import { ConsoleSettings } from "@/components/templates/console-templates";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { FormControl } from "@/components/ui/form-control";
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
    <ConsoleSettings
      header={
        <ConsolePageHeader
          eyebrow="Account"
          title="Settings"
          description="Manage your profile information."
        />
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <EditorSection
          id="settings-profile"
          title="Profile"
          description="Your name, email and photo as other operators see them."
        >
          <div className="cp-field">
            <span id="settings-image-label" className="cp-label">
              Profile image
            </span>
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

          <div className="cp-fields">
            <div className="cp-field">
              <label htmlFor="settings-name" className="cp-label">
                Name
              </label>
              <FormControl
                id="settings-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="cp-field">
              <label htmlFor="settings-email" className="cp-label">
                Email
              </label>
              <FormControl
                id="settings-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </EditorSection>

        {error && <ConsoleNotice kind="error">{error}</ConsoleNotice>}

        {success && (
          <ConsoleNotice kind="success">
            Profile updated successfully.
          </ConsoleNotice>
        )}

        <div className="cwc-settings-actions">
          <Button type="submit" className="gap-2" isLoading={loading}>
            <Save className="size-4" />
            Save Changes
          </Button>
        </div>
      </form>
    </ConsoleSettings>
  );
}
