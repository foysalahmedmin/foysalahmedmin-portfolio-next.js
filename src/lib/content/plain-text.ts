// Zod-free so client-reachable contracts can share the same plain-text rule as the server schemas.
export const SAFE_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;
export const SAFE_KEY_MAX_LENGTH = 64;

export const PLAIN_TEXT_MESSAGE =
  "Use plain text without markup or executable content";

export const isSafePlainText = (value: string): boolean =>
  !/[<>\u0000-\u001f\u007f]/.test(value) &&
  !/(?:javascript|data|vbscript)\s*:/i.test(value);
