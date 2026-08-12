import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile } from "./user";

export async function discoverPlayers(
  currentUid: string,
  maxResults = 25
): Promise<UserProfile[]> {
  const q = query(
    collection(db, "users"),
    where("onboardingComplete", "==", true),
    where("availability", "==", "available"),
    limit(maxResults)
  );

  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
    .filter((u) => u.uid !== currentUid);
}
