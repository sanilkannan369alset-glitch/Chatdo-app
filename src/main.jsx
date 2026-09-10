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
  deleteDoc,
  arrayUnion,
  arrayRemove,
  limit,
  Timestamp
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const usersRef = collection(db, "users");
const storiesRef = collection(db, "stories");


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
      input,
      textarea {
        font-family: inherit;
      }

      button {
        cursor: pointer;
      }

      .app {
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: #efeae2;
      }

      /* TOP BAR */

      .top {
        height: 60px;
        flex: none;
        background: #075e54;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 15px;
      }

      .brand {
        font-size: 22px;
        font-weight: 800;
      }

      .brand small {
        display: block;
        font-size: 10px;
        font-weight: 500;
        opacity: .8;
      }

      .logout {
        border: 0;
        background: rgba(255,255,255,.15);
        color: white;
        border-radius: 18px;
        padding: 8px 14px;
      }

      /* TABS */

      .tabs {
        height: 50px;
        flex: none;
        display: flex;
        background: #075e54;
        color: rgba(255,255,255,.7);
      }

      .tab {
        flex: 1;
        border: 0;
        background: transparent;
        color: inherit;
        font-weight: 700;
        border-bottom: 3px solid transparent;
      }

      .tab.active {
        color: white;
        border-bottom-color: white;
      }

      .main {
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      /* CHAT LAYOUT */

      .chat-layout {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: 310px 1fr;
      }

      .sidebar {
        background: white;
        border-right: 1px solid #ddd;
        overflow-y: auto;
      }

      .side-title {
        padding: 16px;
        font-size: 20px;
        font-weight: 800;
        border-bottom: 1px solid #eee;
      }

      .person {
        width: 100%;
        border: 0;
        background: white;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 14px;
        text-align: left;
        border-bottom: 1px solid #f1f1f1;
      }

      .person:hover,
      .person.sel {
        background: #e9f7f4;
      }

      .avatar {
        width: 44px;
        height: 44px;
        flex: none;
        border-radius: 50%;
        background: #d9fdd3;
        color: #075e54;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
      }

      .info {
        min-width: 0;
      }

      .name {
        font-size: 15px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .online {
        font-size: 11px;
        color: #25d366;
      }

      .offline {
        font-size: 11px;
        color: #777;
      }

      /* CHAT */

      .chat {
        height: 100%;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }

      .chat-head {
        height: 60px;
        flex: none;
        background: #f0f2f5;
        border-bottom: 1px solid #ddd;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 7px 12px;
      }

      .back {
        display: none;
        border: 0;
        background: transparent;
        font-size: 23px;
        color: #54656f;
      }

      .chat-head-info {
        min-width: 0;
      }

      .chat-status {
        font-size: 11px;
        color: #667781;
      }

      .messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 12px 5%;
        background: #efeae2;
        background-image:
          radial-gradient(
            rgba(0,0,0,.035) 1px,
            transparent 1px
          );
        background-size: 18px 18px;
      }

      .row {
        display: flex;
        margin: 5px 0;
      }

      .row.mine {
        justify-content: flex-end;
      }

      .row.other {
        justify-content: flex-start;
      }

      .bubble {
        position: relative;
        max-width: min(78%,520px);
        min-width: 60px;
        padding: 8px 9px 5px;
        border-radius: 9px;
        box-shadow: 0 1px 1px rgba(0,0,0,.12);
        word-break: break-word;
      }

      .mine .bubble {
        background: #d9fdd3;
        border-top-right-radius: 2px;
      }

      .other .bubble {
        background: white;
        border-top-left-radius: 2px;
      }

      .text {
        font-size: 15px;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      .edited {
        font-size: 9px;
        color: #667781;
        margin-left: 5px;
        font-style: italic;
      }

      .time-line {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
        margin-top: 5px;
      }

      .time {
        font-size: 9px;
        color: #667781;
      }

      .tick {
        font-size: 13px;
        font-weight: 700;
        color: #667781;
      }

      .eye {
        width: 14px;
        height: 9px;
        display: inline-block;
        position: relative;
        border: 1.5px solid currentColor;
        border-radius: 80% 20% 80% 20%;
        transform: rotate(45deg);
        margin-left: 2px;
      }

      .eye:after {
        content: "";
        position: absolute;
        width: 3px;
        height: 3px;
        background: currentColor;
        border-radius: 50%;
        left: 4px;
        top: 2px;
      }

      .image {
        display: block;
        width: 100%;
        max-width: 300px;
        max-height: 320px;
        object-fit: cover;
        border-radius: 7px;
      }

      .media {
        display: block;
        width: 100%;
        max-width: 320px;
        border-radius: 8px;
        margin-top: 4px;
      }

      .heart {
        border: 0;
        background: transparent;
        color: #777;
        font-size: 12px;
        padding: 3px 0 0;
      }

      .heart.liked {
        color: #e53935;
      }

      /* MESSAGE MENU */

      .menu {
        position: absolute;
        right: 4px;
        top: 4px;
        z-index: 5;
      }

      .menu > button {
        width: 27px;
        height: 27px;
        border: 0;
        border-radius: 50%;
        background: rgba(255,255,255,.75);
        font-size: 17px;
        color: #54656f;
      }

      .menu-panel {
        position: absolute;
        right: 0;
        top: 29px;
        width: 195px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 18px rgba(0,0,0,.2);
        overflow: hidden;
        z-index: 30;
      }

      .menu-panel button {
        width: 100%;
        border: 0;
        background: white;
        text-align: left;
        padding: 11px 13px;
      }

      .menu-panel button:hover {
        background: #f2f2f2;
      }

      .deleted {
        color: #667781;
        font-style: italic;
      }

      .editbox {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .editbox input {
        min-width: 180px;
        flex: 1;
        border: 1px solid #aaa;
        border-radius: 7px;
        padding: 7px;
      }

      .save {
        border: 0;
        background: #128c7e;
        color: white;
        border-radius: 7px;
        padding: 7px 10px;
      }

      .cancel {
        border: 0;
        background: #777;
        color: white;
        border-radius: 7px;
        padding: 7px 10px;
      }

      /* TYPING */

      .typing {
        width: max-content;
        background: white;
        border-radius: 8px;
        padding: 7px 11px;
        color: #667781;
        font-size: 12px;
        margin: 5px 0;
      }

      /* COMPOSER */

      .composer-wrap {
        position: relative;
        flex: none;
      }

      .composer {
        min-height: 60px;
        background: #f0f2f5;
        border-top: 1px solid #ddd;
        display: flex;
        align-items: center;
        gap: 3px;
        padding: 6px;
      }

      .icon,
      .file-label {
        width: 40px;
        height: 40px;
        border: 0;
        background: transparent;
        color: #54656f;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex: none;
      }

      .icon:hover,
      .file-label:hover {
        background: #e2e6e9;
      }

      .file-label input {
        display: none;
      }

      .textbox {
        flex: 1;
        min-width: 0;
        height: 42px;
        border: 0;
        outline: none;
        border-radius: 21px;
        padding: 0 14px;
      }

      .send {
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 50%;
        background: #128c7e;
        color: white;
        font-size: 19px;
      }

      .recording {
        background: #fff3f3;
        color: #c62828;
        padding: 8px 12px;
        font-size: 12px;
        border-top: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      /* PAGES */

      .page {
        height: 100%;
        overflow-y: auto;
        padding: 14px;
        background: #efeae2;
      }

      .card {
        background: white;
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 14px;
        box-shadow: 0 1px 2px rgba(0,0,0,.08);
      }

      .input {
        width: 100%;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 11px;
        margin: 5px 0;
        font-size: 15px;
        outline: none;
      }

      .textarea {
        width: 100%;
        min-height: 90px;
        resize: vertical;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 11px;
        font-size: 15px;
        outline: none;
      }

      .primary {
        border: 0;
        background: #128c7e;
        color: white;
        border-radius: 8px;
        padding: 10px 15px;
      }

      .danger {
        border: 0;
        background: #ffe5e5;
        color: #c62828;
        border-radius: 7px;
        padding: 7px 10px;
      }

      .secondary {
        border: 0;
        background: #eee;
        color: #444;
        border-radius: 7px;
        padding: 7px 10px;
      }

      /* STORIES */

      .stories {
        display: grid;
        grid-template-columns:
          repeat(auto-fill,minmax(190px,1fr));
        gap: 14px;
      }

      .story {
        background: white;
        border-radius: 12px;
        padding: 10px;
        overflow: hidden;
      }

      .story-card {
        aspect-ratio: 9 / 16;
        border-radius: 10px;
        background: #f2f2f2;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
      }

      .story-card img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .story-overlay {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 12px;
        color: white;
        background:
          linear-gradient(
            transparent,
            rgba(0,0,0,.8)
          );
      }

      .story-text {
        font-size: 14px;
        white-space: pre-wrap;
      }

      .story-author {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 7px;
      }

      .my-story {
        font-size: 11px;
        color: #128c7e;
        font-weight: 700;
      }

      .story-actions {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 7px;
      }

      /* PEOPLE */

      .search {
        position: relative;
        margin-bottom: 12px;
      }

      .search input {
        padding-left: 38px;
      }

      .search span {
        position: absolute;
        left: 12px;
        top: 13px;
        color: #777;
      }

      .people-result {
        background: white;
        border-radius: 10px;
        padding: 11px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .people-actions {
        margin-left: auto;
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
      }

      .request {
        background: #e9f7f4;
        color: #075e54;
        border: 0;
        border-radius: 7px;
        padding: 7px 10px;
      }

      .muted {
        color: #667781;
        font-size: 12px;
      }

      /* AUTH */

      .auth {
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: #efeae2;
      }

      .auth-card {
        width: min(420px,100%);
        background: white;
        padding: 28px;
        border-radius: 15px;
        box-shadow: 0 5px 25px rgba(0,0,0,.12);
      }

      .auth-card h1 {
        color: #075e54;
      }

      .error {
        background: #fff0ef;
        color: #b42318;
        padding: 10px;
        border-radius: 8px;
        margin-top: 10px;
      }

      .link {
        width: 100%;
        border: 0;
        background: transparent;
        color: #128c7e;
        padding: 10px;
        margin-top: 8px;
      }

      .empty {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #667781;
        background: #efeae2;
      }

      .empty-icon {
        font-size: 50px;
      }

      /* MOBILE */

      @media(max-width:700px) {

        .chat-layout {
          grid-template-columns: 1fr;
        }

        .sidebar {
          display: none;
        }

        .back {
          display: block;
        }

        .messages {
          padding: 10px 3%;
        }

        .bubble {
          max-width: 86%;
        }

        .stories {
          grid-template-columns: 1fr 1fr;
        }

        .story {
          padding: 7px;
        }

        .top {
          height: 56px;
        }

        .tabs {
          height: 47px;
        }

        .icon,
        .file-label {
          width: 36px;
          height: 36px;
          font-size: 18px;
        }

        .textbox {
          height: 40px;
        }

        .send {
          width: 40px;
          height: 40px;
        }
      }

    `}</style>
  );
}


/* =========================================================
   SMALL COMPONENTS
========================================================= */

function Avatar({ user }) {
  const name =
    user?.name ||
    user?.displayName ||
    user?.email ||
    "?";

  return (
    <div className="avatar">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}


function EyeIcon() {
  return <span className="eye" aria-label="seen" />;
}


/* =========================================================
   APP
========================================================= */

function App() {

  const [user,setUser] = useState(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth,setUser);
  },[]);

  if(user === undefined) {
    return (
      <>
        <Styles/>

        <div className="empty">
          <div className="empty-icon">
            💬
          </div>

          <h2>Chatdo</h2>
          <p>Loading...</p>
        </div>
      </>
    );
  }

  if(!user) {
    return (
      <>
        <Styles/>
        <Auth/>
      </>
    );
  }

  return (
    <>
      <Styles/>
      <SocialApp user={user}/>
    </>
  );
}


/* =========================================================
   FIREBASE ERROR
========================================================= */

function firebaseError(error) {

  const map = {

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
    map[error?.code] ||
    error?.message ||
    "Something went wrong."
  );
}


/* =========================================================
   AUTH
========================================================= */

function Auth() {

  const [mode,setMode] = useState("login");
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);

  async function submit(e) {

    e.preventDefault();

    setError("");
    setLoading(true);

    try {

      if(mode === "login") {

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
            displayName:name.trim()
          }
        );

        await setDoc(
          doc(db,"users",result.user.uid),
          {
            uid:result.user.uid,
            email:result.user.email,
            name:name.trim(),
            photoURL:"",
            online:true,
            lastSeen:serverTimestamp(),
            createdAt:serverTimestamp(),
            friends:[],
            friendRequests:[]
          },
          {merge:true}
        );
      }

    } catch(err) {

      setError(firebaseError(err));

    } finally {

      setLoading(false);

    }
  }

  return (
    <div className="auth">

      <div className="auth-card">

        <h1>Chatdo</h1>

        <p>
          Chat, connect and share stories.
        </p>

        <form onSubmit={submit}>

          {mode === "signup" && (
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={e=>setName(e.target.value)}
              required
            />
          )}

          <input
            className="input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            minLength={6}
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
          />

          <button
            className="primary"
            style={{
              width:"100%",
              marginTop:7
            }}
            disabled={loading}
          >
            {
              loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"
            }
          </button>

        </form>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button
          className="link"
          onClick={()=>{
            setError("");

            setMode(
              mode === "login"
                ? "signup"
                : "login"
            );
          }}
        >
          {
            mode === "login"
              ? "Create a new account"
              : "Already have an account? Sign in"
          }
        </button>

      </div>

    </div>
  );
}


/* =========================================================
   PRESENCE
========================================================= */

function usePresence(user) {

  useEffect(()=>{

    const userDoc =
      doc(db,"users",user.uid);

    async function setPresence(online) {

      await setDoc(
        userDoc,
        {
          uid:user.uid,
          email:user.email,
          name:
            user.displayName ||
            user.email,
          online,
          lastSeen:serverTimestamp()
        },
        {merge:true}
      ).catch(()=>{});
    }

    function visibility() {

      setPresence(
        document.visibilityState === "visible"
      );
    }

    function pageHide() {
      setPresence(false);
    }

    function pageShow() {
      setPresence(true);
    }

    setPresence(true);

    document.addEventListener(
      "visibilitychange",
      visibility
    );

    window.addEventListener(
      "pagehide",
      pageHide
    );

    window.addEventListener(
      "pageshow",
      pageShow
    );

    return ()=>{

      document.removeEventListener(
        "visibilitychange",
        visibility
      );

      window.removeEventListener(
        "pagehide",
        pageHide
      );

      window.removeEventListener(
        "pageshow",
        pageShow
      );

      setPresence(false);
    };

  },[user.uid]);
}


/* =========================================================
   SOCIAL APP
========================================================= */

function SocialApp({user}) {

  usePresence(user);

  const [tab,setTab] = useState("chats");
  const [selected,setSelected] = useState(null);
  const [people,setPeople] = useState([]);
  const [me,setMe] = useState(null);

  useEffect(()=>{

    const unsubscribe =
      onSnapshot(
        doc(db,"users",user.uid),
        snapshot=>{
          setMe({
            uid:user.uid,
            ...snapshot.data()
          });
        }
      );

    return unsubscribe;

  },[user.uid]);

  useEffect(()=>{

    const q =
      query(
        usersRef,
        orderBy("name"),
        limit(100)
      );

    return onSnapshot(
      q,
      snapshot=>{

        const list =
          snapshot.docs
            .map(d=>({
              id:d.id,
              ...d.data()
            }))
            .filter(p=>p.uid !== user.uid);

        setPeople(list);
      }
    );

  },[user.uid]);

  const friends =
    people.filter(
      p=>me?.friends?.includes(p.uid)
    );

  return (
    <div className="app">

      <div className="top">

        <div className="brand">
          Chatdo
          <small>
            Chat • Connect • Share
          </small>
        </div>

        <button
          className="logout"
          onClick={()=>signOut(auth)}
        >
          Logout
        </button>

      </div>

      <div className="tabs">

        <button
          className={
            "tab "+
            (tab === "chats" ? "active" : "")
          }
          onClick={()=>{
            setTab("chats");
            setSelected(null);
          }}
        >
          Chats
        </button>

        <button
          className={
            "tab "+
            (tab === "stories" ? "active" : "")
          }
          onClick={()=>{
            setTab("stories");
            setSelected(null);
          }}
        >
          Stories
        </button>

        <button
          className={
            "tab "+
            (tab === "people" ? "active" : "")
          }
          onClick={()=>{
            setTab("people");
            setSelected(null);
          }}
        >
          People
        </button>

      </div>

      <div className="main">

        {tab === "chats" && (

          <div className="chat-layout">

            <div className="sidebar">

              <div className="side-title">
                Chats
              </div>

              {friends.length === 0 ? (

                <div
                  style={{
                    padding:20,
                    color:"#667781"
                  }}
                >
                  No friends yet.
                  <br/>
                  Go to People and search for users.
                </div>

              ) : (

                friends.map(friend=>(

                  <button
                    className={
                      "person "+
                      (
                        selected?.uid === friend.uid
                          ? "sel"
                          : ""
                      )
                    }
                    key={friend.uid}
                    onClick={()=>
                      setSelected(friend)
                    }
                  >

                    <Avatar user={friend}/>

                    <div className="info">

                      <div className="name">
                        {friend.name || friend.email}
                      </div>

                      <div
                        className={
                          friend.online
                            ? "online"
                            : "offline"
                        }
                      >
                        {
                          friend.online
                            ? "Online"
                            : "Offline"
                        }
                      </div>

                    </div>

                  </button>

                ))
              )}

            </div>

            {selected ? (

              <Chat
                user={user}
                other={selected}
                onBack={()=>setSelected(null)}
              />

            ) : (

              <div className="empty">

                <div className="empty-icon">
                  💬
                </div>

                <h2>
                  Welcome to Chatdo
                </h2>

                <p>
                  Select a friend to start chatting.
                </p>

              </div>

            )}

          </div>
        )}

        {tab === "stories" && (
          <Stories user={user}/>
        )}

        {tab === "people" && (
          <People
            user={user}
            people={people}
            me={me}
          />
        )}

      </div>

    </div>
  );
}


/* =========================================================
   PEOPLE
========================================================= */

function People({user,people,me}) {

  const [search,setSearch] = useState("");

  const incoming =
    me?.friendRequests || [];

  const results =
    search.trim()
      ? people.filter(p=>{

          const text =
            (
              p.name ||
              p.email ||
              ""
            ).toLowerCase();

          return text.includes(
            search.trim().toLowerCase()
          );

        })
      : [];

  async function poke(person) {

    try {

      await updateDoc(
        doc(db,"users",person.uid),
        {
          friendRequests:arrayUnion({
            uid:user.uid,
            name:
              user.displayName ||
              user.email,
            email:user.email
          })
        }
      );

      alert("Poke sent.");

    } catch(err) {

      console.error(err);

      alert(
        "Could not send poke."
      );
    }
  }

  async function accept(request) {

    try {

      await updateDoc(
        doc(db,"users",user.uid),
        {
          friends:arrayUnion(request.uid),
          friendRequests:arrayRemove(request)
        }
      );

      await setDoc(
        doc(db,"users",request.uid),
        {
          friends:arrayUnion(user.uid)
        },
        {merge:true}
      );

    } catch(err) {

      console.error(err);

      alert(
        "Could not accept request."
      );
    }
  }

  async function reject(request) {

    try {

      await updateDoc(
        doc(db,"users",user.uid),
        {
          friendRequests:
            arrayRemove(request)
        }
      );

    } catch(err) {

      console.error(err);
    }
  }

  function relationship(person) {

    if(me?.friends?.includes(person.uid)) {
      return "friends";
    }

    const alreadySent =
      person.friendRequests?.some(
        r=>r.uid === user.uid
      );

    if(alreadySent) {
      return "sent";
    }

    return "none";
  }

  return (
    <div className="page">

      <div className="card">

        <h2 style={{marginTop:0}}>
          People
        </h2>

        <p className="muted">
          Search for people by name or email.
        </p>

        <div className="search">

          <span>
            🔍
          </span>

          <input
            className="input"
            placeholder="Search people..."
            value={search}
            onChange={e=>
              setSearch(e.target.value)
            }
          />

        </div>

      </div>


      {incoming.length > 0 && (

        <div className="card">

          <h3>
            Friend requests
          </h3>

          {incoming.map(request=>(

            <div
              className="people-result"
              key={request.uid}
            >

              <Avatar user={request}/>

              <div className="info">

                <div className="name">
                  {request.name || request.email}
                </div>

                <div className="muted">
                  Wants to be your friend
                </div>

              </div>

              <div className="people-actions">

                <button
                  className="request"
                  onClick={()=>
                    accept(request)
                  }
                >
                  Accept
                </button>

                <button
                  className="secondary"
                  onClick={()=>
                    reject(request)
                  }
                >
                  Reject
                </button>

              </div>

            </div>

          ))}

        </div>
      )}


      {search.trim() && (

        <div className="card">

          <h3>
            Search results
          </h3>

          {results.length === 0 ? (

            <p className="muted">
              No people found.
            </p>

          ) : (

            results.map(person=>{

              const state =
                relationship(person);

              return (

                <div
                  className="people-result"
                  key={person.uid}
                >

                  <Avatar user={person}/>

                  <div className="info">

                    <div className="name">
                      {person.name || person.email}
                    </div>

                    <div
                      className={
                        person.online
                          ? "online"
                          : "offline"
                      }
                    >
                      {
                        person.online
                          ? "Online"
                          : "Offline"
                      }
                    </div>

                  </div>

                  <div className="people-actions">

                    {state === "friends" && (

                      <span
                        className="muted"
                        style={{
                          padding:"8px"
                        }}
                      >
                        ✓ Friend
                      </span>
                    )}

                    {state === "sent" && (

                      <span
                        className="muted"
                        style={{
                          padding:"8px"
                        }}
                      >
                        Poked
                      </span>
                    )}

                    {state === "none" && (

                      <button
                        className="request"
                        onClick={()=>
                          poke(person)
                        }
                      >
                        Poke
                      </button>
                    )}

                  </div>

                </div>

              );

            })
          )}

        </div>
      )}

    </div>
  );
}


/* =========================================================
   CHAT MESSAGES HOOK
========================================================= */

function useChatMessages(chatId) {

  const [messages,setMessages] =
    useState([]);

  useEffect(()=>{

    if(!chatId) {
      setMessages([]);
      return;
    }

    const messagesRef =
      collection(
        db,
        "chats",
        chatId,
        "messages"
      );

    const q =
      query(
        messagesRef,
        orderBy("createdAt","asc")
      );

    return onSnapshot(
      q,
      snapshot=>{

        setMessages(
          snapshot.docs.map(d=>({
            id:d.id,
            ...d.data()
          }))
        );

      }
    );

  },[chatId]);

  return messages;
}


/* =========================================================
   CHAT
========================================================= */

function Chat({user,other,onBack}) {

  const chatId =
    [user.uid,other.uid]
      .sort()
      .join("_");

  const chatDoc =
    doc(db,"chats",chatId);

  const messages =
    useChatMessages(chatId);

  const [text,setText] = useState("");
  const [file,setFile] = useState(null);
  const [sending,setSending] = useState(false);
  const [menuId,setMenuId] = useState(null);
  const [editingId,setEditingId] = useState(null);
  const [editingText,setEditingText] = useState("");
  const [typing,setTyping] = useState(false);
  const [recording,setRecording] = useState(null);

  const typingTimer =
    useRef(null);

  const messagesBox =
    useRef(null);

  const mediaRecorder =
    useRef(null);

  const chunks =
    useRef([]);


  /* CHAT DOCUMENT */

  useEffect(()=>{

    return onSnapshot(
      chatDoc,
      snapshot=>{

        const data =
          snapshot.data();

        setTyping(
          data?.typingUid === other.uid
        );

      }
    );

  },[chatId,other.uid]);


  /* AUTO SCROLL */

  useEffect(()=>{

    if(messagesBox.current) {

      messagesBox.current.scrollTop =
        messagesBox.current.scrollHeight;

    }

  },[messages.length]);


  /* MARK RECEIVED MESSAGES AS SEEN */

  useEffect(()=>{

    async function markSeen() {

      const updates =
        messages.filter(
          m=>
            m.senderId === other.uid &&
            !m.seenBy?.includes(user.uid)
        );

      for(const message of updates) {

        await updateDoc(
          doc(
            db,
            "chats",
            chatId,
            "messages",
            message.id
          ),
          {
            seenBy:
              arrayUnion(user.uid)
          }
        ).catch(()=>{});
      }
    }

    if(messages.length) {
      markSeen();
    }

  },[
    messages,
    chatId,
    user.uid,
    other.uid
  ]);


  /* CLEAN TYPING */

  useEffect(()=>{

    return ()=>{

      if(typingTimer.current) {
        clearTimeout(
          typingTimer.current
        );
      }

      setDoc(
        chatDoc,
        {
          typingUid:null
        },
        {merge:true}
      ).catch(()=>{});

    };

  },[chatId]);


  /* TYPING */

  function handleTyping(value) {

    setText(value);

    setDoc(
      chatDoc,
      {
        typingUid:user.uid
      },
      {merge:true}
    ).catch(()=>{});

    if(typingTimer.current) {
      clearTimeout(
        typingTimer.current
      );
    }

    typingTimer.current =
      setTimeout(()=>{

        setDoc(
          chatDoc,
          {
            typingUid:null
          },
          {merge:true}
        ).catch(()=>{});

      },1200);
  }


  /* SEND TEXT */

  async function sendText() {

    const value =
      text.trim();

    if(!value || sending) {
      return;
    }

    setSending(true);

    try {

      await setDoc(
        chatDoc,
        {
          members:[
            user.uid,
            other.uid
          ],
          lastMessage:value,
          updatedAt:serverTimestamp(),
          typingUid:null
        },
        {merge:true}
      );

      await addDoc(
        collection(
          db,
          "chats",
          chatId,
          "messages"
        ),
        {
          senderId:user.uid,
          senderName:
            user.displayName ||
            user.email,
          text:value,
          imageURL:"",
          mediaURL:"",
          mediaType:"",
          mimeType:"",
          createdAt:
            serverTimestamp(),
          likes:[],
          seenBy:[],
          edited:false,
          deletedForEveryone:false,
          deletedFor:[]
        }
      );

      setText("");

    } catch(err) {

      console.error(err);

      alert(
        "Message failed."
      );

    } finally {

      setSending(false);

    }
  }


  /* SEND IMAGE */

  async function sendImage(fileToSend) {

    if(!fileToSend || sending) {
      return;
    }

    if(
      fileToSend.size >
      35 * 1024 * 1024
    ) {

      alert(
        "Image must be smaller than 35 MB."
      );

      return;
    }

    setSending(true);

    try {

      const storageRef =
        ref(
          storage,
          `chatMedia/${chatId}/${Date.now()}-${user.uid}-${fileToSend.name}`
        );

      await uploadBytes(
        storageRef,
        fileToSend,
        {
          contentType:
            fileToSend.type
        }
      );

      const url =
        await getDownloadURL(
          storageRef
        );

      await setDoc(
        chatDoc,
        {
          members:[
            user.uid,
            other.uid
          ],
          lastMessage:"📷 Photo",
          updatedAt:serverTimestamp(),
          typingUid:null
        },
        {merge:true}
      );

      await addDoc(
        collection(
          db,
          "chats",
          chatId,
          "messages"
        ),
        {
          senderId:user.uid,
          senderName:
            user.displayName ||
            user.email,
          text:"",
          imageURL:url,
          mediaURL:"",
          mediaType:"",
          mimeType:fileToSend.type,
          createdAt:
            serverTimestamp(),
          likes:[],
          seenBy:[],
          edited:false,
          deletedForEveryone:false,
          deletedFor:[]
        }
      );

    } catch(err) {

      console.error(err);

      alert(
        "Image sending failed. Check Firebase Storage Rules."
      );

    } finally {

      setSending(false);

    }
  }


  /* FILE SELECT */

  function handleFile(e) {

    const selectedFile =
      e.target.files?.[0];

    e.target.value = "";

    if(!selectedFile) {
      return;
    }

    setFile(selectedFile);
  }


  /* SEND BUTTON */

  async function sendTextOrImage() {

    if(file) {

      const selectedFile =
        file;

      setFile(null);

      await sendImage(
        selectedFile
      );

      return;
    }

    await sendText();
  }


  /* RECORD AUDIO / VIDEO */

  async function startRecording(kind) {

    if(recording) {
      return;
    }

    try {

      const stream =
        await navigator.mediaDevices
          .getUserMedia(
            kind === "audio"
              ? {audio:true}
              : {
                  audio:true,
                  video:true
                }
          );

      let mime = "";

      const options =
        kind === "audio"
          ? [
              "audio/webm;codecs=opus",
              "audio/webm"
            ]
          : [
              "video/webm;codecs=vp8,opus",
              "video/webm",
              "video/mp4"
            ];

      for(
        const option of options
      ) {

        if(
          window.MediaRecorder &&
          MediaRecorder.isTypeSupported(
            option
          )
        ) {

          mime = option;
          break;

        }
      }

      const recorder =
        mime
          ? new MediaRecorder(
              stream,
              {
                mimeType:mime
              }
            )
          : new MediaRecorder(
              stream
            );

      chunks.current = [];

      recorder.ondataavailable =
        event=>{

          if(
            event.data &&
            event.data.size
          ) {

            chunks.current.push(
              event.data
            );

          }
        };


      recorder.onstop =
        async ()=>{

          const blob =
            new Blob(
              chunks.current,
              {
                type:
                  mime ||
                  recorder.mimeType ||
                  (
                    kind === "audio"
                      ? "audio/webm"
                      : "video/webm"
                  )
              }
            );

          stream
            .getTracks()
            .forEach(
              track=>
                track.stop()
            );

          mediaRecorder.current =
            null;

          setRecording(null);

          await uploadMedia(
            blob,
            blob.type,
            kind
          );
        };


      recorder.start();

      mediaRecorder.current =
        recorder;

      setRecording(kind);

      setTimeout(()=>{

        if(
          mediaRecorder.current &&
          mediaRecorder.current.state ===
            "recording"
        ) {

          mediaRecorder.current.stop();

        }

      },60000);

    } catch(err) {

      console.error(err);

      alert(
        "Camera/Microphone permission is required."
      );

      setRecording(null);
    }
  }


  /* UPLOAD AUDIO / VIDEO */

  async function uploadMedia(
    blob,
    mimeType,
    kind
  ) {

    setSending(true);

    try {

      const extension =
        kind === "audio"
          ? "webm"
          : "webm";

      const storageRef =
        ref(
          storage,
          `chatMedia/${chatId}/${Date.now()}-${user.uid}.${extension}`
        );

      await uploadBytes(
        storageRef,
        blob,
        {
          contentType:
            mimeType
        }
      );

      const url =
        await getDownloadURL(
          storageRef
        );

      await setDoc(
        chatDoc,
        {
          members:[
            user.uid,
            other.uid
          ],
          lastMessage:
            kind === "audio"
              ? "🎤 Voice message"
              : "🎥 Video message",
          updatedAt:
            serverTimestamp(),
          typingUid:null
        },
        {merge:true}
      );

      await addDoc(
        collection(
          db,
          "chats",
          chatId,
          "messages"
        ),
        {
          senderId:user.uid,
          senderName:
            user.displayName ||
            user.email,
          text:"",
          imageURL:"",
          mediaURL:url,
          mediaType:kind,
          mimeType:mimeType,
          createdAt:
            serverTimestamp(),
          likes:[],
          seenBy:[],
          edited:false,
          deletedForEveryone:false,
          deletedFor:[]
        }
      );

    } catch(err) {

      console.error(err);

      alert(
        "Media sending failed. Check Firebase Storage Rules."
      );

    } finally {

      setSending(false);

    }
  }


  function stopRecording() {

    if(
      mediaRecorder.current &&
      mediaRecorder.current.state ===
        "recording"
    ) {

      mediaRecorder.current.stop();

    }
  }


  /* EDIT */

  function startEdit(message) {

    if(
      message.senderId !== user.uid ||
      message.deletedForEveryone
    ) {
      return;
    }

    const created =
      message.createdAt?.toMillis?.();

    if(!created) {

      alert(
        "Try again in a moment."
      );

      return;
    }

    if(
      Date.now() - created >
      3600000
    ) {

      alert(
        "Messages can only be edited within 1 hour."
      );

      return;
    }

    setEditingId(
      message.id
    );

    setEditingText(
      message.text || ""
    );

    setMenuId(null);
  }


  async function saveEdit(message) {

    const clean =
      editingText.trim();

    if(!clean) {
      return;
    }

    const created =
      message.createdAt?.toMillis?.();

    if(
      !created ||
      Date.now() - created >
        3600000
    ) {

      alert(
        "Edit time expired."
      );

      setEditingId(null);

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
          text:clean,
          edited:true,
          updatedAt:
            serverTimestamp()
        }
      );

      setEditingId(null);
      setEditingText("");

    } catch(err) {

      console.error(err);

      alert(
        "Edit failed. Check Firestore Rules."
      );
    }
  }


  /* LIKE */

  async function toggleLike(message) {

    try {

      const liked =
        message.likes?.includes(
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
          likes:
            liked
              ? arrayRemove(user.uid)
              : arrayUnion(user.uid)
        }
      );

    } catch(err) {

      console.error(err);
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

    } catch(err) {

      console.error(err);

      alert(
        "Delete failed. Check Firestore Rules."
      );
    }
  }


  /* DELETE FOR EVERYONE */

  async function deleteForEveryone(message) {

    if(
      message.senderId !== user.uid
    ) {
      return;
    }

    if(
      !window.confirm(
        "Delete this message for everyone?"
      )
    ) {
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
          deletedForEveryone:true,
          text:"",
          imageURL:"",
          mediaURL:""
        }
      );

      setMenuId(null);

    } catch(err) {

      console.error(err);

      alert(
        "Delete failed. Check Firestore Rules."
      );
    }
  }


  /* TIME */

  function time(timestamp) {

    try {

      return (
        timestamp
          ?.toDate?.()
          ?.toLocaleTimeString(
            [],
            {
              hour:"2-digit",
              minute:"2-digit"
            }
          ) || ""
      );

    } catch {

      return "";
    }
  }


  return (
    <div className="chat">

      <div className="chat-head">

        <button
          className="back"
          onClick={onBack}
        >
          ←
        </button>

        <Avatar user={other}/>

        <div className="chat-head-info">

          <b>
            {other.name || other.email}
          </b>

          <div className="chat-status">

            {
              typing
                ? "typing..."
                : other.online
                  ? "Online"
                  : "Offline"
            }

          </div>

        </div>

      </div>


      <div
        className="messages"
        ref={messagesBox}
        onClick={()=>
          setMenuId(null)
        }
      >

        {messages.map(message=>{

          if(
            message.deletedFor?.includes(
              user.uid
            )
          ) {
            return null;
          }

          const mine =
            message.senderId ===
            user.uid;

          const seen =
            message.seenBy?.includes(
              other.uid
            );

          const liked =
            message.likes?.includes(
              user.uid
            );

          return (

            <div
              className={
                "row "+
                (
                  mine
                    ? "mine"
                    : "other"
                )
              }
              key={message.id}
            >

              <div
                className="bubble"
                onClick={e=>
                  e.stopPropagation()
                }
              >

                <div className="menu">

                  <button
                    onClick={()=>
                      setMenuId(
                        menuId === message.id
                          ? null
                          : message.id
                      )
                    }
                  >
                    ⋮
                  </button>

                  {menuId === message.id && (

                    <div className="menu-panel">

                      {mine &&
                       !message.deletedForEveryone && (

                        <button
                          onClick={()=>
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
                          onClick={()=>
                            deleteForMe(
                              message
                            )
                          }
                        >
                          🗑 Delete for me
                        </button>

                      )}

                      {mine &&
                       !message.deletedForEveryone && (

                        <button
                          onClick={()=>
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


                {message.deletedForEveryone ? (

                  <span className="deleted">
                    🚫 This message was deleted
                  </span>

                ) : (

                  <>

                    {message.imageURL && (

                      <img
                        className="image"
                        src={message.imageURL}
                        alt="sent"
                      />

                    )}


                    {message.mediaType === "audio" &&
                     message.mediaURL && (

                      <audio
                        className="media"
                        controls
                        src={message.mediaURL}
                      />

                    )}


                    {message.mediaType === "video" &&
                     message.mediaURL && (

                      <video
                        className="media"
                        controls
                        playsInline
                        src={message.mediaURL}
                      />

                    )}


                    {editingId === message.id ? (

                      <div className="editbox">

                        <input
                          value={editingText}
                          onChange={e=>
                            setEditingText(
                              e.target.value
                            )
                          }
                        />

                        <button
                          className="save"
                          onClick={()=>
                            saveEdit(
                              message
                            )
                          }
                        >
                          Save
                        </button>

                        <button
                          className="cancel"
                          onClick={()=>{
                            setEditingId(null);
                            setEditingText("");
                          }}
                        >
                          Cancel
                        </button>

                      </div>

                    ) : (

                      message.text && (

                        <div className="text">

                          {message.text}

                          {message.edited && (
                            <span className="edited">
                              edited
                            </span>
                          )}

                        </div>

                      )

                    )}


                    <div className="time-line">

                      <span className="time">
                        {time(
                          message.createdAt
                        )}
                      </span>

                      {mine && (

                        seen
                          ? (
                            <EyeIcon/>
                          )
                          : (
                            <span className="tick">
                              ✓
                            </span>
                          )

                      )}

                    </div>


                    <button
                      className={
                        "heart "+
                        (
                          liked
                            ? "liked"
                            : ""
                        )
                      }
                      onClick={()=>
                        toggleLike(
                          message
                        )
                      }
                    >
                      {liked ? "♥" : "♡"}
                      {" "}
                      {message.likes?.length || 0}
                    </button>

                  </>

                )}

              </div>

            </div>

          );

        })}


        {typing && (

          <div className="typing">
            typing...
          </div>

        )}

      </div>


      {recording && (

        <div className="recording">

          <span>
            {
              recording === "audio"
                ? "🎤 Recording voice..."
                : "🎥 Recording video..."
            }
          </span>

          <button
            className="danger"
            onClick={stopRecording}
          >
            Stop
          </button>

        </div>

      )}


      {file && (

        <div
          style={{
            background:"#fff",
            padding:"7px 12px",
            fontSize:"12px",
            display:"flex",
            justifyContent:"space-between"
          }}
        >

          <span>
            📎 {file.name}
          </span>

          <button
            className="danger"
            onClick={()=>
              setFile(null)
            }
          >
            Remove
          </button>

        </div>

      )}


      <div className="composer-wrap">

        <div className="composer">

          <label className="file-label">

            📷

            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
            />

          </label>


          <button
            className="icon"
            title="Voice message"
            onClick={()=>
              startRecording("audio")
            }
            disabled={!!recording}
          >
            🎤
          </button>


          <button
            className="icon"
            title="Video message"
            onClick={()=>
              startRecording("video")
            }
            disabled={!!recording}
          >
            🎥
          </button>


          <input
            className="textbox"
            placeholder={
              file
                ? "Press send to send file"
                : "Type a message..."
            }
            value={text}
            onChange={e=>
              handleTyping(
                e.target.value
              )
            }
            onKeyDown={e=>{

              if(
                e.key === "Enter" &&
                !e.shiftKey
              ) {

                e.preventDefault();

                sendTextOrImage();

              }

            }}
          />


          <button
            className="send"
            onClick={sendTextOrImage}
            disabled={sending}
          >
            ➤
          </button>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   STORIES
========================================================= */

function Stories({user}) {

  const [stories,setStories] =
    useState([]);

  const [text,setText] =
    useState("");

  const [image,setImage] =
    useState(null);

  const [posting,setPosting] =
    useState(false);


  useEffect(()=>{

    const q =
      query(
        storiesRef,
        orderBy("createdAt","desc"),
        limit(50)
      );

    return onSnapshot(
      q,
      snapshot=>{

        const now =
          Date.now();

        const valid =
          snapshot.docs
            .map(d=>({
              id:d.id,
              ...d.data()
            }))
            .filter(story=>{

              if(
                !story.expiresAt
              ) {
                return true;
              }

              const expiry =
                story.expiresAt
                  ?.toMillis?.();

              return !expiry ||
                expiry > now;
            });

        setStories(valid);

      }
    );

  },[]);


  /* DELETE OWN EXPIRED STORIES */

  useEffect(()=>{

    async function cleanup() {

      const now =
        Date.now();

      for(
        const story of stories
      ) {

        const expiry =
          story.expiresAt
            ?.toMillis?.();

        if(
          story.uid === user.uid &&
          expiry &&
          expiry <= now
        ) {

          await deleteDoc(
            doc(
              db,
              "stories",
              story.id
            )
          ).catch(()=>{});

        }
      }
    }

    cleanup();

  },[stories,user.uid]);


  /* POST STORY */

  async function postStory() {

    if(
      !text.trim() &&
      !image
    ) {

      alert(
        "Write something or choose an image."
      );

      return;
    }

    setPosting(true);

    try {

      let imageURL = "";

      if(image) {

        if(
          image.size >
          35 * 1024 * 1024
        ) {

          alert(
            "Image must be smaller than 35 MB."
          );

          setPosting(false);

          return;
        }

        const storageRef =
          ref(
            storage,
            `stories/${user.uid}/${Date.now()}-${image.name}`
          );

        await uploadBytes(
          storageRef,
          image,
          {
            contentType:
              image.type
          }
        );

        imageURL =
          await getDownloadURL(
            storageRef
          );
      }


      const now =
        Date.now();

      await addDoc(
        storiesRef,
        {
          uid:user.uid,
          name:
            user.displayName ||
            user.email,
          text:text.trim(),
          imageURL:imageURL,
          createdAt:
            serverTimestamp(),
          expiresAt:
            Timestamp.fromMillis(
              now + 24 * 60 * 60 * 1000
            ),
          likes:[]
        }
      );

      setText("");
      setImage(null);

      alert(
        "Story posted."
      );

    } catch(err) {

      console.error(err);

      alert(
        "Story posting failed. Check Firebase Storage/Firestore Rules."
      );

    } finally {

      setPosting(false);
    }
  }


  /* DELETE OWN STORY */

  async function deleteStory(story) {

    if(
      story.uid !== user.uid
    ) {
      return;
    }

    if(
      !window.confirm(
        "Delete this story?"
      )
    ) {
      return;
    }

    try {

      await deleteDoc(
        doc(
          db,
          "stories",
          story.id
        )
      );

    } catch(err) {

      console.error(err);

      alert(
        "Story delete failed. Check Firestore Rules."
      );
    }
  }


  /* LIKE STORY */

  async function likeStory(story) {

    try {

      const liked =
        story.likes?.includes(
          user.uid
        );

      await updateDoc(
        doc(
          db,
          "stories",
          story.id
        ),
        {
          likes:
            liked
              ? arrayRemove(user.uid)
              : arrayUnion(user.uid)
        }
      );

    } catch(err) {

      console.error(err);
    }
  }


  return (
    <div className="page">

      <div className="card">

        <h2 style={{marginTop:0}}>
          Stories
        </h2>

        <p className="muted">
          Stories disappear automatically after 24 hours.
        </p>

        <textarea
          className="textarea"
          placeholder="Write your story..."
          value={text}
          onChange={e=>
            setText(e.target.value)
          }
        />

        <div
          style={{
            marginTop:8,
            display:"flex",
            gap:8,
            alignItems:"center",
            flexWrap:"wrap"
          }}
        >

          <label className="request">

            📷 Choose image

            <input
              type="file"
              accept="image/*"
              style={{
                display:"none"
              }}
              onChange={e=>
                setImage(
                  e.target.files?.[0] || null
                )
              }
            />

          </label>

          {image && (

            <span className="muted">
              {image.name}
            </span>

          )}

          <button
            className="primary"
            onClick={postStory}
            disabled={posting}
          >
            {
              posting
                ? "Posting..."
                : "Post story"
            }
          </button>

        </div>

      </div>


      <div className="stories">

        {stories.length === 0 ? (

          <div className="card">

            <p className="muted">
              No active stories.
            </p>

          </div>

        ) : (

          stories.map(story=>{

            const mine =
              story.uid === user.uid;

            const liked =
              story.likes?.includes(
                user.uid
              );

            return (

              <div
                className="story"
                key={story.id}
              >

                <div className="story-card">

                  {story.imageURL ? (

                    <img
                      src={story.imageURL}
                      alt="story"
                    />

                  ) : (

                    <div
                      style={{
                        width:"100%",
                        height:"100%",
                        background:"#075e54",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"center",
                        padding:20,
                        color:"white",
                        textAlign:"center",
                        fontSize:18
                      }}
                    >
                      {story.text}
                    </div>

                  )}


                  <div className="story-overlay">

                    <div className="story-author">

                      <Avatar user={story}/>

                      <div>

                        <b>
                          {
                            story.name ||
                            "User"
                          }
                        </b>

                        {mine && (

                          <div className="my-story">
                            My story
                          </div>

                        )}

                      </div>

                    </div>


                    {story.text && (
                      <div className="story-text">
                        {story.text}
                      </div>
                    )}

                  </div>

                </div>


                <div className="story-actions">

                  <button
                    className={
                      "heart "+
                      (
                        liked
                          ? "liked"
                          : ""
                      )
                    }
                    onClick={()=>
                      likeStory(story)
                    }
                  >
                    {liked ? "♥" : "♡"}
                    {" "}
                    {story.likes?.length || 0}
                  </button>


                  {mine && (

                    <button
                      className="danger"
                      onClick={()=>
                        deleteStory(
                          story
                        )
                      }
                    >
                      Delete
                    </button>

                  )}

                </div>

              </div>

            );

          })

        )}

      </div>

    </div>
  );
}


/* =========================================================
   ROOT
========================================================= */

const rootElement =
  document.getElementById("root");

createRoot(rootElement).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
