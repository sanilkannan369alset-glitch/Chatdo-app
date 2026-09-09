import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { initializeApp } from "firebase/app";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";

import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit,
  getDoc,
  writeBatch
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

import "./styles.css";


/* =====================================================
   FIREBASE CONFIG
===================================================== */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const usersRef = collection(db, "users");
const storiesRef = collection(db, "stories");


/* =====================================================
   GLOBAL WHATSAPP STYLE
===================================================== */

function WhatsAppStyle() {
  return (
    <style>{`

      * {
        box-sizing: border-box;
      }

      html,
      body,
      #root {
        margin: 0;
        width: 100%;
        height: 100%;
        font-family:
          Inter,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      body {
        background: #efeae2;
      }

      button,
      input {
        font-family: inherit;
      }

      button {
        cursor: pointer;
      }

      .wa-app {
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: #efeae2;
      }

      .wa-topbar {
        height: 64px;
        flex-shrink: 0;
        background: #075e54;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 18px;
      }

      .wa-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .wa-brand-title {
        font-size: 22px;
        font-weight: 700;
      }

      .wa-brand-user {
        font-size: 12px;
        opacity: .85;
      }

      .wa-logout {
        border: 0;
        background: rgba(255,255,255,.14);
        color: white;
        border-radius: 20px;
        padding: 9px 15px;
        font-size: 14px;
      }

      .wa-tabs {
        height: 52px;
        flex-shrink: 0;
        background: #075e54;
        display: flex;
        color: rgba(255,255,255,.75);
      }

      .wa-tab {
        flex: 1;
        border: 0;
        background: transparent;
        color: inherit;
        font-size: 15px;
        font-weight: 600;
        border-bottom: 3px solid transparent;
      }

      .wa-tab.active {
        color: white;
        border-bottom-color: white;
      }

      .wa-main {
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      /* CHAT HOME */

      .wa-chat-layout {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: 310px 1fr;
      }

      .wa-sidebar {
        background: white;
        border-right: 1px solid #ddd;
        overflow-y: auto;
      }

      .wa-sidebar-title {
        padding: 18px;
        font-size: 21px;
        font-weight: 700;
        border-bottom: 1px solid #eee;
      }

      .wa-person {
        width: 100%;
        border: 0;
        background: white;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #f1f1f1;
      }

      .wa-person:hover {
        background: #f5f5f5;
      }

      .wa-person.selected {
        background: #e9f7f4;
      }

      .wa-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #d9fdd3;
        color: #075e54;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 19px;
        font-weight: 700;
        flex-shrink: 0;
      }

      .wa-person-info {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .wa-person-name {
        font-size: 16px;
        font-weight: 600;
        color: #202124;
      }

      .wa-online {
        font-size: 12px;
        color: #25d366;
      }

      .wa-offline {
        font-size: 12px;
        color: #777;
      }

      /* CHAT */

      .wa-chat {
        height: 100%;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .wa-chat-header {
        height: 64px;
        flex-shrink: 0;
        background: #f0f2f5;
        border-bottom: 1px solid #ddd;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 8px 14px;
      }

      .wa-chat-header-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }

      .wa-chat-name {
        font-weight: 700;
        font-size: 16px;
        color: #202124;
      }

      .wa-chat-status {
        font-size: 12px;
        color: #667781;
      }

      .wa-messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 16px 7%;
        background-color: #efeae2;

        background-image:
          radial-gradient(
            rgba(0,0,0,.035) 1px,
            transparent 1px
          );

        background-size: 18px 18px;
      }

      .wa-message-row {
        width: 100%;
        display: flex;
        margin: 4px 0;
      }

      .wa-message-row.mine {
        justify-content: flex-end;
      }

      .wa-message-row.other {
        justify-content: flex-start;
      }

      .wa-bubble {
        position: relative;
        max-width: min(75%, 480px);
        min-width: 55px;
        padding: 7px 9px 5px;
        border-radius: 8px;
        box-shadow: 0 1px 1px rgba(0,0,0,.12);
        word-break: break-word;
      }

      .wa-message-row.mine .wa-bubble {
        background: #d9fdd3;
        border-top-right-radius: 2px;
      }

      .wa-message-row.other .wa-bubble {
        background: white;
        border-top-left-radius: 2px;
      }

      .wa-text {
        display: inline;
        font-size: 15px;
        line-height: 1.45;
        color: #111;
        white-space: pre-wrap;
      }

      .wa-time-line {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        float: right;
        margin-left: 9px;
        margin-top: 7px;
        transform: translateY(2px);
      }

      .wa-time {
        font-size: 10px;
        color: #667781;
      }

      .wa-ticks {
        display: inline-flex;
        align-items: center;
        font-size: 13px;
        font-weight: 700;
        line-height: 1;
      }

      .wa-ticks.sent {
        color: #667781;
      }

      .wa-ticks.seen {
        color: #2196f3;
      }

      .wa-image {
        display: block;
        width: 100%;
        max-width: 300px;
        max-height: 300px;
        object-fit: cover;
        border-radius: 6px;
        margin-bottom: 4px;
      }

      .wa-heart {
        display: block;
        border: 0;
        background: transparent;
        color: #777;
        padding: 2px 0 0;
        font-size: 11px;
      }

      .wa-heart.liked {
        color: #e53935;
      }

      .wa-typing {
        width: fit-content;
        background: white;
        border-radius: 8px;
        padding: 7px 12px;
        margin: 7px 0;
        color: #667781;
        font-size: 13px;
        box-shadow: 0 1px 1px rgba(0,0,0,.1);
      }

      /* COMPOSER */

      .wa-composer {
        flex-shrink: 0;
        min-height: 62px;
        background: #f0f2f5;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 8px 10px;
        border-top: 1px solid #ddd;
      }

      .wa-icon-button {
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: #54656f;
        font-size: 23px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .wa-icon-button:hover {
        background: #e2e6e9;
      }

      .wa-file-label {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #54656f;
        font-size: 23px;
        cursor: pointer;
        flex-shrink: 0;
      }

      .wa-file-label input {
        display: none;
      }

      .wa-textbox {
        flex: 1;
        min-width: 0;
        height: 44px;
        border: 0;
        outline: none;
        border-radius: 22px;
        background: white;
        padding: 0 17px;
        font-size: 15px;
      }

      .wa-send {
        width: 44px;
        height: 44px;
        border: 0;
        border-radius: 50%;
        background: #128c7e;
        color: white;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .wa-send:disabled {
        opacity: .55;
      }

      .wa-selected-file {
        position: absolute;
        bottom: 68px;
        left: 10px;
        right: 10px;
        background: white;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
        color: #54656f;
      }

      /* EMPTY */

      .wa-empty {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 25px;
        color: #667781;
        background: #efeae2;
      }

      .wa-empty-icon {
        font-size: 55px;
        margin-bottom: 10px;
      }

      /* PAGES */

      .wa-page {
        height: 100%;
        overflow-y: auto;
        padding: 20px;
        background: #efeae2;
      }

      .wa-card {
        background: white;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 18px;
        box-shadow: 0 1px 2px rgba(0,0,0,.08);
      }

      .wa-input {
        width: 100%;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 12px;
        margin: 6px 0;
        font-size: 15px;
        outline: none;
      }

      .wa-primary {
        border: 0;
        background: #128c7e;
        color: white;
        border-radius: 8px;
        padding: 11px 18px;
        font-size: 14px;
      }

      .wa-stories {
        display: grid;
        grid-template-columns:
          repeat(auto-fill, minmax(220px, 1fr));
        gap: 15px;
      }

      .wa-story {
        background: white;
        border-radius: 12px;
        padding: 13px;
      }

      .wa-story img {
        width: 100%;
        max-height: 300px;
        object-fit: cover;
        border-radius: 8px;
        margin-top: 10px;
      }

      .wa-story-author {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .wa-people-row {
        background: white;
        padding: 13px;
        margin-bottom: 8px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .wa-people-row button {
        margin-left: auto;
      }

      /* AUTH */

      .wa-auth {
        width: 100%;
        height: 100vh;
        background: #efeae2;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .wa-auth-card {
        width: min(420px, 100%);
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0,0,0,.12);
      }

      .wa-auth-card h1 {
        color: #075e54;
        margin-top: 0;
      }

      .wa-error {
        background: #fff0ef;
        color: #b42318;
        padding: 10px;
        border-radius: 8px;
        margin-top: 10px;
        font-size: 14px;
      }

      .wa-link {
        width: 100%;
        margin-top: 12px;
        border: 0;
        background: transparent;
        color: #128c7e;
        padding: 10px;
      }

      @media (max-width: 700px) {

        .wa-topbar {
          height: 58px;
          padding: 0 13px;
        }

        .wa-brand-title {
          font-size: 20px;
        }

        .wa-tabs {
          height: 48px;
        }

        .wa-chat-layout {
          grid-template-columns: 1fr;
        }

        .wa-sidebar {
          display: none;
        }

        .wa-messages {
          padding: 12px 4%;
        }

        .wa-bubble {
          max-width: 82%;
        }

        .wa-composer {
          padding: 7px 6px;
          gap: 3px;
        }

        .wa-icon-button,
        .wa-file-label {
          width: 38px;
          height: 38px;
          font-size: 20px;
        }

        .wa-textbox {
          height: 42px;
          padding: 0 14px;
          font-size: 14px;
        }

        .wa-send {
          width: 42px;
          height: 42px;
        }

        .wa-page {
          padding: 12px;
        }

        .wa-stories {
          grid-template-columns: 1fr 1fr;
        }
      }

    `}</style>
  );
}


/* =====================================================
   APP
===================================================== */

function App() {

  const [user, setUser] = useState(undefined);

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(auth, currentUser => {
        setUser(currentUser);
      });

    return () => unsubscribe();

  }, []);

  if (user === undefined) {
    return (
      <>
        <WhatsAppStyle />

        <div className="wa-empty">
          <div className="wa-empty-icon">💬</div>
          <h2>Chatdo</h2>
          <p>Loading...</p>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <WhatsAppStyle />
        <Auth />
      </>
    );
  }

  return (
    <>
      <WhatsAppStyle />
      <SocialApp user={user} />
    </>
  );
}


/* =====================================================
   AUTH
===================================================== */

function Auth() {

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {

    event.preventDefault();

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
            email: result.user.email,
            name: name.trim(),
            photoURL: "",
            online: true,
            lastSeen: serverTimestamp(),
            createdAt: serverTimestamp()
          },
          { merge: true }
        );
      }

    } catch (error) {

      setError(getFirebaseError(error));

    } finally {

      setLoading(false);

    }
  }

  return (
    <div className="wa-auth">

      <div className="wa-auth-card">

        <h1>Chatdo</h1>

        <p>
          Chat, connect and share stories.
        </p>

        <form onSubmit={submit}>

          {mode === "signup" && (
            <input
              className="wa-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e =>
                setName(e.target.value)
              }
              required
            />
          )}

          <input
            className="wa-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e =>
              setEmail(e.target.value)
            }
            required
          />

          <input
            className="wa-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e =>
              setPassword(e.target.value)
            }
            minLength={6}
            required
          />

          <button
            className="wa-primary"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 8
            }}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>

        </form>

        {error && (
          <div className="wa-error">
            {error}
          </div>
        )}

        <button
          className="wa-link"
          onClick={() => {
            setError("");
            setMode(
              mode === "login"
                ? "signup"
                : "login"
            );
          }}
        >
          {mode === "login"
            ? "Create an account"
            : "Already have an account? Sign in"}
        </button>

      </div>

    </div>
  );
}


/* =====================================================
   FIREBASE ERROR
===================================================== */

function getFirebaseError(error) {

  const code = error?.code || "";

  if (code.includes("invalid-credential")) {
    return "Email or password is incorrect.";
  }

  if (code.includes("user-not-found")) {
    return "No account found with this email.";
  }

  if (code.includes("wrong-password")) {
    return "Incorrect password.";
  }

  if (code.includes("email-already-in-use")) {
    return "This email is already registered.";
  }

  if (code.includes("weak-password")) {
    return "Password must contain at least 6 characters.";
  }

  if (code.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }

  return error?.message || "Something went wrong.";
}


/* =====================================================
   SOCIAL APP
===================================================== */

function SocialApp({ user }) {

  const [tab, setTab] = useState("chats");
  const [selectedUser, setSelectedUser] =
    useState(null);

  usePresence(user);

  function openChat(person) {

    setSelectedUser(person);
    setTab("chats");

  }

  return (
    <div className="wa-app">

      <header className="wa-topbar">

        <div className="wa-brand">

          <div>
            <div className="wa-brand-title">
              Chatdo
            </div>

            <div className="wa-brand-user">
              {user.displayName || user.email}
            </div>
          </div>

        </div>

        <button
          className="wa-logout"
          onClick={() => signOut(auth)}
        >
          Log out
        </button>

      </header>


      <nav className="wa-tabs">

        <button
          className={
            "wa-tab " +
            (tab === "chats"
              ? "active"
              : "")
          }
          onClick={() => setTab("chats")}
        >
          Chats
        </button>

        <button
          className={
            "wa-tab " +
            (tab === "stories"
              ? "active"
              : "")
          }
          onClick={() => setTab("stories")}
        >
          Stories
        </button>

        <button
          className={
            "wa-tab " +
            (tab === "people"
              ? "active"
              : "")
          }
          onClick={() => setTab("people")}
        >
          People
        </button>

      </nav>


      <main className="wa-main">

        {tab === "chats" && (
          <ChatHome
            user={user}
            selected={selectedUser}
            onSelect={setSelectedUser}
          />
        )}

        {tab === "stories" && (
          <Stories user={user} />
        )}

        {tab === "people" && (
          <People
            user={user}
            onChat={openChat}
          />
        )}

      </main>

    </div>
  );
}


/* =====================================================
   PRESENCE
===================================================== */

function usePresence(user) {

  useEffect(() => {

    if (!user?.uid) return;

    const userDoc =
      doc(db, "users", user.uid);

    setDoc(
      userDoc,
      {
        uid: user.uid,
        name:
          user.displayName ||
          user.email,
        email: user.email,
        online: true,
        lastSeen: serverTimestamp()
      },
      { merge: true }
    ).catch(console.error);


    const handleOffline = () => {

      updateDoc(
        userDoc,
        {
          online: false,
          lastSeen: serverTimestamp()
        }
      ).catch(() => {});

    };


    window.addEventListener(
      "beforeunload",
      handleOffline
    );


    return () => {

      window.removeEventListener(
        "beforeunload",
        handleOffline
      );

      handleOffline();

    };

  }, [user]);

}


/* =====================================================
   CHAT HOME
===================================================== */

function ChatHome({
  user,
  selected,
  onSelect
}) {

  const [people, setPeople] =
    useState([]);

  useEffect(() => {

    const q = query(
      usersRef,
      limit(100)
    );

    const unsubscribe =
      onSnapshot(
        q,
        snapshot => {

          const list =
            snapshot.docs
              .map(item => item.data())
              .filter(
                person =>
                  person.uid !== user.uid
              );

          setPeople(list);

        }
      );

    return () => unsubscribe();

  }, [user.uid]);


  return (
    <div className="wa-chat-layout">

      <aside className="wa-sidebar">

        <div className="wa-sidebar-title">
          Chats
        </div>

        {people.length === 0 ? (

          <div
            style={{
              padding: 20,
              color: "#777"
            }}
          >
            No other users yet.
          </div>

        ) : (

          people.map(person => (

            <button
              key={person.uid}
              className={
                "wa-person " +
                (
                  selected?.uid ===
                  person.uid
                    ? "selected"
                    : ""
                )
              }
              onClick={() =>
                onSelect(person)
              }
            >

              <Avatar user={person} />

              <div className="wa-person-info">

                <div className="wa-person-name">
                  {person.name ||
                    person.email}
                </div>

                <div
                  className={
                    person.online
                      ? "wa-online"
                      : "wa-offline"
                  }
                >
                  {person.online
                    ? "Online"
                    : "Offline"}
                </div>

              </div>

            </button>

          ))

        )}

      </aside>


      <section className="wa-chat">

        {selected ? (

          <Chat
            user={user}
            other={selected}
          />

        ) : (

          <div className="wa-empty">

            <div className="wa-empty-icon">
              💬
            </div>

            <h2>
              Welcome to Chatdo
            </h2>

            <p>
              Select a person to start chatting.
            </p>

          </div>

        )}

      </section>

    </div>
  );
}


/* =====================================================
   CHAT
===================================================== */

function Chat({ user, other }) {

  const chatId =
    [user.uid, other.uid]
      .sort()
      .join("_");

  const messagesRef =
    collection(
      db,
      "chats",
      chatId,
      "messages"
    );

  const chatDoc =
    doc(db, "chats", chatId);


  const [messages, setMessages] =
    useState([]);

  const [text, setText] =
    useState("");

  const [file, setFile] =
    useState(null);

  const [sending, setSending] =
    useState(false);

  const [typingUser, setTypingUser] =
    useState(false);

  const bottomRef =
    useRef(null);

  const typingTimer =
    useRef(null);


  /* -------------------------------------
     MESSAGE LISTENER
  ------------------------------------- */

  useEffect(() => {

    const q = query(
      messagesRef,
      orderBy("createdAt", "asc")
    );

    const unsubscribe =
      onSnapshot(
        q,
        snapshot => {

          const list =
            snapshot.docs.map(item => ({
              id: item.id,
              ...item.data()
            }));

          setMessages(list);

        },
        error => {
          console.error(
            "Messages error:",
            error
          );
        }
      );

    return () => unsubscribe();

  }, [chatId]);


  /* -------------------------------------
     CHAT DOCUMENT / TYPING LISTENER
  ------------------------------------- */

  useEffect(() => {

    const unsubscribe =
      onSnapshot(
        chatDoc,
        snapshot => {

          const data =
            snapshot.data();

          if (
            data?.typingUid &&
            data.typingUid !== user.uid
          ) {
            setTypingUser(true);
          } else {
            setTypingUser(false);
          }

        }
      );

    return () => unsubscribe();

  }, [chatId, user.uid]);


  /* -------------------------------------
     AUTO SCROLL
  ------------------------------------- */

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });

  }, [messages, typingUser]);


  /* -------------------------------------
     MARK OPPOSITE MESSAGES AS SEEN
  ------------------------------------- */

  useEffect(() => {

    async function markSeen() {

      const unseen =
        messages.filter(
          message =>
            message.senderId === other.uid &&
            !message.seenBy?.includes(user.uid)
        );

      if (unseen.length === 0) {
        return;
      }

      try {

        const batch =
          writeBatch(db);

        unseen.forEach(message => {

          const messageDoc =
            doc(
              db,
              "chats",
              chatId,
              "messages",
              message.id
            );

          batch.update(
            messageDoc,
            {
              seenBy:
                arrayUnion(user.uid)
            }
          );

        });

        await batch.commit();

      } catch (error) {

        console.error(
          "Seen update error:",
          error
        );

      }
    }

    markSeen();

  }, [
    messages,
    chatId,
    user.uid,
    other.uid
  ]);


  /* -------------------------------------
     TYPING
  ------------------------------------- */

  function handleTyping(event) {

    const value =
      event.target.value;

    setText(value);


    setDoc(
      chatDoc,
      {
        typingUid:
          value.trim()
            ? user.uid
            : null
      },
      { merge: true }
    ).catch(() => {});


    clearTimeout(
      typingTimer.current
    );


    if (value.trim()) {

      typingTimer.current =
        setTimeout(() => {

          setDoc(
            chatDoc,
            {
              typingUid: null
            },
            { merge: true }
          ).catch(() => {});

        }, 1500);

    }

  }


  /* -------------------------------------
     SEND MESSAGE
  ------------------------------------- */

  async function sendMessage() {

    const cleanText =
      text.trim();

    if (!cleanText && !file) {
      return;
    }

    setSending(true);


    try {

      let imageURL = "";


      /* UPLOAD IMAGE */

      if (file) {

        const fileRef =
          ref(
            storage,
            `chatImages/${chatId}/${Date.now()}-${file.name}`
          );

        await uploadBytes(
          fileRef,
          file
        );

        imageURL =
          await getDownloadURL(
            fileRef
          );

      }


      /* CHAT DOCUMENT */

      await setDoc(
        chatDoc,
        {
          members: [
            user.uid,
            other.uid
          ],

          lastMessage:
            cleanText ||
            "📷 Photo",

          updatedAt:
            serverTimestamp(),

          typingUid: null
        },
        { merge: true }
      );


      /* MESSAGE */

      await addDoc(
        messagesRef,
        {
          senderId:
            user.uid,

          senderName:
            user.displayName ||
            user.email,

          text:
            cleanText,

          imageURL,

          createdAt:
            serverTimestamp(),

          likes: [],

          /* MESSAGE SENT BUT NOT SEEN YET */

          seenBy: []
        }
      );


      setText("");
      setFile(null);


      await setDoc(
        chatDoc,
        {
          typingUid: null
        },
        { merge: true }
      );


    } catch (error) {

      console.error(
        "Send message error:",
        error
      );

      alert(
        "Message send failed. Please check Firebase settings."
      );

    } finally {

      setSending(false);

    }

  }


  /* -------------------------------------
     ENTER TO SEND
  ------------------------------------- */

  function handleKeyDown(event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }


  /* -------------------------------------
     LIKE
  ------------------------------------- */

  async function toggleLike(message) {

    try {

      const messageDoc =
        doc(
          db,
          "chats",
          chatId,
          "messages",
          message.id
        );

      const liked =
        message.likes?.includes(
          user.uid
        );


      await updateDoc(
        messageDoc,
        {
          likes:
            liked
              ? arrayRemove(user.uid)
              : arrayUnion(user.uid)
        }
      );

    } catch (error) {

      console.error(
        "Like error:",
        error
      );

    }

  }


  /* -------------------------------------
     TIME
  ------------------------------------- */

  function formatTime(timestamp) {

    if (!timestamp) {
      return "";
    }

    try {

      return timestamp
        .toDate()
        .toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        );

    } catch {

      return "";

    }

  }


  return (
    <div className="wa-chat">


      {/* ================================
          CHAT HEADER
      ================================= */}

      <div className="wa-chat-header">

        <Avatar user={other} />

        <div className="wa-chat-header-info">

          <div className="wa-chat-name">
            {other.name ||
              other.email}
          </div>

          <div className="wa-chat-status">

            {typingUser
              ? "typing..."
              : other.online
                ? "Online"
                : "Offline"}

          </div>

        </div>

      </div>


      {/* ================================
          MESSAGES
      ================================= */}

      <div className="wa-messages">


        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#667781",
              padding: 30
            }}
          >
            No messages yet.
          </div>
        )}


        {messages.map(message => {

          const mine =
            message.senderId ===
            user.uid;

          const liked =
            message.likes?.includes(
              user.uid
            );


          const seen =
            message.seenBy?.includes(
              other.uid
            );


          return (
            <div
              key={message.id}
              className={
                "wa-message-row " +
                (
                  mine
                    ? "mine"
                    : "other"
                )
              }
            >

              <div className="wa-bubble">


                {/* IMAGE */}

                {message.imageURL && (

                  <img
                    src={message.imageURL}
                    className="wa-image"
                    alt="sent"
                  />

                )}


                {/* TEXT */}

                {message.text && (

                  <span className="wa-text">
                    {message.text}
                  </span>

                )}


                {/* TIME + TICKS */}

                <span className="wa-time-line">

                  <span className="wa-time">
                    {formatTime(
                      message.createdAt
                    )}
                  </span>


                  {mine && (

                    <span
                      className={
                        "wa-ticks " +
                        (
                          seen
                            ? "seen"
                            : "sent"
                        )
                      }
                    >

                      {seen ? (
                        <>
                          ✓✓
                          <span
                            style={{
                              fontSize: 10,
                              marginLeft: 2
                            }}
                          >
                            👁
                          </span>
                        </>
                      ) : (
                        "✓"
                      )}

                    </span>

                  )}

                </span>


                {/* LIKE */}

                <button
                  className={
                    "wa-heart " +
                    (
                      liked
                        ? "liked"
                        : ""
                    )
                  }
                  onClick={() =>
                    toggleLike(message)
                  }
                >
                  ♥{" "}
                  {message.likes?.length || 0}
                </button>


              </div>

            </div>
          );

        })}


        {/* TYPING INDICATOR */}

        {typingUser && (

          <div className="wa-typing">
            typing...
          </div>

        )}


        <div ref={bottomRef} />

      </div>


      {/* ================================
          COMPOSER
      ================================= */}

      <div
        style={{
          position: "relative"
        }}
      >


        {/* SELECTED FILE */}

        {file && (

          <div className="wa-selected-file">

            📎 {file.name}

          </div>

        )}


        <div className="wa-composer">


          {/* ATTACHMENT */}

          <label className="wa-file-label">

            📎

            <input
              type="file"
              accept="image/*"
              onChange={event => {

                setFile(
                  event.target.files?.[0] ||
                  null
                );

              }}
            />

          </label>


          {/* TEXT BOX */}

          <input
            className="wa-textbox"
            type="text"
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
          />


          {/* CAMERA */}

          <label className="wa-icon-button">

            📷

            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{
                display: "none"
              }}
              onChange={event => {

                setFile(
                  event.target.files?.[0] ||
                  null
                );

              }}
            />

          </label>


          {/* AUDIO */}

          <button
            className="wa-icon-button"
            type="button"
            onClick={() =>
              alert(
                "Voice message feature will be added next."
              )
            }
          >
            🎤
          </button>


          {/* SEND */}

          <button
            className="wa-send"
            onClick={sendMessage}
            disabled={
              sending ||
              (!text.trim() && !file)
            }
          >

            {sending
              ? "..."
              : "➤"}

          </button>


        </div>

      </div>

    </div>
  );
}


/* =====================================================
   STORIES
===================================================== */

function Stories({ user }) {

  const [stories, setStories] =
    useState([]);

  const [text, setText] =
    useState("");

  const [file, setFile] =
    useState(null);

  const [posting, setPosting] =
    useState(false);


  useEffect(() => {

    const q = query(
      storiesRef,
      orderBy(
        "createdAt",
        "desc"
      ),
      limit(50)
    );

    const unsubscribe =
      onSnapshot(
        q,
        snapshot => {

          setStories(
            snapshot.docs.map(
              item => ({
                id: item.id,
                ...item.data()
              })
            )
          );

        }
      );

    return () => unsubscribe();

  }, []);


  async function postStory() {

    if (
      !text.trim() &&
      !file
    ) {
      return;
    }

    setPosting(true);

    try {

      let imageURL = "";


      if (file) {

        const fileRef =
          ref(
            storage,
            `stories/${user.uid}/${Date.now()}-${file.name}`
          );

        await uploadBytes(
          fileRef,
          file
        );

        imageURL =
          await getDownloadURL(
            fileRef
          );

      }


      await addDoc(
        storiesRef,
        {
          uid: user.uid,

          name:
            user.displayName ||
            user.email,

          text:
            text.trim(),

          imageURL,

          createdAt:
            serverTimestamp(),

          likes: []
        }
      );


      setText("");
      setFile(null);

    } catch (error) {

      console.error(
        "Story error:",
        error
      );

      alert(
        "Story post failed."
      );

    } finally {

      setPosting(false);

    }

  }


  async function toggleStoryLike(story) {

    try {

      const storyDoc =
        doc(
          db,
          "stories",
          story.id
        );

      const liked =
        story.likes?.includes(
          user.uid
        );


      await updateDoc(
        storyDoc,
        {
          likes:
            liked
              ? arrayRemove(user.uid)
              : arrayUnion(user.uid)
        }
      );

    } catch (error) {

      console.error(
        "Story like error:",
        error
      );

    }

  }


  return (
    <div className="wa-page">


      <div className="wa-card">

        <h2>
          Share a story
        </h2>

        <input
          className="wa-input"
          value={text}
          onChange={e =>
            setText(e.target.value)
          }
          placeholder="What's on your mind?"
        />

        <input
          className="wa-input"
          type="file"
          accept="image/*"
          onChange={e =>
            setFile(
              e.target.files?.[0] ||
              null
            )
          }
        />

        <button
          className="wa-primary"
          onClick={postStory}
          disabled={posting}
        >
          {posting
            ? "Posting..."
            : "Post"}
        </button>

      </div>


      <div className="wa-stories">

        {stories.map(story => (

          <article
            className="wa-story"
            key={story.id}
          >

            <div className="wa-story-author">

              <Avatar
                user={{
                  name: story.name
                }}
              />

              <b>
                {story.name}
              </b>

            </div>


            {story.imageURL && (

              <img
                src={story.imageURL}
                alt="story"
              />

            )}


            {story.text && (
              <p>
                {story.text}
              </p>
            )}


            <button
              onClick={() =>
                toggleStoryLike(story)
              }
              style={{
                border: 0,
                background: "transparent"
              }}
            >
              ♥{" "}
              {story.likes?.length || 0}
            </button>

          </article>

        ))}

      </div>

    </div>
  );
}


/* =====================================================
   PEOPLE
===================================================== */

function People({ user, onChat }) {

  const [people, setPeople] =
    useState([]);


  useEffect(() => {

    const q = query(
      usersRef,
      limit(100)
    );

    const unsubscribe =
      onSnapshot(
        q,
        snapshot => {

          const list =
            snapshot.docs
              .map(
                item =>
                  item.data()
              )
              .filter(
                person =>
                  person.uid !==
                  user.uid
              );

          setPeople(list);

        }
      );

    return () => unsubscribe();

  }, [user.uid]);


  return (
    <div className="wa-page">

      <h2>
        People
      </h2>


      {people.length === 0 ? (

        <div className="wa-card">
          No other users yet.
        </div>

      ) : (

        people.map(person => (

          <div
            className="wa-people-row"
            key={person.uid}
          >

            <Avatar user={person} />


            <div className="wa-person-info">

              <div className="wa-person-name">
                {person.name ||
                  person.email}
              </div>

              <div
                className={
                  person.online
                    ? "wa-online"
                    : "wa-offline"
                }
              >
                {person.online
                  ? "Online"
                  : "Offline"}
              </div>

            </div>


            <button
              className="wa-primary"
              onClick={() =>
                onChat(person)
              }
            >
              Message
            </button>

          </div>

        ))

      )}

    </div>
  );
}


/* =====================================================
   AVATAR
===================================================== */

function Avatar({ user }) {

  const name =
    user?.name ||
    user?.email ||
    "?";


  return (
    <div className="wa-avatar">
      {name
        .charAt(0)
        .toUpperCase()}
    </div>
  );
}


/* =====================================================
   START
===================================================== */

const rootElement =
  document.getElementById("root");


if (!rootElement) {
  throw new Error(
    "Root element not found."
  );
}


createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
