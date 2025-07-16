"use client";

import { LANGUAGES } from "@/config";
import { getCookie, setCookie } from "cookies-next";
import { useEffect, useState } from "react";

const COOKIE_KEY = "language";
const FALLBACK_LANG = "en";

const useLanguage = () => {
  const [code, setCode] = useState<string>(FALLBACK_LANG);

  useEffect(() => {
    const stored = getCookie(COOKIE_KEY);
    if (typeof stored === "string" && LANGUAGES[stored]) {
      setCode(stored);
    }
  }, []);

  const setLanguage = (payload: string) => {
    if (LANGUAGES[payload]) {
      setCookie(COOKIE_KEY, payload, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
      setCode(payload);
    }
  };

  const toggleLanguage = () => {
    const next = code === "en" ? "bn" : "en";
    setLanguage(next);
  };

  const language = LANGUAGES[code] || {};
  const languages = Object.values(LANGUAGES);

  return { languages, language, code, setLanguage, toggleLanguage };
};

export default useLanguage;
