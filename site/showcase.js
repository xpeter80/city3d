const card=document.querySelector('.work.live'),art=card.querySelector('.work-art');
card.addEventListener('pointermove',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=card.getBoundingClientRect();art.style.transform=`perspective(800px) rotateY(${((e.clientX-r.left)/r.width-.5)*8}deg) translateY(-3px)`;});
card.addEventListener('pointerleave',()=>art.style.transform='');
const sectionLinks=[...document.querySelectorAll('.showcase-nav a')];const observe=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)sectionLinks.forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));},{rootMargin:'-10% 0px -45% 0px'});for(const id of ['works','origin'])observe.observe(document.getElementById(id));
