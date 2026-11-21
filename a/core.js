'use strict';
/* На GitHub Pages только страницы: аккаунты отвечают с сервера на Vercel */
const BASE=/\.github\.io$/.test(location.hostname)?'https://zakharahkaz-launcher.vercel.app':'',SITE=BASE||location.origin,API=BASE+'/api/yggdrasil',ACC=BASE+'/api/account',KEY='zrz.session';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const root=document.documentElement;
try{const ua=navigator.userAgentData;if(ua&&ua.brands&&ua.brands.some(b=>/Chromium/.test(b.brand))&&!matchMedia('(prefers-reduced-motion: reduce)').matches)root.classList.add('refract')}catch(e){}
function toast(t){$$('.toast').forEach(x=>x.remove());const e=document.createElement('div');e.className='toast lg';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),5200)}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});$$('.rv').forEach(e=>io.observe(e));
document.addEventListener('pointermove',e=>{const el=e.target.closest&&e.target.closest('.lg,.btn');if(!el)return;const r=el.getBoundingClientRect();el.style.setProperty('--mx',(e.clientX-r.left)+'px');el.style.setProperty('--my',(e.clientY-r.top)+'px')},{passive:true});

/* Сессия: в localStorage этого сайта; если хранилище недоступно, держим в памяти до закрытия вкладки */
let mem=null;
const session=()=>{if(mem)return mem;try{return JSON.parse(localStorage.getItem(KEY))}catch{return null}};
const save=s=>{mem=s;try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}};
const forget=()=>{mem=null;try{localStorage.removeItem(KEY)}catch{}};
function newToken(){const a=new Uint8Array(16);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('')}

async function api(path,{method='POST',body,token}={}){
  let r;
  try{r=await fetch(path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'})}
  catch{throw Object.assign(new Error('Нет связи с сервером. Проверьте интернет.'),{offline:true})}
  if(r.status===204)return null;
  let data=null;try{data=await r.json()}catch{}
  if(!r.ok)throw Object.assign(new Error(data?.errorMessage||`Ошибка сервера (${r.status}). Попробуйте позже.`),{status:r.status,badToken:r.status===403&&/Сессия недействительна/.test(data?.errorMessage||'')});
  return data;
}

/* Запрос с токеном; истёкший токен один раз обновляется */
async function authed(fn){
  const s=session();
  if(!s)throw Object.assign(new Error('Войдите в аккаунт.'),{badToken:true});
  try{return await fn(s.accessToken)}
  catch(e){
    if(!e.badToken)throw e;
    let r;
    try{r=await api(API+'/authserver/refresh',{body:{accessToken:s.accessToken,clientToken:s.clientToken,requestUser:true}})}
    catch(e2){if(e2.status===403)e2.badToken=true;throw e2}
    save({accessToken:r.accessToken,clientToken:r.clientToken||s.clientToken});
    return fn(r.accessToken);
  }
}
function sessionLost(){forget();showAuth('login');$('#autherr').textContent='Сессия закончилась (например, сменили пароль). Войдите снова.'}
function fail(e,box){if(e.badToken)return sessionLost();if(box)box.textContent=e.message;else toast(e.message)}

/* ---------- вход и регистрация ---------- */
let mode='login';
function setMode(m){
  mode=m;
  $$('.tabs button').forEach(b=>{const on=b.dataset.tab===m;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  $$('#authform [data-only]').forEach(e=>e.hidden=e.dataset.only!==m);
  $('#authbtn').textContent=m==='register'?'Создать аккаунт':'Войти';
  $('#f-pass').autocomplete=m==='register'?'new-password':'current-password';
  $('#autherr').textContent='';
}
$$('.tabs button').forEach(b=>b.onclick=()=>setMode(b.dataset.tab));
function show(id){['auth','recover','cab','loading'].forEach(x=>$('#'+x).hidden=x!==id)}
function showAuth(m){setMode(m);show('auth');setTimeout(()=>$('#f-name').focus(),0)}

$('#authform').onsubmit=async ev=>{
  ev.preventDefault();
  const err=$('#autherr'),btn=$('#authbtn');err.textContent='';
  const username=$('#f-name').value.trim(),password=$('#f-pass').value;
  if(!/^[A-Za-z0-9_]{3,16}$/.test(username))return err.textContent='Ник: от 3 до 16 символов, латинские буквы, цифры и _.';
  if(password.length<6)return err.textContent='Пароль должен быть не короче 6 символов.';
  if(mode==='register'&&password!==$('#f-pass2').value)return err.textContent='Пароли не совпадают.';
  btn.classList.add('busy');
  try{
    const clientToken=newToken();
    const s=mode==='register'
      ?await api(ACC+'/register',{body:{username,password,clientToken}})
      :await api(API+'/authserver/authenticate',{body:{username,password,clientToken,requestUser:true,agent:{name:'Minecraft',version:1}}});
    save({accessToken:s.accessToken,clientToken:s.clientToken||clientToken});
    $('#authform').reset();
    if(mode==='register')toast(`Аккаунт ${s.selectedProfile.name} создан. Привяжите почту или Telegram, чтобы пароль можно было восстановить.`);
    await openCabinet();
  }catch(e){err.textContent=e.message}
  finally{btn.classList.remove('busy')}
};
