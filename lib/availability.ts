import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export async function setAvailability(
  available: boolean
): Promise<"available" | "unavailable"> {
  const call = httpsCallable<{ available: boolean }, { status: string; availability: "available" | "unavailable" }>(
    functions,
    "setAvailability"
  );
  const result = await call({ available });
  return result.data.availability;
}
