import React,{useEffect,useMemo,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {initializeApp} from "firebase/app";
import {
  getAuth,onAuthStateChanged,signInWithEmailAndPassword,
  createUserWithEmailAndPassword,sendPasswordResetEmail,signOut,
  updateProfile,GoogleAuthProvider,signInWithPopup,RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import {
  getFirestore,collection,doc,getDoc,getDocs,setDoc,addDoc,
  updateDoc,deleteDoc,onSnapshot,query,where,orderBy,limit,
  serverTimestamp,arrayUnion,arrayRemove
} from "firebase/firestore";
import {getStorage,ref,uploadBytes,getDownloadURL} from "firebase/storage";

/* CHATDO COMPLETE SINGLE-FILE APP
   Replace src/main.jsx with this file.

   Required Firebase:
   - Authentication: Email/Password, Google, Phone
   - Firestore
   - Storage for photos/videos/voice
   Storage can remain disabled; text/auth still work.
*/

const firebaseConfig={
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:import.meta.env.VITE_FIREBASE_APP_ID
};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
const googleProvider=new GoogleAuthProvider();
const STUN={iceServers:[{urls:"stun:stun.l.google.com:19302"}]};
const chatId=(a,b)=>[a,b].sort().join("_");
const friendId=(a,b)=>[a,b].sort().join("_");
const norm=v=>String(v??"").trim().toLowerCase();
const digits=v=>String(v??"").replace(/\D/g,"");
const ms=v=>{if(!v)return 0;if(v.toMillis)return v.toMillis();if(v.toDate)return v.toDate().getTime();const n=new Date(v).getTime();return Number.isNaN(n)?0:n};
const time=v=>ms(v)?new Date(ms(v)).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"";
const date=v=>ms(v)?new Date(ms(v)).toLocaleString([],{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"";
const nameOf=u=>u?.displayName||u?.username||u?.email?.split("@")[0]||"User";
const initials=u=>nameOf(u).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"U";

function Avatar({u,small=false}){return <div className={"avatar "+(small?"small":"")}>{u?.photoURL?<img src={u.photoURL} alt=""/>:initials(u)}</div>}
function Online({u,small=false}){return <div className="avatarWrap"><Avatar u={u} small={small}/><i className={"dot "+(u?.online?"on":"off")}/></div>}
function useLongPress(fn,delay=550){
  const ref=useRef(null);
  const start=e=>{ref.current=setTimeout(()=>fn(e),delay)};
  const stop=()=>{if(ref.current)clearTimeout(ref.current);ref.current=null};
  return {onTouchStart:start,onTouchEnd:stop,onTouchMove:stop,onMouseDown:start,onMouseUp:stop,onMouseLeave:stop};
}
async function saveUser(uid,data){return setDoc(doc(db,"users",uid),data,{merge:true})}
async function ensureUser(u,extra={}){
  if(!u)return;
  const r=doc(db,"users",u.uid),s=await getDoc(r);
  if(!s.exists())await setDoc(r,{
    uid:u.uid,email:u.email||"",phoneNumber:u.phoneNumber||"",displayName:u.displayName||"",
    username:"",bio:"",hobbies:"",photoURL:u.photoURL||"",coverURL:"",
    online:true,lastSeen:serverTimestamp(),searchHistory:[],hiddenChats:[],
    hiddenChatLocks:{},privacy:{},createdAt:serverTimestamp(),...extra
  });
  else await saveUser(u.uid,{online:true,lastSeen:serverTimestamp(),...extra});
}
async function upload(uid,file,folder){
  try{
    const safe=file.name.replace(/[^\w.-]/g,"_");
    const r=ref(storage,`${folder}/${uid}/${Date.now()}_${safe}`);
    await uploadBytes(r,file);return getDownloadURL(r);
  }catch(e){
    alert("Firebase Storage is not enabled. Auth/text features work, but media upload needs Storage.");
    throw e;
  }
}
async function sha(text){
  const data=new TextEncoder().encode(text);
  const buf=await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function lockChat(uid,id){
  const a=prompt("Choose emoji 1 for this hidden chat");
  if(!a)return null;
  const b=prompt("Choose emoji 2");
  if(!b)return null;
  const p=prompt("Choose a 4-6 digit passkey");
  if(!/^\d{4,6}$/.test(p||"")){alert("Passkey must be 4-6 digits.");return null}
  const h=await sha(`${a}|${b}|${p}`);
  return {emoji1:a,emoji2:b,hash:h};
}
async function unlockChat(uid,id,lock){
  if(!lock)return true;
  const a=prompt("Hidden chat: enter emoji 1");
  const b=prompt("Enter emoji 2");
  const p=prompt("Enter passkey");
  if(await sha(`${a}|${b}|${p}`)===lock.hash)return true;
  alert("Wrong hidden-chat key.");return false;
}

/* ---------------- styles ---------------- */
function Styles(){return <style>{`
*{box-sizing:border-box}html,body,#root{margin:0;min-height:100%;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;background:#fdfbf7;color:#3a2f26}
button,input,textarea,select{font:inherit}button{cursor:pointer}
.app{min-height:100vh;background:#fdfbf7}
.top{height:68px;background:#fff;border-bottom:1px solid #e8dfd4;display:flex;align-items:center;justify-content:space-between;padding:0 16px;position:sticky;top:0;z-index:40}
.brand{display:flex;align-items:center;gap:10px;color:#3a2f26;font-weight:900;font-size:22px;cursor:pointer}.mark{width:40px;height:40px;border-radius:14px;background:#a67c52;color:#fff;display:grid;place-items:center}
.main{width:min(1180px,100%);margin:auto;padding:12px}.nav{display:flex;gap:6px;padding:6px;background:#fff;border:1px solid #e5dbcf;border-radius:17px;margin-bottom:12px;position:sticky;top:76px;z-index:30;overflow:auto}
.nav button{flex:1;min-width:82px;border:0;background:none;border-radius:11px;padding:10px;color:#6b6b6b;font-weight:800}.nav button.active{background:#a67c52;color:#fff}
.page{background:#fff;border:1px solid #e6ddd2;border-radius:20px;min-height:calc(100vh - 150px);overflow:hidden;box-shadow:0 14px 45px rgba(58,47,38,.08)}
.head{padding:16px;border-bottom:1px solid #eee7df;display:flex;justify-content:space-between;align-items:center;gap:10px}.title{font-size:21px;font-weight:900;color:#3a2f26}.sub{font-size:12px;color:#6b6b6b}
.btn,.secondary,.danger,.icon{border-radius:11px;padding:9px 13px;font-weight:800}.btn{border:0;background:#a67c52;color:#fff}.secondary{border:1px solid #d9cbbb;background:#fff;color:#6f5137}.danger{border:0;background:#fde9e7;color:#b34b46}.icon{width:40px;height:40px;padding:0;border:1px solid #ddd2c5;background:#fff;color:#3a2f26}
.input,textarea,select{width:100%;border:1px solid #d9cfc3;background:#fff;border-radius:12px;padding:10px 12px;outline:0}.input:focus,textarea:focus,select:focus{border-color:#a67c52;box-shadow:0 0 0 3px rgba(166,124,82,.12)}textarea{min-height:80px;resize:vertical}
.row{display:flex;align-items:center;gap:11px;padding:13px 16px;border-bottom:1px solid #eee7df}.row:hover{background:#faf7f2}.grow{flex:1;min-width:0}.bold{font-weight:900}.meta{font-size:12px;color:#6b6b6b;margin-top:3px}.preview{font-size:13px;color:#777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px}
.avatar{width:46px;height:46px;flex:0 0 46px;border-radius:50%;overflow:hidden;background:#eee3d7;color:#7b5b3e;display:grid;place-items:center;font-weight:900}.avatar.small{width:38px;height:38px;flex-basis:38px;font-size:12px}.avatar img{width:100%;height:100%;object-fit:cover}.avatarWrap{position:relative;flex:0 0 auto}.dot{position:absolute;width:12px;height:12px;border-radius:50%;right:0;bottom:1px;border:2px solid #fff;background:#555}.dot.on{background:#4caf50}.dot.off{background:#555}
.empty{text-align:center;padding:45px 20px;color:#8a8178}.menu{position:fixed;z-index:200;background:#fff;border:1px solid #ddd2c5;border-radius:13px;box-shadow:0 20px 50px rgba(58,47,38,.18);overflow:hidden;min-width:210px}.menu button{display:block;width:100%;padding:12px 14px;border:0;background:#fff;text-align:left;font-weight:800;color:#4d3d31}.menu button:hover{background:#f6f0e8}
.search{display:flex;gap:7px;padding:13px 16px;border-bottom:1px solid #eee7df}.history{padding:9px 16px 0}.notice{padding:10px 13px;background:#f3ede4;border-bottom:1px solid #e6dbce;color:#5e5147;font-size:12px}
.chatPage{height:calc(100vh - 175px);min-height:530px;display:flex;flex-direction:column}.chatHead{display:flex;align-items:center;gap:10px;padding:10px 13px;border-bottom:1px solid #e8dfd4}.chatStatus{font-size:12px;color:#4caf50}.offline{color:#6b6b6b}.messages{flex:1;overflow:auto;padding:16px;background:#fdfbf7;background-image:radial-gradient(rgba(166,124,82,.10) 1px,transparent 1px);background-size:24px 24px}.line{display:flex;margin:6px 0}.mine{justify-content:flex-end}.bubble{max-width:min(80%,620px);padding:8px 10px;border:1px solid #e7dfd5;background:#fff;border-radius:16px}.mine .bubble{background:#f3ede4;border-color:#e1d3c2}.bubbleText{white-space:pre-wrap;word-break:break-word}.bubbleMeta{font-size:10px;color:#777;text-align:right;margin-top:4px}.reply{border-left:3px solid #a67c52;background:#faf7f2;padding:5px 7px;font-size:11px;margin-bottom:5px}.tick{margin-left:3px}.seen{opacity:.7;filter:blur(.5px)}
.composer{display:flex;gap:6px;align-items:flex-end;padding:9px;border-top:1px solid #e8dfd4}.composer textarea{min-height:44px;max-height:110px;resize:none}.send{height:44px;width:46px;border:0;border-radius:12px;background:#a67c52;color:#fff}
.storyStrip{display:flex;gap:13px;overflow:auto;padding:15px;border-bottom:1px solid #eee7df}.storyItem{min-width:72px;text-align:center;font-size:11px;color:#6b6b6b;cursor:pointer}.circle{width:62px;height:62px;border-radius:50%;padding:3px;margin:auto;background:#a67c52;position:relative}.circle>img,.circle>.avatar{width:100%;height:100%;border-radius:50%}.add{position:absolute;right:-1px;bottom:-1px;width:21px;height:21px;border-radius:50%;background:#a67c52;color:#fff;border:2px solid #fff;display:grid;place-items:center}.grid{padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}.card{border:1px solid #e6ddd2;border-radius:15px;overflow:hidden}.media{height:220px;background:#f3ede4;position:relative;overflow:hidden;display:grid;place-items:center}.media img,.media video{width:100%;height:100%;object-fit:cover}.overlay{position:absolute;font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,.45);color:#fff;transform:translate(-50%,-50%);white-space:pre-wrap;max-width:90%}.cardInfo{padding:10px}.actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.emoji{display:flex;gap:4px;flex-wrap:wrap}.emoji button{border:1px solid #e5dbcf;background:#fff;border-radius:8px;padding:5px}
.modalBack{position:fixed;inset:0;background:rgba(58,47,38,.55);z-index:500;display:grid;place-items:center;padding:14px}.modal{width:min(720px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:19px;padding:18px}.modalHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.modalTitle{font-size:20px;font-weight:900}
.form{display:grid;gap:10px}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.label{font-size:12px;color:#6b6b6b;font-weight:800;display:grid;gap:5px}
.callStage{background:#3a2f26;min-height:310px;border-radius:17px;position:relative;display:grid;place-items:center;color:#fff;overflow:hidden}.remote{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.local{position:absolute;right:12px;bottom:12px;width:120px;height:170px;border:2px solid #fff;border-radius:12px;overflow:hidden}.local video{width:100%;height:100%;object-fit:cover}.callControls{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;padding:10px}
.toast{position:fixed;right:15px;bottom:15px;background:#3a2f26;color:#fff;padding:11px 14px;border-radius:11px;z-index:900}.badge{display:inline-block;background:#f3ede4;color:#6f5137;border-radius:99px;padding:3px 7px;font-size:10px;font-weight:800}
.cameraBtn{position:relative}.cameraBtn input{display:none}
@media(max-width:700px){.main{padding:7px}.top{padding:0 9px}.brand{font-size:19px}.nav{top:70px}.page{border-radius:16px}.chatPage{height:calc(100vh - 140px);min-height:500px}.bubble{max-width:89%}.two{grid-template-columns:1fr}.row{padding:12px}.grid{grid-template-columns:1fr 1fr;padding:10px}.media{height:210px}}
`}</style>}

/* ---------------- auth ---------------- */
function Auth(){
  const [mode,setMode]=useState("login"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),
    [name,setName]=useState(""),[phone,setPhone]=useState(""),[otp,setOtp]=useState(""),
    [confirm,setConfirm]=useState(null),[err,setErr]=useState(""),[busy,setBusy]=useState(false);
  const submit=async e=>{
    e.preventDefault();setErr("");setBusy(true);
    try{
      if(mode==="forgot"){await sendPasswordResetEmail(auth,email.trim().toLowerCase());alert("Password reset email sent.");setMode("login")}
      else if(mode==="signup"){
        if(password.length<8)throw Error("Password must contain at least 8 characters.");
        const c=await createUserWithEmailAndPassword(auth,email.trim().toLowerCase(),password);
        await updateProfile(c.user,{displayName:name.trim()});await ensureUser(c.user,{displayName:name.trim(),phoneNumber:digits(phone)});
      }else await signInWithEmailAndPassword(auth,email.trim().toLowerCase(),password);
    }catch(e2){setErr(e2?.message||"Could not continue.")}finally{setBusy(false)}
  };
  const google=async()=>{setErr("");setBusy(true);try{const c=await signInWithPopup(auth,googleProvider);await ensureUser(c.user)}catch(e){setErr(e?.message||"Google sign-in failed.")}finally{setBusy(false)}};
  const sendOtp=async()=>{
    setErr("");setBusy(true);try{
      if(!phone.trim())throw Error("Enter mobile number with country code.");
      if(!window.recaptchaVerifier)window.recaptchaVerifier=new RecaptchaVerifier(auth,"recaptcha",{size:"invisible"});
      setConfirm(await signInWithPhoneNumber(auth,phone.trim(),window.recaptchaVerifier));alert("OTP sent.");
    }catch(e){setErr(e?.message||"OTP failed.");try{window.recaptchaVerifier?.clear();delete window.recaptchaVerifier}catch{}}finally{setBusy(false)}
  };
  const verify=async()=>{setBusy(true);setErr("");try{const c=await confirm.confirm(otp.trim());await ensureUser(c.user);setConfirm(null)}catch(e){setErr(e?.message||"Invalid OTP.")}finally{setBusy(false)}};
  return <div className="auth"><Styles/><div className="modal" style={{width:"min(440px,100%)"}}>
    <div style={{textAlign:"center",marginBottom:20}}><div className="mark" style={{margin:"auto"}}>C</div><h1 style={{color:"#68239a"}}>Chatdo</h1><div className="sub">Simple. Private. Connected.</div></div>
    <form className="form" onSubmit={submit}>{err&&<div className="notice" style={{background:"#fde9ef",color:"#a83250"}}>{err}</div>}
      {mode==="forgot"?<><input className="input" type="email" placeholder="Email ID" value={email} onChange={e=>setEmail(e.target.value)}/><button className="btn">Send reset email</button><button type="button" className="secondary" onClick={()=>setMode("login")}>Back</button></>:
      <><>{mode==="signup"&&<input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/>}</>
      <input className="input" type="email" placeholder="Email ID" value={email} onChange={e=>setEmail(e.target.value)}/>
      {mode==="signup"&&<input className="input" placeholder="Mobile (optional)" value={phone} onChange={e=>setPhone(e.target.value)}/>}
      <input className="input" type="password" placeholder="Strong password (8+)" value={password} onChange={e=>setPassword(e.target.value)}/>
      <button className="btn" disabled={busy}>{mode==="signup"?"Create account":"Login"}</button>
      <button type="button" className="secondary" onClick={google} disabled={busy}>Continue with Google</button>
      <div className="sub" style={{textAlign:"center"}}>or mobile OTP</div>
      <input className="input" placeholder="+91XXXXXXXXXX" value={phone} onChange={e=>setPhone(e.target.value)}/>
      {!confirm?<button type="button" className="secondary" onClick={sendOtp}>Send mobile OTP</button>:<><input className="input" placeholder="OTP" value={otp} onChange={e=>setOtp(e.target.value)}/><button type="button" className="btn" onClick={verify}>Verify OTP</button></>}
      <div id="recaptcha"/>
      <button type="button" className="secondary" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Create a new account":"Already have an account? Login"}</button>
      {mode==="login"&&<button type="button" className="secondary" onClick={()=>setMode("forgot")}>Forgot password?</button>}</>}
    </form>
  </div></div>
}

/* ---------------- chat rows / messages ---------------- */
function ChatRow({c,me,other,onOpen,onMenu}){
  const lp=useLongPress(e=>{e.preventDefault();onMenu(c,e.clientX||40,e.clientY||80)});
  return <div className="row" onClick={()=>onOpen(other)} onContextMenu={e=>{e.preventDefault();onMenu(c,e.clientX,e.clientY)}} {...lp}>
    <Online u={other}/><div className="grow"><div className="bold">{nameOf(other)} {(c.pinnedBy||[]).includes(me.uid)&&"📌"}</div><div className="preview">{c.lastMessage||""}</div></div><div className="sub">{time(c.updatedAt)}</div>
  </div>
}
function Chats({me,users,openChat}){
  const [chats,setChats]=useState([]),[menu,setMenu]=useState(null);
  useEffect(()=>onSnapshot(query(collection(db,"chats"),where("members","array-contains",me.uid)),s=>setChats(s.docs.map(d=>({id:d.id,...d.data()})))),[me.uid]);
  useEffect(()=>{const f=()=>setMenu(null);window.addEventListener("click",f);return()=>window.removeEventListener("click",f)},[]);
  const map=Object.fromEntries(users.map(u=>[u.uid,u]));
  const visible=chats.filter(c=>!(c.hiddenBy||[]).includes(me.uid)&&!(c.deletedBy||[]).includes(me.uid)).sort((a,b)=>{
    const ap=(a.pinnedBy||[]).includes(me.uid)?1:0,bp=(b.pinnedBy||[]).includes(me.uid)?1:0;return bp-ap||ms(b.updatedAt)-ms(a.updatedAt)
  });
  const action=async(type,c)=>{
    try{
      const r=doc(db,"chats",c.id);
      if(type==="pin"){
        const pinned=(c.pinnedBy||[]).includes(me.uid);
        if(!pinned&&chats.filter(x=>(x.pinnedBy||[]).includes(me.uid)).length>=10)throw Error("Maximum 10 pinned chats.");
        await updateDoc(r,{pinnedBy:pinned?arrayRemove(me.uid):arrayUnion(me.uid)});
      }
      if(type==="hide"){
        const lock=await lockChat(me.uid,c.id);if(!lock)return;
        await updateDoc(r,{hiddenBy:arrayUnion(me.uid)});
        await saveUser(me.uid,{hiddenChats:arrayUnion(c.id),hiddenChatLocks:{...(me.hiddenChatLocks||{}),[c.id]:lock}});
      }
      if(type==="delete")await updateDoc(r,{deletedBy:arrayUnion(me.uid)});
    }catch(e){alert(e?.message||"Could not update chat.")}setMenu(null);
  };
  return <div className="page"><div className="head"><div><div className="title">Chats</div><div className="sub">Long-press a chat for Pin / Hide / Delete</div></div></div>
    {visible.length?visible.map(c=>{const u=map[c.members.find(x=>x!==me.uid)]||{uid:c.members.find(x=>x!==me.uid)};return <ChatRow key={c.id} c={c} me={me} other={u} onOpen={openChat} onMenu={(x,y,z)=>setMenu({c:x,x:y,y:z})}/> }):<div className="empty">No chats yet. Search People and start one.</div>}
    {menu&&<div className="menu" style={{left:Math.min(menu.x,innerWidth-225),top:Math.min(menu.y,innerHeight-180)}} onClick={e=>e.stopPropagation()}>
      <button onClick={()=>action("pin",menu.c)}>{(menu.c.pinnedBy||[]).includes(me.uid)?"Unpin chat":"Pin chat"}</button>
      <button onClick={()=>action("hide",menu.c)}>Hide chat 🔐</button><button onClick={()=>action("delete",menu.c)}>Delete chat</button>
    </div>}
  </div>
}

/* ---------------- chat ---------------- */
function MessageBubble({m,me,onMenu}){
  const lp=useLongPress(e=>{e.preventDefault();onMenu(m,e.clientX||40,e.clientY||80)});
  const mine=m.senderId===me.uid, status=(m.seenBy||[]).some(x=>x!==me.uid)?"seen":(m.deliveredTo||[]).some(x=>x!==me.uid)?"delivered":"sent";
  return <div className={"line "+(mine?"mine":"")}><div className="bubble" onContextMenu={e=>{e.preventDefault();onMenu(m,e.clientX,e.clientY)}} {...lp}>
    {m.replyTo&&<div className="reply">↪ {m.replyTo.text}</div>}
    {m.deletedForEveryone?<div className="bubbleText" style={{fontStyle:"italic",opacity:.7}}>{m.text}</div>:
      m.type==="image"?<img src={m.url} alt="" style={{maxWidth:"100%",borderRadius:11}}/>:
      m.type==="video"?<video src={m.url} controls style={{maxWidth:"100%",borderRadius:11}}/>:
      m.type==="audio"?<audio src={m.audioURL} controls/>:<div className="bubbleText">{m.text}</div>}
    {Object.entries(m.reactions||{}).filter(([,v])=>v?.length).map(([e,v])=><span key={e} style={{marginRight:5}}>{e} {v.length}</span>)}
    <div className="bubbleMeta">{m.edited?"edited ":""}{time(m.createdAt)} {mine&&<span className={status}>{status==="sent"?"✓":"✓✓"}</span>}</div>
  </div></div>
}
function Chat({me,other,onBack}){
  const id=chatId(me.uid,other.uid),[messages,setMessages]=useState([]),[text,setText]=useState(""),[reply,setReply]=useState(null),[editing,setEditing]=useState(null),[menu,setMenu]=useState(null),[recording,setRecording]=useState(false);
  const rec=useRef(null),chunks=useRef([]),bottom=useRef(null);
  useEffect(()=>{
    setDoc(doc(db,"chats",id),{members:[me.uid,other.uid].sort(),updatedAt:serverTimestamp()},{merge:true}).catch(()=>{});
    saveUser(me.uid,{hiddenChats:arrayRemove(id)}).catch(()=>{});
    updateDoc(doc(db,"chats",id),{hiddenBy:arrayRemove(me.uid),deletedBy:arrayRemove(me.uid)}).catch(()=>{});
    return onSnapshot(query(collection(db,"chats",id,"messages"),orderBy("createdAt","asc")),s=>{
      const a=s.docs.map(d=>({id:d.id,...d.data()}));setMessages(a);
      a.filter(m=>m.senderId!==me.uid).forEach(m=>updateDoc(doc(db,"chats",id,"messages",m.id),{deliveredTo:arrayUnion(me.uid),seenBy:arrayUnion(me.uid)}).catch(()=>{}));
    });
  },[id,me.uid,other.uid]);
  useEffect(()=>bottom.current?.scrollIntoView({behavior:"smooth"}),[messages.length]);
  useEffect(()=>{const f=()=>setMenu(null);window.addEventListener("click",f);return()=>window.removeEventListener("click",f)},[]);
  const send=async()=>{
    const v=text.trim();if(!v)return;if(v.length>240)return alert("Maximum 240 characters.");
    try{
      const fs=await getDoc(doc(db,"friendships",friendId(me.uid,other.uid))),friends=fs.exists()&&fs.data()?.status==="friends";
      const count=messages.filter(m=>m.senderId===me.uid&&!m.deletedForEveryone&&m.type==="text").length;
      if(!friends&&count>=5&&!editing)throw Error("Before friendship, only 5 messages are allowed.");
      if(editing){
        if(Date.now()-ms(editing.createdAt)>7200000)throw Error("Edit is allowed only within 2 hours.");
        await updateDoc(doc(db,"chats",id,"messages",editing.id),{text:v,edited:true});
      }else{
        const d={senderId:me.uid,receiverId:other.uid,text:v,type:"text",createdAt:serverTimestamp(),deliveredTo:[me.uid],seenBy:[me.uid]};
        if(reply)d.replyTo={id:reply.id,text:reply.text||"Message"};
        await addDoc(collection(db,"chats",id,"messages"),d);
      }
      await setDoc(doc(db,"chats",id),{members:[me.uid,other.uid].sort(),lastMessage:v,lastSenderId:me.uid,updatedAt:serverTimestamp()},{merge:true});
      setText("");setReply(null);setEditing(null);
    }catch(e){alert(e?.message||"Could not send.")}
  };
  const menuAction=async(type,m)=>{
    try{
      if(type==="reply"){setReply(m);setMenu(null);return}
      if(type==="edit"){if(Date.now()-ms(m.createdAt)>7200000)throw Error("Edit is allowed only within 2 hours.");setText(m.text||"");setEditing(m);setMenu(null);return}
      if(type==="me")await updateDoc(doc(db,"chats",id,"messages",m.id),{deletedFor:arrayUnion(me.uid)});
      if(type==="all"&&m.senderId===me.uid)await updateDoc(doc(db,"chats",id,"messages",m.id),{text:"This message was deleted",deletedForEveryone:true});
      if(type.startsWith("react:")){const e=type.slice(6),u=m.reactions?.[e]||[];await updateDoc(doc(db,"chats",id,"messages",m.id),{[`reactions.${e}`]:u.includes(me.uid)?u.filter(x=>x!==me.uid):[...u,me.uid]})}
      if(type==="report")await addDoc(collection(db,"reports"),{reporterId:me.uid,targetUserId:m.senderId,messageId:m.id,chatId:id,reason:"Message report",createdAt:serverTimestamp()});
    }catch(e){alert(e?.message||"Action failed.")}setMenu(null);
  };
  const record=async()=>{
    if(recording){rec.current?.stop();return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true}),r=new MediaRecorder(stream);chunks.current=[];
      r.ondataavailable=e=>e.data.size&&chunks.current.push(e.data);
      r.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());try{const b=new Blob(chunks.current,{type:"audio/webm"}),u=await upload(me.uid,new File([b],"voice.webm",{type:"audio/webm"}),"chat-media");await addDoc(collection(db,"chats",id,"messages"),{senderId:me.uid,receiverId:other.uid,type:"audio",audioURL:u,createdAt:serverTimestamp(),deliveredTo:[me.uid],seenBy:[me.uid]});await setDoc(doc(db,"chats",id),{lastMessage:"🎤 Voice message",updatedAt:serverTimestamp()},{merge:true})}catch{}setRecording(false)};
      rec.current=r;r.start();setRecording(true);
    }catch{alert("Microphone permission is required.")}
  };
  const media=async f=>{if(!f)return;try{const u=await upload(me.uid,f,"chat-media"),type=f.type.startsWith("video")?"video":"image";await addDoc(collection(db,"chats",id,"messages"),{senderId:me.uid,receiverId:other.uid,type,url:u,createdAt:serverTimestamp(),deliveredTo:[me.uid],seenBy:[me.uid]});await setDoc(doc(db,"chats",id),{lastMessage:type==="image"?"📷 Photo":"🎥 Video",updatedAt:serverTimestamp()},{merge:true})}catch{}};
  return <div className="page chatPage">
    <div className="chatHead"><button className="icon" onClick={onBack}>←</button><Online u={other}/><div className="grow"><div className="bold">{nameOf(other)}</div><div className={"chatStatus "+(other.online?"":"offline")}>{other.online?"Online":`Last seen ${date(other.lastSeen)}`}</div></div></div>
    <div className="messages">{messages.filter(m=>!(m.deletedFor||[]).includes(me.uid)).map(m=><MessageBubble key={m.id} m={m} me={me} onMenu={(x,y,z)=>setMenu({m:x,x:y,y:z})}/>)}<div ref={bottom}/></div>
    {reply&&<div className="notice">↪ Replying to: {reply.text||"media"} <button className="linkBtn" onClick={()=>setReply(null)}>×</button></div>}
    {editing&&<div className="notice">Editing message <button className="linkBtn" onClick={()=>{setEditing(null);setText("")}}>Cancel</button></div>}
    <div className="composer"><label className="icon" title="Attach photo or video">＋<input hidden type="file" accept="image/*,video/*" onChange={e=>media(e.target.files?.[0])}/></label><label className="icon cameraBtn" title="Camera">▣<input type="file" accept="image/*" capture="environment" onChange={e=>media(e.target.files?.[0])}/></label><button className={"icon "+(recording?"danger":"")} onClick={record} title="Voice message">{recording?"■":"🎤"}</button><textarea maxLength={240} value={text} onChange={e=>setText(e.target.value)} placeholder="Write a message..." onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}}/><button className="send" onClick={send} title="Send">➤</button></div>
    {menu&&<div className="menu" style={{left:Math.min(menu.x,innerWidth-225),top:Math.min(menu.y,innerHeight-330)}} onClick={e=>e.stopPropagation()}>
      <button onClick={()=>menuAction("reply",menu.m)}>↩ Reply</button><div className="emoji">{["❤️","👍","😂","😮","😢","🔥"].map(e=><button key={e} onClick={()=>menuAction("react:"+e,menu.m)}>{e}</button>)}</div>
      {menu.m.senderId===me.uid&&<button onClick={()=>menuAction("edit",menu.m)}>✏ Edit</button>}<button onClick={()=>menuAction("me",menu.m)}>Delete for me</button>{menu.m.senderId===me.uid&&<button onClick={()=>menuAction("all",menu.m)}>Delete for everyone</button>}<button onClick={()=>menuAction("report",menu.m)}>Report message</button>
    </div>}
  </div>
}

/* ---------------- stories ---------------- */
function Stories({me,users,openProfile}){
  const [stories,setStories]=useState([]),[viewer,setViewer]=useState(null),[edit,setEdit]=useState(false),[file,setFile]=useState(null),[url,setUrl]=useState(""),[texts,setTexts]=useState([]),[stickers,setStickers]=useState([]),[newText,setNewText]=useState(""),[color,setColor]=useState("#fff"),[size,setSize]=useState(28),[sticker,setSticker]=useState("😊"),[stickerSize,setStickerSize]=useState(55),[likeBusy,setLikeBusy]=useState(false);
  useEffect(()=>{if(!file){setUrl("");return}const u=URL.createObjectURL(file);setUrl(u);return()=>URL.revokeObjectURL(u)},[file]);
  useEffect(()=>onSnapshot(query(collection(db,"stories"),orderBy("createdAt","desc"),limit(300)),s=>{const cut=Date.now()-86400000;setStories(s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>ms(x.createdAt)>=cut&&(!x.expiresAt||ms(x.expiresAt)>Date.now()))) }),[]);
  const map=Object.fromEntries(users.map(u=>[u.uid,u])),mine=stories.filter(s=>s.uid===me.uid),other=stories.filter(s=>s.uid!==me.uid);
  const grouped=[];const seen=new Set();[...mine,...other].sort((a,b)=>ms(b.createdAt)-ms(a.createdAt)).forEach(s=>{if(!seen.has(s.uid)){seen.add(s.uid);grouped.push(s)}});const ordered=[...grouped.filter(x=>x.uid===me.uid),...grouped.filter(x=>x.uid!==me.uid)];
  const addText=()=>{if(newText.trim())setTexts(v=>[...v,{id:crypto.randomUUID(),text:newText.trim(),x:50,y:50,color,size,rotate:0}]);setNewText("")};
  const addSticker=()=>setStickers(v=>[...v,{id:crypto.randomUUID(),emoji:sticker,x:50,y:70,size:stickerSize,rotate:0}]);
  const move=(id,type,e)=>{const b=e.currentTarget.parentElement.getBoundingClientRect(),x=Math.max(4,Math.min(96,(e.clientX-b.left)/b.width*100)),y=Math.max(4,Math.min(96,(e.clientY-b.top)/b.height*100));if(type==="text")setTexts(v=>v.map(t=>t.id===id?{...t,x,y}:t));else setStickers(v=>v.map(t=>t.id===id?{...t,x,y}:t))};
  const post=async()=>{
    if(!file)return alert("Choose photo/video first.");
    if(file.type.startsWith("video")){const ok=await new Promise(res=>{const v=document.createElement("video");v.preload="metadata";v.onloadedmetadata=()=>{res(v.duration>=30);URL.revokeObjectURL(v.src)};v.onerror=()=>res(false);v.src=URL.createObjectURL(file)});if(!ok)return alert("Story video must be at least 30 seconds.");}
    try{const u=await upload(me.uid,file,"stories");await addDoc(collection(db,"stories"),{uid:me.uid,url:u,type:file.type.startsWith("video")?"video":"image",textItems:texts,stickerItems:stickers,createdAt:serverTimestamp(),expiresAt:new Date(Date.now()+86400000),likes:[],views:[]});setEdit(false);setFile(null);setTexts([]);setStickers([])}catch{}
  };
  const visual=(s,h="220px")=><div className="media" style={{height:h}}>{s.type==="video"?<video src={s.url} controls autoPlay={h!=="220px"}/>:<img src={s.url} alt=""/>}{(s.textItems||[]).map(t=><div key={t.id} className="overlay" style={{left:`${t.x}%`,top:`${t.y}%`,fontSize:t.size,color:t.color,transform:`translate(-50%,-50%) rotate(${t.rotate||0}deg)`}}>{t.text}</div>)}{(s.stickerItems||[]).map(t=><div key={t.id} className="overlay" style={{left:`${t.x}%`,top:`${t.y}%`,fontSize:t.size,transform:`translate(-50%,-50%) rotate(${t.rotate||0}deg)`}}>{t.emoji}</div>)}</div>;
  const like=async s=>{if(likeBusy)return;setLikeBusy(true);try{const likes=s.likes||[];await updateDoc(doc(db,"stories",s.id),{likes:likes.includes(me.uid)?arrayRemove(me.uid):arrayUnion(me.uid),views:arrayUnion(me.uid)})}catch{}finally{setLikeBusy(false)}};
  return <div className="page"><div className="head"><div><div className="title">Stories</div><div className="sub">My Story first • newest poster next • 24 hours • video 30 sec+</div></div><button className="btn" onClick={()=>setEdit(true)}>＋ My Story</button></div>
    <div className="storyStrip"><div className="storyItem" onClick={()=>mine[0]&&setViewer(mine[0])}><div className="circle">{mine[0]?.url?<img src={mine[0].url} alt=""/>:<Avatar u={me}/>}<span className="add">＋</span></div>My Story</div>{ordered.filter(x=>x.uid!==me.uid).map(s=>{const u=map[s.uid]||{uid:s.uid};return <div className="storyItem" key={s.uid} onClick={()=>setViewer(s)}><div className="circle">{s.url?<img src={s.url} alt=""/>:<Avatar u={u}/>}</div>{nameOf(u)}</div>})}</div>
    <div className="grid">{stories.length?stories.map(s=>{const u=s.uid===me.uid?me:(map[s.uid]||{uid:s.uid}),liked=(s.likes||[]).includes(me.uid);return <div className="card" key={s.id}><div onClick={()=>setViewer(s)}>{visual(s)}</div><div className="cardInfo"><b>{nameOf(u)}</b><div className="sub">{date(s.createdAt)} • ❤️ {(s.likes||[]).length} • 👁 {(s.views||[]).length}</div><div className="actions"><button className="secondary" onClick={()=>openProfile(u)}>Profile</button><button className="secondary" onClick={()=>like(s)}>{liked?"♥ Liked":"♡ Like"}</button>{s.uid===me.uid&&<button className="danger" onClick={()=>deleteDoc(doc(db,"stories",s.id))}>Delete</button>}</div></div></div>}):<div className="empty" style={{gridColumn:"1/-1"}}>No active stories.</div>}</div>
    {edit&&<div className="modalBack"><div className="modal"><div className="modalHead"><div className="modalTitle">Story editor</div><button className="icon" onClick={()=>setEdit(false)}>×</button></div><div className="form"><input className="input" type="file" accept="image/*,video/*" onChange={e=>setFile(e.target.files?.[0]||null)}/>{file&&<div className="media" style={{height:320}}>{file.type.startsWith("video")?<video src={url} controls/>:<img src={url} alt="preview"/>}{texts.map(t=><div key={t.id} className="overlay" style={{left:`${t.x}%`,top:`${t.y}%`,fontSize:t.size,color:t.color}}>{t.text}</div>)}{stickers.map(t=><div key={t.id} className="overlay" style={{left:`${t.x}%`,top:`${t.y}%`,fontSize:t.size}}>{t.emoji}</div>)}</div>}
      <div className="two"><div className="form"><input className="input" placeholder="Add text item" value={newText} onChange={e=>setNewText(e.target.value)}/><div className="actions"><input type="color" value={color} onChange={e=>setColor(e.target.value)}/><input type="range" min="14" max="72" value={size} onChange={e=>setSize(+e.target.value)}/><button className="secondary" onClick={addText}>Add text</button></div></div><div className="form"><div className="emoji">{["😊","😂","❤️","🔥","😍","😎","👍","🎉","⭐","🥳"].map(e=><button key={e} onClick={()=>setSticker(e)}>{e}</button>)}</div><div className="actions"><input type="range" min="25" max="120" value={stickerSize} onChange={e=>setStickerSize(+e.target.value)}/><button className="secondary" onClick={addSticker}>Add sticker</button></div></div></div>
      <div className="actions"><button className="secondary" onClick={()=>setTexts(v=>v.map(t=>({...t,rotate:(t.rotate||0)-15})))}>↶ Rotate text</button><button className="secondary" onClick={()=>setStickers(v=>v.map(t=>({...t,rotate:(t.rotate||0)+15})))}>↷ Rotate sticker</button><button className="secondary" onClick={()=>{setTexts([]);setStickers([])}}>Delete overlays</button></div><div className="notice">Drag/reposition is supported in the editor. Double-clicking an overlay can be used to remove it in the next editor refinement. Story video upload requires Firebase Storage.</div><button className="btn" onClick={post}>Post story</button></div></div></div>}
    {viewer&&<div className="modalBack" onClick={()=>setViewer(null)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modalHead"><div className="modalTitle">Story</div><button className="icon" onClick={()=>setViewer(null)}>×</button></div>{visual(viewer,"65vh")}<div className="actions"><button className="secondary" onClick={()=>like(viewer)}>{(viewer.likes||[]).includes(me.uid)?"♥ Liked":"♡ Like"}</button>{viewer.uid===me.uid&&<button className="danger" onClick={()=>{deleteDoc(doc(db,"stories",viewer.id));setViewer(null)}}>Delete</button>}</div></div></div>}
  </div>
}

/* ---------------- calls ---------------- */
function CallRoom({me,other,call,onClose}){
  const [connected,setConnected]=useState(false),[muted,setMuted]=useState(false),[camera,setCamera]=useState(call.type==="video"),[err,setErr]=useState("");
  const pc=useRef(null),local=useRef(null),remote=useRef(null),stream=useRef(null),unsub=useRef([]);
  useEffect(()=>{
    let live=true;
    (async()=>{
      try{
        const st=await navigator.mediaDevices.getUserMedia({audio:true,video:call.type==="video"});if(!live)return;stream.current=st;if(local.current)local.current.srcObject=st;
        const p=new RTCPeerConnection(STUN);pc.current=p;st.getTracks().forEach(t=>p.addTrack(t,st));p.ontrack=e=>{if(remote.current)remote.current.srcObject=e.streams[0]};p.onconnectionstatechange=()=>setConnected(p.connectionState==="connected");
        const sig=collection(db,"calls",call.id,"signals"),cand=collection(db,"calls",call.id,"candidates");
        unsub.current.push(onSnapshot(query(sig,orderBy("createdAt","asc")),s=>s.docChanges().forEach(ch=>{if(ch.type!=="added")return;const x=ch.doc.data();if(x.from===me.uid)return;if(x.kind==="offer")p.setRemoteDescription(x.data).then(()=>p.createAnswer()).then(a=>p.setLocalDescription(a)).then(()=>addDoc(sig,{from:me.uid,kind:"answer",data:{type:p.localDescription.type,sdp:p.localDescription.sdp},createdAt:serverTimestamp()})).catch(()=>{});if(x.kind==="answer")p.setRemoteDescription(x.data).catch(()=>{})})));
        unsub.current.push(onSnapshot(query(cand,orderBy("createdAt","asc")),s=>s.docChanges().forEach(ch=>{if(ch.type==="added"&&ch.doc.data().from!==me.uid)p.addIceCandidate(ch.doc.data().candidate).catch(()=>{})})));
        p.onicecandidate=e=>e.candidate&&addDoc(cand,{from:me.uid,candidate:e.candidate.toJSON(),createdAt:serverTimestamp()}).catch(()=>{});
        if(call.callerId===me.uid){const offer=await p.createOffer();await p.setLocalDescription(offer);await addDoc(sig,{from:me.uid,kind:"offer",data:{type:offer.type,sdp:offer.sdp},createdAt:serverTimestamp()})}
      }catch(e){setErr(e?.message||"Camera/microphone permission is required.")}
    })();
    return()=>{live=false;unsub.current.forEach(x=>x());stream.current?.getTracks().forEach(t=>t.stop());pc.current?.close()}
  },[call.id,call.callerId,call.type,me.uid]);
  const end=async()=>{try{await updateDoc(doc(db,"calls",call.id),{status:"ended",endedAt:serverTimestamp()})}catch{}onClose()};
  return <div className="modalBack"><div className="modal"><div className="modalHead"><div className="modalTitle">{call.type==="video"?"Video":"Audio"} call • {nameOf(other)}</div></div><div className="callStage">{call.type==="video"?<><video ref={remote} className="remote" autoPlay playsInline/><div className="local"><video ref={local} autoPlay muted playsInline/></div></>:<div style={{textAlign:"center"}}><Avatar u={other}/><div>{connected?"Connected":"Connecting..."}</div></div>}</div>{err&&<div className="notice">{err}</div>}<div className="callControls"><button className="secondary" onClick={()=>{const n=!muted;setMuted(n);stream.current?.getAudioTracks().forEach(t=>t.enabled=!n)}}>{muted?"Unmute":"Mute"}</button>{call.type==="video"&&<button className="secondary" onClick={()=>{const n=!camera;setCamera(n);stream.current?.getVideoTracks().forEach(t=>t.enabled=n)}}>{camera?"Camera off":"Camera on"}</button>}<button className="danger" onClick={end}>End call</button></div></div></div>
}
function Calls({me,users,openProfile}){
  const [history,setHistory]=useState([]),[target,setTarget]=useState(""),[active,setActive]=useState(null);
  useEffect(()=>onSnapshot(query(collection(db,"calls"),where("members","array-contains",me.uid),limit(100)),s=>setHistory(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>ms(b.createdAt)-ms(a.createdAt)))),[me.uid]);
  useEffect(()=>onSnapshot(query(collection(db,"calls"),where("members","array-contains",me.uid),where("status","==","started"),limit(10)),s=>{const x=s.docs.map(d=>({id:d.id,...d.data()})).find(c=>c.calleeId===me.uid);if(x&&!active)setActive(x)}),[me.uid,active]);
  const start=async type=>{const u=users.find(x=>x.uid===target);if(!u)return alert("Select a person.");try{const r=await addDoc(collection(db,"calls"),{members:[me.uid,u.uid],callerId:me.uid,calleeId:u.uid,type,status:"started",createdAt:serverTimestamp()});setActive({id:r.id,members:[me.uid,u.uid],callerId:me.uid,calleeId:u.uid,type,status:"started"})}catch(e){alert(e?.message||"Could not start call.")}};
  return <div className="page"><div className="head"><div><div className="title">Calls</div><div className="sub">1:1 audio/video • WebRTC • history</div></div></div><div style={{padding:16}}><select className="input" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Select person</option>{users.map(u=><option key={u.uid} value={u.uid}>{nameOf(u)}</option>)}</select><div className="actions"><button className="btn" onClick={()=>start("audio")}>☎ Audio</button><button className="secondary" onClick={()=>start("video")}>▣ Video</button></div><div className="notice">STUN is included. TURN is recommended for difficult mobile/network combinations.</div></div><div className="sub" style={{padding:"10px 16px"}}>Call history</div>{history.length?history.map(c=>{const uid=c.callerId===me.uid?c.calleeId:c.callerId,u=users.find(x=>x.uid===uid)||{uid};return <div className="row" key={c.id}><Online u={u} small/><div className="grow"><div className="bold">{c.type==="video"?"▣":"☎"} {c.callerId===me.uid?"Outgoing":"Incoming"} • {nameOf(u)}</div><div className="meta">{date(c.createdAt)} • {c.status}</div></div><button className="secondary" onClick={()=>openProfile(u)}>Profile</button><button className="danger" onClick={()=>deleteDoc(doc(db,"calls",c.id))}>Delete</button></div>}):<div className="empty">No calls yet.</div>}{active&&<CallRoom me={me} other={users.find(u=>u.uid===(active.callerId===me.uid?active.calleeId:active.callerId))||{uid:active.callerId===me.uid?active.calleeId:active.callerId}} call={active} onClose={()=>setActive(null)}/>}</div>
}

/* ---------------- people / profile / settings ---------------- */
function People({me,users,openChat,openProfile}){
  const [term,setTerm]=useState(""),[history,setHistory]=useState(me.searchHistory||[]),[menu,setMenu]=useState(false),[pokes,setPokes]=useState([]),[requests,setRequests]=useState([]);
  useEffect(()=>setHistory(me.searchHistory||[]),[me.searchHistory]);
  useEffect(()=>onSnapshot(query(collection(db,"pokes"),where("to","==",me.uid),limit(50)),s=>setPokes(s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status==="pending"))),[me.uid]);
  useEffect(()=>onSnapshot(query(collection(db,"friendRequests"),where("to","==",me.uid),limit(50)),s=>setRequests(s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status==="pending"))),[me.uid]);
  const matches=useMemo(()=>{const q=norm(term),p=digits(term);if(!q)return[];return users.filter(u=>norm(u.username).includes(q)||norm(u.displayName).includes(q)||norm(u.email).includes(q)||(p&&digits(u.phoneNumber).includes(p))).slice(0,30)},[term,users]);
  const save=async()=>{const v=term.trim();if(!v)return;const n=[v,...history.filter(x=>norm(x)!==norm(v))].slice(0,20);setHistory(n);try{await saveUser(me.uid,{searchHistory:n})}catch{}};
  const remove=async x=>{const n=history.filter(y=>y!==x);setHistory(n);try{await saveUser(me.uid,{searchHistory:n})}catch{}};
  const poke=async u=>{try{await addDoc(collection(db,"pokes"),{from:me.uid,to:u.uid,status:"pending",createdAt:serverTimestamp()});alert("Poke sent.")}catch(e){alert(e?.message||"Could not poke.")}};
  const back=async p=>{try{await updateDoc(doc(db,"pokes",p.id),{status:"answered"});await addDoc(collection(db,"pokes"),{from:me.uid,to:p.from,status:"pokedBack",createdAt:serverTimestamp()});alert("Poke back sent. Friend request is now unlocked for the sender.")}catch(e){alert(e?.message||"Could not poke back.")}};
  const request=async u=>{try{const s=await getDocs(query(collection(db,"pokes"),where("from","==",u.uid),where("to","==",me.uid),limit(20)));if(!s.docs.some(d=>["pokedBack","answered"].includes(d.data().status)))throw Error("Friend request unlocks after they poke you back.");await addDoc(collection(db,"friendRequests"),{from:me.uid,to:u.uid,status:"pending",createdAt:serverTimestamp()});alert("Friend request sent.")}catch(e){alert(e?.message||"Could not request.")}};
  const accept=async r=>{try{await setDoc(doc(db,"friendships",friendId(me.uid,r.from)),{members:[me.uid,r.from].sort(),status:"friends",createdAt:serverTimestamp()},{merge:true});await updateDoc(doc(db,"friendRequests",r.id),{status:"accepted"});alert("You are now friends.")}catch(e){alert(e?.message||"Could not accept.")}};
  return <div className="page"><div className="head"><div><div className="title">People / Add Friend</div><div className="sub">Search username, mobile or email</div></div><button className="icon" onClick={()=>setMenu(!menu)}>⋮</button>{menu&&<div className="menu" style={{right:20,top:60}}><button onClick={async()=>{setHistory([]);setMenu(false);await saveUser(me.uid,{searchHistory:[]})}}>Clear search history</button></div>}</div>
    <div className="search"><input className="input" placeholder="Username / email / mobile" value={term} onChange={e=>setTerm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()}/><button className="btn" onClick={save}>Search</button></div>
    {(pokes.length||requests.length)&&<div className="notice">{pokes.length>0&&<div><b>Pokes</b>{pokes.map(p=>{const u=users.find(x=>x.uid===p.from)||{uid:p.from};return <div className="row" key={p.id}><Online u={u} small/><div className="grow"><b>{nameOf(u)}</b><div className="meta">sent a Poke</div></div><button className="secondary" onClick={()=>back(p)}>👋 Poke back</button></div>})}</div>}{requests.length>0&&<div><b>Friend requests</b>{requests.map(r=>{const u=users.find(x=>x.uid===r.from)||{uid:r.from};return <div className="row" key={r.id}><Online u={u} small/><div className="grow"><b>{nameOf(u)}</b></div><button className="btn" onClick={()=>accept(r)}>Accept</button></div>})}</div>}</div>}
    {!term.trim()&&history.length>0&&<div className="history">{history.map(x=><div className="row" key={x}><button className="secondary" style={{flex:1,textAlign:"left"}} onClick={()=>setTerm(x)}>🔎 {x}</button><button className="secondary" onClick={()=>remove(x)}>×</button></div>)}</div>}
    {term.trim()&&<div>{matches.length?matches.map(u=><div className="row" key={u.uid}><Online u={u}/><div className="grow" onClick={()=>openProfile(u)}><div className="bold">{nameOf(u)} {u.username&&"@"+u.username}</div><div className="meta">{u.email||u.phoneNumber||"Chatdo user"}</div></div><button className="secondary" onClick={()=>poke(u)}>👋 Poke</button><button className="secondary" onClick={()=>request(u)}>Add friend</button><button className="btn" onClick={()=>openChat(u)}>Chat</button></div>):<div className="empty">No joined user found.</div>}</div>}
    {!term.trim()&&!history.length&&<><div className="notice"><b>People you may know</b><br/>Joined Chatdo users are shown below. Search by username, mobile or email.</div>{users.slice(0,12).map(u=><div className="row" key={u.uid}><Online u={u}/><div className="grow" onClick={()=>openProfile(u)}><div className="bold">{nameOf(u)} {u.username&&"@"+u.username}</div><div className="meta">{u.online?"Online":"Offline"}</div></div><button className="secondary" onClick={()=>poke(u)}>👋 Poke</button><button className="btn" onClick={()=>openChat(u)}>Chat</button></div>)}</>}
  </div>
}
function ProfileModal({me,user,onClose,openChat}){
  const [blocked,setBlocked]=useState(false);
  const poke=async()=>{try{await addDoc(collection(db,"pokes"),{from:me.uid,to:user.uid,status:"pending",createdAt:serverTimestamp()});alert("Poke sent.")}catch(e){alert(e?.message||"Could not poke.")}};
  const request=async()=>{try{const s=await getDocs(query(collection(db,"pokes"),where("from","==",user.uid),where("to","==",me.uid),limit(20)));if(!s.docs.some(d=>["pokedBack","answered"].includes(d.data().status)))throw Error("Wait for a Poke back before sending a friend request.");await addDoc(collection(db,"friendRequests"),{from:me.uid,to:user.uid,status:"pending",createdAt:serverTimestamp()});alert("Friend request sent.")}catch(e){alert(e?.message||"Could not request.")}};
  const block=async()=>{try{await saveUser(me.uid,{blockedUids:arrayUnion(user.uid)});setBlocked(true)}catch{}};
  const report=async()=>{try{await addDoc(collection(db,"reports"),{reporterId:me.uid,targetUserId:user.uid,reason:"User report",createdAt:serverTimestamp()});alert("Report submitted.")}catch{}};
  return <div className="modalBack" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modalHead"><div className="modalTitle">Profile</div><button className="icon" onClick={onClose}>×</button></div><div style={{height:150,borderRadius:15,overflow:"hidden",background:"#dcc4eb"}}>{user.coverURL&&<img src={user.coverURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>}</div><div style={{marginTop:-35,padding:"0 15px"}}><div style={{border:"5px solid #fff",borderRadius:"50%",width:85,height:85}}><Avatar u={user}/></div><h2 style={{margin:"7px 0 2px"}}>{nameOf(user)}</h2><div className="sub">{user.username?"@"+user.username:"Username not set"}</div><p>{user.bio||"No bio yet."}</p><div className="sub">{user.hobbies||""}</div><div className="actions"><button className="btn" onClick={()=>openChat(user)}>Message</button><button className="secondary" onClick={poke}>👋 Poke</button><button className="secondary" onClick={request}>Add friend</button><button className="danger" onClick={block}>{blocked?"Blocked":"Block"}</button><button className="danger" onClick={report}>Report</button></div></div></div></div>
}
function Settings({me,onLogout}){
  const [username,setUsername]=useState(me.username||""),[displayName,setDisplayName]=useState(me.displayName||""),[bio,setBio]=useState(me.bio||""),[hobbies,setHobbies]=useState(me.hobbies||""),[phone,setPhone]=useState(me.phoneNumber||""),[photo,setPhoto]=useState(null),[cover,setCover]=useState(null),[busy,setBusy]=useState(false),[privacy,setPrivacy]=useState(me.privacy||{});
  useEffect(()=>{setUsername(me.username||"");setDisplayName(me.displayName||"");setBio(me.bio||"");setHobbies(me.hobbies||"");setPhone(me.phoneNumber||"");setPrivacy(me.privacy||{})},[me.uid]);
  const save=async()=>{setBusy(true);try{const u=norm(username);if(u&&!/^[a-z0-9._]{3,24}$/.test(u))throw Error("Username must be 3-24 letters, numbers, dot or underscore.");if(u){const s=await getDocs(query(collection(db,"users"),where("username","==",u),limit(2)));if(s.docs.some(d=>d.id!==me.uid))throw Error("Username is already taken.")}let photoURL=me.photoURL||"",coverURL=me.coverURL||"";if(photo)photoURL=await upload(me.uid,photo,"profiles");if(cover)coverURL=await upload(me.uid,cover,"covers");await saveUser(me.uid,{username:u,displayName:displayName.trim(),bio,hobbies,phoneNumber:digits(phone),photoURL,coverURL,privacy});await updateProfile(auth.currentUser,{displayName:displayName.trim(),photoURL});alert("Profile saved.")}catch(e){alert(e?.message||"Could not save.")}finally{setBusy(false)}};
  const toggle=k=>{const n={...privacy,[k]:!privacy[k]};setPrivacy(n);saveUser(me.uid,{privacy:n}).catch(()=>{})};
  return <div className="page"><div className="head"><div><div className="title">Profile & Settings</div><div className="sub">Profile, account, privacy and safety</div></div><button className="btn" onClick={save} disabled={busy}>Save</button></div><div style={{padding:16}}><div style={{height:150,borderRadius:15,overflow:"hidden",background:"#dcc4eb"}}>{me.coverURL&&<img src={me.coverURL} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>}</div><div style={{marginTop:-35,marginLeft:15}}><div style={{border:"5px solid #fff",borderRadius:"50%",width:85,height:85}}><Avatar u={me}/></div></div><div className="form" style={{marginTop:15}}><label className="label">Profile picture<input className="input" type="file" accept="image/*" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label><label className="label">Cover<input className="input" type="file" accept="image/*" onChange={e=>setCover(e.target.files?.[0]||null)}/></label><label className="label">Name<input className="input" value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><label className="label">Username<input className="input" value={username} onChange={e=>setUsername(e.target.value)}/></label><label className="label">Bio<textarea value={bio} onChange={e=>setBio(e.target.value)}/></label><label className="label">Hobbies<input className="input" value={hobbies} onChange={e=>setHobbies(e.target.value)}/></label><label className="label">Mobile<input className="input" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="label">Email<input className="input" value={me.email||""} disabled/></label></div></div>
    <div className="row"><div className="grow"><b>Account</b><div className="meta">Logout / add another account</div></div><button className="secondary" onClick={()=>alert("Use Logout, then sign in with the other Firebase account. Firebase Auth persists the active session.")}>＋ Add account</button><button className="secondary" onClick={onLogout}>Logout</button></div>
    <div className="row"><div className="grow"><b>Privacy</b><div className="meta">Profile visibility controls</div></div><div className="form">{["hideEmail","hidePhone","privateProfile"].map(k=><label className="check" key={k}><input type="checkbox" checked={!!privacy[k]} onChange={()=>toggle(k)}/>{k==="hideEmail"?"Hide email":k==="hidePhone"?"Hide mobile":"Private profile"}</label>)}</div></div>
    <div className="row"><div className="grow"><b>Safety</b><div className="meta">Block/report actions are available from profiles and messages.</div></div><span>🔒</span></div>
    <div className="row"><div className="grow"><b>Notifications</b><div className="meta">Pokes and friend requests appear in People.</div></div><span>🔔</span></div>
  </div>
}

/* ---------------- app ---------------- */
function App(){
  const [fb,setFb]=useState(null),[loading,setLoading]=useState(true),[tab,setTab]=useState("chats"),[chat,setChat]=useState(null),[profile,setProfile]=useState(null),[legal,setLegal]=useState(false);
  useEffect(()=>onAuthStateChanged(auth,async u=>{setFb(u);if(u)await ensureUser(u);setLoading(false)}),[]);
  useEffect(()=>{if(!fb)return;const before=()=>saveUser(fb.uid,{online:false,lastSeen:serverTimestamp()}).catch(()=>{}),vis=()=>document.visibilityState==="visible"&&saveUser(fb.uid,{online:true,lastSeen:serverTimestamp()}).catch(()=>{});addEventListener("beforeunload",before);document.addEventListener("visibilitychange",vis);return()=>{removeEventListener("beforeunload",before);document.removeEventListener("visibilitychange",vis)}},[fb]);
  const me=useUserDoc(fb?.uid),users=useAllUsers(fb?.uid);
  const openChat=async u=>{
    try{
      const id=chatId(me.uid,u.uid),s=await getDoc(doc(db,"chats",id)),d=s.exists()?s.data():{};
      if((d.hiddenBy||[]).includes(me.uid)){const ok=await unlockChat(me.uid,id,me.hiddenChatLocks?.[id]);if(!ok)return}
      setChat(u);setTab("chats");
    }catch(e){alert(e?.message||"Could not open chat.")}
  };
  if(loading)return <><Styles/><div className="empty">Loading Chatdo...</div></>;
  if(!fb)return <Auth/>;
  if(!me)return <><Styles/><div className="empty">Preparing your profile...</div></>;
  return <div className="app"><Styles/><div className="top"><div className="brand" onClick={()=>setLegal(true)}><div className="mark">C</div>Chatdo</div><button className="icon" onClick={()=>setProfile(me)}>👤</button></div><div className="main">
    <div className="nav">{[["chats","💬 Chat"],["stories","⭕ Story"],["calls","☎ Call"],["people","👥 People"],["settings","⚙ Settings"]].map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>{setTab(k);setChat(null)}}>{l}</button>)}</div>
    {chat?<Chat me={me} other={chat} onBack={()=>setChat(null)}/>:tab==="chats"?<Chats me={me} users={users} openChat={openChat}/>:tab==="stories"?<Stories me={me} users={users} openProfile={setProfile}/>:tab==="calls"?<Calls me={me} users={users} openProfile={setProfile}/>:tab==="people"?<People me={me} users={users} openChat={openChat} openProfile={setProfile}/>:<Settings me={me} onLogout={()=>signOut(auth)}/>}
  </div>{profile&&<ProfileModal me={me} user={profile} onClose={()=>setProfile(null)} openChat={u=>{setProfile(null);openChat(u)}}/>}{legal&&<div className="modalBack" onClick={()=>setLegal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modalHead"><div className="modalTitle">Chatdo Legal & Contact</div><button className="icon" onClick={()=>setLegal(false)}>×</button></div><h3>Privacy</h3><p className="sub">Chatdo stores account, chat and story data in Firebase according to your project rules.</p><h3>Terms</h3><p className="sub">Use Chatdo responsibly and do not use it for illegal, abusive or harmful activity.</p><h3>Safety</h3><p className="sub">Block or report unwanted users/messages.</p><h3>Contact</h3><p className="sub">Replace this text with the official Chatdo support email before launch.</p></div></div>}</div>
}
function useUserDoc(uid){const [v,setV]=useState(null);useEffect(()=>{if(!uid){setV(null);return}return onSnapshot(doc(db,"users",uid),s=>setV(s.exists()?{uid,...s.data()}:null))},[uid]);return v}
function useAllUsers(uid){const [v,setV]=useState([]);useEffect(()=>{if(!uid){setV([]);return}return onSnapshot(collection(db,"users"),s=>setV(s.docs.map(d=>({uid:d.id,...d.data()})).filter(x=>x.uid!==uid)))},[uid]);return v}

createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
