"use client";

import Loading from "@/components/partials/Loading";
import useUser from "@/hooks/states/useUser";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface PrivateRouteProps {
  children: ReactNode;
}

const AuthWrapper = ({ children }: PrivateRouteProps) => {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user?.isAuthenticated) {
      router.replace(`/auth/sign-in?from=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading || (!user?.isAuthenticated && typeof window !== "undefined")) {
    return <Loading />;
  }

  return <>{children}</>;
};

export default AuthWrapper;
