type UnknownRecord = Record<string, unknown>;

const PUBLIC_PLAIN_TEXT_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]+/g;

const toPublicPlainText = (value: unknown, maximumLength: number) => {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(PUBLIC_PLAIN_TEXT_CONTROL_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength)
    .trim();
  return normalized || undefined;
};

const copy = (value: unknown): UnknownRecord => ({
  ...(value as UnknownRecord),
});

export const toPublicProjectDto = (value: unknown): UnknownRecord => {
  const project = copy(value);
  delete project.publication_status;
  delete project.slug_history;

  const role = toPublicPlainText(project.role, 1_000);
  if (role) project.role = role;
  else delete project.role;

  project.outcomes = Array.isArray(project.outcomes)
    ? project.outcomes
        .map(copy)
        .filter((outcome) => outcome.verification_state !== "unverified")
        .map((outcome) => {
          delete outcome.evidence_reference;
          return outcome;
        })
    : [];

  if (project.live_url_visibility !== "public") delete project.live_url;
  if (project.source_url_visibility !== "public") delete project.source_url;
  delete project.live_url_visibility;
  delete project.source_url_visibility;
  return project;
};

export const toPublicArticleDto = (value: unknown): UnknownRecord => {
  const article = copy(value);
  delete article.status;
  delete article.slug_history;
  return article;
};
