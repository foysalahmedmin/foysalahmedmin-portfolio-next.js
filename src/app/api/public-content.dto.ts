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

/**
 * Detail routes hand these records straight to client components, which only
 * accept plain data; a JSON round trip turns ObjectIds and Dates into strings.
 */
const toPlain = (value: UnknownRecord): UnknownRecord =>
  JSON.parse(JSON.stringify(value)) as UnknownRecord;

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

export const toPublicVideoDto = (value: unknown): UnknownRecord => {
  const video = copy(value);
  delete video.status;
  delete video.slug_history;
  delete video.expired_at;
  delete video.layout;
  return toPlain(video);
};

export const toPublicCaseStudyDto = (value: unknown): UnknownRecord => {
  const caseStudy = copy(value);
  delete caseStudy.status;
  delete caseStudy.slug_history;
  delete caseStudy.expired_at;
  delete caseStudy.layout;

  // Client identity is private unless the author explicitly opted in.
  if (caseStudy.show_client_name !== true) delete caseStudy.client_name;
  delete caseStudy.show_client_name;

  caseStudy.outcomes = Array.isArray(caseStudy.outcomes)
    ? caseStudy.outcomes
        .map(copy)
        .filter((outcome) => outcome.verification_state !== "unverified")
        .map((outcome) => {
          delete outcome.evidence_reference;
          return outcome;
        })
    : [];

  if (caseStudy.live_url_visibility !== "public") delete caseStudy.live_url;
  if (caseStudy.source_url_visibility !== "public") delete caseStudy.source_url;
  delete caseStudy.live_url_visibility;
  delete caseStudy.source_url_visibility;
  return toPlain(caseStudy);
};
