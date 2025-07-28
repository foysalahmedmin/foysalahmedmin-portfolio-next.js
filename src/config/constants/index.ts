export type TLanguage = {
  name: string;
  code: string;
  flag: string;
  [key: string]: unknown;
};

export const LANGUAGES: Record<string, TLanguage> = {
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

export type TSocial = {
  name: string;
  href: string;
  icon: string;
  [key: string]: unknown;
};

export const SOCIALS = [
  {
    name: "Github",
    href: "https://github.com/foysalahmedmin",
    icon: "github",
  },
  {
    name: "Linkedin",
    href: "https://linkedin.com/in/foysalahmedmin",
    icon: "linkedin",
  },
  {
    name: "Facebook",
    href: "https://facebook.com/foysalahmedmin",
    icon: "facebook",
  }
];