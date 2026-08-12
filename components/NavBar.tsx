"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export default function NavBar() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          BEACON
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="text-white/70 hover:text-white">
                Dashboard
              </Link>
              <Link href="/discover" className="text-white/70 hover:text-white">
                Discover
              </Link>
              <Link href="/fireteams" className="text-white/70 hover:text-white">
                Fireteams
              </Link>
              <Link href="/beacons" className="text-white/70 hover:text-white">
                Beacons
              </Link>
              <Link href="/friends" className="text-white/70 hover:text-white">
                Friends
              </Link>
              <Link href="/messages" className="text-white/70 hover:text-white">
                Messages
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-md border border-white/20 px-3 py-1 text-white/70 hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-white/70 hover:text-white">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-white px-3 py-1 font-medium text-black hover:bg-white/90"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
