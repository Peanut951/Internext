import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAdminSession } from "@/lib/auth";
import { useAuthSession } from "@/hooks/use-auth-session";

type RequireAdminProps = {
  children: ReactNode;
};

const RequireAdmin = ({ children }: RequireAdminProps) => {
  const location = useLocation();
  const { session, loading } = useAuthSession();

  if (loading) {
    return <div className="min-h-[40vh] bg-background" />;
  }

  if (!isAdminSession(session)) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <>{children}</>;
};

export default RequireAdmin;
