"use client";

import Loading from "@/components/partials/loading";
import { RootState } from "@/redux/store";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useSelector } from "react-redux";

interface PrivateRouteProps {
  children: ReactNode;
}

const AuthWrapper = ({ children }: PrivateRouteProps) => {
  const isLoading = false;
  const { is_authenticated } = useSelector((store: RootState) => store.auth);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !is_authenticated) {
      router.replace(`/auth/sign-in?from=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, is_authenticated, pathname, router]);

  if (isLoading || (!is_authenticated && typeof window !== "undefined")) {
    return <Loading />;
  }

  return <>{children}</>;
};

export default AuthWrapper;
