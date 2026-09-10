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
  writeBatch
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

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

function Styles() {
  return <style>{`
    *{box-sizing:border-box}
    html,body,#root{margin:0;width:100%;height:100%;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
    body{background:#efeae2}
    button,input{font-family:inherit}
    button{cursor:pointer}
    .app{height:100vh;display:flex;flex-direction:column;background:#efeae2}
    .top{height:60px;flex:none;background:#075e54;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 14px}
    .brand{font-size:22px;font-weight:800}.brand small{display:block;font-size:11px;font-weight:500;opacity:.8}
    .logout{border:0;background:rgba(255,255,255,.15);color:#fff;border-radius:18px;padding:8px 13px}
    .tabs{height:50px;display:flex;background:#075e54;color:rgba(255,255,255,.7)}
    .tab{flex:1;border:0;background:transparent;color:inherit;font-weight:700;border-bottom:3px solid transparent}
    .tab.active{color:#fff;border-bottom-color:#fff}
    .main{flex:1;min-height:0;overflow:hidden}
    .chat-layout{height:100%;display:grid;grid-template-columns:310px 1fr}
    .sidebar{background:#fff;border-right:1px solid #ddd;overflow:auto}
    .side-title{padding:16px;font-size:20px;font-weight:800;border-bottom:1px solid #eee}
    .person{width:100%;border:0;background:#fff;display:flex;align-items:center;gap:10px;padding:11px 14px;text-align:left;border-bottom:1px solid #f1f1f1}
    .person:hover,.person.sel{background:#e9f7f4}
    .avatar{width:44px;height:44px;border-radius:50%;background:#d9fdd3;color:#075e54;display:flex;align-items:center;justify-content:center;font-weight:800;flex:none}
    .info{min-width:0}.name{font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .online{font-size:11px;color:#25d366}.offline{font-size:11px;color:#777}
    .chat{height:100%;display:flex;flex-direction:column;min-width:0}
    .chat-head{height:60px;flex:none;background:#f0f2f5;border-bottom:1px solid #ddd;display:flex;align-items:center;gap:10px;padding:7px 12px}
    .chat-head-info{min-width:0}.chat-status{font-size:11px;color:#667781}
    .messages{flex:1;min-height:0;overflow:auto;padding:12px 5%;background:#efeae2;background-image:radial-gradient(rgba(0,0,0,.035) 1px,transparent 1px);background-size:18px 18px}
    .row{display:flex;margin:5px 0}.row.mine{justify-content:flex-end}.row.other{justify-content:flex-start}
    .bubble{position:relative;max-width:min(78%,520px);min-width:60px;padding:8px 9px 5px;border-radius:9px;box-shadow:0 1px 1px rgba(0,0,0,.12);word-break:break-word}
    .mine .bubble{background:#d9fdd3;border-top-right-radius:2px}.other .bubble{background:#fff;border-top-left-radius:2px}
    .text{font-size:15px;line-height:1.45;white-space:pre-wrap}.edited{font-size:9px;color:#667781;margin-left:5px;font-style:italic}
    .time-line{display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:5px}
    .time{font-size:9px;color:#667781}.tick{font-size:13px;font-weight:700;color:#667781;display:inline-flex;align-items:center}.tick.seen{color:#2196f3}
    .eye{width:14px;height:9px;display:inline-block;position:relative;border:1.5px solid currentColor;border-radius:80% 20% 80% 20%;transform:rotate(45deg);margin-left:2px}
    .eye:after{content:"";position:absolute;width:3px;height:3px;background:currentColor;border-radius:50%;left:4px;top:2px}
    .image{display:block;width:100%;max-width:300px;max-height:320px;object-fit:cover;border-radius:7px}
    .media{display:block;width:100%;max-width:320px;border-radius:8px;margin-top:4px}
    .heart{border:0;background:transparent;color:#777;font-size:11px;padding:3px 0 0}.heart.liked{color:#e53935}
    .menu{position:absolute;right:4px;top:4px;z-index:5}.menu>button{width:27px;height:27px;border:0;border-radius:50%;background:rgba(255,255,255,.7);font-size:17px;color:#54656f}
    .menu-panel{position:absolute;right:0;top:29px;width:190px;background:#fff;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.2);overflow:hidden;z-index:20}
    .menu-panel button{width:100%;border:0;background:#fff;text-align:left;padding:11px 13px}.menu-panel button:hover{background:#f2f2f2}
    .deleted{color:#667781;font-style:italic}.editbox{display:flex;gap:4px;flex-wrap:wrap}.editbox input{min-width:180px;flex:1;border:1px solid #aaa;border-radius:7px;padding:7px}
    .save{border:0;background:#128c7e;color:#fff;border-radius:7px;padding:7px 10px}.cancel{border:0;background:#777;color:#fff;border-radius:7px;padding:7px 10px}
    .typing{width:max-content;background:#fff;border-radius:8px;padding:7px 11px;color:#667781;font-size:12px}
    .composer-wrap{position:relative;flex:none}.composer{min-height:60px;background:#f0f2f5;border-top:1px solid #ddd;display:flex;align-items:center;gap:3px;padding:6px}
    .icon,.file-label{width:40px;height:40px;border:0;background:transparent;color:#54656f;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}
    .icon:hover,.file-label:hover{background:#e2e6e9}.file-label input{display:none}
    .textbox{flex:1;min-width:0;height:42px;border:0;outline:none;border-radius:21px;padding:0 14px}
    .send{width:42px;height:42px;border:0;border-radius:50%;background:#128c7e;color:#fff;font-size:19px}
    .recording{background:#fff3f3;color:#c62828;padding:8px 12px;font-size:12px;border-top:1px solid #ddd}
    .page{height:100%;overflow:auto;padding:14px;background:#efeae2}.card{background:#fff;border-radius:12px;padding:15px;margin-bottom:14px;box-shadow:0 1px 2px rgba(0,0,0,.08)}
    .input{width:100%;border:1px solid #ddd;border-radius:8px;padding:11px;margin:5px 0;font-size:15px;outline:none}
    .primary{border:0;background:#128c7e;color:#fff;border-radius:8px;padding:10px 15px}
    .stories{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
    .story{background:#fff;border-radius:12px;padding:10px;overflow:hidden}
    .story-card{aspect-ratio:9/16;border-radius:10px;background:#f2f2f2;overflow:hidden;position:relative;display:flex;flex-direction:column}
    .story-card img{width:100%;height:100%;object-fit:cover}.story-overlay{position:absolute;left:0;right:0;bottom:0;padding:12px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.75))}
    .story-text{font-size:14px;white-space:pre-wrap}.story-author{display:flex;align-items:center;gap:7px;margin-bottom:7px}.my-story{font-size:11px;color:#128c7e;font-weight:700}
    .story-actions{display:flex;align-items:center;gap:7px;margin-top:7px}.danger{border:0;background:#ffe5e5;color:#c62828;border-radius:7px;padding:7px 10px}
    .search{position:relative;margin-bottom:12px}.search input{padding-left:38px}.search span{position:absolute;left:12px;top:13px;color:#777}
    .people-result{background:#fff;border-radius:10px;padding:11px;margin-bottom:8px;display:flex;align-items:center;gap:10px}.people-actions{margin-left:auto;display:flex;gap:5px}
    .request{background:#e9f7f4;color:#075e54;border:0;border-radius:7px;padding:7px 10px}.muted{color:#667781;font-size:12px}
    .auth{height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#efeae2}.auth-card{width:min(420px,100%);background:#fff;padding:28px;border-radius:15px;box-shadow:0 5px 25px rgba(0,0,0,.12)}
    .auth-card h1{color:#075e54}.error{background:#fff0ef;color:#b42318;padding:10px;border-radius:8px;margin-top:10px}.link{width:100%;border:0;background:transparent;color:#128c7e;padding:10px;margin-top:8px}
    .empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#667781;background:#efeae2}.empty-icon{font-size:50px}
    @media(max-width:700px){.chat-layout{grid-template-columns:1fr}.sidebar{display:none}.messages{padding:10px 3%}.bubble{max-width:86%}.stories{grid-template-columns:1fr 1fr}.story{padding:7px}.story-card{aspect-ratio:9/16}.top{height:56px}.tabs{height:47px}.icon,.file-label{width:36px;height:36px;font-size:18px}.textbox{height:40px}.send{width:40px;height:40px}}
  `}</style>;
}

function Avatar({ user }) {
  const n = user?.name || user?.displayName || user?.email || "?";
  return <div className="avatar">{n.charAt(0).toUpperCase()}</div>;
}

function EyeIcon() {
  return <span className="eye" aria-label="seen" />;
}

function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  if (user === undefined) return <><Styles/><div className="empty"><div className="empty-icon">💬</div><h2>Chatdo</h2><p>Loading...</p></div></>;
  if (!user) return <><Styles/><Auth/></>;
  return <><Styles/><SocialApp user={user}/></>;
}

function firebaseError(error) {
  const map = {
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/invalid-email":"Please enter a valid email.",
    "auth/email-already-in-use":"This email is already registered.",
    "auth/weak-password":"Password should be at least 6 characters.",
    "auth/network-request-failed":"Network error. Please try again."
  };
  return map[error?.code] || error?.message || "Something went wrong.";
}

function Auth() {
  const [mode,setMode]=useState("login"),[name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false);
  async function submit(e){
    e.preventDefault();setError("");setLoading(true);
    try{
      if(mode==="login") await signInWithEmailAndPassword(auth,email.trim(),password);
      else{
        const r=await createUserWithEmailAndPassword(auth,email.trim(),password);
        await updateProfile(r.user,{displayName:name.trim()});
        await setDoc(doc(db,"users",r.user.uid),{
          uid:r.user.uid,email:r.user.email,name:name.trim(),photoURL:"",
          online:true,lastSeen:serverTimestamp(),createdAt:serverTimestamp(),
          friends:[],friendRequests:[]
        },{merge:true});
      }
    }catch(err){setError(firebaseError(err));}finally{setLoading(false);}
  }
  return <div className="auth"><div className="auth-card">
    <h1>Chatdo</h1><p>Chat, connect and share stories.</p>
    <form onSubmit={submit}>
      {mode==="signup"&&<input className="input" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} required/>}
      <input className="input" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} required/>
      <input className="input" type="password" placeholder="Password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required/>
      <button className="primary" style={{width:"100%",marginTop:7}} disabled={loading}>{loading?"Please wait...":mode==="login"?"Sign in":"Create account"}</button>
    </form>
    {error&&<div className="error">{error}</div>}
    <button className="link" onClick={()=>{setError("");setMode(mode==="login"?"signup":"login")}}>{mode==="login"?"Create a new account":"Already have an account? Sign in"}</button>
  </div></div>;
}

function usePresence(user){
  useEffect(()=>{
    const userDoc=doc(db,"users",user.uid);
    const setPresence=online=>setDoc(userDoc,{
      uid:user.uid,email:user.email,name:user.displayName||user.email,
      online,lastSeen:serverTimestamp()
    },{merge:true}).catch(()=>{});
    const onVisibility=()=>setPresence(document.visibilityState==="visible");
    const onPageHide=()=>setPresence(false);
    const onPageShow=()=>setPresence(true);
    setPresence(true);
    document.addEventListener("visibilitychange",onVisibility);
    window.addEventListener("pagehide",onPageHide);
    window.addEventListener("pageshow",onPageShow);
    return ()=>{
      document.removeEventListener("visibilitychange",onVisibility);
      window.removeEventListener("pagehide",onPageHide);
      window.removeEventListener("pageshow",onPageShow);
      setPresence(false);
    };
  },[user.uid]);
}

function SocialApp({user}){
  const [tab,setTab]=useState("chats"),[selected,setSelected]=useState(null),[people,setPeople]=useState([]),[me,setMe]=useState({});
  usePresence(user);

  useEffect(()=>{
    const unsubMe=onSnapshot(doc(db,"users",user.uid),s=>setMe(s.data()||{}));
    const q=query(usersRef,limit(200));
    const unsubPeople=onSnapshot(q,s=>setPeople(s.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.uid!==user.uid)));
    return ()=>{unsubMe();unsubPeople();};
  },[user.uid]);

  useEffect(()=>{
    if(selected){
      const u=people.find(p=>p.uid===selected.uid);
      if(u)setSelected(u);
    }
  },[people]);

  const friends=(me.friends||[]).map(uid=>people.find(p=>p.uid===uid)).filter(Boolean);

  return <div className="app">
    <div className="top"><div className="brand">Chatdo<small>{user.displayName||user.email}</small></div><button className="logout" onClick={()=>signOut(auth)}>Logout</button></div>
    <div className="tabs">
      {["chats","stories","people"].map(t=><button key={t} className={"tab "+(tab===t?"active":"")} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}
    </div>
    <main className="main">
      {tab==="stories"&&<Stories user={user}/>}
      {tab==="people"&&<People user={user} people={people} me={me}/>}
      {tab==="chats"&&<div className="chat-layout">
        <aside className="sidebar">
          <div className="side-title">Chats</div>
          {friends.length===0?<div style={{padding:18}} className="muted">Add friends from People to start chats.</div>:
            friends.map(p=><button key={p.uid} className={"person "+(selected?.uid===p.uid?"sel":"")} onClick={()=>setSelected(p)}>
              <Avatar user={p}/><div className="info"><div className="name">{p.name||p.email}</div><div className={p.online?"online":"offline"}>{p.online?"Online":"Offline"}</div></div>
            </button>)}
        </aside>
        <section>{selected?<Chat user={user} other={selected}/>:<div className="empty"><div className="empty-icon">💬</div><h2>Welcome to Chatdo</h2><p>Find a person in People and send a friend request.</p></div>}</section>
      </div>}
    </main>
  </div>;
}

function People({user,people,me}){
  const [search,setSearch]=useState("");
  const incoming=(me.friendRequests||[]).map(uid=>people.find(p=>p.uid===uid)).filter(Boolean);
  const results=search.trim().length<1?[]:people.filter(p=>(p.name||p.email||"").toLowerCase().includes(search.trim().toLowerCase())).slice(0,30);

  async function poke(person){
    try{
      if((me.friends||[]).includes(person.uid))return;
      if((person.friendRequests||[]).includes(user.uid))return;
      await updateDoc(doc(db,"users",person.uid),{friendRequests:arrayUnion(user.uid)});
      alert("Poke sent.");
    }catch(e){alert("Could not send poke. Check Firestore Rules.");}
  }

  async function accept(person){
    try{
      await updateDoc(doc(db,"users",user.uid),{friends:arrayUnion(person.uid),friendRequests:arrayRemove(person.uid)});
      await updateDoc(doc(db,"users",person.uid),{friends:arrayUnion(user.uid)});
    }catch(e){alert("Friend request update failed. Check Firestore Rules.");}
  }

  async function reject(person){
    try{await updateDoc(doc(db,"users",user.uid),{friendRequests:arrayRemove(person.uid)});}
    catch(e){alert("Could not reject request.");}
  }

  return <div className="page">
    <div className="card">
      <h2>People</h2>
      <div className="search"><span>⌕</span><input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name"/></div>
      <div className="muted">Search a name to find people. Everyone is hidden until you search.</div>
    </div>

    {incoming.length>0&&<div className="card"><h3>Friend requests</h3>{incoming.map(p=><div className="people-result" key={p.uid}><Avatar user={p}/><div className="info"><div className="name">{p.name||p.email}</div><div className="muted">Poked you</div></div><div className="people-actions"><button className="request" onClick={()=>accept(p)}>Accept</button><button className="danger" onClick={()=>reject(p)}>Reject</button></div></div>)}</div>}

    {search.trim()&&results.length===0&&<div className="card muted">No matching person.</div>}

    {results.map(p=>{
      const isFriend=(me.friends||[]).includes(p.uid), requested=(p.friendRequests||[]).includes(user.uid);
      return <div className="people-result" key={p.uid}><Avatar user={p}/><div className="info"><div className="name">{p.name||p.email}</div><div className={p.online?"online":"offline"}>{p.online?"Online":"Offline"}</div></div>
        <div className="people-actions">{isFriend?<span className="muted">Friend ✓</span>:requested?<span className="muted">Poked ✓</span>:<button className="request" onClick={()=>poke(p)}>Poke</button>}</div>
      </div>;
    })}
  </div>;
}

function useChatMessages(chatId){
  const [messages,setMessages]=useState([]);
  useEffect(()=>{
    const q=query(collection(db,"chats",chatId,"messages"),orderBy("createdAt","asc"));
    return onSnapshot(q,s=>setMessages(s.docs.map(d=>({id:d.id,...d.data()}))),e=>console.error(e));
  },[chatId]);
  return messages;}

function Chat({user,other}){
  const chatId=[user.uid,other.uid].sort().join("_");
  const messagesRef=collection(db,"chats",chatId,"messages");
  const chatDoc=doc(db,"chats",chatId);
  const messages=useChatMessages(chatId);

  const [text,setText]=useState("");
  const [sending,setSending]=useState(false);
  const [file,setFile]=useState(null);
  const [typing,setTyping]=useState(false);
  const [menuId,setMenuId]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [editingText,setEditingText]=useState("");
  const [recording,setRecording]=useState(null);

  const mediaRecorder=useRef(null);
  const chunks=useRef([]);
  const bottom=useRef(null);
  const typingTimer=useRef(null);

  useEffect(()=>{
    return onSnapshot(
      chatDoc,
      s=>{
        const d=s.data()||{};
        setTyping(
          !!d.typingUid &&
          d.typingUid!==user.uid
        );
      },
      ()=>{}
    );
  },[chatId,user.uid]);

  useEffect(()=>{
    bottom.current?.scrollIntoView({
      behavior:"smooth"
    });
  },[messages,typing]);

  useEffect(()=>{
    const unseen=messages.filter(
      m=>
        m.senderId===other.uid &&
        !(m.seenBy||[]).includes(user.uid) &&
        !m.deletedForEveryone
    );

    if(!unseen.length)return;

    const batch=writeBatch(db);

    unseen.forEach(m=>{
      batch.update(
        doc(
          db,
          "chats",
          chatId,
          "messages",
          m.id
        ),
        {
          seenBy:arrayUnion(user.uid)
        }
      );
    });

    batch.commit().catch(()=>{});
  },[
    messages,
    chatId,
    user.uid,
    other.uid
  ]);

  function handleTyping(e){
    const v=e.target.value;
    setText(v);

    setDoc(
      chatDoc,
      {
        members:[user.uid,other.uid],
        typingUid:v.trim()
          ?user.uid
          :null
      },
      {merge:true}
    ).catch(()=>{});

    clearTimeout(typingTimer.current);

    if(v.trim()){
      typingTimer.current=setTimeout(()=>{
        setDoc(
          chatDoc,
          {
            typingUid:null
          },
          {merge:true}
        ).catch(()=>{});
      },1200);
    }
  }

  async function uploadAndMessage(
    blob,
    mime,
    kind
  ){
    setSending(true);

    try{
      if(blob.size>35*1024*1024){
        alert(
          "Media must be smaller than 35 MB."
        );
        return;
      }

      await setDoc(
        chatDoc,
        {
          members:[user.uid,other.uid],
          lastMessage:
            kind==="audio"
              ?"🎤 Voice message"
              :"🎥 Video message",
          updatedAt:serverTimestamp(),
          typingUid:null
        },
        {merge:true}
      );

      const ext=
        mime.includes("webm")
          ?"webm"
          :mime.includes("mp4")
          ?"mp4"
          :"dat";

      const r=ref(
        storage,
        `chatMedia/${chatId}/${Date.now()}-${user.uid}.${ext}`
      );

      await uploadBytes(
        r,
        blob,
        {
          contentType:mime
        }
      );

      const url=await getDownloadURL(r);

      await addDoc(
        messagesRef,
        {
          senderId:user.uid,
          senderName:
            user.displayName||
            user.email,
          text:"",
          imageURL:"",
          mediaURL:url,
          mediaType:kind,
          mimeType:mime,
          createdAt:serverTimestamp(),
          likes:[],
          seenBy:[],
          edited:false,
          deletedForEveryone:false,
          deletedFor:[]
        }
      );

    }catch(e){
      console.error(e);
      alert(
        "Media message failed. Check Firebase Storage/Firestore Rules."
      );
    }finally{
      setSending(false);
    }
  }

  async function startRecording(kind){
    if(recording)return;

    try{
      const stream=
        await navigator.mediaDevices.getUserMedia(
          kind==="audio"
            ?{audio:true}
            :{
                audio:true,
                video:true
              }
        );

      let mime="";

      const options=
        kind==="audio"
          ?[
              "audio/webm;codecs=opus",
              "audio/webm"
            ]
          :[
              "video/webm;codecs=vp8,opus",
              "video/webm",
              "video/mp4"
            ];

      for(const o of options){
        if(
          window.MediaRecorder &&
          MediaRecorder.isTypeSupported(o)
        ){
          mime=o;
          break;
        }
      }

      const recorder=
        mime
          ?new MediaRecorder(
              stream,
              {mimeType:mime}
            )
          :new MediaRecorder(stream);

      chunks.current=[];

      recorder.ondataavailable=e=>{
        if(e.data&&e.data.size){
          chunks.current.push(e.data);
        }
      };

      recorder.onstop=async()=>{
        const blob=new Blob(
          chunks.current,
          {
            type:
              mime||
              recorder.mimeType||
              (kind==="audio"
                ?"audio/webm"
                :"video/webm")
          }
        );

        stream
          .getTracks()
          .forEach(t=>t.stop());

        mediaRecorder.current=null;
        setRecording(null);

        await uploadAndMessage(
          blob,
          blob.type,
          kind
        );
      };

      recorder.start();
      mediaRecorder.current=recorder;
      setRecording(kind);

      setTimeout(()=>{
        if(
          mediaRecorder.current &&
          mediaRecorder.current.state==="recording"
        ){
          mediaRecorder.current.stop();
        }
      },60000);

    }catch(e){
      console.error(e);
      alert(
        "Camera/Microphone permission is required."
      );
      setRecording(null);
    }
  }

  function stopRecording(){
    if(
      mediaRecorder.current &&
      mediaRecorder.current.state==="recording"
    ){
      mediaRecorder.current.stop();
    }
  }

  async function sendText(){
    const value=text.trim();

    if(!value||sending)return;

    setSending(true);

    try{
      await setDoc(
        chatDoc,
        {
          members:[user.uid,other.uid],
          lastMessage:value,
          updatedAt:serverTimestamp(),
          typingUid:null
        },
        {merge:true}
      );

      await addDoc(
        messagesRef,
        {
          senderId:user.uid,
          senderName:
            user.displayName||
            user.email,
          text:value,
          imageURL:"",
          mediaURL:"",
          mediaType:"",
          mimeType:"",
          createdAt:serverTimestamp(),
          likes:[],
          seenBy:[],
          edited:false,
          deletedForEveryone:false,
          deletedFor:[]
        }
      );

      setText("");

    }catch(e){
      console.error(e);
      alert("Message failed.");
    }finally{
      setSending(false);
    }
  }

  async function sendImage(e){
    const f=e.target.files?.[0];
    e.target.value="";

    if(!f||sending)return;

    if(f.size>35*1024*1024){
      alert(
        "Image must be smaller than 35 MB."
      );
      return;
    }

    setSending(true);

    try{
      const r=ref(
        storage,
        `chatMedia/${chatId}/${Date.now()}-${user.uid}-${f.name}`
      );

      await uploadBytes(
        r,
        f,
        {
          contentType:f.type
        }
      );

      const url=await getDownloadURL(r);

      await setDoc(
        chatDoc,
        {
          members:[user.uid,other.uid],
          lastMessage:"📷 Photo",
          updatedAt:serverTimestamp(),
          typingUid:null
        },
        {merge:true}
      );

      await addDoc(
        messagesRef,
        {
          senderId:user.uid,
          senderName:
            user.displayName||
            user.email,
          text:"",
          imageURL:url,
          mediaURL:"",
          mediaType:"",
          mimeType:f.type,
          createdAt:serverTimestamp(),
          likes:[],
          seenBy:[],
          edited:false,
          deletedForEveryone:false,
          deletedFor:[]
        }
      );

    }catch(e){
      console.error(e);
      alert(
        "Image sending failed. Check Firebase Storage Rules."
      );
    }finally{
      setSending(false);
    }
      } 
  async function sendTextOrImage(){
  if(file){
    const f=file;
    setFile(null);
    await sendImage({
      target:{
        files:[f],
        value:""
      }
    });
    return;
  }

  await sendText();
  } 
    function startEdit(m){
    if(m.senderId!==user.uid||m.deletedForEveryone)return;

    const created=m.createdAt?.toMillis?.();

    if(!created){
      alert("Try again in a moment.");
      return;
    }

    if(Date.now()-created>3600000){
      alert("Messages can only be edited within 1 hour.");
      return;
    }

    setEditingId(m.id);
    setEditingText(m.text||"");
    setMenuId(null);
  }

  async function saveEdit(m){
    const clean=editingText.trim();

    if(!clean)return;

    const created=m.createdAt?.toMillis?.();

    if(
      !created||
      Date.now()-created>3600000
    ){
      alert("Edit time expired.");
      setEditingId(null);
      return;
    }

    try{
      await updateDoc(
        doc(
          db,
          "chats",
          chatId,
          "messages",
          m.id
        ),
        {
          text:clean,
          edited:true,
          updatedAt:serverTimestamp()
        }
      );

      setEditingId(null);
      setEditingText("");

    }catch(e){
      console.error(e);
      alert(
        "Edit failed. Check Firestore Rules."
      );
    }
  }
  async function toggleLike(m){
  try{
    const liked=m.likes?.includes(user.uid);

    await updateDoc(
      doc(db,"chats",chatId,"messages",m.id),
      {
        likes:liked
          ?arrayRemove(user.uid)
          :arrayUnion(user.uid)
      }
    );
  }catch(e){
    console.error(e);
  }
}

async function deleteForMe(m){
  try{
    await updateDoc(
      doc(db,"chats",chatId,"messages",m.id),
      {
        deletedFor:arrayUnion(user.uid)
      }
    );

    setMenuId(null);
  }catch(e){
    alert("Delete failed. Check Firestore Rules.");
  }
}

async function deleteForEveryone(m){
  if(m.senderId!==user.uid)return;

  if(!window.confirm("Delete this message for everyone?"))return;

  try{
    await updateDoc(
      doc(db,"chats",chatId,"messages",m.id),
      {
        deletedForEveryone:true,
        text:"",
        imageURL:"",
        mediaURL:""
      }
    );

    setMenuId(null);
  }catch(e){
    alert("Delete failed. Check Firestore Rules.");
  }
}

  function time(ts){
    try{
      return (
        ts?.toDate?.().toLocaleTimeString(
          [],
          {
            hour:"2-digit",
            minute:"2-digit"
          }
        )||""
      );
    }catch{
      return "";
    }
  }

  return (
    <div className="chat">

      <div className="chat-head">
        <Avatar user={other}/>

        <div className="chat-head-info">
          <b>
            {other.name||other.email}
          </b>

          <div className="chat-status">
            {typing
              ?"typing..."
              :other.online
              ?"Online"
              :"Offline"}
          </div>
        </div>
      </div>

      <div className="messages">

        {messages.map(m=>{

          if(
            m.deletedFor?.includes(
              user.uid
            )
          ){
            return null;
          }

          const mine=
            m.senderId===user.uid;

          const seen=
            m.seenBy?.includes(
              other.uid
            );

          const liked=
            m.likes?.includes(
              user.uid
            );

          return (
            <div
              className={
                "row "+
                (mine?"mine":"other")
              }
              key={m.id}
            >

              <div className="bubble">

                <div className="menu">

                  <button
                    onClick={()=>
                      setMenuId(
                        menuId===m.id
                          ?null
                          :m.id
                      )
                    }
                  >
                    ⋮
                  </button>

                  {menuId===m.id&&(
                    <div className="menu-panel">

                      {mine&&
                       !m.deletedForEveryone&&(
                        <button
                          onClick={()=>
                            startEdit(m)
                          }
                        >
                          ✏️ Edit
                        </button>
                      )}

                      {!m.deletedForEveryone&&(
                        <button
                          onClick={()=>
                            deleteForMe(m)
                          }
                        >
                          🗑 Delete for me
                        </button>
                      )}

                      {mine&&
                       !m.deletedForEveryone&&(
                        <button
                          onClick={()=>
                            deleteForEveryone(m)
                          }
                        >
                          🚫 Delete for everyone
                        </button>
                      )}

                    </div>
                  )}

                </div>

                {m.deletedForEveryone ? (

                  <span className="deleted">
                    🚫 This message was deleted
                  </span>

                ) : (
                  <>
                    {m.imageURL&&(
                      <img
                        className="image"
                        src={m.imageURL}
                        alt="sent"
                      />
                    )}

                    {m.mediaType==="audio"&&
                     m.mediaURL&&(
                      <audio
                        className="media"
                        controls
                        src={m.mediaURL}
                      />
                    )}

                    {m.mediaType==="video"&&
                     m.mediaURL&&(
                      <video
                        className="media"
                        controls
                        playsInline
                        src={m.mediaURL}
                      />
                    )}

                    {editingId===m.id ? (

                      <div className="editbox">

                        <input
                          value={editingText}
                          onChange={e=>
                            setEditingText(
                              e.target.value
                            )
                          }
                          autoFocus
                        />

                        <button
                          className="save"
                          onClick={()=>
                            saveEdit(m)
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

                      m.text&&(
                        <span className="text">
                          {m.text}

                          {m.edited&&(
                            <span className="edited">
                              edited
                            </span>
                          )}
                        </span>
                      )

                    )}

                  </>
                )}

                <div className="time-line">

                  <span className="time">
                    {time(m.createdAt)}
                  </span>

                  {mine&&(
                    <span
                      className={
                        "tick "+
                        (seen?"seen":"")
                      }
                    >
                      {seen
                        ?<EyeIcon/>
                        :"✓"}
                    </span>
                  )}

                </div>

                {!m.deletedForEveryone&&(
                  <button
                    className={
                      "heart "+
                      (liked?"liked":"")
                    }
                    onClick={()=>
                      toggleLike(m)
                    }
                  >
                    ♥ {m.likes?.length||0}
                  </button>
                )}

              </div>

            </div>
          );
        })}

        {typing&&(
          <div className="typing">
            typing...
          </div>
        )}

        <div ref={bottom}/>

      </div>

      {recording&&(
        <div className="recording">

          {recording==="audio"
            ?"🎤 Recording voice…"
            :"🎥 Recording video…"}

          {" "}

          <button
            className="danger"
            onClick={stopRecording}
          >
            Stop
          </button>

        </div>
      )}

      <div className="composer-wrap">

        {file&&(
          <div className="recording">
            📎 {file.name}
          </div>
        )}

        <div className="composer">

          <label className="file-label">
            📎

            <input
              type="file"
              accept="image/*"
              onChange={e=>
                setFile(
                  e.target.files?.[0]||null
                )
              }
            />
          </label>

          <input
            className="textbox"
            value={text}
            onChange={handleTyping}
            onKeyDown={e=>{
              if(
                e.key==="Enter"&&
                !e.shiftKey
              ){
                e.preventDefault();
                sendTextOrImage();
              }
            }}
            placeholder="Type a message"
          />

          <button
            className="icon"
            type="button"
            onClick={()=>
              recording
                ?stopRecording()
                :startRecording("video")
            }
            title="Video message"
          >
            📷
          </button>

          <button
            className="icon"
            type="button"
            onClick={()=>
              recording
                ?stopRecording()
                :startRecording("audio")
            }
            title="Voice message"
          >
            🎤
          </button>

          <button
            className="send"
            onClick={sendTextOrImage}
            disabled={
              sending||
              recording||
              (!text.trim()&&!file)
            }
          >
            ➤
          </button>

        </div>

      </div>

    </div>
  );
}

function Stories({user}){

  const [stories,setStories]=
    useState([]);

  const [text,setText]=
    useState("");

  const [file,setFile]=
    useState(null);

  const [posting,setPosting]=
    useState(false);

  useEffect(()=>{

    const q=query(
      storiesRef,
      orderBy("createdAt","desc"),
      limit(50)
    );

    return onSnapshot(
      q,
      s=>
        setStories(
          s.docs.map(d=>({
            id:d.id,
            ...d.data()
          }))
        )
    );

  },[]);

  async function postStory(){

    if(
      !text.trim()&&
      !file
    ){
      return;
    }

    setPosting(true);

    try{

      let imageURL="";

      if(file){

        if(
          file.size>
          10*1024*1024
        ){
          alert(
            "Image must be smaller than 10 MB."
          );

          setPosting(false);
          return;
        }

        const r=ref(
          storage,
          `stories/${user.uid}/${Date.now()}-${file.name}`
        );

        await uploadBytes(
          r,
          file
        );

        imageURL=
          await getDownloadURL(r);
      }

      await addDoc(
        storiesRef,
        {
          uid:user.uid,
          name:
            user.displayName||
            user.email,
          text:text.trim(),
          imageURL,
          createdAt:
            serverTimestamp(),
          likes:[]
        }
      );

      setText("");
      setFile(null);

    }catch(e){

      console.error(e);

      alert(
        "Story post failed. Check Firebase permissions."
      );

    }finally{

      setPosting(false);

    }
  }

  async function likeStory(s){

    try{

      const liked=
        s.likes?.includes(
          user.uid
        );

      await updateDoc(
        doc(
          db,
          "stories",
          s.id
        ),
        {
          likes:
            liked
              ?arrayRemove(user.uid)
              :arrayUnion(user.uid)
        }
      );

    }catch(e){}

  }

  async function deleteStory(s){

    if(
      s.uid!==user.uid
    ){
      return;
    }

    if(
      !window.confirm(
        "Delete this story?"
      )
    ){
      return;
    }

    try{

      await deleteDoc(
        doc(
          db,
          "stories",
          s.id
        )
      );

    }catch(e){

      alert(
        "Story delete failed. Check Firestore Rules."
      );

    }
  }

  return (
    <div className="page">

      <div className="card">

        <h2>
          Share a story
        </h2>

        <input
          className="input"
          value={text}
          onChange={e=>
            setText(e.target.value)
          }
          placeholder="What's on your mind?"
        />

        <input
          className="input"
          type="file"
          accept="image/*"
          onChange={e=>
            setFile(
              e.target.files?.[0]||null
            )
          }
        />

        <button
          className="primary"
          onClick={postStory}
          disabled={posting}
        >
          {posting
            ?"Posting..."
            :"Post"}
        </button>

      </div>

      <div className="stories">

        {stories.map(s=>(

          <article
            className="story"
            key={s.id}
          >

            <div className="story-author">

              <Avatar
                user={{
                  name:s.name
                }}
              />

              <div>

                <b>
                  {s.name}
                </b>

                {s.uid===user.uid&&(
                  <div className="my-story">
                    My story
                  </div>
                )}

              </div>

            </div>

            <div className="story-card">

              {s.imageURL&&(
                <img
                  src={s.imageURL}
                  alt="story"
                />
              )}

              <div className="story-overlay">

                {s.text&&(
                  <div className="story-text">
                    {s.text}
                  </div>
                )}

              </div>

            </div>

            <div className="story-actions">

              <button
                className="heart"
                onClick={()=>
                  likeStory(s)
                }
              >
                ♥ {s.likes?.length||0}
              </button>

              {s.uid===user.uid&&(
                <button
                  className="danger"
                  onClick={()=>
                    deleteStory(s)
                  }
                >
                  Delete
                </button>
              )}

            </div>

          </article>

        ))}

      </div>

    </div>
  );
}

const rootElement=
  document.getElementById("root");

if(!rootElement){
  throw new Error(
    "Root element not found."
  );
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);
                                                                                                                                                                                                   }
