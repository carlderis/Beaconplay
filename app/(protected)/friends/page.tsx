"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserProfile } from "@/lib/user";
import {
  Friend,
  FriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  subscribeToIncomingFriendRequests,
  subscribeToMyFriends,
} from "@/lib/friends";

export default function FriendsPage() {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((profile) => {
      if (profile) setUsername(profile.username);
    });
    const unsubFriends = subscribeToMyFriends(user.uid, setFriends);
    const unsubRequests = subscribeToIncomingFriendRequests(user.uid, setRequests);
    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, [user]);

  async function handleSendRequest(e: FormEvent) {
    e.preventDefault();
    if (!user || !searchEmail.trim() || sending) return;
    setSending(true);
    setMessage(null);
    const result = await sendFriendRequest(user.uid, username, searchEmail.trim());
    if ("error" in result) {
      setMessage(result.error);
    } else {
      setMessage("Friend request sent.");
      setSearchEmail("");
    }
    setSending(false);
  }

  async function handleAccept(request: FriendRequest) {
    await acceptFriendRequest(request, username);
  }

  async function handleDecline(requestId: string) {
    await declineFriendRequest(requestId);
  }

  if (!user) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-2xl font-bold">Friends</h1>

      <form onSubmit={handleSendRequest} className="flex gap-3">
        <input
          required
          placeholder="Search by email…"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          className="flex-1 rounded-md border border-white/20 bg-black px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {message && <p className="text-sm text-white/60">{message}</p>}

      {requests.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Pending Requests</h2>
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-white/10 p-3"
            >
              <p>{r.fromUsername}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(r)}
                  className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-black"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(r.id)}
                  className="rounded-md border border-white/20 px-3 py-1 text-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Your Friends</h2>
        {friends.length === 0 ? (
          <p className="text-white/40">No friends yet.</p>
        ) : (
          friends.map((f) => {
            const otherUid = f.users.find((uid) => uid !== user.uid);
            const otherName = (otherUid && f.usernames?.[otherUid]) ?? "Unknown";
            return (
              <div key={f.id} className="rounded-lg border border-white/10 p-3">
                <p className="text-white/80">{otherName}</p>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
