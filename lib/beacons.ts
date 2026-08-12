import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Platform } from "./user";

export const GOAL_TYPES = ["trophy", "raid", "ranked", "casual", "coop"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export type BeaconStatus = "open" | "closed";

export type Beacon = {
  id: string;
  creatorId: string;
  game: string;
  platform: Platform;
  goalType: GoalType;
  description: string;
  playersNeeded: number;
  status: BeaconStatus;
};

export async function getBeacons(): Promise<Beacon[]> {
  const q = query(collection(db, "beacons"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Beacon));
}

export async function postBeacon(params: {
  creatorId: string;
  game: string;
  platform: Platform;
  goalType: GoalType;
  description: string;
  playersNeeded: number;
}): Promise<void> {
  await addDoc(collection(db, "beacons"), {
    ...params,
    status: "open" as const,
    createdAt: serverTimestamp(),
  });
}

export async function closeBeacon(beaconId: string): Promise<void> {
  await updateDoc(doc(db, "beacons", beaconId), { status: "closed" });
}
