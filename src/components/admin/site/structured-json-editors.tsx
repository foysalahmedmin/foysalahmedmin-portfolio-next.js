"use client";

import {
  siteFinderSchema,
  siteFitSchema,
  siteWorkflowExampleSchema,
} from "@/app/api/site/site-content.validation";
import type { TSiteDraftSnapshot } from "@/app/api/site/site.type";
import type { TEditorErrors } from "@/components/admin/editorial-editor-primitives";
import { ValidatedJsonEditor } from "@/components/admin/site/validated-json-editor";

/**
 * The three JSON editors of the Site editor (workflow example, fit check, starting-point finder). They own the
 * only use of the Zod schemas on this page, so the Site editor loads this module on demand (`next/dynamic`) and
 * the schemas stay out of its first-load JavaScript.
 */
export function StructuredJsonEditors({
  draft,
  epoch,
  onDraftChange,
  onError,
  errors,
  disabled,
}: {
  draft: TSiteDraftSnapshot;
  epoch: number;
  onDraftChange: (next: TSiteDraftSnapshot) => void;
  onError: (path: string, message: string | undefined) => void;
  errors: TEditorErrors;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <ValidatedJsonEditor
        key={`workflow_example-${epoch}`}
        path="workflow_example"
        label="Workflow example"
        value={draft.workflow_example}
        schema={siteWorkflowExampleSchema}
        onChange={(workflow_example) =>
          onDraftChange({ ...draft, workflow_example })
        }
        onError={onError}
        errors={errors}
        disabled={disabled}
        allowEmpty
        hint='Illustrative only ("illustrative": true) with 2 to 8 nodes. Leave empty to remove it.'
      />
      <ValidatedJsonEditor
        key={`fit-${epoch}`}
        path="fit"
        label="Fit check"
        value={draft.fit}
        schema={siteFitSchema}
        onChange={(fit) => fit && onDraftChange({ ...draft, fit })}
        onError={onError}
        errors={errors}
        disabled={disabled}
        hint='"enabled", up to six "segments" and up to six "not_a_fit" lines. Enabling needs at least one segment.'
      />
      <ValidatedJsonEditor
        key={`finder-${epoch}`}
        path="finder"
        label="Starting-point finder"
        value={draft.finder}
        schema={siteFinderSchema}
        onChange={(finder) => finder && onDraftChange({ ...draft, finder })}
        onError={onError}
        errors={errors}
        disabled={disabled}
        hint='"enabled", up to four "steps" (2 to 6 tagged options each) and "outcomes" that point at enabled engagement model keys.'
      />
    </div>
  );
}
