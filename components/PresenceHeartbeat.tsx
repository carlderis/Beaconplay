"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { setPresence } from "@/lib/presence";

const HEARTBEAT_INTERVAL_MS = 60_000;

export default function PresenceHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const markOnline = () => setPresence(user.uid, "online");
    const markOffline = () => setPresence(user.uid, "offline");

    markOnline();
    const interval = setInterval(markOnline, HEARTBEAT_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") markOnline();
      else markOffline();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", markOffline);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
    };
  }, [user]);

  return null;
}
