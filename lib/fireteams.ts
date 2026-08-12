import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

export type Fireteam = {
  id: string;
  game: string;
  activity: string;
  helpType: string;
  members: string[];
  leader: string;
  createdBy: string;
  status: string;
};

export type FireteamMessage = {
  id: string;
  senderId: string;
  text: string;
};

export function subscribeToMyFireteams(
  uid: string,
  cb: (fireteams: Fireteam[]) => void
): () => void {
  const q = query(
    collection(db, "fireteams"),
    where("members", "array-contains", uid)
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Fireteam)));
  });
}

export function subscribeToFireteam(
  fireteamId: string,
  cb: (fireteam: Fireteam | null) => void
): () => void {
  return onSnapshot(doc(db, "fireteams", fireteamId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Fireteam) : null);
  });
}

export function subscribeToFireteamMessages(
  fireteamId: string,
  cb: (messages: FireteamMessage[]) => void
): () => void {
  const q = query(
    collection(db, "fireteams", fireteamId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FireteamMessage)));
  });
}

export async function sendFireteamMessage(
  fireteamId: string,
  senderId: string,
  text: string
): Promise<void> {
  await addDoc(collection(db, "fireteams", fireteamId, "messages"), {
    senderId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function leaveFireteam(fireteamId: string): Promise<void> {
  const call = httpsCallable(functions, "leaveFireteam");
  await call({ fireteamId });
}

export async function deleteFireteam(fireteamId: string): Promise<void> {
  const call = httpsCallable(functions, "deleteFireteam");
  await call({ fireteamId });
}
