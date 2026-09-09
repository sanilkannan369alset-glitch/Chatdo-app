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
  writeBatch
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

import "./styles.css";


/* =========================================================
   FIREBASE
========================================================= */

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


/* =========================================================
   STYLES
========================================================= */

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
        height: 62px;
        flex-shrink: 0;
        background: #075e54;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
      }

      .wa-brand {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .wa-brand-title {
        font-size: 22px;
        font-weight: 800;
      }

      .wa-brand-user {
        font-size: 12px;
        opacity: .85;
      }

      .wa-logout {
        border: 0;
        background: rgba(255,255,255,.15);
        color: white;
        border-radius: 20px;
        padding: 8px 14px;
      }

      .wa-tabs {
        height: 50px;
        flex-shrink: 0;
        background: #075e54;
        display: flex;
        color: rgba(255,255,255,.7);
      }

      .wa-tab {
        flex: 1;
        border: 0;
        background: transparent;
        color: inherit;
        font-size: 14px;
        font-weight: 700;
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
        font-weight: 800;
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
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: #d9fdd3;
        color: #075e54;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 800;
        flex-shrink: 0;
      }

      .wa-person-info {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .wa-person-name {
        font-size: 15px;
        font-weight: 700;
        color: #202124;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .wa-online {
        font-size: 12px;
        color: #25d366;
      }

      .wa-offline {
        font-size: 12px;
        color: #777;
      }

      .wa-chat {
        height: 100%;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .wa-chat-header {
        height: 62px;
        flex-shrink: 0;
        background: #f0f2f5;
        border-bottom: 1px solid #ddd;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
      }

      .wa-chat-header-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .wa-chat-name {
        font-weight: 800;
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
        padding: 15px 6%;
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
        margin: 5px 0;
      }

      .wa-message-row.mine {
        justify-content: flex-end;
      }

      .wa-message-row.other {
        justify-content: flex-start;
      }

      .wa-bubble {
        position: relative;
        max-width: min(76%, 500px);
        min-width: 60px;
        padding: 8px 10px 6px;
        border-radius: 9px;
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
        margin-left: 10px;
        margin-top: 8px;
      }

      .wa-time {
        font-size: 10px;
        color: #667781;
      }

      .wa-ticks {
        font-size: 13px;
        font-weight: 700;
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
        border-radius: 7px;
        margin-bottom: 4px;
      }

      .wa-heart {
        display: block;
        border: 0;
        background: transparent;
        color: #777;
        padding: 3px 0 0;
        font-size: 11px;
      }

      .wa-heart.liked {
        color: #e53935;
      }

      .wa-message-menu {
        position: absolute;
        top: 4px;
        right: 4px;
        z-index: 30;
      }

      .wa-message-menu > button {
        border: 0;
        background: rgba(255,255,255,.7);
        color: #54656f;
        border-radius: 50%;
        width: 27px;
        height: 27px;
        font-size: 17px;
        padding: 0;
      }

      .wa-message-menu-panel {
        position: absolute;
        top: 29px;
        right: 0;
        width: 185px;
        background: white;
        border-radius: 9px;
        box-shadow: 0 4px 18px rgba(0,0,0,.22);
        overflow: hidden;
        z-index: 50;
      }

      .wa-message-menu-panel button {
        width: 100%;
        border: 0;
        background: white;
        color: #222;
        padding: 12px 14px;
        text-align: left;
        font-size: 13px;
      }

      .wa-message-menu-panel button:hover {
        background: #f1f1f1;
      }

      .wa-edit-box {
        display: flex;
        gap: 5px;
        margin-top: 5px;
      }

      .wa-edit-box input {
        width: 190px;
        border: 1px solid #aaa;
        border-radius: 7px;
        padding: 7px;
        outline: none;
      }

      .wa-edit-save {
        border: 0;
        background: #128c7e;
        color: white;
        border-radius: 7px;
        padding: 7px 9px;
      }

      .wa-edit-cancel {
        border: 0;
        background: #777;
        color: white;
        border-radius: 7px;
        padding: 7px 9px;
      }

      .wa-edited {
        font-size: 10px;
        color: #667781;
        margin-left: 5px;
        font-style: italic;
      }

      .wa-deleted {
        color: #667781;
        font-style: italic;
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

      .wa-composer {
        flex-shrink: 0;
        min-height: 62px;
        background: #f0f2f5;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 8px;
        border-top: 1px solid #ddd;
      }

      .wa-icon-button,
      .wa-file-label {
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: #54656f;
        font-size: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        cursor: pointer;
      }

      .wa-icon-button:hover,
      .wa-file-label:hover {
        background: #e2e6e9;
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
        padding: 0 16px;
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
        z-index: 10;
      }

      .wa-page {
        height: 100%;
        overflow-y: auto;
        padding: 18px;
        background: #efeae2;
      }

      .wa-card {
        background: white;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 16px;
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

      .wa-empty {
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #efeae2;
        color: #667781;
      }

      .wa-empty-icon {
        font-size: 55px;
      }

      @media (max-width: 700px) {

        .wa-topbar {
          height: 58px;
          padding: 0 12px;
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
          max-width: 84%;
        }

        .wa-composer {
          padding: 6px 4px;
          gap: 2px;
        }

        .wa-icon-button,
        .wa-file-label {
          width: 38px;
          height: 38px;
          font-size: 19px;
        }

        .wa-textbox {
          height: 42px;
          padding: 0 13px;
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

        .wa-edit-box {
          flex-wrap: wrap;
        }

        .wa-edit-box input {
          width: 100%;
        }
      }

    `}</style>
  );
}


/* =========================================================
   APP
========================================================= */

function App() {

  const [user, setUser] =
    useState(undefined);

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        currentUser => {
          setUser(currentUser);
        }
      );

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


/* =========================================================
   AUTH
========================================================= */

function getFirebaseError(error) {

  const code =
    error?.code || "";

  const messages = {
    "auth/invalid-credential":
      "Email or password is incorrect.",
    "auth/invalid-email":
      "Please enter a valid email.",
    "auth/email-already-in-use":
      "This email is already registered.",
    "auth/weak-password":
      "Password should be at least 6 characters.",
    "auth/network-request-failed":
      "Network error. Please try again."
  };

  return (
    messages[code] ||
    error?.message ||
    "Something went wrong."
  );
}


function Auth() {

  const [mode, setMode] =
    useState("login");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


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

        await updateProfile(
          result.user,
          {
            displayName:
              name.trim()
          }
        );

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

      setError(
        getFirebaseError(error)
      );

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
            ? "Create a new account"
            : "Already have an account? Sign in"}
        </button>

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

  const [selectedUser, setSelectedUser] =
    useState(null);

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
              .map(item => ({
                id: item.id,
                ...item.data()
              }))
              .filter(
                person =>
                  person.uid !== user.uid
              );

          setPeople(list);

          if (selectedUser) {

            const updated =
              list.find(
                person =>
                  person.uid ===
                  selectedUser.uid
              );

            if (updated) {
              setSelectedUser(updated);
            }
          }
        }
      );

    return () => unsubscribe();

  }, [user.uid]);


  usePresence(user);


  return (
    <div className="wa-app">

      <div className="wa-topbar">

        <div className="wa-brand">

          <div className="wa-brand-title">
            Chatdo
          </div>

          <div className="wa-brand-user">
            {user.displayName ||
              user.email}
          </div>

        </div>

        <button
          className="wa-logout"
          onClick={() =>
            signOut(auth)
          }
        >
          Logout
        </button>

      </div>


      <div className="wa-tabs">

        <button
          className={
            "wa-tab " +
            (tab === "chats"
              ? "active"
              : "")
          }
          onClick={() =>
            setTab("chats")
          }
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
          onClick={() =>
            setTab("stories")
          }
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
          onClick={() =>
            setTab("people")
          }
        >
          People
        </button>

      </div>


      <main className="wa-main">

        {tab === "stories" && (
          <Stories user={user} />
        )}

        {tab === "people" && (
          <People
            user={user}
            onChat={person => {
              setSelectedUser(person);
              setTab("chats");
            }}
          />
        )}

        {tab === "chats" && (

          <div className="wa-chat-layout">

            <aside className="wa-sidebar">

              <div className="wa-sidebar-title">
                Chats
              </div>

              {people.length === 0 ? (

                <div
                  style={{
                    padding: 20,
                    color: "#667781"
                  }}
                >
                  No other users yet.
                </div>

              ) : (

                people.map(person => (

                  <button
                    className={
                      "wa-person " +
                      (
                        selectedUser?.uid ===
                        person.uid
                          ? "selected"
                          : ""
                      )
                    }
                    key={person.uid}
                    onClick={() =>
                      setSelectedUser(person)
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


            <section>

              {selectedUser ? (

                <Chat
                  user={user}
                  other={selectedUser}
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
        )}

      </main>

    </div>
  );
}


/* =========================================================
   PRESENCE
========================================================= */

function usePresence(user) {

  useEffect(() => {

    const userDoc =
      doc(db, "users", user.uid);

    setDoc(
      userDoc,
      {
        uid: user.uid,
        email: user.email,
        name:
          user.displayName ||
          user.email,
        online: true,
        lastSeen: serverTimestamp()
      },
      { merge: true }
    ).catch(() => {});


    const handleVisibility = () => {

      const online =
        document.visibilityState ===
        "visible";

      setDoc(
        userDoc,
        {
          online,
          lastSeen:
            serverTimestamp()
        },
        { merge: true }
      ).catch(() => {});
    };


    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );


    return () => {

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      setDoc(
        userDoc,
        {
          online: false,
          lastSeen:
            serverTimestamp()
        },
        { merge: true }
      ).catch(() => {});
    };

  }, [user.uid]);
}


/* =========================================================
   CHAT
========================================================= */

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

  const [menuId, setMenuId] =
    useState(null);

  const [editingId, setEditingId] =
    useState(null);

  const [editingText, setEditingText] =
    useState("");

  const bottomRef =
    useRef(null);

  const typingTimer =
    useRef(null);


  /* MESSAGE LISTENER */

  useEffect(() => {

    const q =
      query(
        messagesRef,
        orderBy(
          "createdAt",
          "asc"
        )
      );

    const unsubscribe =
      onSnapshot(
        q,
        snapshot => {

          setMessages(
            snapshot.docs.map(item => ({
              id: item.id,
              ...item.data()
            }))
          );

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


  /* TYPING LISTENER */

  useEffect(() => {

    const unsubscribe =
      onSnapshot(
        chatDoc,
        snapshot => {

          const data =
            snapshot.data();

          setTypingUser(
            !!(
              data?.typingUid &&
              data.typingUid !== user.uid
            )
          );

        },
        () => {}
      );

    return () => unsubscribe();

  }, [chatId, user.uid]);


  /* AUTO SCROLL */

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });

  }, [messages, typingUser]);


  /* MARK SEEN */

  useEffect(() => {

    async function markSeen() {

      const unseen =
        messages.filter(
          message =>
            message.senderId ===
              other.uid &&
            !message.seenBy?.includes(
              user.uid
            ) &&
            !message.deletedForEveryone
        );

      if (!unseen.length) {
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


  /* TYPING */

  function handleTyping(event) {

    const value =
      event.target.value;

    setText(value);

    setDoc(
      chatDoc,
      {
        members: [
          user.uid,
          other.uid
        ],
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


  /* SEND MESSAGE */

  async function sendMessage() {

    const cleanText =
      text.trim();

    if (!cleanText && !file) {
      return;
    }

    setSending(true);

    try {

      /* Make chat document first */
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


      let imageURL = "";


      if (file) {

        if (
          file.size >
          10 * 1024 * 1024
        ) {
          alert(
            "Image must be smaller than 10 MB."
          );
          setSending(false);
          return;
        }

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

          seenBy: [],

          edited: false,

          deletedForEveryone:
            false,

          deletedFor: []
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
        "Message send failed. Check Firebase permissions."
      );

    } finally {

      setSending(false);

    }
  }


  /* ENTER TO SEND */

  function handleKeyDown(event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();
    }
  }


  /* LIKE */

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


  /* DELETE FOR ME */

  async function deleteForMe(message) {

    try {

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
            arrayUnion(user.uid)
        }
      );

      setMenuId(null);

    } catch (error) {

      console.error(
        "Delete for me error:",
        error
      );

      alert(
        "Delete failed. Firebase rules may need updating."
      );
    }
  }


  /* DELETE FOR EVERYONE */

  async function deleteForEveryone(message) {

    if (
      message.senderId !==
      user.uid
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        "Delete this message for everyone?"
      );

    if (!confirmed) {
      return;
    }


    try {

      await updateDoc(
        doc(
          db,
          "chats",
          chatId,
          "messages",
          message.id
        ),
        {
          text: "",
          imageURL: "",
          deletedForEveryone:
            true,
          deletedAt:
            serverTimestamp()
        }
      );

      setMenuId(null);

    } catch (error) {

      console.error(
        "Delete for everyone error:",
        error
      );

      alert(
        "Delete failed. Firebase Firestore Rules may be blocking this action."
      );
    }
  }


  /* START EDIT */

  function startEdit(message) {

    if (
      message.senderId !==
      user.uid
    ) {
      return;
    }

    if (
      message.deletedForEveryone
    ) {
      return;
    }

    const created =
      message.createdAt?.toMillis?.();

    if (!created) {
      alert(
        "This message is still being saved. Try again in a moment."
      );
      return;
    }

    const oneHour =
      60 * 60 * 1000;

    if (
      Date.now() - created >
      oneHour
    ) {
      alert(
        "Messages can only be edited within 1 hour."
      );
      setMenuId(null);
      return;
    }

    setEditingId(message.id);
    setEditingText(
      message.text || ""
    );
    setMenuId(null);
  }


  /* SAVE EDIT */

  async function saveEdit(message) {

    const clean =
      editingText.trim();

    if (!clean) {
      return;
    }

    try {

      const created =
        message.createdAt?.toMillis?.();

      if (!created) {
        return;
      }

      if (
        Date.now() - created >
        60 * 60 * 1000
      ) {
        alert(
          "Edit time expired. Only the first 1 hour is allowed."
        );
        setEditingId(null);
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
          text: clean,
          edited: true,
          updatedAt:
            serverTimestamp()
        }
      );

      setEditingId(null);
      setEditingText("");

    } catch (error) {

      console.error(
        "Edit error:",
        error
      );

      alert(
        "Edit failed. Firebase Rules may need updating."
      );
    }
  }


  /* TIME */

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

      {/* HEADER */}

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


      {/* MESSAGES */}

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

          const hiddenForMe =
            message.deletedFor?.includes(
              user.uid
            );

          if (hiddenForMe) {
            return null;
          }


          const liked =
            message.likes?.includes(
              user.uid
            );


          const seen =
            message.seenBy?.includes(
              other.uid
            );


          const isEditing =
            editingId ===
            message.id;


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


                {/* MESSAGE MENU */}

                <div className="wa-message-menu">

                  <button
                    type="button"
                    onClick={() =>
                      setMenuId(
                        menuId ===
                        message.id
                          ? null
                          : message.id
                      )
                    }
                  >
                    ⋮
                  </button>


                  {menuId ===
                    message.id && (

                    <div className="wa-message-menu-panel">

                      {mine &&
                        !message.deletedForEveryone && (
                          <button
                            onClick={() =>
                              startEdit(
                                message
                              )
                            }
                          >
                            ✏️ Edit
                          </button>
                        )}


                      {!message.deletedForEveryone && (
                        <button
                          onClick={() =>
                            deleteForMe(
                              message
                            )
                          }
                        >
                          🗑️ Delete for me
                        </button>
                      )}


                      {mine &&
                        !message.deletedForEveryone && (
                          <button
                            onClick={() =>
                              deleteForEveryone(
                                message
                              )
                            }
                          >
                            🚫 Delete for everyone
                          </button>
                        )}

                    </div>
                  )}

                </div>


                {/* DELETED MESSAGE */}

                {message.deletedForEveryone ? (

                  <span className="wa-deleted">
                    🚫 This message was deleted
                  </span>

                ) : (

                  <>

                    {message.imageURL && (
                      <img
                        src={message.imageURL}
                        className="wa-image"
                        alt="sent"
                      />
                    )}


                    {isEditing ? (

                      <div className="wa-edit-box">

                        <input
                          value={editingText}
                          onChange={e =>
                            setEditingText(
                              e.target.value
                            )
                          }
                          autoFocus
                        />

                        <button
                          className="wa-edit-save"
                          onClick={() =>
                            saveEdit(
                              message
                            )
                          }
                        >
                          Save
                        </button>

                        <button
                          className="wa-edit-cancel"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText("");
                          }}
                        >
                          Cancel
                        </button>

                      </div>

                    ) : (

                      message.text && (
                        <span className="wa-text">
                          {message.text}

                          {message.edited && (
                            <span className="wa-edited">
                              edited
                            </span>
                          )}
                        </span>
                      )
                    )}

                  </>
                )}


                {/* TIME */}

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

                      {seen
                        ? "✓✓ 👁"
                        : "✓"}

                    </span>
                  )}

                </span>


                {/* LIKE */}

                {!message.deletedForEveryone && (

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
                      toggleLike(
                        message
                      )
                    }
                  >
                    ♥{" "}
                    {message.likes?.length ||
                      0}
                  </button>
                )}

              </div>

            </div>
          );
        })}


        {typingUser && (
          <div className="wa-typing">
            typing...
          </div>
        )}


        <div ref={bottomRef} />

      </div>


      {/* COMPOSER */}

      <div
        style={{
          position: "relative"
        }}
      >

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

                const selected =
                  event.target.files?.[0] ||
                  null;

                setFile(selected);

              }}
            />

          </label>


          {/* TEXT */}

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

                const selected =
                  event.target.files?.[0] ||
                  null;

                setFile(selected);

              }}
            />

          </label>


          {/* VOICE */}

          <button
            className="wa-icon-button"
            type="button"
            onClick={() =>
              alert(
                "Voice messages will be added in the next phase."
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
              (!text.trim() &&
                !file)
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


/* =========================================================
   STORIES
========================================================= */

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

    const q =
      query(
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
            snapshot.docs.map(item => ({
              id: item.id,
              ...item.data()
            }))
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

        if (
          file.size >
          10 * 1024 * 1024
        ) {
          alert(
            "Image must be smaller than 10 MB."
          );
          setPosting(false);
          return;
        }

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
                toggleStoryLike(
                  story
                )
              }
              style={{
                border: 0,
                background:
                  "transparent"
              }}
            >
              ♥{" "}
              {story.likes?.length ||
                0}
            </button>

          </article>
        ))}

      </div>

    </div>
  );
}


/* =========================================================
   PEOPLE
========================================================= */

function People({ user, onChat }) {

  const [people, setPeople] =
    useState([]);


  useEffect(() => {

    const q =
      query(
        usersRef,
        limit(100)
      );

    const unsubscribe =
      onSnapshot(
        q,
        snapshot => {

          const list =
            snapshot.docs
              .map(item =>
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


/* =========================================================
   AVATAR
========================================================= */

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


/* =========================================================
   START APP
========================================================= */

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
