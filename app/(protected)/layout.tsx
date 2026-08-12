"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserProfile } from "@/lib/user";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (pathname === "/onboarding") {
      setCheckingProfile(false);
      return;
    }

    let cancelled = false;
    getUserProfile(user.uid).then((profile) => {
      if (cancelled) return;
      if (!profile?.onboardingComplete) {
        router.replace("/onboarding");
        return;
      }
      setCheckingProfile(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loading, user, pathname, router]);

  if (loading || !user || checkingProfile) {
    return <p className="text-center text-white/60">Loading…</p>;
  }

  return <>{children}</>;
}
