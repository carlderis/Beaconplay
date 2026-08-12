import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type Conversation = {
  id: string;
  participants: string[];
  participantUsernames: Record<string, string>;
};

export type ConversationMessage = {
  id: string;
  senderId: string;
  text: string;
};

function conversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

export function subscribeToMyConversations(
  uid: string,
  cb: (conversations: Conversation[]) => void
): () => void {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid)
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation)));
  });
}

export function subscribeToConversationMessages(
  conversationId: string,
  cb: (messages: ConversationMessage[]) => void
): () => void {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ConversationMessage)));
  });
}

export async function startConversation(
  currentUid: string,
  currentUsername: string,
  recipientEmail: string
): Promise<{ conversationId: string } | { error: string }> {
  const snap = await getDocs(
    query(collection(db, "users"), where("email", "==", recipientEmail), limit(1))
  );

  if (snap.empty) {
    return { error: "No user found with that email." };
  }

  const recipientDoc = snap.docs[0];
  const recipientUid = recipientDoc.id;
  const recipientUsername = recipientDoc.data().username ?? recipientEmail;

  if (recipientUid === currentUid) {
    return { error: "You can't message yourself." };
  }

  const id = conversationId(currentUid, recipientUid);

  await setDoc(
    doc(db, "conversations", id),
    {
      participants: [currentUid, recipientUid],
      participantUsernames: {
        [currentUid]: currentUsername,
        [recipientUid]: recipientUsername,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { conversationId: id };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<void> {
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}
