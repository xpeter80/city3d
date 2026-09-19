import * as THREE from 'three';

// Artistic miniature: north is -Z; the western mountains and suburban sites are compressed.
export function createChengdu({base,ground,water,facade,roofmat,glass,gold}) {
 const group=new THREE.Group();group.name='chengdu';group.add(base.clone(),ground.clone());
 let seed=610104;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const tau=Math.PI*2;
 const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.85});
 const stone=material('#e6e3cf'),green=material('#adc294'),darkRoof=material('#596c65'),red=material('#9c5c46'),white=material('#f3f0df'),black=material('#303c38'),bark=material('#82674e');
 function mesh(geo,mat,parent=group){const m=new THREE.Mesh(geo,mat);parent.add(m);m.castShadow=true;m.receiveShadow=true;return m;}
 function box(x,y,z,w,h,d,mat=stone,parent=group){let m=mesh(new THREE.BoxGeometry(w,h,d),mat,parent);m.position.set(x,y+h/2,z);return m;}
 function cyl(x,y,z,r1,r2,h,mat=stone,n=24,parent=group){let m=mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat,parent);m.position.set(x,y+h/2,z);return m;}
 function ball(x,y,z,sx,sy,sz,mat=white,parent=group){const m=mesh(new THREE.SphereGeometry(1,16,12),mat,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;}
 function path(points,mat,width=.25,parent=group){let curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,Math.max(20,points.length*3),width,6,false),mat,parent);}
 function polygon(points,mat,y=.15){const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();let m=mesh(new THREE.ShapeGeometry(s),mat);m.rotation.x=-Math.PI/2;m.position.y=y;return m;}
 const mountainHeight=(x,z)=>Math.max(0,36*Math.exp(-(((x+116)/23)**2+((z+67)/34)**2))+24*Math.exp(-(((x+125)/21)**2+((z+15)/28)**2))-.7);
 const tg=new THREE.PlaneGeometry(283,207,110,85);tg.rotateX(-Math.PI/2);const p=tg.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,mountainHeight(p.getX(i),p.getZ(i))+.02);const flat=tg.toNonIndexed(),colors=[];for(let i=0;i<flat.attributes.position.count;i+=3){let h=flat.attributes.position.getY(i),c=new THREE.Color(h>29?'#e7ede2':h>1?'#91ad7c':'#dce1c8');c.multiplyScalar(.96+rand()*.07);for(let j=0;j<3;j++)colors.push(c.r,c.g,c.b);}flat.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));flat.computeVertexNormals();mesh(flat,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true}));
 const river=new THREE.CatmullRomCurve3([[-72,-105],[-55,-68],[-39,-34],[-18,-12],[13,8],[34,25],[69,42],[112,70],[143,84]].map(([x,z])=>new THREE.Vector3(x,.4,z)));
 const riverPoints=river.getPoints(150),outline=[];for(let i=0;i<=150;i++){let t=river.getTangent(i/150);outline.push([riverPoints[i].x-t.z*3.4,riverPoints[i].z+t.x*3.4]);}for(let i=150;i>=0;i--){let t=river.getTangent(i/150);outline.push([riverPoints[i].x+t.z*3.4,riverPoints[i].z-t.x*3.4]);}polygon(outline,water,.36);
 const distRiver=(x,z)=>Math.min(...riverPoints.filter((_,i)=>i%4===0).map(p=>Math.hypot(p.x-x,p.z-z)));
 // Rings, boulevards and cycle-greenways form Chengdu's flat urban fabric.
 const rings=[];for(let r of[43,73]){let pts=Array.from({length:121},(_,i)=>[Math.cos(i/120*tau)*r,.16,Math.sin(i/120*tau)*r*.8]);path(pts,material('#c0c9b8'),1.2);rings.push(pts);}
 path([[0,.18,-99],[0,.18,96]],material('#bdc8b7'),1.6);path([[-88,.18,0],[135,.18,0]],material('#c4cbbb'),1.2);
 const parks=[[-40,-14,13,10],[-34,25,15,12],[54,-70,22,16],[39,79,27,14],[-70,15,17,12]];
 const leaves=[];function tree(x,z,s=1){leaves.push({x,z,y:mountainHeight(x,z),s});}
 parks.forEach(([x,z,rx,rz])=>{const pts=Array.from({length:50},(_,i)=>[x+Math.cos(i/50*tau)*rx,z+Math.sin(i/50*tau)*rz]);polygon(pts,green,.1);for(let i=0;i<95;i++){let a=rand()*tau,r=Math.sqrt(rand());tree(x+Math.cos(a)*rx*r,z+Math.sin(a)*rz*r,.65+rand()*.7);}});
 for(let i=0;i<1900;i++){let x=-137+rand()*58,z=-99+rand()*195;if(mountainHeight(x,z)>1&&distRiver(x,z)>6)tree(x,z,.8+rand()*1.1);}
 for(let i=0;i<145;i++){let p=river.getPoint(i/145),t=river.getTangent(i/145);for(let side of[-1,1])tree(p.x-t.z*5.1*side,p.z+t.x*5.1*side,.7);}
 // Landmarks: each uses an independent silhouette and geometry.
 const places=[
 ['天府广场','Tianfu Square',0,-13,2,57,'city','城市中轴在这里展开。开阔广场、对称绿地与环形图案，串起成都中心城区的空间轮廓。','城市中轴,中心广场,对称园景'],
 ['春熙路 · 太古里','Chunxi Road & Taikoo Li',28,-9,5,58,'city','高楼与低檐相邻，青瓦街巷交织。微缩熊猫攀上商业楼体，让这片街区有了熟悉的成都表情。','青瓦街区,商业地标,攀墙熊猫'],
 ['安顺廊桥','Anshun Bridge',25,18,3,42,'city','一座带屋顶的廊桥跨过锦江。朱红立柱与青灰瓦顶在水面上形成鲜明轮廓。','锦江廊桥,青瓦红柱,临水风景'],
 ['339 · 天府熊猫塔','Chengdu TV Tower',48,-35,20,88,'city','细长塔身托起观景层与天线。以具有辨识度的广播电视塔轮廓，标记城市东侧的天际线。','城市高塔,空中观景,细长塔身'],
 ['宽窄巷子','Kuanzhai Alleys',-40,-14,2,44,'city','平行街巷与院落相互嵌合。灰瓦屋顶、院墙和小尺度绿地，构成老成都的街坊记忆。','平行街巷,灰瓦院落,老城肌理'],
 ['武侯祠 · 锦里','Wuhou Shrine & Jinli',-34,25,3,52,'city','红墙深处，殿宇沿着院落展开。与一旁的传统街巷一起，组成安静而有层次的文化街区。','红墙殿宇,传统街巷,庭院绿荫'],
 ['环球中心','Global Center',7,68,7,78,'city','四角上扬的银色屋顶围合出中央庭院，椭圆玻璃穹顶嵌入其中。横向玻璃幕墙与层叠弧形入口，依照参考图重新塑造建筑轮廓。','四角飞檐,玻璃穹顶,弧形入口'],
 ['交子公园 · 双子塔','Jiaozi Park & Twin Towers',38,66,15,85,'city','圆润的双塔以镜像曲线彼此呼应，斜切冠顶与深色竖向带勾勒出流线轮廓。细密三角幕墙、低矮椭圆裙房与滨水绿地共同构成公园前景。','弧形冠顶,曲线幕墙,滨水公园'],
 ['熊猫基地','Giant Panda Base',54,-70,2,63,'nature','竹林、步道和绿岛围合出熊猫的微缩家园。靠近可以看到以黑白几何造型搭建的大熊猫。','黑白熊猫,竹林步道,生态绿岛'],
 ['青城山','Mount Qingcheng',-119,-19,17,79,'nature','成都平原向西，山林逐渐隆起。青色屋顶藏在树木之间，远山以柔和的几何坡面层层展开。','西部山林,林间殿宇,青山叠翠'],
 ['都江堰','Dujiangyan',-84,-74,3,67,'nature','分流的水道绕过鱼嘴形堤岸。以微缩几何表现山水与水利设施相互依存的空间关系。','鱼嘴分水,江流分汊,山水相依'],
 ['麓湖','Luxelakes',100,86,2,73,'nature','水湾在林木与半岛之间分汊，折面白色别墅面向各自的临水露台与小码头。后方错层退台住宅和高层楼群，构成层次鲜明的麓湖水岸。','半岛水巷,折面别墅,错层露台'],
 ['锦江绿道','Jinjiang Greenway',70,43,1,89,'nature','锦江蜿蜒穿城，岸边绿道与林木连续展开。循着水色，看城市从老城过渡到开阔的城南。','滨水绿道,树影成行,锦江水色'],
 ['成都科幻馆','Science Fiction Museum',-27,-79,3,64,'nature','菁蓉湖畔，舒展的银色屋顶宛如漂浮的星云。中央采光眼、临湖玻璃立面与环湖步道，把科幻想象融入水岸风景。','星云屋顶,中央采光眼,菁蓉湖畔']
 ].map((d,index)=>({name:d[0],en:d[1],x:d[2],z:d[3],y:d[4],distance:d[5],type:d[6],copy:d[7],tags:d[8],index}));
 const cityBuildings=[];for(let iz=0;iz<47;iz++)for(let ix=0;ix<56;ix++){let x=-77+ix*3.8,z=-97+iz*4.2;if(x>136||Math.abs(x)<4||Math.abs(z)<3||ix%9===0||iz%8===0||distRiver(x,z)<7||mountainHeight(x,z)>1||rand()<.15)continue;if(Math.abs(x-7)<24&&Math.abs(z-68)<29)continue;if(x>69&&x<139&&z>55)continue;if(places.some(d=>Math.hypot(d.x-x,d.z-z)<(d.index===13?27:d.index===11?31:d.index===6?24:d.index===8?23:14)))continue;if(parks.some(([a,b,rx,rz])=>((x-a)/rx)**2+((z-b)/rz)**2<1))continue;const ringR=Math.hypot(x,z/.8);if(Math.min(Math.abs(ringR-43),Math.abs(ringR-73))<2.8)continue;cityBuildings.push({x,z,w:1.5+rand()*1.5,d:1.9+rand()*1.4,h:2+rand()*8+(x>10&&z>45?rand()*8:0)});}
 const dummy=new THREE.Object3D(),city=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),[facade,facade,roofmat,roofmat,facade,facade],cityBuildings.length);cityBuildings.forEach((b,i)=>{dummy.position.set(b.x,b.h/2,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();city.setMatrixAt(i,dummy.matrix);city.setColorAt(i,new THREE.Color().setHSL(.2,.1,.72+rand()*.17));});city.castShadow=true;city.receiveShadow=true;group.add(city);
 // Tianfu Square's terraced plaza and abstract yin-yang paving.
 box(0,.15,-13,22,.4,17);cyl(0,.6,-12,6,6,.14,green,60);for(let side of[-1,1]){let pts=[];for(let j=0;j<=30;j++){let a=j/30*Math.PI;pts.push([side*2.2+Math.cos(a)*2.8,.85,-12+Math.sin(a)*3.8*side]);}path(pts,stone,.6);}box(0,.4,-23,3,2,3,stone);cyl(0,2.4,-23,.5,.6,3.6,white);ball(0,6.4,-23,.6,.7,.6);
 function hall(x,z,w=8,d=5,y=0){box(x,y,z,w,2.6,d,red);box(x,y+.1,z,w+.7,.3,d+.7,stone);const roof=mesh(new THREE.CylinderGeometry(0,1,1,4),darkRoof);roof.scale.set(w*.84,2,d*.84);roof.position.set(x,y+3.5,z);roof.rotation.y=Math.PI/4;for(let k=-w/2+.5;k<w/2;k+=1.5)cyl(x+k,y+.3,z+d/2+.15,.1,.1,2.7,red,6);}
 for(let k=0;k<3;k++)for(let j=0;j<4;j++){hall(-49+j*5.7,-22+k*6.5,4.6,3.6);}
 for(let k=0;k<3;k++)hall(-34,16+k*7,10,4.5);for(let j=0;j<4;j++){hall(-45,18+j*5,4,3.5);hall(-22,18+j*5,4,3.5);}
 for(let j=0;j<3;j++)for(let k=0;k<4;k++)hall(17+k*6,-14+j*6,4.8,4);
 box(37,0,-17,9,10,8,facade);
 function panda(x,y,z,s=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);group.add(g);ball(0,1.5,0,1.35,1.5,1,white,g);ball(0,3,0,1.1,1,1,white,g);for(let side of[-1,1]){ball(side*.8,3.75,0,.4,.45,.35,black,g);ball(side*.43,3.1,.84,.3,.4,.17,black,g);ball(side*.44,3.17,.99,.08,.09,.05,white,g);ball(side*1.15,1.5,.2,.45,.9,.5,black,g);ball(side*.7,.35,.45,.5,.45,.7,black,g);}ball(0,2.82,.99,.22,.15,.14,black,g);return g;}
 // IFS sculpture faces the facade (-Z): rounded back toward the street,
 // forepaws hooked over the roof and hind feet braced against the wall.
 // Separate model keeps the sitting pandas in the bamboo grove unchanged.
 const climbing=new THREE.Group();climbing.name='IFS climbing panda';
 climbing.position.set(37,5.5,-11.55);climbing.rotation.y=Math.PI;group.add(climbing);
 ball(0,2.25,0,1.65,2.05,1.25,white,climbing);
 ball(0,3.6,.18,1.52,.85,1.18,black,climbing);
 ball(0,5.05,.82,1.23,1.1,1.02,white,climbing);
 for(const side of [-1,1]){
   ball(side*.95,5.88,.7,.44,.48,.4,black,climbing);
   ball(side*.48,5.12,1.7,.32,.4,.18,black,climbing);
   ball(side*.48,5.2,1.85,.08,.09,.04,white,climbing);
   const arm=ball(side*1.24,4.05,.95,.5,1.35,.55,black,climbing);arm.rotation.x=.5;
   ball(side*1.22,4.9,1.82,.57,.32,.65,black,climbing);
   const leg=ball(side*1.1,.95,.35,.62,.9,.65,black,climbing);leg.rotation.x=-.35;
   ball(side*1.08,.4,.96,.64,.42,.67,black,climbing);
 }
 ball(0,4.85,1.85,.3,.2,.2,black,climbing);
 ball(0,1,-1.15,.32,.32,.25,white,climbing);
 // The slender TV tower, with two viewing decks and a tapering mast.
 cyl(48,0,-35,3.5,4.5,.6);cyl(48,.6,-35,.75,1.4,31,stone);cyl(48,27,-35,3.8,2.7,2.8,glass,32);cyl(48,29.8,-35,2.5,3.8,1.5,stone,32);cyl(48,31.3,-35,2.2,2.5,1.5,glass,32);cyl(48,32.8,-35,.12,.55,10,stone,12);cyl(48,42.8,-35,.05,.12,3,gold,8);places[3].labelY=48;
 // Covered Anshun bridge, transverse to the Jinjiang.
 const bp=river.getPoint(.48),bt=river.getTangent(.48),bridge=new THREE.Group();bridge.position.set(bp.x,.45,bp.z);bridge.rotation.y=-Math.atan2(bt.z,bt.x);group.add(bridge);box(0,0,0,4,.7,13,stone,bridge);for(let z=-5;z<=5;z+=2.5)for(let side of[-1,1])cyl(side*1.5,.7,z,.12,.12,2.7,red,6,bridge);box(0,3.3,0,4.7,.4,14,darkRoof,bridge);const br=mesh(new THREE.CylinderGeometry(0,1,1,4),darkRoof,bridge);br.position.y=4;br.scale.set(3.4,1.8,10);br.rotation.y=Math.PI/4;places[2].x=bp.x;places[2].z=bp.z;
 // Global Center rebuilt from the supplied reference: raised-corner roof ring,
 // recessed atrium, elliptical glass vault and cascading curved entrance.
 const gc=new THREE.Group();gc.name='global-center';gc.position.set(7,0,68);group.add(gc);
 const silver=new THREE.MeshStandardMaterial({color:'#c6d3d2',metalness:.42,roughness:.42,side:THREE.DoubleSide});
 const glazing=new THREE.MeshStandardMaterial({color:'#557f88',metalness:.42,roughness:.24,side:THREE.DoubleSide,emissive:'#37646c',emissiveIntensity:.08});
 const domeGlass=new THREE.MeshStandardMaterial({color:'#86b8c7',metalness:.32,roughness:.2,side:THREE.DoubleSide});
 const mullion=material('#abc1c4'),atrium=material('#314f57');
 box(0,.05,1,43,.5,35,stone,gc);box(0,.55,0,34,.35,24,atrium,gc);
 const roofY=(x,z)=>10+3.9*Math.pow(Math.abs(x/19)*Math.abs(z/14),1.8);
 function surface(vertices,indices,mat,parent=gc){let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,mat,parent);}
 function edgePoint(side,t,wx,wz){return side===0?[-wx+2*wx*t,-wz]:side===1?[wx,-wz+2*wz*t]:side===2?[wx-2*wx*t,wz]:[-wx,wz-2*wz*t];}
 // Four tapered facade walls, upper eaves flare outward beyond the plinth.
 for(let side=0;side<4;side++){
  const vertices=[],indices=[],steps=40;
  for(let i=0;i<=steps;i++){let t=i/steps,[x,z]=edgePoint(side,t,19,14);vertices.push(x*.9,.7,z*.9,x,roofY(x,z)-.25,z);if(i<steps){let a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
  surface(vertices,indices,glazing);
  for(let floor=1;floor<20;floor++){let u=floor/20,points=[];for(let i=0;i<=steps;i++){let [x,z]=edgePoint(side,i/steps,19,14),scale=.9+.1*u;points.push([x*scale,.7+(roofY(x,z)-.95)*u,z*scale]);}path(points,silver,.045,gc);}
  for(let i=0;i<=steps;i+=2){let [x,z]=edgePoint(side,i/steps,19,14);path([[x*.9,.7,z*.9],[x,roofY(x,z)-.3,z]],mullion,.035,gc);}
  // Wide silver perimeter roof; the central opening is deliberately left unfilled.
  const rv=[],ri=[];
  for(let i=0;i<=steps;i++)for(let k=0;k<=4;k++){let u=k/4,[ox,oz]=edgePoint(side,i/steps,19.7,14.7),[ix,iz]=edgePoint(side,i/steps,14.4,9.3),x=ix+(ox-ix)*u,z=iz+(oz-iz)*u;rv.push(x,roofY(x,z)+.18,z);if(i<steps&&k<4){let a=i*5+k;ri.push(a,a+5,a+1,a+1,a+5,a+6);}}
  surface(rv,ri,silver);
  for(let i=0;i<=steps;i+=2){let [ox,oz]=edgePoint(side,i/steps,19.7,14.7),[ix,iz]=edgePoint(side,i/steps,14.4,9.3);path([[ix,roofY(ix,iz)+.23,iz],[ox,roofY(ox,oz)+.23,oz]],mullion,.025,gc);}
  const inner=[];for(let i=0;i<=steps;i++){let [x,z]=edgePoint(side,i/steps,14.4,9.3);inner.push([x,roofY(x,z)+.2,z]);}path(inner,silver,.11,gc);
 }
 // The central elliptic glass vault is a true curved mesh with a steel rib lattice.
 const vault=mesh(new THREE.SphereGeometry(1,64,24,0,tau,0,Math.PI/2),domeGlass,gc);vault.position.y=6.3;vault.scale.set(13.7,7.4,8.1);
 for(let i=1;i<24;i++){let x=-13.7+i*27.4/24,r=Math.sqrt(1-(x/13.7)**2),pts=[];for(let j=0;j<=30;j++){let a=j/30*Math.PI;pts.push([x,6.3+Math.sin(a)*7.43*r,Math.cos(a)*8.13*r]);}path(pts,mullion,.035,gc);}
 for(let j=1;j<14;j++){let a=j/14*Math.PI,pts=[];for(let i=0;i<=48;i++){let t=-Math.PI/2+i/48*Math.PI;pts.push([Math.sin(t)*13.73,6.3+Math.cos(t)*Math.sin(a)*7.43,Math.cos(t)*Math.cos(a)*8.13]);}path(pts,mullion,.025,gc);}
 // Interior bridges and dark courtyards visible around the vault.
 for(let side of[-1,1]){box(side*15,1,0,1.1,5,16,glazing,gc);box(0,1,side*10.8,26,4,1.1,glazing,gc);}
 // Front entrance sweeps outward in a sequence of receding curved terraces.
 for(let level=0;level<14;level++){const r=7.1-level*.19,y=.6+level*.45,pts=[];for(let i=0;i<=40;i++){let a=i/40*Math.PI;pts.push([Math.cos(a)*r,y,13+Math.sin(a)*r*.57]);}path(pts,silver,.11,gc);if(level<13){let vertices=[],indices=[];pts.forEach((p,i)=>{vertices.push(...p,p[0]*.974,p[1]+.45,13+(p[2]-13)*.974);if(i<40){let a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}});surface(vertices,indices,glazing);}}
 for(let x of[-13,-9,9,13]){let pts=[];for(let j=0;j<=20;j++){let a=j/20*Math.PI;pts.push([x+Math.cos(a)*1.05,.7+Math.sin(a)*1.9,14.1]);}path(pts,silver,.1,gc);box(x,.6,13.8,1.8,1.8,.6,glazing,gc);}
 // Paving and approach paths replace the former water strip.
 for(let i=0;i<5;i++)box(0,.15,18.2+i*.45,12+i*1.3,.16,.32,silver,gc);
 places[6].y=7;places[6].distance=88;places[6].labelY=16;
 // Financial City twin towers: oval plans, mirrored curved seams and sloping crowns.
 const twinBody=new THREE.MeshStandardMaterial({color:'#4d6573',metalness:.55,roughness:.3,emissive:'#203e5c',emissiveIntensity:0});
 const twinBand=new THREE.MeshStandardMaterial({color:'#233b4c',metalness:.48,roughness:.24,side:THREE.DoubleSide});
 const twinLattice=new THREE.LineBasicMaterial({color:'#b8c8cb',transparent:true,opacity:.62});
 const twinTrim=new THREE.MeshStandardMaterial({color:'#dce5dc',metalness:.35,roughness:.3,emissive:'#fff0c8',emissiveIntensity:0});
 const twinWindows=new THREE.MeshStandardMaterial({color:'#83949c',metalness:.3,roughness:.3,emissive:'#ffce88',emissiveIntensity:0});
 const twinGroup=new THREE.Group();twinGroup.name='financial-city-twin-towers';group.add(twinGroup);
 function towerShape(a,t,mirror){const radius=(1+.035*Math.sin(t*Math.PI))*(1-.07*t*t);const top=37.5+2.1*Math.cos(a)*mirror+.35*Math.sin(a);return [Math.cos(a)*3.8*radius,.5+t*top,Math.sin(a)*3.25*radius];}
 function seam(t,mirror){return Math.PI/2+mirror*(.16+.16*Math.sin(t*Math.PI));}
 function bandHalf(t){return .13+.12*t+.55*Math.pow(t,7);}
 function twinTower(x,mirror){const g=new THREE.Group();g.position.set(x,0,61);twinGroup.add(g);const cols=96,rows=100,pos=[],idx=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){pos.push(...towerShape(i/cols*tau,j/rows,mirror));if(j<rows&&i<cols){let a=j*(cols+1)+i;idx.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}}
  surface(pos,idx,twinBody,g);
  // Dark curved inset ribbon widens toward the crown, bordered by bright continuous ribs.
  let bp=[],bi=[];for(let j=0;j<=rows;j++){let t=j/rows;for(let i=0;i<=12;i++){let a=seam(t,mirror)+(i/12*2-1)*bandHalf(t),p=towerShape(a,t,mirror);p[0]*=1.003;p[2]*=1.003;bp.push(...p);if(j<rows&&i<12){let k=j*13+i;bi.push(k,k+13,k+1,k+1,k+13,k+14);}}}surface(bp,bi,twinBand,g);
  for(let side of[-1,1]){let pts=[];for(let j=0;j<=100;j++){let t=j/100,p=towerShape(seam(t,mirror)+side*bandHalf(t),t,mirror);p[0]*=1.008;p[2]*=1.008;pts.push(p);}path(pts,twinTrim,.045,g);}
  // Fine triangulated screen follows the curved skin; no thick horizontal slabs.
  const web=[];const n=96,m=135;
  function webPoint(i,j){const t=j/m,a=(i+(j%2)*.5)/n*tau,p=towerShape(a,t,mirror);p[0]*=1.007;p[2]*=1.007;return {a,t,p};}
  function outside(q){let d=Math.atan2(Math.sin(q.a-seam(q.t,mirror)),Math.cos(q.a-seam(q.t,mirror)));return Math.abs(d)>bandHalf(q.t)+.018;}
  for(let j=0;j<m;j++)for(let i=0;i<n;i++){let a=webPoint(i,j);for(const [ii,jj]of[[i+1,j],[i,j+1],[i+(j%2?1:-1),j+1]]){let b=webPoint(ii,jj);if(outside(a)&&outside(b))web.push(...a.p,...b.p);}}
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(web,3));g.add(new THREE.LineSegments(wg,twinLattice));
  // Fine floor lines are visible through the dark central ribbon.
  for(let j=1;j<58;j++){let t=j/58,pts=[];for(let i=0;i<=12;i++){let p=towerShape(seam(t,mirror)+(i/12*2-1)*bandHalf(t)*.94,t,mirror);p[0]*=1.009;p[2]*=1.009;pts.push(p);}path(pts,mullion,.022,g);}
  const rim=[];for(let i=0;i<=96;i++)rim.push(towerShape(i/96*tau,1,mirror));path(rim,twinTrim,.055,g);
  // The roof closes along its actual sloping ellipse, with recessed plant deck.
  let cap=[0,38,0],ci=[];for(let i=0;i<=96;i++){let p=towerShape(i/96*tau,1,mirror);cap.push(p[0]*.96,p[1]-.35,p[2]*.96);if(i<96)ci.push(0,i+1,i+2);}surface(cap,ci,twinBand,g);
  for(let i=0;i<12;i++){let p=towerShape(i/12*tau,1,mirror);cyl(p[0],p[1],p[2],.035,.035,.2,twinBand,5,g);}
  // Ground-level glazing and scattered warm office windows.
  for(let i=0;i<44;i++){let a=i/44*tau;const p=towerShape(a,.015,mirror);const w=box(p[0],.6,p[2],.26,1.1,.055,twinWindows,g);w.rotation.y=Math.PI/2-a;}
  for(let i=0;i<110;i++){let t=.07+rand()*.85,a=rand()*tau,p=towerShape(a,t,mirror);if(Math.abs(a-seam(t,mirror))<bandHalf(t))continue;let w=box(p[0]*1.009,p[1],p[2]*1.009,.15+rand()*.3,.08,.025,twinWindows,g);w.rotation.y=Math.PI/2-a;}
 }
 twinTower(32.5,-1);twinTower(45,1);
 // Low oval pavilion and terraces between the towers and the park lake.
 const pavilion=mesh(new THREE.SphereGeometry(1,40,18,0,tau,0,Math.PI/2),silver,twinGroup);pavilion.position.set(38.7,.5,69);pavilion.scale.set(9.6,2.1,5.4);
 for(let i=0;i<7;i++)box(38.7,.15+i*.08,74+i*.35,17+i*.5,.12,.32,stone,twinGroup);
 places[7].y=18;places[7].distance=99;places[7].labelY=43;

 const parkLake=Array.from({length:45},(_,i)=>[45+Math.cos(i/45*tau)*15,84+Math.sin(i/45*tau)*7]);polygon(parkLake,water,.3);
 // Luxelakes: a branching lake district, planted peninsulas and sculptural housing.
 const luxLake=[[72,68],[82,64],[97,65],[108,64],[122,66],[134,69],[137,81],[135,95],[130,103],[78,103],[71,96],[70,82]];
 polygon(luxLake,water,.48);
 const luxLand=[],luxVillas=[];
 const luxGrass=material('#85ab70'),luxBank=material('#bbc6a0'),luxRoof=material('#f0ead9'),luxWall=material('#e8e1ce'),luxWood=material('#9c7160');
 luxRoof.side=THREE.DoubleSide;
 const luxGlass=new THREE.MeshStandardMaterial({color:'#4a747a',metalness:.35,roughness:.24});
 // Clear generic riverbank planting from the district; replant only on dry land.
 for(let i=leaves.length-1;i>=0;i--){let t=leaves[i];if(t.x>70&&t.x<139&&t.z>61)leaves.splice(i,1);}
 function smoothLand(points){points=points.map(([x,z],i)=>[x+Math.sin(i*2.1+x)*.6,z+Math.cos(i*1.7+z)*.4]);const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'catmullrom',.25);const pts=curve.getPoints(80).map(p=>[p.x,p.z]);luxLand.push(pts);polygon(pts,luxGrass,.82);path([...pts,pts[0]].map(([x,z])=>[x,.67,z]),luxBank,.23);return pts;}
 function luxTree(x,z,s=.65){tree(x,z,s);leaves[leaves.length-1].y=.82;}
 function villa(x,z,rotation=0,folded=true){const g=new THREE.Group();g.position.set(x,.84,z);g.rotation.y=rotation;group.add(g);luxVillas.push({x,z});
  box(0,0,0,2.8,1.6,2.6,luxWall,g);box(.35,1.6,-.25,2.7,1.3,2.3,luxWall,g);
  box(0,.25,1.32,2.2,1.15,.04,luxGlass,g);box(.3,1.8,.93,2.1,.8,.04,luxGlass,g);box(-1.42,.3,.1,.04,1.1,1.75,luxGlass,g);
  box(.4,1.65,1.35,2.9,.13,1,luxRoof,g);box(.4,1.8,1.81,2.8,.4,.035,luxGlass,g);
  box(0,.08,2.2,2.4,.13,1.4,luxWood,g);path([[-1.1,.3,2.82],[1.1,.3,2.82]],stone,.025,g);
  if(folded){surface([-1.3,3.05,-1.5, 1.8,3.2,-1.5, 1.9,3.05,1.3, -.3,3.7,.4, -1.6,3.15,1.4],[0,1,3,1,2,3,2,4,3,4,0,3],luxRoof,g);}
  else{box(.35,2.93,-.25,3.15,.18,2.65,luxRoof,g);box(-1.15,0,.5,.23,2.1,.23,luxRoof,g);box(-.2,1.85,1.02,.5,.75,.07,red,g);}
  // A small individual waterside landing, rather than bridges across the whole lake.
  box(0,.02,3.3,.5,.1,.85,luxWood,g);box(0,0,3.9,1.45,.12,.65,luxWood,g);
 }
 // Four wooded fingers reach south from the northern shore.
 for(const [cx,tip]of[[79,86],[96,83],[112,86],[129,82]]){
  smoothLand([[cx-5,67],[cx+5,67],[cx+4,tip-5],[cx+2.4,tip],[cx-1,tip+1.2],[cx-4,tip-4]]);
  for(let row=0;row<3;row++){let z=71+row*4;for(let side of[-1,1]){villa(cx+side*1.45,z,side===1?-Math.PI/2:Math.PI/2,(row+cx)%3!==0);luxTree(cx+side*3.6,z+1.7,.65);}}
  for(let k=0;k<15;k++){let z=68+rand()*(tip-69);luxTree(cx+(rand()-.5)*1.3,z,.6+rand()*.4);}luxTree(cx,tip-.8,.9);
  path([[cx,.92,67],[cx,.92,tip-2]],stone,.13);
 }
 // Southern coves face the central open water, interleaving with the northern fingers.
 for(const [cx,tip]of[[86,92],[103,91],[121,92]]){
  smoothLand([[cx-7,103],[cx+7,103],[cx+6,tip+5],[cx+2,tip],[cx-2,tip-.6],[cx-5,tip+3]]);
  for(let j=0;j<3;j++){villa(cx-3.4+j*3.4,tip+4+j%2,-Math.PI,j%2===0);luxTree(cx-4+j*4,tip+7,.85);}
  for(let j=0;j<9;j++)luxTree(cx-5+rand()*10,100+rand()*2,.55+rand()*.45);
  path([[cx-5,.9,102],[cx,.9,tip+7],[cx+5,.9,102]],stone,.16);
 }
 // Dense planted buffers surround the villas while leaving each building unobstructed.
 function inLuxLand(x,z,pts){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [a,b]=pts[i],[c,d]=pts[j];if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)inside=!inside;}return inside;}
 for(const pts of luxLand){const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);for(let i=0;i<160;i++){const x=minX+rand()*(maxX-minX),z=minZ+rand()*(maxZ-minZ);if(inLuxLand(x,z,pts)&&!luxVillas.some(v=>Math.hypot(v.x-x,v.z-z)<2.3))luxTree(x,z,.65+rand()*.65);}}
 // A green island and a low sculptural lakeside pavilion.
 smoothLand([[112,89],[116,88.8],[118,90.5],[116.5,92.3],[112,91.8],[110.5,90.5]]);
 for(let i=0;i<7;i++)luxTree(112+rand()*4,89.5+rand()*1.6,.55);
 const sail=new THREE.Group();sail.position.set(74,.9,89);group.add(sail);box(0,0,0,4,1.2,3,luxGlass,sail);surface([-2.7,1.3,-2,2.7,1.4,-2,2.5,1.5,2,0,3.1,.2,-2.8,1.4,2],[0,1,3,1,2,3,2,4,3,4,0,3],luxRoof,sail);
 // Staggered apartment terraces and taller waterfront residential towers.
 function luxApartment(x,z,height,width,levels){const g=new THREE.Group();g.position.set(x,.2,z);group.add(g);box(0,0,0,width*.55,height,width*.63,luxGlass,g);const step=height/levels;
  for(let floor=0;floor<levels;floor++){let offset=Math.sin(floor*.85)*.45,shrink=floor>levels*.73?1-(floor-levels*.73)*.035:1,w=width*shrink;
   box(offset,floor*step,0,w,step*.89,width*.69,luxGlass,g);box(offset,floor*step,0,w+.55,.12,width*.77,luxRoof,g);
   for(let side of[-1,1]){const zz=side*width*.42,xx=offset+(floor%3-1)*w*.16;box(xx,floor*step,zz,w*.66,.13,.85,luxRoof,g);box(xx,floor*step+.2,zz+side*.42,w*.66,.35,.035,luxGlass,g);
    if(floor%3===0){box(xx-w*.33,floor*step,zz,.13,step*2,.13,luxRoof,g);box(xx+w*.33,floor*step,zz,.13,step*2,.13,luxRoof,g);box(xx,floor*step+step*2,zz,w*.66,.13,.2,luxRoof,g);}}
  }
 }
 for(const [x,z,h,w,n]of[[78,62,12,6,8],[89,59,24,5.2,23],[101,61,14,7,10],[113,59,20,5.5,19],[127,61,16,6,14]])luxApartment(x,z,h,w,n);
 places[11].x=103;places[11].z=85;places[11].y=3;places[11].distance=72;places[11].labelY=7;
 // Bamboo grove and several modeled pandas.
 for(const [x,z,s]of[[54,-70,1.5],[62,-67,1],[48,-76,1.1]])panda(x,.1,z,s);
 for(let i=0;i<80;i++){let a=rand()*tau,r=9+rand()*10,x=54+Math.cos(a)*r,z=-70+Math.sin(a)*r*.7;cyl(x,0,z,.07,.09,3+rand()*2,green,5);}
 path([[37,.3,-66],[44,.3,-63],[58,.3,-62],[69,.3,-72]],stone,.8);
 hall(-119,-19,9,6,mountainHeight(-119,-19));places[9].y=mountainHeight(-119,-19)+3;
 // Dujiangyan fork: two branches and an elongated island at the split.
 for(const side of[-1,1]){polygon([[-91,-94],[-86,-93],[-80+side*8,-72],[-74+side*11,-54],[-79+side*11,-53],[-85+side*8,-71]],water,.45);}polygon([[-85,-84],[-80,-68],[-85,-61],[-89,-69]],stone,.6);hall(-72,-68,7,4);
 // Chengdu Science Fiction Museum: fluid nebula canopy around a skylit eye.
 const sciX=-27,sciZ=-79;
 const sciLake=Array.from({length:96},(_,i)=>{const a=i/96*tau,r=1+.09*Math.sin(3*a)+.05*Math.cos(5*a);return[sciX+Math.cos(a)*25*r,sciZ+Math.sin(a)*18*r];});
 polygon(sciLake,water,.48);
 const sci=new THREE.Group();sci.position.set(sciX,.6,sciZ);group.add(sci);
 const sciSilver=new THREE.MeshStandardMaterial({color:'#dce3df',metalness:.45,roughness:.38,side:THREE.DoubleSide});
 const sciGlass=new THREE.MeshStandardMaterial({color:'#477e7c',metalness:.35,roughness:.2});
 // Hand-shaped unequal star tips and concave bays, traced from the supplied aerial reference.
 const sciOutline=[[-17,7],[-12,1],[-16,-3],[-11,-5],[-12,-12],[-4,-11],[5,-12],[10,-11],[8,-6],[16,-3],[18,0],[11,3],[9,7],[3,6],[-3,7],[-12,11]];
 const boundary=new THREE.CatmullRomCurve3(sciOutline.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal',.12);
 const eyeCurve=new THREE.CatmullRomCurve3([[-6,-5],[-1,-4],[4,-1],[3,2],[0,2.5],[-3,0]].map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');
 const steps=192,bands=24;
 const roofPoint=(u,t)=>{const outer=boundary.getPoint(u),inner=eyeCurve.getPoint(u);return new THREE.Vector3(THREE.MathUtils.lerp(inner.x,outer.x,t),6.5+.8*Math.sin(Math.PI*t)-.6*Math.sin(u*tau*2)*t,THREE.MathUtils.lerp(inner.z,outer.z,t));};
 function sciSurface(point,mat){const v=[],ix=[];for(let j=0;j<=bands;j++)for(let i=0;i<=steps;i++){const p=point(i/steps,j/bands);v.push(p.x,p.y,p.z);}for(let j=0;j<bands;j++)for(let i=0;i<steps;i++){const k=j*(steps+1)+i,l=k+steps+1;ix.push(k,l,k+1,k+1,l,l+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return mesh(g,mat,sci);}
 sciSurface(roofPoint,sciSilver);
 const rim=Array.from({length:steps+1},(_,i)=>{const v=roofPoint(i/steps,1);return[v.x,v.y,v.z];});path(rim,white,.085,sci);
 // Recessed triangular-teardrop glass eye, with a sloping silver reveal.
 sciSurface((u,t)=>{const p=eyeCurve.getPoint(u),r=1-.16*t;return new THREE.Vector3(p.x*r,6.5-.7*t,p.z*r);},sciSilver);
 const eyePts=Array.from({length:steps},(_,i)=>eyeCurve.getPoint(i/steps));const eyeShape=new THREE.Shape(eyePts.map(p=>new THREE.Vector2(p.x*.84,-p.z*.84)));const eyeMesh=mesh(new THREE.ShapeGeometry(eyeShape),new THREE.MeshStandardMaterial({color:'#526877',metalness:.45,roughness:.25,side:THREE.DoubleSide}),sci);eyeMesh.rotation.x=-Math.PI/2;eyeMesh.position.y=5.8;
 // Dense contours follow the roof instead of the former radial flower ribs.
 for(let j=2;j<24;j++){const pts=Array.from({length:steps+1},(_,i)=>{const p=roofPoint(i/steps,j/24);return[p.x,p.y+.018,p.z];});path(pts,stone,.018,sci);}
 const terraceMat=material('#acb4af'),sciDark=material('#344d50');
 // Broad stepped ribbons with recessed glazing: the lower building is not a vertical drum.
 for(const [scale,y,shift]of[[1.30,1.05,2.2],[1.17,2.8,1.3],[.84,5.45,0]]){
  const pts=Array.from({length:steps},(_,i)=>{const p=boundary.getPoint(i/steps);return new THREE.Vector2(p.x*scale,-(p.z*scale+shift));});const shape=new THREE.Shape(pts);
  const slab=mesh(new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:true,bevelSegments:2,bevelSize:.12,bevelThickness:.08,steps:1}),y>5?sciDark:terraceMat,sci);slab.rotation.x=-Math.PI/2;slab.position.y=y;
  sciSurface((u,t)=>{const p=boundary.getPoint(u);return new THREE.Vector3(p.x*scale*.92,y-1.45+1.45*t,p.z*scale*.92+shift);},sciGlass);
  const rail=Array.from({length:steps+1},(_,i)=>{const p=boundary.getPoint(i/steps);return[p.x*scale,y+.4,p.z*scale+shift];});path(rail,white,.14,sci);
 }
 // Sweeping ramp descends from the terrace to the forecourt on the near bank.
 sciSurface((u,t)=>{const x=-18+u*29,z=13+2.8*Math.sin(u*Math.PI);return new THREE.Vector3(x,3.05*(1-u)+.3,z+t*2.8);},stone);
 const apron=Array.from({length:steps},(_,i)=>{const p=boundary.getPoint(i/steps);return[sciX+p.x*1.42,sciZ+p.z*1.30+4];});polygon(apron,stone,.58);
 for(let i=0;i<8;i++)box(-14,.6+i*.19,8-i*.5,5,.2,1.2,white,sci);
 path([[sciX-17,.7,sciZ+16],[sciX-6,.7,sciZ+20],[sciX+18,.5,sciZ+19]],stone,.8);
 for(let i=0;i<40;i++){const a=i/40*tau;tree(sciX+Math.cos(a)*27,sciZ+Math.sin(a)*20,.65+rand()*.45);}
 places[13].labelY=8;
 // Trees use instancing, including the western mountain belt.
 for(let i=leaves.length-1;i>=0;i--){const t=leaves[i];if(((t.x-sciX)/25)**2+((t.z-sciZ)/18)**2<1||((t.x-38.7)/10.3)**2+((t.z-69)/6)**2<1||[32.5,45].some(x=>((t.x-x)/4.2)**2+((t.z-61)/3.7)**2<1))leaves.splice(i,1);}
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.16,1.3,5),bark,leaves.length),crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),material('#ffffff'),leaves.length);leaves.forEach((t,i)=>{dummy.position.set(t.x,t.y+t.s*.7,t.z);dummy.scale.set(t.s,t.s,t.s);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=t.y+t.s*1.9;dummy.scale.set(t.s,t.s*1.4,t.s);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);crowns.setColorAt(i,new THREE.Color().setHSL(.24+rand()*.08,.3,.37+rand()*.15));});group.add(trunks,crowns);crowns.castShadow=true;
 const cars=[];for(let i=0;i<18;i++){const m=box(0,.3,0,.6,.4,1.2,i%3?white:red);cars.push({m,offset:i/18});}const boats=[];for(let i=0;i<5;i++){let g=new THREE.Group();group.add(g);box(0,0,0,.7,.4,1.9,red,g);box(0,.4,0,.6,.3,1.1,stone,g);boats.push(g);}
 function update(elapsed,mode){const night=mode==='night';twinTrim.emissiveIntensity=night?1.2:0;twinWindows.emissiveIntensity=night?1.6:0;twinBody.emissiveIntensity=night?.22:0;twinLattice.opacity=night?.35:.62;cars.forEach(({m,offset})=>{const a=(elapsed*.035+offset*tau);m.position.set(Math.cos(a)*73,.4,Math.sin(a)*58.4);m.rotation.y=-a;});boats.forEach((g,i)=>{const t=(elapsed*.012+i/5)%1,p=river.getPoint(t),v=river.getTangent(t);g.position.copy(p);g.position.y=.65;g.rotation.y=Math.atan2(v.x,v.z);});}
 function drawMap(ctx,mapPoint){ctx.fillStyle='#e0e6d1';ctx.fillRect(0,0,240,170);ctx.fillStyle='#aac393';for(let x=-140;x<-80;x+=5)for(let z=-101;z<101;z+=5)if(mountainHeight(x,z)>2)ctx.fillRect(...mapPoint(x,z),5,5);ctx.strokeStyle='#afbdab';ctx.lineWidth=1.7;for(let pts of rings){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...mapPoint(p[0],p[2])):ctx.moveTo(...mapPoint(p[0],p[2])));ctx.stroke();}ctx.strokeStyle='#66aaa0';ctx.lineWidth=4;ctx.beginPath();riverPoints.forEach((p,i)=>i?ctx.lineTo(...mapPoint(p.x,p.z)):ctx.moveTo(...mapPoint(p.x,p.z)));ctx.stroke();ctx.fillStyle='#78b4a7';for(const pts of[parkLake,luxLake,sciLake]){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...mapPoint(...p)):ctx.moveTo(...mapPoint(...p)));ctx.closePath();ctx.fill();}ctx.fillStyle='#98b789';for(const pts of luxLand){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...mapPoint(...p)):ctx.moveTo(...mapPoint(...p)));ctx.closePath();ctx.fill();}ctx.fillStyle='#eef0df';luxVillas.forEach(p=>ctx.fillRect(...mapPoint(p.x,p.z),1.5,1.4));ctx.fillStyle='#9dac98';cityBuildings.forEach((b,i)=>{if(i%3===0)ctx.fillRect(...mapPoint(b.x,b.z),1.4,1.5);});}
 return {group,destinations:places,update,drawMap};
}
