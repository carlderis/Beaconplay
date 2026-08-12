"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOutbox = exports.deleteFireteam = exports.leaveFireteam = exports.respondToSignal = exports.sendSignal = exports.setAvailability = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const logger = __importStar(require("firebase-functions/logger"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const USERS = "users";
const SIGNALS = "signals";
const FIRETEAMS = "fireteams";
const OUTBOX = "notification_outbox";
const RATE_LIMITS = "rate_limits";
const OUTBOX_BATCH_SIZE = 50;
const MAX_ATTEMPTS = 10;
const SIGNAL_RATE_LIMIT_MAX = 10;
const SIGNAL_RATE_LIMIT_WINDOW_SECONDS = 60;
function nowTs() {
    return firestore_1.Timestamp.now();
}
function backoffSeconds(attempts) {
    const schedule = [5, 15, 45, 120, 300, 900];
    return schedule[Math.min(attempts, schedule.length - 1)];
}
async function enqueueOutbox(params) {
    const { type, recipientUid, dedupeKey, payload } = params;
    const ref = db.collection(OUTBOX).doc(dedupeKey);
    const doc = {
        id: dedupeKey,
        type,
        status: "queued",
        recipientUid,
        dedupeKey,
        payload,
        attempts: 0,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        lastError: null,
        nextAttemptAt: nowTs(),
    };
    await ref.set(doc, { merge: true });
}
function enqueueOutboxTx(tx, params) {
    const { type, recipientUid, dedupeKey, payload } = params;
    const ref = db.collection(OUTBOX).doc(dedupeKey);
    const doc = {
        id: dedupeKey,
        type,
        status: "queued",
        recipientUid,
        dedupeKey,
        payload,
        attempts: 0,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        lastError: null,
        nextAttemptAt: nowTs(),
    };
    tx.set(ref, doc, { merge: true });
}
/**
 * Fixed-window rate limiter. Throws `resource-exhausted` if the caller has
 * exceeded SIGNAL_RATE_LIMIT_MAX signals within the current window.
 */
async function checkAndConsumeSignalRateLimit(uid) {
    const ref = db.collection(RATE_LIMITS).doc(uid);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const now = Date.now();
        const data = snap.exists ? snap.data() : null;
        const windowStartMs = data?.windowStart?.toMillis?.() ?? 0;
        const windowAgeSeconds = (now - windowStartMs) / 1000;
        if (!data || windowAgeSeconds >= SIGNAL_RATE_LIMIT_WINDOW_SECONDS) {
            tx.set(ref, {
                windowStart: firestore_1.Timestamp.fromMillis(now),
                count: 1,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            return;
        }
        if (data.count >= SIGNAL_RATE_LIMIT_MAX) {
            throw new https_1.HttpsError("resource-exhausted", "You're sending signals too quickly. Please wait a moment and try again.");
        }
        tx.set(ref, { count: data.count + 1, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    });
}
exports.setAvailability = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to set your availability.");
    }
    const uid = request.auth.uid;
    const available = request.data?.available;
    if (typeof available !== "boolean") {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with a boolean `available` field.");
    }
    const availability = available ? "available" : "unavailable";
    await db.collection(USERS).doc(uid).set({
        availability,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { status: "success", availability };
});
const VALID_HELP_TYPES = ["carry", "coop", "coaching"];
exports.sendSignal = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to send a signal.");
    }
    const fromUid = request.auth.uid;
    const toUid = request.data?.toUid;
    const game = request.data?.game;
    const activity = request.data?.activity;
    const helpTypeRaw = request.data?.helpType;
    const helpType = VALID_HELP_TYPES.includes(helpTypeRaw)
        ? helpTypeRaw
        : "coop";
    if (typeof toUid !== "string" || toUid.trim().length < 3) {
        throw new https_1.HttpsError("invalid-argument", "`toUid` must be a valid string.");
    }
    if (typeof game !== "string" || game.trim().length < 2) {
        throw new https_1.HttpsError("invalid-argument", "`game` must be a valid string.");
    }
    if (typeof activity !== "string" || activity.trim().length < 2) {
        throw new https_1.HttpsError("invalid-argument", "`activity` must be a valid string.");
    }
    if (toUid === fromUid) {
        throw new https_1.HttpsError("invalid-argument", "You cannot send a signal to yourself.");
    }
    await checkAndConsumeSignalRateLimit(fromUid);
    const fromSnap = await db.collection(USERS).doc(fromUid).get();
    const fromDisplayName = (fromSnap.exists ? fromSnap.data()?.username : null) ?? "Guardian";
    const signalRef = db.collection(SIGNALS).doc();
    const signalId = signalRef.id;
    const baseSignal = {
        id: signalId,
        fromUid,
        fromDisplayName,
        toUid,
        game: game.trim(),
        activity: activity.trim(),
        helpType,
        status: "pending",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await Promise.all([
        signalRef.set(baseSignal),
        db
            .collection(USERS)
            .doc(toUid)
            .collection("signalInbox")
            .doc(signalId)
            .set(baseSignal, { merge: true }),
        db
            .collection(USERS)
            .doc(fromUid)
            .collection("signalSent")
            .doc(signalId)
            .set(baseSignal, { merge: true }),
    ]);
    await enqueueOutbox({
        type: "signal_received",
        recipientUid: toUid,
        dedupeKey: `signal_received_${toUid}_${signalId}`,
        payload: {
            signalId,
            fromUid,
            fromDisplayName,
            game: game.trim(),
            activity: activity.trim(),
            helpType,
        },
    });
    return { status: "success", signalId };
});
exports.respondToSignal = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to respond to a signal.");
    }
    const toUid = request.auth.uid;
    const signalId = request.data?.signalId;
    const response = request.data?.response;
    if (typeof signalId !== "string" || signalId.trim().length < 6) {
        throw new https_1.HttpsError("invalid-argument", "`signalId` must be a valid string.");
    }
    if (response !== "accepted" && response !== "declined") {
        throw new https_1.HttpsError("invalid-argument", "`response` must be 'accepted' or 'declined'.");
    }
    const trimmedSignalId = signalId.trim();
    const signalRef = db.collection(SIGNALS).doc(trimmedSignalId);
    const inboxRef = db
        .collection(USERS)
        .doc(toUid)
        .collection("signalInbox")
        .doc(trimmedSignalId);
    const fireteamId = trimmedSignalId;
    const fireteamRef = db.collection(FIRETEAMS).doc(fireteamId);
    const result = await db.runTransaction(async (tx) => {
        const signalSnap = await tx.get(signalRef);
        if (!signalSnap.exists) {
            throw new https_1.HttpsError("not-found", "Signal not found.");
        }
        const signal = signalSnap.data();
        if (signal.toUid !== toUid) {
            throw new https_1.HttpsError("permission-denied", "You are not the recipient of this signal.");
        }
        if (signal.status !== "pending") {
            return {
                status: "noop",
                currentStatus: signal.status,
                fireteamId: signal.fireteamId ?? null,
            };
        }
        const fromUid = signal.fromUid;
        const game = signal.game ?? "Unknown Game";
        const activity = signal.activity ?? "";
        const helpType = signal.helpType ?? "coop";
        const fromSentRef = db
            .collection(USERS)
            .doc(fromUid)
            .collection("signalSent")
            .doc(trimmedSignalId);
        tx.set(signalRef, { status: response, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        tx.set(inboxRef, { status: response, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        tx.set(fromSentRef, { status: response, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        enqueueOutboxTx(tx, {
            type: "signal_responded",
            recipientUid: fromUid,
            dedupeKey: `signal_responded_${fromUid}_${trimmedSignalId}`,
            payload: {
                signalId: trimmedSignalId,
                toUid,
                response,
            },
        });
        if (response === "accepted") {
            tx.set(fireteamRef, {
                id: fireteamId,
                game,
                goalType: activity,
                helpType,
                activity,
                members: [fromUid, toUid],
                leader: fromUid,
                createdBy: fromUid,
                status: "open",
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
            tx.set(signalRef, { fireteamId }, { merge: true });
            tx.set(db.collection(USERS).doc(fromUid), {
                fireteams: firestore_1.FieldValue.arrayUnion(fireteamId),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
            tx.set(db.collection(USERS).doc(toUid), {
                fireteams: firestore_1.FieldValue.arrayUnion(fireteamId),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
            enqueueOutboxTx(tx, {
                type: "fireteam_created",
                recipientUid: fromUid,
                dedupeKey: `fireteam_created_${fromUid}_${fireteamId}`,
                payload: { fireteamId, game, activity, members: [fromUid, toUid] },
            });
            enqueueOutboxTx(tx, {
                type: "fireteam_created",
                recipientUid: toUid,
                dedupeKey: `fireteam_created_${toUid}_${fireteamId}`,
                payload: { fireteamId, game, activity, members: [fromUid, toUid] },
            });
            return { status: "success", response, fireteamId };
        }
        return { status: "success", response };
    });
    return result;
});
exports.leaveFireteam = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to leave a fireteam.");
    }
    const uid = request.auth.uid;
    const fireteamId = request.data?.fireteamId;
    if (typeof fireteamId !== "string" || fireteamId.trim().length < 1) {
        throw new https_1.HttpsError("invalid-argument", "`fireteamId` must be a valid string.");
    }
    const fireteamRef = db.collection(FIRETEAMS).doc(fireteamId.trim());
    const { remainingMembers } = await db.runTransaction(async (tx) => {
        const snap = await tx.get(fireteamRef);
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", "Fireteam not found.");
        }
        const data = snap.data();
        const members = data.members ?? [];
        if (!members.includes(uid)) {
            throw new https_1.HttpsError("permission-denied", "You are not a member of this fireteam.");
        }
        const remaining = members.filter((m) => m !== uid);
        tx.set(db.collection(USERS).doc(uid), {
            fireteams: firestore_1.FieldValue.arrayRemove(fireteamId.trim()),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        if (remaining.length === 0) {
            tx.delete(fireteamRef);
        }
        else {
            const leader = data.leader === uid ? remaining[0] : data.leader;
            tx.set(fireteamRef, { members: remaining, leader, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        }
        return { remainingMembers: remaining };
    });
    if (remainingMembers.length === 0) {
        await db.recursiveDelete(fireteamRef);
    }
    return { status: "success" };
});
exports.deleteFireteam = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to delete a fireteam.");
    }
    const uid = request.auth.uid;
    const fireteamId = request.data?.fireteamId;
    if (typeof fireteamId !== "string" || fireteamId.trim().length < 1) {
        throw new https_1.HttpsError("invalid-argument", "`fireteamId` must be a valid string.");
    }
    const fireteamRef = db.collection(FIRETEAMS).doc(fireteamId.trim());
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(fireteamRef);
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", "Fireteam not found.");
        }
        const data = snap.data();
        if (data.createdBy !== uid) {
            throw new https_1.HttpsError("permission-denied", "Only the fireteam's creator can delete it.");
        }
        const members = data.members ?? [];
        for (const member of members) {
            tx.set(db.collection(USERS).doc(member), {
                fireteams: firestore_1.FieldValue.arrayRemove(fireteamId.trim()),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        tx.delete(fireteamRef);
    });
    await db.recursiveDelete(fireteamRef);
    return { status: "success" };
});
function getNotificationPayload(doc) {
    const { type, payload } = doc;
    switch (type) {
        case "signal_received":
            return {
                notification: {
                    title: "New Signal!",
                    body: `${payload.fromDisplayName} needs help with ${payload.game}: ${payload.activity}`,
                },
            };
        case "signal_responded":
            return {
                notification: {
                    title: "Signal Response",
                    body: `Your signal was ${payload.response}.`,
                },
            };
        case "fireteam_created":
            return {
                notification: {
                    title: "Fireteam Created!",
                    body: `You are now in a fireteam for ${payload.game}.`,
                },
            };
        default:
            return null;
    }
}
exports.processOutbox = (0, scheduler_1.onSchedule)("every 1 minutes", async (event) => {
    const now = nowTs();
    const snap = await db
        .collection(OUTBOX)
        .where("status", "in", ["queued", "sending"])
        .where("nextAttemptAt", "<=", now)
        .orderBy("nextAttemptAt", "asc")
        .limit(OUTBOX_BATCH_SIZE)
        .get();
    if (snap.empty) {
        logger.info("Outbox: no queued items ready");
        return;
    }
    logger.info("Outbox: processing batch", { count: snap.size });
    for (const docSnap of snap.docs) {
        const ref = docSnap.ref;
        const locked = await db.runTransaction(async (tx) => {
            const fresh = await tx.get(ref);
            if (!fresh.exists)
                return false;
            const data = fresh.data();
            if (data.status !== "queued")
                return false;
            if (data.lockedAt)
                return false;
            tx.set(ref, {
                status: "sending",
                lockedAt: firestore_1.FieldValue.serverTimestamp(),
                lastAttemptAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                lastError: null,
            }, { merge: true });
            return true;
        });
        if (!locked)
            continue;
        try {
            const latest = await ref.get();
            const data = latest.data();
            const userSnap = await db.collection(USERS).doc(data.recipientUid).get();
            const fcmToken = userSnap.data()?.fcmToken;
            if (!fcmToken) {
                logger.warn("Outbox: No FCM token for user.", { uid: data.recipientUid });
                await ref.set({ status: "no_token", lockedAt: firestore_1.FieldValue.delete() }, { merge: true });
                continue;
            }
            const messagePayload = getNotificationPayload(data);
            if (!messagePayload) {
                logger.warn("Outbox: Unknown notification type.", { type: data.type, id: latest.id });
                await ref.set({ status: "failed", lastError: "Unknown notification type" }, { merge: true });
                continue;
            }
            await (0, messaging_1.getMessaging)().send({ token: fcmToken, ...messagePayload });
            logger.info("Outbox: Push notification sent.", { id: latest.id });
            await ref.set({
                status: "sent",
                deliveredAt: firestore_1.FieldValue.serverTimestamp(),
                lockedAt: firestore_1.FieldValue.delete(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        catch (err) {
            const msg = err?.message ?? String(err);
            await db.runTransaction(async (tx) => {
                const fresh = await tx.get(ref);
                if (!fresh.exists)
                    return;
                const currentAttempts = Number(fresh.data()?.attempts ?? 0);
                const nextAttempts = currentAttempts + 1;
                if (nextAttempts >= MAX_ATTEMPTS) {
                    tx.set(ref, {
                        status: "failed",
                        attempts: nextAttempts,
                        lastError: msg,
                        lockedAt: firestore_1.FieldValue.delete(),
                        updatedAt: firestore_1.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    return;
                }
                const delay = backoffSeconds(currentAttempts);
                const nextAttemptAt = firestore_1.Timestamp.fromMillis(Date.now() + delay * 1000);
                tx.set(ref, {
                    status: "queued",
                    attempts: nextAttempts,
                    nextAttemptAt,
                    lastError: msg,
                    lockedAt: firestore_1.FieldValue.delete(),
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                }, { merge: true });
            });
            logger.error("Outbox delivery failed", { id: docSnap.id, msg });
        }
    }
    return;
});
