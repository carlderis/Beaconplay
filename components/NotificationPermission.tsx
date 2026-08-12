"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { requestNotificationPermission } from "@/lib/firebase-messaging";

export default function NotificationPermission() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "requesting" | "enabled" | "denied">(
    "idle"
  );

  async function handleEnable() {
    if (!user) return;
    setStatus("requesting");
    const token = await requestNotificationPermission(user.uid);
    setStatus(token ? "enabled" : "denied");
  }

  if (status === "enabled") {
    return <p className="text-sm text-white/50">Push notifications enabled.</p>;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 p-3 text-sm">
      <span className="text-white/70">
        Get notified the instant someone signals you.
      </span>
      <button
        onClick={handleEnable}
        disabled={status === "requesting"}
        className="rounded-md border border-white/20 px-3 py-1 hover:bg-white/10 disabled:opacity-50"
      >
        {status === "denied" ? "Permission denied" : "Enable notifications"}
      </button>
    </div>
  );
}
