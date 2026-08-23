import { chromium } from "playwright";
import fs from "node:fs";

import { CARDS_DIR as OUT } from "./cards-dir.mjs";
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:500,height:900}})).newPage();
const errs=[]; p.on("pageerror",e=>errs.push(String(e)));
await p.goto("http://localhost:8080/dev",{waitUntil:"networkidle"});
await p.waitForTimeout(1200);
const CASES={
  typical:{},
  extreme:{handle:"a.very.long.instagram.handle.xx",
    firstImpression:"Deliberately composed and quietly self-assured in a way that reads entirely intentional",
    category:{category:"photography-and-visual-storytelling",categoryConfidence:.9,categorySignals:[]},
    perspectives:{crush:{summary:"Reads as someone with a life already in motion, which is far more magnetic than availability, and the restraint suggests there is a great deal more to find out about them."}}},
  emoji:{handle:"cafe.days",firstImpression:"Warm and unguarded ☕️",
    perspectives:{crush:{summary:"Feels approachable and genuinely fun — like someone who would actually reply 😊"}}},
  bare:{handle:null,firstImpression:"Unclear",traits:[],
    category:{category:null,categoryConfidence:0,categorySignals:[]},signals:[],
    perspectives:{crush:{summary:"",traits:[],why:"",recommendation:""}}},
};
const out=await p.evaluate(async cases=>{
  const mod=await import("/src/lib/dev-mock.ts"); const card=await import("/src/lib/share-card.ts");
  const r={};
  for(const [name,patch] of Object.entries(cases)){
    const base=JSON.parse(JSON.stringify(mod.SAMPLE_ANALYSIS));
    const merged={...base,...patch};
    if(patch.perspectives?.crush) merged.perspectives={...base.perspectives,crush:{...base.perspectives.crush,...patch.perspectives.crush}};
    const data=card.toShareCardData(merged, name==="bare"?null:7); r[name]={};
    for(const fmt of card.SHARE_FORMATS) for(const v of card.SHARE_VARIANTS)
      r[name][fmt.id+"-"+v.id]=card.drawShareCard(data,fmt,v).toDataURL("image/png");
  }
  return r;
},CASES);
let n=0;
for(const [name,imgs] of Object.entries(out))
  for(const [k,uri] of Object.entries(imgs)){ fs.writeFileSync(`${OUT}/${name}-${k}.png`,Buffer.from(uri.split(",")[1],"base64")); n++; }
console.log("wrote",n,"cards  |  JS errors:",errs.length?errs:"none");
await b.close();
