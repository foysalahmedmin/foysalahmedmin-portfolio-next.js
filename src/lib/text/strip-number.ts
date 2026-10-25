/** Content sometimes numbers its own titles ("1. Understand the problem"); the public site never shows numbers in cards. */
export const stripLeadingNumber = (title: string): string =>
  title.replace(/^\s*\d+\s*[.):-]\s*/, "").trim() || title;
