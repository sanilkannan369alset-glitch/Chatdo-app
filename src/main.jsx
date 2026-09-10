import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { createRoot } from "react-dom/client";

import { initializeApp } from "firebase/app";

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
} catch (error) {
  console.error("Firebase initialization error:", error);
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
  return String(value).replace(/[^\d]/g, "");
}

function normalizeText(value = "") {
  return String(value).trim().toLowerCase();
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

function initials(user) {
  const name = safeName(user);

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

function formatMessagePreview(message) {
  if (!message) return "";

  if (message.type === "image") return "📷 Photo";
  if (message.type === "video") return "🎥 Video";
  if (message.type === "audio") return "🎤 Voice message";

  return message.text || "";
}

function messageStatus(message, uid) {
  if (message.senderId !== uid) return "";

  const seenBy = message.seenBy || [];
  const deliveredTo = message.deliveredTo || [];

  if (seenBy.some((x) => x !== uid)) {
    return "seen";
  }

  if (deliveredTo.some((x) => x !== uid)) {
    return "delivered";
  }

  return "sent";
}

function getMillis(value) {
  if (!value) return 0;

  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  const n = new Date(value).getTime();

  return Number.isNaN(n) ? 0 : n;
}


/* =========================================================
   STYLES
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
        padding: 0;
        width: 100%;
        min-height: 100%;
        font-family:
          Inter,
          Arial,
          Helvetica,
          sans-serif;
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
        background:
          linear-gradient(
            135deg,
            #f8fafc,
            #eef4fb
          );
      }

      .topbar {
        height: 64px;
        background: rgba(255,255,255,.96);
        border-bottom: 1px solid #e5e9ef;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 18px;
        position: sticky;
        top: 0;
        z-index: 50;
        backdrop-filter: blur(12px);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 800;
        font-size: 22px;
      }

      .brandMark {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: #111827;
        color: white;
        font-weight: 800;
      }

      .topActions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .iconBtn {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        border: 1px solid #e1e6ed;
        background: white;
        display: grid;
        place-items: center;
        color: #334155;
      }

      .iconBtn:hover {
        background: #f1f5f9;
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
        border: 1px solid #e3e8ef;
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
        padding: 11px 14px;
        border-radius: 12px;
        background: transparent;
        color: #64748b;
        font-weight: 800;
        white-space: nowrap;
      }

      .nav button.active {
        background: #111827;
        color: white;
      }

      .page {
        background: white;
        border: 1px solid #e3e8ef;
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
        width: 54px;
        height: 54px;
        font-size: 22px;
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
        user-select: none;
        position: relative;
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

      .pinBadge {
        font-size: 12px;
        margin-left: 5px;
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

      /* CONTEXT MENU */

      .contextMenu {
        position: fixed;
        z-index: 200;
        background: white;
        border: 1px solid #dfe5ec;
        border-radius: 14px;
        box-shadow: 0 18px 50px rgba(15,23,42,.18);
        min-width: 190px;
        overflow: hidden;
      }

      .contextMenu button {
        width: 100%;
        border: 0;
        background: white;
        padding: 13px 15px;
        text-align: left;
        font-weight: 700;
      }

      .contextMenu button:hover {
        background: #f8fafc;
      }

      .contextMenu .dangerItem {
        color: #b91c1c;
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
        background: #f8fafc;
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

      .tick {
        font-weight: 900;
        letter-spacing: -3px;
        display: inline-block;
      }

      .tick.seen {
        opacity: .38;
        filter: blur(.7px);
      }

      .messageActions {
        display: flex;
        gap: 4px;
        margin-top: 5px;
      }

      .messageActionBtn {
        border: 0;
        background: rgba(255,255,255,.1);
        color: inherit;
        border-radius: 7px;
        font-size: 11px;
        padding: 4px 6px;
      }

      .composer {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 10px;
        border-top: 1px solid #e5e9ef;
        background: white;
      }

      .composer input {
        flex: 1;
      }

      .circleBtn {
        width: 40px;
        height: 40px;
        border: 1px solid #dfe5ec;
        border-radius: 50%;
        background: white;
        display: grid;
        place-items: center;
      }

      .circleBtn.recording {
        background: #fee2e2;
        border-color: #fecaca;
      }

      .callBtns {
        display: flex;
        gap: 5px;
      }

      /* PEOPLE */

      .personRow {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px 16px;
        border-bottom: 1px solid #eef1f5;
      }

      .personInfo {
        flex: 1;
        min-width: 0;
      }

      .personName {
        font-weight: 800;
      }

      .personMeta {
        color: #718096;
        font-size: 12px;
        margin-top: 3px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .historyHead {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px 8px;
      }

      .historyTitle {
        font-weight: 800;
        font-size: 14px;
      }

      .historyList {
        padding-bottom: 5px;
      }

      .historyRow {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 18px;
        border-bottom: 1px solid #f1f3f6;
      }

      .historyText {
        flex: 1;
        font-size: 14px;
        color: #475569;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .historyX {
        width: 28px;
        height: 28px;
        border: 0;
        background: #f1f5f9;
        border-radius: 50%;
        color: #64748b;
        font-weight: 800;
      }

      /* STORIES */

      .storiesGrid {
        padding: 16px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 14px;
      }

      .storyCard {
        position: relative;
        aspect-ratio: 9 / 14;
        border-radius: 18px;
        overflow: hidden;
        background: #0f172a;
        cursor: pointer;
      }

      .storyCard img,
      .storyCard video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .storyOverlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 12px;
        color: white;
        background: linear-gradient(
          transparent 45%,
          rgba(0,0,0,.7)
        );
      }

      .addStory {
        display: grid;
        place-items: center;
        text-align: center;
        border: 2px dashed #cbd5e1;
        color: #475569;
        background: #f8fafc;
      }

      .addStoryPlus {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #111827;
        color: white;
        display: grid;
        place-items: center;
        font-size: 25px;
        margin-bottom: 8px;
      }

      /* FULLSCREEN STORY */

      .storyViewer {
        position: fixed;
        inset: 0;
        z-index: 500;
        background: rgba(0,0,0,.94);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .storyViewerContent {
        width: min(430px, 100%);
        height: 100%;
        max-height: 850px;
        position: relative;
      }

      .storyViewerContent img,
      .storyViewerContent video {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .storyViewerTop {
        position: absolute;
        top: 15px;
        left: 15px;
        right: 15px;
        display: flex;
        justify-content: space-between;
        z-index: 2;
        color: white;
      }

      .storyViewerBottom {
        position: absolute;
        bottom: 22px;
        left: 15px;
        right: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: white;
        z-index: 2;
      }

      /* SETTINGS */

      .settings {
        padding: 18px;
      }

      .profileCenter {
        text-align: center;
        margin-bottom: 20px;
      }

      .profileLarge {
        width: 100px;
        height: 100px;
        margin: auto;
        border-radius: 50%;
        overflow: hidden;
        background: #e2e8f0;
        display: grid;
        place-items: center;
        font-size: 28px;
        font-weight: 800;
      }

      .profileLarge img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .settingGrid {
        display: grid;
        gap: 13px;
        max-width: 600px;
        margin: auto;
      }

      .settingLabel {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 5px;
        font-weight: 700;
      }

      textarea {
        width: 100%;
        min-height: 90px;
        resize: vertical;
        border: 1px solid #dce2ea;
        border-radius: 12px;
        padding: 11px;
        outline: none;
      }

      .locked {
        background: #f1f5f9;
        color: #64748b;
      }

      /* CALL */

      .callModal {
        position: fixed;
        inset: 0;
        z-index: 400;
        background: rgba(15,23,42,.72);
        display: grid;
        place-items: center;
        padding: 20px;
      }

      .callCard {
        width: min(440px, 100%);
        background: white;
        border-radius: 24px;
        padding: 25px;
        text-align: center;
      }

      .callAvatar {
        width: 90px;
        height: 90px;
        border-radius: 50%;
        overflow: hidden;
        background: #e2e8f0;
        display: grid;
        place-items: center;
        margin: auto auto 14px;
        font-size: 28px;
        font-weight: 800;
      }

      .callAvatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .callActions {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 20px;
      }

      .callAction {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: 0;
        display: grid;
        place-items: center;
        font-size: 20px;
      }

      .accept {
        background: #dcfce7;
      }

      .reject {
        background: #fee2e2;
      }

      .activeCall {
        width: min(850px, 100%);
        height: min(700px, 90vh);
        background: #020617;
        border-radius: 22px;
        overflow: hidden;
        position: relative;
      }

      .remoteVideo {
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: #020617;
      }

      .localVideo {
        position: absolute;
        width: 150px;
        height: 210px;
        right: 14px;
        top: 14px;
        object-fit: cover;
        border-radius: 14px;
        background: #111827;
      }

      .activeCallBottom {
        position: absolute;
        bottom: 20px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 12px;
      }

      /* RESPONSIVE */

      @media (max-width: 700px) {

        .topbar {
          padding: 0 10px;
        }

        .mainWrap {
          padding: 8px;
        }

        .page {
          border-radius: 15px;
        }

        .nav {
          top: 66px;
          border-radius: 13px;
          margin-bottom: 8px;
        }

        .bubble {
          max-width: 86%;
        }

        .chatPage {
          height: calc(100vh - 130px);
          min-height: 520px;
        }

        .storiesGrid {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .callBtns .circleBtn {
          width: 36px;
          height: 36px;
        }

        .composer {
          padding: 7px;
        }
      }

    `}</style>
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

  async function submit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } else {
        const result =
          await createUserWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );

        await updateProfile(result.user, {
          displayName: name.trim()
        });

        await setDoc(
          doc(db, "users", result.user.uid),
          {
            uid: result.user.uid,
            name: name.trim(),
            displayName: name.trim(),
            email: email.trim().toLowerCase(),
            username: "",
            phoneNumber: "",
            bio: "",
            hobbies: "",
            photoURL: "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.error(err);
      setError(
        err?.message
          ?.replace("Firebase: Error (auth/", "")
          ?.replace(").", "") ||
          "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    setError("");

    try {
      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      setError(
        "Password reset link sent to your email."
      );
    } catch (err) {
      setError(
        err?.message || "Unable to send reset email."
      );
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">

        <div className="authLogo">
          <div className="brandMark">C</div>
          <h1>Chatdo</h1>
          <div className="subtle">
            Simple social messaging
          </div>
        </div>

        <form
          className="authForm"
          onSubmit={submit}
        >

          {mode === "signup" && (
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          )}

          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          {error && (
            <div className="authError">
              {error}
            </div>
          )}

          <button
            className="primary"
            type="submit"
            disabled={loading}
          >
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

          <button
            type="button"
            className="secondary"
            onClick={() => {
              setMode(
                mode === "login"
                  ? "signup"
                  : "login"
              );
              setError("");
            }}
          >
            {mode === "login"
              ? "Create new account"
              : "Already have an account? Login"}
          </button>

        </form>
      </div>
    </div>
  );
}


/* =========================================================
   PRESENCE
========================================================= */

function usePresence(uid) {
  useEffect(() => {
    if (!uid || !db) return;

    const userRef = doc(db, "users", uid);

    updateDoc(userRef, {
      online: true,
      lastSeen: serverTimestamp()
    }).catch(() => {});

    const timer = setInterval(() => {
      updateDoc(userRef, {
        online: true,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }, 30000);

    return () => {
      clearInterval(timer);

      updateDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    };
  }, [uid]);
}


/* =========================================================
   USER PROFILE HOOK
========================================================= */

function useUserProfile(uid) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!uid || !db) return;

    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setProfile(
          snap.exists()
            ? {
                uid,
                ...snap.data()
              }
            : {
                uid
              }
        );
      },
      (err) => {
        console.error(err);
      }
    );

    return () => unsub();
  }, [uid]);

  return profile;
}


/* =========================================================
   CHAT MESSAGES
========================================================= */

function useChatMessages(chatId, uid) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!chatId || !db) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(
        db,
        "chats",
        chatId,
        "messages"
      ),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data()
        }));

        setMessages(rows);

        for (const msg of rows) {
          if (
            msg.senderId !== uid &&
            !(msg.deliveredTo || []).includes(uid)
          ) {
            updateDoc(
              doc(
                db,
                "chats",
                chatId,
                "messages",
                msg.id
              ),
              {
                deliveredTo: arrayUnion(uid)
              }
            ).catch(() => {});
          }
        }
      },
      (err) => {
        console.error("Message listener:", err);
      }
    );

    return () => unsub();
  }, [chatId, uid]);

  return messages;
}


/* =========================================================
   CALL MANAGER
========================================================= */

function useCallManager(uid) {
  const [incoming, setIncoming] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  const unsubCallRef = useRef(null);
  const unsubCandidatesRef = useRef([]);

  const servers = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302"
      },
      {
        urls: "stun:stun1.l.google.com:19302"
      }
    ]
  };

  async function cleanupCall(callId) {
    try {
      localStreamRef.current
        ?.getTracks()
        ?.forEach((track) => track.stop());
    } catch {}

    try {
      pcRef.current?.close();
    } catch {}

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pcRef.current = null;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    unsubCallRef.current?.();

    unsubCandidatesRef.current.forEach(
      (u) => u?.()
    );

    unsubCandidatesRef.current = [];

    if (callId && db) {
      try {
        await updateDoc(
          doc(db, "calls", callId),
          {
            status: "ended",
            endedAt: serverTimestamp()
          }
        );
      } catch {}
    }

    setIncoming(null);
    setActiveCall(null);
  }

  async function startCall(otherUser, video) {
    if (!uid || !otherUser?.uid) return;

    const callId =
      `${uid}_${otherUser.uid}_${Date.now()}`;

    const callRef = doc(db, "calls", callId);

    const pc =
      new RTCPeerConnection(servers);

    pcRef.current = pc;

    const localStream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video
      });

    localStreamRef.current = localStream;

    localStream
      .getTracks()
      .forEach((track) => {
        pc.addTrack(track, localStream);
      });

    const remoteStream =
      new MediaStream();

    remoteStreamRef.current = remoteStream;

    pc.ontrack = (event) => {
      event.streams[0]
        ?.getTracks()
        ?.forEach((track) => {
          remoteStream.addTrack(track);
        });

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject =
          remoteStream;
      }
    };

    const callerCandidatesRef =
      collection(
        db,
        "calls",
        callId,
        "callerCandidates"
      );

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(
          callerCandidatesRef,
          event.candidate.toJSON()
        ).catch(() => {});
      }
    };

    const offer =
      await pc.createOffer();

    await pc.setLocalDescription(offer);

    await setDoc(callRef, {
      callerId: uid,
      calleeId: otherUser.uid,
      members: [uid, otherUser.uid],
      callerName: safeName(otherUser),
      type: video ? "video" : "audio",
      status: "ringing",
      offer: {
        type: offer.type,
        sdp: offer.sdp
      },
      createdAt: serverTimestamp()
    });

    const unsubscribe =
      onSnapshot(callRef, async (snap) => {
        const data = snap.data();

        if (!data) return;

        if (
          data.answer &&
          !pc.currentRemoteDescription
        ) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(
              data.answer
            )
          );
        }

        if (data.status === "ended") {
          cleanupCall(callId);
        }
      });

    unsubCallRef.current = unsubscribe;

    const calleeCandidatesRef =
      collection(
        db,
        "calls",
        callId,
        "calleeCandidates"
      );

    const candidateUnsub =
      onSnapshot(
        calleeCandidatesRef,
        (snap) => {
          snap.docChanges().forEach(
            (change) => {
              if (
                change.type === "added"
              ) {
                pc.addIceCandidate(
                  new RTCIceCandidate(
                    change.doc.data()
                  )
                ).catch(() => {});
              }
            }
          );
        }
      );

    unsubCandidatesRef.current.push(
      candidateUnsub
    );

    setActiveCall({
      callId,
      otherUser,
      video,
      outgoing: true
    });

    setTimeout(() => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject =
          localStream;
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject =
          remoteStream;
      }
    }, 100);
  }

  useEffect(() => {
    if (!uid || !db) return;

    const q = query(
      collection(db, "calls"),
      where("calleeId", "==", uid),
      where("status", "==", "ringing")
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type !== "added") continue;

          const data = change.doc.data();

          let otherUser = {
            uid: data.callerId,
            name:
              data.callerName || "User"
          };

          try {
            const userSnap =
              await getDoc(
                doc(
                  db,
                  "users",
                  data.callerId
                )
              );

            if (userSnap.exists()) {
              otherUser = {
                uid: data.callerId,
                ...userSnap.data()
              };
            }
          } catch {}

          setIncoming({
            callId: change.doc.id,
            data,
            otherUser
          });
        }
      }
    );

    return () => unsub();
  }, [uid]);

  async function acceptCall(call) {
    const {
      callId,
      data,
      otherUser
    } = call;

    const pc =
      new RTCPeerConnection(servers);

    pcRef.current = pc;

    const video =
      data.type === "video";

    const localStream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
        video
      });

    localStreamRef.current =
      localStream;

    localStream
      .getTracks()
      .forEach((track) => {
        pc.addTrack(track, localStream);
      });

    const remoteStream =
      new MediaStream();

    remoteStreamRef.current =
      remoteStream;

    pc.ontrack = (event) => {
      event.streams[0]
        ?.getTracks()
        ?.forEach((track) => {
          remoteStream.addTrack(track);
        });

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject =
          remoteStream;
      }
    };

    const calleeCandidatesRef =
      collection(
        db,
        "calls",
        callId,
        "calleeCandidates"
      );

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(
          calleeCandidatesRef,
          event.candidate.toJSON()
        ).catch(() => {});
      }
    };

    await pc.setRemoteDescription(
      new RTCSessionDescription(
        data.offer
      )
    );

    const answer =
      await pc.createAnswer();

    await pc.setLocalDescription(answer);

    await updateDoc(
      doc(db, "calls", callId),
      {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        },
        status: "active"
      }
    );

    const callerCandidatesRef =
      collection(
        db,
        "calls",
        callId,
        "callerCandidates"
      );

    const candidateUnsub =
      onSnapshot(
        callerCandidatesRef,
        (snap) => {
          snap.docChanges().forEach(
            (change) => {
              if (
                change.type === "added"
              ) {
                pc.addIceCandidate(
                  new RTCIceCandidate(
                    change.doc.data()
                  )
                ).catch(() => {});
              }
            }
          );
        }
      );

    unsubCandidatesRef.current.push(
      candidateUnsub
    );

    const callRef =
      doc(db, "calls", callId);

    const unsubscribe =
      onSnapshot(callRef, (snap) => {
        const callData =
          snap.data();

        if (
          callData?.status === "ended"
        ) {
          cleanupCall(callId);
        }
      });

    unsubCallRef.current =
      unsubscribe;

    setIncoming(null);

    setActiveCall({
      callId,
      otherUser,
      video,
      outgoing: false
    });

    setTimeout(() => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject =
          localStream;
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject =
          remoteStream;
      }
    }, 100);
  }

  return {
    incoming,
    activeCall,
    remoteVideoRef,
    localVideoRef,
    startCall,
    acceptCall,
    hangup: cleanupCall
  };
}


/* =========================================================
   CALL UI
========================================================= */

function CallUI({
  callManager
}) {
  const {
    incoming,
    activeCall,
    remoteVideoRef,
    localVideoRef,
    acceptCall,
    hangup
  } = callManager;

  if (incoming) {
    return (
      <div className="callModal">
        <div className="callCard">

          <div className="callAvatar">
            {incoming.otherUser?.photoURL ? (
              <img
                src={
                  incoming.otherUser.photoURL
                }
                alt=""
              />
            ) : (
              initials(
                incoming.otherUser
              )
            )}
          </div>

          <h2>
            {safeName(
              incoming.otherUser
            )}
          </h2>

          <div className="subtle">
            Incoming{" "}
            {incoming.data?.type ===
            "video"
              ? "video"
              : "audio"}{" "}
            call
          </div>

          <div className="callActions">

            <button
              className="callAction reject"
              onClick={() =>
                hangup(
                  incoming.callId
                )
              }
            >
              ✕
            </button>

            <button
              className="callAction accept"
              onClick={() =>
                acceptCall(
                  incoming
                )
              }
            >
              ✓
            </button>

          </div>
        </div>
      </div>
    );
  }

  if (!activeCall) {
    return null;
  }

  return (
    <div className="callModal">

      <div className="activeCall">

        <video
          ref={remoteVideoRef}
          className="remoteVideo"
          autoPlay
          playsInline
        />

        {activeCall.video && (
          <video
            ref={localVideoRef}
            className="localVideo"
            autoPlay
            muted
            playsInline
          />
        )}

        {!activeCall.video && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "white",
              fontSize: 24,
              fontWeight: 800
            }}
          >
            {safeName(
              activeCall.otherUser
            )}
          </div>
        )}

        <div className="activeCallBottom">

          <button
            className="callAction reject"
            onClick={() =>
              hangup(
                activeCall.callId
              )
            }
          >
            ☎
          </button>

        </div>

      </div>
    </div>
  );
}


/* =========================================================
   CHAT
========================================================= */

function Chat({
  uid,
  otherUser,
  onBack,
  onStartCall
}) {
  const chatId =
    chatIdFor(uid, otherUser.uid);

  const messages =
    useChatMessages(
      chatId,
      uid
    );

  const [text, setText] = useState("");
  const [editing, setEditing] =
    useState(null);

  const [recording, setRecording] =
    useState(false);

  const mediaRecorderRef =
    useRef(null);

  const chunksRef =
    useRef([]);

  const messagesRef =
    useRef(null);

  const fileInputRef =
    useRef(null);

  const videoInputRef =
    useRef(null);

  useEffect(() => {
    const box =
      messagesRef.current;

    if (!box) return;

    box.scrollTop =
      box.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    markSeen();
  }, [messages.length]);

  async function ensureChat() {
    const chatRef =
      doc(db, "chats", chatId);

    const snap =
      await getDoc(chatRef);

    if (!snap.exists()) {
      await setDoc(chatRef, {
        members: [
          uid,
          otherUser.uid
        ],
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
        lastMessage: null,
        pinnedBy: [],
        hiddenBy: [],
        deletedBy: []
      });
    }

    return chatRef;
  }

  async function markSeen() {
    if (!db || !uid) return;

    for (const message of messages) {
      if (
        message.senderId !== uid &&
        !(message.seenBy || []).includes(uid)
      ) {
        updateDoc(
          doc(
            db,
            "chats",
            chatId,
            "messages",
            message.id
          ),
          {
            seenBy: arrayUnion(uid),
            deliveredTo:
              arrayUnion(uid)
          }
        ).catch(() => {});
      }
    }
  }

  async function sendMessage(
    customText = text,
    type = "text",
    mediaUrl = ""
  ) {
    const value =
      customText.trim();

    if (
      type === "text" &&
      !value
    ) {
      return;
    }

    await ensureChat();

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
          text: value,
          edited: true,
          updatedAt:
            serverTimestamp()
        }
      );

      setEditing(null);
      setText("");

      return;
    }

    const messageData = {
      senderId: uid,
      text:
        type === "text"
          ? value
          : "",
      type,
      mediaUrl,
      createdAt:
        serverTimestamp(),
      deliveredTo: [],
      seenBy: [],
      likes: []
    };

    await addDoc(
      collection(
        db,
        "chats",
        chatId,
        "messages"
      ),
      messageData
    );

    await updateDoc(
      doc(db, "chats", chatId),
      {
        members: [
          uid,
          otherUser.uid
        ],
        updatedAt:
          serverTimestamp(),
        lastMessage:
          messageData
      }
    );

    setText("");
  }

  async function uploadMedia(
    file,
    type
  ) {
    if (!file) return;

    if (!storage) {
      alert(
        "Firebase Storage is not enabled yet. Upgrade/setup Storage first."
      );
      return;
    }

    try {
      const path =
        `chatMedia/${chatId}/${Date.now()}_${file.name}`;

      const storageRef =
        ref(storage, path);

      await uploadBytes(
        storageRef,
        file
      );

      const url =
        await getDownloadURL(
          storageRef
        );

      await sendMessage(
        "",
        type,
        url
      );
    } catch (error) {
      console.error(error);
      alert(
        "Upload failed. Please check Firebase Storage."
      );
    }
  }

  async function startRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices) {
      alert(
        "Microphone is not available."
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      const recorder =
        new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable =
        (event) => {
          if (event.data.size) {
            chunksRef.current.push(
              event.data
            );
          }
        };

      recorder.onstop =
        async () => {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          const blob =
            new Blob(
              chunksRef.current,
              {
                type:
                  "audio/webm"
              }
            );

          if (!storage) {
            alert(
              "Storage is not enabled yet."
            );
            return;
          }

          try {
            const path =
              `chatMedia/${chatId}/voice_${Date.now()}.webm`;

            const storageRef =
              ref(storage, path);

            await uploadBytes(
              storageRef,
              blob
            );

            const url =
              await getDownloadURL(
                storageRef
              );

            await sendMessage(
              "",
              "audio",
              url
            );
          } catch (error) {
            console.error(error);
            alert(
              "Voice upload failed."
            );
          }
        };

      mediaRecorderRef.current =
        recorder;

      recorder.start();

      setRecording(true);

      recorder.onstop =
        ((originalStop) => async (...args) => {
          setRecording(false);

          if (originalStop) {
            await originalStop(...args);
          }
        })(recorder.onstop);
    } catch (error) {
      console.error(error);
      alert(
        "Microphone permission is required."
      );
    }
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
        deletedFor:
          arrayUnion(uid)
      }
    );
  }

  async function deleteForEveryone(
    message
  ) {
    if (
      message.senderId !== uid
    ) {
      return;
    }

    await updateDoc(
      doc(
        db,
        "chats",
        chatId,
        "messages",
        message.id
      ),
      {
        text:
          "This message was deleted",
        type: "text",
        mediaUrl: "",
        deleted: true
      }
    );
  }

  async function toggleLike(message) {
    const likes =
      message.likes || [];

    const liked =
      likes.includes(uid);

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
          ? arrayRemove(uid)
          : arrayUnion(uid)
      }
    );
  }

  function editMessage(message) {
    if (
      message.senderId !== uid ||
      message.deleted
    ) {
      return;
    }

    setEditing(message);
    setText(
      message.text || ""
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

        <div className="avatar small">
          {otherUser.photoURL ? (
            <img
              src={
                otherUser.photoURL
              }
              alt=""
            />
          ) : (
            initials(otherUser)
          )}
        </div>

        <div className="chatHeaderInfo">
          <div className="chatHeaderName">
            {safeName(otherUser)}
          </div>

          <div className="chatHeaderStatus">
            {otherUser.online
              ? "online"
              : "offline"}
          </div>
        </div>

        <div className="callBtns">

          <button
            className="circleBtn"
            title="Audio call"
            onClick={() =>
              onStartCall(
                otherUser,
                false
              )
            }
          >
            ☎
          </button>

          <button
            className="circleBtn"
            title="Video call"
            onClick={() =>
              onStartCall(
                otherUser,
                true
              )
            }
          >
            ▣
          </button>

        </div>

      </div>


      <div
        className="messages"
        ref={messagesRef}
      >

        {messages
          .filter(
            (m) =>
              !(m.deletedFor || [])
                .includes(uid)
          )
          .map((message) => {

            const mine =
              message.senderId === uid;

            const status =
              messageStatus(
                message,
                uid
              );

            return (
              <div
                key={message.id}
                className={
                  "messageLine " +
                  (mine
                    ? "mine"
                    : "")
                }
              >

                <div className="bubble">

                  {message.type ===
                    "image" &&
                    message.mediaUrl && (
                      <img
                        className="messageMedia"
                        src={
                          message.mediaUrl
                        }
                        alt=""
                      />
                    )}

                  {message.type ===
                    "video" &&
                    message.mediaUrl && (
                      <video
                        className="messageMedia"
                        src={
                          message.mediaUrl
                        }
                        controls
                      />
                    )}

                  {message.type ===
                    "audio" &&
                    message.mediaUrl && (
                      <audio
                        src={
                          message.mediaUrl
                        }
                        controls
                      />
                    )}

                  {message.text && (
                    <div
                      className="bubbleText"
                    >
                      {message.text}
                    </div>
                  )}

                  <div className="messageMeta">

                    <span>
                      {timeText(
                        message.createdAt
                      )}
                    </span>

                    {message.edited &&
                      !message.deleted && (
                        <span>
                          edited
                        </span>
                      )}

                    {mine && (
                      <span
                        className={
                          "tick " +
                          (status ===
                          "seen"
                            ? "seen"
                            : "")
                        }
                      >
                        {status ===
                        "sent"
                          ? "✓"
                          : "✓✓"}
                      </span>
                    )}

                  </div>

                  <div className="messageActions">

                    <button
                      className="messageActionBtn"
                      onClick={() =>
                        toggleLike(
                          message
                        )
                      }
                    >
                      {(message.likes ||
                        []).includes(uid)
                        ? "♥"
                        : "♡"}
                    </button>

                    {mine &&
                      !message.deleted && (
                        <button
                          className="messageActionBtn"
                          onClick={() =>
                            editMessage(
                              message
                            )
                          }
                        >
                          Edit
                        </button>
                      )}

                    <button
                      className="messageActionBtn"
                      onClick={() =>
                        deleteForMe(
                          message
                        )
                      }
                    >
                      Delete
                    </button>

                    {mine &&
                      !message.deleted && (
                        <button
                          className="messageActionBtn"
                          onClick={() =>
                            deleteForEveryone(
                              message
                            )
                          }
                        >
                          Everyone
                        </button>
                      )}

                  </div>

                </div>

              </div>
            );
          })}

      </div>


      <div className="composer">

        <button
          className="circleBtn"
          title="Photo"
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          ＋
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            uploadMedia(
              e.target.files?.[0],
              "image"
            );
            e.target.value = "";
          }}
        />

        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => {
            uploadMedia(
              e.target.files?.[0],
              "video"
            );
            e.target.value = "";
          }}
        />

        <button
          className="circleBtn"
          title="Video"
          onClick={() =>
            videoInputRef.current?.click()
          }
        >
          ▷
        </button>

        <input
          className="input"
          placeholder={
            editing
              ? "Edit message..."
              : "Message"
          }
          value={text}
          onChange={(e) =>
            setText(e.target.value)
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />

        <button
          className={
            "circleBtn " +
            (recording
              ? "recording"
              : "")
          }
          title="Voice recorder"
          onClick={startRecording}
        >
          🎤
        </button>

        <button
          className="primary"
          onClick={() =>
            sendMessage()
          }
        >
          {editing ? "Save" : "Send"}
        </button>

      </div>

    </div>
  );
}


/* =========================================================
   CHATS
========================================================= */

function Chats({
  uid,
  onOpenChat
}) {
  const [chats, setChats] =
    useState([]);

  const [users, setUsers] =
    useState({});

  const [context, setContext] =
    useState(null);

  useEffect(() => {
    if (!uid || !db) return;

    const q = query(
      collection(db, "chats"),
      where(
        "members",
        "array-contains",
        uid
      )
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const rows =
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          }));

        setChats(rows);

        const map = {};

        for (const chat of rows) {
          const other =
            otherMember(
              chat,
              uid
            );

          if (!other) continue;

          try {
            const snapUser =
              await getDoc(
                doc(
                  db,
                  "users",
                  other
                )
              );

            if (snapUser.exists()) {
              map[other] = {
                uid: other,
                ...snapUser.data()
              };
            }
          } catch {}
        }

        setUsers(map);
      }
    );

    return () => unsub();
  }, [uid]);

  const visibleChats =
    useMemo(() => {
      return chats
        .filter(
          (chat) =>
            !(chat.hiddenBy || [])
              .includes(uid) &&
            !(chat.deletedBy || [])
              .includes(uid)
        )
        .sort((a, b) => {

          const ap =
            (a.pinnedBy || [])
              .includes(uid);

          const bp =
            (b.pinnedBy || [])
              .includes(uid);

          if (ap !== bp) {
            return ap ? -1 : 1;
          }

          return (
            getMillis(b.updatedAt) -
            getMillis(a.updatedAt)
          );
        });
    }, [chats, uid]);

  async function togglePin(chat) {
    const pinned =
      (chat.pinnedBy || [])
        .includes(uid);

    if (!pinned) {
      const count =
        chats.filter((c) =>
          (c.pinnedBy || [])
            .includes(uid)
        ).length;

      if (count >= 10) {
        alert(
          "Maximum 10 chats can be pinned."
        );
        return;
      }
    }

    await updateDoc(
      doc(db, "chats", chat.id),
      {
        pinnedBy: pinned
          ? arrayRemove(uid)
          : arrayUnion(uid)
      }
    );

    setContext(null);
  }

  async function hideChat(chat) {
    await updateDoc(
      doc(db, "chats", chat.id),
      {
        hiddenBy:
          arrayUnion(uid)
      }
    );

    setContext(null);
  }

  async function deleteChat(chat) {
    await updateDoc(
      doc(db, "chats", chat.id),
      {
        deletedBy:
          arrayUnion(uid)
      }
    );

    setContext(null);
  }

  function longPress(
    event,
    chat
  ) {
    event.preventDefault();

    const x =
      Math.min(
        event.clientX || 150,
        window.innerWidth - 210
      );

    const y =
      Math.min(
        event.clientY || 150,
        window.innerHeight - 220
      );

    setContext({
      chat,
      x,
      y
    });
  }

  return (
    <>
      <div className="page">

        <div className="pageHead">
          <div>
            <div className="pageTitle">
              Chats
            </div>

            <div className="subtle">
              Recent chats
            </div>
          </div>
        </div>

        {visibleChats.length === 0 ? (
          <div className="empty">
            No chats yet.
          </div>
        ) : (
          <div className="chatList">

            {visibleChats.map(
              (chat) => {

                const otherId =
                  otherMember(
                    chat,
                    uid
                  );

                const user =
                  users[otherId] || {
                    uid: otherId,
                    name: "User"
                  };

                const pinned =
                  (chat.pinnedBy || [])
                    .includes(uid);

                return (
                  <div
                    key={chat.id}
                    className="chatRow"
                    onClick={() =>
                      onOpenChat(user)
                    }
                    onContextMenu={(e) =>
                      longPress(
                        e,
                        chat
                      )
                    }
                    onPointerDown={(e) => {

                      if (
                        e.pointerType !==
                        "touch"
                      ) {
                        return;
                      }

                      const timer =
                        setTimeout(() => {
                          longPress(
                            e,
                            chat
                          );
                        }, 650);

                      e.currentTarget
                        .dataset
                        .holdTimer = timer;
                    }}
                    onPointerUp={(e) => {

                      const timer =
                        e.currentTarget
                          .dataset
                          .holdTimer;

                      if (timer) {
                        clearTimeout(
                          Number(timer)
                        );
                      }
                    }}
                    onPointerCancel={(e) => {

                      const timer =
                        e.currentTarget
                          .dataset
                          .holdTimer;

                      if (timer) {
                        clearTimeout(
                          Number(timer)
                        );
                      }
                    }}
                  >

                    <div className="avatar">

                      {user.photoURL ? (
                        <img
                          src={
                            user.photoURL
                          }
                          alt=""
                        />
                      ) : (
                        initials(user)
                      )}

                    </div>

                    <div className="chatRowMain">

                      <div className="chatRowTop">

                        <div className="chatName">
                          {safeName(user)}

                          {pinned && (
                            <span className="pinBadge">
                              📌
                            </span>
                          )}
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

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

      {context && (
        <>

          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 199
            }}
            onClick={() =>
              setContext(null)
            }
          />

          <div
            className="contextMenu"
            style={{
              left: context.x,
              top: context.y
            }}
          >

            <button
              onClick={() =>
                togglePin(
                  context.chat
                )
              }
            >
              {(context.chat.pinnedBy || [])
                .includes(uid)
                ? "Unpin chat"
                : "Pin chat"}
            </button>

            <button
              onClick={() =>
                hideChat(
                  context.chat
                )
              }
            >
              Hide chat
            </button>

            <button
              className="dangerItem"
              onClick={() =>
                deleteChat(
                  context.chat
                )
              }
            >
              Delete chat
            </button>

          </div>

        </>
      )}

    </>
  );
}


/* =========================================================
   PEOPLE
========================================================= */

function People({
  uid,
  onOpenChat
}) {
  const [search, setSearch] =
    useState("");

  const [results, setResults] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [history, setHistory] =
    useState([]);

  const [showHistoryMenu, setShowHistoryMenu] =
    useState(false);

  useEffect(() => {
    if (!uid || !db) return;

    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        const data =
          snap.data() || {};

        setHistory(
          Array.isArray(
            data.searchHistory
          )
            ? data.searchHistory
            : []
        );
      }
    );

    return () => unsub();
  }, [uid]);

  async function saveHistory(value) {
    const clean =
      value.trim();

    if (!clean) return;

    const old =
      history.filter(
        (x) =>
          normalizeText(x) !==
          normalizeText(clean)
      );

    const next =
      [clean, ...old].slice(0, 20);

    await updateDoc(
      doc(db, "users", uid),
      {
        searchHistory: next
      }
    );
  }

  async function removeHistory(
    value
  ) {
    const next =
      history.filter(
        (x) =>
          normalizeText(x) !==
          normalizeText(value)
      );

    await updateDoc(
      doc(db, "users", uid),
      {
        searchHistory: next
      }
    );
  }

  async function clearHistory() {
    await updateDoc(
      doc(db, "users", uid),
      {
        searchHistory: []
      }
    );

    setShowHistoryMenu(false);
  }

  async function searchPeople(
    value = search
  ) {
    const clean =
      value.trim();

    if (!clean) {
      setResults([]);
      return;
    }

    setSearch(clean);
    setLoading(true);

    await saveHistory(clean);

    const lower =
      normalizeText(clean);

    const phone =
      normalizePhone(clean);

    const found = new Map();

    try {

      const usernameQuery =
        query(
          collection(db, "users"),
          where(
            "username",
            "==",
            lower
          )
        );

      const emailQuery =
        query(
          collection(db, "users"),
          where(
            "email",
            "==",
            lower
          )
        );

      const phoneQuery =
        phone
          ? query(
              collection(
                db,
                "users"
              ),
              where(
                "phoneNumber",
                "==",
                phone
              )
            )
          : null;

      const [
        usernameSnap,
        emailSnap,
        phoneSnap
      ] = await Promise.all([
        getDocs(usernameQuery),
        getDocs(emailQuery),
        phoneQuery
          ? getDocs(phoneQuery)
          : Promise.resolve(null)
      ]);

      usernameSnap.forEach(
        (snap) => {
          if (snap.id !== uid) {
            found.set(
              snap.id,
              {
                uid: snap.id,
                ...snap.data()
              }
            );
          }
        }
      );

      emailSnap.forEach(
        (snap) => {
          if (snap.id !== uid) {
            found.set(
              snap.id,
              {
                uid: snap.id,
                ...snap.data()
              }
            );
          }
        }
      );

      phoneSnap?.forEach(
        (snap) => {
          if (snap.id !== uid) {
            found.set(
              snap.id,
              {
                uid: snap.id,
                ...snap.data()
              }
            );
          }
        }
      );

      setResults(
        Array.from(found.values())
      );

    } catch (error) {
      console.error(error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function openPerson(user) {
    const chatId =
      chatIdFor(
        uid,
        user.uid
      );

    try {

      const chatRef =
        doc(db, "chats", chatId);

      const snap =
        await getDoc(chatRef);

      if (snap.exists()) {

        /*
          Important:
          Hidden chat automatically becomes
          visible when searched and opened.
        */

        await updateDoc(
          chatRef,
          {
            hiddenBy:
              arrayRemove(uid),
            deletedBy:
              arrayRemove(uid),
            updatedAt:
              serverTimestamp()
          }
        );

      } else {

        await setDoc(
          chatRef,
          {
            members: [
              uid,
              user.uid
            ],
            createdAt:
              serverTimestamp(),
            updatedAt:
              serverTimestamp(),
            lastMessage: null,
            pinnedBy: [],
            hiddenBy: [],
            deletedBy: []
          }
        );

      }

      onOpenChat(user);

    } catch (error) {
      console.error(error);
      onOpenChat(user);
    }
  }

  async function poke(user) {
    try {

      const chatId =
        chatIdFor(
          uid,
          user.uid
        );

      await setDoc(
        doc(db, "chats", chatId),
        {
          members: [
            uid,
            user.uid
          ],
          updatedAt:
            serverTimestamp(),
          lastMessage: {
            senderId: uid,
            text: "👋 Poked you",
            type: "text",
            createdAt:
              serverTimestamp()
          }
        },
        {
          merge: true
        }
      );

      await addDoc(
        collection(
          db,
          "chats",
          chatId,
          "messages"
        ),
        {
          senderId: uid,
          text: "👋 Poked you",
          type: "text",
          createdAt:
            serverTimestamp(),
          deliveredTo: [],
          seenBy: []
        }
      );

      alert("Poked!");

    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="page">

      <div className="pageHead">

        <div>
          <div className="pageTitle">
            People
          </div>

          <div className="subtle">
            Search by number, username or email
          </div>
        </div>

      </div>


      <div className="searchBox">

        <input
          className="input"
          placeholder="Mobile number / username / email"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              searchPeople();
            }
          }}
        />

        <button
          className="primary"
          onClick={() =>
            searchPeople()
          }
        >
          Search
        </button>

      </div>


      {history.length > 0 && (
        <>

          <div className="historyHead">

            <div className="historyTitle">
              Search history
            </div>

            <div
              style={{
                position: "relative"
              }}
            >

              <button
                className="iconBtn"
                onClick={() =>
                  setShowHistoryMenu(
                    !showHistoryMenu
                  )
                }
              >
                ⋮
              </button>

              {showHistoryMenu && (
                <div
                  className="contextMenu"
                  style={{
                    right: 0,
                    top: 44
                  }}
                >
                  <button
                    onClick={
                      clearHistory
                    }
                  >
                    Clear all search history
                  </button>
                </div>
              )}

            </div>

          </div>


          <div className="historyList">

            {history.map(
              (item, index) => (
                <div
                  className="historyRow"
                  key={
                    item + index
                  }
                >

                  <button
                    style={{
                      border: 0,
                      background:
                        "transparent",
                      padding: 0,
                      fontSize: 18
                    }}
                    onClick={() =>
                      searchPeople(
                        item
                      )
                    }
                  >
                    🔎
                  </button>

                  <div
                    className="historyText"
                    onClick={() =>
                      searchPeople(
                        item
                      )
                    }
                  >
                    {item}
                  </div>

                  <button
                    className="historyX"
                    title="Delete this search"
                    onClick={() =>
                      removeHistory(
                        item
                      )
                    }
                  >
                    ×
                  </button>

                </div>
              )
            )}

          </div>

        </>
      )}


      {loading && (
        <div className="empty">
          Searching...
        </div>
      )}


      {!loading &&
        search &&
        results.length === 0 && (
          <div className="empty">
            No user found.
          </div>
        )}


      <div>

        {results.map((user) => (
          <div
            className="personRow"
            key={user.uid}
          >

            <div className="avatar">

              {user.photoURL ? (
                <img
                  src={
                    user.photoURL
                  }
                  alt=""
                />
              ) : (
                initials(user)
              )}

            </div>

            <div className="personInfo">

              <div className="personName">
                {safeName(user)}
              </div>

              <div className="personMeta">
                {user.username
                  ? `@${user.username}`
                  : user.email ||
                    user.phoneNumber ||
                    ""}
              </div>

            </div>

            <button
              className="secondary"
              onClick={() =>
                openPerson(user)
              }
            >
              Chat
            </button>

            <button
              className="secondary"
              onClick={() =>
                poke(user)
              }
            >
              👋
            </button>

          </div>
        ))}

      </div>

    </div>
  );
}


/* =========================================================
   STORIES
========================================================= */

function Stories({
  uid,
  profile
}) {
  const [stories, setStories] =
    useState([]);

  const [viewer, setViewer] =
    useState(null);

  const fileInputRef =
    useRef(null);

  useEffect(() => {
    if (!uid || !db) return;

    const q =
      query(
        collection(db, "stories"),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsub =
      onSnapshot(
        q,
        (snap) => {

          const now =
            Date.now();

          const rows =
            snap.docs
              .map((d) => ({
                id: d.id,
                ...d.data()
              }))
              .filter((story) => {

                if (
                  story.expiresAt
                ) {
                  return (
                    getMillis(
                      story.expiresAt
                    ) > now
                  );
                }

                return true;
              });

          rows.sort((a, b) => {

            const am =
              a.uid === uid;

            const bm =
              b.uid === uid;

            if (am !== bm) {
              return am ? -1 : 1;
            }

            return (
              getMillis(
                b.createdAt
              ) -
              getMillis(
                a.createdAt
              )
            );
          });

          setStories(rows);
        }
      );

    return () => unsub();
  }, [uid]);

  async function addStory(file) {
    if (!file) return;

    if (!storage) {
      alert(
        "Firebase Storage is not enabled yet."
      );
      return;
    }

    try {

      const path =
        `stories/${uid}/${Date.now()}_${file.name}`;

      const storageRef =
        ref(storage, path);

      await uploadBytes(
        storageRef,
        file
      );

      const url =
        await getDownloadURL(
          storageRef
        );

      await addDoc(
        collection(db, "stories"),
        {
          uid,
          name: safeName(profile),
          photoURL:
            profile?.photoURL || "",
          mediaUrl: url,
          type:
            file.type.startsWith(
              "video/"
            )
              ? "video"
              : "image",
          createdAt:
            serverTimestamp(),
          expiresAt:
            new Date(
              Date.now() +
                24 * 60 * 60 * 1000
            ),
          likes: []
        }
      );

    } catch (error) {
      console.error(error);
      alert(
        "Story upload failed."
      );
    }
  }

  async function likeStory(
    story
  ) {
    const liked =
      (story.likes || [])
        .includes(uid);

    await updateDoc(
      doc(
        db,
        "stories",
        story.id
      ),
      {
        likes: liked
          ? arrayRemove(uid)
          : arrayUnion(uid)
      }
    );
  }

  async function deleteStory(
    story
  ) {
    if (story.uid !== uid) {
      return;
    }

    await deleteDoc(
      doc(
        db,
        "stories",
        story.id
      )
    );

    if (
      viewer?.id === story.id
    ) {
      setViewer(null);
    }
  }

  const myStory =
    stories.find(
      (s) => s.uid === uid
    );

  const otherStories =
    stories.filter(
      (s) => s.uid !== uid
    );

  return (
    <div className="page">

      <div className="pageHead">

        <div>
          <div className="pageTitle">
            Stories
          </div>

          <div className="subtle">
            Stories disappear after 24 hours
          </div>
        </div>

      </div>


      <div className="storiesGrid">

        <div
          className="storyCard addStory"
          onClick={() =>
            fileInputRef.current?.click()
          }
        >

          <div>

            <div className="addStoryPlus">
              +
            </div>

            <strong>
              Add my story
            </strong>

          </div>

        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(e) => {
            addStory(
              e.target.files?.[0]
            );
            e.target.value = "";
          }}
        />


        {myStory && (
          <div
            className="storyCard"
            onClick={() =>
              setViewer(myStory)
            }
          >

            {myStory.type ===
            "video" ? (
              <video
                src={
                  myStory.mediaUrl
                }
              />
            ) : (
              <img
                src={
                  myStory.mediaUrl
                }
                alt=""
              />
            )}

            <div className="storyOverlay">
              <strong>
                My story
              </strong>
            </div>

          </div>
        )}


        {otherStories.map(
          (story) => (
            <div
              className="storyCard"
              key={story.id}
              onClick={() =>
                setViewer(story)
              }
            >

              {story.type ===
              "video" ? (
                <video
                  src={
                    story.mediaUrl
                  }
                />
              ) : (
                <img
                  src={
                    story.mediaUrl
                  }
                  alt=""
                />
              )}

              <div className="storyOverlay">

                <strong>
                  {story.name ||
                    "User"}
                </strong>

                <span>
                  {timeText(
                    story.createdAt
                  )}
                </span>

              </div>

            </div>
          )
        )}

      </div>


      {stories.length === 0 && (
        <div className="empty">
          No active stories.
        </div>
      )}


      {viewer && (
        <div className="storyViewer">

          <div className="storyViewerContent">

            <div className="storyViewerTop">

              <div>
                <strong>
                  {viewer.uid === uid
                    ? "My story"
                    : viewer.name ||
                      "User"}
                </strong>

                <div
                  style={{
                    fontSize: 12,
                    opacity: .7
                  }}
                >
                  {dateTimeText(
                    viewer.createdAt
                  )}
                </div>
              </div>

              <button
                className="iconBtn"
                onClick={() =>
                  setViewer(null)
                }
              >
                ×
              </button>

            </div>


            {viewer.type ===
            "video" ? (
              <video
                src={
                  viewer.mediaUrl
                }
                controls
                autoPlay
              />
            ) : (
              <img
                src={
                  viewer.mediaUrl
                }
                alt=""
              />
            )}


            <div className="storyViewerBottom">

              <button
                className="secondary"
                onClick={() =>
                  likeStory(
                    viewer
                  )
                }
              >
                {(viewer.likes || [])
                  .includes(uid)
                  ? "♥ Liked"
                  : "♡ Like"}
              </button>

              <span>
                {(viewer.likes || [])
                  .length}{" "}
                likes
              </span>

              {viewer.uid === uid && (
                <button
                  className="danger"
                  onClick={() =>
                    deleteStory(
                      viewer
                    )
                  }
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
   CALL HISTORY
========================================================= */

function CallsPage({
  uid,
  onStartCall
}) {
  const [calls, setCalls] =
    useState([]);

  const [users, setUsers] =
    useState({});

  useEffect(() => {
    if (!uid || !db) return;

    const q =
      query(
        collection(db, "calls"),
        where(
          "members",
          "array-contains",
          uid
        )
      );

    const unsub =
      onSnapshot(
        q,
        async (snap) => {

          const rows =
            snap.docs
              .map((d) => ({
                id: d.id,
                ...d.data()
              }))
              .sort(
                (a, b) =>
                  getMillis(
                    b.createdAt
                  ) -
                  getMillis(
                    a.createdAt
                  )
              );

          setCalls(rows);

          const map = {};

          for (const call of rows) {

            const other =
              otherMember(
                call,
                uid
              );

            if (!other) continue;

            try {
              const snapUser =
                await getDoc(
                  doc(
                    db,
                    "users",
                    other
                  )
                );

              if (
                snapUser.exists()
              ) {
                map[other] = {
                  uid: other,
                  ...snapUser.data()
                };
              }
            } catch {}
          }

          setUsers(map);
        }
      );

    return () => unsub();
  }, [uid]);

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


      {calls.length === 0 ? (
        <div className="empty">
          No calls yet.
        </div>
      ) : (
        calls.map((call) => {

          const other =
            otherMember(
              call,
              uid
            );

          const user =
            users[other] || {
              uid: other,
              name: "User"
            };

          return (
            <div
              className="personRow"
              key={call.id}
            >

              <div className="avatar">
                {user.photoURL ? (
                  <img
                    src={
                      user.photoURL
                    }
                    alt=""
                  />
                ) : (
                  initials(user)
                )}
              </div>

              <div className="personInfo">

                <div className="personName">
                  {safeName(user)}
                </div>

                <div className="personMeta">
                  {call.type ===
                  "video"
                    ? "Video call"
                    : "Audio call"}{" "}
                  ·{" "}
                  {dateTimeText(
                    call.createdAt
                  )}
                </div>

              </div>

              <button
                className="circleBtn"
                onClick={() =>
                  onStartCall(
                    user,
                    call.type ===
                      "video"
                  )
                }
              >
                {call.type ===
                "video"
                  ? "▣"
                  : "☎"}
              </button>

            </div>
          );
        })
      )}

    </div>
  );
}


/* =========================================================
   SETTINGS
========================================================= */

function Settings({
  uid,
  profile,
  onLogout
}) {
  const [name, setName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [hobbies, setHobbies] =
    useState("");

  const [photoURL, setPhotoURL] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const fileInputRef =
    useRef(null);

  useEffect(() => {

    if (!profile) return;

    setName(
      profile.name ||
      profile.displayName ||
      ""
    );

    setUsername(
      profile.username ||
      ""
    );

    setPhoneNumber(
      profile.phoneNumber ||
      ""
    );

    setBio(
      profile.bio ||
      ""
    );

    setHobbies(
      profile.hobbies ||
      ""
    );

    setPhotoURL(
      profile.photoURL ||
      ""
    );

  }, [profile]);

  async function save() {
    setSaving(true);

    try {

      const existingUsername =
        profile?.username || "";

      const normalizedUsername =
        normalizeText(
          username
        );

      const data = {
        name:
          name.trim(),
        displayName:
          name.trim(),
        phoneNumber:
          normalizePhone(
            phoneNumber
          ),
        bio:
          bio.trim(),
        hobbies:
          hobbies.trim(),
        photoURL:
          photoURL,
        updatedAt:
          serverTimestamp()
      };

      if (
        !existingUsername &&
        normalizedUsername
      ) {
        data.username =
          normalizedUsername;
      }

      await setDoc(
        doc(
          db,
          "users",
          uid
        ),
        data,
        {
          merge: true
        }
      );

      try {
        await updateProfile(
          auth.currentUser,
          {
            displayName:
              name.trim(),
            photoURL:
              photoURL || null
          }
        );
      } catch {}

      alert(
        "Profile saved."
      );

    } catch (error) {
      console.error(error);
      alert(
        "Unable to save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadProfilePhoto(
    file
  ) {
    if (!file) return;

    if (!storage) {
      alert(
        "Firebase Storage is not enabled yet."
      );
      return;
    }

    try {

      const path =
        `profiles/${uid}/profile_${Date.now()}_${file.name}`;

      const storageRef =
        ref(storage, path);

      await uploadBytes(
        storageRef,
        file
      );

      const url =
        await getDownloadURL(
          storageRef
        );

      setPhotoURL(url);

    } catch (error) {
      console.error(error);
      alert(
        "Profile photo upload failed."
      );
    }
  }

  const usernameLocked =
    Boolean(
      profile?.username
    );

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

      </div>


      <div className="settings">

        <div className="profileCenter">

          <div className="profileLarge">

            {photoURL ? (
              <img
                src={photoURL}
                alt=""
              />
            ) : (
              initials({
                name,
                email:
                  profile?.email
              })
            )}

          </div>

          <br />

          <button
            className="secondary"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            Change profile picture
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              uploadProfilePhoto(
                e.target.files?.[0]
              );
              e.target.value = "";
            }}
          />

        </div>


        <div className="settingGrid">

          <div>
            <div className="settingLabel">
              Name
            </div>

            <input
              className="input"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
            />
          </div>


          <div>

            <div className="settingLabel">
              Username
            </div>

            <input
              className={
                "input " +
                (usernameLocked
                  ? "locked"
                  : "")
              }
              value={username}
              disabled={
                usernameLocked
              }
              placeholder="@username"
              onChange={(e) =>
                setUsername(
                  e.target.value
                    .replace(
                      /\s/g,
                      ""
                    )
                )
              }
            />

            <div className="subtle">
              {usernameLocked
                ? "Username cannot be changed."
                : "Choose your username. It will be locked after saving."}
            </div>

          </div>


          <div>

            <div className="settingLabel">
              Mobile number
            </div>

            <input
              className="input"
              value={phoneNumber}
              placeholder="Mobile number"
              onChange={(e) =>
                setPhoneNumber(
                  e.target.value
                )
              }
            />

          </div>


          <div>

            <div className="settingLabel">
              Email
            </div>

            <input
              className="input locked"
              value={
                profile?.email ||
                ""
              }
              disabled
            />

          </div>


          <div>

            <div className="settingLabel">
              Bio
            </div>

            <textarea
              value={bio}
              onChange={(e) =>
                setBio(
                  e.target.value
                )
              }
              placeholder="Tell people about you"
            />

          </div>


          <div>

            <div className="settingLabel">
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

          </div>


          <button
            className="primary"
            onClick={save}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save profile"}
          </button>


          <button
            className="danger"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   MAIN SOCIAL APP
========================================================= */

function SocialApp({
  uid
}) {
  const [tab, setTab] =
    useState("chats");

  const [chatUser, setChatUser] =
    useState(null);

  const [showSettings, setShowSettings] =
    useState(false);

  const profile =
    useUserProfile(uid);

  usePresence(uid);

  const callManager =
    useCallManager(uid);

  function openChat(user) {
    setChatUser(user);
    setTab("chats");
  }

  function closeChat() {
    setChatUser(null);
  }

  function startCall(
    user,
    video
  ) {
    callManager
      .startCall(
        user,
        video
      )
      .catch((error) => {
        console.error(error);

        alert(
          "Call could not start. Please allow microphone/camera access."
        );
      });
  }

  function handleSwipe(
    e
  ) {
    if (
      chatUser ||
      showSettings
    ) {
      return;
    }

    const target =
      e.target;

    if (
      target.closest(
        ".messages, .composer, input, textarea, button, video, audio"
      )
    ) {
      return;
    }

    const startX =
      e.changedTouches?.[0]
        ?.clientX;

    const startY =
      e.changedTouches?.[0]
        ?.clientY;

    if (
      startX == null ||
      startY == null
    ) {
      return;
    }

    if (
      !window.__chatdoTouchStart
    ) {
      return;
    }

    const diffX =
      startX -
      window.__chatdoTouchStart.x;

    const diffY =
      startY -
      window.__chatdoTouchStart.y;

    if (
      Math.abs(diffX) <
      60
    ) {
      return;
    }

    if (
      Math.abs(diffX) <
      Math.abs(diffY)
    ) {
      return;
    }

    const index =
      TABS.indexOf(tab);

    if (diffX < 0) {
      setTab(
        TABS[
          Math.min(
            index + 1,
            TABS.length - 1
          )
        ]
      );
    } else {
      setTab(
        TABS[
          Math.max(
            index - 1,
            0
          )
        ]
      );
    }
  }

  function touchStart(e) {
    const touch =
      e.touches?.[0];

    if (!touch) return;

    window.__chatdoTouchStart = {
      x: touch.clientX,
      y: touch.clientY
    };
  }

  return (
    <div
      className="app"
      onTouchStart={
        touchStart
      }
      onTouchEnd={
        handleSwipe
      }
    >

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
            title="Settings"
            onClick={() =>
              setShowSettings(
                !showSettings
              )
            }
          >
            ⚙
          </button>

        </div>

      </div>


      <div className="mainWrap">

        {!chatUser &&
          !showSettings && (
            <div className="nav">

              <button
                className={
                  tab === "chats"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTab("chats")
                }
              >
                Chats
              </button>

              <button
                className={
                  tab === "stories"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTab("stories")
                }
              >
                Stories
              </button>

              <button
                className={
                  tab === "calls"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTab("calls")
                }
              >
                Calls
              </button>

              <button
                className={
                  tab === "people"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTab("people")
                }
              >
                People
              </button>

            </div>
          )}


        {showSettings ? (
          <Settings
            uid={uid}
            profile={profile}
            onLogout={() =>
              signOut(auth)
            }
          />
        ) : chatUser ? (
          <div className="page">

            <Chat
              uid={uid}
              otherUser={
                chatUser
              }
              onBack={
                closeChat
              }
              onStartCall={
                startCall
              }
            />

          </div>
        ) : tab ===
          "chats" ? (
          <Chats
            uid={uid}
            onOpenChat={
              openChat
            }
          />
        ) : tab ===
          "stories" ? (
          <Stories
            uid={uid}
            profile={
              profile
            }
          />
        ) : tab ===
          "calls" ? (
          <CallsPage
            uid={uid}
            onStartCall={
              startCall
            }
          />
        ) : (
          <People
            uid={uid}
            onOpenChat={
              openChat
            }
          />
        )}

      </div>


      <CallUI
        callManager={
          callManager
        }
      />

    </div>
  );
}


/* =========================================================
   APP
========================================================= */

function App() {
  const [user, setUser] =
    useState(undefined);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      return;
    }

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(
            currentUser
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <div className="authPage">
        <div>
          Loading Chatdo...
        </div>
      </div>
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

      <SocialApp
        uid={user.uid}
      />
    </>
  );
}


/* =========================================================
   ROOT
========================================================= */

const rootElement =
  document.getElementById("root");

createRoot(
  rootElement
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
