"use client";

import type {
  TPageAdminDto,
  TPageDraftSnapshot,
  TPageRouteKey,
  TPageSection,
  TPageSectionKind,
} from "@/app/api/pages/page.type";
import {
  EditorialField,
  EditorialErrorSummary,
  EditorialNotice,
  EditorialPanel,
  EditorialSeoSocialPreview,
  EditorialStatus,
  EditorialStickyActions,
  EditorialWorkspaceHeader,
  editorialInputClassName,
  editorialTextareaClassName,
  type TEditorErrors,
} from "@/components/admin/editorial-editor-primitives";
import { Button } from "@/components/ui/button";
import {
  createNeutralPageDraft,
  createPageEditorSection,
  PAGE_EDITOR_ROUTE_KINDS,
  PAGE_SECTION_EDITOR_DEFINITIONS,
} from "@/lib/admin/page-editor-contract";
import {
  clearAdminPagePreviewClient,
  createAdminPageClient,
  createAdminPagePreviewClient,
  EditorialRequestError,
  getAdminPageClient,
  getAdminPagePreviewClient,
  publishAdminPageClient,
  updateAdminPageClient,
} from "@/services/site-page-admin.service";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PageAdminEditorProps = Readonly<{
  routeKey: TPageRouteKey;
  initialPage: TPageAdminDto | null;
  canEdit: boolean;
  canPublish: boolean;
}>;

const cloneDraft = (draft: TPageDraftSnapshot): TPageDraftSnapshot =>
  structuredClone(draft);

const sourceMap = (error: EditorialRequestError): TEditorErrors =>
  Object.fromEntries(
    error.sources.map((source) => [source.path, source.message])
  );

const fieldError = (errors: TEditorErrors, path: string) => errors[path];

const sectionTitle = (section: TPageSection): string =>
  section.heading?.trim() ||
  PAGE_SECTION_EDITOR_DEFINITIONS[section.kind].label;

const sectionSourceLabel = (section: TPageSection): string => {
  if (section.source.mode === "system") return "System-owned Site data";
  if (section.source.mode === "curated")
    return `${section.source.ids.length} curated reference${section.source.ids.length === 1 ? "" : "s"}`;
  const count = Object.values(section.source.filter).filter(
    (value) => value !== undefined
  ).length;
  return `Automatic query${count ? ` · ${count} filter${count === 1 ? "" : "s"}` : ""}`;
};

function StructuralPreview({
  page,
  expiresIn,
  onClose,
}: {
  page: TPageAdminDto;
  expiresIn: number;
  onClose: () => void;
}) {
  return (
    <EditorialPanel
      id="page-structural-preview"
      title="Structural preview"
      description="Renderer unavailable in admin: this noindex preview verifies the saved draft revision and content graph, then shows composition structure—not final typography, media, spacing or interactive behavior."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <EditorialStatus tone="warning">Not a visual preview</EditorialStatus>
          <EditorialStatus>Saved r{page.revision}</EditorialStatus>
          <EditorialStatus>
            Expires in {Math.max(1, Math.round(expiresIn / 60))} min
          </EditorialStatus>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          <X className="size-4" />
          End preview
        </Button>
      </div>
      <ol className="space-y-3">
        {page.draft.sections.map((section, index) => (
          <li
            key={section.key}
            className="border-border bg-background grid gap-3 rounded-xl border p-4 sm:grid-cols-[3rem_1fr_auto] sm:items-center"
          >
            <span className="text-muted-foreground font-mono text-sm">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="font-black">{sectionTitle(section)}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {PAGE_SECTION_EDITOR_DEFINITIONS[section.kind].label} ·{" "}
                {section.layout} · {sectionSourceLabel(section)}
              </p>
            </div>
            <EditorialStatus tone={section.visible ? "success" : "neutral"}>
              {section.visible ? "Visible" : "Hidden"}
            </EditorialStatus>
          </li>
        ))}
      </ol>
    </EditorialPanel>
  );
}

export default function PageAdminEditor({
  routeKey,
  initialPage,
  canEdit,
  canPublish,
}: PageAdminEditorProps) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [draft, setDraft] = useState<TPageDraftSnapshot | null>(() =>
    initialPage ? cloneDraft(initialPage.draft) : null
  );
  const [savedDraft, setSavedDraft] = useState<TPageDraftSnapshot | null>(() =>
    initialPage ? cloneDraft(initialPage.draft) : null
  );
  const [busy, setBusy] = useState<
    | "create"
    | "save"
    | "publish"
    | "reload"
    | "preview"
    | "clear-preview"
    | null
  >(null);
  const [errors, setErrors] = useState<TEditorErrors>({});
  const [notice, setNotice] = useState<{
    tone: "success" | "warning" | "danger";
    title: string;
    detail?: string;
  } | null>(null);
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  const [newKind, setNewKind] = useState<TPageSectionKind>(
    PAGE_EDITOR_ROUTE_KINDS[routeKey][0]!
  );
  const [preview, setPreview] = useState<{
    page: TPageAdminDto;
    expiresIn: number;
  } | null>(null);
  const dirty = useMemo(
    () =>
      Boolean(
        draft &&
          savedDraft &&
          JSON.stringify(draft) !== JSON.stringify(savedDraft)
      ),
    [draft, savedDraft]
  );
  const disabled = !canEdit || Boolean(busy);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const accept = (next: TPageAdminDto, message: string) => {
    setPage(next);
    setDraft(cloneDraft(next.draft));
    setSavedDraft(cloneDraft(next.draft));
    setErrors({});
    setConflictRevision(null);
    setNotice({ tone: "success", title: message });
    router.refresh();
  };
  const fail = (error: unknown) => {
    if (error instanceof EditorialRequestError) {
      setErrors(sourceMap(error));
      setConflictRevision(
        error.status === 409 ? (error.currentRevision ?? null) : null
      );
      setNotice({
        tone: error.status === 409 ? "warning" : "danger",
        title: error.message,
        detail: [
          error.code,
          error.requestId ? `Request ${error.requestId}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      });
    } else
      setNotice({ tone: "danger", title: "The Page operation failed safely." });
  };
  const reload = async () => {
    setBusy("reload");
    setNotice(null);
    try {
      accept(
        await getAdminPageClient(routeKey),
        "Latest Page revision loaded."
      );
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };
  const create = async () => {
    setBusy("create");
    setNotice(null);
    try {
      accept(
        await createAdminPageClient(routeKey, createNeutralPageDraft(routeKey)),
        "Neutral fixed-route Page draft created. Nothing was published."
      );
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };
  const save = async () => {
    if (!page || !draft || !dirty) return;
    setBusy("save");
    setNotice(null);
    setErrors({});
    try {
      accept(
        await updateAdminPageClient(routeKey, page.revision, draft),
        "Page draft saved and reference graph checked."
      );
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };
  const publish = async () => {
    if (!page || dirty) return;
    setBusy("publish");
    setNotice(null);
    setErrors({});
    try {
      const result = await publishAdminPageClient(routeKey, page.revision);
      accept(
        result.page,
        result.cache_invalidated
          ? "Page published and public cache refreshed."
          : "Page published. Cache invalidation is queued for retry."
      );
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };
  const startPreview = async () => {
    if (!page || dirty) return;
    setBusy("preview");
    setNotice(null);
    setErrors({});
    try {
      const session = await createAdminPagePreviewClient(
        routeKey,
        page.revision
      );
      const previewPage = await getAdminPagePreviewClient(routeKey);
      setPreview({ page: previewPage, expiresIn: session.expires_in_seconds });
      setNotice({
        tone: "success",
        title: "Private noindex preview session created.",
      });
      window.setTimeout(() => {
        const previewPanel = document.getElementById("page-structural-preview");
        if (typeof previewPanel?.scrollIntoView === "function") {
          previewPanel.scrollIntoView({ behavior: "smooth" });
        }
      }, 0);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };
  const endPreview = async () => {
    setBusy("clear-preview");
    try {
      await clearAdminPagePreviewClient(routeKey);
      setPreview(null);
      setNotice({ tone: "success", title: "Preview session ended." });
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  if (!page || !draft || !savedDraft) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <EditorialWorkspaceHeader
          eyebrow="Fixed-route composition"
          title={`${routeKey} Page`}
          description="This route has a bounded, typed section graph. Creating its neutral draft establishes structure only and does not fabricate or publish content."
          status={
            <EditorialStatus tone="warning">Not configured</EditorialStatus>
          }
        />
        <EditorialNotice
          tone="warning"
          title="No Page record exists for this fixed route."
        >
          The neutral starting section is route-compatible, non-public and uses
          only Site/system data or an empty automatic content query.
        </EditorialNotice>
        {canEdit ? (
          <Button type="button" onClick={create} isLoading={busy === "create"}>
            Create neutral Page draft
          </Button>
        ) : (
          <EditorialNotice tone="danger" title="Read-only access">
            A Site editor or administrator must create this Page draft.
          </EditorialNotice>
        )}
      </div>
    );
  }

  const publishedRevision = page.published?.revision;
  const updateSection = (
    index: number,
    update: (section: TPageSection) => TPageSection
  ) =>
    setDraft({
      ...draft,
      sections: draft.sections.map((section, itemIndex) =>
        itemIndex === index ? update(section) : section
      ),
    });
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= draft.sections.length) return;
    const sections = [...draft.sections];
    const [section] = sections.splice(index, 1);
    if (!section) return;
    sections.splice(destination, 0, section);
    setDraft({ ...draft, sections });
    window.setTimeout(
      () => document.getElementById(`page-section-${destination}`)?.focus(),
      0
    );
  };

  return (
    <div className="mx-auto max-w-[100rem] space-y-6">
      <EditorialWorkspaceHeader
        eyebrow="Fixed-route composition"
        title={`${routeKey} Page`}
        description={`${page.route_path} · SEO overrides, visible section order, typed data sources and bounded content limits.`}
        status={
          <>
            <EditorialStatus>Draft r{page.revision}</EditorialStatus>
            {publishedRevision ? (
              <EditorialStatus tone="success">
                Published r{publishedRevision}
              </EditorialStatus>
            ) : (
              <EditorialStatus tone="warning">Never published</EditorialStatus>
            )}
            {dirty ? (
              <EditorialStatus tone="warning">Unsaved</EditorialStatus>
            ) : publishedRevision === page.revision ? (
              <EditorialStatus tone="success">Published draft</EditorialStatus>
            ) : (
              <EditorialStatus tone="warning">
                Unpublished revision
              </EditorialStatus>
            )}
            {!canEdit ? <EditorialStatus>Read only</EditorialStatus> : null}
          </>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={reload}
            isLoading={busy === "reload"}
          >
            <RotateCcw className="size-4" />
            Reload
          </Button>
        }
      />
      {notice ? (
        <EditorialNotice tone={notice.tone} title={notice.title}>
          {notice.detail}
        </EditorialNotice>
      ) : null}
      {conflictRevision ? (
        <EditorialNotice
          tone="warning"
          title={`A newer revision (r${conflictRevision}) exists.`}
        >
          Your local composition is preserved for comparison. Reload the
          authoritative revision before saving.
        </EditorialNotice>
      ) : null}
      {!canEdit ? (
        <EditorialNotice title="Read-only Page access">
          You can inspect draft structure and start a server-validated preview.
          Mutation controls are omitted by capability and still gated on the
          API.
        </EditorialNotice>
      ) : null}
      <EditorialErrorSummary errors={errors} />

      <EditorialPanel
        id="page-seo"
        title="Route SEO overrides"
        description="Leave optional values empty to inherit published Site metadata. Noindex is explicit per route."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <EditorialField
            path="seo.title"
            label="Title override"
            error={fieldError(errors, "seo.title")}
          >
            <input
              id="seo.title"
              value={draft.seo.title ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  seo: {
                    ...draft.seo,
                    title: event.target.value.trim()
                      ? event.target.value
                      : undefined,
                  },
                })
              }
              disabled={disabled}
              aria-invalid={Boolean(fieldError(errors, "seo.title"))}
              className={editorialInputClassName}
            />
          </EditorialField>
          <label className="border-border bg-background flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
            <input
              id="seo.noindex"
              type="checkbox"
              checked={draft.seo.noindex}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  seo: { ...draft.seo, noindex: event.target.checked },
                })
              }
              disabled={disabled}
              className="size-4 accent-current"
            />
            <span>
              <strong className="block">Prevent indexing</strong>
              <span className="text-muted-foreground mt-1 block text-xs">
                Published metadata emits noindex for this Page.
              </span>
            </span>
          </label>
          <div className="md:col-span-2">
            <EditorialField
              path="seo.description"
              label="Description override"
              error={fieldError(errors, "seo.description")}
              hint="10–300 plain-text characters when provided."
            >
              <textarea
                id="seo.description"
                value={draft.seo.description ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    seo: {
                      ...draft.seo,
                      description: event.target.value.trim()
                        ? event.target.value
                        : undefined,
                    },
                  })
                }
                disabled={disabled}
                rows={3}
                aria-invalid={Boolean(fieldError(errors, "seo.description"))}
                className={editorialTextareaClassName}
              />
            </EditorialField>
          </div>
        </div>
        <EditorialSeoSocialPreview
          title={draft.seo.title}
          description={draft.seo.description}
          url={page.route_path}
          siteName="Portfolio page draft"
          fallbackTitle="Inherited published Site title"
          fallbackDescription="Inherited published Site description"
          noindex={draft.seo.noindex}
        />
      </EditorialPanel>

      <EditorialPanel
        id="page-composition"
        title="Section composition"
        description="Use the buttons or focus a section and press Alt+Arrow Up/Down to reorder. Changes remain local until Save draft succeeds against the expected revision."
      >
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <EditorialField
            path="new-section-kind"
            label="Add a route-compatible section"
          >
            <select
              id="new-section-kind"
              value={newKind}
              onChange={(event) =>
                setNewKind(event.target.value as TPageSectionKind)
              }
              disabled={disabled || draft.sections.length >= 20}
              className={editorialInputClassName}
            >
              {PAGE_EDITOR_ROUTE_KINDS[routeKey].map((kind) => (
                <option key={kind} value={kind}>
                  {PAGE_SECTION_EDITOR_DEFINITIONS[kind].label}
                </option>
              ))}
            </select>
          </EditorialField>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDraft({
                  ...draft,
                  sections: [
                    ...draft.sections,
                    createPageEditorSection(routeKey, newKind, draft.sections),
                  ],
                })
              }
              disabled={Boolean(busy) || draft.sections.length >= 20}
            >
              <Plus className="size-4" />
              Add section
            </Button>
          ) : null}
          <span className="text-muted-foreground pb-3 text-xs">
            {draft.sections.length}/20 sections
          </span>
        </div>

        <ol className="space-y-5">
          {draft.sections.map((section, index) => {
            const prefix = `sections.${index}`;
            const definition = PAGE_SECTION_EDITOR_DEFINITIONS[section.kind];
            const source = section.source;
            return (
              <li key={`${section.key}-${index}`}>
                <article
                  id={`page-section-${index}`}
                  tabIndex={-1}
                  onKeyDown={(event) => {
                    if (!event.altKey) return;
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      move(index, -1);
                    }
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      move(index, 1);
                    }
                  }}
                  className="border-border focus-visible:ring-ring rounded-2xl border p-5 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-primary text-xs font-black tracking-wider uppercase">
                        Section {index + 1}
                      </p>
                      <h3 className="mt-1 text-lg font-black">
                        {sectionTitle(section)}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {definition.label} · {sectionSourceLabel(section)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        shape="icon"
                        aria-label={`Move ${sectionTitle(section)} up`}
                        disabled={disabled || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        shape="icon"
                        aria-label={`Move ${sectionTitle(section)} down`}
                        disabled={
                          disabled || index === draft.sections.length - 1
                        }
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          shape="icon"
                          className="text-destructive"
                          aria-label={`Remove ${sectionTitle(section)}`}
                          disabled={
                            Boolean(busy) || draft.sections.length === 1
                          }
                          onClick={() =>
                            setDraft({
                              ...draft,
                              sections: draft.sections.filter(
                                (_, itemIndex) => itemIndex !== index
                              ),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <EditorialField
                      path={`${prefix}.key`}
                      label="Stable section key"
                      error={fieldError(errors, `${prefix}.key`)}
                    >
                      <input
                        id={`${prefix}.key`}
                        value={section.key}
                        onChange={(event) =>
                          updateSection(index, (current) => ({
                            ...current,
                            key: event.target.value,
                          }))
                        }
                        disabled={disabled}
                        aria-invalid={Boolean(
                          fieldError(errors, `${prefix}.key`)
                        )}
                        className={editorialInputClassName}
                      />
                    </EditorialField>
                    <EditorialField
                      path={`${prefix}.heading`}
                      label="Optional heading"
                      error={fieldError(errors, `${prefix}.heading`)}
                    >
                      <input
                        id={`${prefix}.heading`}
                        value={section.heading ?? ""}
                        onChange={(event) =>
                          updateSection(index, (current) => ({
                            ...current,
                            heading: event.target.value.trim()
                              ? event.target.value
                              : undefined,
                          }))
                        }
                        disabled={disabled}
                        aria-invalid={Boolean(
                          fieldError(errors, `${prefix}.heading`)
                        )}
                        className={editorialInputClassName}
                      />
                    </EditorialField>
                    <EditorialField
                      path={`${prefix}.layout`}
                      label="Layout contract"
                      error={fieldError(errors, `${prefix}.layout`)}
                    >
                      <select
                        id={`${prefix}.layout`}
                        value={section.layout}
                        onChange={(event) =>
                          updateSection(index, (current) => ({
                            ...current,
                            layout: event.target.value,
                          }))
                        }
                        disabled={disabled}
                        aria-invalid={Boolean(
                          fieldError(errors, `${prefix}.layout`)
                        )}
                        className={editorialInputClassName}
                      >
                        {definition.layouts.map((layout) => (
                          <option key={layout} value={layout}>
                            {layout}
                          </option>
                        ))}
                      </select>
                    </EditorialField>
                    <label className="border-border bg-background flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-xl border px-4 py-3 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                      <input
                        id={`${prefix}.visible`}
                        type="checkbox"
                        checked={section.visible}
                        onChange={(event) =>
                          updateSection(index, (current) => ({
                            ...current,
                            visible: event.target.checked,
                          }))
                        }
                        disabled={disabled}
                        className="size-4 accent-current"
                      />
                      {section.visible ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4" />
                      )}
                      <strong>{section.visible ? "Visible" : "Hidden"}</strong>
                    </label>
                  </div>

                  {source.mode !== "system" ? (
                    <div className="bg-muted/30 mt-5 rounded-xl p-4">
                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <EditorialField
                          path={`${prefix}.source.mode`}
                          label="Content source"
                          error={fieldError(errors, `${prefix}.source.mode`)}
                        >
                          <select
                            id={`${prefix}.source.mode`}
                            value={source.mode}
                            onChange={(event) =>
                              updateSection(
                                index,
                                (current) =>
                                  ({
                                    ...current,
                                    source:
                                      event.target.value === "curated"
                                        ? { mode: "curated", ids: [] }
                                        : {
                                            mode: "automatic",
                                            filter:
                                              current.kind === "legal-document"
                                                ? { type: routeKey }
                                                : {},
                                          },
                                  }) as TPageSection
                              )
                            }
                            disabled={disabled}
                            className={editorialInputClassName}
                          >
                            <option value="automatic">Automatic query</option>
                            <option value="curated">Curated IDs</option>
                          </select>
                        </EditorialField>
                        <EditorialField
                          path={`${prefix}.item_limit`}
                          label="Maximum items"
                          error={fieldError(errors, `${prefix}.item_limit`)}
                        >
                          <input
                            id={`${prefix}.item_limit`}
                            type="number"
                            min={1}
                            max={24}
                            value={section.item_limit ?? 1}
                            onChange={(event) =>
                              updateSection(
                                index,
                                (current) =>
                                  ({
                                    ...current,
                                    item_limit: Number(event.target.value),
                                  }) as TPageSection
                              )
                            }
                            disabled={
                              disabled || section.kind === "legal-document"
                            }
                            aria-invalid={Boolean(
                              fieldError(errors, `${prefix}.item_limit`)
                            )}
                            className={editorialInputClassName}
                          />
                        </EditorialField>
                      </div>
                      {source.mode === "curated" ? (
                        <div className="mt-5">
                          <EditorialField
                            path={`${prefix}.source.ids`}
                            label="Curated record IDs"
                            hint="One 24-character record ID per line. Order here is public order and cannot exceed the item limit."
                            error={fieldError(errors, `${prefix}.source.ids`)}
                          >
                            <textarea
                              id={`${prefix}.source.ids`}
                              value={source.ids.join("\n")}
                              onChange={(event) =>
                                updateSection(
                                  index,
                                  (current) =>
                                    ({
                                      ...current,
                                      source: {
                                        mode: "curated",
                                        ids: event.target.value
                                          .split(/[\n,]/)
                                          .map((value) =>
                                            value.trim().toLowerCase()
                                          )
                                          .filter(Boolean),
                                      },
                                    }) as TPageSection
                                )
                              }
                              disabled={disabled}
                              rows={5}
                              aria-invalid={Boolean(
                                fieldError(errors, `${prefix}.source.ids`)
                              )}
                              className={editorialTextareaClassName}
                            />
                          </EditorialField>
                        </div>
                      ) : (
                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          {definition.filterFields.map((filter) => {
                            const filterPath = `${prefix}.source.filter.${filter.key}`;
                            const value = source.filter[filter.key];
                            if (filter.type === "boolean")
                              return (
                                <EditorialField
                                  key={filter.key}
                                  path={filterPath}
                                  label={filter.label}
                                  error={fieldError(errors, filterPath)}
                                >
                                  <select
                                    id={filterPath}
                                    value={
                                      value === true
                                        ? "true"
                                        : value === false
                                          ? "false"
                                          : ""
                                    }
                                    onChange={(event) =>
                                      updateSection(index, (current) => {
                                        if (current.source.mode !== "automatic")
                                          return current;
                                        const next = {
                                          ...current.source.filter,
                                        };
                                        if (!event.target.value)
                                          delete next[filter.key];
                                        else
                                          next[filter.key] =
                                            event.target.value === "true";
                                        return {
                                          ...current,
                                          source: {
                                            mode: "automatic",
                                            filter: next,
                                          },
                                        } as TPageSection;
                                      })
                                    }
                                    disabled={disabled}
                                    className={editorialInputClassName}
                                  >
                                    <option value="">Any</option>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                </EditorialField>
                              );
                            return (
                              <EditorialField
                                key={filter.key}
                                path={filterPath}
                                label={filter.label}
                                error={fieldError(errors, filterPath)}
                              >
                                <select
                                  id={filterPath}
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(event) =>
                                    updateSection(index, (current) => {
                                      if (current.source.mode !== "automatic")
                                        return current;
                                      const next = { ...current.source.filter };
                                      if (!event.target.value)
                                        delete next[filter.key];
                                      else
                                        next[filter.key] = event.target.value;
                                      return {
                                        ...current,
                                        source: {
                                          mode: "automatic",
                                          filter: next,
                                        },
                                      } as TPageSection;
                                    })
                                  }
                                  disabled={
                                    disabled ||
                                    section.kind === "legal-document"
                                  }
                                  className={editorialInputClassName}
                                >
                                  <option value="">Any</option>
                                  {filter.options?.map((option) => (
                                    <option key={option} value={option}>
                                      {option.replaceAll("_", " ")}
                                    </option>
                                  ))}
                                </select>
                              </EditorialField>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted/30 mt-5 rounded-xl p-4 text-sm">
                      <strong>System source.</strong> This section reads from
                      the published Site contract and cannot accept arbitrary
                      record IDs or filters.
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </EditorialPanel>

      {preview ? (
        <StructuralPreview
          page={preview.page}
          expiresIn={preview.expiresIn}
          onClose={endPreview}
        />
      ) : null}

      <EditorialStickyActions
        dirty={dirty}
        busy={Boolean(busy)}
        canEdit={canEdit}
        onSave={save}
        onReset={() => {
          setDraft(cloneDraft(savedDraft));
          setErrors({});
          setNotice(null);
        }}
      >
        <Button
          type="button"
          variant="outline"
          onClick={startPreview}
          disabled={dirty || Boolean(busy)}
          isLoading={busy === "preview"}
        >
          <Eye className="size-4" />
          {dirty ? "Save before preview" : "Start secure preview"}
        </Button>
        {canPublish ? (
          <Button
            type="button"
            variant="success"
            onClick={publish}
            disabled={
              dirty || Boolean(busy) || publishedRevision === page.revision
            }
            isLoading={busy === "publish"}
          >
            <Send className="size-4" />
            {dirty
              ? "Save before publishing"
              : publishedRevision === page.revision
                ? "Current revision published"
                : "Publish revision"}
          </Button>
        ) : null}
      </EditorialStickyActions>
    </div>
  );
}
