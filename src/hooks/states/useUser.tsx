"use client";

import type { UserState } from "@/types/state.type";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { useEffect, useState } from "react";

const COOKIE_KEY = "user";

const useUser = () => {
  const [user, setUserState] = useState<UserState | null>(null);

  useEffect(() => {
    const cookie = getCookie(COOKIE_KEY);
    if (cookie) {
      try {
        const user = JSON.parse(cookie as string);
        setUserState({ ...user, isAuthenticated: true });
      } catch {
        setUserState(null);
      }
    }
  }, []);

  const setUser = (user: UserState) => {
    setCookie(COOKIE_KEY, JSON.stringify(user), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    setUserState(user);
  };

  const clearUser = () => {
    deleteCookie(COOKIE_KEY);
    setUserState(null);
  };

  return {
    isLoading: false,
    user,
    setUser,
    clearUser,
  };
};

export default useUser;
