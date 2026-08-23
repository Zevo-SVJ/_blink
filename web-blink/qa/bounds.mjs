/** No drawn content may reach the card's edge. Scans every exported PNG. */
import { chromium } from "playwright";
import fs from "node:fs";

import { CARDS_DIR as DIR } from "./cards-dir.mjs";

if(!fs.existsSync(DIR)){
  console.error(`No cards to scan in ${DIR}.\nRun \`node qa/cards.mjs\` first — it is what writes them.`);
  process.exit(1);
}
const files=fs.readdirSync(DIR).filter(f=>f.endsWith(".png"));
if(!files.length){
  console.error(`${DIR} has no PNGs in it. Run \`node qa/cards.mjs\` first.`);
  process.exit(1);
}
const b=await chromium.launch();
const p=await (await b.newContext()).newPage();
const bad=[];
for(const f of files){
  const b64=fs.readFileSync(`${DIR}/${f}`).toString("base64");
  const r=await p.evaluate(async b64=>{
    const img=new Image();
    await new Promise(ok=>{img.onload=ok; img.src="data:image/png;base64,"+b64;});
    const cv=document.createElement("canvas"); cv.width=img.width; cv.height=img.height;
    const x=cv.getContext("2d"); x.drawImage(img,0,0);
    const d=x.getImageData(0,0,cv.width,cv.height).data;
    const at=(px,py)=>{const i=(py*cv.width+px)*4; return [d[i],d[i+1],d[i+2]];};
    // Corner pixel is the background; anything far from it near the edge is content.
    const bg=at(2,2);
    const far=(c)=>Math.abs(c[0]-bg[0])+Math.abs(c[1]-bg[1])+Math.abs(c[2]-bg[2])>110;
    const M=6; let hits=0;
    for(let px=0;px<cv.width;px++){ if(far(at(px,M))) hits++; if(far(at(px,cv.height-1-M))) hits++; }
    for(let py=0;py<cv.height;py++){ if(far(at(M,py))) hits++; if(far(at(cv.width-1-M,py))) hits++; }
    return {w:cv.width,h:cv.height,hits};
  },b64);
  if(r.hits>0) bad.push(`${f}: ${r.hits} content pixels within 6px of the edge`);
}
console.log(bad.length?bad.join("\n"):`all ${files.length} cards clear of the edges`);
await b.close();
// A check that prints its failures and exits 0 is not a check.
process.exit(bad.length?1:0);
