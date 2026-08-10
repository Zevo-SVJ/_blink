/** detectPdp vs ground truth, on generated Instagram layouts. */
import { chromium } from "playwright";
const CASES = [
  { id:"ios-light", w:1170,h:2532,statusBar:60,dark:false,avatarY:0.11,avatarR:0.115 },
  { id:"ios-dark", w:1170,h:2532,statusBar:60,dark:true,avatarY:0.11,avatarR:0.115 },
  { id:"android-nobar", w:1080,h:2400,statusBar:0,dark:false,avatarY:0.075,avatarR:0.105 },
  { id:"cropped-tight", w:1080,h:1200,statusBar:0,dark:true,avatarY:0.16,avatarR:0.15 },
  { id:"desktop-wide", w:1600,h:1000,statusBar:0,dark:false,avatarY:0.2,avatarR:0.1 },
  { id:"photo-avatar", w:1170,h:2532,statusBar:60,dark:false,avatarY:0.11,avatarR:0.115, photo:true },
];
const b=await chromium.launch();
const p=await (await b.newContext()).newPage();
await p.goto("http://localhost:8080/analyze",{waitUntil:"networkidle"});
const out=await p.evaluate(async (CASES)=>{
  const { detectPdp } = await import("/src/lib/pdp-detect.ts");
  const { pdpAnchor } = await import("/src/lib/pdp.ts");
  const res=[];
  for(const c of CASES){
    const cv=document.createElement('canvas'); cv.width=c.w; cv.height=c.h;
    const x=cv.getContext('2d');
    const bg=c.dark?'#000':'#fff', fg=c.dark?'#fff':'#000', dim=c.dark?'#2a2a2a':'#dbdbdb';
    x.fillStyle=bg; x.fillRect(0,0,c.w,c.h);
    if(c.statusBar){ x.fillStyle=c.dark?'#000':'#f8f8f8'; x.fillRect(0,0,c.w,c.statusBar);
      x.fillStyle=fg; x.font='bold '+Math.round(c.w*0.026)+'px sans-serif'; x.fillText('9:41',c.w*0.06,c.statusBar*0.68); }
    x.fillStyle=fg; x.font='bold '+Math.round(c.w*0.038)+'px sans-serif';
    x.fillText('@sam.dev', c.w*0.06, c.statusBar+c.h*0.04);
    const ar=c.w*c.avatarR, ax=c.w*0.20, ay=c.h*c.avatarY+c.statusBar;
    if(c.photo){ // a photographic avatar: multi-tone, not a flat disc
      const g=x.createLinearGradient(ax-ar,ay-ar,ax+ar,ay+ar);
      g.addColorStop(0,'#8a6a52'); g.addColorStop(.5,'#d9b48f'); g.addColorStop(1,'#3d2c22');
      x.save(); x.beginPath(); x.arc(ax,ay,ar,0,6.3); x.clip(); x.fillStyle=g;
      x.fillRect(ax-ar,ay-ar,ar*2,ar*2);
      x.fillStyle='#2b1d16'; x.beginPath(); x.arc(ax-ar*.3,ay-ar*.2,ar*.12,0,6.3); x.fill();
      x.beginPath(); x.arc(ax+ar*.3,ay-ar*.2,ar*.12,0,6.3); x.fill(); x.restore();
    } else { x.fillStyle='rgb(255,0,200)'; x.beginPath(); x.arc(ax,ay,ar,0,6.3); x.fill(); }
    x.fillStyle=fg; x.font='bold '+Math.round(c.w*0.032)+'px sans-serif';
    ['128','4.2k','311'].forEach((v,i)=>x.fillText(v,c.w*(0.45+i*0.17),ay-c.h*0.004));
    x.fillStyle=fg; x.font=Math.round(c.w*0.026)+'px sans-serif';
    x.fillText('Sam Devlin',c.w*0.06,ay+ar+c.h*0.028);
    const hy=ay+ar+c.h*0.10, hr=c.w*0.055;
    for(let i=0;i<4;i++){ x.strokeStyle=dim; x.lineWidth=Math.max(2,c.w*0.004);
      x.beginPath(); x.arc(c.w*(0.14+i*0.20),hy,hr,0,6.3); x.stroke(); }
    const gy=hy+hr+c.h*0.035, cell=(c.w-4)/3;
    for(let r=0;r<4;r++) for(let i=0;i<3;i++){ x.fillStyle=(r+i)%2?(c.dark?'#171717':'#eaeaea'):(c.dark?'#222':'#f4f4f4');
      x.fillRect(i*(cell+2),gy+r*(cell+2),cell,cell); }
    const img=new Image();
    await new Promise(ok=>{img.onload=ok; img.src=cv.toDataURL('image/jpeg',0.94);});
    const det=detectPdp(img,c.w,c.h);
    const fb=pdpAnchor(c.w,c.h);
    const truth={cx:ax/c.w, cy:ay/c.h, r:ar/c.w};
    const used=det??fb;
    // Error in units of the true avatar radius, measured in image widths.
    const dx=(used.cx-truth.cx), dy=(used.cy-truth.cy)*(c.h/c.w);
    res.push({id:c.id, detected:!!det,
      truth:{cx:+truth.cx.toFixed(3),cy:+truth.cy.toFixed(3),r:+truth.r.toFixed(3)},
      used:{cx:+used.cx.toFixed(3),cy:+used.cy.toFixed(3),r:+used.r.toFixed(3)},
      errRadii:+(Math.hypot(dx,dy)/truth.r).toFixed(2)});
  }
  return res;
},CASES);
for(const r of out) console.log(
  `${r.id.padEnd(15)} detect=${r.detected?"yes":"NO (fallback)"} truth=(${r.truth.cx},${r.truth.cy},r${r.truth.r}) used=(${r.used.cx},${r.used.cy},r${r.used.r}) err=${r.errRadii} radii ${r.errRadii<0.5?"OK":"** OFF **"}`);
await b.close();
