(()=>{
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const root=document.createElement('section');root.id='katiaSoftware';root.innerHTML=`
<aside id="ksSide"><div id="ksBrand">✳ Yazılım</div><button class="ks-sidebtn" id="ksNew">＋ Yeni çalışma</button><button class="ks-sidebtn" id="ksRecent">◷ Son çalışmalar</button><div id="ksProjects">ÇALIŞMA ALANI</div><div class="ks-sidebtn">Kod üretimi</div><div class="ks-sidebtn">Görsel stüdyosu</div><div class="ks-sidebtn">Video analizi</div><div style="margin-top:auto;color:#89877f;font-size:11px;padding:10px">Katia AI · Yazılım modu</div></aside>
<main id="ksMain"><header id="ksTop"><strong>Yazılım çalışma alanı</strong><button id="ksBack">← Katia'ya dön</button></header>
<div id="ksMessages"><div class="ks-welcome" id="ksWelcome"><h1>Bugün ne geliştirelim?</h1><p>Kod yaz, dosyalarını indir, görseller oluştur veya video karelerini analiz et. Sade, iki panelli bir sohbet çalışma alanı.</p></div></div>
<div id="ksComposerWrap"><div id="ksComposer"><div id="ksMedia"></div><textarea id="ksPrompt" placeholder="Bir web sitesi, uygulama veya kod yapıştır... (Göndermek için Ctrl + Enter)"></textarea><div id="ksImagePrompt"><input id="ksImageText" placeholder="Nasıl bir görsel oluşturalım?"><button id="ksMakeImage">Görsel oluştur</button></div><div id="ksActions"><button id="ksAttach">＋ Dosya / video</button><button id="ksImage">▧ Görsel üret</button><button id="ksVoice">🎙 Sesle yaz</button><button id="ksSpeak">🔊 Sonucu seslendir</button><button class="primary" id="ksSend">Gönder ↗</button></div><div id="ksStatus">Kod blokları ayrı dosyalar olarak indirilebilir. Video analizi, seçili modelin görsel desteğine bağlıdır.</div></div></div>
<input id="ksFile" type="file" accept="image/*,video/*" hidden></main>`;
document.body.appendChild(root);
let busy=false,attachment=null,lastAnswer='',voice=null,voiceActive=false,codeN=0;
function open(){if(window.KatiaApp)window.KatiaApp.setSoftwareMode();root.classList.add('on');$('#ksPrompt').focus()}
function close(){root.classList.remove('on');if(voice)try{voice.stop()}catch(e){}voiceActive=false;$('#ksVoice').classList.remove('on')}
function addMessage(role,text){const d=document.createElement('div');d.className='ks-msg '+role;d.textContent=text;$('#ksMessages').appendChild(d);$('#ksMessages').scrollTop=$('#ksMessages').scrollHeight;return d}
function ext(l){return ({html:'html',htm:'html',css:'css',js:'js',javascript:'js',ts:'ts',typescript:'ts',jsx:'jsx',tsx:'tsx',py:'py',python:'py',json:'json',xml:'xml',svg:'svg',md:'md',markdown:'md',sql:'sql',sh:'sh',bash:'sh',yml:'yml',yaml:'yaml',java:'java',c:'c',cpp:'cpp',cs:'cs',go:'go',rs:'rs',php:'php',rb:'rb',swift:'swift',kt:'kt'}[String(l||'').toLowerCase()]||'txt')}
function download(name,content,type='text/plain;charset=utf-8'){const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function addCode(parent,lang,code){
 const box=document.createElement('section');box.className='ks-code';const head=document.createElement('div');head.className='ks-codehead';const label=document.createElement('span');label.textContent=(lang||'text').toUpperCase()+' · '+code.split('\n').length+' satır';const btn=document.createElement('button');btn.textContent='↓ İndir';const n=++codeN;const filename='katia-kod-'+n+'.'+ext(lang);btn.onclick=()=>download(filename,code,ext(lang)==='html'?'text/html;charset=utf-8':'text/plain;charset=utf-8');head.append(label,btn);const pre=document.createElement('pre'),co=document.createElement('code');co.textContent=code;pre.appendChild(co);box.append(head,pre);parent.appendChild(box);
}
function renderAnswer(text){
 lastAnswer=text;const d=document.createElement('div');d.className='ks-msg assistant';
 const re=/```([\w+#.-]*)\s*\n([\s\S]*?)```/g;let last=0,m,n=0;
 while((m=re.exec(text))){const before=text.slice(last,m.index).trim();if(before){const p=document.createElement('p');p.textContent=before;d.appendChild(p)}addCode(d,m[1],m[2].replace(/\n$/,''));last=re.lastIndex;n++}
 const rest=text.slice(last).trim();if(rest){const p=document.createElement('p');p.textContent=rest;d.appendChild(p)}
 if(!n&&!rest&&text.trim())d.textContent=text;
 $('#ksMessages').appendChild(d);$('#ksMessages').scrollTop=$('#ksMessages').scrollHeight;
}
async function send(){
 const prompt=$('#ksPrompt').value;
 const clean=prompt.trim();
 if(!clean&&!attachment)return;
 if(busy)return;
 if(!window.KatiaApp||typeof window.KatiaApp.askSoftware!=='function'){
  $('#ksStatus').textContent='Yazılım motoru hazır değil. Sayfayı yenileyip tekrar dene.';return;
 }
 busy=true;$('#ksSend').disabled=true;$('#ksStatus').textContent='Kod / mesaj gönderiliyor…';
 if($('#ksWelcome'))$('#ksWelcome').remove();
 addMessage('user',clean||'Ekli dosyayı incele.');
 try{
  if(window.KatiaApp.setSoftwareMode)window.KatiaApp.setSoftwareMode();
  const answer=await window.KatiaApp.askSoftware(clean||'Ekli dosyayı incele ve açıkla.',attachment&&attachment.data);
  if(answer){
   $('#ksPrompt').value='';
   renderAnswer(answer);
   $('#ksStatus').textContent='Yanıt hazır. Kod bloklarını ayrı dosyalar olarak indirebilirsin.';
   attachment=null;$('#ksMedia').innerHTML='';
  }else{
   $('#ksStatus').textContent='Yanıt gelmedi. Kodun kutuda duruyor; API anahtarı, model ve bağlantıyı kontrol edip tekrar Gönder.';
   addMessage('assistant','Yanıt alınamadı. Girdiğin kod silinmedi; tekrar gönderebilirsin.');
  }
 }catch(e){
  addMessage('assistant','Hata: '+(e&&e.message||String(e)));
  $('#ksStatus').textContent='Gönderim başarısız. Kod kutuda korundu; düzeltip tekrar deneyebilirsin.';
 }
 busy=false;$('#ksSend').disabled=false;
}
$('#ksSend').onclick=send;$('#ksPrompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send()}});
$('#ksBack').onclick=close;$('#ksNew').onclick=()=>{$('#ksMessages').innerHTML='<div class="ks-welcome" id="ksWelcome"><h1>Yeni bir şeye başlayalım.</h1><p>Ne geliştirmek istersin?</p></div>';lastAnswer='';$('#ksPrompt').focus()};
$('#ksRecent').onclick=()=>{$('#ksStatus').textContent='Bu oturumdaki konuşmalar ekranda tutulur; kalıcı bulut proje geçmişi henüz bağlı değil.'};
$('#ksAttach').onclick=()=>$('#ksFile').click();
async function imageFile(f){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{const c=document.createElement('canvas'),k=Math.min(1,1280/Math.max(im.width,im.height));c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);resolve(c.toDataURL('image/jpeg',.82))};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Görsel okunamadı'))};im.src=u})}
async function videoFile(f){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(f),v=document.createElement('video');v.muted=true;v.preload='metadata';v.onloadedmetadata=async()=>{try{const c=document.createElement('canvas');c.width=960;c.height=540;const x=c.getContext('2d');for(let i=0;i<4;i++){const t=Math.min(Math.max(.05,v.duration*(.15+i*.22)),Math.max(.05,v.duration-.05));await new Promise(ok=>{v.onseeked=ok;v.currentTime=t});const col=i%2,row=Math.floor(i/2);x.fillStyle='#101820';x.fillRect(col*480,row*270,480,270);x.drawImage(v,col*480+10,row*270+10,460,250)}URL.revokeObjectURL(u);resolve(c.toDataURL('image/jpeg',.82))}catch(e){URL.revokeObjectURL(u);reject(e)}};v.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Video açılamadı'))};v.src=u})}
$('#ksFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const data=f.type.startsWith('video/')?await videoFile(f):await imageFile(f);attachment={data,name:f.name};$('#ksMedia').textContent=f.name+' · '+(f.type.startsWith('video/')?'4 örnek kare analize hazır':'görsel analize hazır')}catch(err){$('#ksStatus').textContent=err.message}};
$('#ksImage').onclick=()=>{$('#ksImagePrompt').classList.toggle('on');$('#ksImageText').focus()};
$('#ksMakeImage').onclick=async()=>{const p=$('#ksImageText').value.trim();if(!p)return;$('#ksStatus').textContent='Görsel oluşturuluyor…';try{const src=await window.KatiaApp.generateSoftwareImage(p);if(!src)throw new Error('Görsel bağlantısı dönmedi.');const wrap=document.createElement('div');wrap.className='ks-msg assistant';const im=document.createElement('img');im.className='ks-image';im.src=src;im.alt=p;const btn=document.createElement('button');btn.className='ks-download';btn.textContent='↓ Görseli indir';btn.onclick=async()=>{if(src.startsWith('data:'))download('katia-gorsel.png',await (await fetch(src)).blob(),'image/png');else{const a=document.createElement('a');a.href=src;a.target='_blank';a.rel='noopener';a.textContent='Görseli aç / kaydet';wrap.appendChild(a)}};wrap.append(im,btn);$('#ksMessages').appendChild(wrap);$('#ksStatus').textContent='Görsel hazır.'}catch(e){$('#ksStatus').textContent='Görsel üretilemedi: '+e.message}};
$('#ksVoice').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){$('#ksStatus').textContent='Bu tarayıcı ses tanımayı desteklemiyor. Chrome/Edge veya cihazın sesle yazma özelliğini kullan.';return}if(voiceActive){voice.stop();return}voice=new SR();voice.lang='tr-TR';voice.continuous=true;voice.interimResults=true;voice.onresult=e=>{let t='';for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;$('#ksPrompt').value=t};voice.onend=()=>{voiceActive=false;$('#ksVoice').classList.remove('on')};voice.onerror=e=>{$('#ksStatus').textContent='Ses tanıma: '+e.error};voice.start();voiceActive=true;$('#ksVoice').classList.add('on');$('#ksStatus').textContent='Dinliyorum… bitirince mikrofona tekrar bas.'};
$('#ksSpeak').onclick=()=>{if(lastAnswer)window.KatiaApp.speakSoftware(lastAnswer)};
window.KatiaSoftware={open,close};
if(document.body.classList.contains('p-software'))open();
})();