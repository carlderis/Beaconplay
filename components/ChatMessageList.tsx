"use client";

import { FireteamMessage } from "@/lib/fireteams";

export default function ChatMessageList({
  messages,
  currentUid,
}: {
  messages: FireteamMessage[];
  currentUid: string;
}) {
  if (messages.length === 0) {
    return <p className="text-sm text-white/50">No messages yet. Say hi!</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.map((m) => {
        const mine = m.senderId === currentUid;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                mine ? "bg-white text-black" : "bg-white/10 text-white"
              }`}
            >
              {m.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
