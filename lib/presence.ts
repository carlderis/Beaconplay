import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function setPresence(
  uid: string,
  state: "online" | "offline"
): Promise<void> {
  await setDoc(
    doc(db, "presence", uid),
    { state, lastChangedAt: serverTimestamp() },
    { merge: true }
  );
}
