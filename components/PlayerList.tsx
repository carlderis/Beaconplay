"use client";

import { useState } from "react";
import { UserProfile } from "@/lib/user";
import { sendSignal, HelpType } from "@/lib/signals";

const HELP_TYPES: HelpType[] = ["coop", "carry", "coaching"];

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function PlayerCard({ player }: { player: UserProfile }) {
  const [expanded, setExpanded] = useState(false);
  const [game, setGame] = useState(player.gameTypes?.[0] ?? "");
  const [activity, setActivity] = useState("");
  const [helpType, setHelpType] = useState<HelpType>("coop");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await sendSignal({ toUid: player.uid, game, activity, helpType });
      setSent(true);
      setExpanded(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to send signal.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
          {initials(player.username)}
        </div>
        <div>
          <p className="font-semibold">{player.username}</p>
          <p className="text-xs text-white/50">
            {player.platform} · {player.region}
          </p>
        </div>
      </div>
      {player.gameTypes?.length ? (
        <p className="mt-2 text-sm text-white/60">{player.gameTypes.join(", ")}</p>
      ) : null}

      {sent ? (
        <p className="mt-3 text-sm text-green-400">Signal sent!</p>
      ) : expanded ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={game}
            onChange={(e) => setGame(e.target.value)}
            placeholder="Game"
            className="rounded-md border border-white/20 bg-black px-2 py-1 text-sm"
          />
          <input
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="What do you need help with?"
            className="rounded-md border border-white/20 bg-black px-2 py-1 text-sm"
          />
          <select
            value={helpType}
            onChange={(e) => setHelpType(e.target.value as HelpType)}
            className="rounded-md border border-white/20 bg-black px-2 py-1 text-sm"
          >
            {HELP_TYPES.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={sending || !game || !activity}
              className="flex-1 rounded-md bg-white px-3 py-1 text-sm font-semibold text-black disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send Signal"}
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="rounded-md border border-white/20 px-3 py-1 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 w-full rounded-md border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
        >
          Send Signal
        </button>
      )}
    </div>
  );
}

export default function PlayerList({ players }: { players: UserProfile[] }) {
  if (players.length === 0) {
    return <p className="text-white/60">No available players right now.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {players.map((p) => (
        <PlayerCard key={p.uid} player={p} />
      ))}
    </div>
  );
}
