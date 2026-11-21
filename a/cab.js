'use strict';
/* ---------- кабинет ---------- */
let user=null,skinImg=null,capeImg=null;
const dashed=id=>id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5');
function loadImage(url){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Картинка не загрузилась'));i.src=url})}

async function apply(profile){
  user=profile;
  $('#c-name').textContent=user.name;
  $('#c-uuid').textContent=dashed(user.id);
  $('#c-since').textContent=user.createdAt?'Аккаунт с '+new Date(user.createdAt).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):'';
  $$('input[name=model]').forEach(r=>r.checked=r.value===(user.skin?.model||'classic'));
  $('#skindel').disabled=!user.skin;$('#capedel').disabled=!user.cape;
  [skinImg,capeImg]=await Promise.all([user.skin?loadImage(user.skin.url).catch(()=>null):null,user.cape?loadImage(user.cape.url).catch(()=>null):null]);
  draw();
}

async function openCabinet(){
  show('loading');
  try{const p=await authed(t=>api(ACC+'/me',{method:'GET',token:t}));await apply(p);show('cab');loadContacts()}
  catch(e){
    if(e.badToken){forget();showAuth('login');return}
    show('loading');$('#loading').innerHTML='';
    const p=document.createElement('p');p.className='err';p.textContent=e.message;
    const b=document.createElement('button');b.className='btn';b.type='button';b.textContent='Повторить';b.onclick=openCabinet;b.style.marginTop='12px';
    $('#loading').append(p,b);
  }
}

async function busy(el,fn){el.classList.add('busy');try{return await fn()}finally{el.classList.remove('busy')}}
const upload=(type,buf,model)=>authed(t=>api(ACC+'/texture',{token:t,body:{type,model,data:b64(buf)}}));

$('#skinfile').onchange=async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  await busy($('.wardrobe'),async()=>{try{await apply(await upload('skin',await readPng(f),$('input[name=model]:checked').value));toast('Скин сохранён. В игре он появится при следующем входе на сервер.')}catch(err){fail(err)}});
};
$('#capefile').onchange=async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  await busy($('.wardrobe'),async()=>{try{await apply(await upload('cape',await readPng(f)));toast('Плащ сохранён')}catch(err){fail(err)}});
};
$$('input[name=model]').forEach(r=>r.onchange=async()=>{
  draw();
  if(!user?.skin)return;
  await busy($('.wardrobe'),async()=>{
    try{const res=await fetch(user.skin.url);if(!res.ok)throw new Error('Не удалось прочитать скин с сервера.');await apply(await upload('skin',new Uint8Array(await res.arrayBuffer()),r.value));toast(r.value==='slim'?'Модель: тонкие руки':'Модель: классическая')}
    catch(err){fail(err);$$('input[name=model]').forEach(x=>x.checked=x.value===(user.skin?.model||'classic'));draw()}
  });
});
for(const [btn,type,msg] of [['#skindel','skin','Скин удалён'],['#capedel','cape','Плащ убран']]){
  $(btn).onclick=()=>busy($('.wardrobe'),async()=>{try{await apply(await authed(t=>api(`${ACC}/texture?type=${type}`,{method:'DELETE',token:t})));toast(msg)}catch(err){fail(err)}});
}

/* ---------- пароль и выход ---------- */
$('#pwform').onsubmit=async ev=>{
  ev.preventDefault();
  const err=$('#pwerr');err.textContent='';
  const oldPassword=$('#p-old').value,newPassword=$('#p-new').value;
  if(newPassword.length<6)return err.textContent='Новый пароль должен быть не короче 6 символов.';
  if(newPassword!==$('#p-new2').value)return err.textContent='Новые пароли не совпадают.';
  await busy($('#pwform'),async()=>{
    try{
      const s=session();
      const r=await authed(t=>api(ACC+'/password',{token:t,body:{oldPassword,newPassword,clientToken:s.clientToken}}));
      save({accessToken:r.accessToken,clientToken:r.clientToken||s.clientToken});
      $('#pwform').reset();toast('Пароль изменён. В лаунчере войдите с новым паролем.');
    }catch(e){fail(e,err)}
  });
};
$('#logout').onclick=()=>{forget();user=null;showAuth('login');toast('Вы вышли из аккаунта на этом сайте')};
$('#logoutall').onclick=async()=>{
  const s=session();
  try{if(s)await api(API+'/authserver/invalidate',{body:{accessToken:s.accessToken,clientToken:s.clientToken}})}catch(e){return toast(e.message)}
  forget();user=null;showAuth('login');toast('Все сессии завершены: в лаунчере войдите заново');
};

/* ---------- для серверов ---------- */
$('#cmd1').textContent=`java -javaagent:authlib-injector.jar=${SITE}/api/yggdrasil -jar server.jar nogui`;
$('#cmd2').textContent=`-Dminecraft.api.discovery.host=${SITE}/api/yggdrasil/discovery/minecraft/client`;
$('#apiurl').textContent=`${SITE}/api/yggdrasil`;
$$('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText($('#'+b.dataset.copy).textContent);toast('Скопировано')}catch{toast('Выделите текст и скопируйте вручную')}});
