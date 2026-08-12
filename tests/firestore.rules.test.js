const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "beaconplay-4e87c",
    firestore: {
      rules: fs.readFileSync(
        path.join(__dirname, "..", "firestore.rules"),
        "utf8"
      ),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

test("user can read own profile", async () => {
  const alice = testEnv.authenticatedContext("alice");
  await assertSucceeds(alice.firestore().collection("users").doc("alice").get());
});

test("signed-in user can read another user's profile", async () => {
  const alice = testEnv.authenticatedContext("alice");
  await assertSucceeds(alice.firestore().collection("users").doc("bob").get());
});

test("unauthenticated user cannot read a profile", async () => {
  const anon = testEnv.unauthenticatedContext();
  await assertFails(anon.firestore().collection("users").doc("alice").get());
});

test("user cannot write another user's profile", async () => {
  const alice = testEnv.authenticatedContext("alice");
  await assertFails(
    alice.firestore().collection("users").doc("bob").set({ username: "hacked" })
  );
});

test("a signal participant can read the signal, but no one can write it directly", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const mallory = testEnv.authenticatedContext("mallory");

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .collection("signals")
      .doc("s1")
      .set({ fromUid: "alice", toUid: "bob", status: "pending" });
  });

  await assertSucceeds(alice.firestore().collection("signals").doc("s1").get());
  await assertFails(mallory.firestore().collection("signals").doc("s1").get());
  await assertFails(
    alice.firestore().collection("signals").doc("s1").update({ status: "accepted" })
  );
  await assertFails(
    alice.firestore().collection("signals").doc("s2").set({ fromUid: "alice", toUid: "bob" })
  );
});

test("only a signalInbox owner can read their inbox, and no one can write it directly", async () => {
  const bob = testEnv.authenticatedContext("bob");
  const mallory = testEnv.authenticatedContext("mallory");

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .collection("users")
      .doc("bob")
      .collection("signalInbox")
      .doc("s1")
      .set({ fromUid: "alice", toUid: "bob", status: "pending" });
  });

  await assertSucceeds(
    bob.firestore().collection("users").doc("bob").collection("signalInbox").doc("s1").get()
  );
  await assertFails(
    mallory.firestore().collection("users").doc("bob").collection("signalInbox").doc("s1").get()
  );
  await assertFails(
    bob
      .firestore()
      .collection("users")
      .doc("bob")
      .collection("signalInbox")
      .doc("s1")
      .update({ status: "accepted" })
  );
});

test("only a fireteam member can read it, and no one can write it directly", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const mallory = testEnv.authenticatedContext("mallory");

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .collection("fireteams")
      .doc("f1")
      .set({ members: ["alice", "bob"], createdBy: "alice" });
  });

  await assertSucceeds(alice.firestore().collection("fireteams").doc("f1").get());
  await assertFails(mallory.firestore().collection("fireteams").doc("f1").get());
  await assertFails(
    alice.firestore().collection("fireteams").doc("f1").update({ members: ["alice"] })
  );
  await assertFails(
    mallory.firestore().collection("fireteams").doc("f2").set({ members: ["mallory"] })
  );
});

test("only fireteam members can read/create messages, sent as themselves", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const mallory = testEnv.authenticatedContext("mallory");

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .collection("fireteams")
      .doc("f1")
      .set({ members: ["alice", "bob"], createdBy: "alice" });
  });

  await assertSucceeds(
    alice
      .firestore()
      .collection("fireteams")
      .doc("f1")
      .collection("messages")
      .add({ senderId: "alice", text: "hi" })
  );
  await assertFails(
    mallory
      .firestore()
      .collection("fireteams")
      .doc("f1")
      .collection("messages")
      .add({ senderId: "mallory", text: "hi" })
  );
  await assertFails(
    alice
      .firestore()
      .collection("fireteams")
      .doc("f1")
      .collection("messages")
      .add({ senderId: "bob", text: "spoofed" })
  );
});

test("any signed-in user can read beacons; only the creator can create/update/delete their own", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const mallory = testEnv.authenticatedContext("mallory");
  const anon = testEnv.unauthenticatedContext();

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection("beacons").doc("b1").set({ creatorId: "alice", game: "Destiny 2" });
  });

  await assertSucceeds(alice.firestore().collection("beacons").doc("b1").get());
  await assertFails(anon.firestore().collection("beacons").doc("b1").get());
  await assertSucceeds(
    alice.firestore().collection("beacons").add({ creatorId: "alice", game: "Destiny 2" })
  );
  await assertFails(
    mallory.firestore().collection("beacons").add({ creatorId: "alice", game: "Destiny 2" })
  );
  await assertSucceeds(
    alice.firestore().collection("beacons").doc("b1").update({ status: "closed" })
  );
  await assertFails(
    mallory.firestore().collection("beacons").doc("b1").update({ status: "closed" })
  );
});

test("only conversation participants can read/create it, and only participants can read/create messages sent as themselves", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const mallory = testEnv.authenticatedContext("mallory");

  await assertSucceeds(
    alice.firestore().collection("conversations").doc("c1").set({ participants: ["alice", "bob"] })
  );
  await assertFails(
    mallory.firestore().collection("conversations").doc("c2").set({ participants: ["alice", "bob"] })
  );
  await assertFails(mallory.firestore().collection("conversations").doc("c1").get());
  await assertSucceeds(alice.firestore().collection("conversations").doc("c1").get());

  await assertSucceeds(
    alice
      .firestore()
      .collection("conversations")
      .doc("c1")
      .collection("messages")
      .add({ senderId: "alice", text: "hi" })
  );
  await assertFails(
    mallory
      .firestore()
      .collection("conversations")
      .doc("c1")
      .collection("messages")
      .add({ senderId: "mallory", text: "hi" })
  );
  await assertFails(
    alice
      .firestore()
      .collection("conversations")
      .doc("c1")
      .collection("messages")
      .add({ senderId: "bob", text: "spoofed" })
  );
});

test("only sender/recipient can read a friend request; only the sender can create it", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const bob = testEnv.authenticatedContext("bob");
  const mallory = testEnv.authenticatedContext("mallory");

  await assertSucceeds(
    alice.firestore().collection("friendRequests").add({
      fromUserId: "alice",
      toUserId: "bob",
      status: "pending",
    })
  );
  await assertFails(
    mallory.firestore().collection("friendRequests").add({
      fromUserId: "alice",
      toUserId: "bob",
      status: "pending",
    })
  );

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .collection("friendRequests")
      .doc("r1")
      .set({ fromUserId: "alice", toUserId: "bob", status: "pending" });
  });

  await assertSucceeds(bob.firestore().collection("friendRequests").doc("r1").get());
  await assertFails(mallory.firestore().collection("friendRequests").doc("r1").get());
  await assertSucceeds(
    bob.firestore().collection("friendRequests").doc("r1").update({ status: "accepted" })
  );
  await assertFails(
    mallory.firestore().collection("friendRequests").doc("r1").update({ status: "accepted" })
  );
});

test("only members of a friends doc can read/write it", async () => {
  const alice = testEnv.authenticatedContext("alice");
  const mallory = testEnv.authenticatedContext("mallory");

  await assertSucceeds(
    alice.firestore().collection("friends").add({ users: ["alice", "bob"] })
  );
  await assertFails(
    mallory.firestore().collection("friends").add({ users: ["alice", "bob"] })
  );

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().collection("friends").doc("f1").set({ users: ["alice", "bob"] });
  });

  await assertSucceeds(alice.firestore().collection("friends").doc("f1").get());
  await assertFails(mallory.firestore().collection("friends").doc("f1").get());
});

test("notification_outbox and rate_limits are inaccessible to clients", async () => {
  const alice = testEnv.authenticatedContext("alice");

  await assertFails(
    alice.firestore().collection("notification_outbox").add({ recipientUid: "alice" })
  );
  await assertFails(alice.firestore().collection("rate_limits").doc("alice").get());
});

test("presence is readable by any signed-in user but only writable by the owner", async () => {
  const alice = testEnv.authenticatedContext("alice");

  await assertSucceeds(
    alice.firestore().collection("presence").doc("alice").set({ state: "online" })
  );
  await assertFails(
    alice.firestore().collection("presence").doc("bob").set({ state: "online" })
  );
  await assertSucceeds(alice.firestore().collection("presence").doc("bob").get());
});
