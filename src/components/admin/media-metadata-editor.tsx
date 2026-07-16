"use client";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlHelper,
  FormControlLabel,
  formControlVariants,
} from "@/components/ui/form-control";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseTrigger,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  buildMediaMetadataFormValues,
  buildMediaMetadataPayload,
  MEDIA_LICENSE_OPTIONS,
  MEDIA_SOURCE_OPTIONS,
  validateMediaMetadataForm,
  type MediaMetadataFieldErrors,
  type MediaMetadataFormValues,
} from "@/lib/admin/media-library";
import { updateAdminMedia } from "@/services/media-admin.service";
import type { TFilePopulated } from "@/types/file.type";
import { cn } from "@/lib/utils";
import { AlertTriangle, Link2, LockKeyhole, WandSparkles } from "lucide-react";
import { useEffect, useId, useState } from "react";

type Props = Readonly<{
  file: TFilePopulated | null;
  setFile: (file: TFilePopulated | null) => void;
  onSaved: (file: TFilePopulated) => void;
}>;

type FieldProps = Readonly<{
  id: string;
  label: string;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}>;

const Field = ({ id, label, error, helper, children }: FieldProps) => (
  <div>
    <FormControlLabel htmlFor={id}>{label}</FormControlLabel>
    {children}
    {error ? (
      <FormControlError id={`${id}-error`}>{error}</FormControlError>
    ) : helper ? (
      <FormControlHelper id={`${id}-helper`}>{helper}</FormControlHelper>
    ) : null}
  </div>
);

const fieldDescription = (
  id: string,
  error: string | undefined,
  helper?: string
) => (error ? `${id}-error` : helper ? `${id}-helper` : undefined);

const isImage = (file: TFilePopulated) =>
  file.metadata?.file_type === "image" || file.mimetype.startsWith("image/");

const MediaMetadataEditor = ({ file, setFile, onSaved }: Props) => {
  const formId = useId();
  const [values, setValues] = useState<MediaMetadataFormValues | null>(null);
  const [errors, setErrors] = useState<MediaMetadataFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setValues(null);
      setErrors({});
      setServerError(null);
      return;
    }
    setValues(buildMediaMetadataFormValues(file));
    setErrors({});
    setServerError(null);
  }, [file]);

  const setValue = <K extends keyof MediaMetadataFormValues>(
    key: K,
    value: MediaMetadataFormValues[K]
  ) => {
    setValues((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !values || saving) return;
    const nextErrors = validateMediaMetadataForm(file, values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const firstField = Object.keys(nextErrors)[0];
      document
        .getElementById(`${formId}-${firstField}`)
        ?.focus({ preventScroll: false });
      return;
    }

    setSaving(true);
    setServerError(null);
    try {
      const response = await updateAdminMedia(
        file._id,
        buildMediaMetadataPayload(file, values)
      );
      onSaved(response.data);
      setFile(null);
    } catch (error) {
      setServerError(
        error instanceof Error && error.message
          ? error.message
          : "Metadata could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };

  const image = file ? isImage(file) : false;
  const inputProps = (field: keyof MediaMetadataFormValues, helper?: string) =>
    ({
      "aria-invalid": Boolean(errors[field]) || undefined,
      "aria-describedby": fieldDescription(
        `${formId}-${field}`,
        errors[field],
        helper
      ),
    }) as const;

  return (
    <Modal
      isOpen={Boolean(file)}
      setIsOpen={(open) => {
        if (!open && !saving) setFile(null);
      }}
      size="xl"
    >
      <ModalBackdrop className="grid p-4">
        <ModalContent className="max-h-[calc(100dvh-2rem)]">
          {file && values && (
            <form onSubmit={submit} noValidate>
              <ModalHeader>
                <div className="min-w-0">
                  <ModalTitle>Edit media metadata</ModalTitle>
                  <p className="text-muted-foreground mt-1 truncate text-sm">
                    {file.originalname || file.filename}
                  </p>
                </div>
                <ModalCloseTrigger disabled={saving} />
              </ModalHeader>

              <ModalBody className="space-y-8">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone="info">{file.provider}</StatusBadge>
                  <StatusBadge tone="primary">
                    {file.purpose || "purpose missing"}
                  </StatusBadge>
                  <StatusBadge tone="neutral">
                    {file.access || "access missing"}
                  </StatusBadge>
                  <StatusBadge
                    tone={
                      file.metadata_status === "complete"
                        ? "success"
                        : "warning"
                    }
                  >
                    metadata {file.metadata_status || "not assessed"}
                  </StatusBadge>
                </div>

                {file.metadata_missing?.length ? (
                  <section
                    aria-labelledby={`${formId}-missing-heading`}
                    className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
                  >
                    <div className="flex gap-3">
                      <AlertTriangle
                        aria-hidden="true"
                        className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300"
                      />
                      <div>
                        <h3
                          id={`${formId}-missing-heading`}
                          className="font-semibold"
                        >
                          Missing metadata
                        </h3>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {file.metadata_missing.map((issue) => (
                            <li key={issue}>
                              <StatusBadge tone="warning">
                                {issue.replaceAll("_", " ")}
                              </StatusBadge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                ) : null}

                <section aria-labelledby={`${formId}-editorial-heading`}>
                  <h3
                    id={`${formId}-editorial-heading`}
                    className="text-lg font-bold"
                  >
                    Editorial details
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field
                      id={`${formId}-name`}
                      label="Display name"
                      error={errors.name}
                    >
                      <FormControl
                        id={`${formId}-name`}
                        value={values.name}
                        maxLength={160}
                        onChange={(event) =>
                          setValue("name", event.target.value)
                        }
                        {...inputProps("name")}
                      />
                    </Field>
                    <Field
                      id={`${formId}-status`}
                      label="Library status"
                      error={errors.status}
                    >
                      <FormControl
                        as="select"
                        id={`${formId}-status`}
                        value={values.status}
                        onChange={(event) =>
                          setValue(
                            "status",
                            event.target
                              .value as MediaMetadataFormValues["status"]
                          )
                        }
                        {...inputProps("status")}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="archived">Archived</option>
                      </FormControl>
                    </Field>
                    <Field
                      id={`${formId}-source`}
                      label="Creation source"
                      error={errors.source}
                    >
                      <FormControl
                        as="select"
                        id={`${formId}-source`}
                        value={values.source}
                        onChange={(event) =>
                          setValue(
                            "source",
                            event.target
                              .value as MediaMetadataFormValues["source"]
                          )
                        }
                        {...inputProps("source")}
                      >
                        <option value="">Not recorded</option>
                        {MEDIA_SOURCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </FormControl>
                    </Field>
                    <Field
                      id={`${formId}-caption`}
                      label="Caption"
                      error={errors.caption}
                    >
                      <FormControl
                        id={`${formId}-caption`}
                        value={values.caption}
                        maxLength={500}
                        onChange={(event) =>
                          setValue("caption", event.target.value)
                        }
                        {...inputProps("caption")}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field
                        id={`${formId}-description`}
                        label="Internal description"
                        error={errors.description}
                      >
                        <textarea
                          id={`${formId}-description`}
                          value={values.description}
                          maxLength={500}
                          rows={3}
                          className={cn(
                            formControlVariants({ size: "lg" }),
                            "h-auto py-3"
                          )}
                          onChange={(event) =>
                            setValue("description", event.target.value)
                          }
                          {...inputProps("description")}
                        />
                      </Field>
                    </div>
                  </div>
                </section>

                {image && (
                  <section aria-labelledby={`${formId}-accessibility-heading`}>
                    <h3
                      id={`${formId}-accessibility-heading`}
                      className="text-lg font-bold"
                    >
                      Accessibility and composition
                    </h3>
                    <label className="border-border mt-4 flex min-h-11 items-center gap-3 rounded-xl border px-4 py-3">
                      <input
                        type="checkbox"
                        checked={values.is_decorative}
                        onChange={(event) => {
                          setValue("is_decorative", event.target.checked);
                          if (event.target.checked) setValue("alt_text", "");
                        }}
                        className="accent-primary size-4"
                      />
                      <span>
                        <span className="block text-sm font-semibold">
                          Decorative media
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          Screen readers will ignore this asset; alt text must
                          remain empty.
                        </span>
                      </span>
                    </label>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Field
                          id={`${formId}-alt_text`}
                          label="Alternative text"
                          error={errors.alt_text}
                          helper={
                            values.is_decorative
                              ? "Locked empty while the asset is decorative."
                              : "Describe the information conveyed, not the filename."
                          }
                        >
                          <textarea
                            id={`${formId}-alt_text`}
                            value={values.alt_text}
                            disabled={values.is_decorative}
                            maxLength={300}
                            rows={3}
                            className={cn(
                              formControlVariants({ size: "lg" }),
                              "h-auto py-3"
                            )}
                            onChange={(event) =>
                              setValue("alt_text", event.target.value)
                            }
                            {...inputProps(
                              "alt_text",
                              values.is_decorative
                                ? "Locked empty while the asset is decorative."
                                : "Describe the information conveyed, not the filename."
                            )}
                          />
                        </Field>
                      </div>
                      <Field
                        id={`${formId}-focal_point_x`}
                        label="Focal point X"
                        error={errors.focal_point_x}
                        helper="0 is left, 1 is right."
                      >
                        <FormControl
                          id={`${formId}-focal_point_x`}
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={values.focal_point_x}
                          onChange={(event) =>
                            setValue("focal_point_x", event.target.value)
                          }
                          {...inputProps(
                            "focal_point_x",
                            "0 is left, 1 is right."
                          )}
                        />
                      </Field>
                      <Field
                        id={`${formId}-focal_point_y`}
                        label="Focal point Y"
                        error={errors.focal_point_y}
                        helper="0 is top, 1 is bottom."
                      >
                        <FormControl
                          id={`${formId}-focal_point_y`}
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={values.focal_point_y}
                          onChange={(event) =>
                            setValue("focal_point_y", event.target.value)
                          }
                          {...inputProps(
                            "focal_point_y",
                            "0 is top, 1 is bottom."
                          )}
                        />
                      </Field>
                      <Field
                        id={`${formId}-dominant_color`}
                        label="Dominant color"
                        error={errors.dominant_color}
                        helper="Six-digit hex used for stable loading surfaces."
                      >
                        <FormControl
                          id={`${formId}-dominant_color`}
                          value={values.dominant_color}
                          placeholder="#102a43"
                          maxLength={7}
                          onChange={(event) =>
                            setValue("dominant_color", event.target.value)
                          }
                          {...inputProps(
                            "dominant_color",
                            "Six-digit hex used for stable loading surfaces."
                          )}
                        />
                      </Field>
                    </div>

                    <details className="border-border mt-4 rounded-xl border p-4">
                      <summary className="cursor-pointer font-semibold">
                        Advanced placeholder data
                      </summary>
                      <div className="mt-4">
                        <Field
                          id={`${formId}-blur_data_url`}
                          label="Blur data URL"
                          error={errors.blur_data_url}
                          helper="Use a small WebP, PNG or JPEG base64 data URL."
                        >
                          <textarea
                            id={`${formId}-blur_data_url`}
                            value={values.blur_data_url}
                            maxLength={8192}
                            rows={3}
                            className={cn(
                              formControlVariants({ size: "lg" }),
                              "h-auto py-3 font-mono text-xs"
                            )}
                            onChange={(event) =>
                              setValue("blur_data_url", event.target.value)
                            }
                            {...inputProps(
                              "blur_data_url",
                              "Use a small WebP, PNG or JPEG base64 data URL."
                            )}
                          />
                        </Field>
                      </div>
                    </details>
                  </section>
                )}

                <section aria-labelledby={`${formId}-rights-heading`}>
                  <h3
                    id={`${formId}-rights-heading`}
                    className="text-lg font-bold"
                  >
                    Rights and attribution
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field
                      id={`${formId}-attribution_license`}
                      label="License"
                      error={errors.attribution_license}
                    >
                      <FormControl
                        as="select"
                        id={`${formId}-attribution_license`}
                        value={values.attribution_license}
                        onChange={(event) =>
                          setValue(
                            "attribution_license",
                            event.target
                              .value as MediaMetadataFormValues["attribution_license"]
                          )
                        }
                        {...inputProps("attribution_license")}
                      >
                        {MEDIA_LICENSE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </FormControl>
                    </Field>
                    <Field
                      id={`${formId}-attribution_creator_name`}
                      label="Creator name"
                      error={errors.attribution_creator_name}
                    >
                      <FormControl
                        id={`${formId}-attribution_creator_name`}
                        value={values.attribution_creator_name}
                        maxLength={200}
                        onChange={(event) =>
                          setValue(
                            "attribution_creator_name",
                            event.target.value
                          )
                        }
                        {...inputProps("attribution_creator_name")}
                      />
                    </Field>
                    <Field
                      id={`${formId}-attribution_creator_url`}
                      label="Creator URL"
                      error={errors.attribution_creator_url}
                    >
                      <FormControl
                        id={`${formId}-attribution_creator_url`}
                        type="url"
                        value={values.attribution_creator_url}
                        maxLength={2048}
                        placeholder="https://"
                        onChange={(event) =>
                          setValue(
                            "attribution_creator_url",
                            event.target.value
                          )
                        }
                        {...inputProps("attribution_creator_url")}
                      />
                    </Field>
                    <Field
                      id={`${formId}-attribution_source_url`}
                      label="Source URL"
                      error={errors.attribution_source_url}
                    >
                      <FormControl
                        id={`${formId}-attribution_source_url`}
                        type="url"
                        value={values.attribution_source_url}
                        maxLength={2048}
                        placeholder="https://"
                        onChange={(event) =>
                          setValue("attribution_source_url", event.target.value)
                        }
                        {...inputProps("attribution_source_url")}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field
                        id={`${formId}-attribution_credit_text`}
                        label="Credit text"
                        error={errors.attribution_credit_text}
                      >
                        <FormControl
                          id={`${formId}-attribution_credit_text`}
                          value={values.attribution_credit_text}
                          maxLength={500}
                          onChange={(event) =>
                            setValue(
                              "attribution_credit_text",
                              event.target.value
                            )
                          }
                          {...inputProps("attribution_credit_text")}
                        />
                      </Field>
                    </div>
                    <Field
                      id={`${formId}-attribution_license_url`}
                      label="License URL"
                      error={errors.attribution_license_url}
                    >
                      <FormControl
                        id={`${formId}-attribution_license_url`}
                        type="url"
                        value={values.attribution_license_url}
                        maxLength={2048}
                        placeholder="https://"
                        onChange={(event) =>
                          setValue(
                            "attribution_license_url",
                            event.target.value
                          )
                        }
                        {...inputProps("attribution_license_url")}
                      />
                    </Field>
                  </div>
                </section>

                {values.source === "generated" && (
                  <section aria-labelledby={`${formId}-provenance-heading`}>
                    <div className="flex items-center gap-2">
                      <WandSparkles
                        aria-hidden="true"
                        className="text-primary size-5"
                      />
                      <h3
                        id={`${formId}-provenance-heading`}
                        className="text-lg font-bold"
                      >
                        Generated provenance
                      </h3>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Record reproducibility facts only. Never paste provider
                      keys, access tokens or customer-confidential material.
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field
                        id={`${formId}-provenance_generator`}
                        label="Generator"
                        error={errors.provenance_generator}
                      >
                        <FormControl
                          id={`${formId}-provenance_generator`}
                          value={values.provenance_generator}
                          maxLength={160}
                          onChange={(event) =>
                            setValue("provenance_generator", event.target.value)
                          }
                          {...inputProps("provenance_generator")}
                        />
                      </Field>
                      <Field
                        id={`${formId}-provenance_model`}
                        label="Model"
                        error={errors.provenance_model}
                      >
                        <FormControl
                          id={`${formId}-provenance_model`}
                          value={values.provenance_model}
                          maxLength={160}
                          onChange={(event) =>
                            setValue("provenance_model", event.target.value)
                          }
                          {...inputProps("provenance_model")}
                        />
                      </Field>
                      <Field
                        id={`${formId}-provenance_version`}
                        label="Asset version"
                        error={errors.provenance_version}
                      >
                        <FormControl
                          id={`${formId}-provenance_version`}
                          value={values.provenance_version}
                          maxLength={120}
                          onChange={(event) =>
                            setValue("provenance_version", event.target.value)
                          }
                          {...inputProps("provenance_version")}
                        />
                      </Field>
                      <Field
                        id={`${formId}-provenance_generated_at`}
                        label="Generated at"
                        error={errors.provenance_generated_at}
                      >
                        <FormControl
                          id={`${formId}-provenance_generated_at`}
                          type="datetime-local"
                          value={values.provenance_generated_at}
                          onChange={(event) =>
                            setValue(
                              "provenance_generated_at",
                              event.target.value
                            )
                          }
                          {...inputProps("provenance_generated_at")}
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field
                          id={`${formId}-provenance_prompt`}
                          label="Generation prompt (write-only)"
                          error={errors.provenance_prompt}
                          helper="Existing prompt text is intentionally never returned to the browser. Leave blank to preserve it."
                        >
                          <textarea
                            id={`${formId}-provenance_prompt`}
                            value={values.provenance_prompt}
                            maxLength={8000}
                            rows={4}
                            className={cn(
                              formControlVariants({ size: "lg" }),
                              "h-auto py-3"
                            )}
                            autoComplete="off"
                            onChange={(event) =>
                              setValue("provenance_prompt", event.target.value)
                            }
                            {...inputProps(
                              "provenance_prompt",
                              "Existing prompt text is intentionally never returned to the browser. Leave blank to preserve it."
                            )}
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field
                          id={`${formId}-provenance_source_checksum`}
                          label="Source checksum (SHA-256)"
                          error={errors.provenance_source_checksum}
                        >
                          <FormControl
                            id={`${formId}-provenance_source_checksum`}
                            value={values.provenance_source_checksum}
                            maxLength={64}
                            className="font-mono text-xs"
                            onChange={(event) =>
                              setValue(
                                "provenance_source_checksum",
                                event.target.value
                              )
                            }
                            {...inputProps("provenance_source_checksum")}
                          />
                        </Field>
                      </div>
                    </div>
                  </section>
                )}

                <section aria-labelledby={`${formId}-usage-heading`}>
                  <div className="flex items-center gap-2">
                    <Link2 aria-hidden="true" className="text-primary size-5" />
                    <h3
                      id={`${formId}-usage-heading`}
                      className="text-lg font-bold"
                    >
                      Usage references ({file.references?.length ?? 0})
                    </h3>
                  </div>
                  {file.references?.length ? (
                    <ul className="mt-4 space-y-2">
                      {file.references.map((reference) => (
                        <li
                          key={`${reference.model}-${reference.entity}-${reference.field}`}
                          className="border-border flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-sm"
                        >
                          <StatusBadge tone="info">
                            {reference.model}
                          </StatusBadge>
                          <span className="font-medium">{reference.field}</span>
                          <span className="text-muted-foreground font-mono text-xs">
                            {reference.entity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground mt-3 text-sm">
                      This file is not attached to a managed content record and
                      is eligible for soft deletion when ready.
                    </p>
                  )}
                </section>

                <div className="border-border bg-muted/30 flex gap-3 rounded-xl border p-3 text-sm">
                  <LockKeyhole
                    aria-hidden="true"
                    className="text-primary mt-0.5 size-5 shrink-0"
                  />
                  <p className="text-muted-foreground">
                    Storage credentials, deletion leases and private provider
                    configuration are operational fields and are not available
                    in this editor.
                  </p>
                </div>

                {serverError && (
                  <p
                    role="alert"
                    className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm"
                  >
                    {serverError}
                  </p>
                )}
              </ModalBody>

              <ModalFooter>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setFile(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={saving}>
                  Save metadata
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </ModalBackdrop>
    </Modal>
  );
};

export default MediaMetadataEditor;
