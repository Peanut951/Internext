import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import RequireAuth from "@/components/auth/RequireAuth";
import { useAuthSession } from "@/hooks/use-auth-session";

type RequirePortalHomeProps = {
  children: ReactNode;
};

const RequirePortalHome = ({ children }: RequirePortalHomeProps) => {
  const location = useLocation();
  const { session, loading } = useAuthSession();

  if (loading) {
    return <div className="min-h-[40vh] bg-background" />;
  }

  if (session?.role === "user") {
    return <Navigate to="/products" replace state={{ from: location }} />;
  }

  return <RequireAuth>{children}</RequireAuth>;
};

export default RequirePortalHome;
