/**
 * A REAL analysis (no mock) through the edge function, then Ranks.
 * Traces every stage so the point of failure is unambiguous.
 */
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.env.BASE ?? "http://localhost:8082";
const OUT = process.env.QA_OUT ?? "qa/shots";
const problems=[]; const bad=s=>{problems.push(s);console.log("  ✗ "+s);}; const ok=s=>console.log("  ✓ "+s);
/*
  This harness drives a real Supabase project, not the mock backend, so it
  needs a signed-in storage state to exist. It used to read that file
  unconditionally and die with an ENOENT stack trace on any machine that had
  never produced one, which reads as a broken test rather than a missing
  prerequisite. It also wrote its screenshots to one developer's scratch
  directory on macOS.
*/
const STORAGE = process.env.QA_STORAGE ?? "/tmp/qa-storage.json";
if (!fs.existsSync(STORAGE)) {
  console.log(`skipped: no signed-in storage state at ${STORAGE}.`);
  console.log("  Sign in once with Playwright and save it there, or set QA_STORAGE.");
  process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });

const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},
  storageState:JSON.parse(fs.readFileSync(STORAGE,"utf8"))});
const p=await ctx.newPage();
const net=[]; const errs=[];
p.on("pageerror",e=>errs.push(String(e)));
p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
p.on("response",async r=>{
  const u=r.url();
  if(/functions\/v1\/analyze/.test(u)) net.push(`analyze ${r.status()}`);
  if(/rest\/v1\/analyses/.test(u)&&r.request().method()==="POST") net.push(`insert ${r.status()}`);
});

// A profile screenshot with a clearly visible, distinctive handle.
const HANDLE="lena.vsk_88";
const MAKE=`(handle)=>new Promise(res=>{const w=1170,h=2532;
const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
x.fillStyle='#fff';x.fillRect(0,0,w,h);
x.fillStyle='#f8f8f8';x.fillRect(0,0,w,60);
x.fillStyle='#000';x.font='bold 30px sans-serif';x.fillText('9:41',70,42);
x.fillStyle='#000';x.font='bold 46px sans-serif';x.fillText('@'+handle,70,150);
const ar=w*0.115, ax=w*0.20, ay=h*0.11+60;
const g=x.createLinearGradient(ax-ar,ay-ar,ax+ar,ay+ar);
g.addColorStop(0,'#8a6a52');g.addColorStop(.5,'#d9b48f');g.addColorStop(1,'#3d2c22');
x.save();x.beginPath();x.arc(ax,ay,ar,0,6.3);x.clip();x.fillStyle=g;x.fillRect(ax-ar,ay-ar,ar*2,ar*2);x.restore();
x.fillStyle='#000';x.font='bold 38px sans-serif';
['128','4.2k','311'].forEach((v,i)=>x.fillText(v,w*(0.45+i*0.17),ay-10));
x.font='28px sans-serif';x.fillStyle='#666';
['posts','followers','following'].forEach((v,i)=>x.fillText(v,w*(0.44+i*0.17),ay+40));
x.fillStyle='#000';x.font='30px sans-serif';x.fillText('Lena Vasilenko',70,ay+ar+80);
x.fillStyle='#444';x.font='28px sans-serif';x.fillText('film photography / berlin',70,ay+ar+130);
const gy=ay+ar+230,cell=(w-4)/3;
for(let r2=0;r2<4;r2++)for(let i=0;i<3;i++){x.fillStyle=(r2+i)%2?'#eaeaea':'#f4f4f4';
  x.fillRect(i*(cell+2),gy+r2*(cell+2),cell,cell);}
c.toBlob(bb=>res(bb),'image/jpeg',0.94)})`;

console.log("=== 1. real analysis (no mock) ===");
await p.goto(`${BASE}/analyze`,{waitUntil:"networkidle"});
await p.waitForTimeout(600);
await p.evaluate(async ({mk,handle})=>{const blob=await eval(mk)(handle);
  const dt=new DataTransfer();dt.items.add(new File([blob],"ig.jpg",{type:"image/jpeg"}));
  const i=document.querySelector("input[type=file]");i.files=dt.files;
  i.dispatchEvent(new Event("change",{bubbles:true}));},{mk:MAKE,handle:HANDLE});
await p.waitForSelector("img[src^='blob:']",{timeout:9000});
await p.screenshot({path:`${OUT}/real-upload.png`});
await p.locator("button",{hasText:/^Analyz/i}).first().click();
await p.waitForTimeout(30000);
await p.screenshot({path:`${OUT}/real-result.png`});
console.log("  network:", net.join(" | ")||"(none)");
const res=await p.evaluate(()=>document.body.innerText.replace(/\s+/g," "));
net.some(n=>n.startsWith("analyze 200"))?ok("edge function returned 200"):bad(`analyze call: ${net.join(",")||"never fired"}`);
net.some(n=>n.startsWith("insert 201"))?ok("row inserted into analyses"):bad("no insert into analyses");
console.log("  result text:", res.slice(0,180));
await b.close();
console.log("\nPROBLEMS:",problems.length?problems.join(" | "):"none");
