"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserProfile, UserProfile } from "@/lib/user";
import AvailabilityToggle from "@/components/AvailabilityToggle";
import SignalsInbox from "@/components/SignalsInbox";
import SignalHistory from "@/components/SignalHistory";
import FireteamsList from "@/components/FireteamsList";
import NotificationPermission from "@/components/NotificationPermission";

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(setProfile);
  }, [user]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Welcome{profile ? `, ${profile.username}` : ""}
        </h1>
        <AvailabilityToggle initialAvailability={profile?.availability} />
      </div>

      <NotificationPermission />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Signals Inbox</h2>
          <SignalsInbox />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Your Fireteams</h2>
          <FireteamsList />
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Signal History</h2>
        <SignalHistory />
      </section>
    </div>
  );
}
