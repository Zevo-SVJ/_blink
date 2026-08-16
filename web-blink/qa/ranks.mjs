/**
 * Add Someone / Ranks, end to end against the real database.
 * A 201 is not the test — the person appearing in the UI is.
 */
import { chromium } from "playwright";
import fs from "node:fs";
const OUT="/private/tmp/claude-501/-Users-salomon-Blink/f573f8cd-dc24-4031-a2ea-d701f6566d98/scratchpad";
const problems=[]; const bad=s=>{problems.push(s);console.log("  ✗ "+s);}; const ok=s=>console.log("  ✓ "+s);
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},
  storageState:JSON.parse(fs.readFileSync("/tmp/qa-storage.json","utf8"))});
const p=await ctx.newPage();
const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
const posts=[]; p.on("response",r=>{ if(/rest\/v1\/analyses/.test(r.url())&&r.request().method()==="POST") posts.push(r.status()); });

const MAKE=`(w,h)=>new Promise(res=>{const c=document.createElement('canvas');c.width=w;c.height=h;
const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);
x.fillStyle='#333';x.beginPath();x.arc(w*.2,h*.12,w*.11,0,6.3);x.fill();
c.toBlob(bb=>res(bb),'image/jpeg',.9)})`;

async function analyze(mode){
  await p.goto(`http://localhost:8080/analyze?mock=${mode}`,{waitUntil:"networkidle"});
  await p.waitForTimeout(500);
  await p.evaluate(async mk=>{const blob=await eval(mk)(1170,2532);const dt=new DataTransfer();
    dt.items.add(new File([blob],"p.jpg",{type:"image/jpeg"}));
    const i=document.querySelector("input[type=file]");i.files=dt.files;
    i.dispatchEvent(new Event("change",{bubbles:true}));},MAKE);
  await p.waitForSelector("img[src^='blob:']",{timeout:9000});
  await p.locator("button",{hasText:/^Analyz/i}).first().click();
  await p.waitForTimeout(11000);
}

const readBoard = () => p.evaluate(()=>{
  const rows=[...document.querySelectorAll("a[href^='/library/']")].map(a=>{
    const t=a.innerText.replace(/\s+/g," ").trim(); return t;});
  return {rows, txt:document.body.innerText.replace(/\s+/g," ")};
});

console.log("=== 1. analyze someone else (ownership=other) ===");
await analyze("other");
posts.length?ok(`analyses POST → ${posts.join(",")}`):bad("no analyses insert");

console.log("=== 2. Ranks → Analyzed ===");
await p.goto("http://localhost:8080/ranks",{waitUntil:"networkidle"});
await p.waitForTimeout(2600);
await p.locator("button",{hasText:/^Analyzed$/}).click();
await p.waitForTimeout(1800);
let s=await readBoard();
s.rows.length?ok(`${s.rows.length} row(s): ${s.rows.slice(0,3).join(" | ")}`):bad("no rows in Analyzed board");
/alexmorgan/i.test(s.txt)?ok("the analyzed handle @alexmorgan is shown"):bad("analyzed handle missing from UI");
/only you can see these/i.test(s.txt)?ok("visibility disclosure present"):bad("no visibility disclosure");
await p.screenshot({path:`${OUT}/ranks-analyzed.png`});

console.log("=== 3. refresh persistence ===");
await p.reload({waitUntil:"networkidle"});
await p.waitForTimeout(2600);
await p.locator("button",{hasText:/^Analyzed$/}).click();
await p.waitForTimeout(1800);
s=await readBoard();
/alexmorgan/i.test(s.txt)?ok("still there after refresh"):bad("lost after refresh");
const before=s.rows.length;

console.log("=== 4. re-analyze the same person → no duplicate ===");
await analyze("other");
await p.goto("http://localhost:8080/ranks",{waitUntil:"networkidle"});
await p.waitForTimeout(2600);
await p.locator("button",{hasText:/^Analyzed$/}).click();
await p.waitForTimeout(1800);
s=await readBoard();
s.rows.length===before?ok(`still ${s.rows.length} row(s) — deduped by handle`):bad(`row count changed ${before} → ${s.rows.length}`);
/\d+ scans/.test(s.txt)?ok("repeat scans counted on the row"):console.log("    (scan count not shown yet)");

console.log("=== 5. own analysis must NOT appear here ===");
await analyze("own");
await p.goto("http://localhost:8080/ranks",{waitUntil:"networkidle"});
await p.waitForTimeout(2600);
await p.locator("button",{hasText:/^Analyzed$/}).click();
await p.waitForTimeout(1800);
s=await readBoard();
/sam\.dev/i.test(s.txt)?bad("own profile leaked into Analyzed"):ok("own analysis excluded");

console.log("=== 6. categories are canonical ===");
const CANON=["Larp","Creator","Entrepreneur","Artist","Fitness","Fashion","Lifestyle","Personal","Uncategorized"];
// The second inner span is the category line; the first is the handle.
const cats=await p.evaluate(()=>[...document.querySelectorAll("a[href^='/library/']")]
  .map(a=>{const sp=a.querySelectorAll("span span"); return sp[1]?.innerText.split("·")[0].trim();})
  .filter(Boolean));
const bogus=cats.filter(c=>!CANON.includes(c));
bogus.length?bad(`non-canonical category shown: ${bogus.join(", ")}`):ok(`all categories canonical: ${[...new Set(cats)].join(", ")||"—"}`);

console.log("=== 7. public leaderboard untouched ===");
await p.locator("button",{hasText:/^Standings$/}).click();
await p.waitForTimeout(2000);
const pub=await p.evaluate(()=>document.body.innerText);
/alexmorgan/i.test(pub)?bad("analyzed stranger appeared on the PUBLIC board"):ok("stranger absent from public standings");

if(errs.length) bad("JS errors: "+[...new Set(errs)].slice(0,2).join(" | "));
await b.close();
console.log("\nPROBLEMS:",problems.length?problems.join(" | "):"none");
