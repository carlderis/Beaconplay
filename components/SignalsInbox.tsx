"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { respondToSignal, Signal, subscribeToIncomingSignals } from "@/lib/signals";

export default function SignalsInbox() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToIncomingSignals(user.uid, setSignals);
  }, [user]);

  async function handleRespond(signalId: string, response: "accepted" | "declined") {
    setRespondingTo(signalId);
    try {
      await respondToSignal(signalId, response);
    } finally {
      setRespondingTo(null);
    }
  }

  if (signals.length === 0) {
    return <p className="text-sm text-white/50">No pending signals.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {signals.map((signal) => (
        <li key={signal.id} className="rounded-lg border border-white/10 p-3">
          <p className="font-semibold">{signal.fromDisplayName}</p>
          <p className="text-sm text-white/60">
            {signal.game} · {signal.activity} · {signal.helpType}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handleRespond(signal.id, "accepted")}
              disabled={respondingTo === signal.id}
              className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-black disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={() => handleRespond(signal.id, "declined")}
              disabled={respondingTo === signal.id}
              className="rounded-md border border-white/20 px-3 py-1 text-sm disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
