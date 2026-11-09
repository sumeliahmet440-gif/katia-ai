/* Katia Arcade: 10 playable mini-games; independent multi-touch controls */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const games=[
 ['mario','🍄','Mario','30 bölümlük platform macerası'],
 ['dk','▣','Donkey Kong','Varillere dikkat et, yukarı tırman'],
 ['flappy','▣','Flappy Bird','Dokun, uç ve borulardan geç'],
 ['snake','▣','Yılan','Yemleri topla, kendine çarpma'],
 ['tetris','🧱','Tetris','Blokları döndür ve satırları temizle'],
 ['breakout','🟠','Tuğla Kırma','Topu sektir, tuğlaları parçala'],
 ['pong','🏓','Pong','Rakibe karşı sayı kazan'],
 ['space','▣','Uzay Savaşı','Düşmanları vur ve hayatta kal'],
 ['memory','🧠','Hafıza','Aynı kartları eşleştir'],
 ['2048','🔢','2048','Aynı sayıları birleştir'],
 ['detective','🕵️','Dedektif Kuzenler','Dedektiflik yap, delilleri bul ve davaları çöz'],
 ['chess','♟️','Satranç','Yapay zekâya veya çevrim içi arkadaşına karşı oyna']
];
const root=document.createElement('section');root.id='arcade';root.innerHTML='<div id="arcTop"><strong>🎮 KATIA ARCADE</strong><span id="arcStatus">11 OYUN</span><button id="arcBack">MENÜ</button><button id="arcClose">KAPAT ✕</button></div><div id="arcMenu"></div><div id="arcStage"><canvas id="arcCanvas" width="960" height="540"></canvas><div id="arcHint"></div><div id="arcPad"><div class="arc-side"><button class="arc-key" data-key="left">◀</button><button class="arc-key" data-key="right">▶</button></div><div class="arc-side"><button class="arc-key" data-key="up">▲</button><button class="arc-key" data-key="down">▼</button><button class="arc-key" data-key="jump">⤒</button><button class="arc-key" data-key="action">●</button></div></div><div id="arcPortrait">📱<br>Oyunu yatay oynamak için telefonu çevir.</div></div><iframe id="chessFrame" title="Katia Satranç" hidden src="about:blank" allow="fullscreen"></iframe>';
document.body.appendChild(root);
const menu=$('#arcMenu'),stage=$('#arcStage'),canvas=$('#arcCanvas'),ctx=canvas.getContext('2d'),hint=$('#arcHint'),status=$('#arcStatus'),pad=$('#arcPad');
const keys=new Set();let game='',state=null,raf=0,last=0,score=0,over=false,paused=false;
menu.innerHTML=games.map(g=>'<button class="arc-card" data-game="'+g[0]+'"><b>'+g[1]+' '+g[2]+'</b><small>'+g[3]+'</small></button>').join('');
const say=(t)=>{hint.textContent=t};
function open(){root.classList.add('on');showMenu()}
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data&&e.data.type==='katia-chess-exit')showMenu()});
function showMenu(){stop();const cf=$('#chessFrame');if(cf){cf.hidden=true;cf.src='about:blank'}menu.style.display='grid';stage.classList.remove('on');status.textContent='12 OYUN';game='';keys.clear();unlock();}
function stop(){cancelAnimationFrame(raf);raf=0;keys.clear();activePointers.clear();pad.querySelectorAll('button').forEach(b=>b.classList.remove('down'))}
function close(){showMenu();root.classList.remove('on')}
function unlock(){try{if(screen.orientation?.unlock)screen.orientation.unlock()}catch(e){}try{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{})}catch(e){}}
async function landscape(){try{if(matchMedia('(pointer:coarse)').matches){await root.requestFullscreen?.();await screen.orientation?.lock?.('landscape')}}catch(e){}}
function start(id){if(id==='chess'){stop();game='chess';menu.style.display='none';stage.classList.remove('on');const cf=$('#chessFrame');cf.hidden=false;cf.src='/satranc.html?embed=1';status.textContent='♟ SATRANÇ';return}if(id==='mario'){close();if(typeof window.openGame==='function')window.openGame('mario');else alert('Mario motoru yüklenemedi.');return}
stop();game=id;score=0;over=false;paused=false;menu.style.display='none';stage.classList.add('on');canvas.dataset.game=id;status.textContent=games.find(g=>g[0]===id)?.[2]||id;pad.style.display=['memory','2048'].includes(id)?'none':'flex';say(help(id));state=init(id);last=performance.now();landscape();raf=requestAnimationFrame(loop)}
function help(id){return ({dk:'← → hareket · ↑ üst kata çık · ⤒ zıpla · varillerden kaç',flappy:'Zıpla / dokun: kanat çırp',snake:'Oklar veya A-D-W-S',tetris:'← → hareket · ↓ hızlandır · ● döndür',breakout:'← → veya fare / dokunmatik',pong:'↑ ↓ veya ◀ ▶',space:'← → hareket · ● ateş',memory:'Kartlara dokunarak çiftleri bul', '2048':'Kaydır veya ok tuşlarıyla sayıları birleştir'})[id]||''}
function init(id){
 if(id==='dk')return {x:100,y:430,vx:0,vy:0,ground:true,barrels:[],tick:0,lives:3,goal:0,level:0,inv:0};
 if(id==='flappy')return {x:180,y:250,vy:0,pipes:[],tick:0,alive:true};
 if(id==='snake')return {body:[[10,10],[9,10],[8,10]],dir:[1,0],next:[1,0],food:[15,10],tick:0};
 if(id==='tetris')return {grid:Array.from({length:20},()=>Array(10).fill(0)),piece:null,tick:0,drop:0,lines:0};
 if(id==='breakout')return {x:480,y:440,vx:260,vy:-260,paddle:480,lives:3,bricks:Array.from({length:5},(_,r)=>Array.from({length:12},(_,c)=>({x:38+c*74,y:65+r*30,on:true})))};
 if(id==='pong')return {x:480,y:270,vx:260,vy:150,p:270,ai:270,points:0};
 if(id==='space')return {x:480,bullets:[],enemies:[],tick:0,lives:3};
 if(id==='memory'){let a=[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8].sort(()=>Math.random()-.5);return {cards:a.map(v=>({v,show:false,done:false})),first:-1,wait:0,moves:0,won:false}}
 if(id==='2048'){let b=Array(16).fill(0);add2048(b);add2048(b);return {b,turns:0,won:false}}
}
function add2048(b){let e=b.map((v,i)=>v? -1:i).filter(i=>i>=0);if(e.length)b[e[Math.floor(Math.random()*e.length)]]=Math.random()<.9?2:4}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
function text(t,x,y,size=24,color='#fff',align='left'){ctx.fillStyle=color;ctx.font='bold '+size+'px system-ui';ctx.textAlign=align;ctx.fillText(t,x,y)}
function base(bg='#0b1c2b'){rect(0,0,960,540,bg)}
function gameOver(t){over=true;say(t+' · Yeniden başlamak için ekrana dokun veya oyunu seç')}
function update(dt){
 const k=keys;
 if(game==='dk'){
  let s=state;s.tick+=dt;s.inv=Math.max(0,s.inv-dt);s.vx=(k.has('left')?-1:0)+(k.has('right')?1:0);s.x=Math.max(30,Math.min(930,s.x+s.vx*250*dt));
  if(k.has('jump')&&s.ground){s.vy=-470;s.ground=false}
  s.vy+=1050*dt;s.y+=s.vy*dt;const floors=[430,330,230,130,30];if(s.y>=floors[s.level]){s.y=floors[s.level];s.vy=0;s.ground=true}
  if(k.has('up')&&!s.upWas&&s.ground&&s.level<4){s.level++;s.y=floors[s.level];s.ground=true}s.upWas=k.has('up');if(k.has('down')&&!s.downWas&&s.ground&&s.level>0){s.level--;s.y=floors[s.level];s.ground=true}s.downWas=k.has('down');
  if(s.tick>1.15){s.tick=0;s.barrels.push({x:930,y:floors[Math.max(0,s.level-1)]-18,level:Math.max(0,s.level-1),v:190+score*.02})}
  s.barrels.forEach(b=>b.x-=b.v*dt);s.barrels=s.barrels.filter(b=>b.x>-30);
  if(s.inv<=0&&s.barrels.some(b=>Math.abs(b.x-s.x)<34&&Math.abs(b.y-(s.y-10))<32)){s.lives--;s.inv=1.3;s.x=100;s.y=floors[s.level];s.barrels=[];if(s.lives<=0)gameOver('Oyun bitti')}
  if(s.level===4&&s.x>875){s.goal++;score+=150;s.level=0;s.x=55;s.y=floors[0];s.barrels=[];s.lives=Math.min(3,s.lives+1)}
 }else if(game==='flappy'){
  let s=state;s.tick+=dt;if(k.has('jump')||k.has('action')){if(!s.was)s.vy=-330;s.was=true}else s.was=false;
  s.vy+=900*dt;s.y+=s.vy*dt;
  if(s.tick>1.5){s.tick=0;let gap=155,top=70+Math.random()*230;s.pipes.push({x:990,top,gap,passed:false})}
  s.pipes.forEach(p=>p.x-=210*dt);s.pipes=s.pipes.filter(p=>p.x>-80);
  for(const p of s.pipes){if(!p.passed&&p.x< s.x){p.passed=true;score++}if(s.x+15>p.x&&s.x-15<p.x+55&&(s.y-14<p.top||s.y+14>p.top+p.gap))gameOver('Çarptın')}
  if(s.y<0||s.y>540)gameOver('Düştün');
 }else if(game==='snake'){
  let s=state;s.tick+=dt;if(k.has('left'))s.next=[-1,0];if(k.has('right'))s.next=[1,0];if(k.has('up'))s.next=[0,-1];if(k.has('down'))s.next=[0,1];
  if(s.tick>.12){s.tick=0;if(!(s.next[0]===-s.dir[0]&&s.next[1]===-s.dir[1]))s.dir=s.next.slice();let h=[s.body[0][0]+s.dir[0],s.body[0][1]+s.dir[1]];
   if(h[0]<0||h[0]>=30||h[1]<0||h[1]>=16||s.body.some(p=>p[0]===h[0]&&p[1]===h[1]))gameOver('Yılan çarptı');
   else{s.body.unshift(h);if(h[0]===s.food[0]&&h[1]===s.food[1]){score+=10;let x,y;do{x=Math.floor(Math.random()*30);y=Math.floor(Math.random()*16)}while(s.body.some(p=>p[0]===x&&p[1]===y));s.food=[x,y]}else s.body.pop()}
  }
 }else if(game==='tetris'){
  let s=state;s.drop+=dt;if(!s.piece)newPiece(s);if(k.has('left')){if(!s.leftWas){movePiece(s,-1,0);s.leftWas=true}}else s.leftWas=false;if(k.has('right')){if(!s.rightWas){movePiece(s,1,0);s.rightWas=true}}else s.rightWas=false;
  if(k.has('action')){if(!s.actWas){rotate(s);s.actWas=true}}else s.actWas=false;
  if(s.drop>((k.has('down') ? 0.06 : 0.55))){s.drop=0;if(!movePiece(s,0,1)){lockPiece(s)}}
 }else if(game==='breakout'){
  let s=state;s.paddle+=(k.has('left')?-1:0)*560*dt;s.paddle+=(k.has('right')?1:0)*560*dt;s.paddle=Math.max(55,Math.min(905,s.paddle));
  const oy=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;
  if(s.x<12){s.x=12;s.vx=Math.abs(s.vx)}if(s.x>948){s.x=948;s.vx=-Math.abs(s.vx)}
  if(s.y<12){s.y=12;s.vy=Math.abs(s.vy)}
  if(s.vy>0&&oy<440&&s.y>=440&&Math.abs(s.x-s.paddle)<76){s.y=440;s.vy=-Math.abs(s.vy);s.vx+=((s.x-s.paddle)/76)*95}
  for(const row of s.bricks)for(const b of row)if(b.on&&s.x>b.x-7&&s.x<b.x+67&&s.y>b.y-7&&s.y<b.y+27){b.on=false;s.vy*=-1;score+=10;break}
  if(s.y>555){s.lives--;if(s.lives<=0)gameOver('Top kayboldu');else{s.x=s.paddle;s.y=440;s.vx=230*(Math.random()<.5?-1:1);s.vy=-260}}
  if(s.bricks.every(r=>r.every(b=>!b.on)))gameOver('Kazandın!');
 }else if(game==='pong'){
  let s=state;s.p+=(k.has('up')||k.has('left')?-1:0)*390*dt;s.p+=(k.has('down')||k.has('right')?1:0)*390*dt;s.p=Math.max(58,Math.min(482,s.p));
  s.ai+=(s.y-s.ai)*Math.min(1,dt*2.4);s.x+=s.vx*dt;s.y+=s.vy*dt;
  if(s.y<14){s.y=14;s.vy=Math.abs(s.vy)}if(s.y>526){s.y=526;s.vy=-Math.abs(s.vy)}
  if(s.vx<0&&s.x<48&&Math.abs(s.y-s.p)<68){s.x=48;s.vx=Math.abs(s.vx)*1.04;s.vy+=(s.y-s.p)*1.3}
  if(s.vx>0&&s.x>912&&Math.abs(s.y-s.ai)<68){s.x=912;s.vx=-Math.abs(s.vx)*1.02;s.vy+=(s.y-s.ai)*.9}
  if(s.x<0){s.points--;if(s.points<=-7)gameOver('Rakip kazandı');else{s.x=480;s.y=270;s.vx=260;s.vy=(Math.random()-.5)*220}}
  if(s.x>960){s.points++;score=s.points;if(s.points>=7)gameOver('Kazandın! 7 sayı');else{s.x=480;s.y=270;s.vx=-260;s.vy=(Math.random()-.5)*220}}
 }else if(game==='2048'){
  const dir=k.has('left')?'left':k.has('right')?'right':k.has('up')?'up':k.has('down')?'down':'';
  if(dir&&!s.moveWas){move2048(s,dir);s.moveWas=true}else if(!dir)s.moveWas=false;
 }else if(game==='space'){
  let s=state;s.tick+=dt;s.x+=(k.has('left')?-1:0)*300*dt;s.x+=(k.has('right')?1:0)*300*dt;s.x=Math.max(30,Math.min(930,s.x));
  if((k.has('action')||k.has('jump'))&&!s.fire){s.bullets.push({x:s.x,y:470});s.fire=true}if(!k.has('action')&&!k.has('jump'))s.fire=false;
  s.bullets.forEach(b=>b.y-=430*dt);s.bullets=s.bullets.filter(b=>b.y>0);
  if(s.tick>.8){s.tick=0;s.enemies.push({x:40+Math.random()*880,y:-20,v:70+Math.random()*60})}
  s.enemies.forEach(e=>e.y+=e.v*dt);
  s.enemies=s.enemies.filter(e=>{let hit=s.bullets.findIndex(b=>Math.abs(b.x-e.x)<22&&Math.abs(b.y-e.y)<25);if(hit>=0){s.bullets.splice(hit,1);score+=10;return false}if(e.y>470&&Math.abs(e.x-s.x)<28){s.lives--;if(s.lives<=0)gameOver('Uzay gemisi yok oldu');return false}return e.y<570});
 }else if(game==='memory'){if(state.wait>0){state.wait-=dt;if(state.wait<=0){for(const c of state.cards)if(!c.done)c.show=false;state.first=-1}}}
}
const SHAPES=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
function newPiece(s){const shape=SHAPES[Math.floor(Math.random()*SHAPES.length)].map(r=>r.slice());s.piece={shape,x:Math.floor((10-shape[0].length)/2),y:0};if(!valid(s,s.piece.x,s.piece.y,s.piece.shape))gameOver('Tetris bitti')}
function valid(s,x,y,sh){return sh.every((r,dy)=>r.every((v,dx)=>!v||(x+dx>=0&&x+dx<10&&y+dy<20&&(y+dy<0||!s.grid[y+dy][x+dx]))))}
function movePiece(s,dx,dy){if(valid(s,s.piece.x+dx,s.piece.y+dy,s.piece.shape)){s.piece.x+=dx;s.piece.y+=dy;return true}return false}
function rotate(s){let a=s.piece.shape,b=a[0].map((_,i)=>a.map(r=>r[i]).reverse());if(valid(s,s.piece.x,s.piece.y,b))s.piece.shape=b}
function lockPiece(s){s.piece.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v&&s.piece.y+y>=0)s.grid[s.piece.y+y][s.piece.x+x]=1}));let n=0;s.grid=s.grid.filter(r=>{if(r.every(v=>v)){n++;return false}return true});while(s.grid.length<20)s.grid.unshift(Array(10).fill(0));score+=n*n*100;s.lines+=n;s.piece=null}
function pixel(x,y,rows,palette,scale=5){rows.forEach((row,yy)=>[...row].forEach((ch,xx)=>{if(ch!=='.')rect(x+xx*scale,y+yy*scale,scale,scale,palette[ch]||'#fff')}))}
function draw(){
 ctx.imageSmoothingEnabled=false;base('#101b2b');let s=state;
 if(game==='dk'){
  rect(0,0,960,540,'#192b43');for(let bx=0;bx<960;bx+=80){rect(bx,0,48,540,'#203750');for(let wy=35;wy<400;wy+=65)rect(bx+12,wy,14,20,'#d4a85e')}
  for(let i=0;i<5;i++){let y=430-i*100;rect(38,y,884,13,'#a85d32');rect(38,y+13,884,5,'#e8b66b');for(let x=45;x<920;x+=28)rect(x,y+18,4,7,'#76503a');if(i<4){let lx=i%2?760:165;rect(lx,y-96,7,96,'#d6a35c');rect(lx+20,y-96,7,96,'#d6a35c');for(let ly=y-90;ly<y;ly+=12)rect(lx+7,ly,13,4,'#f0c77a')}}
  pixel(80,55,['..bbbb..','..bbbb..','.bbbbbb.','bbbbbbbb','bbkbbkbb','bbbbbbbb','.bccccb.','..cccc..','...cc...'],{b:'#754326',k:'#15151c',c:'#c18a56'},6);
  ctx.save();ctx.translate(s.x-18,s.y-32);pixel(0,0,['...ss...','..ssss..','.ssssss.','.spppps.','..pppp..','..rrrr..','.rrrrrr.','.rwwwwr.','..wwww..','..wwww..','.bb..bb.','.bb..bb.'],{s:'#e8b98b',p:'#20232b',r:'#d93f38',w:'#f1f1e8',b:'#2458a8'},5);ctx.restore();
  s.barrels.forEach(b=>{rect(b.x-16,b.y-15,32,30,'#a65d2e');rect(b.x-16,b.y-9,32,5,'#e6b76c');rect(b.x-16,b.y+5,32,5,'#e6b76c');rect(b.x-3,b.y-15,6,30,'#6e3c25')});text('CAN: '+s.lives+'   KAT: '+s.goal,20,35);text('KAT: ▲ ÜST KAT · ⤒ ZIPLA',480,520,15,'#fff','center');
 }
 if(game==='flappy'){
  rect(0,0,960,540,'#72c7e7');for(let i=0;i<6;i++){rect(i*180,80+(i%2)*38,80,16,'#b8e2e8');rect(i*180+35,64+(i%2)*38,50,16,'#b8e2e8')}
  s.pipes.forEach(p=>{rect(p.x,0,58,p.top-8,'#197b43');rect(p.x-5,p.top-18,68,18,'#48b85e');rect(p.x,p.top+p.gap+8,58,540-p.top-p.gap,'#197b43');rect(p.x-5,p.top+p.gap,68,18,'#48b85e')});
  pixel(Math.round(s.x-18),Math.round(s.y-14),['...yy....','..yyyyy..','.yyyyyyy.','yyyyyyyyy','yywyywyyy','yyyyyyyyy','.yoooooy.','..ooooo..','...oo....'],{y:'#f6cf45',w:'#fff5cf',o:'#e97832'},4);
  rect(0,515,960,25,'#b38a45');rect(0,515,960,5,'#e5c47c');text('SKOR '+score,25,40);
 }
 if(game==='snake'){
  rect(0,0,960,540,'#101d25');for(let x=0;x<30;x++)for(let y=0;y<16;y++){rect(x*32,y*32,31,31,(x+y)%2?'#142630':'#172d36')}
  pixel(s.food[0]*32+5,s.food[1]*32+5,['..gg..','..gg..','..rr..','.rrrr.','rrrrrr','rrrrrr','.rrrr.','..rr..'],{g:'#4f9a43',r:'#e34d4d'},4);
  s.body.forEach((p,i)=>{rect(p[0]*32+2,p[1]*32+2,28,28,i?'#379d65':'#9ce56e');rect(p[0]*32+5,p[1]*32+5,8,7,'#c7f78a');if(i===0){rect(p[0]*32+19,p[1]*32+8,4,4,'#12251b');rect(p[0]*32+19,p[1]*32+19,4,4,'#12251b')}});text('SKOR '+score,20,525)
 }
 if(game==='tetris'){
  rect(245,24,250,500,'#0a1420');s.grid.forEach((r,y)=>r.forEach((v,x)=>{if(v){rect(270+x*22,40+y*22,20,20,'#31a98d');rect(272+x*22,42+y*22,16,4,'#a4f2d8');rect(272+x*22,60+y*22,16,2,'#176e67')}}));if(s.piece)s.piece.shape.forEach((r,y)=>r.forEach((v,x)=>{if(v){let px=270+(s.piece.x+x)*22,py=40+(s.piece.y+y)*22;rect(px,py,20,20,'#f3bd4e');rect(px+2,py+2,16,4,'#fff0a3');rect(px+2,py+17,16,2,'#a96b2d')}}));text('TETRIS',620,65,26);text('SATIR '+s.lines,620,105,22)
 }
 if(game==='breakout'){
  s.bricks.forEach((r,ri)=>r.forEach((b)=>{if(b.on){rect(b.x,b.y,60,20,['#e77d52','#e6b84e','#55b6a2','#6c8de2','#b47bd4'][ri]);rect(b.x+3,b.y+3,54,4,'#ffffff77')}}));rect(s.paddle-60,460,120,13,'#e8e8ff');rect(s.paddle-48,462,96,4,'#9cb8ff');rect(s.x-8,s.y-8,16,16,'#fff');rect(s.x-4,s.y-4,8,8,'#f4d56d');text('SKOR '+score+'   CAN '+s.lives,20,35)
 }
 if(game==='pong'){
  rect(20,s.p-50,14,100,'#f7f7f7');rect(926,s.ai-50,14,100,'#f7f7f7');for(let y=0;y<540;y+=28)rect(478,y,4,14,'#71869b');rect(s.x-9,s.y-9,18,18,'#fff');text('SEN '+Math.max(0,s.points)+' · RAKİP '+Math.max(0,-s.points),480,45,24,'#fff','center')
 }
 if(game==='space'){
  rect(0,0,960,540,'#080f26');for(let i=0;i<75;i++){let xx=(i*137)%960,yy=(i*83)%530;rect(xx,yy,2,2,i%3?'#91a9d4':'#f7d98a')}
  pixel(Math.round(s.x-20),463,['....c....','...ccc...','..ccccc..','.ccccccc.','ccccccccc','cc.c.c.cc','...fff...','...fff...'],{c:'#8bdcf5',f:'#f6a84a'},5);
  s.bullets.forEach(b=>{rect(b.x-3,b.y,6,18,'#f9ed69');rect(b.x-1,b.y,2,10,'#fff')});s.enemies.forEach(e=>pixel(Math.round(e.x-15),Math.round(e.y-12),['..pppp..','.pppppp.','ppwppwpp','pppppppp','.p.pp.p.'],{p:'#9a73db',w:'#fff'},4));text('CAN '+s.lives+'  SKOR '+score,20,35)
 }
 if(game==='memory'){for(let i=0;i<16;i++){let x=190+(i%4)*148,y=45+Math.floor(i/4)*116,c=s.cards[i];rect(x,y,128,96,c.show||c.done?'#27647a':'#25405b');rect(x+5,y+5,118,86,'#1b344c');text(c.show||c.done?String(c.v):'?',x+64,y+62,38,'#fff','center')}text('HAMLE '+s.moves,20,35)}
 if(game==='2048'){rect(290,35,380,470,'#766c61');for(let i=0;i<16;i++){let x=300+(i%4)*91,y=45+Math.floor(i/4)*112,v=s.b[i];rect(x,y,82,102,v?'#'+({2:'eee4da',4:'ede0c8',8:'f2b179',16:'f59563',32:'f67c5f',64:'f65e3b',128:'edcf72',256:'edcc61',512:'edc850',1024:'edc53f',2048:'edc22e'}[v]||'3c3a32'):'#9b8d80');if(v)text(String(v),x+41,y+62,Math.min(27,v>999?21:27),'#3c352e','center')}text('2048 · HAMLE '+s.turns,20,30,20)}
 if(over){rect(250,205,460,120,'#06111de8');text('OYUN BİTTİ',480,255,34,'#fff','center');text('SKOR '+score+' · Yeniden başlamak için dokun',480,295,18,'#fff','center')}
}
function loop(now){if(!root.classList.contains('on')||!game)return;let dt=Math.min(.035,(now-last)/1000);last=now;if(!over)update(dt);draw();raf=requestAnimationFrame(loop)}
const activePointers=new Map();
function syncPointerKeys(){['left','right','up','down','jump','action'].forEach(k=>keys.delete(k));for(const k of activePointers.values())keys.add(k);pad.querySelectorAll('[data-key]').forEach(b=>b.classList.toggle('down',[...activePointers.values()].includes(b.dataset.key)))}
function pointerKey(e,on){const b=e.target.closest('[data-key]');if(on){if(!b)return;activePointers.set(e.pointerId,b.dataset.key);try{b.setPointerCapture(e.pointerId)}catch(_){}}else activePointers.delete(e.pointerId);syncPointerKeys()}
pad.addEventListener('pointerdown',e=>{e.preventDefault();pointerKey(e,true)});['pointerup','pointercancel','lostpointercapture'].forEach(n=>pad.addEventListener(n,e=>pointerKey(e,false)));
window.addEventListener('keydown',e=>{if(!root.classList.contains('on')||!game)return;let m={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',' ':'jump',Enter:'action',x:'action',z:'action'};let k=m[e.key];if(k){keys.add(k);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault()}});
window.addEventListener('keyup',e=>{let m={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',' ':'jump',Enter:'action',x:'action',z:'action'};if(m[e.key])keys.delete(m[e.key])});
let canvasStart=null;
canvas.addEventListener('pointermove',e=>{if(!game)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*960/r.width,y=(e.clientY-r.top)*540/r.height;if(game==='breakout')state.paddle=Math.max(55,Math.min(905,x));if(game==='pong')state.p=Math.max(58,Math.min(482,y))});
canvas.addEventListener('pointerdown',e=>{if(!game)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*960/r.width,y=(e.clientY-r.top)*540/r.height;canvasStart={x,y};
 if(over){start(game);return}
 if(game==='memory'){let col=Math.floor((x-190)/148),row=Math.floor((y-45)/116),i=row*4+col;if(col>=0&&col<4&&row>=0&&row<4){let s=state,v=s.cards[i];if(!v.show&&!v.done&&!s.wait){v.show=true;s.moves++;if(s.first<0)s.first=i;else{let f=s.cards[s.first];if(f.v===v.v){f.done=v.done=true;score+=20;s.first=-1;if(s.cards.every(z=>z.done)){say('Tebrikler! Tüm çiftleri buldun.')}}else s.wait=.8}}}}
 if(game==='flappy')keys.add('jump');
});
canvas.addEventListener('pointerup',e=>{keys.delete('jump');if(game==='2048'&&canvasStart){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*960/r.width,y=(e.clientY-r.top)*540/r.height,dx=x-canvasStart.x,dy=y-canvasStart.y;if(Math.max(Math.abs(dx),Math.abs(dy))>25){move2048(state,Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'))}canvasStart=null}});
canvas.addEventListener('pointercancel',()=>{keys.delete('jump');canvasStart=null});
function move2048(s,dir){let b=s.b.slice(),changed=false;for(let n=0;n<4;n++){let ids=Array.from({length:4},(_,i)=>dir==='left'?n*4+i:dir==='right'?n*4+3-i:dir==='up'?i*4+n:(3-i)*4+n);let a=ids.map(i=>b[i]).filter(Boolean),out=[];for(let i=0;i<a.length;i++){if(a[i]===a[i+1]){out.push(a[i]*2);score+=a[i]*2;i++}else out.push(a[i])}while(out.length<4)out.push(0);ids.forEach((id,i)=>{if(b[id]!==out[i])changed=true;b[id]=out[i]})}if(changed){s.b=b;s.turns++;add2048(s.b);if(s.b.includes(2048))say('2048! Kazandın!');if(!s.b.some(v=>!v))say('Hamle kalmadı. Yeniden başlatmak için menüye dön.')}}
menu.addEventListener('click',e=>{let b=e.target.closest('[data-game]');if(b)start(b.dataset.game)});
$('#arcBack').onclick=showMenu;$('#arcClose').onclick=close;
window.addEventListener('blur',()=>keys.clear());
const oldOpen=window.openGame; // keep existing Mario engine untouched
const launch=document.createElement('button');launch.type='button';launch.id='arcLaunch';launch.textContent='🎮 OYUNLAR';launch.style.cssText='position:fixed;right:16px;bottom:18px;z-index:5000;border:1px solid #4d8db6;border-radius:999px;padding:12px 18px;background:#12334a;color:white;font-weight:800;box-shadow:0 5px 20px #0008';
launch.addEventListener('click',open);document.body.appendChild(launch);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('on'))close()});
})();