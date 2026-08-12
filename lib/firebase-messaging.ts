import { doc, setDoc } from "firebase/firestore";
import { app, db } from "./firebase";

export async function requestNotificationPermission(
  uid: string
): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const { getMessaging, getToken } = await import("firebase/messaging");
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  if (token) {
    await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true });
  }

  return token ?? null;
}
