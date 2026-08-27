"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AuthGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(pathname !== "/login");

  useEffect(() => {
    if (pathname === "/login") {
      setChecking(false);
      return undefined;
    }

    let mounted = true;
    setChecking(true);
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  if (pathname === "/login" || !checking) return children;
  return null;
}
