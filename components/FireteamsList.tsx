"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { Fireteam, subscribeToMyFireteams } from "@/lib/fireteams";

export default function FireteamsList() {
  const { user } = useAuth();
  const [fireteams, setFireteams] = useState<Fireteam[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeToMyFireteams(user.uid, setFireteams);
  }, [user]);

  if (fireteams.length === 0) {
    return <p className="text-sm text-white/50">No active fireteams yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {fireteams.map((team) => (
        <li key={team.id}>
          <Link
            href={`/fireteams/${team.id}`}
            className="block rounded-lg border border-white/10 p-3 hover:bg-white/5"
          >
            <p className="font-semibold">{team.game}</p>
            <p className="text-sm text-white/60">
              {team.activity} · {team.members.length} members
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
