'use strict';
/* ---------- почта и Telegram для восстановления пароля ---------- */
const ICON={
  mail:"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='5' width='18' height='14' rx='2'/><path d='m3 7 9 6 9-6'/></svg>",
  tg:"<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M21 4 3 11l6 2.5L11 20l3.5-4.5L19 19z'/><path d='m9 13.5 7-5'/></svg>"
};
let ct=null,emailStep='view',tgStep='view';
function el(tag,props={},...kids){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(props)){if(k==='class')e.className=v;else if(k.startsWith('on'))e[k]=v;else if(v!==false&&v!=null)e.setAttribute(k,v===true?'':v)}
  e.append(...kids.flat().filter(x=>x!=null&&x!==false));return e;
}
const ctCall=(path,method='POST',body)=>authed(t=>api(ACC+path,{method,token:t,body}));
const btn=(label,onclick,primary)=>el('button',{type:'button',class:'btn'+(primary?' primary':''),onclick},label);
function row(icon,title,value,on,acts){
  const ico=el('div',{class:'ct-ico'+(on?' on':'')});ico.innerHTML=ICON[icon];
  return el('div',{class:'ct-row'},ico,el('div',{class:'ct-main'},el('b',{},title),el('div',{class:'ct-val'},value)),el('div',{class:'ct-acts'},acts));
}
async function loadContacts(){
  try{ct=await ctCall('/contacts','GET');emailStep=ct.pendingEmail?'code':'view';tgStep=ct.pendingPhone?'code':'view';renderContacts()}
  catch(e){if(e.badToken)return sessionLost();$('#ct-body').replaceChildren(el('p',{class:'err'},e.message))}
}
function renderContacts(){
  if(emailStep==='code'&&!ct.pendingEmail)emailStep='view';
  if(tgStep==='code'&&!ct.pendingPhone)tgStep='view';
  const kids=[],ea=[],ta=[];
  if(!ct.mailReady)ea.push(el('span',{class:'ct-val'},'скоро'));
  else if(ct.email&&emailStep==='view')ea.push(btn('Изменить',()=>{emailStep='enter';renderContacts()}),btn('Отвязать',unlinkEmail));
  else if(emailStep==='view')ea.push(btn('Привязать',()=>{emailStep='enter';renderContacts()},true));
  kids.push(row('mail','Почта',ct.email||'не привязана',!!ct.email,ea));
  if(emailStep==='enter')kids.push(emailForm());
  if(emailStep==='code')kids.push(codeForm());
  if(!ct.telegramReady)ta.push(el('span',{class:'ct-val'},'скоро'));
  else if(ct.telegram&&tgStep==='view')ta.push(btn('Изменить',()=>{tgStep='enter';renderContacts()}),btn('Отвязать',unlinkTg));
  else if(tgStep==='view')ta.push(btn('Привязать',()=>{tgStep='enter';renderContacts()},true));
  kids.push(row('tg','Telegram',ct.telegram?`номер ${ct.phone}`:'не привязан',ct.telegram,ta));
  if(tgStep==='enter')kids.push(tgPhoneForm());
  if(tgStep==='code')kids.push(tgCodeForm());
  $('#ct-body').replaceChildren(...kids);
}
function emailForm(){
  const input=el('input',{type:'email',autocomplete:'email',maxlength:254,placeholder:'name@mail.ru'});
  const err=el('p',{class:'err',role:'alert'});
  const f=el('form',{class:'ct-form',novalidate:true},el('label',{},'Адрес почты',input),err,
    el('div',{class:'row'},el('button',{class:'btn primary',type:'submit'},'Отправить код'),btn('Отмена',()=>{emailStep='view';renderContacts()})));
  f.onsubmit=async ev=>{
    ev.preventDefault();err.textContent='';const email=input.value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return err.textContent='Похоже, в адресе почты ошибка.';
    await busy(f,async()=>{try{ct=await ctCall('/email','POST',{email});emailStep='code';renderContacts()}catch(e){fail(e,err)}});
  };
  setTimeout(()=>input.focus(),0);return f;
}
function codeForm(){
  const input=el('input',{id:'e-code',inputmode:'numeric',autocomplete:'one-time-code',maxlength:14,placeholder:'6 цифр'});
  input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(0,6)};
  const err=el('p',{class:'err',role:'alert'});
  const again=()=>busy(f,async()=>{err.textContent='';try{ct=await ctCall('/email','POST',{email:ct.pendingEmail});toast('Новый код отправлен')}catch(e){fail(e,err)}});
  const f=el('form',{class:'ct-form',novalidate:true},el('p',{class:'sent'},`Мы отправили код на ${ct.pendingEmail}. Если письма нет, проверьте папку «Спам».`),el('label',{},'Код из письма',input),err,
    el('div',{class:'row'},el('button',{class:'btn primary',type:'submit'},'Подтвердить'),btn('Отправить ещё раз',again),btn('Отмена',()=>{emailStep='view';ct.pendingEmail=null;renderContacts()})));
  f.onsubmit=async ev=>{
    ev.preventDefault();err.textContent='';
    if(!/^\d{6}$/.test(input.value))return err.textContent='Код — это 6 цифр из письма.';
    await busy(f,async()=>{try{ct=await ctCall('/email/confirm','POST',{code:input.value});emailStep='view';renderContacts();toast('Почта привязана: теперь по ней можно восстановить пароль')}catch(e){fail(e,err)}});
  };
  setTimeout(()=>input.focus(),0);return f;
}
const unlinkEmail=()=>{
  if(!confirm(`Отвязать почту ${ct.email}? Восстановить пароль через неё будет нельзя.`))return;
  busy($('#contacts'),async()=>{try{ct=await ctCall('/email','DELETE');renderContacts();toast('Почта отвязана')}catch(e){fail(e)}});
};
const unlinkTg=()=>{
  if(!confirm('Отвязать Telegram? Коды для восстановления пароля туда больше не придут.'))return;
  busy($('#contacts'),async()=>{try{ct=await ctCall('/telegram','DELETE');renderContacts();toast('Telegram отвязан')}catch(e){fail(e)}});
};
function tgPhoneForm(){
  const input=el('input',{type:'tel',autocomplete:'tel',maxlength:24,placeholder:'+7 900 123-45-67'});
  const err=el('p',{class:'err',role:'alert'});
  const f=el('form',{class:'ct-form',novalidate:true},el('label',{},'Номер телефона, на который зарегистрирован ваш Telegram',input),err,
    el('div',{class:'row'},el('button',{class:'btn primary',type:'submit'},'Дальше'),btn('Отмена',()=>{tgStep=ct.pendingPhone?'code':'view';renderContacts()})));
  f.onsubmit=async ev=>{
    ev.preventDefault();err.textContent='';const phone=input.value.trim();
    if(phone.replace(/\D/g,'').length<10)return err.textContent='Введите номер полностью, например +7 900 123-45-67.';
    await busy(f,async()=>{try{ct=await ctCall('/telegram','POST',{phone});tgStep='code';renderContacts()}catch(e){fail(e,err)}});
  };
  setTimeout(()=>input.focus(),0);return f;
}
function tgCodeForm(){
  const input=el('input',{id:'t-code',inputmode:'numeric',autocomplete:'one-time-code',maxlength:14,placeholder:'6 цифр'});
  input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(0,6)};
  const err=el('p',{class:'err',role:'alert'});
  const f=el('form',{class:'ct-form',novalidate:true},
    el('p',{class:'sent'},`Откройте бота @${ct.bot} и нажмите «Запустить» (или напишите ему что угодно). Затем нажмите внизу кнопку «📱 Получить код»: если номер вашего Telegram — ${ct.pendingPhone}, бот пришлёт код.`),
    el('a',{class:'btn',href:`https://t.me/${ct.bot}`,target:'_blank',rel:'noopener',style:'align-self:flex-start'},`Открыть @${ct.bot}`),
    el('label',{},'Код из Telegram',input),err,
    el('div',{class:'row'},el('button',{class:'btn primary',type:'submit'},'Подтвердить'),btn('Другой номер',()=>{tgStep='enter';renderContacts()}),btn('Отмена',cancelTg)));
  f.onsubmit=async ev=>{
    ev.preventDefault();err.textContent='';
    if(!/^\d{6}$/.test(input.value))return err.textContent='Код — это 6 цифр из сообщения бота.';
    await busy(f,async()=>{try{ct=await ctCall('/telegram/confirm','POST',{code:input.value});tgStep='view';renderContacts();toast('Telegram привязан: теперь коды для восстановления будут приходить туда')}catch(e){fail(e,err)}});
  };
  return f;
}
const cancelTg=()=>busy($('#contacts'),async()=>{try{ct=await ctCall('/telegram/pending','DELETE');tgStep='view';renderContacts()}catch(e){fail(e)}});
