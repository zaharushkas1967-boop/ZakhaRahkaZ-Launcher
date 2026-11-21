'use strict';
/* ---------- скин: вид спереди и сзади ---------- */
const P=10;
function draw(){
  const model=$('input[name=model]:checked')?.value||'classic';
  for(const [id,back] of [['v-front',false],['v-back',true]]){
    const c=$('#'+id),x=c.getContext('2d');
    x.imageSmoothingEnabled=false;x.clearRect(0,0,c.width,c.height);
    if(skinImg)drawSkin(x,skinImg,model,back);else drawGhost(x);
    if(back&&capeImg)drawCape(x,capeImg);
  }
  const a=$('#avatar canvas').getContext('2d');a.imageSmoothingEnabled=false;a.clearRect(0,0,8,8);
  if(skinImg){const s=skinImg.width/64;a.drawImage(skinImg,8*s,8*s,8*s,8*s,0,0,8,8);a.drawImage(skinImg,40*s,8*s,8*s,8*s,0,0,8,8)}
}
function drawGhost(x){x.fillStyle='rgba(255,255,255,.1)';[[4,0,8,8],[4,8,8,12],[0,8,4,12],[12,8,4,12],[4,20,4,12],[8,20,4,12]].forEach(([a,b,w,h])=>x.fillRect(a*P,b*P,w*P,h*P))}
function drawSkin(x,img,model,back){
  const s=img.width/64,tall=img.height===img.width,aw=model==='slim'?3:4,ox=model==='slim'?1:0;
  const part=(sx,sy,w,h,dx,dy,flip)=>{
    dx+=ox;
    if(flip){x.save();x.translate((dx+w)*P,dy*P);x.scale(-1,1);x.drawImage(img,sx*s,sy*s,w*s,h*s,0,0,w*P,h*P);x.restore()}
    else x.drawImage(img,sx*s,sy*s,w*s,h*s,dx*P,dy*P,w*P,h*P);
  };
  if(!back){
    part(8,8,8,8,4,0);part(20,20,8,12,4,8);part(44,20,aw,12,4-aw,8);part(4,20,4,12,4,20);
    if(tall){part(36,52,aw,12,12,8);part(20,52,4,12,8,20)}else{part(44,20,aw,12,12,8,true);part(4,20,4,12,8,20,true)}
    part(40,8,8,8,4,0);
    if(tall){part(20,36,8,12,4,8);part(44,36,aw,12,4-aw,8);part(52,52,aw,12,12,8);part(4,36,4,12,4,20);part(4,52,4,12,8,20)}
  }else{
    part(24,8,8,8,4,0);part(32,20,8,12,4,8);part(48+aw,20,aw,12,12,8);part(12,20,4,12,8,20);
    if(tall){part(40+aw,52,aw,12,4-aw,8);part(28,52,4,12,4,20)}else{part(48+aw,20,aw,12,4-aw,8,true);part(12,20,4,12,4,20,true)}
    part(56,8,8,8,4,0);
    if(tall){part(32,36,8,12,4,8);part(48+aw,36,aw,12,12,8);part(56+aw,52,aw,12,4-aw,8);part(12,36,4,12,8,20);part(12,52,4,12,4,20)}
  }
}
function drawCape(x,img){const s=img.width===22?1:img.width/64;x.drawImage(img,1*s,1*s,10*s,16*s,3*P,8*P,10*P,16*P)}

/* ---------- загрузка ---------- */
async function readPng(file){
  if(file.size>256*1024)throw new Error('Файл больше 256 КБ.');
  const buf=new Uint8Array(await file.arrayBuffer());
  if(![0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((b,i)=>buf[i]===b))throw new Error('Нужен файл PNG.');
  return buf;
}
function b64(buf){let s='';for(let i=0;i<buf.length;i+=0x8000)s+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000));return btoa(s)}
