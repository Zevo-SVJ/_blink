import { chromium } from "playwright";
import fs from "node:fs";
const OUT="/private/tmp/claude-501/-Users-salomon-Blink/f573f8cd-dc24-4031-a2ea-d701f6566d98/scratchpad/live";
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844}});
const p=await ctx.newPage();
const cdp=await ctx.newCDPSession(p);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions",{offline:false,
  downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8,latency:150});
await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
const t0=Date.now(); const log=[];
const tick=setInterval(async()=>{
  const t=Date.now()-t0; if(t>2600) return;
  try{
    await p.screenshot({path:`${OUT}/${String(t).padStart(4,"0")}.png`});
    log.push({t, ...(await p.evaluate(()=>({
      h1:document.querySelectorAll("h1").length,
      txt:(document.querySelector("h1")?.textContent??"").replace(/\s+/g," ").trim().slice(0,34),
      cta:document.querySelector('a[href="/analyze"]')?"a":document.querySelector("button")?"button":"none",
      docH:document.documentElement.scrollHeight})))});
  }catch{}
},150);
await p.goto("https://blink-ig.rork.app/",{waitUntil:"load"});
await p.waitForTimeout(3200);
clearInterval(tick);
const paints=await p.evaluate(()=>performance.getEntriesByType("paint").map(e=>`${e.name}=${Math.round(e.startTime)}ms`));
console.log("LIVE RORK  paint:",paints.join("  "));
log.slice(0,10).forEach(s=>console.log(`  ${String(s.t).padStart(4)}ms h1=${s.h1} cta=${s.cta} docH=${s.docH} "${s.txt}"`));
console.log("frames with >1 h1:",log.filter(s=>s.h1>1).length);
// refresh behaviour
await p.reload({waitUntil:"load"}); await p.waitForTimeout(1500);
console.log("after refresh:", JSON.stringify(await p.evaluate(()=>({
  h1:document.querySelectorAll("h1").length, y:Math.round(scrollY),
  txt:document.querySelector("h1").textContent.replace(/\s+/g," ").trim().slice(0,40)}))));
await b.close();
