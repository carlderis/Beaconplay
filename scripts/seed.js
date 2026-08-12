/**
 * Seeds two test users into the Firestore/Auth emulators for local E2E testing.
 * Usage: firebase emulators:exec --only auth,firestore,functions "node scripts/seed.js"
 */
const admin = require("firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8081";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";

admin.initializeApp({ projectId: "beaconplay-4e87c" });
const auth = admin.auth();
const db = admin.firestore();

const USERS = [
  {
    uid: "guardian-one",
    email: "guardian-one@example.com",
    password: "password123",
    username: "GuardianOne",
    platform: "pc",
    region: "na-west",
    gameTypes: ["Destiny 2"],
  },
  {
    uid: "guardian-two",
    email: "guardian-two@example.com",
    password: "password123",
    username: "GuardianTwo",
    platform: "playstation",
    region: "na-west",
    gameTypes: ["Destiny 2"],
  },
];

async function ensureAuthUser(user) {
  try {
    await auth.createUser({
      uid: user.uid,
      email: user.email,
      password: user.password,
    });
  } catch (err) {
    if (err.code !== "auth/uid-already-exists") throw err;
  }
}

async function seed() {
  for (const user of USERS) {
    await ensureAuthUser(user);

    await db
      .collection("users")
      .doc(user.uid)
      .set(
        {
          uid: user.uid,
          email: user.email,
          username: user.username,
          platform: user.platform,
          region: user.region,
          gameTypes: user.gameTypes,
          onboardingComplete: true,
          availability: "available",
        },
        { merge: true }
      );

    console.log(`Seeded ${user.username} (${user.uid})`);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
