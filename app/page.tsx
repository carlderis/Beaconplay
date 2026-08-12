"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col items-center gap-8 py-16 text-center">
      <h1 className="text-5xl font-bold tracking-tight">
        Find your next teammate.
      </h1>
      <p className="max-w-xl text-white/60">
        Beacon is a console-first matchmaking platform. Signal your intent to
        play, get matched on mutual interest, and jump into a fireteam with
        real-time chat.
      </p>
      {!loading && (
        <Link
          href={user ? "/dashboard" : "/signup"}
          className="rounded-md bg-white px-6 py-3 font-semibold text-black hover:bg-white/90"
        >
          {user ? "Go to Dashboard" : "Get Started"}
        </Link>
      )}
    </div>
  );
}
