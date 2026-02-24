import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuthSession, isAdminSession } from "@/lib/auth";

type RequireAdminProps = {
  children: ReactNode;
};

const RequireAdmin = ({ children }: RequireAdminProps) => {
  const location = useLocation();
  const session = getAuthSession();

  if (!isAdminSession(session)) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <>{children}</>;
};

export default RequireAdmin;
