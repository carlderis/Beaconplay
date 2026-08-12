"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Fireteam,
  FireteamMessage,
  deleteFireteam,
  leaveFireteam,
  sendFireteamMessage,
  subscribeToFireteam,
  subscribeToFireteamMessages,
} from "@/lib/fireteams";
import ChatMessageList from "@/components/ChatMessageList";
import ChatComposer from "@/components/ChatComposer";

export default function FireteamPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [fireteam, setFireteam] = useState<Fireteam | null | undefined>(undefined);
  const [messages, setMessages] = useState<FireteamMessage[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubTeam = subscribeToFireteam(id, setFireteam);
    const unsubMessages = subscribeToFireteamMessages(id, setMessages);
    return () => {
      unsubTeam();
      unsubMessages();
    };
  }, [id]);

  async function handleSend(text: string) {
    if (!user) return;
    await sendFireteamMessage(id, user.uid, text);
  }

  async function handleLeave() {
    setBusy(true);
    try {
      await leaveFireteam(id);
      router.replace("/fireteams");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteFireteam(id);
      router.replace("/fireteams");
    } finally {
      setBusy(false);
    }
  }

  if (fireteam === undefined) {
    return <p className="text-white/60">Loading…</p>;
  }

  if (fireteam === null) {
    return <p className="text-white/60">This fireteam no longer exists.</p>;
  }

  const isCreator = fireteam.createdBy === user?.uid;

  return (
    <div className="flex h-[70vh] flex-col gap-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h1 className="text-xl font-bold">{fireteam.game}</h1>
          <p className="text-sm text-white/60">{fireteam.activity}</p>
        </div>
        <div className="flex gap-2">
          {isCreator ? (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="rounded-md border border-red-400/40 px-3 py-1 text-sm text-red-400 hover:bg-red-400/10 disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <button
              onClick={handleLeave}
              disabled={busy}
              className="rounded-md border border-white/20 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-50"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {user && <ChatMessageList messages={messages} currentUid={user.uid} />}
      </div>

      <ChatComposer onSend={handleSend} />
    </div>
  );
}
