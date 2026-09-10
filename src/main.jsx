import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  initializeApp
} from "firebase/app";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from "firebase/auth";

import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let firebaseApp;
let auth;
let db;
let storage;

try {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);
} catch (e) {
  console.error("Firebase initialization error:", e);
}

/* =========================================================
   HELPERS
========================================================= */

const TABS = ["chats", "stories", "calls", "people"];

function timeText(value) {
  if (!value) return "";
  const d =
    typeof value?.toDate === "function"
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function dateTimeText(value) {
  if (!value) return "";
  const d =
    typeof value?.toDate === "function"
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizePhone(value = "") {
  return value.replace(/[^\d]/g, "");
}

function chatIdFor(a, b) {
  return [a, b].sort().join("_");
}

function otherMember(chat, uid) {
  return (chat.members || []).find((x) => x !== uid);
}

function safeName(user) {
  return (
    user?.displayName ||
    user?.username ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "User"
  );
}

function messageStatus(message, uid) {
  if (message.senderId !== uid) return "";

  if ((message.seenBy || []).includes(uid) === false) {
    if ((message.seenBy || []).some((x) => x !== uid)) return "seen";
  }

  if ((message.deliveredTo || []).some((x) => x !== uid)) {
    return "delivered";
  }

  return "sent";
}

function formatMessagePreview(message) {
  if (!message) return "";
  if (message.type === "image") return "📷 Photo";
  if (message.type === "video") return "🎥 Video";
  if (message.type === "audio") return "🎤 Voice message";
  return message.text || "";
}

/* =========================================================
   GLOBAL STYLES
========================================================= */

function Styles() {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      html,
      body,
      #root {
        margin: 0;
        min-height: 100%;
        width: 100%;
        font-family: Inter, Arial, Helvetica, sans-serif;
        background: #f4f7fb;
        color: #172033;
      }

      button,
      input,
      textarea {
        font: inherit;
      }

      button {
        cursor: pointer;
      }

      .app {
        min-height: 100vh;
        background: linear-gradient(135deg, #f7f9fc, #edf3fa);
      }

      .topbar {
        height: 64px;
        background: rgba(255,255,255,.96);
        border-bottom: 1px solid #e4e9f1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 18px;
        position: sticky;
        top: 0;
        z-index: 50;
        backdrop-filter: blur(10px);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 800;
        font-size: 22px;
        letter-spacing: -.5px;
      }

      .brandMark {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: #111827;
        color: white;
        font-size: 17px;
      }

      .topActions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .iconBtn {
        width: 40px;
        height: 40px;
        border: 1px solid #e1e6ee;
        background: white;
        border-radius: 12px;
        display: grid;
        place-items: center;
        color: #334155;
        transition: .18s;
      }

      .iconBtn:hover {
        background: #f1f5f9;
        transform: translateY(-1px);
      }

      .mainWrap {
        width: min(1180px, 100%);
        margin: auto;
        padding: 18px;
      }

      .nav {
        display: flex;
        gap: 7px;
        padding: 7px;
        background: white;
        border: 1px solid #e4e9f1;
        border-radius: 17px;
        margin-bottom: 16px;
        overflow-x: auto;
        position: sticky;
        top: 72px;
        z-index: 20;
      }

      .nav button {
        flex: 1;
        min-width: 90px;
        border: 0;
        padding: 11px 13px;
        border-radius: 12px;
        background: transparent;
        color: #64748b;
        font-weight: 700;
        white-space: nowrap;
      }

      .nav button.active {
        background: #111827;
        color: white;
      }

      .page {
        background: white;
        border: 1px solid #e3e8f0;
        border-radius: 20px;
        min-height: calc(100vh - 160px);
        overflow: hidden;
        box-shadow: 0 10px 35px rgba(15,23,42,.05);
      }

      .pageHead {
        padding: 18px;
        border-bottom: 1px solid #edf0f5;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .pageTitle {
        font-size: 20px;
        font-weight: 800;
      }

      .subtle {
        color: #718096;
        font-size: 13px;
      }

      .searchBox {
        display: flex;
        gap: 8px;
        padding: 14px 18px;
        border-bottom: 1px solid #edf0f5;
      }

      .input {
        width: 100%;
        border: 1px solid #dce2ea;
        background: #fafbfc;
        padding: 11px 13px;
        border-radius: 12px;
        outline: none;
      }

      .input:focus,
      textarea:focus {
        border-color: #94a3b8;
        background: white;
      }

      .primary {
        border: 0;
        background: #111827;
        color: white;
        padding: 10px 14px;
        border-radius: 11px;
        font-weight: 700;
      }

      .secondary {
        border: 1px solid #dbe1e9;
        background: white;
        color: #334155;
        padding: 9px 13px;
        border-radius: 11px;
        font-weight: 700;
      }

      .danger {
        border: 0;
        background: #fee2e2;
        color: #b91c1c;
        padding: 9px 13px;
        border-radius: 11px;
        font-weight: 700;
      }

      .empty {
        padding: 45px 20px;
        text-align: center;
        color: #94a3b8;
      }

      /* AUTH */

      .authPage {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 20px;
        background:
          radial-gradient(circle at top left, #e0e7ff, transparent 40%),
          radial-gradient(circle at bottom right, #dbeafe, transparent 40%),
          #f8fafc;
      }

      .authCard {
        width: min(430px, 100%);
        background: white;
        padding: 30px;
        border-radius: 24px;
        box-shadow: 0 25px 70px rgba(15,23,42,.12);
        border: 1px solid #e6eaf0;
      }

      .authLogo {
        text-align: center;
        margin-bottom: 25px;
      }

      .authLogo .brandMark {
        margin: auto;
        width: 52px;
        height: 52px;
        font-size: 24px;
      }

      .authLogo h1 {
        margin: 12px 0 5px;
      }

      .authForm {
        display: grid;
        gap: 12px;
      }

      .authError {
        background: #fff1f2;
        color: #be123c;
        padding: 10px;
        border-radius: 10px;
        font-size: 13px;
      }

      .linkBtn {
        border: 0;
        background: none;
        color: #2563eb;
        font-weight: 700;
        padding: 0;
      }

      /* CHAT LIST */

      .chatList {
        display: flex;
        flex-direction: column;
      }

      .chatRow {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px 16px;
        border-bottom: 1px solid #f0f2f6;
        transition: .15s;
      }

      .chatRow:hover {
        background: #f8fafc;
      }

      .chatRowMain {
        flex: 1;
        min-width: 0;
      }

      .chatRowTop {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
      }

      .chatName {
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .chatPreview {
        color: #718096;
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .chatTime {
        font-size: 11px;
        color: #94a3b8;
        white-space: nowrap;
      }

      .chatActions {
        display: flex;
        gap: 5px;
      }

      .miniBtn {
        width: 32px;
        height: 32px;
        border: 1px solid #e3e7ee;
        background: white;
        border-radius: 9px;
        display: grid;
        place-items: center;
      }

      .pinOn {
        background: #fff7ed;
        border-color: #fed7aa;
      }

      /* AVATAR */

      .avatar {
        width: 46px;
        height: 46px;
        flex: 0 0 46px;
        border-radius: 50%;
        overflow: hidden;
        background: #e2e8f0;
        display: grid;
        place-items: center;
        font-weight: 800;
        color: #475569;
      }

      .avatar.small {
        width: 38px;
        height: 38px;
        flex-basis: 38px;
        font-size: 13px;
      }

      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* CHAT WINDOW */

      .chatPage {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 180px);
        min-height: 560px;
      }

      .chatHeader {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 15px;
        border-bottom: 1px solid #edf0f5;
      }

      .chatHeaderInfo {
        flex: 1;
        min-width: 0;
      }

      .chatHeaderName {
        font-weight: 800;
      }

      .chatHeaderStatus {
        font-size: 12px;
        color: #22c55e;
      }

      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 18px;
        background:
          radial-gradient(circle at 10% 10%, rgba(226,232,240,.4), transparent 25%),
          #f8fafc;
      }

      .messageLine {
        display: flex;
        margin: 6px 0;
      }

      .messageLine.mine {
        justify-content: flex-end;
      }

      .bubble {
        max-width: min(76%, 580px);
        border-radius: 17px;
        padding: 9px 11px;
        background: white;
        border: 1px solid #e5e9ef;
        box-shadow: 0 2px 7px rgba(15,23,42,.04);
      }

      .mine .bubble {
        background: #111827;
        color: white;
        border-color: #111827;
      }

      .bubbleText {
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.42;
      }

      .messageMedia {
        max-width: 280px;
        max-height: 360px;
        border-radius: 12px;
        display: block;
      }

      .messageMeta {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 5px;
        margin-top: 4px;
        font-size: 10px;
        opacity: .65;
      }

      .ticks {
        font-weight: 900;
        letter-spacing: -3px;
        display: inline-block;
        margin-right: 2px;
      }

      .ticks.seen {
        filter: blur(.7px);
        opacity: .6;
      }

      .messageMenu {
        display: flex;
        gap: 4px;
        margin-top: 5px;
      }

      .messageMenu button {
        border: 0;
        background: rgba(255,255,255,.15);
        color: inherit;
        border-radius: 7px;
        padding: 3px 6px;
        font-size: 11px;
      }

      .messageActionsOutside {
        display: flex;
        gap: 3px;
        align-items: center;
        margin: 0 5px;
      }

      .messageActionsOutside button {
        border: 0;
        background: transparent;
        color: #64748b;
      }

      .composer {
        display: flex;
        gap: 7px;
        padding: 10px;
        border-top: 1px solid #e9edf3;
        background: white;
      }

      .composer input[type="text"] {
        flex: 1;
        border: 1px solid #dce2ea;
        border-radius: 12px;
        padding: 11px;
        outline: none;
        min-width: 0;
      }

      .composerIcon {
        width: 42px;
        height: 42px;
        border-radius: 11px;
        border: 1px solid #dfe4eb;
        background: white;
        display: grid;
        place-items: center;
      }

      .sendBtn {
        width: 44px;
        height: 42px;
        border: 0;
        border-radius: 11px;
        background: #111827;
        color: white;
      }

      .typing {
        padding: 5px 18px;
        font-size: 11px;
        color: #64748b;
        background: #f8fafc;
      }

      /* PEOPLE */

      .personRow {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px 17px;
        border-bottom: 1px solid #f0f2f6;
      }

      .personInfo {
        flex: 1;
        min-width: 0;
      }

      .personName {
        font-weight: 800;
      }

      .personBio {
        color: #718096;
        font-size: 12px;
        margin-top: 3px;
      }

      .personActions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .history {
        padding: 12px 17px;
        border-bottom: 1px solid #edf0f5;
      }

      .historyTitle {
        font-size: 12px;
        color: #64748b;
        font-weight: 800;
        margin-bottom: 7px;
      }

      .historyItems {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .historyChip {
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        border-radius: 20px;
        padding: 6px 9px;
        font-size: 12px;
      }

      /* STORIES */

      .storyGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
        gap: 12px;
        padding: 17px;
      }

      .storyCard {
        height: 235px;
        border-radius: 18px;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        background: #e2e8f0;
        border: 1px solid #dbe1e9;
      }

      .storyCard img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .storyOverlay {
        position: absolute;
        inset: auto 0 0 0;
        padding: 35px 10px 10px;
        color: white;
        background: linear-gradient(transparent, rgba(0,0,0,.72));
      }

      .storyName {
        font-weight: 800;
        font-size: 13px;
      }

      .addStory {
        height: 235px;
        border: 2px dashed #cbd5e1;
        background: #f8fafc;
        border-radius: 18px;
        display: grid;
        place-items: center;
        text-align: center;
        color: #475569;
        cursor: pointer;
      }

      .plus {
        width: 50px;
        height: 50px;
        margin: auto auto 8px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: #111827;
        color: white;
        font-size: 28px;
      }

      /* STORY FULL SCREEN */

      .storyViewer {
        position: fixed;
        inset: 0;
        z-index: 200;
        background: rgba(0,0,0,.94);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 15px;
      }

      .storyViewerClose {
        position: fixed;
        top: 18px;
        right: 18px;
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 50%;
        background: rgba(255,255,255,.15);
        color: white;
        font-size: 22px;
        z-index: 210;
      }

      .storyFull {
        height: min(92vh, 800px);
        aspect-ratio: 9 / 16;
        max-width: 94vw;
        border-radius: 20px;
        overflow: hidden;
        position: relative;
        background: #111827;
      }

      .storyFull img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .storyTextOnly {
        width: 100%;
        height: 100%;
        padding: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: white;
        font-size: 25px;
        font-weight: 700;
      }

      .storyFullBottom {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 50px 16px 18px;
        color: white;
        background: linear-gradient(transparent, rgba(0,0,0,.75));
      }

      /* SETTINGS */

      .settings {
        padding: 18px;
        display: grid;
        gap: 18px;
      }

      .profileBox {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px;
        border: 1px solid #e3e8f0;
        border-radius: 17px;
        background: #fafbfc;
      }

      .profileBig {
        width: 78px;
        height: 78px;
        flex: 0 0 78px;
        border-radius: 50%;
        overflow: hidden;
        background: #e2e8f0;
        display: grid;
        place-items: center;
        font-size: 25px;
        font-weight: 800;
      }

      .profileBig img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .settingsSection {
        border: 1px solid #e3e8f0;
        border-radius: 17px;
        overflow: hidden;
      }

      .settingsTitle {
        padding: 13px 15px;
        background: #f8fafc;
        font-weight: 800;
        border-bottom: 1px solid #e8edf3;
      }

      .settingsBody {
        padding: 15px;
        display: grid;
        gap: 11px;
      }

      .fieldLabel {
        font-size: 12px;
        color: #64748b;
        font-weight: 800;
        margin-bottom: -4px;
      }

      textarea {
        resize: vertical;
        min-height: 80px;
        border: 1px solid #dce2ea;
        background: #fafbfc;
        padding: 11px 13px;
        border-radius: 12px;
        outline: none;
      }

      /* CALL */

      .callOverlay {
        position: fixed;
        inset: 0;
        z-index: 180;
        background: rgba(15,23,42,.94);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .callPanel {
        width: min(850px, 100%);
        max-height: 94vh;
        overflow: auto;
        background: #111827;
        border-radius: 24px;
        padding: 20px;
        text-align: center;
      }

      .callName {
        font-size: 22px;
        font-weight: 800;
        margin-bottom: 5px;
      }

      .callType {
        color: #cbd5e1;
        font-size: 13px;
        margin-bottom: 15px;
      }

      .videoArea {
        position: relative;
        background: #020617;
        border-radius: 18px;
        overflow: hidden;
        min-height: 350px;
      }

      .remoteVideo {
        width: 100%;
        height: 60vh;
        max-height: 650px;
        object-fit: cover;
        background: #020617;
      }

      .localVideo {
        position: absolute;
        right: 12px;
        bottom: 12px;
        width: 150px;
        height: 210px;
        object-fit: cover;
        border-radius: 13px;
        border: 2px solid rgba(255,255,255,.6);
        background: #020617;
      }

      .callControls {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 16px;
      }

      .callControl {
        width: 50px;
        height: 50px;
        border: 0;
        border-radius: 50%;
        background: #334155;
        color: white;
        font-size: 20px;
      }

      .callEnd {
        background: #dc2626;
      }

      .incomingCard {
        background: white;
        color: #172033;
        padding: 25px;
        border-radius: 24px;
        width: min(390px, 100%);
        text-align: center;
        box-shadow: 0 25px 80px rgba(0,0,0,.3);
      }

      .incomingAvatar {
        margin: 0 auto 12px;
      }

      .incomingActions {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-top: 18px;
      }

      /* CALL HISTORY */

      .callRow {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 17px;
        border-bottom: 1px solid #edf0f5;
      }

      .callIcon {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #f1f5f9;
        display: grid;
        place-items: center;
      }

      /* RESPONSIVE */

      @media (max-width: 700px) {
        .topbar {
          padding: 0 10px;
        }

        .mainWrap {
          padding: 8px;
        }

        .nav {
          top: 70px;
          border-radius: 14px;
        }

        .page {
          border-radius: 15px;
        }

        .chatPage {
          height: calc(100vh - 142px);
          min-height: 500px;
        }

        .bubble {
          max-width: 84%;
        }

        .messageMedia {
          max-width: 230px;
        }

        .storyGrid {
          grid-template-columns: repeat(2, 1fr);
          padding: 10px;
        }

        .storyCard,
        .addStory {
          height: 260px;
        }

        .personActions {
          flex-direction: column;
        }

        .profileBox {
          align-items: flex-start;
        }

        .localVideo {
          width: 105px;
          height: 150px;
        }
      }
    `}</style>
  );
}

/* =========================================================
   AVATAR
========================================================= */

function Avatar({ user, small = false }) {
  const name = safeName(user);
  const letter = name.charAt(0).toUpperCase();

  return (
    <div className={`avatar ${small ? "small" : ""}`}>
      {user?.photoURL ? (
        <img src={user.photoURL} alt="" />
      ) : (
        letter
      )}
    </div>
  );
}

/* =========================================================
   AUTH
========================================================= */

function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        if (name.trim()) {
          await updateProfile(cred.user, {
            displayName: name.trim()
          });
        }

        await setDoc(
          doc(db, "users", cred.user.uid),
          {
            uid: cred.user.uid,
            email: email.trim(),
            name: name.trim(),
            username: "",
            phoneNumber: "",
            bio: "",
            hobbies: "",
            photoURL: "",
            friends: [],
            friendRequests: [],
            sentRequests: [],
            searchHistory: [],
            createdAt: serverTimestamp()
          },
          { merge: true }
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }
    } catch (err) {
      console.error(err);

      const code = err?.code || "";

      if (code.includes("invalid-credential")) {
        setError("Email or password is incorrect.");
      } else if (code.includes("email-already-in-use")) {
        setError("This email is already registered.");
      } else if (code.includes("weak-password")) {
        setError("Password should be at least 6 characters.");
      } else if (code.includes("invalid-email")) {
        setError("Please enter a valid email.");
      } else {
        setError(err?.message || "Something went wrong.");
      }
    }

    setLoading(false);
  }

  async function forgotPassword() {
    setError("");
    setResetSent(false);

    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      setError(err?.message || "Could not send reset email.");
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authLogo">
          <div className="brandMark">C</div>
          <h1>Chatdo</h1>
          <div className="subtle">
            Simple. Social. Connected.
          </div>
        </div>

        <form className="authForm" onSubmit={submit}>
          {mode === "signup" && (
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="authError">
              {error}
            </div>
          )}

          {resetSent && (
            <div
              style={{
                background: "#ecfdf5",
                color: "#047857",
                padding: 10,
                borderRadius: 10,
                fontSize: 13
              }}
            >
              Password reset email sent.
            </div>
          )}

          <button className="primary" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Create account"}
          </button>

          {mode === "login" && (
            <button
              type="button"
              className="linkBtn"
              onClick={forgotPassword}
            >
              Forgot password?
            </button>
          )}

          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#64748b"
            }}
          >
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              className="linkBtn"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Sign up" : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   PRESENCE
========================================================= */

function usePresence(user) {
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    updateDoc(userRef, {
      online: true,
      lastSeen: serverTimestamp()
    }).catch(() => {});

    const timer = setInterval(() => {
      updateDoc(userRef, {
        online: true,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }, 60000);

    const offline = () => {
      updateDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", offline);

    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", offline);
      offline();
    };
  }, [user]);
}

/* =========================================================
   WEBRTC CALL MANAGER
========================================================= */

function useCallManager(user) {
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const pcRef = useRef(null);
  const activeIdRef = useRef(null);
  const callDocUnsubRef = useRef(null);
  const candidateUnsubRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "calls"),
      where("members", "array-contains", user.uid),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const calls = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data()
        }))
        .sort((a, b) => {
          const at = a.createdAt?.toMillis?.() || 0;
          const bt = b.createdAt?.toMillis?.() || 0;
          return bt - at;
        });

      const incoming = calls.find(
        (c) =>
          c.calleeId === user.uid &&
          c.status === "ringing" &&
          c.id !== activeIdRef.current
      );

      setIncomingCall(incoming || null);
    });

    return () => unsub();
  }, [user]);

  function cleanup() {
    try {
      callDocUnsubRef.current?.();
    } catch {}

    try {
      candidateUnsubRef.current?.();
    } catch {}

    callDocUnsubRef.current = null;
    candidateUnsubRef.current = null;

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
    }

    pcRef.current = null;

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    }

    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setMuted(false);
    setCameraOff(false);
    activeIdRef.current = null;
  }

  function makePC(type, role, callId) {
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302"
        },
        {
          urls: "stun:stun1.l.google.com:19302"
        }
      ]
    });

    pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;

      const sub =
        role === "caller"
          ? "callerCandidates"
          : "calleeCandidates";

      await addDoc(
        collection(db, "calls", callId, sub),
        {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          createdAt: serverTimestamp()
        }
      );
    };

    pcRef.current = pc;

    return pc;
  }

  async function getMedia(type) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video"
    });

    setLocalStream(stream);

    return stream;
  }

  async function startCall(other, type) {
    if (!user || !other) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Your browser does not support calling.");
      return;
    }

    if (activeCall) return;

    try {
      const stream = await getMedia(type);

      const callRef = await addDoc(collection(db, "calls"), {
        callerId: user.uid,
        callerName: safeName(user),
        callerPhoto: user.photoURL || "",
        calleeId: other.uid,
        calleeName: safeName(other),
        calleePhoto: other.photoURL || "",
        members: [user.uid, other.uid],
        type,
        status: "ringing",
        offer: null,
        answer: null,
        createdAt: serverTimestamp()
      });

      const callId = callRef.id;

      const pc = makePC(type, "caller", callId);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await updateDoc(callRef, {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      });

      activeIdRef.current = callId;

      setActiveCall({
        id: callId,
        type,
        other,
        role: "caller"
      });

      callDocUnsubRef.current = onSnapshot(
        callRef,
        async (snap) => {
          const data = snap.data();

          if (!data) return;

          if (
            data.answer &&
            !pc.currentRemoteDescription
          ) {
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(data.answer)
              );
            } catch (e) {
              console.error(e);
            }
          }

          if (
            ["ended", "rejected"].includes(data.status)
          ) {
            cleanup();
          }
        }
      );

      candidateUnsubRef.current = onSnapshot(
        collection(db, "calls", callId, "calleeCandidates"),
        (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type !== "added") return;

            const data = change.doc.data();

            try {
              await pc.addIceCandidate(
                new RTCIceCandidate({
                  candidate: data.candidate,
                  sdpMid: data.sdpMid,
                  sdpMLineIndex: data.sdpMLineIndex
                })
              );
            } catch (e) {
              console.error(e);
            }
          });
        }
      );
    } catch (err) {
      console.error(err);
      alert(
        "Microphone/Camera permission is required for calling."
      );
      cleanup();
    }
  }

  async function acceptCall(call) {
    if (!call || !user) return;

    try {
      const stream = await getMedia(call.type);

      const callRef = doc(db, "calls", call.id);

      const current = await getDoc(callRef);
      const data = current.data();

      if (!data?.offer) {
        alert("Call offer is not available.");
        cleanup();
        return;
      }

      const pc = makePC(
        call.type,
        "callee",
        call.id
      );

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(callRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        },
        status: "active"
      });

      activeIdRef.current = call.id;

      setIncomingCall(null);

      const other = {
        uid: call.callerId,
        name: call.callerName,
        displayName: call.callerName,
        photoURL: call.callerPhoto || ""
      };

      setActiveCall({
        id: call.id,
        type: call.type,
        other,
        role: "callee"
      });

      callDocUnsubRef.current = onSnapshot(
        callRef,
        (snap) => {
          const d = snap.data();

          if (
            d &&
            ["ended", "rejected"].includes(d.status)
          ) {
            cleanup();
          }
        }
      );

      candidateUnsubRef.current = onSnapshot(
        collection(db, "calls", call.id, "callerCandidates"),
        (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type !== "added") return;

            const candidate = change.doc.data();

            try {
              await pc.addIceCandidate(
                new RTCIceCandidate({
                  candidate: candidate.candidate,
                  sdpMid: candidate.sdpMid,
                  sdpMLineIndex: candidate.sdpMLineIndex
                })
              );
            } catch (e) {
              console.error(e);
            }
          });
        }
      );
    } catch (err) {
      console.error(err);

      try {
        await updateDoc(doc(db, "calls", call.id), {
          status: "ended"
        });
      } catch {}

      alert(
        "Microphone/Camera permission is required."
      );

      cleanup();
    }
  }

  async function rejectCall(call) {
    if (!call) return;

    try {
      await updateDoc(
        doc(db, "calls", call.id),
        {
          status: "rejected",
          endedAt: serverTimestamp()
        }
      );
    } catch (e) {
      console.error(e);
    }

    setIncomingCall(null);
  }

  async function hangup() {
    if (activeCall?.id) {
      try {
        await updateDoc(
          doc(db, "calls", activeCall.id),
          {
            status: "ended",
            endedAt: serverTimestamp()
          }
        );
      } catch (e) {
        console.error(e);
      }
    }

    cleanup();
  }

  function toggleMute() {
    if (!localStream) return;

    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setMuted((v) => !v);
  }

  function toggleCamera() {
    if (!localStream) return;

    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setCameraOff((v) => !v);
  }

  return {
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    startCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleCamera
  };
}

/* =========================================================
   CALL UI
========================================================= */

function CallUI({
  manager
}) {
  const {
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleCamera
  } = manager;

  const localRef = useRef(null);
  const remoteRef = useRef(null);

  useEffect(() => {
    if (localRef.current) {
      localRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current) {
      remoteRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  if (incomingCall && !activeCall) {
    return (
      <div className="callOverlay">
        <div className="incomingCard">
          <div className="incomingAvatar">
            <Avatar
              user={{
                displayName: incomingCall.callerName,
                photoURL: incomingCall.callerPhoto
              }}
              small={false}
            />
          </div>

          <div className="callName">
            {incomingCall.callerName}
          </div>

          <div className="callType">
            Incoming{" "}
            {incomingCall.type === "video"
              ? "video"
              : "audio"}{" "}
            call
          </div>

          <div className="incomingActions">
            <button
              className="primary"
              onClick={() => acceptCall(incomingCall)}
            >
              ✓ Accept
            </button>

            <button
              className="danger"
              onClick={() => rejectCall(incomingCall)}
            >
              ✕ Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeCall) return null;

  return (
    <div className="callOverlay">
      <div className="callPanel">
        <div className="callName">
          {safeName(activeCall.other)}
        </div>

        <div className="callType">
          {activeCall.type === "video"
            ? "Video call"
            : "Audio call"}
        </div>

        {activeCall.type === "video" ? (
          <div className="videoArea">
            <video
              ref={remoteRef}
              className="remoteVideo"
              autoPlay
              playsInline
            />

            <video
              ref={localRef}
              className="localVideo"
              autoPlay
              muted
              playsInline
            />
          </div>
        ) : (
          <div
            style={{
              minHeight: 320,
              display: "grid",
              placeItems: "center"
            }}
          >
            <Avatar
              user={activeCall.other}
            />
          </div>
        )}

        <div className="callControls">
          <button
            className="callControl"
            onClick={toggleMute}
            title="Mute"
          >
            {muted ? "🔇" : "🎤"}
          </button>

          {activeCall.type === "video" && (
            <button
              className="callControl"
              onClick={toggleCamera}
              title="Camera"
            >
              {cameraOff ? "🚫" : "📹"}
            </button>
          )}

          <button
            className="callControl callEnd"
            onClick={hangup}
            title="End call"
          >
            ☎
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CHAT MESSAGES HOOK
========================================================= */

function useChatMessages(chatId, user) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!chatId || !user) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(300)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      setMessages(list);

      /* mark incoming messages delivered */
      const updates = [];

      list.forEach((m) => {
        if (
          m.senderId !== user.uid &&
          !(m.deliveredTo || []).includes(user.uid)
        ) {
          updates.push(
            updateDoc(
              doc(
                db,
                "chats",
                chatId,
                "messages",
                m.id
              ),
              {
                deliveredTo: arrayUnion(user.uid)
              }
            ).catch(() => {})
          );
        }
      });

      await Promise.all(updates);
    });

    return () => unsub();
  }, [chatId, user]);

  return messages;
}

/* =========================================================
   CHAT
========================================================= */

function Chat({
  user,
  other,
  chat,
  onBack,
  onStartCall
}) {
  const chatId = chat?.id || chatIdFor(user.uid, other.uid);

  const messages = useChatMessages(chatId, user);

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);

  const messagesRef = useRef(null);
  const typingTimer = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!chatId) return;

    const chatRef = doc(db, "chats", chatId);

    updateDoc(chatRef, {
      [`typing.${user.uid}`]: false
    }).catch(() => {});

    return () => {
      updateDoc(chatRef, {
        [`typing.${user.uid}`]: false
      }).catch(() => {});
    };
  }, [chatId, user.uid]);

  useEffect(() => {
    if (!chatId) return;

    const unsub = onSnapshot(
      doc(db, "chats", chatId),
      (snap) => {
        const data = snap.data();

        const otherTyping =
          data?.typing?.[other.uid] || false;

        setTyping(otherTyping);
      }
    );

    return () => unsub();
  }, [chatId, other.uid]);

  async function markSeen() {
    const unseen = messages.filter(
      (m) =>
        m.senderId !== user.uid &&
        !(m.seenBy || []).includes(user.uid)
    );

    await Promise.all(
      unseen.map((m) =>
        updateDoc(
          doc(
            db,
            "chats",
            chatId,
            "messages",
            m.id
          ),
          {
            seenBy: arrayUnion(user.uid),
            deliveredTo: arrayUnion(user.uid)
          }
        ).catch(() => {})
      )
    );
  }

  useEffect(() => {
    markSeen();
  }, [messages.length]);

  async function uploadFile(selectedFile) {
    if (!selectedFile) return null;

    const safeName =
      selectedFile.name.replace(/[^\w.-]/g, "_");

    const path =
      `chatMedia/${chatId}/${Date.now()}_${safeName}`;

    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, selectedFile);

    return await getDownloadURL(storageRef);
  }

  async function sendMessage(type, url = "") {
    const value = text.trim();

    if (!value && !url) return;

    const messageRef = collection(
      db,
      "chats",
      chatId,
      "messages"
    );

    await addDoc(messageRef, {
      senderId: user.uid,
      senderName: safeName(user),
      text: type === "text" ? value : "",
      type,
      url,
      createdAt: serverTimestamp(),
      deliveredTo: [],
      seenBy: [],
      edited: false,
      likes: []
    });

    await setDoc(
      doc(db, "chats", chatId),
      {
        members: [user.uid, other.uid],
        lastMessage: {
          text: type === "text"
            ? value
            : formatMessagePreview({ type }),
          type,
          senderId: user.uid
        },
        updatedAt: serverTimestamp(),
        pinnedBy: chat?.pinnedBy || [],
        hiddenBy: chat?.hiddenBy || [],
        deletedBy: arrayRemove(user.uid),
        [`typing.${user.uid}`]: false
      },
      { merge: true }
    );

    setText("");
    setFile(null);
  }

  async function sendTextOrFile() {
    if (file) {
      try {
        const url = await uploadFile(file);

        let type = "image";

        if (file.type.startsWith("video/")) {
          type = "video";
        } else if (file.type.startsWith("audio/")) {
          type = "audio";
        }

        await sendMessage(type, url);
      } catch (e) {
        console.error(e);
        alert("File upload failed.");
      }

      return;
    }

    if (editing) {
      await updateDoc(
        doc(
          db,
          "chats",
          chatId,
          "messages",
          editing.id
        ),
        {
          text: text.trim(),
          edited: true
        }
      );

      setEditing(null);
      setText("");
      return;
    }

    await sendMessage("text");
  }

  async function toggleTyping(value) {
    setText(value);

    await updateDoc(
      doc(db, "chats", chatId),
      {
        [`typing.${user.uid}`]: !!value
      }
    ).catch(() => {});

    clearTimeout(typingTimer.current);

    typingTimer.current = setTimeout(() => {
      updateDoc(
        doc(db, "chats", chatId),
        {
          [`typing.${user.uid}`]: false
        }
      ).catch(() => {});
    }, 1800);
  }

  async function toggleLike(message) {
    const liked = (message.likes || []).includes(
      user.uid
    );

    await updateDoc(
      doc(
        db,
        "chats",
        chatId,
        "messages",
        message.id
      ),
      {
        likes: liked
          ? arrayRemove(user.uid)
          : arrayUnion(user.uid)
      }
    );
  }

  async function deleteForMe(message) {
    await updateDoc(
      doc(
        db,
        "chats",
        chatId,
        "messages",
        message.id
      ),
      {
        deletedFor: arrayUnion(user.uid)
      }
    );
  }

  async function deleteForEveryone(message) {
    if (message.senderId !== user.uid) return;

    await updateDoc(
      doc(
        db,
        "chats",
        chatId,
        "messages",
        message.id
      ),
      {
        deletedEveryone: true,
        text: "This message was deleted.",
        url: "",
        type: "text"
      }
    );
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Audio recording is not supported.");
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      const recorder =
        new MediaRecorder(stream);

      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(
          recordedChunksRef.current,
          { type: "audio/webm" }
        );

        const audioFile = new File(
          [blob],
          `voice_${Date.now()}.webm`,
          { type: "audio/webm" }
        );

        try {
          const url = await uploadFile(audioFile);
          await sendMessage("audio", url);
        } catch (e) {
          console.error(e);
          alert("Voice message upload failed.");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
      alert("Microphone permission is required.");
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
  }

  function renderTicks(message) {
    const status = messageStatus(
      message,
      user.uid
    );

    if (status === "seen") {
      return (
        <span className="ticks seen">
          ✓✓
        </span>
      );
    }

    if (status === "delivered") {
      return (
        <span className="ticks">
          ✓✓
        </span>
      );
    }

    return (
      <span className="ticks">
        ✓
      </span>
    );
  }

  return (
    <div className="chatPage">
      <div className="chatHeader">
        <button
          className="iconBtn"
          onClick={onBack}
        >
          ←
        </button>

        <Avatar user={other} small />

        <div className="chatHeaderInfo">
          <div className="chatHeaderName">
            {safeName(other)}
          </div>

          <div className="chatHeaderStatus">
            {other.online
              ? "online"
              : other.lastSeen
              ? `last seen ${dateTimeText(
                  other.lastSeen
                )}`
              : "offline"}
          </div>
        </div>

        <button
          className="iconBtn"
          title="Audio call"
          onClick={() =>
            onStartCall(other, "audio")
          }
        >
          ☎
        </button>

        <button
          className="iconBtn"
          title="Video call"
          onClick={() =>
            onStartCall(other, "video")
          }
        >
          📹
        </button>
      </div>

      <div
        className="messages"
        ref={messagesRef}
        onClick={markSeen}
      >
        {messages
          .filter(
            (m) =>
              !(m.deletedFor || []).includes(
                user.uid
              )
          )
          .map((m) => {
            const mine =
              m.senderId === user.uid;

            return (
              <div
                key={m.id}
                className={`messageLine ${
                  mine ? "mine" : ""
                }`}
              >
                {!mine && (
                  <div
                    style={{
                      alignSelf: "flex-end",
                      marginRight: 5
                    }}
                  >
                    <Avatar
                      user={other}
                      small
                    />
                  </div>
                )}

                <div className="bubble">
                  {m.deletedEveryone ? (
                    <div
                      style={{
                        opacity: .6,
                        fontStyle: "italic"
                      }}
                    >
                      This message was deleted.
                    </div>
                  ) : (
                    <>
                      {m.type === "text" && (
                        <div className="bubbleText">
                          {m.text}
                        </div>
                      )}

                      {m.type === "image" &&
                        m.url && (
                          <img
                            className="messageMedia"
                            src={m.url}
                            alt=""
                          />
                        )}

                      {m.type === "video" &&
                        m.url && (
                          <video
                            className="messageMedia"
                            src={m.url}
                            controls
                          />
                        )}

                      {m.type === "audio" &&
                        m.url && (
                          <audio
                            src={m.url}
                            controls
                            style={{
                              maxWidth: "250px"
                            }}
                          />
                        )}
                    </>
                  )}

                  <div className="messageMeta">
                    {m.edited && (
                      <span>edited</span>
                    )}

                    <span>
                      {timeText(m.createdAt)}
                    </span>

                    {mine &&
                      renderTicks(m)}

                    {(m.likes || []).length > 0 && (
                      <span>❤️</span>
                    )}
                  </div>

                  <div className="messageMenu">
                    <button
                      onClick={() =>
                        toggleLike(m)
                      }
                    >
                      {(m.likes || []).includes(
                        user.uid
                      )
                        ? "♥"
                        : "♡"}
                    </button>

                    {mine &&
                      m.type === "text" &&
                      !m.deletedEveryone && (
                        <button
                          onClick={() => {
                            setEditing(m);
                            setText(
                              m.text || ""
                            );
                          }}
                        >
                          Edit
                        </button>
                      )}

                    <button
                      onClick={() =>
                        deleteForMe(m)
                      }
                    >
                      Delete
                    </button>

                    {mine &&
                      !m.deletedEveryone && (
                        <button
                          onClick={() =>
                            deleteForEveryone(m)
                          }
                        >
                          Delete all
                        </button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}

        {messages.length === 0 && (
          <div className="empty">
            Start your conversation 👋
          </div>
        )}
      </div>

      {typing && (
        <div className="typing">
          {safeName(other)} is typing...
        </div>
      )}

      {editing && (
        <div
          style={{
            padding: "7px 12px",
            background: "#fff7ed",
            color: "#9a3412",
            fontSize: 12,
            display: "flex",
            justifyContent: "space-between"
          }}
        >
          <span>Editing message</span>

          <button
            className="linkBtn"
            onClick={() => {
              setEditing(null);
              setText("");
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {recording && (
        <div
          style={{
            padding: "7px 12px",
            background: "#fee2e2",
            color: "#b91c1c",
            fontSize: 12,
            textAlign: "center"
          }}
        >
          🔴 Recording... release/press 🎤 to stop
        </div>
      )}

      {file && (
        <div
          style={{
            padding: "7px 12px",
            background: "#f1f5f9",
            fontSize: 12
          }}
        >
          📎 {file.name}
          <button
            className="linkBtn"
            style={{ marginLeft: 8 }}
            onClick={() => setFile(null)}
          >
            Remove
          </button>
        </div>
      )}

      <div className="composer">
        <label
          className="composerIcon"
          title="Attach image/video/audio"
        >
          📎
          <input
            type="file"
            accept="image/*,video/*,audio/*"
            hidden
            onChange={(e) =>
              setFile(
                e.target.files?.[0] || null
              )
            }
          />
        </label>

        <button
          className="composerIcon"
          title="Voice recorder"
          onClick={
            recording
              ? stopRecording
              : startRecording
          }
        >
          {recording ? "⏹" : "🎤"}
        </button>

        <input
          type="text"
          placeholder={
            editing
              ? "Edit message..."
              : "Message"
          }
          value={text}
          onChange={(e) =>
            toggleTyping(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendTextOrFile();
            }
          }}
        />

        <button
          className="sendBtn"
          onClick={sendTextOrFile}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   CHATS LIST
========================================================= */

function Chats({
  user,
  users,
  onOpenChat,
  onStartCall
}) {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where(
        "members",
        "array-contains",
        user.uid
      ),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      list.sort((a, b) => {
        const ap =
          (a.pinnedBy || []).includes(user.uid)
            ? 1
            : 0;

        const bp =
          (b.pinnedBy || []).includes(user.uid)
            ? 1
            : 0;

        if (ap !== bp) return bp - ap;

        const at =
          a.updatedAt?.toMillis?.() || 0;

        const bt =
          b.updatedAt?.toMillis?.() || 0;

        return bt - at;
      });

      setChats(list);
    });

    return () => unsub();
  }, [user]);

  const visible = chats.filter(
    (c) =>
      !(c.hiddenBy || []).includes(user.uid) &&
      !(c.deletedBy || []).includes(user.uid)
  );

  async function pinChat(chat) {
    const pinned = chats.filter((c) =>
      (c.pinnedBy || []).includes(user.uid)
    );

    const isPinned =
      (chat.pinnedBy || []).includes(
        user.uid
      );

    if (!isPinned && pinned.length >= 10) {
      alert("Maximum 10 chats can be pinned.");
      return;
    }

    await updateDoc(doc(db, "chats", chat.id), {
      pinnedBy: isPinned
        ? arrayRemove(user.uid)
        : arrayUnion(user.uid)
    });
  }

  async function hideChat(chat) {
    await updateDoc(doc(db, "chats", chat.id), {
      hiddenBy: arrayUnion(user.uid)
    });
  }

  async function deleteChat(chat) {
    const ok = window.confirm(
      "Delete this chat for you?"
    );

    if (!ok) return;

    await updateDoc(doc(db, "chats", chat.id), {
      deletedBy: arrayUnion(user.uid)
    });
  }

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="pageTitle">
            Chats
          </div>
          <div className="subtle">
            Recent chats appear first
          </div>
        </div>
      </div>

      <div className="chatList">
        {visible.map((chat) => {
          const otherId = otherMember(
            chat,
            user.uid
          );

          const other =
            users.find((u) => u.uid === otherId) ||
            {
              uid: otherId,
              displayName:
                chat.lastMessage?.senderId ===
                user.uid
                  ? "Friend"
                  : "User"
            };

          const pinned =
            (chat.pinnedBy || []).includes(
              user.uid
            );

          return (
            <div
              key={chat.id}
              className="chatRow"
            >
              <Avatar user={other} />

              <div
                className="chatRowMain"
                onClick={() =>
                  onOpenChat(other, chat)
                }
                style={{ cursor: "pointer" }}
              >
                <div className="chatRowTop">
                  <div className="chatName">
                    {safeName(other)}
                    {pinned && " 📌"}
                  </div>

                  <div className="chatTime">
                    {timeText(
                      chat.updatedAt
                    )}
                  </div>
                </div>

                <div className="chatPreview">
                  {formatMessagePreview(
                    chat.lastMessage
                  )}
                </div>
              </div>

              <div className="chatActions">
                <button
                  className={`miniBtn ${
                    pinned ? "pinOn" : ""
                  }`}
                  title={
                    pinned
                      ? "Unpin"
                      : "Pin"
                  }
                  onClick={() =>
                    pinChat(chat)
                  }
                >
                  📌
                </button>

                <button
                  className="miniBtn"
                  title="Hide"
                  onClick={() =>
                    hideChat(chat)
                  }
                >
                  🙈
                </button>

                <button
                  className="miniBtn"
                  title="Delete"
                  onClick={() =>
                    deleteChat(chat)
                  }
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="empty">
            No chats yet.
            <br />
            Go to People and add friends.
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   PEOPLE
========================================================= */

function People({
  user,
  users,
  me,
  onOpenChat
}) {
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState(
    me?.searchHistory || []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHistory(me?.searchHistory || []);
  }, [me?.searchHistory]);

  async function saveHistory(number) {
    const cleaned = normalizePhone(number);

    if (!cleaned) return;

    const next = [
      cleaned,
      ...history.filter(
        (x) => x !== cleaned
      )
    ].slice(0, 20);

    setHistory(next);

    await updateDoc(
      doc(db, "users", user.uid),
      {
        searchHistory: next
      }
    ).catch(() => {});
  }

  async function search() {
    const cleaned = normalizePhone(phone);

    if (!cleaned) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      await saveHistory(cleaned);

      const q = query(
        collection(db, "users"),
        where(
          "phoneNumber",
          "==",
          cleaned
        ),
        limit(10)
      );

      const snap = await getDocs(q);

      const list = snap.docs
        .map((d) => ({
          uid: d.id,
          ...d.data()
        }))
        .filter(
          (u) => u.uid !== user.uid
        );

      setResults(list);
    } catch (e) {
      console.error(e);
      alert("Search failed.");
    }

    setLoading(false);
  }

  async function clearHistory() {
    await updateDoc(
      doc(db, "users", user.uid),
      {
        searchHistory: []
      }
    ).catch(() => {});

    setHistory([]);
  }

  function isFriend(uid) {
    return (me?.friends || []).includes(
      uid
    );
  }

  function hasSentRequest(uid) {
    return (me?.sentRequests || []).some(
      (r) =>
        typeof r === "string"
          ? r === uid
          : r.uid === uid
    );
  }

  function hasIncoming(uid) {
    return (me?.friendRequests || []).some(
      (r) =>
        typeof r === "string"
          ? r === uid
          : r.uid === uid
    );
  }

  async function sendRequest(person) {
    if (
      isFriend(person.uid) ||
      hasSentRequest(person.uid)
    ) {
      return;
    }

    const request = {
      uid: user.uid,
      name: safeName(user),
      photoURL: user.photoURL || ""
    };

    await updateDoc(
      doc(db, "users", person.uid),
      {
        friendRequests: arrayUnion(request)
      }
    );

    await updateDoc(
      doc(db, "users", user.uid),
      {
        sentRequests: arrayUnion({
          uid: person.uid,
          name: safeName(person)
        })
      }
    );

    alert("Friend request sent.");
  }

  async function acceptRequest(request) {
    const requestUid =
      typeof request === "string"
        ? request
        : request.uid;

    const friend = users.find(
      (u) => u.uid === requestUid
    );

    if (!friend) return;

    await updateDoc(
      doc(db, "users", user.uid),
      {
        friends: arrayUnion(requestUid),
        friendRequests:
          arrayRemove(request)
      }
    );

    await updateDoc(
      doc(db, "users", requestUid),
      {
        friends: arrayUnion(user.uid),
        sentRequests:
          arrayRemove({
            uid: user.uid,
            name: safeName(user)
          })
      }
    );
  }

  async function rejectRequest(request) {
    await updateDoc(
      doc(db, "users", user.uid),
      {
        friendRequests:
          arrayRemove(request)
      }
    );
  }

  async function poke(person) {
    const request = {
      uid: user.uid,
      name: safeName(user),
      type: "poke",
      createdAt: Date.now()
    };

    await updateDoc(
      doc(db, "users", person.uid),
      {
        pokes: arrayUnion(request)
      }
    ).catch(() => {});

    alert(`Poked ${safeName(person)} 👋`);
  }

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="pageTitle">
            People
          </div>
          <div className="subtle">
            Search friends by mobile number
          </div>
        </div>
      </div>

      <div className="searchBox">
        <input
          className="input"
          placeholder="Mobile number"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              search();
            }
          }}
        />

        <button
          className="primary"
          onClick={search}
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {history.length > 0 && (
        <div className="history">
          <div className="historyTitle">
            Search history
          </div>

          <div className="historyItems">
            {history.map((item) => (
              <button
                key={item}
                className="historyChip"
                onClick={() => {
                  setPhone(item);
                  setTimeout(
                    () => search(),
                    0
                  );
                }}
              >
                {item}
              </button>
            ))}

            <button
              className="historyChip"
              onClick={clearHistory}
            >
              Clear history
            </button>
          </div>
        </div>
      )}

      {(me?.friendRequests || []).length >
        0 && (
        <div>
          <div
            style={{
              padding: "14px 17px",
              fontWeight: 800,
              background: "#f8fafc"
            }}
          >
            Friend requests
          </div>

          {(me?.friendRequests || []).map(
            (request, index) => {
              const uid =
                typeof request === "string"
                  ? request
                  : request.uid;

              const person =
                users.find(
                  (u) => u.uid === uid
                ) || request;

              return (
                <div
                  className="personRow"
                  key={uid + index}
                >
                  <Avatar user={person} />

                  <div className="personInfo">
                    <div className="personName">
                      {safeName(person)}
                    </div>

                    <div className="personBio">
                      Wants to be your friend
                    </div>
                  </div>

                  <div className="personActions">
                    <button
                      className="primary"
                      onClick={() =>
                        acceptRequest(
                          request
                        )
                      }
                    >
                      Accept
                    </button>

                    <button
                      className="secondary"
                      onClick={() =>
                        rejectRequest(
                          request
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {results.map((person) => {
        const friend = isFriend(person.uid);
        const sent = hasSentRequest(person.uid);
        const incoming = hasIncoming(person.uid);

        return (
          <div
            className="personRow"
            key={person.uid}
          >
            <Avatar user={person} />

            <div className="personInfo">
              <div className="personName">
                {safeName(person)}
              </div>

              <div className="personBio">
                {person.username
                  ? `@${person.username}`
                  : person.bio ||
                    "Chatdo user"}
              </div>
            </div>

            <div className="personActions">
              {friend ? (
                <>
                  <button
                    className="primary"
                    onClick={() =>
                      onOpenChat(person)
                    }
                  >
                    💬 Chat
                  </button>

                  <button
                    className="secondary"
                    onClick={() =>
                      poke(person)
                    }
                  >
                    👋 Poke
                  </button>
                </>
              ) : incoming ? (
                <span className="subtle">
                  Request received ↑
                </span>
              ) : sent ? (
                <span className="subtle">
                  Request sent ✓
                </span>
              ) : (
                <>
                  <button
                    className="primary"
                    onClick={() =>
                      sendRequest(person)
                    }
                  >
                    Add friend
                  </button>

                  <button
                    className="secondary"
                    onClick={() =>
                      poke(person)
                    }
                  >
                    👋 Poke
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {results.length === 0 &&
        history.length === 0 && (
          <div className="empty">
            Enter a mobile number to find a
            Chatdo user.
          </div>
        )}

      {results.length === 0 &&
        phone &&
        !loading && (
          <div className="empty">
            No user found for this number.
          </div>
        )}
    </div>
  );
}

/* =========================================================
   STORIES
========================================================= */

function Stories({ user, users }) {
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] =
    useState(null);

  const [showAdd, setShowAdd] =
    useState(false);

  const [storyText, setStoryText] =
    useState("");

  const [storyFile, setStoryFile] =
    useState(null);

  const [posting, setPosting] =
    useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "stories"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();

      const list = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data()
        }))
        .filter((s) => {
          if (!s.expiresAt) return true;

          const expiry =
            typeof s.expiresAt?.toMillis ===
            "function"
              ? s.expiresAt.toMillis()
              : new Date(
                  s.expiresAt
                ).getTime();

          return expiry > now;
        });

      list.sort((a, b) => {
        const am =
          a.uid === user.uid ? 1 : 0;

        const bm =
          b.uid === user.uid ? 1 : 0;

        if (am !== bm) return bm - am;

        const at =
          a.createdAt?.toMillis?.() || 0;

        const bt =
          b.createdAt?.toMillis?.() || 0;

        return bt - at;
      });

      setStories(list);
    });

    return () => unsub();
  }, [user.uid]);

  async function postStory() {
    if (!storyText.trim() && !storyFile) {
      alert("Add text or an image.");
      return;
    }

    setPosting(true);

    try {
      let imageURL = "";

      if (storyFile) {
        const safeName =
          storyFile.name.replace(
            /[^\w.-]/g,
            "_"
          );

        const storageRef = ref(
          storage,
          `stories/${user.uid}/${Date.now()}_${safeName}`
        );

        await uploadBytes(
          storageRef,
          storyFile
        );

        imageURL =
          await getDownloadURL(
            storageRef
          );
      }

      await addDoc(
        collection(db, "stories"),
        {
          uid: user.uid,
          name: safeName(user),
          photoURL: user.photoURL || "",
          text: storyText.trim(),
          imageURL,
          createdAt: serverTimestamp(),
          expiresAt:
            new Date(
              Date.now() +
                24 * 60 * 60 * 1000
            ),
          likes: []
        }
      );

      setStoryText("");
      setStoryFile(null);
      setShowAdd(false);
    } catch (e) {
      console.error(e);
      alert("Could not post story.");
    }

    setPosting(false);
  }

  async function deleteStory(story) {
    if (story.uid !== user.uid) return;

    const ok = window.confirm(
      "Delete this story?"
    );

    if (!ok) return;

    await deleteDoc(
      doc(db, "stories", story.id)
    );
  }

  async function likeStory(story) {
    await updateDoc(
      doc(db, "stories", story.id),
      {
        likes: (
          story.likes || []
        ).includes(user.uid)
          ? arrayRemove(user.uid)
          : arrayUnion(user.uid)
      }
    );
  }

  const myStory = stories.find(
    (s) => s.uid === user.uid
  );

  const otherStories = stories.filter(
    (s) => s.uid !== user.uid
  );

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="pageTitle">
            Stories
          </div>
          <div className="subtle">
            Tap a story to view it full screen
          </div>
        </div>
      </div>

      <div className="storyGrid">
        <div
          className="addStory"
          onClick={() =>
            setShowAdd(true)
          }
        >
          <div>
            <div className="plus">
              +
            </div>
            <strong>
              Add my story
            </strong>
          </div>
        </div>

        {myStory && (
          <div
            className="storyCard"
            onClick={() =>
              setActiveStory(myStory)
            }
          >
            {myStory.imageURL ? (
              <img
                src={myStory.imageURL}
                alt=""
              />
            ) : (
              <div
                className="storyTextOnly"
                style={{
                  background:
                    "linear-gradient(135deg,#111827,#334155)"
                }}
              >
                {myStory.text}
              </div>
            )}

            <div className="storyOverlay">
              <div className="storyName">
                My Story
              </div>

              <button
                className="danger"
                style={{
                  marginTop: 7,
                  padding: "5px 8px"
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteStory(myStory);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {otherStories.map((story) => {
          const liked =
            (story.likes || []).includes(
              user.uid
            );

          return (
            <div
              className="storyCard"
              key={story.id}
              onClick={() =>
                setActiveStory(story)
              }
            >
              {story.imageURL ? (
                <img
                  src={story.imageURL}
                  alt=""
                />
              ) : (
                <div
                  className="storyTextOnly"
                  style={{
                    background:
                      "linear-gradient(135deg,#1e293b,#475569)"
                  }}
                >
                  {story.text}
                </div>
              )}

              <div className="storyOverlay">
                <div className="storyName">
                  {story.name}
                </div>

                <button
                  className="secondary"
                  style={{
                    marginTop: 7,
                    padding: "5px 8px"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    likeStory(story);
                  }}
                >
                  {liked ? "♥" : "♡"}{" "}
                  {(story.likes || []).length}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div
          className="storyViewer"
          onClick={() =>
            setShowAdd(false)
          }
        >
          <div
            style={{
              width: "min(430px,100%)",
              background: "white",
              color: "#172033",
              padding: 20,
              borderRadius: 20
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                marginBottom: 14
              }}
            >
              + Add my story
            </div>

            <textarea
              placeholder="Write something..."
              value={storyText}
              onChange={(e) =>
                setStoryText(
                  e.target.value
                )
              }
            />

            <label
              className="secondary"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 10
              }}
            >
              📷 Choose image
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  setStoryFile(
                    e.target.files?.[0] ||
                      null
                  )
                }
              />
            </label>

            {storyFile && (
              <div
                style={{
                  fontSize: 12,
                  marginTop: 8
                }}
              >
                {storyFile.name}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 15
              }}
            >
              <button
                className="primary"
                style={{ flex: 1 }}
                onClick={postStory}
                disabled={posting}
              >
                {posting
                  ? "Posting..."
                  : "Add my story"}
              </button>

              <button
                className="secondary"
                onClick={() =>
                  setShowAdd(false)
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {activeStory && (
        <div className="storyViewer">
          <button
            className="storyViewerClose"
            onClick={() =>
              setActiveStory(null)
            }
          >
            ×
          </button>

          <div className="storyFull">
            {activeStory.imageURL ? (
              <img
                src={activeStory.imageURL}
                alt=""
              />
            ) : (
              <div
                className="storyTextOnly"
                style={{
                  background:
                    "linear-gradient(135deg,#111827,#475569)"
                }}
              >
                {activeStory.text}
              </div>
            )}

            <div className="storyFullBottom">
              <div
                style={{
                  fontWeight: 800,
                  marginBottom: 5
                }}
              >
                {activeStory.uid ===
                user.uid
                  ? "My Story"
                  : activeStory.name}
              </div>

              {activeStory.text && (
                <div>
                  {activeStory.text}
                </div>
              )}

              <button
                className="secondary"
                style={{
                  marginTop: 10
                }}
                onClick={() =>
                  likeStory(activeStory)
                }
              >
                {(activeStory.likes || []).includes(
                  user.uid
                )
                  ? "♥ Liked"
                  : "♡ Like"}{" "}
                {(activeStory.likes || [])
                  .length}
              </button>

              {activeStory.uid ===
                user.uid && (
                <button
                  className="danger"
                  style={{
                    marginLeft: 8
                  }}
                  onClick={async () => {
                    await deleteStory(
                      activeStory
                    );
                    setActiveStory(null);
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CALLS PAGE
========================================================= */

function CallsPage({
  user,
  users,
  onStartCall
}) {
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "calls"),
      where(
        "members",
        "array-contains",
        user.uid
      ),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data()
        }))
        .filter(
          (c) =>
            c.status !== "ringing"
        )
        .sort((a, b) => {
          const at =
            a.createdAt?.toMillis?.() ||
            0;

          const bt =
            b.createdAt?.toMillis?.() ||
            0;

          return bt - at;
        });

      setCalls(list);
    });

    return () => unsub();
  }, [user]);

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="pageTitle">
            Calls
          </div>
          <div className="subtle">
            Audio and video call history
          </div>
        </div>
      </div>

      {calls.length === 0 && (
        <div className="empty">
          No calls yet.
        </div>
      )}

      {calls.map((call) => {
        const outgoing =
          call.callerId === user.uid;

        const otherId = outgoing
          ? call.calleeId
          : call.callerId;

        const other =
          users.find(
            (u) => u.uid === otherId
          ) || {
            uid: otherId,
            displayName: outgoing
              ? call.calleeName
              : call.callerName,
            photoURL: outgoing
              ? call.calleePhoto
              : call.callerPhoto
          };

        return (
          <div
            className="callRow"
            key={call.id}
          >
            <div className="callIcon">
              {call.type === "video"
                ? "📹"
                : "☎"}
            </div>

            <Avatar
              user={other}
              small
            />

            <div
              style={{
                flex: 1,
                minWidth: 0
              }}
            >
              <div
                style={{
                  fontWeight: 800
                }}
              >
                {safeName(other)}
              </div>

              <div className="subtle">
                {outgoing
                  ? "Outgoing"
                  : "Incoming"}{" "}
                · {call.status} ·{" "}
                {dateTimeText(
                  call.createdAt
                )}
              </div>
            </div>

            <button
              className="secondary"
              onClick={() =>
                onStartCall(
                  other,
                  call.type
                )
              }
            >
              {call.type === "video"
                ? "📹"
                : "☎"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function Settings({
  user,
  me,
  onClose
}) {
  const [name, setName] =
    useState(me?.name || "");

  const [username, setUsername] =
    useState(me?.username || "");

  const [phone, setPhone] =
    useState(me?.phoneNumber || "");

  const [bio, setBio] =
    useState(me?.bio || "");

  const [hobbies, setHobbies] =
    useState(me?.hobbies || "");

  const [photo, setPhoto] =
    useState(me?.photoURL || user.photoURL || "");

  const [file, setFile] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  async function save() {
    setSaving(true);

    try {
      let photoURL = photo;

      if (file) {
        const safeName =
          file.name.replace(
            /[^\w.-]/g,
            "_"
          );

        const storageRef = ref(
          storage,
          `profiles/${user.uid}/${Date.now()}_${safeName}`
        );

        await uploadBytes(
          storageRef,
          file
        );

        photoURL =
          await getDownloadURL(
            storageRef
          );
      }

      const cleanedPhone =
        normalizePhone(phone);

      const existingUsername =
        me?.username?.trim() || "";

      let finalUsername =
        existingUsername;

      if (!existingUsername) {
        finalUsername =
          username.trim().toLowerCase();
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: name.trim(),
          phoneNumber: cleanedPhone,
          username: finalUsername,
          bio: bio.trim(),
          hobbies: hobbies.trim(),
          photoURL
        },
        { merge: true }
      );

      await updateProfile(user, {
        displayName: name.trim(),
        photoURL
      });

      setPhoto(photoURL);
      setFile(null);

      alert("Profile updated.");
    } catch (e) {
      console.error(e);
      alert("Could not update profile.");
    }

    setSaving(false);
  }

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <div className="pageTitle">
            Settings
          </div>
          <div className="subtle">
            Manage your Chatdo profile
          </div>
        </div>

        {onClose && (
          <button
            className="secondary"
            onClick={onClose}
          >
            Back
          </button>
        )}
      </div>

      <div className="settings">
        <div className="profileBox">
          <div className="profileBig">
            {photo ? (
              <img
                src={photo}
                alt=""
              />
            ) : (
              safeName(me || user)
                .charAt(0)
                .toUpperCase()
            )}
          </div>

          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800
              }}
            >
              {safeName(me || user)}
            </div>

            <div className="subtle">
              {user.email}
            </div>

            <label
              className="secondary"
              style={{
                display: "inline-block",
                marginTop: 9
              }}
            >
              Change profile photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  setFile(
                    e.target.files?.[0] ||
                      null
                  )
                }
              />
            </label>
          </div>
        </div>

        <div className="settingsSection">
          <div className="settingsTitle">
            Profile
          </div>

          <div className="settingsBody">
            <div className="fieldLabel">
              Name
            </div>

            <input
              className="input"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

            <div className="fieldLabel">
              Username
            </div>

            <input
              className="input"
              value={username}
              disabled={!!me?.username}
              placeholder="Set your username"
              onChange={(e) =>
                setUsername(
                  e.target.value
                    .replace(/\s/g, "")
                    .toLowerCase()
                )
              }
            />

            <div className="subtle">
              {me?.username
                ? "Username cannot be changed after it is set."
                : "You can set your username once."}
            </div>

            <div className="fieldLabel">
              Mobile number
            </div>

            <input
              className="input"
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value
                )
              }
              placeholder="Mobile number"
            />

            <div className="fieldLabel">
              Bio
            </div>

            <textarea
              value={bio}
              onChange={(e) =>
                setBio(e.target.value)
              }
              placeholder="About you"
            />

            <div className="fieldLabel">
              Hobbies
            </div>

            <textarea
              value={hobbies}
              onChange={(e) =>
                setHobbies(
                  e.target.value
                )
              }
              placeholder="Music, travel, sports..."
            />

            <button
              className="primary"
              onClick={save}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save profile"}
            </button>
          </div>
        </div>

        <div className="settingsSection">
          <div className="settingsTitle">
            Account
          </div>

          <div className="settingsBody">
            <div className="subtle">
              Email
            </div>

            <div
              style={{
                fontWeight: 700
              }}
            >
              {user.email}
            </div>

            <div className="subtle">
              To change your password, use
              "Forgot password" from the login
              screen.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SOCIAL APP
========================================================= */

function SocialApp({ user }) {
  const [tab, setTab] =
    useState("chats");

  const [users, setUsers] =
    useState([]);

  const [me, setMe] =
    useState(null);

  const [openChat, setOpenChat] =
    useState(null);

  const callManager =
    useCallManager(user);

  usePresence(user);

  useEffect(() => {
    if (!user) return;

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list = snap.docs.map(
          (d) => ({
            uid: d.id,
            ...d.data()
          })
        );

        setUsers(list);
      }
    );

    const unsubMe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          setMe({
            uid: snap.id,
            ...snap.data()
          });
        }
      }
    );

    return () => {
      unsubUsers();
      unsubMe();
    };
  }, [user.uid]);

  const currentUser = useMemo(() => {
    return (
      users.find(
        (u) => u.uid === user.uid
      ) ||
      me ||
      {
        uid: user.uid,
        email: user.email,
        displayName:
          user.displayName
      }
    );
  }, [users, me, user]);

  const friends = useMemo(() => {
    const ids =
      currentUser?.friends || [];

    return users.filter((u) =>
      ids.includes(u.uid)
    );
  }, [users, currentUser]);

  function changeTab(next) {
    setOpenChat(null);
    setTab(next);
  }

  function swipeHandlers() {
    let startX = 0;
    let startY = 0;

    return {
      onTouchStart: (e) => {
        const target = e.target;

        if (
          target.closest(
            ".messages, .composer, input, textarea, button, video, audio"
          )
        ) {
          return;
        }

        startX =
          e.changedTouches[0].clientX;

        startY =
          e.changedTouches[0].clientY;
      },

      onTouchEnd: (e) => {
        if (!startX) return;

        const target = e.target;

        if (
          target.closest(
            ".messages, .composer, input, textarea, button, video, audio"
          )
        ) {
          startX = 0;
          startY = 0;
          return;
        }

        const endX =
          e.changedTouches[0].clientX;

        const endY =
          e.changedTouches[0].clientY;

        const dx = endX - startX;
        const dy = endY - startY;

        startX = 0;
        startY = 0;

        if (
          Math.abs(dx) < 70 ||
          Math.abs(dx) < Math.abs(dy)
        ) {
          return;
        }

        const index =
          TABS.indexOf(tab);

        if (dx < 0) {
          const next =
            TABS[
              Math.min(
                TABS.length - 1,
                index + 1
              )
            ];

          changeTab(next);
        } else {
          const next =
            TABS[
              Math.max(0, index - 1)
            ];

          changeTab(next);
        }
      }
    };
  }

  const swipe = swipeHandlers();

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="brandMark">
            C
          </div>
          Chatdo
        </div>

        <div className="topActions">
          <button
            className="iconBtn"
            title="Profile / Settings"
            onClick={() =>
              changeTab("settings")
            }
          >
            ⚙
          </button>

          <button
            className="iconBtn"
            title="Logout"
            onClick={() =>
              signOut(auth)
            }
          >
            ⇥
          </button>
        </div>
      </div>

      <div
        className="mainWrap"
        {...swipe}
      >
        <div className="nav">
          <button
            className={
              tab === "chats"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTab("chats")
            }
          >
            💬 Chats
          </button>

          <button
            className={
              tab === "stories"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTab("stories")
            }
          >
            ◉ Stories
          </button>

          <button
            className={
              tab === "calls"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTab("calls")
            }
          >
            ☎ Calls
          </button>

          <button
            className={
              tab === "people"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTab("people")
            }
          >
            👥 People
          </button>
        </div>

        {openChat ? (
          <div className="page">
            <Chat
              user={user}
              other={openChat.other}
              chat={openChat.chat}
              onBack={() =>
                setOpenChat(null)
              }
              onStartCall={
                callManager.startCall
              }
            />
          </div>
        ) : (
          <>
            {tab === "chats" && (
              <Chats
                user={user}
                users={users}
                onOpenChat={(other, chat) =>
                  setOpenChat({
                    other,
                    chat
                  })
                }
                onStartCall={
                  callManager.startCall
                }
              />
            )}

            {tab === "stories" && (
              <Stories
                user={user}
                users={users}
              />
            )}

            {tab === "calls" && (
              <CallsPage
                user={user}
                users={users}
                onStartCall={
                  callManager.startCall
                }
              />
            )}

            {tab === "people" && (
              <People
                user={user}
                users={users}
                me={currentUser}
                onOpenChat={(other) =>
                  setOpenChat({
                    other,
                    chat: {
                      id: chatIdFor(
                        user.uid,
                        other.uid
                      ),
                      members: [
                        user.uid,
                        other.uid
                      ]
                    }
                  })
                }
              />
            )}

            {tab === "settings" && (
              <Settings
                user={user}
                me={currentUser}
                onClose={() =>
                  changeTab("chats")
                }
              />
            )}
          </>
        )}
      </div>

      <CallUI manager={callManager} />
    </div>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        }
      );

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <>
        <Styles />
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#f8fafc",
            color: "#64748b"
          }}
        >
          Loading Chatdo...
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Styles />
        <Auth />
      </>
    );
  }

  return (
    <>
      <Styles />
      <SocialApp user={user} />
    </>
  );
}

/* =========================================================
   ROOT
========================================================= */

const rootElement =
  document.getElementById("root");

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
