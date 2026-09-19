// Native HTTP cache works on HTTP and HTTPS, including browser-managed byte ranges.
const pool=new Map();const connection=navigator.connection;const constrained=()=>connection?.saveData||/2g/.test(connection?.effectiveType||'')||document.hidden;
export function poster(n){return n.thumbnail||'';}
export function mediaURL(n){return n.playback||n.media;}
export function warm(items){if(constrained())return;const task=()=>{if(constrained())return;for(const n of items.filter(n=>n.media).slice(0,2)){const url=mediaURL(n);if(pool.has(url))continue;const el=document.createElement(n.media_type==='image'?'img':n.media_type==='audio'?'audio':'video');if(n.media_type!=='image'){el.preload='metadata';el.muted=true;el.playsInline=true;}el.src=url;pool.set(url,el);while(pool.size>3){const [key,old]=pool.entries().next().value;pool.delete(key);if(!old.isConnected){old.removeAttribute('src');old.load?.();}}}};if('requestIdleCallback'in window)requestIdleCallback(task,{timeout:1500});else setTimeout(task,250);}
export function player(n){const url=mediaURL(n),el=pool.get(url)||document.createElement(n.media_type==='image'?'img':n.media_type==='audio'?'audio':'video');pool.delete(url);if(el.getAttribute('src')!==url)el.src=url;if(n.media_type!=='image'){el.preload='auto';el.controls=true;el.autoplay=true;el.muted=false;el.playsInline=true;if(n.media_type==='video'&&poster(n))el.poster=poster(n);}return el;}
document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const el of pool.values()){el.removeAttribute('src');el.load?.();}pool.clear();}});
// Explicit play is required when reusing an already-loaded preload element.
export async function startPlayback(el){
 if(!el.matches('video,audio'))return;
 try{await el.play();}
 catch(error){
  if(!el.isConnected||error.name==='AbortError')return;
  if(error.name==='NotAllowedError'&&el.matches('video')){
   el.muted=true;
   try{await el.play();if(!el.isConnected)return;const b=document.createElement('button');b.textContent='开启声音';b.className='enable-media-sound';b.style.cssText='position:absolute;right:18px;top:54px;z-index:10;border:0;border-radius:20px;padding:9px 15px;background:#f6f7f0e8;color:#268378;cursor:pointer';b.onclick=()=>{el.muted=false;el.play().catch(()=>{});b.remove();};el.parentElement.append(b);el.addEventListener('volumechange',()=>{if(!el.muted)b.remove();});}catch{ /* Native controls remain available when the browser forbids all autoplay. */ }
  }
 }
}
