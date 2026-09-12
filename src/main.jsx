import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

/* =========================================================
   CHATDO - SINGLE FILE APP
   Paste this entire file into: src/main.jsx
========================================================= */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();
const TABS = ["chats", "stories", "calls", "people"];

const nowMs = () => Date.now();

function ts(v) {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.toDate === "function") return v.toDate().getTime();
  const n = new Date(v).getTime();
  return Number.isNaN(n) ? 0 : n;
}

function timeText(v) {
  const n = ts(v);
  return n ? new Date(n).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}

function dateText(v) {
  const n = ts(v);
  return n ? new Date(n).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
}

function normalize(v = "") {
  return String(v).trim().toLowerCase();
}

function phoneOnly(v = "") {
  return String(v).replace(/[^\d]/g, "");
}

function chatId(a, b) {
  return [a, b].sort().join("_");
}

function nameOf(u) {
  return u?.displayName || u?.username || u?.name || u?.email?.split("@")[0] || "User";
}

function initials(u) {
  return nameOf(u).split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "U";
}

function avatar(u, small = false) {
  return (
    <div className={`avatar ${small ? "small" : ""}`}>
      {u?.photoURL ? <img src={u.photoURL} alt="" /> : initials(u)}
    </div>
  );
}

function statusFor(m, uid) {
  if (m.senderId !== uid) return "";
  if ((m.seenBy || []).some(x => x !== uid)) return "seen";
  if ((m.deliveredTo || []).some(x => x !== uid)) return "delivered";
  return "sent";
}

async function ensureUser(firebaseUser, extra = {}) {
  if (!firebaseUser) return null;
  const ref = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const base = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || "",
      username: "",
      phoneNumber: firebaseUser.phoneNumber || "",
      photoURL: firebaseUser.photoURL || "",
      bio: "",
      hobbies: "",
      coverURL: "",
      online: true,
      lastSeen: serverTimestamp(),
      searchHistory: [],
      createdAt: serverTimestamp(),
      ...extra,
    };
    await setDoc(ref, base);
    return base;
  }
  await updateDoc(ref, { online: true, lastSeen: serverTimestamp() }).catch(() => {});
  return { ...snap.data(), ...extra };
}

async function saveUserFields(uid, fields) {
  await setDoc(doc(db, "users", uid), fields, { merge: true });
}

async function uploadFile(uid, file, folder) {
  if (!file) return "";
  try {
    const clean = file.name.replace(/[^\w.-]/g, "_");
    const r = ref(storage, `${folder}/${uid}/${Date.now()}_${clean}`);
    await uploadBytes(r, file);
    return await getDownloadURL(r);
  } catch (e) {
    alert("Firebase Storage is not enabled yet. Enable Storage later to upload photos/videos.");
    throw e;
  }
}

function useUserDoc(uid) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, "users", uid), s => setUser(s.exists() ? { uid, ...s.data() } : null));
  }, [uid]);
  return user;
}

function useAllUsers(uid) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(collection(db, "users"), snap => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(x => x.uid !== uid));
    });
  }, [uid]);
  return users;
}

function AvatarWithOnline({ user, small = false }) {
  return (
    <div className="avatarWrap">
      {avatar(user, small)}
      <span className={`onlineDot ${user?.online ? "on" : "off"}`} />
    </div>
  );
}

/* =========================================================
   STYLES - WARM MINIMAL / COFFEE UI
========================================================= */

function Styles() {
  return <style>{`
    *{box-sizing:border-box}
    html,body,#root{margin:0;min-height:100%;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f0e7;color:#33251e}
    button,input,textarea{font:inherit}
    button{cursor:pointer}
    .app{min-height:100vh;background:#f6f0e7}
    .topbar{height:68px;background:#fffaf3;border-bottom:1px solid #eadbca;display:flex;align-items:center;justify-content:space-between;padding:0 18px;position:sticky;top:0;z-index:50}
    .brand{display:flex;align-items:center;gap:10px;font-weight:900;font-size:22px;color:#4b2e20;cursor:pointer}
    .brandMark{width:40px;height:40px;border-radius:14px;background:#70462f;color:#fffaf3;display:grid;place-items:center;font-weight:900;box-shadow:0 5px 14px #70462f25}
    .topActions{display:flex;gap:8px;align-items:center}
    .iconBtn{width:40px;height:40px;border:1px solid #e7d8c7;background:#fffaf3;color:#5c3a29;border-radius:13px;display:grid;place-items:center}
    .backTop{width:34px;height:34px;border:1px solid #e7d8c7;background:#fffaf3;color:#5c3a29;border-radius:10px;display:grid;place-items:center;font-size:18px}
    .editIcon{position:absolute;right:7px;bottom:7px;width:22px;height:22px;border:0;background:transparent;color:#4b2e20;display:grid;place-items:center;cursor:pointer;font-size:16px;line-height:1;padding:0;box-shadow:none}
    .coverEdit{position:absolute;right:9px;top:9px} 
    .colorWheel{width:34px;height:34px;border-radius:50%;padding:0;border:2px solid #fffaf3;box-shadow:0 0 0 1px #dfcfbd;overflow:hidden;cursor:pointer;display:inline-block;vertical-align:middle}
    .colorWheel input{width:50px;height:50px;margin:-8px;border:0;padding:0;cursor:pointer;background:transparent}
    .storyBgPicker{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid #eadbca;background:#fffdf9;border-radius:13px}
    .storyBgPreview{min-height:180px;border-radius:16px;display:grid;place-items:center;text-align:center;padding:24px;font-weight:900;white-space:pre-wrap;word-break:break-word}

    .mediaChoice{display:flex;gap:8px;flex-wrap:wrap}.mediaChoice label{width:48px;height:48px;border:1px solid #dfcfbd;background:#fffdf9;border-radius:13px;display:grid;place-items:center;font-size:21px;cursor:pointer}.mediaChoice input{display:none}
    .storyTextOnly{min-height:220px;padding:24px;display:grid;place-items:center;text-align:center;font-weight:900;white-space:pre-wrap;word-break:break-word}
    .storyAudio{width:100%;padding:25px 14px}
    .storyCanvas{position:relative}
    .stickerChoice.active{outline:2px solid #70462f;background:#f2e4d5}
    .chatError{padding:18px;margin:18px;border-radius:14px;background:#fbe7e2;color:#a43b2e}

    .mainWrap{width:min(1180px,100%);margin:auto;padding:16px}
    .nav{display:flex;gap:7px;padding:7px;background:#fffaf3;border:1px solid #eadbca;border-radius:18px;margin-bottom:15px;position:sticky;top:78px;z-index:30;overflow:auto}
    .nav button{flex:1;min-width:90px;border:0;border-radius:12px;padding:11px;background:transparent;color:#8a6b58;font-weight:800}
    .nav button.active{background:#70462f;color:white}
    .page{background:#fffaf3;border:1px solid #eadbca;border-radius:22px;min-height:calc(100vh - 160px);overflow:hidden;box-shadow:0 15px 45px #70462f0d}
    .pageHead{padding:18px;border-bottom:1px solid #f0e4d6;display:flex;justify-content:space-between;align-items:center;gap:12px}
    .pageTitle{font-size:21px;font-weight:900;color:#4b2e20}
    .subtle{font-size:13px;color:#9a7a65}
    .searchBox{display:flex;gap:8px;padding:14px 18px;border-bottom:1px solid #f0e4d6}
    .input,textarea{width:100%;border:1px solid #dfcfbd;background:#fffdf9;color:#3c2a20;border-radius:13px;padding:11px 13px;outline:0}
    .input:focus,textarea:focus{border-color:#a47b5d;background:#fff}
    textarea{resize:vertical;min-height:80px}
    .primary{border:0;background:#70462f;color:white;padding:10px 14px;border-radius:12px;font-weight:800}
    .secondary{border:1px solid #dfcfbd;background:#fffdf9;color:#684733;padding:9px 13px;border-radius:12px;font-weight:800}
    .danger{border:0;background:#fbe7e2;color:#a43b2e;padding:9px 13px;border-radius:12px;font-weight:800}
    .linkBtn{border:0;background:none;color:#70462f;font-weight:800;padding:0}
    .empty{text-align:center;padding:48px 20px;color:#aa8d79}
    .avatar{width:46px;height:46px;flex:0 0 46px;border-radius:50%;overflow:hidden;background:#ead8c5;color:#70462f;display:grid;place-items:center;font-weight:900}
    .avatar.small{width:38px;height:38px;flex-basis:38px;font-size:13px}
    .avatar img{width:100%;height:100%;object-fit:cover}
    .avatarWrap{position:relative;flex:0 0 auto}
    .onlineDot{position:absolute;right:1px;bottom:2px;width:12px;height:12px;border-radius:50%;border:2px solid #fffaf3;background:#555}
    .onlineDot.on{background:#39a96b}.onlineDot.off{background:#575757}
    .chatList{display:flex;flex-direction:column}
    .chatRow{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #f1e7dc;user-select:none}
    .chatRow:hover{background:#fff4e8}
    .chatRowMain{flex:1;min-width:0}.chatRowTop{display:flex;justify-content:space-between;gap:8px}
    .chatName{font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#4b2e20}
    .chatPreview{color:#9b7c68;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px}
    .chatTime{font-size:11px;color:#aa8d79;white-space:nowrap}
    .pinBadge{margin-left:6px;font-size:12px}
    .contextMenu{position:fixed;z-index:200;background:#fffaf3;border:1px solid #e5d5c3;border-radius:14px;box-shadow:0 18px 50px #3b251c30;min-width:205px;overflow:hidden}
    .contextMenu button{width:100%;border:0;background:#fffaf3;padding:13px 15px;text-align:left;font-weight:800;color:#5b3b2a}
    .contextMenu button:hover{background:#fff0df}.contextMenu .dangerItem{color:#ad3c2e}
    .chatPage{display:flex;flex-direction:column;height:calc(100vh - 180px);min-height:560px}
    .chatHeader{display:flex;align-items:center;gap:10px;padding:12px 15px;border-bottom:1px solid #eadbca;background:#fffaf3}
    .chatHeaderInfo{flex:1;min-width:0}.chatHeaderName{font-weight:900}.chatHeaderStatus{font-size:12px;color:#39a96b}.offlineText{color:#8f7768}
    .messages{flex:1;overflow-y:auto;padding:18px;background:#f5ede3;background-image:radial-gradient(#c9a98d33 1px,transparent 1px);background-size:24px 24px}
    .messageLine{display:flex;margin:7px 0}.messageLine.mine{justify-content:flex-end}
    .bubble{max-width:min(78%,620px);padding:9px 11px;border-radius:16px;background:#fffaf3;border:1px solid #e8d9c8;box-shadow:0 2px 8px #5c3a2910}
    .mine .bubble{background:#ead9c4;border-color:#dcc4aa}
    .replyBox{border-left:3px solid #8a5b3e;background:#ffffff75;padding:6px 8px;border-radius:7px;margin-bottom:6px;font-size:12px;color:#72533f}
    .bubbleText{white-space:pre-wrap;word-break:break-word}.bubbleMeta{display:flex;justify-content:flex-end;gap:5px;margin-top:4px;font-size:10px;color:#987b68}
    .tick.seen{filter:blur(.6px);opacity:.72}.tick.delivered{font-weight:900}
    .composer{padding:10px;border-top:1px solid #eadbca;background:#fffaf3;display:flex;gap:7px;align-items:flex-end}
    .composer textarea{min-height:44px;max-height:120px;resize:none}.sendBtn{width:46px;height:44px;border:0;border-radius:13px;background:#70462f;color:#fff}
    .replyComposer{padding:7px 10px;background:#f2e4d5;border-top:1px solid #eadbca;font-size:12px;display:flex;justify-content:space-between}
    .storiesStrip{display:flex;gap:13px;overflow:auto;padding:17px;border-bottom:1px solid #f0e4d6}
    .storyItem{min-width:70px;text-align:center;font-size:11px;color:#765642}.storyCircle{width:62px;height:62px;border-radius:50%;padding:3px;background:#70462f;margin:auto;position:relative}
    .storyCircle>div{width:100%;height:100%;border-radius:50%;overflow:hidden;background:#ead8c5;display:grid;place-items:center;font-weight:900;color:#70462f}
    .storyCircle img{width:100%;height:100%;object-fit:cover}
    .storyAdd{position:absolute;right:-1px;bottom:-1px;width:21px;height:21px;border-radius:50%;background:#70462f;color:white;border:2px solid #fffaf3;display:grid;place-items:center}
    .storyGrid{padding:18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:13px}
    .storyCard{border:1px solid #eadbca;border-radius:16px;overflow:hidden;background:#fff}
    .storyMedia{height:220px;background:#ead8c5;position:relative;display:grid;place-items:center;overflow:hidden}
    .storyMedia img,.storyMedia video{width:100%;height:100%;object-fit:cover}
    .storyOverlayText{position:absolute;left:12px;top:12px;color:white;font-size:22px;font-weight:900;text-shadow:0 2px 8px #000}
    .storyInfo{padding:10px}.storyActions{display:flex;gap:6px;margin-top:7px}
    .peopleGrid{display:flex;flex-direction:column}.personRow{display:flex;align-items:center;gap:12px;padding:13px 17px;border-bottom:1px solid #f0e4d6}
    .personMain{flex:1;min-width:0}.personName{font-weight:900}.personMeta{font-size:12px;color:#9a7a65;margin-top:3px}
    .poke{border:1px solid #d9c4af;background:#fff3e4;color:#70462f;border-radius:11px;padding:8px 11px;font-weight:900}
    .profileCard{padding:20px}.cover{height:170px;border-radius:18px;background:linear-gradient(135deg,#b98d6d,#6e452f);overflow:hidden;position:relative}.cover img{width:100%;height:100%;object-fit:cover}
    .profileBody{margin-top:-42px;padding:0 18px;position:relative}.profileAvatar{border:5px solid #fffaf3;border-radius:50%;width:88px;height:88px}.profileAvatar .avatar{width:100%;height:100%}
    .profileFields{display:grid;gap:10px;margin-top:16px}.fieldLabel{font-size:12px;color:#92715d;font-weight:800}
    .settingsList{display:grid}.settingRow{padding:15px 18px;border-bottom:1px solid #f0e4d6;display:flex;justify-content:space-between;gap:12px;align-items:center}
    .modalBack{position:fixed;inset:0;background:#2e211b66;display:grid;place-items:center;z-index:300;padding:15px}
    .modal{width:min(620px,100%);max-height:92vh;overflow:auto;background:#fffaf3;border:1px solid #eadbca;border-radius:20px;box-shadow:0 30px 80px #0004;padding:20px}
    .modalHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.modalTitle{font-size:20px;font-weight:900}
    .formGrid{display:grid;gap:11px}.twoCol{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .check{display:flex;gap:8px;align-items:center;font-size:13px;color:#6f5544}
    .authPage{min-height:100vh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at top left,#e7d5c3,transparent 42%),#f6f0e7}
    .authCard{width:min(440px,100%);background:#fffaf3;border:1px solid #eadbca;border-radius:25px;padding:30px;box-shadow:0 25px 70px #70462f18}
    .authLogo{text-align:center;margin-bottom:22px}.authLogo .brandMark{margin:auto;width:58px;height:58px;font-size:23px}.authLogo h1{margin:12px 0 4px;color:#4b2e20}.authForm{display:grid;gap:11px}.authError{background:#fbe7e2;color:#a43b2e;padding:10px;border-radius:10px;font-size:13px}
    .callBox{padding:25px;text-align:center}.callAvatar{width:110px;height:110px;margin:20px auto}.callButtons{display:flex;justify-content:center;gap:10px;margin-top:20px}
    .notice{padding:12px 15px;background:#f7eadc;border-bottom:1px solid #eadbca;color:#6f5140;font-size:13px}
    .emojiBar{display:flex;gap:5px;flex-wrap:wrap}.emojiBar button{border:1px solid #eadbca;background:#fff;border-radius:9px;padding:6px}
    @media(max-width:700px){
      .mainWrap{padding:8px}.topbar{padding:0 10px}.brand{font-size:19px}.nav{top:70px}.page{border-radius:17px}.chatPage{height:calc(100vh - 140px);min-height:500px}.bubble{max-width:88%}.twoCol{grid-template-columns:1fr}.pageHead{padding:14px}.topActions .iconBtn{width:36px;height:36px}
    }
  `}</style>;
}

/* =========================================================
   AUTH
========================================================= */

function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async e => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
        alert("Password reset email sent.");
        setMode("login");
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
        const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await ensureUser(cred.user, { displayName: name.trim(), phoneNumber: phoneOnly(phone) });
      } else {
        await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      }
    } catch (e2) {
      setErr(e2?.message || "Could not continue.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(""); setBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureUser(cred.user);
    } catch (e) { setErr(e?.message || "Google sign-in failed."); }
    finally { setBusy(false); }
  };

  const startPhone = async () => {
    setErr(""); setBusy(true);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      }
      const result = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirm(result);
      alert("OTP sent to your mobile.");
    } catch (e) { setErr(e?.message || "OTP could not be sent."); }
    finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    setErr(""); setBusy(true);
    try {
      const cred = await confirm.confirm(otp);
      await ensureUser(cred.user);
      setConfirm(null);
    } catch (e) { setErr(e?.message || "Invalid OTP."); }
    finally { setBusy(false); }
  };

  return (
    <div className="authPage">
      <Styles />
      <div className="authCard">
        <div className="authLogo">
          <div className="brandMark">C</div>
          <h1>Chatdo</h1>
          <div className="subtle">Simple. Private. Connected.</div>
        </div>

        <div className="authForm">
          {err && <div className="authError">{err}</div>}

          {mode === "forgot" ? (
            <>
              <input className="input" placeholder="Email ID" value={email} onChange={e => setEmail(e.target.value)} />
              <button className="primary" onClick={submit} disabled={busy}>Send reset email</button>
              <button className="linkBtn" onClick={() => setMode("login")}>Back to login</button>
            </>
          ) : (
            <>
              {mode === "signup" && <input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />}
              <input className="input" placeholder="Email ID" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="input" placeholder="Strong password (8+ characters)" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              <button className="primary" onClick={submit} disabled={busy}>{mode === "signup" ? "Create account" : "Login"}</button>
              <div style={{textAlign:"center",color:"#9a7a65",fontSize:12,marginTop:2}}>OR continue with mobile OTP</div>
              <input className="input" placeholder="+91XXXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
              {!confirm ? (
                <button className="secondary" onClick={startPhone} disabled={busy}>Send mobile OTP</button>
              ) : (
                <>
                  <input className="input" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} />
                  <button className="primary" onClick={verifyOtp} disabled={busy}>Verify OTP</button>
                </>
              )}

              <div id="recaptcha-container" />
              <div style={{textAlign:"center",marginTop:6}}>
                <button className="linkBtn" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                  {mode === "login" ? "Create a new account" : "Already have an account? Login"}
                </button>
              </div>
              {mode === "login" && <div style={{textAlign:"center",marginTop:8}}><button className="linkBtn" onClick={() => setMode("forgot")}>Forgot password?</button></div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SEARCH / PEOPLE
========================================================= */

function People({ me, allUsers, openChat, openProfile }) {
  const [term, setTerm] = useState("");
  const [history, setHistory] = useState(me?.searchHistory || []);
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => setHistory(me?.searchHistory || []), [me?.searchHistory]);

  const saveHistory = async value => {
    if (!value) return;
    const clean = String(value).trim();
    const next = [clean, ...history.filter(x => normalize(x) !== normalize(clean))].slice(0, 20);
    setHistory(next);
    try { await saveUserFields(me.uid, { searchHistory: next }); } catch {}
  };

  const removeHistory = async value => {
    const next = history.filter(x => x !== value);
    setHistory(next);
    try { await saveUserFields(me.uid, { searchHistory: next }); } catch {}
  };

  const clearHistory = async () => {
    setHistory([]);
    setMenu(false);
    try { await saveUserFields(me.uid, { searchHistory: [] }); } catch {}
  };

  const matches = useMemo(() => {
    const q = normalize(term);
    if (!q) return [];
    const qp = phoneOnly(q);
    return allUsers.filter(u =>
      normalize(u.username).includes(q) ||
      normalize(u.displayName).includes(q) ||
      normalize(u.email).includes(q) ||
      (qp && phoneOnly(u.phoneNumber).includes(qp))
    ).slice(0, 30);
  }, [term, allUsers]);

  return (
    <div className="page">
      <div className="pageHead">
        <div><div className="pageTitle">People</div><div className="subtle">Search by username, email or mobile</div></div>
        <button className="secondary" onClick={clearHistory} disabled={!history.length}>Clear history</button>
      </div>

      <div className="searchBox">
        <input className="input" placeholder="Username / email / mobile" value={term}
          onChange={e => setTerm(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && term.trim()) saveHistory(term.trim()); }} />
        <button className="primary" onClick={() => term.trim() && saveHistory(term.trim())}>Search</button>
      </div>

      {!term.trim() && history.length > 0 && (
        <div>
          <div className="subtle" style={{padding:"12px 18px 6px"}}>Search history</div>
          {history.map((x,i) => (
            <div className="chatRow" key={`${x}-${i}`}>
              <button className="linkBtn" style={{flex:1,textAlign:"left"}} onClick={() => setTerm(x)}>🔎 {x}</button>
              <button className="secondary" title="Delete this search" onClick={() => removeHistory(x)}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {term.trim() && (
        <div className="peopleGrid">
          {loading ? <div className="empty">Searching...</div> : matches.length === 0 ? <div className="empty">No joined user found.</div> :
            matches.map(u => (
              <div className="personRow" key={u.uid}>
                <AvatarWithOnline user={u} />
                <div className="personMain" onClick={() => openProfile(u)}>
                  <div className="personName">{nameOf(u)} {u.username ? `@${u.username}` : ""}</div>
                  <div className="personMeta">{u.email || u.phoneNumber || "Chatdo user"}</div>
                </div>
                <button className="poke" onClick={async () => {
                  await addDoc(collection(db,"pokes"), { from:me.uid,to:u.uid,status:"pending",createdAt:serverTimestamp() });
                  alert("Poke sent.");
                }}>👋 Poke</button>
                <button className="primary" onClick={() => openChat(u)}>Chat</button>
              </div>
            ))
          }
        </div>
      )}

      {!term.trim() && history.length === 0 && <div className="empty">Search people to start a conversation.</div>}
    </div>
  );
}

/* =========================================================
   CHAT LIST
========================================================= */

function Chats({ me, allUsers, openChat }) {
  const [chats, setChats] = useState([]);
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    const q = query(collection(db,"chats"), where("members","array-contains",me.uid));
    return onSnapshot(q, snap => setChats(snap.docs.map(d => ({id:d.id,...d.data()}))));
  }, [me.uid]);

  const visible = chats.filter(c => !(c.hiddenBy || []).includes(me.uid) && !(c.deletedBy || []).includes(me.uid))
    .sort((a,b) => {
      const pa = (a.pinnedBy || []).includes(me.uid) ? 1 : 0;
      const pb = (b.pinnedBy || []).includes(me.uid) ? 1 : 0;
      return pb-pa || ts(b.updatedAt)-ts(a.updatedAt);
    });

  const userMap = Object.fromEntries(allUsers.map(x => [x.uid,x]));

  const doAction = async (c, action) => {
    const ref = doc(db,"chats",c.id);
    if (action === "pin") {
      const pinned = c.pinnedBy || [];
      if (!pinned.includes(me.uid)) {
        const count = chats.filter(x => (x.pinnedBy||[]).includes(me.uid)).length;
        if (count >= 10) return alert("You can pin up to 10 chats.");
        await updateDoc(ref,{pinnedBy:arrayUnion(me.uid)});
      } else await updateDoc(ref,{pinnedBy:arrayRemove(me.uid)});
    }
    if (action === "hide") await updateDoc(ref,{hiddenBy:arrayUnion(me.uid)});
    if (action === "delete") await updateDoc(ref,{deletedBy:arrayUnion(me.uid)});
    setMenu(null);
  };

  return (
    <div className="page">
      <div className="pageHead"><div><div className="pageTitle">Chats</div><div className="subtle">Your conversations</div></div></div>
      <div className="chatList">
        {visible.length === 0 ? <div className="empty">No chats yet. Search People and start one.</div> :
          visible.map(c => {
            const other = userMap[c.members.find(x=>x!==me.uid)] || {uid:c.members.find(x=>x!==me.uid)};
            return (
              <div className="chatRow" key={c.id}
                onClick={() => openChat(other)}
                onContextMenu={e => {e.preventDefault();setMenu({c,x:e.clientX,y:e.clientY})}}>
                <AvatarWithOnline user={other}/>
                <div className="chatRowMain">
                  <div className="chatRowTop"><div className="chatName">{nameOf(other)} {(c.pinnedBy||[]).includes(me.uid) && <span className="pinBadge">📌</span>}</div><div className="chatTime">{timeText(c.updatedAt)}</div></div>
                  <div className="chatPreview">{c.lastMessage || ""}</div>
                </div>
              </div>
            );
          })}
      </div>
      {menu && <div className="contextMenu" style={{left:menu.x,top:menu.y}}>
        <button onClick={()=>doAction(menu.c,"pin")}>{(menu.c.pinnedBy||[]).includes(me.uid)?"Unpin chat":"Pin chat"}</button>
        <button onClick={()=>doAction(menu.c,"hide")}>Hide chat</button>
        <button className="dangerItem" onClick={()=>doAction(menu.c,"delete")}>Delete chat</button>
      </div>}
    </div>
  );
}

/* =========================================================
   CHAT
========================================================= */

function Chat({ me, other, onBack }) {
  const id = chatId(me.uid, other.uid);
  const [messages,setMessages] = useState([]);
  const [text,setText] = useState("");
  const [reply,setReply] = useState(null);
  const [editing,setEditing] = useState(null);
  const [menu,setMenu] = useState(null);
  const [recording,setRecording] = useState(false);
  const [chatError,setChatError] = useState("");
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const bottom = useRef(null);

  useEffect(() => {
    let active = true;
    setChatError("");
    setDoc(doc(db,"chats",id),{members:[me.uid,other.uid].sort(),updatedAt:serverTimestamp()},{merge:true}).catch(()=>{});
    const messagesRef = collection(db,"chats",id,"messages");
    const unsub = onSnapshot(messagesRef, snap => {
      if(!active) return;
      const list=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>ts(a.createdAt)-ts(b.createdAt));
      setMessages(list);
      list.filter(m=>m.senderId!==me.uid).forEach(m=>updateDoc(doc(db,"chats",id,"messages",m.id),{deliveredTo:arrayUnion(me.uid),seenBy:arrayUnion(me.uid)}).catch(()=>{}));
    }, error => {
      if(active) setChatError(error?.message || "Could not load this chat.");
    });
    return ()=>{active=false;unsub();};
  },[id,me.uid,other.uid]);

  useEffect(()=>bottom.current?.scrollIntoView({behavior:"smooth"}),[messages.length]);

  const send = async () => {
    const value=text.trim();
    if(!value)return;
    if(value.length>240) return alert("A message can contain up to 240 characters before friendship.");
    try{
      const friendship = await getDoc(doc(db,"friendships", [me.uid,other.uid].sort().join("_")));
      const friends = friendship.exists();
      const sentCount = messages.filter(m=>m.senderId===me.uid && ts(m.createdAt)>Date.now()-24*60*60*1000).length;
      if(!friends && sentCount>=5 && !editing) return alert("Before becoming friends, you can send only 5 introductory messages.");
      if(editing){
        await updateDoc(doc(db,"chats",id,"messages",editing.id),{text:value,edited:true});
        setEditing(null);
      }else{
        const data={senderId:me.uid,receiverId:other.uid,text:value,type:"text",createdAt:serverTimestamp(),deliveredTo:[me.uid],seenBy:[me.uid]};
        if(reply) data.replyTo={id:reply.id,text:reply.text||"Message"};
        await addDoc(collection(db,"chats",id,"messages"),data);
      }
      await setDoc(doc(db,"chats",id),{members:[me.uid,other.uid].sort(),lastMessage:value,updatedAt:serverTimestamp(),lastSenderId:me.uid},{merge:true});
      setText("");setReply(null);
    }catch(e){alert(e?.message||"Could not send message.");}
  };

  const react = async (m,e) => { try { const current=m.reactions?.[e]||[]; await updateDoc(doc(db,"chats",id,"messages",m.id),{[`reactions.${e}`]:current.includes(me.uid)?current.filter(x=>x!==me.uid):[...current,me.uid]}); } catch(e2){alert(e2?.message||"Could not react.");} };
  const editMessage = m => { if(m.senderId!==me.uid)return; setEditing(m); setText(m.text||""); setReply(null); setMenu(null); };
  const delForMe = async m => { try{await updateDoc(doc(db,"chats",id,"messages",m.id),{deletedFor:arrayUnion(me.uid)});}catch(e){alert(e?.message||"Could not delete message.");} setMenu(null); };
  const delEveryone = async m => { try{await updateDoc(doc(db,"chats",id,"messages",m.id),{text:"This message was deleted",deletedForEveryone:true});}catch(e){alert(e?.message||"Could not delete message.");} setMenu(null); };

  const sendMedia = async file => {
    if(!file)return;
    try{
      const url=await uploadFile(me.uid,file,"chat-media");
      const type=file.type.startsWith("video")?"video":"image";
      await addDoc(collection(db,"chats",id,"messages"),{senderId:me.uid,receiverId:other.uid,type,url,createdAt:serverTimestamp(),deliveredTo:[me.uid],seenBy:[me.uid]});
      await setDoc(doc(db,"chats",id),{members:[me.uid,other.uid].sort(),lastMessage:type==="image"?"📷 Photo":"🎥 Video",updatedAt:serverTimestamp(),lastSenderId:me.uid},{merge:true});
    }catch(e){}
  };

  const startRecording = async()=>{
    if(recording){mediaRecorder.current?.stop();return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const r=new MediaRecorder(stream);audioChunks.current=[];
      r.ondataavailable=e=>e.data.size&&audioChunks.current.push(e.data);
      r.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());try{const b=new Blob(audioChunks.current,{type:"audio/webm"});const u=await uploadFile(me.uid,new File([b],"voice.webm",{type:"audio/webm"}),"chat-media");await addDoc(collection(db,"chats",id,"messages"),{senderId:me.uid,receiverId:other.uid,type:"audio",audioURL:u,createdAt:serverTimestamp(),deliveredTo:[me.uid],seenBy:[me.uid]});await setDoc(doc(db,"chats",id),{members:[me.uid,other.uid].sort(),lastMessage:"🎤 Voice message",updatedAt:serverTimestamp(),lastSenderId:me.uid},{merge:true});}catch(e){}setRecording(false);};
      mediaRecorder.current=r;r.start();setRecording(true);
    }catch{alert("Microphone permission is required.");}
  };

  return <div className="page chatPage" onClick={()=>menu&&setMenu(null)}>
    <div className="chatHeader"><button className="backTop" onClick={onBack}>←</button><AvatarWithOnline user={other}/><div className="chatHeaderInfo"><div className="chatHeaderName">{nameOf(other)}</div><div className={`chatHeaderStatus ${other.online?"":"offlineText"}`}>{other.online?"Online":`Last seen ${dateText(other.lastSeen)}`}</div></div><button className="iconBtn" onClick={()=>alert("Start audio call from Calls tab.")}>☎</button><button className="iconBtn" onClick={()=>alert("Start video call from Calls tab.")}>▣</button></div>
    {chatError?<div className="chatError">{chatError}<br/><button className="secondary" style={{marginTop:8}} onClick={()=>location.reload()}>Reload chat</button></div>:<div className="messages">{messages.filter(m=>!(m.deletedFor||[]).includes(me.uid)).map(m=>{const mine=m.senderId===me.uid;return <div className={`messageLine ${mine?"mine":""}`} key={m.id}><div className="bubble" onContextMenu={e=>{e.preventDefault();setMenu({m,x:e.clientX,y:e.clientY})}}>{m.replyTo&&<div className="replyBox">↪ {m.replyTo.text}</div>}{m.type==="image"&&<img src={m.url} alt="" style={{maxWidth:"100%",borderRadius:12}}/>}{m.type==="video"&&<video src={m.url} controls style={{maxWidth:"100%",borderRadius:12}}/>}{m.type==="audio"&&<audio src={m.audioURL} controls/>}{m.type==="text"&&<div className="bubbleText">{m.text}</div>}{m.reactions&&<div style={{marginTop:5}}>{Object.entries(m.reactions).filter(([,v])=>v?.length).map(([e,v])=><span key={e} style={{marginRight:4}}>{e} {v.length}</span>)}</div>}<div className="bubbleMeta">{m.edited?"edited ":""}{timeText(m.createdAt)} {mine&&<span className={`tick ${statusFor(m,me.uid)}`}>{statusFor(m,me.uid)==="sent"?"✓":"✓✓"}</span>}</div></div></div>})}<div ref={bottom}/></div>}
    {reply&&<div className="replyComposer">↩ Replying to: {reply.text||"Message"}<button className="linkBtn" onClick={()=>setReply(null)}>×</button></div>}
    {editing&&<div className="replyComposer">Editing message <button className="linkBtn" onClick={()=>{setEditing(null);setText("")}}>Cancel</button></div>}
    <div className="composer"><label className="iconBtn" title="Attach photo or video">＋<input hidden type="file" accept="image/*,video/*" onChange={e=>sendMedia(e.target.files?.[0])}/></label><button className={`iconBtn ${recording?"danger":""}`} onClick={startRecording}>{recording?"■":"🎤"}</button><textarea maxLength={240} value={text} onChange={e=>setText(e.target.value)} placeholder="Message..." onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}}/><button className="sendBtn" onClick={send}>➤</button></div>
    {menu&&<div className="contextMenu" style={{left:Math.min(menu.x,window.innerWidth-220),top:Math.min(menu.y,window.innerHeight-330)}} onClick={e=>e.stopPropagation()}><button onClick={()=>{setReply(menu.m);setMenu(null)}}>↩ Reply</button><div className="emojiBar" style={{padding:8}}>{["❤️","👍","😂","😮","😢","🔥"].map(e=><button key={e} onClick={()=>{react(menu.m,e);setMenu(null)}}>{e}</button>)}</div>{menu.m.senderId===me.uid&&<button onClick={()=>editMessage(menu.m)}>✏ Edit</button>}<button onClick={()=>delForMe(menu.m)}>Delete for me</button>{menu.m.senderId===me.uid&&<button className="dangerItem" onClick={()=>delEveryone(menu.m)}>Delete for everyone</button>}</div>}
  </div>;
}

/* =========================================================
   STORIES
========================================================= */

function Stories({ me, allUsers, openProfile }) {
  const [stories,setStories]=useState([]),[viewer,setViewer]=useState(null),[editor,setEditor]=useState(false),[file,setFile]=useState(null),[fileUrl,setFileUrl]=useState(""),[text,setText]=useState(""),[textColor,setTextColor]=useState("#ffffff"),[backgroundColor,setBackgroundColor]=useState("#70462f"),[textSize,setTextSize]=useState(28),[stickers,setStickers]=useState([]),[sticker,setSticker]=useState("😊"),[stickerSize,setStickerSize]=useState(55),[busy,setBusy]=useState(false);
  useEffect(()=>{const q=query(collection(db,"stories"));return onSnapshot(q,snap=>{const cutoff=Date.now()-86400000;setStories(snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>ts(s.createdAt)>=cutoff&&(!s.expiresAt||ts(s.expiresAt)>Date.now())).sort((a,b)=>ts(b.createdAt)-ts(a.createdAt)));},()=>{});},[]);
  useEffect(()=>{if(!file){setFileUrl("");return}const u=URL.createObjectURL(file);setFileUrl(u);return()=>URL.revokeObjectURL(u)},[file]);
  const mine=stories.filter(s=>s.uid===me.uid),others=stories.filter(s=>s.uid!==me.uid),userMap=Object.fromEntries(allUsers.map(x=>[x.uid,x])),ordered=[...others].sort((a,b)=>ts(b.createdAt)-ts(a.createdAt));
  const addSticker=()=>setStickers(v=>[...v,{id:(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())),emoji:sticker,size:stickerSize,x:50,y:72}]);
  const removeSticker=id=>setStickers(v=>v.filter(x=>x.id!==id));
  const post=async()=>{
    if(!file&&!text.trim())return alert("Add text or choose an image, video or audio file.");
    if(file?.type.startsWith("video")){
      const ok=await new Promise(resolve=>{const v=document.createElement("video");v.preload="metadata";v.onloadedmetadata=()=>{resolve(v.duration>=30);URL.revokeObjectURL(v.src)};v.onerror=()=>resolve(false);v.src=URL.createObjectURL(file)});
      if(!ok)return alert("Story video must be at least 30 seconds.");
    }
    setBusy(true);
    try{
      let url="",type="text";
      if(file){url=await uploadFile(me.uid,file,"stories");type=file.type.startsWith("video")?"video":file.type.startsWith("audio")?"audio":"image";}
      await addDoc(collection(db,"stories"),{uid:me.uid,url,type,text:text.trim(),textColor,backgroundColor,textSize,stickerItems:stickers,createdAt:serverTimestamp(),expiresAt:new Date(Date.now()+86400000)});
      setEditor(false);setFile(null);setText("");setStickers([]);setBackgroundColor("#70462f");setTextColor("#ffffff");
    }catch(e){}finally{setBusy(false)}
  };
  const visual=(s,h="220px")=>s.type==="text"?<div className="storyTextOnly" style={{color:s.textColor||"#fff",fontSize:s.textSize||28,background:s.backgroundColor||"#70462f"}}>{s.text||""}</div>:s.type==="audio"?<div className="storyAudio"><div style={{fontWeight:900,marginBottom:12}}>🎵 Audio story</div><audio src={s.url} controls style={{width:"100%"}}/></div>:<div className="storyMedia" style={{height:h}}>{s.type==="video"?<video src={s.url} controls autoPlay={h!=="220px"}/>:<img src={s.url} alt=""/>}{s.text&&<div className="storyOverlayText" style={{color:s.textColor,fontSize:s.textSize}}>{s.text}</div>}{(s.stickerItems||[]).map(x=><div key={x.id} style={{position:"absolute",left:`${x.x||50}%`,top:`${x.y||72}%`,fontSize:x.size||55,transform:"translate(-50%,-50%)"}}>{x.emoji}</div>)}</div>;
  const preview=file?{type:file.type.startsWith("video")?"video":file.type.startsWith("audio")?"audio":"image",url:fileUrl,text,textColor,backgroundColor,textSize,stickerItems:stickers}:!text.trim()?null:{type:"text",text,textColor,backgroundColor,textSize,stickerItems:stickers};
  return <div className="page"><div className="pageHead"><div><div className="pageTitle">Stories</div><div className="subtle">24-hour stories • text, image, video or audio</div></div><button className="primary" onClick={()=>setEditor(true)}>＋ My Story</button></div>
    <div className="storiesStrip"><div className="storyItem" onClick={()=>mine[0]&&setViewer(mine[0])}><div className="storyCircle">{mine[0]?.url?<img src={mine[0].url} alt=""/>:avatar(me)}<span className="storyAdd">＋</span></div><div>My Story</div></div>{ordered.map(s=>{const u=userMap[s.uid]||{uid:s.uid};return <div className="storyItem" key={s.id} onClick={()=>setViewer(s)}><div className="storyCircle">{s.url?<img src={s.url} alt=""/>:avatar(u)}</div><div>{nameOf(u)}</div></div>})}</div>
    <div className="storyGrid">{[...mine,...ordered].map(s=>{const u=s.uid===me.uid?me:(userMap[s.uid]||{uid:s.uid});return <div className="storyCard" key={s.id}><div onClick={()=>setViewer(s)}>{visual(s)}</div><div className="storyInfo"><b>{nameOf(u)}</b><div className="subtle">{dateText(s.createdAt)}</div><div className="storyActions"><button className="secondary" onClick={()=>openProfile(u)}>Profile</button>{s.uid===me.uid&&<button className="danger" onClick={()=>deleteDoc(doc(db,"stories",s.id))}>Delete</button>}</div></div></div>})}</div>
    {editor&&<div className="modalBack"><div className="modal"><div className="modalHead"><div className="modalTitle">Create story</div><button className="iconBtn" onClick={()=>{setEditor(false);setFile(null);setStickers([]);setBackgroundColor("#70462f");setTextColor("#ffffff")}}>×</button></div><div className="formGrid"><div className="subtle">Choose one media type, or post text only.</div><div className="mediaChoice"><label title="Gallery image">🖼️<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label title="Video">🎞️<input type="file" accept="video/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label title="Audio">🎵<input type="file" accept="audio/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>{file&&<button className="secondary" onClick={()=>setFile(null)}>Clear</button>}</div>{preview&&visual(preview,"220px")}<textarea placeholder="Write story text (optional)" value={text} onChange={e=>setText(e.target.value)}/><div className="twoCol"><div className="storyBgPicker"><span className="fieldLabel">Text colour</span><label className="colorWheel" title="Choose text colour"><input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></label></div><div className="storyBgPicker"><span className="fieldLabel">Background colour</span><label className="colorWheel" title="Choose story background"><input type="color" value={backgroundColor} onChange={e=>setBackgroundColor(e.target.value)}/></label></div></div><label className="fieldLabel">Text size<input type="range" min="16" max="72" value={textSize} onChange={e=>setTextSize(Number(e.target.value))}/></label><div className="emojiBar">{["😊","😂","❤️","🔥","😍","😎","👍","🎉","⭐"].map(e=><button className={sticker===e?"stickerChoice active":"stickerChoice"} key={e} onClick={()=>setSticker(e)}>{e}</button>)}<button className="primary" onClick={addSticker}>＋ Add sticker</button></div>{stickers.length>0&&<div className="emojiBar">{stickers.map(x=><button key={x.id} className="secondary" onClick={()=>removeSticker(x.id)}>{x.emoji} ×</button>)}</div>}<label className="fieldLabel">Sticker size<input type="range" min="25" max="110" value={stickerSize} onChange={e=>setStickerSize(Number(e.target.value))}/></label><div className="notice">Image, video and audio stories need Firebase Storage. Text-only stories work without media storage.</div><button className="primary" onClick={post} disabled={busy}>{busy?"Posting...":"Post story"}</button></div></div></div>}
    {viewer&&<div className="modalBack" onClick={()=>setViewer(null)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modalHead"><div className="modalTitle">Story</div><button className="iconBtn" onClick={()=>setViewer(null)}>×</button></div>{visual(viewer,"65vh")}</div></div>}
  </div>;
}

/* =========================================================
   CALLS
========================================================= */

function Calls({ me, allUsers, openProfile }) {
  const [history,setHistory]=useState([]);
  const [target,setTarget]=useState("");
  const [type,setType]=useState("audio");
  useEffect(()=>{
    const q=query(collection(db,"calls"),where("members","array-contains",me.uid),orderBy("createdAt","desc"),limit(50));
    return onSnapshot(q,s=>setHistory(s.docs.map(d=>({id:d.id,...d.data()}))));
  },[me.uid]);

  const start=async()=>{
    const u=allUsers.find(x=>x.uid===target);
    if(!u)return alert("Choose a user first.");
    const ref=await addDoc(collection(db,"calls"),{members:[me.uid,u.uid],callerId:me.uid,calleeId:u.uid,type,status:"started",createdAt:serverTimestamp()});
    alert(`${type==="video"?"Video":"Audio"} call room created. Call ID: ${ref.id}`);
  };

  return <div className="page">
    <div className="pageHead"><div><div className="pageTitle">Calls</div><div className="subtle">Audio • Video • call history</div></div></div>
    <div className="profileCard">
      <select className="input" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Select person</option>{allUsers.map(u=><option key={u.uid} value={u.uid}>{nameOf(u)}</option>)}</select>
      <div style={{display:"flex",gap:8,marginTop:10}}><button className="primary" onClick={()=>{setType("audio");start()}}>☎ Audio call</button><button className="secondary" onClick={()=>{setType("video");start()}}>▣ Video call</button></div>
    </div>
    <div className="subtle" style={{padding:"14px 18px 6px"}}>Call history</div>
    {history.length===0?<div className="empty">No calls yet.</div>:history.map(c=><div className="personRow" key={c.id}><div className="personMain"><div className="personName">{c.type==="video"?"▣":"☎"} {c.callerId===me.uid?"Outgoing":"Incoming"}</div><div className="personMeta">{dateText(c.createdAt)} • {c.status||"started"}</div></div><button className="danger" onClick={()=>deleteDoc(doc(db,"calls",c.id))}>Delete</button></div>)}
  </div>;
}

/* =========================================================
   FRIENDS / PROFILE / SETTINGS
========================================================= */

function ProfileModal({ me, user, onClose, openChat }) {
  const [poke,setPoke]=useState(false);
  const [request,setRequest]=useState(false);
  const [blocked,setBlocked]=useState(false);

  const doPoke=async()=>{await addDoc(collection(db,"pokes"),{from:me.uid,to:user.uid,status:"pending",createdAt:serverTimestamp()});setPoke(true);};
  const sendRequest=async()=>{await addDoc(collection(db,"friendRequests"),{from:me.uid,to:user.uid,status:"pending",createdAt:serverTimestamp()});setRequest(true);};
  const block=async()=>{await setDoc(doc(db,"blocks",me.uid),{blockedUids:arrayUnion(user.uid)},{merge:true});setBlocked(true);};

  return <div className="modalBack"><div className="modal">
    <div className="modalHead"><div className="modalTitle">Profile</div><button className="iconBtn" onClick={onClose}>×</button></div>
    <div className="cover">{user.coverURL&&<img src={user.coverURL} alt="cover"/>}</div>
    <div className="profileBody"><div className="profileAvatar">{avatar(user)}</div><h2 style={{margin:"8px 0 2px"}}>{nameOf(user)}</h2><div className="subtle">{user.username?`@${user.username}`:"Username not set"}</div><p>{user.bio||"No bio yet."}</p><div className="subtle">{user.hobbies||""}</div>
      <div className="storyActions" style={{marginTop:15}}>
        <button className="primary" onClick={()=>openChat(user)}>Message</button>
        <button className="poke" onClick={doPoke}>{poke?"Poked ✓":"👋 Poke"}</button>
        <button className="secondary" onClick={sendRequest}>{request?"Request sent ✓":"Add friend"}</button>
        <button className="danger" onClick={block}>{blocked?"Blocked ✓":"Block"}</button>
      </div>
    </div>
  </div></div>;
}

function Settings({ me, refresh }) {
  const [username,setUsername]=useState(me.username||""),[displayName,setDisplayName]=useState(me.displayName||""),[bio,setBio]=useState(me.bio||""),[hobbies,setHobbies]=useState(me.hobbies||""),[phone,setPhone]=useState(me.phoneNumber||""),[photo,setPhoto]=useState(null),[cover,setCover]=useState(null),[busy,setBusy]=useState(false);
  const save=async()=>{setBusy(true);try{let photoURL=me.photoURL||"",coverURL=me.coverURL||"";if(photo)photoURL=await uploadFile(me.uid,photo,"profiles");if(cover)coverURL=await uploadFile(me.uid,cover,"covers");const lower=normalize(username);if(lower&&!/^[a-z0-9._]{3,24}$/.test(lower))throw new Error("Username: 3-24 letters, numbers, dot or underscore.");await saveUserFields(me.uid,{username:lower,displayName,bio,hobbies,phoneNumber:phoneOnly(phone),photoURL,coverURL});await updateProfile(auth.currentUser,{displayName,photoURL});alert("Profile saved.");}catch(e){alert(e?.message||"Could not save profile.");}finally{setBusy(false)}};
  return <div className="page"><div className="pageHead"><div><div className="pageTitle">Profile & Settings</div><div className="subtle">Edit your Chatdo profile</div></div><button className="primary" onClick={save} disabled={busy}>Save</button></div><div className="profileCard"><div className="cover">{me.coverURL&&<img src={me.coverURL} alt="cover"/>}<label className="editIcon coverEdit" title="Edit cover photo">✎<input hidden type="file" accept="image/*" onChange={e=>setCover(e.target.files?.[0]||null)}/></label></div><div className="profileBody"><div className="profileAvatar" style={{position:"relative"}}>{avatar(me)}<label className="editIcon" title="Edit profile photo">✎<input hidden type="file" accept="image/*" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label></div></div><div className="profileFields"><label className="fieldLabel">Name<input className="input" value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><label className="fieldLabel">Username<input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="yourusername"/></label><label className="fieldLabel">Bio<textarea value={bio} onChange={e=>setBio(e.target.value)}/></label><label className="fieldLabel">Hobbies<input className="input" value={hobbies} onChange={e=>setHobbies(e.target.value)}/></label><label className="fieldLabel">Mobile number<input className="input" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="fieldLabel">Email<input className="input" value={me.email||""} disabled/></label></div></div><div className="settingsList"><div className="settingRow"><div><b>Account</b><div className="subtle">Logout and account switching</div></div><button className="secondary" onClick={()=>signOut(auth)}>Logout</button></div><div className="settingRow"><div><b>Privacy & Safety</b><div className="subtle">Blocked users, reports and notifications are stored in Firebase.</div></div><span>🔒</span></div><div className="settingRow"><div><b>Chatdo Legal</b><div className="subtle">Privacy Policy • Terms • Contact • Safety</div></div><span>ℹ️</span></div></div></div>;
}

function Legal() {
  return <div className="modalBack"><div className="modal"><div className="modalHead"><div className="modalTitle">About Chatdo</div></div><h3>Privacy</h3><p className="subtle">Chatdo stores account and messaging data in Firebase according to the rules configured for your project.</p><h3>Safety</h3><p className="subtle">Use Block and Report for unwanted users or messages. Notifications and safety collections can be connected to Firebase Cloud Functions later.</p><h3>Terms</h3><p className="subtle">Use Chatdo responsibly and do not use it for illegal, abusive or harmful activity.</p><h3>Contact</h3><p className="subtle">Add your official Chatdo support email here before publishing the app.</p></div></div>;
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [fbUser,setFbUser]=useState(null),[loading,setLoading]=useState(true),[tab,setTab]=useState("chats"),[chatUser,setChatUser]=useState(null),[profileUser,setProfileUser]=useState(null),[legal,setLegal]=useState(false),touchStart=useRef(null);
  useEffect(()=>onAuthStateChanged(auth,async u=>{setFbUser(u);if(u){try{await ensureUser(u)}catch(e){console.error(e)}}setLoading(false)}),[]);
  useEffect(()=>{if(!fbUser)return;const before=()=>saveUserFields(fbUser.uid,{online:false,lastSeen:serverTimestamp()}).catch(()=>{});window.addEventListener("beforeunload",before);return()=>window.removeEventListener("beforeunload",before)},[fbUser]);
  const me=useUserDoc(fbUser?.uid),allUsers=useAllUsers(fbUser?.uid);
  const goTab=next=>{setChatUser(null);setTab(next);window.history.pushState({chatdo:true,tab:next},"");};
  const openChat=u=>{setChatUser(u);setTab("chats");window.history.pushState({chatdo:true,tab:"chats",chat:u.uid},"");};
  const back=()=>{if(chatUser){setChatUser(null);window.history.back();return;}window.history.back();};
  useEffect(()=>{const onPop=()=>{setChatUser(null);const st=window.history.state;if(st?.chatdo&&(TABS.includes(st.tab)||st.tab==="settings"))setTab(st.tab);else setTab("chats")};window.addEventListener("popstate",onPop);if(!window.history.state?.chatdo)window.history.replaceState({chatdo:true,tab:"chats"},"");return()=>window.removeEventListener("popstate",onPop)},[chatUser]);
  const onTouchStart=e=>{touchStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY};};
  const onTouchEnd=e=>{if(!touchStart.current)return;const dx=e.changedTouches[0].clientX-touchStart.current.x,dy=e.changedTouches[0].clientY-touchStart.current.y;touchStart.current=null;if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy))return;const idx=TABS.indexOf(tab);if(idx<0)return;const next=dx<0?TABS[Math.min(TABS.length-1,idx+1)]:TABS[Math.max(0,idx-1)];if(next!==tab)goTab(next);};
  if(loading)return <><Styles/><div className="authPage"><div className="authCard" style={{textAlign:"center"}}>Loading Chatdo...</div></div></>;
  if(!fbUser)return <Auth/>;
  if(!me)return <><Styles/><div className="authPage"><div className="authCard" style={{textAlign:"center"}}>Preparing your profile...</div></div></>;
  return <div className="app" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}><Styles/><div className="topbar"><div className="brand"><button className="backTop" onClick={back} title="Back">←</button><div className="brandMark">C</div><span onClick={()=>setLegal(true)}>Chatdo</span></div><div className="topActions"><button className="iconBtn" onClick={()=>setProfileUser(me)}>👤</button></div></div><div className="mainWrap"><div className="nav">{TABS.map(t=><button key={t} className={tab===t?"active":""} onClick={()=>goTab(t)}>{t==="chats"?"💬 Chat":t==="stories"?"⭕ Story":t==="calls"?"☎ Call":"👥 People"}</button>)}<button onClick={()=>goTab("settings")}>⚙ Settings</button></div>{chatUser?<Chat me={me} other={allUsers.find(u=>u.uid===chatUser.uid)||chatUser} onBack={()=>{setChatUser(null);window.history.back()}}/>:tab==="chats"?<Chats me={me} allUsers={allUsers} openChat={openChat}/>:tab==="stories"?<Stories me={me} allUsers={allUsers} openProfile={u=>setProfileUser(u)}/>:tab==="calls"?<Calls me={me} allUsers={allUsers} openProfile={u=>setProfileUser(u)}/>:tab==="people"?<People me={me} allUsers={allUsers} openChat={openChat} openProfile={u=>setProfileUser(u)}/>:<Settings me={me}/>}</div>{profileUser&&<ProfileModal me={me} user={profileUser} onClose={()=>setProfileUser(null)} openChat={u=>{setProfileUser(null);openChat(u)}}/>}{legal&&<div onClick={()=>setLegal(false)}><Legal/></div>}</div>;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
