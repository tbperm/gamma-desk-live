// Static-viewer shim: serves /api/* from published JSON. Loaded only on the Pages copy.
// Freshness ("ring" mode, primary): the publisher pushes every 30s, clock-aligned, to branch r<win%12> (win = epoch//30) and
// stamps meta.json with win. 20s into each window we read raw/r<slot>/data/meta.json: that URL was last read >=360s ago, past
// the raw CDN max-age=300, so it is fresh; accept it only if meta.win matches. No GitHub API calls in this path.
// Fallback (off-hours / ring miss): poll the data branch ref via the API (60/hr unauthenticated; 304s count too) and read
// immutable raw/<sha>/ URLs; last resort the branch URL (CDN up to ~5 min behind).
(function(){
const OWN="tbperm/gamma-desk-live",RAWB="https://raw.githubusercontent.com/"+OWN+"/";
const BRANCH=RAWB+"data/data/",REF="https://api.github.com/repos/"+OWN+"/git/ref/heads/data";
const P=new URLSearchParams(location.search),SRC=P.get("src");
const key=u=>u==="/api/meta"?"meta.json":decodeURIComponent(u).replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"")+".json";
const orig=window.fetch.bind(window);let fails=0,lastErr="",SHA=null,mode="init",RB=null,MTS=0,MWIN=null,ringFails=0,polling=false,nextAt=0,cache={},ready,setReady;ready=new Promise(r=>setReady=r);
const HOT=30,RING=12,READY=20;
const base=()=>SRC||(mode==="ring"&&RB?RB:(SHA&&mode==="sha"?RAWB+SHA+"/data/":BRANCH));
async function tryWin(w){try{const r=await orig(RAWB+"r"+(((w%RING)+RING)%RING)+"/data/meta.json",{cache:"no-store"});if(!r.ok)return null;const m=await r.json();return m.win===w&&m.ts>MTS?m:null}catch(e){return null}}
async function ring(){const w=Math.floor((Date.now()/1000-READY)/HOT);let m=await tryWin(w);if(!m&&!RB)m=await tryWin(w-1);
 if(m){const first=!RB;RB=RAWB+"r"+(m.win%RING)+"/data/";MTS=m.ts;MWIN=m.win;ringFails=0;const was=mode;mode="ring";cache={};setReady();if(!first||was!=="init")refreshAll()}
 else{ringFails++;if((!RB||ringFails>=4)&&!polling){polling=true;if(mode==="ring")mode="init";pollRef()}}
 nextAt=((w+1)*HOT+READY+Math.random())*1000;setTimeout(ring,Math.max(1000,nextAt-Date.now()))}
async function pollRef(){let wait=30;if(mode==="ring"){polling=false;return}
 try{const r=await orig(REF,{cache:"no-cache",headers:{Accept:"application/vnd.github+json"}});
  const rem=+r.headers.get("x-ratelimit-remaining"),reset=+r.headers.get("x-ratelimit-reset");
  if(mode==="ring"){polling=false;setReady();return}
  if(r.ok){const j=await r.json(),s=j.object&&j.object.sha;mode="sha";if(s&&s!==SHA){const first=!SHA;SHA=s;cache={};if(!first)refreshAll()}}
  else{fails++;lastErr="HTTP "+r.status+" rem="+rem;if(fails>=3||!SHA||rem===0)mode="branch"}
  if(r.ok)fails=0;
  if(reset&&!isNaN(rem)){const left=Math.max(1,reset-Date.now()/1000);wait=rem<=2?left+5:Math.max(30,Math.min(300,left/Math.max(1,rem-3)))}
 }catch(e){fails++;lastErr=String(e).slice(0,80);if(fails>=3||!SHA)mode="branch"}
 if(fails&&mode==="sha")wait=Math.min(wait,30);
 setReady();setTimeout(pollRef,wait*1000);nextAt=Date.now()+wait*1000}
function refreshAll(){for(const f of ["loadState","loadCandles","loadHist","loadSH","loadTrail","loadAlerts","loadSC"])try{typeof window[f]==="function"&&window[f]()}catch(e){}upd()}
window.fetch=function(input,init){
 const u=typeof input==="string"?input:input.url;
 if(!u.startsWith("/api/"))return orig(input,init);
 if(u.startsWith("/api/version"))return Promise.resolve(new Response('{"v":1}'));
 return ready.then(()=>{const k=key(u),b=base(),ck=b+k,now=Date.now(),c=cache[ck];
  const imm=!SRC&&(mode==="ring"&&RB||SHA&&mode==="sha"),ttl=imm?1e12:40000;if(c&&now-c.t<ttl)return c.p.then(r=>r.clone());
  const url=b+k+(imm?"":"?t="+Math.floor(now/30000));
  const p=orig(url,{cache:mode==="ring"?"no-store":imm?"force-cache":"no-store"}).then(r=>{if(!r.ok)throw new Error(r.status);return r});
  cache[ck]={t:now,p};p.catch(()=>{delete cache[ck]});return p.then(r=>r.clone())})};
let b;async function upd(){if(!b)return;try{await ready;const m=await (await window.fetch("/api/meta")).json();
  const age=Date.now()/1000-m.ts;const t=new Date(m.ts*1000).toLocaleTimeString("en-US",{timeZone:"America/New_York",hour12:false});
  const bad=age>300;b.textContent="last update "+t+" ET"+(bad?" · STALE "+Math.round(age/60)+"m":"")+(mode==="branch"?" · slow mode":"");
  b.title="source: "+(mode==="ring"?"30s ring branch r"+(MWIN%RING):mode==="sha"?"commit "+(SHA||"").slice(0,7):"branch (GitHub API rate-limited; up to ~5 min behind)")+" · next check "+new Date(nextAt).toLocaleTimeString();
  b.style.background=bad?"#3a1215":"#12261a";b.style.color=bad?"#ff7b7b":"#7fd99a";b.style.borderColor=bad?"#7a2a2e":"#2a5a3a"}
 catch(e){b.textContent="no data";b.style.background="#3a1215";b.style.color="#ff7b7b"}}
window.__gdShim={get sha(){return SHA},get mode(){return mode},get err(){return lastErr},get fails(){return fails},get win(){return MWIN},get ringFails(){return ringFails},meta:()=>window.fetch("/api/meta").then(r=>r.json())};
ring();setTimeout(()=>{if(!RB&&!polling){polling=true;pollRef()}},6000);
document.addEventListener("DOMContentLoaded",()=>{b=document.createElement("div");b.id="pubbadge";
 b.style.cssText="position:fixed;right:8px;bottom:26px;z-index:99999;font:11px/1.3 ui-monospace,monospace;padding:3px 8px;border-radius:4px;background:#12261a;color:#7fd99a;border:1px solid #2a5a3a";
 b.textContent="loading…";const fb=document.getElementById("bar");if(fb){b.style.cssText="position:static;flex:none;margin-left:auto;font:10px/16px ui-monospace,monospace;padding:0 6px;border-radius:3px;border:1px solid #2a5a3a;background:#12261a;color:#7fd99a;white-space:nowrap;cursor:default";b.addEventListener("click",e=>e.stopPropagation());const la=document.getElementById("lastalert");if(la){la.style.flex="0 1 auto";la.style.minWidth="0"}fb.appendChild(b)}else document.body.appendChild(b);upd();setInterval(upd,15000)});
})();
