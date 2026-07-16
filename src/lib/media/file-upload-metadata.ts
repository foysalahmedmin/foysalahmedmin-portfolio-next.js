import type { TFileEditorialMetadataInput } from "@/types/file.type";

const append = (
  formData: FormData,
  key: string,
  value: string | number | boolean | undefined
) => {
  if (value !== undefined) formData.append(key, String(value));
};

/** Serializes the shared File editorial DTO into multipart-safe flat fields. */
export const appendFileUploadMetadata = (
  formData: FormData,
  metadata?: TFileEditorialMetadataInput
): FormData => {
  if (!metadata) return formData;

  append(formData, "source", metadata.source);
  append(formData, "alt_text", metadata.alt_text);
  append(formData, "is_decorative", metadata.is_decorative);
  append(formData, "focal_point_x", metadata.focal_point?.x);
  append(formData, "focal_point_y", metadata.focal_point?.y);
  append(formData, "dominant_color", metadata.dominant_color);
  append(formData, "blur_data_url", metadata.blur_data_url);

  append(formData, "provenance_generator", metadata.provenance?.generator);
  append(formData, "provenance_model", metadata.provenance?.model);
  append(formData, "provenance_prompt", metadata.provenance?.prompt);
  append(formData, "provenance_version", metadata.provenance?.version);
  append(formData, "provenance_seed", metadata.provenance?.seed);
  append(
    formData,
    "provenance_generated_at",
    metadata.provenance?.generated_at
  );
  append(
    formData,
    "provenance_source_checksum",
    metadata.provenance?.source_checksum
  );

  append(
    formData,
    "attribution_creator_name",
    metadata.attribution?.creator_name
  );
  append(
    formData,
    "attribution_creator_url",
    metadata.attribution?.creator_url
  );
  append(formData, "attribution_source_url", metadata.attribution?.source_url);
  append(
    formData,
    "attribution_credit_text",
    metadata.attribution?.credit_text
  );
  append(formData, "attribution_license", metadata.attribution?.license);
  append(
    formData,
    "attribution_license_url",
    metadata.attribution?.license_url
  );

  return formData;
};
