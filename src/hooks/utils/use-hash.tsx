import { useEffect, useState } from "react";

export const getCurrentHash = (): string =>
  typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";

export const useHash = (): { hash: string } => {
  const [hash, setHash] = useState<string>(getCurrentHash);

  useEffect(() => {
    const updateHash = () => setHash(getCurrentHash());

    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);
    return () => {
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
    };
  }, []);

  return { hash };
};
