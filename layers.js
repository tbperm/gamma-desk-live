// Gamma Desk layers overlay: regime badge + events chip (header), flow-vs-OI tags on ladders, flow/charm panel.
(function(){
const $=id=>document.getElementById(id), fm=x=>x==null?"-":(x<0?"−":"+")+(Math.abs(x)>=1e9?(Math.abs(x)/1e9).toFixed(2)+"B":(Math.abs(x)/1e6).toFixed(0)+"M");
const fp=x=>x==null?"-":x.toLocaleString("en-US",{maximumFractionDigits:2});
let L=null;
function ensure(){
  const hd=document.querySelector("header");if(!hd)return;
  if(!$("regchip")){const sp=hd.querySelector("span[style*='flex:1']");
    const a=document.createElement("span");a.id="regchip";a.className="chip";a.style.cursor="help";
    const b=document.createElement("span");b.id="evchip";b.className="chip dim";
    hd.insertBefore(a,sp);hd.insertBefore(b,sp)}
  if(!$("layerbox")){const d=document.createElement("div");d.id="layerbox";d.className="box";d.style.margin="6px 10px";
    const ref=$("alertbox");ref?ref.parentNode.insertBefore(d,ref):document.body.appendChild(d)}
}
// ---------- regime badge explainer (hover on desktop, tap on touch; closed = display:none + pointer-events:none, never over the charts) ----------
function regTipFill(){const t=$("regtip");if(!t||!L||!L.underlyings)return;const U=L.underlyings,q=U.QQQ||Object.values(U)[0],r=(q&&q.regime)||{};
  const st=typeof S!=="undefined"&&S?S:null,gs=r.gamma_sign,tm=r.term;
  const gTxt=gs==="positive"?"<b class='pg'>+γ (positive gamma)</b>: dealers are net <b>long</b> gamma here. They hedge <i>against</i> the move: sell into rallies, buy dips. That dampens moves: price tends to <b>pin and mean-revert</b>, and gamma levels/walls tend to <b>hold</b>."
   :gs==="negative"?"<b class='ng'>−γ (negative gamma)</b>: dealers are net <b>short</b> gamma here. They hedge <i>with</i> the move: buy as it rises, sell as it falls. That adds fuel: <b>wider ranges, trend days</b>, and levels <b>break</b> more often than they hold."
   :"<b>γ mixed / n/a</b>: not enough clean chain data to call the dealer gamma sign right now.";
  const rows=Object.entries(U).filter(([u,x])=>x.regime&&x.regime.gamma_sign).map(([u,x])=>{const g=x.regime,dn=st&&st.underlyings&&st.underlyings[u]&&st.underlyings[u].scopes&&st.underlyings[u].scopes.donkey||{};
    const sp=dn.spot,bal=dn.balance_proxy,d=sp&&bal?(sp-bal)/bal*100:null;
    return `<tr><td>${x.label||u}${u===(Object.keys(U).find(k=>U[k]===q))?" <span class='d'>(badge)</span>":""}</td><td class='${g.gamma_sign==="positive"?"pg":"ng"}'>${g.gamma_sign==="positive"?"+γ":"−γ"}</td><td>${g.net_gross!=null?(g.net_gross*100).toFixed(0)+"%":"-"}</td><td>${sp?fp(sp):"-"}</td><td>${bal?fp(bal):"-"}</td><td>${d==null?"-":(d>=0?"+":"")+d.toFixed(2)+"%"}</td></tr>`}).join("");
  const vTxt=tm==="backwardation"?"<b class='ng'>Backwardation</b>: near-term vol is priced <b>above</b> longer-term (VIX9D and VIX over VIX3M). The market is paying up for protection right now: a stress signal that usually comes with <b>bigger, faster swings</b>."
   :tm==="contango"?"<b class='pg'>Contango</b>: near-term vol is priced <b>below</b> longer-term (the normal state). No acute fear priced in: moves tend to be <b>calmer and more orderly</b>."
   :"<b>Term structure flat / n/a</b>: near- and longer-term vol are roughly equal, or inputs are missing.";
  const now=gs==="negative"&&tm==="backwardation"?"Expansion setup: moves can run and overshoot. Respect momentum and breaks; don't blindly fade levels."
   :gs==="negative"?"Trend-prone without acute fear: levels break more easily; favor going with the move, keep fades small."
   :gs==="positive"&&tm==="backwardation"?"Pinned but fragile: walls should hold, but stress is priced in. Fade extremes with tight stops; a break can run."
   :gs==="positive"?"Range / pin: fade extremes into walls, expect mean reversion toward the KING/balance."
   :"No clear regime: lean on levels and price action.";
  t.innerHTML=`<div class="rt-h">${$("regchip").textContent} <span class="d">· what this badge means</span></div>
   <div class="rt-s">GAMMA</div><p>${gTxt}</p>
   ${rows?`<table><tr><th></th><th>sign</th><th>net/gross</th><th>spot</th><th>BAL</th><th>vs BAL</th></tr>${rows}</table><p class="d">Sign = net dealer γ (Donkey, Schwab γ×OI) vs gross. BAL = Donkey balance proxy (where call and put γ net out on the ladder); spot vs BAL is context: the sign itself comes from net γ across the whole chain.</p>`:""}
   <div class="rt-s">VOL TERM STRUCTURE</div><p>${vTxt}</p>
   <table><tr><th>VIX9D</th><th>VIX</th><th>VIX3M</th><th>9D/VIX</th><th>VIX/3M</th><th>VVIX</th></tr><tr><td>${fp(r.vix9d)}</td><td>${fp(r.vix)}</td><td>${fp(r.vix3m)}</td><td class='${r.r9>1?"ng":"pg"}'>${r.r9!=null?r.r9.toFixed(3):"-"}</td><td class='${r.r3>1?"ng":"pg"}'>${r.r3!=null?r.r3.toFixed(3):"-"}</td><td>${fp(r.vvix)}${r.vvix_state&&r.vvix_state!=="normal"?` <span class="ng">${r.vvix_state}</span>`:""}</td></tr></table>
   <p class="d">Ratio above 1.00 = near-term priced over longer-term (backwardation); below 1.00 = contango.</p>
   <div class="rt-s">WHAT IT MEANS NOW</div><p><b>${now}</b>${r.playbook?`<br><span class="d">Model: ${r.playbook}</span>`:""}</p>
   <p class="d">A read of current positioning, not trading advice.</p>`}
// generic hover/tap popover: hover (desktop), tap toggle (touch), tap-away / Esc / leave close; closed = display:none + pointer-events:none
const TIPS={};
function tipCss(){if($("gdtipcss"))return;const st=document.createElement("style");st.id="gdtipcss";st.textContent=`.gdtip{position:fixed;z-index:60;display:none;pointer-events:none;background:#0d1219;border:1px solid #2a3446;border-radius:6px;padding:9px 11px;color:#c9d1dc;font:11.5px/1.45 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.55);overflow:auto}
.gdtip.show{display:block;pointer-events:auto}.gdtip p{margin:3px 0 6px}.gdtip .d{color:#7f8a9c}.gdtip .pg{color:#7fd99a}.gdtip .ng{color:#ff8a80}.gdtip .tl{color:#19c39c;font-weight:600}.gdtip .pu{color:#9d7bff;font-weight:600}.gdtip .og{color:#ff9f43;font-weight:600}.gdtip .ky{color:#ffd54a;font-weight:600}
.gdtip .rt-h{font-weight:600;color:#e6edf3;margin-bottom:4px}.gdtip .rt-s{font-size:10px;letter-spacing:.08em;color:#8fa3c0;margin-top:8px;border-top:1px solid #1c2533;padding-top:6px}.gdtip ul{margin:2px 0 6px;padding-left:16px}.gdtip li{margin:2px 0}
.gdtip table{border-collapse:collapse;margin:2px 0 4px;font:11px ui-monospace,monospace}.gdtip th{color:#7f8a9c;font-weight:400;text-align:right;padding:1px 6px}.gdtip td{text-align:right;padding:1px 6px}.gdtip td:first-child,.gdtip th:first-child{text-align:left;padding-left:0}
#tri{position:relative}#ladhelp{position:absolute;top:1px;right:2px;z-index:4;width:14px;height:14px;line-height:13px;text-align:center;border-radius:50%;border:1px solid #3a4558;color:#8fa3c0;background:#0e121b;font:600 10px system-ui,sans-serif;cursor:help;user-select:none}#ladhelp:hover{color:#e6edf3;border-color:#8fa3c0}`;document.head.appendChild(st)}
function tipShow(id){const T=TIPS[id];if(!T)return;clearTimeout(T.tm);for(const k in TIPS)if(k!==id)tipHide(k);T.fill();const t=T.el,c=T.anchor;t.classList.add("show");
  const b=c.getBoundingClientRect(),w=Math.min(T.w,window.innerWidth-16);t.style.width=w+"px";t.style.left=Math.max(8,Math.min(T.right?b.right-w:b.left,window.innerWidth-w-8))+"px";t.style.top=(b.bottom+6)+"px";
  t.style.maxHeight=Math.max(160,window.innerHeight-b.bottom-20)+"px"}
function tipHide(id,d){const T=TIPS[id];if(!T)return;clearTimeout(T.tm);T.tm=setTimeout(()=>T.el.classList.remove("show"),d||0)}
function tipOpen(id){return TIPS[id]&&TIPS[id].el.classList.contains("show")}
function tipAttach(id,anchor,fill,w,right){tipCss();const t=document.createElement("div");t.id=id;t.className="gdtip";t.setAttribute("role","tooltip");document.body.appendChild(t);
  const T=TIPS[id]={el:t,anchor,fill,w,right,tm:null,touch:false};
  anchor.addEventListener("touchstart",()=>{T.touch=true},{passive:true});
  anchor.addEventListener("mouseenter",()=>{if(!T.touch)tipShow(id)});anchor.addEventListener("mouseleave",()=>{if(!T.touch)tipHide(id,250)});
  t.addEventListener("mouseenter",()=>clearTimeout(T.tm));t.addEventListener("mouseleave",()=>{if(!T.touch)tipHide(id,250)});
  anchor.addEventListener("click",e=>{e.stopPropagation();tipOpen(id)&&T.touch?tipHide(id):tipShow(id)});
  t.addEventListener("click",e=>e.stopPropagation());t.addEventListener("touchstart",e=>e.stopPropagation(),{passive:true})}
document.addEventListener("click",()=>{for(const k in TIPS)if(tipOpen(k))tipHide(k)});
document.addEventListener("touchstart",e=>{for(const k in TIPS)if(tipOpen(k)&&!TIPS[k].anchor.contains(e.target))tipHide(k)},{passive:true});
document.addEventListener("keydown",e=>{let h=false;for(const k in TIPS)if(tipOpen(k)){tipHide(k);h=true}if(h&&e.key==="Escape")e.stopPropagation()},true);
function regTipInit(){if(!TIPS.regtip&&$("regchip"))tipAttach("regtip",$("regchip"),regTipFill,440,false)}
// ladder legend
function ladTipFill(){const t=$("ladtip");if(!t)return;const o=typeof opt!=="undefined"?opt:{};const dw=o.dwin==="open"||!o.dwin?"the first snapshot after 09:30 ET (Δopn)":"the last "+o.dwin+" min";
  const gk=typeof GK!=="undefined"?GK:"gex";
  if(gk==="vex"||gk==="dex"){t.innerHTML=ladTipGreek(gk,o);return}
  t.innerHTML=`<div class="rt-h">Reading the strike ladders</div>
  <div class="rt-s">THE +/− % IN EACH CELL</div>
  <p>Net dealer gamma $ at that strike (Donkey: Schwab γ × OI × 100 × S² × 1%, calls +, puts −) as a <b>% of the biggest |net| strike in that column</b>. The biggest one is the <span class="ky">KING ★</span>, shown in $ instead of % (it is 100%).</p>
  <p><span class="tl">+%</span> teal = net positive γ (call-heavy). <span class="pu">−%</span> purple = net negative γ (put-heavy). Brighter = bigger. Blank = under 1%.</p>
  <div class="rt-s">THE SMALL TAG TO THE RIGHT</div>
  <p>Change in that strike's |net γ| since ${dw}: <span class="pg">+%</span> = node growing, <span class="ng">−%</span> = shrinking. Shown only when it moved ≥10% on a strike that's ≥3% of the max; <span class="ng">flip</span> = the strike changed sign. Change the window with Δopn / 30m / 15m in the top bar.</p>
  <div class="rt-s">HEADER %s</div>
  <p>Next to the price: % change vs the prior close (after 16:00 ET, vs today's close). <b>KING ▲/▼ %</b> = how far the King is from price.</p>
  <div class="rt-s">HOW TO USE THE NODES</div>
  <ul><li><span class="tl">Teal + nodes are sticky.</span> Dealers hedge against the move there, so price slows, stalls and reverses. These are the fade / reversal spots. The <span class="ky">KING</span> acts as a magnet and pin, especially into the close.</li>
  <li><span class="pu">Purple − nodes are accelerants.</span> Dealers hedge with the move, so price tends to slice through and extend. Trade through them. Only fade one after a sweep-and-reclaim: price pierces it, then closes back on the other side.</li>
  <li><span class="og">BAL / flip (orange dashed line) is the regime line</span>, where call and put γ roughly net out. Above it, behavior is usually calmer and pinning; below it, moves usually expand.</li></ul>
  <p class="d">A read of positioning, not trading advice. Nodes are a snapshot of open interest, so they can shift during the day.</p>`}
function ladTipGreek(gk,o){const V=gk==="vex";
  return `<div class="rt-h">Strike ladders · ${V?"VEX (vanna)":"DEX (delta)"} view</div>
  <p class="d">Switch back with the GEX / VEX / DEX menu in the top bar. Only the ladders change: chart lines, dots, KING and BAL stay on GEX.</p>
  <div class="rt-s">THE +/− % IN EACH CELL</div>
  ${V?`<p>Dealer <b>vanna $</b> at that strike: how much dealer delta ($) changes if implied vol rises <b>+1 point</b> (Schwab IV, Black-Scholes, spot and time held fixed), as a % of the biggest |VEX| strike in that column. The ★ row is that biggest strike, shown in $.</p>
  <p>Convention (same as the "vanna +1v" numbers in the flow panel): dealers long calls, short puts. <span class="tl">+%</span> teal = dealers get <b>longer</b> delta if IV rises, so they sell to re-hedge (and <b>buy</b> as IV falls: a vol crush supports price). <span class="pu">−%</span> purple = dealers get <b>shorter</b> delta if IV rises, so they buy (and sell as IV falls).</p>`
  :`<p><b>Delta $ notional of open interest</b> at that strike: Δ × OI × 100 × spot, call Δ +, put Δ − (Schwab delta; Black-Scholes from Schwab IV when Schwab's is missing). Same sign as the chain explorer's Net DEX column. Shown as a % of the biggest |DEX| strike in that column; the ★ row is that strike in $.</p>
  <p><span class="tl">+%</span> teal = call delta outweighs put delta at that strike. <span class="pu">−%</span> purple = put delta outweighs. Big DEX = a lot of hedge already on the books that can unwind if those options expire, get closed, or go deep out of the money.</p>`}
  <div class="rt-s">WHAT'S DIFFERENT FROM GEX</div>
  <p>No Δopn / 30m / 15m change tags in this view (they track gamma only). Header shows Σ = the column's total ${V?"VEX":"DEX"}. Same contracts as the GEX ladder (same expiry scope: 0DTE or ≤45D), computed from the chains already pulled, so it costs no extra Schwab calls.</p>
  <div class="rt-s">HOW TO USE IT</div>
  ${V?`<ul><li>Big VEX clusters near price matter most when <b>VIX is moving</b>: a vol drop with large + VEX tends to add dealer buying; a vol spike adds selling.</li><li>Most useful into events and after them (vol crush), and with the regime badge's term structure.</li></ul>`
  :`<ul><li>Large DEX strikes are where hedges sit. Into expiry, as those options decay, the hedge comes off, which can release a pin or fuel a move away from it.</li><li>Use alongside the GEX view: GEX says how hard dealers push at a level, DEX says how much is already hedged there.</li></ul>`}
  <p class="d">A read of positioning, not trading advice. Snapshot of open interest; it can shift during the day.</p>`}
function ladTipInit(){const tri=$("tri");if(!tri||TIPS.ladtip)return;if(!tri.querySelector(".tc")){setTimeout(ladTipInit,1000);return}tipCss();const b=document.createElement("span");b.id="ladhelp";b.textContent="?";b.setAttribute("aria-label","Ladder legend");tri.appendChild(b);tipAttach("ladtip",b,ladTipFill,420,true)}
ladTipInit();
function render(){
  if(!L||!L.underlyings)return;ensure();
  const U=L.underlyings,q=U.QQQ||Object.values(U)[0];
  if(q&&q.regime){const r=q.regime,bad=r.gamma_sign==="negative"||r.term==="backwardation";
    $("regchip").className="chip "+(r.gamma_sign==="negative"?"bad":bad?"warn":"ok");
    $("regchip").textContent=r.tag.replace("Positive gamma","+γ").replace("Negative gamma","−γ").replace("Mixed gamma","±γ");
    $("regchip").removeAttribute("title");regTipInit();ladTipInit();if(tipOpen("regtip"))regTipFill()}
  $("evchip").textContent="📅 "+(L.events_line||"no events ≤7d");
  $("evchip").title=(L.events||[]).map(e=>`${e.date} ${e.time_et||""} ${e.name}${e.confirmed?"":" (unconfirmed)"}`).join("\n");
  let h=`<b>FLOW vs OI · INTO THE CLOSE</b> <span class="dim">0DTE; vol-γ = γ×today's volume (flow proxy), HOT = strike's vol/OI ≥2× chain norm; charm = dealer Δ change as time runs to 15:00/16:00 (spot, IV fixed), vanna = ±1 vol pt; fut = dealer hedge flow, + = buy</span>
  <table class="kt"><tr><th></th><th>flow pin</th><th>OI king</th><th>centroid</th><th>HOT strikes (side · vol/OI×norm)</th><th>charm→15:00</th><th>charm→16:00</th><th>vanna +1v</th><th>vanna −1v</th></tr>`;
  for(const u of ["$NDX","QQQ","$SPX","SPY"]){const x=U[u];if(!x||!x.flow)continue;const f=x.flow,fs=x.fut.slice(1);
    const c=k=>{const v=x.charm[k];return v?`${fm(v.usd)} <span class="dim">${v.hedge_fut>=0?"+":""}${v.hedge_fut?.toFixed(0)} ${fs}</span>`:"—"};
    const vn=k=>{const v=x.vanna[k];return v?`${fm(v.usd)} <span class="dim">${v.hedge_fut>=0?"+":""}${v.hedge_fut?.toFixed(0)} ${fs}</span>`:"—"};
    const hot=(x.flagged||[]).filter(a=>a.flag==="HOT").map(a=>`${fp(a.k)}${a.side==="call"?"C":"P"}·${a.rel}×`).join("  ");
    h+=`<tr><td>${x.label}</td><td>${fp(f.flow_pin)} <span class="dim">${f.flow_pin_side||""}</span></td><td>${fp(f.oi_king)}</td><td>${fp(f.flow_centroid)}</td><td style="text-align:left">${hot||"—"}</td><td>${c("15:00")}</td><td>${c("16:00")}</td><td>${vn("up")}</td><td>${vn("down")}</td></tr>`}
  h+=`</table>`;
  const rg=q&&q.regime;if(rg)h+=`<div class="dim" style="margin-top:3px">Regime: <b>${rg.tag}</b> — ${rg.playbook}</div>`;
  $("layerbox").innerHTML=h;
  overlay();
}
function overlay(){
  if(!L||!L.underlyings)return;
  for(const u in L.underlyings){const x=L.underlyings[u];if(!x||!x.flow)continue;const lab=x.label,b=$("b_"+lab);if(!b)continue;
    const m={};(x.flow.rows||[]).forEach(r=>{m[r.k]=r});
    b.querySelectorAll("tr").forEach(tr=>{if(tr.dataset.fl||tr.classList.contains("spot"))return;const td=tr.querySelector("td.k");if(!td)return;
      const k=parseFloat(td.firstChild?.textContent?.replace(/[^0-9.\-]/g,""));const r=m[k];tr.dataset.fl=1;if(!r)return;
      let t="";if(r.flag)t+=`<span class="tag" style="background:${r.flag==="HOT"?"#7a2b12":"#3d3a12"};color:#ffd9b3" title="vol-γ ${fm(r.vg)} vs OI-γ ${fm(r.og)} · ${r.rel}× chain norm">${r.side==="call"?"C":"P"}${r.flag==="HOT"?"🔥":"~"}</span>`;
      if(k===x.flow.flow_pin)t+=`<span class="tag" style="background:#12407a;color:#bcd9ff" title="flow-implied pin (max vol-γ)">PIN</span>`;
      if(t)td.insertAdjacentHTML("beforeend",t)})}
}
async function load(){try{L=await (await fetch("/api/layers")).json();render()}catch(e){}}
load();setInterval(load,10000);
const _r=window.render;if(typeof _r==="function"){window.render=function(){_r.apply(this,arguments);try{overlay()}catch(e){}}}
})();
