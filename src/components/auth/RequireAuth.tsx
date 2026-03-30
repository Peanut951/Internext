import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "@/hooks/use-auth-session";

type RequireAuthProps = {
  children: ReactNode;
};

const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();
  const { session, loading } = useAuthSession();

  if (loading) {
    return <div className="min-h-[40vh] bg-background" />;
  }

  if (!session) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
