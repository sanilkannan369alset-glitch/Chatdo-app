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
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

import "./styles.css";


/* =========================
   FIREBASE CONFIG
========================= */

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


/* =========================
   FIRESTORE REFERENCES
========================= */

const usersRef = collection(db, "users");
const storiesRef = collection(db, "stories");


/* =========================
   MAIN APP
========================= */

function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <div className="center">
        <h2>Chatdo</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <SocialApp user={user} />;
}


/* =========================
   LOGIN / SIGNUP
========================= */

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
        const result = await createUserWithEmailAndPassword(
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
    <div className="auth">
      <div className="card authCard">

        <h1>Chatdo</h1>

        <p className="muted">
          Chat, connect and share stories.
        </p>

        <form onSubmit={submit}>

          {mode === "signup" && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <button
            className="primary"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>

        </form>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button
          className="link"
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


/* =========================
   FIREBASE ERROR
========================= */

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


/* =========================
   SOCIAL APP
========================= */

function SocialApp({ user }) {
  const [tab, setTab] = useState("chats");
  const [selectedUser, setSelectedUser] = useState(null);

  usePresence(user);

  function openChat(person) {
    setSelectedUser(person);
    setTab("chats");
  }

  return (
    <div className="app">

      <header className="topbar">

        <div>
          <h2>Chatdo</h2>
          <small>
            {user.displayName || user.email}
          </small>
        </div>

        <button
          onClick={() => signOut(auth)}
        >
          Log out
        </button>

      </header>


      <nav className="tabs">

        <button
          className={tab === "chats" ? "active" : ""}
          onClick={() => setTab("chats")}
        >
          Chats
        </button>

        <button
          className={tab === "stories" ? "active" : ""}
          onClick={() => setTab("stories")}
        >
          Stories
        </button>

        <button
          className={tab === "people" ? "active" : ""}
          onClick={() => setTab("people")}
        >
          People
        </button>

      </nav>


      <main>

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


/* =========================
   ONLINE PRESENCE
========================= */

function usePresence(user) {
  useEffect(() => {
    if (!user?.uid) return;

    const userDoc = doc(db, "users", user.uid);

    setDoc(
      userDoc,
      {
        uid: user.uid,
        name: user.displayName || user.email,
        email: user.email,
        online: true,
        lastSeen: serverTimestamp()
      },
      { merge: true }
    ).catch(console.error);

    const handleOffline = () => {
      updateDoc(userDoc, {
        online: false,
        lastSeen: serverTimestamp()
      }).catch(() => {});
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


/* =========================
   CHAT HOME
========================= */

function ChatHome({
  user,
  selected,
  onSelect
}) {
  const [people, setPeople] = useState([]);

  useEffect(() => {
    const q = query(
      usersRef,
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => item.data())
          .filter(
            (person) => person.uid !== user.uid
          );

        setPeople(list);
      },
      (error) => {
        console.error("Users error:", error);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  return (
    <div className="chatLayout">

      <aside className="sidebar">

        <div className="sidebarTitle">
          <h2>Messages</h2>
        </div>

        {people.length === 0 ? (
          <div className="emptySmall">
            No other users yet.
          </div>
        ) : (
          people.map((person) => (
            <button
              className={
                "person " +
                (
                  selected?.uid === person.uid
                    ? "selected"
                    : ""
                )
              }
              key={person.uid}
              onClick={() => onSelect(person)}
            >

              <Avatar user={person} />

              <span className="personInfo">

                <b>
                  {person.name || person.email}
                </b>

                <small>
                  {person.online
                    ? "Online"
                    : "Offline"}
                </small>

              </span>

            </button>
          ))
        )}

      </aside>


      <section className="chatArea">

        {selected ? (
          <Chat
            user={user}
            other={selected}
          />
        ) : (
          <div className="emptyChat">

            <div className="emptyIcon">
              💬
            </div>

            <h2>Welcome to Chatdo</h2>

            <p>
              Select someone from the left
              to start chatting.
            </p>

          </div>
        )}

      </section>

    </div>
  );
}


/* =========================
   CHAT
========================= */

function Chat({ user, other }) {
  const chatId = [user.uid, other.uid]
    .sort()
    .join("_");

  const messagesRef = collection(
    db,
    "chats",
    chatId,
    "messages"
  );

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(
      messagesRef,
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data()
          })
        );

        setMessages(list);
      },
      (error) => {
        console.error(
          "Messages error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [chatId]);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);


  async function sendMessage() {
    const cleanText = text.trim();

    if (!cleanText && !file) {
      return;
    }

    setSending(true);

    try {
      let imageURL = "";

      if (file) {
        const fileRef = ref(
          storage,
          `chatImages/${chatId}/${Date.now()}-${file.name}`
        );

        await uploadBytes(
          fileRef,
          file
        );

        imageURL =
          await getDownloadURL(fileRef);
      }

      await setDoc(
        doc(db, "chats", chatId),
        {
          members: [
            user.uid,
            other.uid
          ],
          lastMessage:
            cleanText ||
            "📷 Image",
          updatedAt:
            serverTimestamp()
        },
        { merge: true }
      );

      await addDoc(
        messagesRef,
        {
          senderId: user.uid,
          senderName:
            user.displayName ||
            user.email,
          text: cleanText,
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
        "Send message error:",
        error
      );

      alert(
        "Message send failed. Check Firebase Storage/Firestore settings."
      );
    } finally {
      setSending(false);
    }
  }


  async function toggleLike(message) {
    try {
      const messageDoc = doc(
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
          likes: liked
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


  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }


  return (
    <div className="chat">

      <div className="chatHeader">

        <Avatar user={other} />

        <div>
          <b>
            {other.name || other.email}
          </b>

          <small>
            {other.online
              ? "Online"
              : "Offline"}
          </small>
        </div>

      </div>


      <div className="messages">

        {messages.length === 0 && (
          <div className="noMessages">
            <p>
              No messages yet.
            </p>

            <small>
              Send the first message.
            </small>
          </div>
        )}


        {messages.map((message) => {

          const mine =
            message.senderId ===
            user.uid;

          const liked =
            message.likes?.includes(
              user.uid
            );

          return (
            <div
              key={message.id}
              className={
                "messageRow " +
                (mine
                  ? "mine"
                  : "other")
              }
            >

              <div className="messageBubble">

                {message.imageURL && (
                  <img
                    src={message.imageURL}
                    className="chatImage"
                    alt="sent"
                  />
                )}

                {message.text && (
                  <div className="messageText">
                    {message.text}
                  </div>
                )}

                <button
                  className={
                    "heartButton " +
                    (liked
                      ? "liked"
                      : "")
                  }
                  onClick={() =>
                    toggleLike(message)
                  }
                >
                  ♥{" "}
                  {message.likes?.length ||
                    0}
                </button>

              </div>

            </div>
          );
        })}

        <div ref={bottomRef} />

      </div>


      <div className="composer">

        <label className="attachButton">

          📎

          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              setFile(
                event.target.files?.[0] ||
                null
              )
            }
          />

        </label>


        <input
          type="text"
          value={text}
          onChange={(event) =>
            setText(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={
            file
              ? file.name
              : "Write a message..."
          }
        />


        <button
          className="primary sendButton"
          onClick={sendMessage}
          disabled={sending}
        >
          {sending
            ? "..."
            : "Send"}
        </button>

      </div>

    </div>
  );
}


/* =========================
   STORIES
========================= */

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
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe =
      onSnapshot(
        q,
        (snapshot) => {
          setStories(
            snapshot.docs.map(
              (item) => ({
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
    if (!text.trim() && !file) {
      return;
    }

    setPosting(true);

    try {
      let imageURL = "";

      if (file) {
        const fileRef = ref(
          storage,
          `stories/${user.uid}/${Date.now()}-${file.name}`
        );

        await uploadBytes(
          fileRef,
          file
        );

        imageURL =
          await getDownloadURL(fileRef);
      }

      await addDoc(
        storiesRef,
        {
          uid: user.uid,
          name:
            user.displayName ||
            user.email,
          text: text.trim(),
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
        "Story post failed. Check Firebase Storage/Firestore."
      );
    } finally {
      setPosting(false);
    }
  }


  async function toggleStoryLike(story) {
    try {
      const storyDoc = doc(
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
          likes: liked
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
    <div className="page">

      <div className="storyCreate">

        <h2>Share a story</h2>

        <input
          type="text"
          value={text}
          onChange={(event) =>
            setText(event.target.value)
          }
          placeholder="What's on your mind?"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(event) =>
            setFile(
              event.target.files?.[0] ||
              null
            )
          }
        />

        <button
          className="primary"
          onClick={postStory}
          disabled={posting}
        >
          {posting
            ? "Posting..."
            : "Post"}
        </button>

      </div>


      <div className="stories">

        {stories.length === 0 ? (
          <div className="emptyChat">
            <h3>No stories yet</h3>
            <p>
              Be the first person to share
              something.
            </p>
          </div>
        ) : (
          stories.map((story) => (

            <article
              className="story"
              key={story.id}
            >

              <div className="storyAuthor">
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
                className={
                  story.likes?.includes(
                    user.uid
                  )
                    ? "liked"
                    : ""
                }
                onClick={() =>
                  toggleStoryLike(story)
                }
              >
                ♥{" "}
                {story.likes?.length ||
                  0}
              </button>

            </article>

          ))
        )}

      </div>

    </div>
  );
}


/* =========================
   PEOPLE
========================= */

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
        (snapshot) => {

          const list =
            snapshot.docs
              .map(
                (item) =>
                  item.data()
              )
              .filter(
                (person) =>
                  person.uid !==
                  user.uid
              );

          setPeople(list);
        }
      );

    return () => unsubscribe();

  }, [user.uid]);


  return (
    <div className="page">

      <h2>People</h2>

      {people.length === 0 ? (

        <div className="emptyChat">
          <h3>No other users</h3>
          <p>
            Create another Chatdo account
            to start chatting.
          </p>
        </div>

      ) : (

        <div className="peopleList">

          {people.map((person) => (

            <div
              className="personRow"
              key={person.uid}
            >

              <Avatar user={person} />

              <div className="personInfo">

                <b>
                  {person.name ||
                    person.email}
                </b>

                <small>
                  {person.online
                    ? "Online"
                    : "Offline"}
                </small>

              </div>


              <button
                onClick={() =>
                  onChat(person)
                }
              >
                Message
              </button>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}


/* =========================
   AVATAR
========================= */

function Avatar({ user }) {
  const name =
    user?.name ||
    user?.email ||
    "?";

  return (
    <div className="avatar">
      {name
        .charAt(0)
        .toUpperCase()}
    </div>
  );
}


/* =========================
   START APP
========================= */

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
