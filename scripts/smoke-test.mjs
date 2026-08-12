/**
 * End-to-end smoke test against the local emulators, exercising the full
 * signal -> accept -> fireteam -> chat -> leave flow via the client SDK
 * (the same code paths the real app uses).
 *
 * Usage: firebase emulators:exec --only auth,firestore,functions "node scripts/smoke-test.mjs"
 */
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";

const config = { projectId: "beaconplay-4e87c", apiKey: "test-key" };

function makeClient(name) {
  const app = initializeApp(config, name);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8081);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  return { auth, db, functions };
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function main() {
  const guardianOne = makeClient("guardian-one");
  const guardianTwo = makeClient("guardian-two");

  await signInWithEmailAndPassword(guardianOne.auth, "guardian-one@example.com", "password123");
  await signInWithEmailAndPassword(guardianTwo.auth, "guardian-two@example.com", "password123");

  console.log("Signed in both test users.");

  const sendSignal = httpsCallable(guardianOne.functions, "sendSignal");
  const sendResult = await sendSignal({
    toUid: "guardian-two",
    game: "Destiny 2",
    activity: "Raid clear",
    helpType: "coop",
  });
  const signalId = sendResult.data.signalId;
  assert(signalId, "sendSignal should return a signalId");
  console.log(`Signal sent: ${signalId}`);

  const inboxSnap = await getDoc(
    doc(guardianTwo.db, "users", "guardian-two", "signalInbox", signalId)
  );
  assert(inboxSnap.exists(), "signal should appear in recipient's inbox");
  assert(inboxSnap.data().fromUid === "guardian-one", "inbox signal should have fromUid set");

  const respondToSignal = httpsCallable(guardianTwo.functions, "respondToSignal");
  const respondResult = await respondToSignal({ signalId, response: "accepted" });
  const fireteamId = respondResult.data.fireteamId;
  assert(fireteamId, "accepting a signal should create a fireteam");
  console.log(`Fireteam created: ${fireteamId}`);

  const fireteamSnap = await getDoc(doc(guardianOne.db, "fireteams", fireteamId));
  assert(fireteamSnap.exists(), "fireteam document should exist");
  const members = fireteamSnap.data().members;
  assert(
    members.includes("guardian-one") && members.includes("guardian-two"),
    "fireteam should include both members"
  );

  await addDoc(collection(guardianOne.db, "fireteams", fireteamId, "messages"), {
    senderId: "guardian-one",
    text: "GG, ready when you are.",
    createdAt: new Date(),
  });

  const messagesSnap = await getDocs(
    collection(guardianTwo.db, "fireteams", fireteamId, "messages")
  );
  assert(messagesSnap.size === 1, "recipient should be able to read the chat message");
  console.log("Chat message sent and read back successfully.");

  const leaveFireteam = httpsCallable(guardianTwo.functions, "leaveFireteam");
  await leaveFireteam({ fireteamId });

  const afterLeaveSnap = await getDoc(doc(guardianOne.db, "fireteams", fireteamId));
  assert(afterLeaveSnap.exists(), "fireteam should still exist with one member remaining");
  assert(
    afterLeaveSnap.data().members.length === 1,
    "fireteam should have one fewer member after leaving"
  );
  console.log("Leave fireteam verified.");

  console.log("\nSmoke test passed.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
