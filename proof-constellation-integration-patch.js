/*
Ecosystem Pulse patch (no deps)
Add this script tag: <script src="proof-constellation-integration-patch.js" defer></script>
Add this element: <div id="proof-ecosystem-pulse"></div>
Privacy: reads ecosystem.json only, caches offline, sends no visitor data.
*/
(function () {
  const PANEL_ID="proof-ecosystem-pulse",API_URL="/api/ecosystem.json",CACHE_KEY="proof-ecosystem-cache",BASE_POLL=30000,MAX_POLL=300000,FALLBACK={adoptionCurrent:7,adoptionTotal:14,adoptionPostIntegration:8,edgeMultiplier:45.5,predictedAcceleration:4.2,updatedAt:"offline cache",source:"fallback"},state={failCount:0,data:loadCache()||FALLBACK,online:navigator.onLine};
  ensurePanel();injectStyles();render(state.data,"cached");scheduleFetch();
  window.addEventListener("online",()=>{state.online=true;state.failCount=0;});
  window.addEventListener("offline",()=>{state.online=false;render(loadCache()||state.data,"offline");});
  function scheduleFetch(){const d=Math.min(BASE_POLL*Math.pow(2,state.failCount),MAX_POLL);setTimeout(fetchData,d);}
  function fetchData(){
    if(!state.online){scheduleFetch();return;}
    fetch(API_URL,{cache:"no-store"}).then((r)=>{if(!r.ok)throw new Error("API unavailable");return r.json();}).then((j)=>{const data=normalize(j);state.data=data;state.failCount=0;saveCache(data);render(data,"live");}).catch(()=>{state.failCount+=1;const c=loadCache();if(c)render(c,"offline");}).finally(scheduleFetch);
  }
  function normalize(raw){return{adoptionCurrent:firstNumber(raw?.adoptionCurrent,raw?.adoption_current,raw?.adoption?.current,FALLBACK.adoptionCurrent),adoptionTotal:firstNumber(raw?.adoptionTotal,raw?.adoption_total,raw?.adoption?.total,FALLBACK.adoptionTotal),adoptionPostIntegration:firstNumber(raw?.adoptionPostIntegration,raw?.adoption_post_integration,raw?.adoption?.postIntegration,FALLBACK.adoptionPostIntegration),edgeMultiplier:firstNumber(raw?.edgeMultiplier,raw?.edge_garden_multiplier,raw?.multipliers?.edgeGarden,FALLBACK.edgeMultiplier),predictedAcceleration:firstNumber(raw?.predictedAcceleration,raw?.predicted_acceleration,raw?.forecast?.acceleration,FALLBACK.predictedAcceleration),updatedAt:raw?.updated_at||raw?.updatedAt||new Date().toISOString(),source:"live"};}
  function firstNumber(){for(let i=0;i<arguments.length;i+=1){const v=arguments[i];if(typeof v==="number"&&!isNaN(v))return v;}return null;}
  function render(data,mode){const h=document.getElementById(PANEL_ID);if(!h)return;const adoption=`${data.adoptionCurrent}/${data.adoptionTotal} \u2192 ${data.adoptionPostIntegration}/${data.adoptionTotal}`;h.innerHTML=`<div class="pc-wrap"><div class="pc-row"><div class="pc-label">Adoption</div><div class="pc-value">${adoption}</div></div><div class="pc-row"><div class="pc-label">Edge Garden</div><div class="pc-value pc-strong">${(data.edgeMultiplier||FALLBACK.edgeMultiplier).toFixed(1)}x</div></div><div class="pc-row"><div class="pc-label">Predicted Acceleration</div><div class="pc-value">${(data.predictedAcceleration||FALLBACK.predictedAcceleration).toFixed(1)}x</div></div><div class="pc-meta"><span>${mode==="live"?"Live":"Offline cache"}</span><span>${data.updatedAt}</span><span>Reads only • no visitor data sent</span></div></div>`;}
  function ensurePanel(){if(document.getElementById(PANEL_ID))return;const m=document.createElement("div");m.id=PANEL_ID;document.body.appendChild(m);}
  function injectStyles(){if(document.getElementById("pc-ecosystem-style"))return;const s=document.createElement("style");s.id="pc-ecosystem-style";s.textContent=`#${PANEL_ID}{font-family:"Helvetica Neue",Arial,sans-serif;color:#0d1b2a;max-width:360px}#${PANEL_ID} .pc-wrap{border:1px solid #dce3ec;border-radius:10px;padding:14px 16px;background:linear-gradient(135deg,#f7fbff,#eef3f9);box-shadow:0 8px 24px rgba(13,27,42,.06)}#${PANEL_ID} .pc-row{display:flex;justify-content:space-between;margin-bottom:8px}#${PANEL_ID} .pc-label{font-size:13px;opacity:.75}#${PANEL_ID} .pc-value{font-size:16px;font-weight:600}#${PANEL_ID} .pc-strong{color:#0c6cf2}#${PANEL_ID} .pc-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:11px;opacity:.7;margin-top:6px}`;document.head.appendChild(s);}
  function loadCache(){try{const r=localStorage.getItem(CACHE_KEY);return r?JSON.parse(r):null;}catch(_){return null;}}
  function saveCache(d){try{localStorage.setItem(CACHE_KEY,JSON.stringify(d));}catch(_){}}
})();
