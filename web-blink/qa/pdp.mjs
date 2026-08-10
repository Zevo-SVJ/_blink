/**
 * Does the analysis zoom actually land on the profile picture?
 *
 * Generates realistic Instagram profile screenshots whose avatar is a solid,
 * unmistakable colour, runs the real analysis animation, screenshots the stage
 * mid-zoom, and finds the centroid of that colour in the captured pixels. The
 * answer is then a measured offset from the stage centre rather than an
 * opinion about whether it "looks centred".
 */
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = "/private/tmp/claude-501/-Users-salomon-Blink/f573f8cd-dc24-4031-a2ea-d701f6566d98/scratchpad/pdp";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

/** Avatar fill — a colour nothing else in the mock uses. */
const MARK = { r: 255, g: 0, b: 200 };

/**
 * Layouts worth covering. `statusBar` and `dark` change how much furniture sits
 * above the avatar, which is exactly what a fixed layout fraction gets wrong.
 */
const CASES = [
  { id: "ios-light", w: 1170, h: 2532, statusBar: 60, dark: false, avatarY: 0.11, avatarR: 0.115 },
  { id: "ios-dark", w: 1170, h: 2532, statusBar: 60, dark: true, avatarY: 0.11, avatarR: 0.115 },
  { id: "android-nobar", w: 1080, h: 2400, statusBar: 0, dark: false, avatarY: 0.075, avatarR: 0.105 },
  { id: "cropped-tight", w: 1080, h: 1200, statusBar: 0, dark: true, avatarY: 0.16, avatarR: 0.15 },
  { id: "desktop-wide", w: 1600, h: 1000, statusBar: 0, dark: false, avatarY: 0.2, avatarR: 0.1 },
];

const DRAW = `(c) => new Promise((res) => {
  const cv = document.createElement('canvas');
  cv.width = c.w; cv.height = c.h;
  const x = cv.getContext('2d');
  const bg = c.dark ? '#000000' : '#ffffff';
  const fg = c.dark ? '#ffffff' : '#000000';
  const dim = c.dark ? '#2a2a2a' : '#dbdbdb';
  x.fillStyle = bg; x.fillRect(0, 0, c.w, c.h);

  // Status bar: a dark strip is what broke the old corner-sampled background.
  if (c.statusBar) { x.fillStyle = c.dark ? '#000' : '#f8f8f8'; x.fillRect(0, 0, c.w, c.statusBar);
    x.fillStyle = fg; x.font = 'bold ' + Math.round(c.w*0.026) + 'px sans-serif';
    x.fillText('9:41', c.w*0.06, c.statusBar*0.68); }

  // Header row with the handle.
  const headY = c.statusBar + c.h*0.028;
  x.fillStyle = fg; x.font = 'bold ' + Math.round(c.w*0.038) + 'px sans-serif';
  x.fillText('@' + c.handle, c.w*0.06, headY + c.h*0.012);

  // THE AVATAR — solid marker colour, position recorded for the assertion.
  const ar = c.w * c.avatarR;
  const ax = c.w * 0.20;
  const ay = c.h * c.avatarY + c.statusBar;
  x.fillStyle = 'rgb(255,0,200)';
  x.beginPath(); x.arc(ax, ay, ar, 0, Math.PI*2); x.fill();

  // Stats to the right of the avatar.
  x.fillStyle = fg; x.font = 'bold ' + Math.round(c.w*0.032) + 'px sans-serif';
  ['128','4.2k','311'].forEach((v,i)=>x.fillText(v, c.w*(0.45+i*0.17), ay - c.h*0.004));
  x.fillStyle = c.dark ? '#aaa' : '#666'; x.font = Math.round(c.w*0.024)+'px sans-serif';
  ['posts','followers','following'].forEach((v,i)=>x.fillText(v, c.w*(0.44+i*0.17), ay + c.h*0.016));

  // Bio lines.
  x.fillStyle = fg; x.font = Math.round(c.w*0.026)+'px sans-serif';
  x.fillText('Sam Devlin', c.w*0.06, ay + ar + c.h*0.028);
  x.fillStyle = c.dark ? '#bbb' : '#444';
  x.fillText('photography / coffee / berlin', c.w*0.06, ay + ar + c.h*0.052);

  // Highlight bubbles — round, and deliberately NOT the avatar.
  const hy = ay + ar + c.h*0.10, hr = c.w*0.055;
  for (let i=0;i<4;i++){ x.strokeStyle=dim; x.lineWidth=Math.max(2,c.w*0.004);
    x.beginPath(); x.arc(c.w*(0.14+i*0.20), hy, hr, 0, Math.PI*2); x.stroke(); }

  // Grid.
  const gy = hy + hr + c.h*0.035, cell=(c.w-4)/3;
  for (let r=0;r<4;r++) for (let i=0;i<3;i++){
    x.fillStyle = (r+i)%2 ? (c.dark?'#171717':'#eaeaea') : (c.dark?'#222':'#f4f4f4');
    x.fillRect(i*(cell+2), gy + r*(cell+2), cell, cell); }

  cv.toBlob(b => res({ blob: b, ax: ax/c.w, ay: ay/c.h, ar: ar/c.w }), 'image/jpeg', 0.94);
})`;

const b = await chromium.launch();
const results = [];

for (const c of CASES) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:8080/analyze?mock=own", { waitUntil: "networkidle" });
  await p.waitForTimeout(500);

  const truth = await p.evaluate(
    async ({ draw, cse }) => {
      const out = await eval(draw)({ ...cse, handle: "sam.dev" });
      const dt = new DataTransfer();
      dt.items.add(new File([out.blob], "p.jpg", { type: "image/jpeg" }));
      const input = document.querySelector("input[type=file]");
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { ax: out.ax, ay: out.ay, ar: out.ar };
    },
    { draw: DRAW, cse: c },
  );

  await p.waitForSelector("img[src^='blob:']", { timeout: 8000 });
  await p.locator("button", { hasText: /^Analyz/i }).first().click();

  /*
    Capture the *clip circle* itself, not the whole viewport. The animation
    masks the zoomed screenshot into a circle at the centre of the stage; if
    the avatar is correctly targeted, the marker colour fills that circle and
    its centroid sits at the circle's middle. Clipping to the circle turns
    "is it centred" into a measurement with an obvious expected answer.
  */
  let best = null;
  // The zoom lives in a ~700ms window near the end of the run, so sample fast.
  for (let i = 0; i < 130; i++) {
    await p.waitForTimeout(60);
    const s = await p.evaluate(() => {
      const img = document.querySelector("img[src^='blob:']");
      if (!img) return null;
      // The camera is the grandparent: img -> clip element -> camera.
      const cam = img.parentElement.parentElement;
      const m = getComputedStyle(cam).transform.match(/matrix\(([^)]+)\)/);
      const scale = m ? parseFloat(m[1].split(",")[0]) : 1;
      // The mask is a clip-path circle, not a border-radius, and it is centred
      // in the stage viewport — so clip a square of the circle's size at that
      // centre and measure inside it.
      const stage = img.closest("div.absolute.inset-0");
      if (!stage) return { scale, box: null };
      const sr = stage.getBoundingClientRect();
      const D = 132; // CIRCLE_SIZE
      return {
        scale,
        box: { x: sr.x + sr.width / 2 - D / 2, y: sr.y + sr.height / 2 - D / 2, w: D, h: D },
      };
    });
    if (!best && s?.box && s.scale > 1.5) {
      best = s;
      await p.screenshot({ path: `${OUT}/${c.id}.png`, clip: { x: s.box.x, y: s.box.y, width: s.box.w, height: s.box.h } });
      await p.screenshot({ path: `${OUT}/${c.id}-full.png` });
    }
  }

  results.push({ id: c.id, truth, scale: best?.scale ?? null, box: best?.box ?? null });
  await ctx.close();
}

// Measure each clipped capture: centroid of the marker colour vs image centre.
const mp = await (await b.newContext()).newPage();
for (const r of results) {
  const file = `${OUT}/${r.id}.png`;
  if (!fs.existsSync(file)) { r.verdict = "no capture"; continue; }
  const b64 = fs.readFileSync(file).toString("base64");
  const m = await mp.evaluate(async ({ b64, MARK }) => {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = "data:image/png;base64," + b64; });
    const cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    const cx2 = cv.getContext("2d");
    cx2.drawImage(img, 0, 0);
    const d = cx2.getImageData(0, 0, cv.width, cv.height).data;
    let sx = 0, sy = 0, n = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const i = (y * cv.width + x) * 4;
      if (d[i] - d[i+1] > 28 && d[i+2] - d[i+1] > 18 && d[i] > 22) {
        sx += x; sy += y; n++;
      }
    }
    return { w: cv.width, h: cv.height, n, cx: n ? sx / n : null, cy: n ? sy / n : null };
  }, { b64, MARK });

  if (!m.n) { r.verdict = "AVATAR NOT IN FRAME"; r.fill = 0; continue; }
  r.fill = +(m.n / (m.w * m.h) * 100).toFixed(1);
  r.offsetX = Math.round(m.cx - m.w / 2);
  r.offsetY = Math.round(m.cy - m.h / 2);
  // Offset as a fraction of the circle's radius — what the eye actually judges.
  r.offPct = +(Math.hypot(r.offsetX, r.offsetY) / (m.w / 2) * 100).toFixed(1);
  r.verdict = r.offPct < 12 ? "centred" : "OFF-CENTRE";
}

for (const r of results) {
  console.log(`${r.id.padEnd(15)} scale=${r.scale?.toFixed(2) ?? "-"} fill=${r.fill ?? "-"}% ` +
    `offset=(${r.offsetX ?? "-"},${r.offsetY ?? "-"}) ${r.offPct ?? "-"}% of radius  -> ${r.verdict}`);
}
await b.close();
