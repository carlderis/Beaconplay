"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { discoverPlayers } from "@/lib/discover";
import { UserProfile } from "@/lib/user";
import PlayerList from "@/components/PlayerList";

export default function DiscoverPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<UserProfile[] | null>(null);

  useEffect(() => {
    if (!user) return;
    discoverPlayers(user.uid).then(setPlayers);
  }, [user]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Discover Players</h1>
      {players === null ? (
        <p className="text-white/60">Loading…</p>
      ) : (
        <PlayerList players={players} />
      )}
    </div>
  );
}
