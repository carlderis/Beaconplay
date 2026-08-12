"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { completeOnboarding, PLATFORMS, Platform } from "@/lib/user";

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [platform, setPlatform] = useState<Platform>("pc");
  const [region, setRegion] = useState("");
  const [gameTypesInput, setGameTypesInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);
    try {
      const gameTypes = gameTypesInput
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      await completeOnboarding(user.uid, user.email, {
        username,
        platform,
        region,
        gameTypes,
      });

      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Failed to save your profile.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold">Set up your profile</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-white/70">
          Username
          <input
            required
            minLength={2}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-white/50"
          />
        </label>

        <fieldset className="flex flex-col gap-2 text-sm text-white/70">
          Platform
          <div className="flex gap-3">
            {PLATFORMS.map((p) => (
              <label key={p} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="platform"
                  checked={platform === p}
                  onChange={() => setPlatform(p)}
                />
                {p}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm text-white/70">
          Region
          <input
            required
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-white/50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-white/70">
          Games (comma separated)
          <input
            required
            value={gameTypesInput}
            onChange={(e) => setGameTypesInput(e.target.value)}
            placeholder="Destiny 2, Apex Legends"
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-white/50"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-white px-4 py-2 font-semibold text-black hover:bg-white/90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
