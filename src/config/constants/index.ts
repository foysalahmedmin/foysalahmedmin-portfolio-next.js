export type Language = {
  name: string;
  code: string;
  flag: string;
  [key: string]: unknown;
};

export const LANGUAGES: Record<string, Language> = {
  en: {
    name: "English",
    code: "en",
    flag: "/images/flags/usa.svg",
  },
  bn: {
    name: "Bangla",
    code: "bn",
    flag: "/images/flags/bn.svg",
  },
};
