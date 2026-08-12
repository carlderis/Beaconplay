import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export const PLATFORMS = ["playstation", "xbox", "pc"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type UserProfile = {
  uid: string;
  email: string | null;
  username: string;
  platform: Platform;
  region: string;
  gameTypes: string[];
  onboardingComplete: boolean;
  availability?: "available" | "unavailable";
  fireteams?: string[];
  fcmToken?: string;
};

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as UserProfile;
}

export async function completeOnboarding(
  uid: string,
  email: string | null,
  data: {
    username: string;
    platform: Platform;
    region: string;
    gameTypes: string[];
  }
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    {
      uid,
      email,
      username: data.username.trim(),
      platform: data.platform,
      region: data.region.trim(),
      gameTypes: data.gameTypes,
      onboardingComplete: true,
      availability: "unavailable",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
