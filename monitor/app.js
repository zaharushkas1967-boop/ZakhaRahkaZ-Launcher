'use strict';
const $=(s,r=document)=>r.querySelector(s);

/* Сервер аккаунтов: сначала адреса, которые открываются из России, затем основной. Работающий запоминается.
   Пароль администратора проверяет сервер; странице он выдаёт токен на 12 часов, который живёт только в этой вкладке. */
const BASES=['https://zakharahkaz-76-76-21-21.my.local-ip.co','https://zakharahkaz-216-198-79-195.my.local-ip.co','https://zakharahkaz-launcher.vercel.app'];
const TOKEN_KEY='zrz.mon.token',BASE_KEY='zrz.mon.base';
const kv={
  get(k,s){try{return (s||sessionStorage).getItem(k)}catch{return null}},
  set(k,v,s){try{v==null?(s||sessionStorage).removeItem(k):(s||sessionStorage).setItem(k,v)}catch{}}
};
function session(){try{const t=JSON.parse(kv.get(TOKEN_KEY)||'null');return t&&t.token&&t.exp*1000>Date.now()?t:null}catch{return null}}
function order(){const saved=kv.get(BASE_KEY,localStorage);return BASES.includes(saved)?[saved,...BASES.filter(b=>b!==saved)]:BASES}

async function api(path,{method='GET',body,timeout=15000}={}){
  const t=session(),headers={};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(t)headers.Authorization='Bearer '+t.token;
  let last={status:0,data:{error:'Сервер аккаунтов не отвечает. Проверьте интернет и попробуйте ещё раз.'}};
  for(const base of order()){
    let r;
    try{r=await fetch(`${base}/api/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout?AbortSignal.timeout(timeout):undefined})}
    catch{continue} // адрес недоступен: следующий
    if(r.status===502||r.status===504){last={status:r.status,data:null};continue}
    let d=null;try{d=await r.json()}catch{}
    kv.set(BASE_KEY,base,localStorage);
    if(r.status===401&&path!=='mon/login')kv.set(TOKEN_KEY,null);
    return{status:r.status,data:d};
  }
  return last;
}
function show(which){$('#login').hidden=which!=='login';$('#dash').hidden=which!=='dash'}

$('#loginform').onsubmit=async e=>{
  e.preventDefault();
  const err=$('#lerr'),btn=$('#lbtn');err.textContent='';btn.disabled=true;
  const {status,data}=await api('mon/login',{method:'POST',body:{password:$('#pw').value}});
  btn.disabled=false;
  if(status===200&&data&&data.token){kv.set(TOKEN_KEY,JSON.stringify({token:data.token,exp:data.exp}));$('#pw').value='';start()}
  else err.textContent=(data&&data.error)||'Не удалось войти.';
};
$('#logout').onclick=()=>{kv.set(TOKEN_KEY,null);show('login');$('#pw').focus()};

let all=[];
const fmtDate=s=>{if(!s)return '—';try{return new Date(s).toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return s}};
function dashedUuid(id){return String(id).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5')}

function stats(){
  $('#s-total').textContent=all.length;
  $('#s-skin').textContent=all.filter(u=>u.skin&&!u.skin.default).length;
  $('#s-cape').textContent=all.filter(u=>u.cape).length;
  $('#s-lock').textContent=all.filter(u=>u.locked).length;
}
function toast(text){document.querySelectorAll('.toast').forEach(t=>t.remove());const t=document.createElement('div');t.className='toast lg';t.textContent=text;document.body.append(t);setTimeout(()=>t.remove(),4500)}

/* Удаление в два нажатия: первое взводит кнопку на 4 с, второе удаляет. */
function deleteButton(u){
  const b=document.createElement('button');b.type='button';b.className='btn del';b.textContent='Удалить';
  let timer=null;
  b.onclick=async()=>{
    if(!b.classList.contains('armed')){
      b.classList.add('armed');b.textContent='Точно удалить?';
      timer=setTimeout(()=>{b.classList.remove('armed');b.textContent='Удалить'},4000);
      return;
    }
    clearTimeout(timer);b.disabled=true;b.textContent='Удаляю…';
    const {status,data}=await api('mon/users/'+encodeURIComponent(u.id),{method:'DELETE'});
    if(status===401){show('login');$('#pw').focus();return}
    if(status===200||status===404){
      all=all.filter(x=>x.id!==u.id);stats();render();
      toast(status===200?`Аккаунт ${u.name} удалён`:`Аккаунта ${u.name} уже нет`);
      return;
    }
    b.disabled=false;b.classList.remove('armed');b.textContent='Удалить';
    toast((data&&data.error)||'Не удалось удалить аккаунт.');
  };
  return b;
}

function chip(text,cls){const s=document.createElement('span');s.className='chip'+(cls?' '+cls:'');s.textContent=text;return s}
function render(){
  const q=$('#search').value.trim().toLowerCase();
  const list=q?all.filter(u=>String(u.name).toLowerCase().includes(q)):all;
  const grid=$('#grid');grid.textContent='';
  $('#shown').textContent=q?`${list.length} из ${all.length}`:'';
  if(all.length===0){$('#state').textContent='Пока нет ни одного аккаунта.';return}
  $('#state').textContent=list.length?'':'Ничего не найдено.';
  for(const u of list){
    const card=document.createElement('div');card.className='card lg';
    const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');
    if(u.skin){loadImg(u.skin.url).then(img=>img?drawFront(x,img,u.skin.model):drawGhost(x))}else drawGhost(x);
    const info=document.createElement('div');info.className='info';
    const nm=document.createElement('div');nm.className='nm';nm.textContent=u.name;
    const id=document.createElement('div');id.className='uuid mono';id.textContent=dashedUuid(u.id);
    const row=document.createElement('div');row.className='row2';
    row.append(!u.skin?chip('без скина'):u.skin.default?chip('стандартный скин'):chip('скин: '+(u.skin.model==='slim'?'тонкий':'классика'),'ok'));
    if(u.cape)row.append(chip('плащ','ok'));
    if(u.locked)row.append(chip('заблокирован','bad'));
    else if(u.failedLogins>0)row.append(chip('неудачных входов: '+u.failedLogins,'warn'));
    const when=document.createElement('div');when.className='when';when.textContent='Регистрация: '+fmtDate(u.createdAt);
    info.append(nm,id,row,when,deleteButton(u));
    card.append(c,info);grid.append(card);
  }
}
$('#search').addEventListener('input',render);
$('#refresh').onclick=load;

async function load(){
  $('#state').innerHTML="<span class='spin'></span> Загрузка…";$('#grid').textContent='';
  const {status,data}=await api('mon/users');
  if(status===401){show('login');$('#pw').focus();return}
  if(status!==200||!data||!Array.isArray(data.users)){$('#state').textContent=(data&&data.error)||'Не удалось загрузить данные.';return}
  all=data.users;
  stats();
  $('#updated').textContent='обновлено '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
  render();
}
async function start(){show('dash');await load()}
if(session())start();else{show('login');$('#pw').focus()}
