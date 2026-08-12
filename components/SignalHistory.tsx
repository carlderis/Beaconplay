"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Signal, subscribeToSignalHistory } from "@/lib/signals";

const STATUS_STYLES: Record<Signal["status"], string> = {
  pending: "text-yellow-400",
  accepted: "text-green-400",
  declined: "text-red-400",
};

export default function SignalHistory() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToSignalHistory(user.uid, setSignals);
  }, [user]);

  if (signals.length === 0) {
    return <p className="text-sm text-white/50">No signals yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {signals.map((signal) => (
        <li
          key={signal.id}
          className="flex items-center justify-between rounded-lg border border-white/10 p-3 text-sm"
        >
          <span>
            {signal.fromDisplayName} · {signal.game}
          </span>
          <span className={STATUS_STYLES[signal.status]}>{signal.status}</span>
        </li>
      ))}
    </ul>
  );
}
