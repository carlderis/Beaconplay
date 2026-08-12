"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserProfile } from "@/lib/user";
import {
  Conversation,
  ConversationMessage,
  sendMessage,
  startConversation,
  subscribeToConversationMessages,
  subscribeToMyConversations,
} from "@/lib/messages";

export default function MessagesPage() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((profile) => {
      if (profile) setUsername(profile.username);
    });
    return subscribeToMyConversations(user.uid, setConversations);
  }, [user]);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    return subscribeToConversationMessages(activeConvId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
  }, [activeConvId]);

  async function handleStartConversation(e: FormEvent) {
    e.preventDefault();
    if (!user || !recipientEmail.trim()) return;
    setError(null);

    const result = await startConversation(user.uid, username, recipientEmail.trim());
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setActiveConvId(result.conversationId);
    setRecipientEmail("");
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!user || !activeConvId || !newMessage.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(activeConvId, user.uid, newMessage);
      setNewMessage("");
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const otherParticipantName = (conv: Conversation): string => {
    const otherUid = conv.participants.find((uid) => uid !== user.uid);
    return (otherUid && conv.participantUsernames?.[otherUid]) ?? "Unknown";
  };

  return (
    <div className="flex h-[70vh] gap-4">
      <div className="flex w-64 flex-col gap-3 border-r border-white/10 pr-4">
        <h2 className="text-lg font-semibold">Messages</h2>
        <form onSubmit={handleStartConversation} className="flex gap-2">
          <input
            placeholder="Email…"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="flex-1 rounded-md border border-white/20 bg-black px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-black"
          >
            +
          </button>
        </form>
        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConvId(c.id)}
              className={`rounded-md px-3 py-2 text-left text-sm ${
                activeConvId === c.id ? "bg-white text-black" : "hover:bg-white/10"
              }`}
            >
              {otherParticipantName(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {!activeConv ? (
          <div className="flex flex-1 items-center justify-center text-white/40">
            Select or start a conversation
          </div>
        ) : (
          <>
            <div className="border-b border-white/10 pb-3 font-semibold">
              {otherParticipantName(activeConv)}
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {messages.map((m) => {
                const mine = m.senderId === user.uid;
                return (
                  <div key={m.id} className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}>
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
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-white/10 pt-3">
              <input
                placeholder="Type a message…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 rounded-md border border-white/20 bg-black px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
