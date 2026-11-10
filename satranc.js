(()=>{'use strict';
const $=s=>document.querySelector(s);
const required=['#board','#status','#moves','#level','#color','#new','#undo','#flip','#back','#online','#room','#roomInfo','#create','#join'];
const missing=required.filter(s=>!$(s));
if(missing.length){console.error('Satranç arayüzü eksik:',missing);const el=$('#status');if(el)el.textContent='Satranç arayüzü yüklenemedi: '+missing.join(', ');return;}
const ChessCtor=window.Chess;
if(typeof ChessCtor!=='function'){$('#status').textContent='Satranç motoru yüklenemedi. Sayfayı yenile.';return;}
const game=new ChessCtor(),board=$('#board'),status=$('#status'),moves=$('#moves');
let selected=null,legal=[],flipped=false,mode='ai',human='w',room='',poll=null,busy=false,onlineSeat='w';
const glyph={wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
function render(){
 board.replaceChildren();
 const files=flipped?'hgfedcba':'abcdefgh',ranks=flipped?'12345678':'87654321';
 for(const rank of ranks)for(const file of files){
  const sq=file+rank,p=game.get(sq),b=document.createElement('button');
  b.type='button';b.className='sq '+((files.indexOf(file)+ranks.indexOf(rank))%2?'dark':'light');
  b.textContent=p?glyph[p.color+p.type]:'';b.dataset.sq=sq;b.setAttribute('aria-label',sq+(p?' '+(p.color==='w'?'beyaz ':'siyah ')+p.type:''));
  if(selected===sq)b.classList.add('sel');
  const target=legal.find(m=>m.to===sq);if(target)b.classList.add(target.flags.includes('c')||target.flags.includes('e')?'capture':'target');
  b.addEventListener('click',()=>tap(sq));board.append(b);
 }
 moves.replaceChildren();
 const history=game.history();
 for(let i=0;i<history.length;i+=2){
  const li=document.createElement('li');li.textContent=(Math.floor(i/2)+1)+'. '+history[i]+(history[i+1]?'   '+history[i+1]:'');moves.append(li);
 }
 const turn=game.turn()==='w'?'Beyaz':'Siyah';
 status.textContent=game.game_over()?(game.in_checkmate()?'Şah mat! '+(game.turn()==='w'?'Siyah':'Beyaz')+' kazandı.':'Berabere.'):(turn+' oynar'+(game.in_check()?' · ŞAH':''));
}
function tap(sq){
 if(busy||game.game_over()||(mode==='online'&&game.turn()!==onlineSeat))return;
 const p=game.get(sq);
 if(selected&&legal.some(m=>m.to===sq)){
  const choices=legal.filter(m=>m.to===sq);let promo='q';
  if(choices.length>1){const answer=window.prompt('Terfi seç: q=Vezir, r=Kale, b=Fil, n=At','q');if(answer===null)return;promo=answer.trim().toLowerCase();if(!['q','r','b','n'].includes(promo)){status.textContent='Terfi için q, r, b veya n yaz.';return;}}
  const result=game.move({from:selected,to:sq,promotion:promo});
  if(!result){selected=null;legal=[];render();return;}
  selected=null;legal=[];render();afterMove();return;
 }
 if(p&&p.color===game.turn()&&(mode!=='ai'||p.color===human)){
  selected=sq;legal=game.moves({square:sq,verbose:true});render();
 }else{selected=null;legal=[];render();}
}
const values={p:100,n:320,b:330,r:500,q:900,k:20000};
function evaluate(g,perspective){
 if(g.in_checkmate())return g.turn()===perspective?-100000:100000;
 if(g.game_over())return 0;
 let score=0;
 for(const f of 'abcdefgh')for(let r=1;r<=8;r++){const p=g.get(f+r);if(p){const sign=p.color===perspective?1:-1;score+=sign*values[p.type];if(p.type==='p')score+=sign*(p.color==='w'?r-2:7-r)*5;}}
 return score;
}
function search(g,depth,alpha,beta,perspective){
 if(depth===0||g.game_over())return evaluate(g,perspective);
 const ms=g.moves({verbose:true}),maximizing=g.turn()===perspective;
 let best=maximizing?-Infinity:Infinity;
 for(const m of ms){
  g.move(m);const score=search(g,depth-1,alpha,beta,perspective);g.undo();
  if(maximizing){best=Math.max(best,score);alpha=Math.max(alpha,best);}else{best=Math.min(best,score);beta=Math.min(beta,best);}
  if(beta<=alpha)break;
 }
 return best;
}
function choose(ms,depth){
 const aiColor=game.turn();let best=null,bestScore=-Infinity,alpha=-Infinity;
 for(const m of ms){game.move(m);const score=search(game,Math.max(0,depth-1),alpha,Infinity,aiColor);game.undo();const tie=score+Math.random()*0.01;if(tie>bestScore){bestScore=tie;best=m;}alpha=Math.max(alpha,score);}
 return best;
}
function reset(){
 if(poll){clearInterval(poll);poll=null;}selected=null;legal=[];busy=false;game.reset();render();
 if(mode==='ai'&&human==='b')afterMove();
}
function api(path,data){
 return fetch('/api/chess/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data||{})}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Sunucu bağlantı hatası');return j;});
}
async function sendMove(){try{await api('move',{room,fen:game.fen(),history:game.history()});}catch(e){$('#roomInfo').textContent=e.message;}}
async function sync(){
 if(!room||mode!=='online')return;
 try{const j=await api('state',{room});if(j.fen&&j.fen!==game.fen()){if(game.load(j.fen)){selected=null;legal=[];render();}}
  $('#roomInfo').textContent='Oda: '+room+' · '+(j.players||0)+' oyuncu';
 }catch(e){$('#roomInfo').textContent=e.message;if(poll){clearInterval(poll);poll=null;}}
}
function afterMove(){
 if(mode==='online'){sendMove();return;}
 if(mode==='ai'&&game.turn()!==human&&!game.game_over()){
  busy=true;status.textContent='Katia düşünüyor…';
  window.setTimeout(()=>{
   try{const ms=game.moves({verbose:true});if(ms.length){const depth=Math.max(1,Math.min(3,Number($('#level').value)||2));const m=choose(ms,depth);if(m)game.move(m);}}
   catch(e){console.error('AI hamle hatası:',e);status.textContent='Yapay zekâ hamle yapamadı.';}
   busy=false;render();
  },180);
 }
}
function setMode(next){
 mode=next;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===next));
 $('#online').hidden=next!=='online';$('#color').disabled=next==='online';room='';
 if(poll){clearInterval(poll);poll=null;}reset();
 if(next==='online')$('#roomInfo').textContent='Oda oluştur veya kod gir.';
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('#color').addEventListener('change',e=>{human=e.target.value;flipped=human==='b';reset();});
$('#new').addEventListener('click',reset);
$('#undo').addEventListener('click',()=>{
 if(busy)return;
 let count=mode==='ai'&&game.history().length>1?2:1;
 while(count--&&game.undo()){}
 selected=null;legal=[];render();
});
$('#flip').addEventListener('click',()=>{flipped=!flipped;render();});
$('#back').addEventListener('click',()=>{if(window.parent!==window)window.parent.postMessage({type:'katia-chess-exit'},location.origin);else location.href='/';});
$('#create').addEventListener('click',async()=>{
 try{const j=await api('create');room=j.room;onlineSeat='w';$('#roomInfo').textContent='Oda kodun: '+room+' · Arkadaşına gönder';if(poll)clearInterval(poll);poll=setInterval(sync,1200);}
 catch(e){$('#roomInfo').textContent=e.message;}
});
$('#join').addEventListener('click',async()=>{
 try{room=$('#room').value.trim().toUpperCase();if(!room)throw Error('Önce oda kodunu yaz.');const j=await api('join',{room});onlineSeat='b';if(!game.load(j.fen))throw Error('Oda tahtası okunamadı.');selected=null;legal=[];render();$('#roomInfo').textContent='Odaya bağlandın: '+room;if(poll)clearInterval(poll);poll=setInterval(sync,1200);}
 catch(e){$('#roomInfo').textContent=e.message;}
});
render();
window.addEventListener('error',e=>{if(e.filename&&/satranc|chess-engine/.test(e.filename))status.textContent='Satranç hatası: '+e.message;});
})();