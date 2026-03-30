import { useEffect, useState } from "react";
import { AuthSession, getAuthSession, syncAuthSession } from "@/lib/auth";

export const useAuthSession = () => {
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const [loading, setLoading] = useState(() => !getAuthSession());

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const nextSession = await syncAuthSession();
      if (!mounted) {
        return;
      }
      setSession(nextSession);
      setLoading(false);
    };

    refresh();

    const handleFocus = () => {
      refresh();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      mounted = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return { session, loading, setSession };
};
