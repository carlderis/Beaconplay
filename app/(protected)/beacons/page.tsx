"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { PLATFORMS, Platform } from "@/lib/user";
import { Beacon, GOAL_TYPES, GoalType, closeBeacon, getBeacons, postBeacon } from "@/lib/beacons";

const PLATFORM_FILTERS = ["all", ...PLATFORMS] as const;
const GOAL_FILTERS = ["all", ...GOAL_TYPES] as const;

export default function BeaconsPage() {
  const { user } = useAuth();
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [platformFilter, setPlatformFilter] = useState<(typeof PLATFORM_FILTERS)[number]>("all");
  const [goalFilter, setGoalFilter] = useState<(typeof GOAL_FILTERS)[number]>("all");
  const [search, setSearch] = useState("");

  const [game, setGame] = useState("");
  const [platform, setPlatform] = useState<Platform>("pc");
  const [goalType, setGoalType] = useState<GoalType>("trophy");
  const [description, setDescription] = useState("");
  const [playersNeeded, setPlayersNeeded] = useState(1);
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    const data = await getBeacons();
    setBeacons(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return beacons.filter((b) => {
      if (b.status !== "open") return false;
      if (platformFilter !== "all" && b.platform !== platformFilter) return false;
      if (goalFilter !== "all" && b.goalType !== goalFilter) return false;
      if (search && !b.game.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [beacons, platformFilter, goalFilter, search]);

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setPosting(true);
    try {
      await postBeacon({
        creatorId: user.uid,
        game: game.trim(),
        platform,
        goalType,
        description: description.trim(),
        playersNeeded,
      });
      setGame("");
      setDescription("");
      setPlayersNeeded(1);
      setShowForm(false);
      await load();
    } finally {
      setPosting(false);
    }
  }

  async function handleClose(beaconId: string) {
    await closeBeacon(beaconId);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Beacons</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
        >
          {showForm ? "View Feed" : "Light a Beacon"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handlePost}
          className="flex flex-col gap-3 rounded-lg border border-white/10 p-4"
        >
          <h2 className="text-lg font-semibold">Light your beacon</h2>
          <input
            required
            placeholder="Game title"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as GoalType)}
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm"
          >
            {GOAL_TYPES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Describe what you need"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-white/70">
            Players needed
            <input
              type="number"
              min={1}
              max={10}
              value={playersNeeded}
              onChange={(e) => setPlayersNeeded(Number(e.target.value))}
              className="w-20 rounded-md border border-white/20 bg-black px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={posting || !game.trim() || !description.trim()}
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {posting ? "Posting…" : "Post Beacon"}
          </button>
        </form>
      )}

      <div className="flex gap-3">
        <input
          placeholder="Search game…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-white/20 bg-black px-3 py-2 text-sm"
        />
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as (typeof PLATFORM_FILTERS)[number])}
          className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm"
        >
          {PLATFORM_FILTERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={goalFilter}
          onChange={(e) => setGoalFilter(e.target.value as (typeof GOAL_FILTERS)[number])}
          className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm"
        >
          {GOAL_FILTERS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-white/60">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-white/40">No beacons found.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((b) => (
            <div key={b.id} className="rounded-lg border border-white/10 p-4">
              <h3 className="text-lg font-bold">{b.game}</h3>
              <p className="text-sm text-white/60">
                {b.platform} · {b.goalType}
              </p>
              <p className="mt-2 text-white/80">{b.description}</p>
              <p className="mt-1 text-sm text-white/50">Players needed: {b.playersNeeded}</p>
              {b.creatorId === user?.uid && (
                <button
                  onClick={() => handleClose(b.id)}
                  className="mt-3 rounded-md border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
                >
                  Mark filled
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
