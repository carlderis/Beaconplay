import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type FriendRequestStatus = "pending" | "accepted" | "declined";

export type FriendRequest = {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  status: FriendRequestStatus;
};

export type Friend = {
  id: string;
  users: string[];
  usernames: Record<string, string>;
};

export function subscribeToIncomingFriendRequests(
  uid: string,
  cb: (requests: FriendRequest[]) => void
): () => void {
  const q = query(
    collection(db, "friendRequests"),
    where("toUserId", "==", uid),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FriendRequest)));
  });
}

export function subscribeToMyFriends(
  uid: string,
  cb: (friends: Friend[]) => void
): () => void {
  const q = query(collection(db, "friends"), where("users", "array-contains", uid));

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Friend)));
  });
}

export async function sendFriendRequest(
  fromUid: string,
  fromUsername: string,
  toEmail: string
): Promise<{ ok: true } | { error: string }> {
  const snap = await getDocs(
    query(collection(db, "users"), where("email", "==", toEmail), limit(1))
  );

  if (snap.empty) {
    return { error: "No user found with that email." };
  }

  const toUid = snap.docs[0].id;

  if (toUid === fromUid) {
    return { error: "You can't add yourself." };
  }

  await addDoc(collection(db, "friendRequests"), {
    fromUserId: fromUid,
    fromUsername,
    toUserId: toUid,
    status: "pending" as const,
  });

  return { ok: true };
}

export async function acceptFriendRequest(request: FriendRequest, myUsername: string): Promise<void> {
  await updateDoc(doc(db, "friendRequests", request.id), { status: "accepted" });
  await addDoc(collection(db, "friends"), {
    users: [request.fromUserId, request.toUserId],
    usernames: {
      [request.fromUserId]: request.fromUsername,
      [request.toUserId]: myUsername,
    },
  });
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, "friendRequests", requestId), { status: "declined" });
}
