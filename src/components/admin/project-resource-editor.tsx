"use client";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlHelper,
  FormControlLabel,
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
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";
import {
  getAuthorizedProjectReferences,
  PROJECT_RESOURCE_TYPES,
  type ProjectResourceAdminRecord,
  type ProjectResourceCreateInput,
  type ProjectResourceProject,
} from "@/services/project-resource-admin.service";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

type Props = Readonly<{
  resource: ProjectResourceAdminRecord | null;
  onClose: () => void;
  onSave: (input: ProjectResourceCreateInput) => Promise<void>;
}>;

type FormState = {
  project: string;
  sequence: string;
  type: ProjectResourceCreateInput["type"];
  title: string;
  url: string;
  description: string;
  isPrivate: boolean;
};

type FormErrors = Partial<Record<keyof FormState | "form", string>>;

const projectReference = (
  resource: ProjectResourceAdminRecord | null
): ProjectResourceProject | null =>
  resource?.project && typeof resource.project === "object"
    ? resource.project
    : null;

const projectId = (resource: ProjectResourceAdminRecord | null): string => {
  if (!resource?.project) return "";
  return typeof resource.project === "string"
    ? resource.project
    : resource.project._id;
};

const initialState = (
  resource: ProjectResourceAdminRecord | null
): FormState => ({
  project: projectId(resource),
  sequence: String(resource?.sequence ?? 1),
  type: resource?.type ?? "other",
  title: resource?.title ?? "",
  url: resource?.url ?? "",
  description: resource?.description ?? "",
  isPrivate: resource?.is_private ?? true,
});

const validate = (state: FormState): FormErrors => {
  const errors: FormErrors = {};
  const sequence = Number(state.sequence);
  if (!/^[0-9]+$/.test(state.sequence) || !Number.isSafeInteger(sequence)) {
    errors.sequence = "Use a whole-number sequence.";
  } else if (sequence < 1 || sequence > 1_000_000) {
    errors.sequence = "Sequence must be between 1 and 1,000,000.";
  }
  if (!/^[a-f0-9]{24}$/i.test(state.project)) {
    errors.project = "Choose an authorized active project.";
  }
  if (!state.title.trim()) errors.title = "Title is required.";
  else if (state.title.trim().length > 160)
    errors.title = "Title cannot exceed 160 characters.";
  if (!isAllowedPublicProjectUrl(state.url.trim())) {
    errors.url = "Use an allowlisted public HTTPS URL.";
  }
  if (state.description.trim().length > 300) {
    errors.description = "Description cannot exceed 300 characters.";
  }
  return errors;
};

const ProjectResourceEditor = ({ resource, onClose, onSave }: Props) => {
  const formId = useId();
  const editing = Boolean(resource);
  const [state, setState] = useState<FormState>(() => initialState(resource));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectOptions, setProjectOptions] = useState<
    ProjectResourceProject[]
  >(() => {
    const current = projectReference(resource);
    return current ? [current] : [];
  });
  const [selectedProject, setSelectedProject] =
    useState<ProjectResourceProject | null>(() => projectReference(resource));
  const [projectStatus, setProjectStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >(() => (editing ? "success" : "idle"));
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectRefreshKey, setProjectRefreshKey] = useState(0);

  useEffect(() => {
    if (editing) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setProjectStatus("loading");
      setProjectError(null);
      try {
        const response = await getAuthorizedProjectReferences(projectSearch, {
          signal: controller.signal,
        });
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || "Failed to load projects.");
        }
        setProjectOptions(
          response.data.map((project) => ({
            _id: project._id,
            name: project.name,
          }))
        );
        setProjectStatus("success");
      } catch (error) {
        if (controller.signal.aborted) return;
        setProjectStatus("error");
        setProjectError(
          error instanceof Error && error.message
            ? error.message
            : "Failed to load authorized projects."
        );
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [editing, projectRefreshKey, projectSearch]);

  const visibleProjectOptions = useMemo(() => {
    const options = new Map<string, ProjectResourceProject>();
    if (selectedProject) options.set(selectedProject._id, selectedProject);
    projectOptions.forEach((project) => options.set(project._id, project));
    return [...options.values()];
  }, [projectOptions, selectedProject]);

  const fieldId = (field: keyof FormState) => `${formId}-${field}`;
  const errorId = (field: keyof FormState) => `${fieldId(field)}-error`;
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !saving) onClose();
    },
    [onClose, saving]
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(state);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const firstField = Object.keys(nextErrors)[0] as keyof FormState;
      document.getElementById(fieldId(firstField))?.focus();
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await onSave({
        project: state.project,
        sequence: Number(state.sequence),
        type: state.type,
        title: state.title.trim(),
        url: state.url.trim(),
        description: state.description.trim(),
        is_private: state.isPrivate,
      });
    } catch (error) {
      setErrors({
        form:
          error instanceof Error && error.message
            ? error.message
            : "The resource could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen setIsOpen={handleOpenChange} size="lg">
      <ModalBackdrop className="grid p-4">
        <ModalContent className="max-h-[calc(100dvh-2rem)]">
          <form onSubmit={submit} noValidate>
            <ModalHeader>
              <div>
                <ModalTitle>
                  {editing ? "Edit project resource" : "New project resource"}
                </ModalTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Resource visibility is explicit. Private links never appear in
                  public project responses.
                </p>
              </div>
              <ModalCloseTrigger disabled={saving} />
            </ModalHeader>

            <ModalBody className="space-y-5">
              {errors.form ? (
                <p
                  role="alert"
                  className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-3 text-sm"
                >
                  {errors.form}
                </p>
              ) : null}

              {editing ? (
                <div className="border-border bg-muted/30 rounded-xl border p-4">
                  <p className="text-xs font-bold tracking-wider uppercase">
                    Project reference
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedProject?.name || state.project || "Unavailable"}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Existing resource references are immutable in this API.
                    Create a new resource to attach a different project.
                  </p>
                </div>
              ) : (
                <section
                  aria-labelledby={`${formId}-project-reference-heading`}
                  className="border-border rounded-xl border p-4"
                >
                  <h3
                    id={`${formId}-project-reference-heading`}
                    className="font-semibold"
                  >
                    Authorized project reference
                  </h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <FormControlLabel htmlFor={`${formId}-project-search`}>
                        Search projects
                      </FormControlLabel>
                      <FormControl
                        id={`${formId}-project-search`}
                        type="search"
                        value={projectSearch}
                        disabled={saving}
                        onChange={(event) =>
                          setProjectSearch(event.target.value.slice(0, 100))
                        }
                        placeholder="Search private admin project records"
                      />
                    </div>
                    <div>
                      <FormControlLabel htmlFor={fieldId("project")}>
                        Project
                      </FormControlLabel>
                      <FormControl
                        as="select"
                        id={fieldId("project")}
                        value={state.project}
                        disabled={saving || projectStatus === "loading"}
                        aria-invalid={Boolean(errors.project)}
                        aria-describedby={
                          errors.project ? errorId("project") : undefined
                        }
                        onChange={(event) => {
                          const project = visibleProjectOptions.find(
                            (option) => option._id === event.target.value
                          );
                          setSelectedProject(project ?? null);
                          setState((current) => ({
                            ...current,
                            project: event.target.value,
                          }));
                        }}
                      >
                        <option value="">Choose a project</option>
                        {visibleProjectOptions.map((project) => (
                          <option key={project._id} value={project._id}>
                            {project.name}
                          </option>
                        ))}
                      </FormControl>
                      {errors.project ? (
                        <FormControlError id={errorId("project")}>
                          {errors.project}
                        </FormControlError>
                      ) : null}
                    </div>
                  </div>
                  {projectStatus === "loading" ? (
                    <p
                      role="status"
                      className="text-muted-foreground mt-3 text-sm"
                    >
                      Loading authorized projects…
                    </p>
                  ) : projectStatus === "error" ? (
                    <div
                      role="alert"
                      className="text-destructive mt-3 flex flex-wrap items-center gap-3 text-sm"
                    >
                      <span>{projectError}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setProjectRefreshKey((value) => value + 1)
                        }
                      >
                        <RefreshCw aria-hidden="true" className="size-4" />
                        Retry project search
                      </Button>
                    </div>
                  ) : projectStatus === "success" &&
                    visibleProjectOptions.length === 0 ? (
                    <p className="text-muted-foreground mt-3 text-sm">
                      No authorized active projects match this search.
                    </p>
                  ) : null}
                </section>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <FormControlLabel htmlFor={fieldId("title")}>
                    Title
                  </FormControlLabel>
                  <FormControl
                    id={fieldId("title")}
                    value={state.title}
                    maxLength={160}
                    disabled={saving}
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={
                      errors.title ? errorId("title") : undefined
                    }
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                  {errors.title ? (
                    <FormControlError id={errorId("title")}>
                      {errors.title}
                    </FormControlError>
                  ) : null}
                </div>
                <div>
                  <FormControlLabel htmlFor={fieldId("type")}>
                    Resource type
                  </FormControlLabel>
                  <FormControl
                    as="select"
                    id={fieldId("type")}
                    value={state.type}
                    disabled={saving}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        type: event.target.value as FormState["type"],
                      }))
                    }
                  >
                    {PROJECT_RESOURCE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replaceAll("_", " ")}
                      </option>
                    ))}
                  </FormControl>
                </div>
                <div>
                  <FormControlLabel htmlFor={fieldId("url")}>
                    HTTPS resource URL
                  </FormControlLabel>
                  <FormControl
                    id={fieldId("url")}
                    type="url"
                    value={state.url}
                    maxLength={2048}
                    disabled={saving}
                    aria-invalid={Boolean(errors.url)}
                    aria-describedby={errors.url ? errorId("url") : undefined}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        url: event.target.value,
                      }))
                    }
                  />
                  {errors.url ? (
                    <FormControlError id={errorId("url")}>
                      {errors.url}
                    </FormControlError>
                  ) : null}
                </div>
                <div>
                  <FormControlLabel htmlFor={fieldId("sequence")}>
                    Sequence
                  </FormControlLabel>
                  <FormControl
                    id={fieldId("sequence")}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1_000_000}
                    step={1}
                    value={state.sequence}
                    disabled={saving}
                    aria-invalid={Boolean(errors.sequence)}
                    aria-describedby={
                      errors.sequence ? errorId("sequence") : undefined
                    }
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        sequence: event.target.value,
                      }))
                    }
                  />
                  {errors.sequence ? (
                    <FormControlError id={errorId("sequence")}>
                      {errors.sequence}
                    </FormControlError>
                  ) : null}
                </div>
              </div>

              <div>
                <FormControlLabel htmlFor={fieldId("description")}>
                  Description
                </FormControlLabel>
                <FormControl
                  as="textarea"
                  id={fieldId("description")}
                  value={state.description}
                  maxLength={300}
                  disabled={saving}
                  className="min-h-28 py-3"
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={
                    errors.description
                      ? errorId("description")
                      : `${fieldId("description")}-hint`
                  }
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
                <FormControlHelper id={`${fieldId("description")}-hint`}>
                  Optional plain-language context, up to 300 characters.
                </FormControlHelper>
                {errors.description ? (
                  <FormControlError id={errorId("description")}>
                    {errors.description}
                  </FormControlError>
                ) : null}
              </div>

              <label
                htmlFor={fieldId("isPrivate")}
                className="border-border bg-background flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-4"
              >
                <input
                  id={fieldId("isPrivate")}
                  type="checkbox"
                  checked={state.isPrivate}
                  disabled={saving}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      isPrivate: event.target.checked,
                    }))
                  }
                  className="mt-1 size-4 accent-current"
                />
                <span>
                  <strong className="block">Keep this resource private</strong>
                  <span className="text-muted-foreground mt-1 block text-xs leading-5">
                    Private is the safe creation default. Clear this only when
                    the destination is approved for public portfolio visitors.
                  </span>
                </span>
              </label>
            </ModalBody>

            <ModalFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={saving}>
                {editing ? "Save resource" : "Create resource"}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </ModalBackdrop>
    </Modal>
  );
};

export default ProjectResourceEditor;
