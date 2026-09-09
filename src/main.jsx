import React, {useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {
  initializeApp
} from "firebase/app";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile
} from "firebase/auth";
import {
  getFirestore, collection, addDoc, setDoc, doc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, updateDoc,
  arrayUnion, arrayRemove, limit
} from "firebase/firestore";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "firebase/storage";
import {getMessaging, getToken, onMessage, isSupported} from "firebase/messaging";
import "./styles.css";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const app = initializeApp(cfg);
const auth = getAuth(app), db = getFirestore(app), storage = getStorage(app);

const usersRef = collection(db,"users");
const chatsRef = collection(db,"chats");
const storiesRef = collection(db,"stories");

function App(){
  const [user,setUser]=useState(undefined);
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  if(user===undefined) return <div className="center">Loading…</div>;
  return user ? <SocialApp user={user}/> : <Auth/>;
}

function Auth(){
  const [mode,setMode]=useState("login"), [email,setEmail]=useState(""),
        [password,setPassword]=useState(""), [name,setName]=useState(""),
        [error,setError]=useState("");
  async function submit(e){
    e.preventDefault(); setError("");
    try{
      if(mode==="login") await signInWithEmailAndPassword(auth,email,password);
      else{
        const c=await createUserWithEmailAndPassword(auth,email,password);
        await updateProfile(c.user,{displayName:name});
        await setDoc(doc(db,"users",c.user.uid),{
          uid:c.user.uid,email,name,photoURL:"",createdAt:serverTimestamp(),online:true
        });
      }
    }catch(err){setError(err.message.replace("Firebase: ",""))}
  }
  return <div className="auth">
    <div className="card authCard">
      <h1>Connect</h1><p className="muted">Social chat, stories and calls.</p>
      <form onSubmit={submit}>
        {mode==="signup"&&<input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required/>}
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required minLength="6"/>
        <button className="primary">{mode==="login"?"Sign in":"Create account"}</button>
      </form>
      {error&&<div className="error">{error}</div>}
      <button className="link" onClick={()=>setMode(mode==="login"?"signup":"login")}>
        {mode==="login"?"Create an account":"Already have an account? Sign in"}
      </button>
    </div>
  </div>
}

function SocialApp({user}){
  const [tab,setTab]=useState("chats"), [selected,setSelected]=useState(null);
  useEffect(()=>setPresence(user),[user]);
  usePushNotifications(user);
  return <div className="app">
    <header><b>Connect</b><div><span>{user.displayName||user.email}</span><button onClick={()=>signOut(auth)}>Log out</button></div></header>
    <nav>
      {["chats","stories","people"].map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x[0].toUpperCase()+x.slice(1)}</button>)}
    </nav>
    <main>
      {tab==="chats"&&<ChatHome user={user} selected={selected} setSelected={setSelected}/>}
      {tab==="stories"&&<Stories user={user}/>}
      {tab==="people"&&<People user={user} onChat={u=>{setSelected(u);setTab("chats")}}/>}
    </main>
  </div>
}

async function setPresence(user){
  const u=doc(db,"users",user.uid);
  await setDoc(u,{uid:user.uid,name:user.displayName||user.email,online:true,lastSeen:serverTimestamp()},{merge:true});
  window.addEventListener("beforeunload",()=>updateDoc(u,{online:false,lastSeen:serverTimestamp()}));
}

function ChatHome({user,selected,setSelected}){
  const [people,setPeople]=useState([]);
  useEffect(()=>onSnapshot(query(usersRef,limit(50)),s=>setPeople(s.docs.map(d=>d.data()).filter(x=>x.uid!==user.uid))),[user.uid]);
  return <div className="grid">
    <aside className="sidebar"><h2>Messages</h2>{people.map(p=>
      <button className={"person "+(selected?.uid===p.uid?"sel":"")} key={p.uid} onClick={()=>setSelected(p)}>
        <Avatar u={p}/><span><b>{p.name||p.email}</b><small>{p.online?"Online":"Offline"}</small></span>
         </button>)}</aside>
  <section>
  {selected ? <div>CHAT OPENED</div> : <div className="empty">Select someone to start chatting.</div>}
</section>
}

function Chat({user,other}){
  const chatId=[user.uid,other.uid].sort().join("_");
  const messagesRef=collection(db,"chats",chatId,"messages");
  const [messages,setMessages]=useState([]), [text,setText]=useState(""), [file,setFile]=useState(null);
  const [call,setCall]=useState(null);
  const bottom=useRef();
  useEffect(()=>onSnapshot(query(messagesRef,orderBy("createdAt","asc")),s=>setMessages(s.docs.map(d=>({id:d.id,...d.data()})))),[chatId]);
  useEffect(()=>bottom.current?.scrollIntoView({behavior:"smooth"}),[messages]);
  async function send(){
    if(!text.trim()&&!file)return;
    let imageURL="";
    if(file){const r=ref(storage,`chatImages/${chatId}/${crypto.randomUUID()}-${file.name}`);await uploadBytes(r,file);imageURL=await getDownloadURL(r)}
    await setDoc(doc(db,"chats",chatId),{members:[user.uid,other.uid],lastMessage:text.trim()||"📷 Image",updatedAt:serverTimestamp()},{merge:true});
    await addDoc(messagesRef,{senderId:user.uid,text:text.trim(),imageURL,createdAt:serverTimestamp(),likes:[]});
        setText("");setFile(null);
  }
  async function like(id,liked){
    await updateDoc(doc(db,"chats",chatId,"messages",id),{likes:liked?arrayRemove(user.uid):arrayUnion(user.uid)});
  }
  return <div className="chat">
    <div className="chatHead"><Avatar u={other}/><div><b>{other.name||other.email}</b><small>{other.online?"Online":"Offline"}</small></div>
      <div className="calls"><button onClick={()=>setCall("audio")}>☎</button><button onClick={()=>setCall("video")}>▣</button></div>
    </div>
    <div className="messages">{messages.map(m=><div className={"msg "+(m.senderId===user.uid?"mine":"") } key={m.id}>
      {m.imageURL&&<img src={m.imageURL} className="chatImage"/>}<div>{m.text}</div>
      <button className="heart" onClick={()=>like(m.id,m.likes?.includes(user.uid))}>♥ {m.likes?.length||0}</button>
    </div>)}<div ref={bottom}/></div>
    <div className="composer"><label className="attach">📎<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
      <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={file?file.name:"Write a message…"}/>
      <button className="primary" onClick={send}>Send</button>
    </div>

  </div>
}

function Call({user,other,type,onClose}){
  const local=useRef(), remote=useRef(), pc=useRef(), [status,setStatus]=useState("Starting…");
  const roomId=[user.uid,other.uid].sort().join("_");
  useEffect(()=>{
    let unsub;
    (async()=>{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==="video"});
      local.current.srcObject=stream;
      const peer=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});
      pc.current=peer; stream.getTracks().forEach(t=>peer.addTrack(t,stream));
      peer.ontrack=e=>remote.current.srcObject=e.streams[0];
      const offerRef=doc(db,"calls",roomId), snap=await getDoc(offerRef);
      if(!snap.exists()){
        const offer=await peer.createOffer(); await peer.setLocalDescription(offer);
        await setDoc(offerRef,{offer:{type:offer.type,sdp:offer.sdp},caller:user.uid,kind:type});
        unsub=onSnapshot(offerRef,async s=>{const d=s.data();if(d?.answer&&!peer.currentRemoteDescription){await peer.setRemoteDescription(d.answer);setStatus("Connected")}})
      }else{
        const d=snap.data(); await peer.setRemoteDescription(d.offer);
        const answer=await peer.createAnswer();await peer.setLocalDescription(answer);
        await updateDoc(offerRef,{answer:{type:answer.type,sdp:answer.sdp}});setStatus("Connected");
      }
    })().catch(e=>setStatus("Call error: "+e.message));
    return()=>{unsub?.();pc.current?.close()};
  },[]);
  return <div className="call"><video ref={remote} autoPlay playsInline className="remote"/><video ref={local} autoPlay muted playsInline className="local"/>
    <div className="callBar"><span>{status}</span><button onClick={onClose}>End call</button></div></div>
}

function Stories({user}){
  const [stories,setStories]=useState([]), [file,setFile]=useState(null), [text,setText]=useState("");
  useEffect(()=>onSnapshot(query(storiesRef,orderBy("createdAt","desc"),limit(50)),s=>setStories(s.docs.map(d=>({id:d.id,...d.data()})))),[]);
  async function post(){
    if(!file&&!text.trim())return;
    let imageURL="";
    if(file){const r=ref(storage,`stories/${user.uid}/${crypto.randomUUID()}-${file.name}`);await uploadBytes(r,file);imageURL=await getDownloadURL(r)}
    await addDoc(storiesRef,{uid:user.uid,name:user.displayName||user.email,text:text.trim(),imageURL,createdAt:serverTimestamp(),likes:[]});
    setFile(null);setText("");
  }
  async function like(s){await updateDoc(doc(db,"stories",s.id),{likes:s.likes?.includes(user.uid)?arrayRemove(user.uid):arrayUnion(user.uid)})}
  return <div className="page"><div className="storyCreate"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Share a story…"/>
    <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="primary" onClick={post}>Post</button></div>
    <div className="stories">{stories.map(s=><article className="story" key={s.id}><b>{s.name}</b>{s.imageURL&&<img src={s.imageURL}/>}<p>{s.text}</p>
      <button onClick={()=>like(s)}>♥ {s.likes?.length||0}</button></article>)}</div></div>
}

function People({user,onChat}){
  const [people,setPeople]=useState([]);
  useEffect(()=>onSnapshot(usersRef,s=>setPeople(s.docs.map(d=>d.data()).filter(x=>x.uid!==user.uid))),[user.uid]);
  return <div className="page"><h2>People</h2>{people.map(p=><div className="person row" key={p.uid}><Avatar u={p}/><span><b>{p.name||p.email}</b><small>{p.online?"Online":"Offline"}</small></span><button onClick={()=>onChat(p)}>Message</button></div>)}</div>
}
function Avatar({u}){return <div className="avatar">{(u.name||u.email||"?")[0].toUpperCase()}</div>}

function usePushNotifications(user){
  useEffect(()=>{
    let unsub;
    (async()=>{
      if(!(await isSupported()))return;
      const m=getMessaging(app);
      const permission=await Notification.requestPermission();
      if(permission==="granted"){
        const token=await getToken(m,{vapidKey:import.meta.env.VITE_FIREBASE_VAPID_KEY});
        if(token)await setDoc(doc(db,"users",user.uid),{fcmTokens:arrayUnion(token)},{merge:true});
        unsub=onMessage(m,p=>new Notification(p.notification?.title||"New message",{body:p.notification?.body||""}));
      }
    })().catch(console.warn);
    return()=>unsub?.();
  },[user.uid]);
}
createRoot(document.getElementById("root")).render(<App/>);
