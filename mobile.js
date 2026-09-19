// Responsive shell: original controls are moved, preserving their listeners and state.
const $=s=>document.querySelector(s), compact=matchMedia('(max-width: 767px), (max-height: 499px)');
const detail=$('#detail'), navigator=$('.navigator');
const originalDetail=[...detail.children];
const shell=document.createElement('div');shell.id='mobile-shell';shell.innerHTML=`<button id="explore" aria-label="探索城市" aria-expanded="false" aria-controls="explore-menu"><span aria-hidden="true">⌖</span><b>探索</b></button><dialog id="explore-menu" aria-label="探索城市菜单"><div class="sheet-heading"><h2>探索这座城</h2><button id="menu-close" aria-label="关闭探索菜单">×</button></div><nav class="mobile-primary"><button id="mobile-places">⌖<span>景点</span></button><button id="mobile-stories">▤<span>手记</span></button><a href="/account/" id="mobile-account">♙<span>我的</span></a></nav><p id="mobile-prompt" role="status"></p><details id="more-tools"><summary>更多 · 视角与工具</summary><div id="mobile-tools"></div></details></dialog>`;document.body.append(shell);
const menu=$('#explore-menu'), explore=$('#explore');
const listClose=document.createElement('button');listClose.id='close-places';listClose.textContent='×';listClose.setAttribute('aria-label','关闭景点列表');navigator.prepend(listClose);
const handle=document.createElement('button');handle.id='detail-handle';handle.setAttribute('aria-label','拖动或点击切换详情高度');handle.innerHTML='<i></i><span>半屏</span>';detail.prepend(handle);
const title=$('#detail-title'), actions=document.createElement('div');actions.className='mobile-detail-actions';actions.innerHTML='<button id="read-stories">看手记</button><button id="write-note" class="primary">写留言</button>';title.after(actions);
const body=document.createElement('div');body.id='detail-body';[...detail.children].filter(el=>![handle,title,actions,$('#close-detail')].includes(el)).forEach(el=>body.append(el));detail.append(body);
const detents=['summary','half','full'];let state='half';
function detent(next){state=next;detail.dataset.detent=state;handle.querySelector('span').textContent={summary:'摘要',half:'半屏',full:'展开'}[state];window.dispatchEvent(new Event('atlas-drawer'));}
function closePanels(){navigator.classList.remove('mobile-open');detail.hidden=true;document.body.classList.remove('place-selected');window.dispatchEvent(new Event('atlas-drawer'));}
function showList(prompt=''){menu.close();closePanels();navigator.classList.add('mobile-open');$('.nav-title b').textContent=prompt||'从这里，出发';listClose.focus();}
function showDetail(){menu.close();navigator.classList.remove('mobile-open');detail.hidden=false;document.body.classList.add('place-selected');detent('half');}
explore.onclick=()=>{closePanels();$('#mobile-prompt').textContent='';menu.showModal();explore.setAttribute('aria-expanded','true');};$('#menu-close').onclick=()=>menu.close();menu.addEventListener('close',()=>explore.setAttribute('aria-expanded','false'));menu.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientY<r.top)menu.close();}});
$('#mobile-places').onclick=()=>showList();listClose.onclick=()=>{navigator.classList.remove('mobile-open');explore.focus();};
let current=null;
window.addEventListener('atlas-place',e=>{current=e.detail;if(compact.matches){navigator.classList.remove('mobile-open');menu.close();detent('half');body.scrollTop=0;}});
window.addEventListener('atlas-leave',()=>{current=null;});
$('#city-select').addEventListener('change',()=>{current=null;navigator.classList.remove('mobile-open');detent('half');});
function read(){if(!current){showList('先选一处景点，再看手记');return;}showDetail();detent('full');window.dispatchEvent(new Event('atlas-read-stories'));}
$('#mobile-stories').onclick=read;$('#read-stories').onclick=read;
$('#write-note').onclick=()=>{showDetail();detent('full');window.dispatchEvent(new Event('atlas-compose'));};
handle.onclick=()=>detent(detents[(detents.indexOf(state)+1)%3]);let start=null,dragged=false;
handle.addEventListener('pointerdown',e=>{start=e.clientY;dragged=false;handle.setPointerCapture(e.pointerId);});handle.addEventListener('pointermove',e=>{if(start!==null&&Math.abs(e.clientY-start)>12)dragged=true;});handle.addEventListener('pointerup',e=>{if(start!==null&&dragged){const delta=e.clientY-start;detent(detents[Math.max(0,Math.min(2,detents.indexOf(state)+(delta<0?1:-1)))]);handle.addEventListener('click',e=>e.stopImmediatePropagation(),{once:true,capture:true});}start=null;});handle.addEventListener('pointercancel',()=>start=null);
const moved=['.top-controls','.bottom','.right-tools','.minimap','.legend'].map(selector=>{const node=$(selector),marker=document.createComment(selector);node.before(marker);return{node,marker};});
function layout(){if(compact.matches){detail.append(handle,$('#close-detail'),title,actions,body);originalDetail.filter(el=>el!==title&&el!==$('#close-detail')).forEach(el=>body.append(el));}else{originalDetail.forEach(el=>detail.append(el));}document.body.classList.toggle('mobile-layout',compact.matches);for(const {node,marker}of moved){if(compact.matches)$('#mobile-tools').append(node);else marker.after(node);}if(!compact.matches){menu.close();navigator.classList.remove('mobile-open');}window.dispatchEvent(new Event('atlas-drawer'));}
compact.addEventListener('change',layout);layout();
$('#mobile-tools').addEventListener('click',e=>{if(e.target.closest('#dock button,#minimap,#help'))menu.close();});
// VisualViewport tracks iOS/Android keyboard occlusion without losing composer text.
function viewport(){const v=window.visualViewport;document.documentElement.style.setProperty('--visual-height',(v?.height||innerHeight)+'px');document.documentElement.style.setProperty('--keyboard-inset',Math.max(0,innerHeight-(v?.height||innerHeight)-(v?.offsetTop||0))+'px');document.body.classList.toggle('keyboard-open',compact.matches&&document.activeElement?.matches('textarea,input')===true);if(compact.matches&&document.activeElement?.matches('#notes-form textarea'))requestAnimationFrame(()=>document.activeElement.scrollIntoView({block:'nearest'}));}
window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);document.addEventListener('focusin',()=>{viewport();if(compact.matches&&detail.contains(document.activeElement)&&document.activeElement.matches('input,textarea,select')){detent('full');setTimeout(()=>document.activeElement?.scrollIntoView({block:'nearest'}),150);}});document.addEventListener('focusout',()=>setTimeout(viewport,0));viewport();
new MutationObserver(()=>window.dispatchEvent(new Event('atlas-drawer'))).observe(detail,{attributes:true,attributeFilter:['hidden']});
