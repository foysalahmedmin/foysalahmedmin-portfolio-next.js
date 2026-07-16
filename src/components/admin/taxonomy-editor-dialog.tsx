"use client";

import {
  EditorialErrorSummary,
  EditorialField,
  EditorialSlugEditor,
  editorialInputClassName,
  editorialTextareaClassName,
  type TEditorErrors,
} from "@/components/admin/editorial-editor-primitives";
import { Button } from "@/components/ui/button";
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
import {
  TAXONOMY_CONTRACT,
  buildTaxonomyPayload,
  emptyTaxonomyDraft,
  taxonomyCategoryToDraft,
  validateTaxonomyDraft,
  type TAdminTaxonomyCategory,
  type TTaxonomyDraft,
  type TTaxonomyDraftErrors,
  type TTaxonomyKind,
} from "@/lib/admin/taxonomy-admin";
import {
  createAdminTaxonomyCategory,
  updateAdminTaxonomyCategory,
} from "@/services/taxonomy-admin.service";
import { Save } from "lucide-react";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";

type Props = Readonly<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  kind: TTaxonomyKind;
  category: TAdminTaxonomyCategory | null;
  safeParents: readonly TAdminTaxonomyCategory[];
  onSaved: (message: string) => void;
}>;

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : "The category could not be saved.";

const TaxonomyEditorDialog = ({
  isOpen,
  setIsOpen,
  kind,
  category,
  safeParents,
  onSaved,
}: Props) => {
  const contract = TAXONOMY_CONTRACT[kind];
  const baseId = useId();
  const [draft, setDraft] = useState<TTaxonomyDraft>(() =>
    category ? taxonomyCategoryToDraft(category) : emptyTaxonomyDraft()
  );
  const [errors, setErrors] = useState<TTaxonomyDraftErrors>({});
  const [requestError, setRequestError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!saving) setIsOpen(open);
    },
    [saving, setIsOpen]
  );

  useEffect(() => {
    if (!isOpen) return;
    setDraft(
      category ? taxonomyCategoryToDraft(category) : emptyTaxonomyDraft()
    );
    setErrors({});
    setRequestError("");
  }, [category, isOpen, kind]);

  const fieldId = (field: keyof TTaxonomyDraft) =>
    `${baseId}-taxonomy-${field}`;
  const setField = <K extends keyof TTaxonomyDraft>(
    field: K,
    value: TTaxonomyDraft[K]
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setRequestError("");
  };
  const summaryErrors: TEditorErrors = Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [
      fieldId(field as keyof TTaxonomyDraft),
      message,
    ])
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const validationErrors = validateTaxonomyDraft(draft, safeParents);
    setErrors(validationErrors);
    const firstError = Object.keys(validationErrors)[0] as
      | keyof TTaxonomyDraft
      | undefined;
    if (firstError) {
      window.setTimeout(
        () => document.getElementById(fieldId(firstError))?.focus(),
        0
      );
      return;
    }

    setSaving(true);
    setRequestError("");
    try {
      const payload = buildTaxonomyPayload(draft);
      if (category) {
        await updateAdminTaxonomyCategory(kind, category.id, payload);
      } else {
        await createAdminTaxonomyCategory(kind, payload);
      }
      onSaved(
        `${category ? "Updated" : "Created"} ${contract.singular} “${payload.name}”.`
      );
      setIsOpen(false);
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const currentParentUnavailable =
    Boolean(draft.parentId) &&
    !safeParents.some(({ id }) => id === draft.parentId);

  return (
    <Modal isOpen={isOpen} setIsOpen={handleOpenChange} size="lg">
      <ModalBackdrop className="grid p-4">
        <ModalContent>
          <form onSubmit={submit} noValidate>
            <ModalHeader>
              <div>
                <ModalTitle>
                  {category ? "Edit" : "Create"} {contract.singular}
                </ModalTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Slug identity and parent changes are validated before the
                  existing category API applies them.
                </p>
              </div>
              <ModalCloseTrigger disabled={saving} />
            </ModalHeader>

            <ModalBody className="space-y-5">
              {requestError ? (
                <p
                  role="alert"
                  className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm"
                >
                  {requestError}
                </p>
              ) : null}
              <EditorialErrorSummary errors={summaryErrors} />

              <div className="grid gap-5 md:grid-cols-2">
                <EditorialField
                  path={fieldId("name")}
                  label="Category name"
                  required
                  error={errors.name}
                  hint="Identity must remain unique among active categories."
                >
                  <input
                    id={fieldId("name")}
                    value={draft.name}
                    onChange={(event) => setField("name", event.target.value)}
                    disabled={saving}
                    required
                    maxLength={50}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={`${fieldId("name")}-hint${errors.name ? ` ${fieldId("name")}-error` : ""}`}
                    data-initial-focus
                    className={editorialInputClassName}
                  />
                </EditorialField>
                <EditorialSlugEditor
                  id={fieldId("slug")}
                  value={draft.slug}
                  sourceValue={draft.name}
                  onChange={(value) => setField("slug", value)}
                  sourceLabel="name"
                  required
                  maxLength={96}
                  disabled={saving}
                  error={errors.slug}
                  basePath={`/taxonomy/${kind}`}
                  help="Explicit canonical identity used by category filters. Changing it preserves backend slug-history semantics."
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <EditorialField
                  path={fieldId("sequence")}
                  label="Display order"
                  required
                  error={errors.sequence}
                >
                  <input
                    id={fieldId("sequence")}
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={draft.sequence}
                    onChange={(event) =>
                      setField("sequence", event.target.value)
                    }
                    disabled={saving}
                    required
                    aria-invalid={Boolean(errors.sequence)}
                    className={editorialInputClassName}
                  />
                </EditorialField>
                <EditorialField
                  path={fieldId("status")}
                  label="Visibility state"
                  required
                  error={errors.status}
                >
                  <select
                    id={fieldId("status")}
                    value={draft.status}
                    onChange={(event) =>
                      setField(
                        "status",
                        event.target.value as TTaxonomyDraft["status"]
                      )
                    }
                    disabled={saving}
                    className={editorialInputClassName}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </EditorialField>
                <EditorialField
                  path={fieldId("parentId")}
                  label="Parent category"
                  error={errors.parentId}
                  hint="Only active categories outside this category's descendant tree are eligible."
                >
                  <select
                    id={fieldId("parentId")}
                    value={draft.parentId}
                    onChange={(event) =>
                      setField("parentId", event.target.value)
                    }
                    disabled={saving}
                    aria-invalid={Boolean(errors.parentId)}
                    aria-describedby={`${fieldId("parentId")}-hint${errors.parentId ? ` ${fieldId("parentId")}-error` : ""}`}
                    className={editorialInputClassName}
                  >
                    <option value="">No parent (root)</option>
                    {currentParentUnavailable ? (
                      <option value={draft.parentId} disabled>
                        Current parent unavailable — choose a safe parent
                      </option>
                    ) : null}
                    {safeParents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name}
                      </option>
                    ))}
                  </select>
                </EditorialField>
              </div>

              <EditorialField
                path={fieldId("description")}
                label="Description"
                error={errors.description}
                hint={`${draft.description.length}/500 characters`}
              >
                <textarea
                  id={fieldId("description")}
                  value={draft.description}
                  onChange={(event) =>
                    setField("description", event.target.value)
                  }
                  disabled={saving}
                  rows={4}
                  maxLength={500}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={`${fieldId("description")}-hint${errors.description ? ` ${fieldId("description")}-error` : ""}`}
                  className={editorialTextareaClassName}
                />
              </EditorialField>

              <EditorialField
                path={fieldId("tags")}
                label="Tags"
                hint="Comma-separated internal discovery labels; duplicates are removed."
              >
                <input
                  id={fieldId("tags")}
                  value={draft.tags}
                  onChange={(event) => setField("tags", event.target.value)}
                  disabled={saving}
                  className={editorialInputClassName}
                  placeholder="architecture, backend"
                />
              </EditorialField>
            </ModalBody>

            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={saving} disabled={saving}>
                <Save aria-hidden="true" className="size-4" />
                {category ? "Save category" : "Create category"}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </ModalBackdrop>
    </Modal>
  );
};

export default TaxonomyEditorDialog;
