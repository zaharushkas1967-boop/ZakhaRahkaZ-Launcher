'use strict';
/* ---------- «Забыли пароль?»: код на почту или в Telegram ---------- */
let rLogin='',rTimer=null;
function showRecover(prefill){
  show('recover');$('#rform1').hidden=false;$('#rform2').hidden=true;$('#r1err').textContent='';$('#r2err').textContent='';
  if(prefill)$('#r-login').value=prefill;
  setTimeout(()=>$('#r-login').focus(),0);
}
$('#forgot').onclick=()=>showRecover($('#f-name').value.trim());
$('#r-back').onclick=()=>{
  clearInterval(rTimer);
  if(location.hash==='#recover')history.replaceState(null,'',location.pathname);
  showAuth('login');
  if(/^[A-Za-z0-9_]{3,16}$/.test(rLogin))$('#f-name').value=rLogin;
};
function cooldown(sec){
  const b=$('#r-again');clearInterval(rTimer);let left=sec;
  const tick=()=>{if(left<=0){clearInterval(rTimer);b.disabled=false;b.textContent='Отправить код ещё раз';return}b.disabled=true;b.textContent=`Отправить ещё раз через ${left} с`;left--};
  tick();rTimer=setInterval(tick,1000);
}
function sentText(r){
  const where=r.sent.map(s=>s.type==='email'?`на почту ${s.to}`:`в Telegram (номер ${s.to})`).join(' и ');
  return `Код отправлен ${where}${r.name?`, аккаунт ${r.name}`:''}. Он действует 15 минут.`+(r.sent.some(s=>s.type==='email')?' Если письма нет, проверьте папку «Спам».':'');
}
async function requestCode(){
  const r=await api(ACC+'/recover',{body:{login:rLogin}});
  $('#r-sent').textContent=sentText(r);
  $('#rform1').hidden=true;$('#rform2').hidden=false;cooldown(60);
  setTimeout(()=>$('#r-code').focus(),0);
}
$('#rform1').onsubmit=async ev=>{
  ev.preventDefault();const err=$('#r1err');err.textContent='';
  rLogin=$('#r-login').value.trim();
  if(!rLogin)return err.textContent='Введите ник, почту или номер телефона.';
  await busy($('#rform1'),async()=>{try{await requestCode()}catch(e){err.textContent=e.message}});
};
$('#r-again').onclick=()=>busy($('#rform2'),async()=>{
  $('#r2err').textContent='';
  try{await requestCode();toast('Новый код отправлен')}catch(e){$('#r2err').textContent=e.message}
});
$('#r-code').oninput=e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,6)};
$('#rform2').onsubmit=async ev=>{
  ev.preventDefault();const err=$('#r2err');err.textContent='';
  const code=$('#r-code').value,newPassword=$('#r-new').value;
  if(!/^\d{6}$/.test(code))return err.textContent='Код — это 6 цифр из письма или Telegram.';
  if(newPassword.length<6)return err.textContent='Новый пароль должен быть не короче 6 символов.';
  if(newPassword!==$('#r-new2').value)return err.textContent='Пароли не совпадают.';
  await busy($('#rform2'),async()=>{
    try{
      const {name}=await api(ACC+'/recover/confirm',{body:{login:rLogin,code,newPassword}});
      clearInterval(rTimer);$('#rform1').reset();$('#rform2').reset();
      if(location.hash==='#recover')history.replaceState(null,'',location.pathname);
      try{
        const clientToken=newToken();
        const s=await api(API+'/authserver/authenticate',{body:{username:name,password:newPassword,clientToken,requestUser:true,agent:{name:'Minecraft',version:1}}});
        save({accessToken:s.accessToken,clientToken:s.clientToken||clientToken});
        await openCabinet();
      }catch{showAuth('login');$('#f-name').value=name}
      toast('Пароль изменён. В лаунчере войдите с новым паролем.');
    }catch(e){err.textContent=e.message}
  });
};
addEventListener('hashchange',()=>{if(location.hash==='#recover')showRecover('')});
