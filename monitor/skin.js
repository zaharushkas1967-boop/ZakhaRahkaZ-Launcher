'use strict';
/* Front-view Minecraft skin rendering for the dashboard avatars. */
const P=4;
function drawGhost(x){x.clearRect(0,0,64,128);x.fillStyle='rgba(255,255,255,.12)';[[4,0,8,8],[4,8,8,12],[0,8,4,12],[12,8,4,12],[4,20,4,12],[8,20,4,12]].forEach(([a,b,w,h])=>x.fillRect(a*P,b*P,w*P,h*P))}
function drawFront(x,img,model){
  x.clearRect(0,0,64,128);x.imageSmoothingEnabled=false;
  const s=img.width/64,tall=img.height===img.width,aw=model==='slim'?3:4,ox=model==='slim'?1:0;
  const part=(sx,sy,w,h,dx,dy,flip)=>{dx+=ox;if(flip){x.save();x.translate((dx+w)*P,dy*P);x.scale(-1,1);x.drawImage(img,sx*s,sy*s,w*s,h*s,0,0,w*P,h*P);x.restore()}else x.drawImage(img,sx*s,sy*s,w*s,h*s,dx*P,dy*P,w*P,h*P)};
  part(8,8,8,8,4,0);part(20,20,8,12,4,8);part(44,20,aw,12,4-aw,8);part(4,20,4,12,4,20);
  if(tall){part(36,52,aw,12,12,8);part(20,52,4,12,8,20)}else{part(44,20,aw,12,12,8,true);part(4,20,4,12,8,20,true)}
  part(40,8,8,8,4,0);
  if(tall){part(20,36,8,12,4,8);part(44,36,aw,12,4-aw,8);part(52,52,aw,12,12,8);part(4,36,4,12,4,20);part(4,52,4,12,8,20)}
}
const imgCache=new Map();
function loadImg(url){if(imgCache.has(url))return imgCache.get(url);const p=new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=url});imgCache.set(url,p);return p}
