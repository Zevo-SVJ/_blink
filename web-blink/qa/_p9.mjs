import { openApp } from "./drive.mjs";
const APP = process.env.APP_URL ?? "http://127.0.0.1:4173";
const ROUTES = [["home","/app"],["library","/library"],["ranks","/ranks"],["profile","/profile"],["settings","/settings"]];
for (const [width, lang] of [["390","en"],["desktop","en"],["390","fr"]]) {
  const { browser, page } = await openApp({ width, lang });
  for (const [name, path] of ROUTES) {
    await page.goto(APP + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2400);
    await page.screenshot({ path: `qa/shots/p9/${name}-${width}-${lang}.png` });
  }
  await browser.close();
}
// landing, section by section
for (const [width, lang] of [["390","en"],["desktop","en"],["390","fr"]]) {
  const { browser, page } = await openApp({ width, lang, signedIn: false });
  await page.goto(APP + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=400){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,25));} });
  for (const id of ["problem","experience","how-it-works","leaderboard","reactions","faq"]) {
    await page.evaluate((i)=>{const e=document.getElementById(i); if(e) window.scrollTo({top:e.getBoundingClientRect().top+window.scrollY+(i==="problem"||i==="experience"?600:-40),behavior:"instant"});}, id);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `qa/shots/p9/L-${id}-${width}-${lang}.png` });
  }
  await browser.close();
}
console.log("done");
