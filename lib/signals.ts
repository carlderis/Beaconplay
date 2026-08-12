import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";

export type HelpType = "carry" | "coop" | "coaching";
export type SignalStatus = "pending" | "accepted" | "declined";

export type Signal = {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  toUid: string;
  game: string;
  activity: string;
  helpType: HelpType;
  status: SignalStatus;
  fireteamId?: string;
};

export async function sendSignal(params: {
  toUid: string;
  game: string;
  activity: string;
  helpType: HelpType;
}): Promise<{ signalId: string }> {
  const call = httpsCallable<typeof params, { status: string; signalId: string }>(
    functions,
    "sendSignal"
  );
  const result = await call(params);
  return { signalId: result.data.signalId };
}

export async function respondToSignal(
  signalId: string,
  response: "accepted" | "declined"
): Promise<{ fireteamId?: string }> {
  const call = httpsCallable<
    { signalId: string; response: "accepted" | "declined" },
    { status: string; response?: string; fireteamId?: string }
  >(functions, "respondToSignal");
  const result = await call({ signalId, response });
  return { fireteamId: result.data.fireteamId };
}

export function subscribeToIncomingSignals(
  uid: string,
  cb: (signals: Signal[]) => void
): () => void {
  const q = query(
    collection(db, "users", uid, "signalInbox"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Signal)));
  });
}

export function subscribeToSignalHistory(
  uid: string,
  cb: (signals: Signal[]) => void
): () => void {
  const q = query(
    collection(db, "users", uid, "signalInbox"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Signal)));
  });
}
