/**
 * Exact framing check: the clip circle's centre, in the displayed image's own
 * coordinates, versus where the avatar actually is. No pixel matching, no
 * mid-flight sampling — this is what the animation is aiming at.
 */
import { chromium } from "playwright";
const CASES = [
  { id:"ios-light", w:1170,h:2532,statusBar:60,dark:false,avatarY:0.11,avatarR:0.115 },
  { id:"ios-dark", w:1170,h:2532,statusBar:60,dark:true,avatarY:0.11,avatarR:0.115 },
  { id:"android-nobar", w:1080,h:2400,statusBar:0,dark:false,avatarY:0.075,avatarR:0.105 },
  { id:"cropped-tight", w:1080,h:1200,statusBar:0,dark:true,avatarY:0.16,avatarR:0.15 },
  { id:"desktop-wide", w:1600,h:1000,statusBar:0,dark:false,avatarY:0.2,avatarR:0.1 },
  { id:"photo-avatar", w:1170,h:2532,statusBar:60,dark:false,avatarY:0.11,avatarR:0.115,photo:true },
];
const b=await chromium.launch();
for(const c of CASES){
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const p=await ctx.newPage();
  await p.goto("http://localhost:8080/analyze?mock=own",{waitUntil:"networkidle"});
  await p.waitForTimeout(400);
  const truth=await p.evaluate(async(c)=>{
    const cv=document.createElement('canvas'); cv.width=c.w; cv.height=c.h;
    const x=cv.getContext('2d');
    const bg=c.dark?'#000':'#fff', fg=c.dark?'#fff':'#000', dim=c.dark?'#2a2a2a':'#dbdbdb';
    x.fillStyle=bg; x.fillRect(0,0,c.w,c.h);
    if(c.statusBar){x.fillStyle=c.dark?'#000':'#f8f8f8';x.fillRect(0,0,c.w,c.statusBar);
      x.fillStyle=fg;x.font='bold '+Math.round(c.w*0.026)+'px sans-serif';x.fillText('9:41',c.w*0.06,c.statusBar*0.68);}
    x.fillStyle=fg;x.font='bold '+Math.round(c.w*0.038)+'px sans-serif';
    x.fillText('@sam.dev',c.w*0.06,c.statusBar+c.h*0.04);
    const ar=c.w*c.avatarR, ax=c.w*0.20, ay=c.h*c.avatarY+c.statusBar;
    if(c.photo){const g=x.createLinearGradient(ax-ar,ay-ar,ax+ar,ay+ar);
      g.addColorStop(0,'#8a6a52');g.addColorStop(.5,'#d9b48f');g.addColorStop(1,'#3d2c22');
      x.save();x.beginPath();x.arc(ax,ay,ar,0,6.3);x.clip();x.fillStyle=g;x.fillRect(ax-ar,ay-ar,ar*2,ar*2);x.restore();}
    else {x.fillStyle='rgb(255,0,200)';x.beginPath();x.arc(ax,ay,ar,0,6.3);x.fill();}
    x.fillStyle=fg;x.font='bold '+Math.round(c.w*0.032)+'px sans-serif';
    ['128','4.2k','311'].forEach((v,i)=>x.fillText(v,c.w*(0.45+i*0.17),ay-c.h*0.004));
    x.fillStyle=fg;x.font=Math.round(c.w*0.026)+'px sans-serif';x.fillText('Sam Devlin',c.w*0.06,ay+ar+c.h*0.028);
    const hy=ay+ar+c.h*0.10,hr=c.w*0.055;
    for(let i=0;i<4;i++){x.strokeStyle=dim;x.lineWidth=Math.max(2,c.w*0.004);
      x.beginPath();x.arc(c.w*(0.14+i*0.20),hy,hr,0,6.3);x.stroke();}
    const gy=hy+hr+c.h*0.035,cell=(c.w-4)/3;
    for(let r=0;r<4;r++)for(let i=0;i<3;i++){x.fillStyle=(r+i)%2?(c.dark?'#171717':'#eaeaea'):(c.dark?'#222':'#f4f4f4');
      x.fillRect(i*(cell+2),gy+r*(cell+2),cell,cell);}
    const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.94));
    const dt=new DataTransfer(); dt.items.add(new File([blob],"p.jpg",{type:"image/jpeg"}));
    const inp=document.querySelector("input[type=file]"); inp.files=dt.files;
    inp.dispatchEvent(new Event("change",{bubbles:true}));
    return {cx:ax/c.w, cy:ay/c.h, r:ar/c.w};
  },c);
  await p.waitForSelector("img[src^='blob:']",{timeout:8000});
  // Layout size at rest. Reading it later returns the *transformed* box, which
  // is what made every case look uniformly off by the zoom factor.
  const base=await p.evaluate(()=>{const r=document.querySelector("img[src^='blob:']").getBoundingClientRect();
    return {dw:r.width, dh:r.height};});
  await p.locator("button",{hasText:/^Analyz/i}).first().click();

  let got=null;
  for(let i=0;i<120;i++){
    await p.waitForTimeout(60);
    const s=await p.evaluate(()=>{
      const img=document.querySelector("img[src^='blob:']"); if(!img) return null;
      const cp=getComputedStyle(img.parentElement).clipPath;
      const m=cp.match(/circle\(([\d.]+)px at ([\d.]+)px ([\d.]+)px\)/);
      if(!m) return null;
      return {radius:+m[1], atX:+m[2], atY:+m[3]};
    });
    // Take the tightest circle reached — that is the final framing.
    if(s && (!got || s.radius < got.radius)) got=s;
  }
  if(!got){ console.log(`${c.id.padEnd(15)} no clip observed`); await ctx.close(); continue; }
  const ex = truth.cx*base.dw, ey = truth.cy*base.dh;
  const dx = got.atX-ex, dy = got.atY-ey;
  const truthRpx = truth.r*base.dw;
  const err = Math.hypot(dx,dy)/truthRpx;
  console.log(`${c.id.padEnd(15)} clip@(${got.atX.toFixed(1)},${got.atY.toFixed(1)}) expected(${ex.toFixed(1)},${ey.toFixed(1)}) `+
    `err=${err.toFixed(2)} radii  clipR/avatarR=${(got.radius/truthRpx).toFixed(2)}  ${err<0.35?"CENTRED":"** OFF **"}`);
  await ctx.close();
}
await b.close();
