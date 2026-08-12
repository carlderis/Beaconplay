"use client";

import { FormEvent, useState } from "react";

export default function ChatComposer({
  onSend,
}: {
  onSend: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSend(text);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Message your fireteam…"
        className="flex-1 rounded-md border border-white/20 bg-black px-3 py-2 text-sm outline-none focus:border-white/50"
      />
      <button
        type="submit"
        disabled={sending || !text.trim()}
        className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
