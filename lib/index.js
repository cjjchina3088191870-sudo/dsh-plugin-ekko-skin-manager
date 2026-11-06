// src/index.mjs
import { readFile as readFile2 } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash as createHash2 } from "node:crypto";
import { dirname, join as join2 } from "node:path";
import { pathToFileURL } from "node:url";

// src/boot-media.mjs
import { mkdir, readFile, writeFile, rename, unlink, readdir, stat, open } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { join, basename } from "node:path";
import { createHash, randomBytes } from "node:crypto";

// src/vendor/video-route.mjs
function parseRange(header, size) {
  if (header === void 0 || header === null || header === "") return null;
  if (typeof header !== "string") return null;
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header.trim());
  if (match === null) return null;
  const rawStart = match[1] ?? "";
  const rawEnd = match[2] ?? "";
  if (rawStart === "" && rawEnd === "") return null;
  let start;
  let end;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return "unsatisfiable";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (!Number.isFinite(size) || size <= 0) return "unsatisfiable";
  if (start > end || start >= size) return "unsatisfiable";
  return { start, end: Math.min(end, size - 1) };
}
function toInlineJson(value) {
  return JSON.stringify(value).replace(/</gu, "\\u003c").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");
}

// src/boot-media.mjs
var MAX_VIDEO = 96 * 1024 * 1024;
var CHUNK_SIZE = 512 * 1024;
var IDS = ["rose", "miku"];
var defaults = { enabled: true, sound: true, volume: 0.65, fit: "cover", maxSeconds: 30, file: null, name: null };
var mediaName = /^[a-f0-9]{64}\.(mp4|webm)$/;
var failure = (status, message) => Object.assign(Error(message), { status });
async function boundedBody(request, max) {
  if (Number(request.headers.get("content-length")) > max) throw failure(413, "\u6587\u4EF6\u6216\u5206\u5757\u8FC7\u5927\u3002");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let size = 0;
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw failure(413, "\u6587\u4EF6\u6216\u5206\u5757\u8FC7\u5927\u3002");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
var json = (value, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });
async function input(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw failure(415, "\u9700\u8981 JSON \u8BF7\u6C42\u3002");
  try {
    return JSON.parse((await boundedBody(request, 8192)).toString());
  } catch (e) {
    if (e.status) throw e;
    throw failure(400, "\u8BF7\u6C42\u683C\u5F0F\u65E0\u6548\u3002");
  }
}
function cleanSettings(value) {
  const result = { ...defaults };
  if (value && typeof value === "object") {
    for (const key of ["enabled", "sound"]) if (typeof value[key] === "boolean") result[key] = value[key];
    if (typeof value.volume === "number" && Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 1) result.volume = value.volume;
    if (["cover", "contain"].includes(value.fit)) result.fit = value.fit;
    if (Number.isInteger(value.maxSeconds) && value.maxSeconds >= 5 && value.maxSeconds <= 60) result.maxSeconds = value.maxSeconds;
    if (typeof value.file === "string" && mediaName.test(value.file)) {
      result.file = value.file;
      result.name = String(value.name || "\u81EA\u5B9A\u4E49\u89C6\u9891").slice(0, 120);
    }
  }
  return result;
}
async function createMediaStore({ directory, resolvePackage }) {
  await mkdir(directory, { recursive: true, mode: 448 });
  const settingsFile = join(directory, "settings.json");
  let state = { version: 1, revision: 0, skins: { rose: { ...defaults }, miku: { ...defaults } } };
  try {
    const saved = JSON.parse(await readFile(settingsFile, "utf8"));
    if (saved.version !== 1 || !Number.isSafeInteger(saved.revision)) throw Error("Invalid media settings");
    state = { version: 1, revision: saved.revision, skins: Object.fromEntries(IDS.map((id) => [id, cleanSettings(saved.skins?.[id])])) };
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  for (const file of await readdir(directory)) if (/^upload-[a-f0-9]{48}\.tmp$/.test(file)) await unlink(join(directory, file)).catch(() => {
  });
  const pending = /* @__PURE__ */ new Map();
  let tail = Promise.resolve(), closed = false;
  const available = (id) => {
    try {
      const root = resolvePackage(id);
      return existsSync(state.skins[id].file ? join(directory, state.skins[id].file) : join(root, "media/boot.mp4"));
    } catch {
      return false;
    }
  };
  const snapshot = () => ({ version: 1, revision: state.revision, skins: Object.fromEntries(IDS.map((id) => [id, { ...state.skins[id], available: available(id), source: state.skins[id].file ? "upload" : "default", url: "./api/ekko-skins/video?skin=" + id + "&file=" + (state.skins[id].file || "default") }])) });
  const queue = (fn) => {
    const next = tail.then(fn);
    tail = next.catch(() => {
    });
    return next;
  };
  async function commit(skins, revision) {
    if (revision !== state.revision) throw failure(409, "\u8BBE\u7F6E\u5DF2\u5728\u5176\u4ED6\u9875\u9762\u4FEE\u6539\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5\u3002");
    const next = { version: 1, revision: state.revision + 1, skins }, temp = settingsFile + "." + randomBytes(8).toString("hex") + ".tmp";
    try {
      await writeFile(temp, JSON.stringify(next) + "\n", { mode: 384, flag: "wx" });
      await rename(temp, settingsFile);
    } finally {
      await unlink(temp).catch(() => {
      });
    }
    state = next;
    const used = new Set(IDS.map((id) => state.skins[id].file));
    for (const file of await readdir(directory)) if (mediaName.test(file) && !used.has(file)) await unlink(join(directory, file)).catch(() => {
    });
    return snapshot();
  }
  async function discard(id) {
    const item = pending.get(id);
    if (!item) return;
    pending.delete(id);
    await unlink(item.path).catch(() => {
    });
  }
  const sweeper = setInterval(() => {
    for (const [id, item] of pending) if (!item.busy && item.expires < Date.now()) void discard(id);
  }, 6e4);
  sweeper.unref();
  async function settings(request) {
    if (request.method === "GET") return json(snapshot());
    const data = await input(request);
    if (!IDS.includes(data.skin)) throw failure(400, "\u672A\u77E5\u4E3B\u9898\u3002");
    return queue(async () => {
      const current = state.skins[data.skin];
      if (!data.patch || typeof data.patch !== "object" || Array.isArray(data.patch)) throw failure(400, "\u65E0\u6548\u8BBE\u7F6E\u3002");
      const keys = Object.keys(data.patch);
      if (keys.some((k) => !["enabled", "sound", "volume", "fit", "maxSeconds", "reset"].includes(k))) throw failure(400, "\u65E0\u6548\u8BBE\u7F6E\u9879\u3002");
      const updated = cleanSettings({ ...current, ...data.patch });
      for (const key of keys.filter((k) => k !== "reset")) if (updated[key] !== data.patch[key]) throw failure(400, "\u8BBE\u7F6E\u503C\u8D85\u51FA\u8303\u56F4\u3002");
      if (data.patch.reset === true) {
        updated.file = null;
        updated.name = null;
      }
      return json(await commit({ ...state.skins, [data.skin]: updated }, data.revision));
    });
  }
  async function upload(request) {
    const url = new URL(request.url), id = url.searchParams.get("id"), action = url.searchParams.get("action");
    if (request.method === "POST" && !id && !action) {
      const data = await input(request);
      if (!IDS.includes(data.skin) || !Number.isSafeInteger(data.size) || data.size < 16 || data.size > MAX_VIDEO) throw failure(400, "\u8BF7\u9009\u62E9\u4E0D\u8D85\u8FC7 96 MiB \u7684 MP4 \u6216 WebM \u89C6\u9891\u3002");
      const ext = typeof data.name === "string" ? /\.(mp4|webm)$/i.exec(data.name)?.[1].toLowerCase() : null;
      if (!ext) throw failure(415, "\u53EA\u652F\u6301 MP4\u3001WebM \u89C6\u9891\u3002");
      if (data.revision !== state.revision) throw failure(409, "\u8BBE\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u8BD5\u3002");
      if (pending.size >= 2) throw failure(429, "\u5DF2\u6709\u89C6\u9891\u6B63\u5728\u4E0A\u4F20\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002");
      const token = randomBytes(24).toString("hex"), path = join(directory, "upload-" + token + ".tmp");
      await writeFile(path, "", { mode: 384, flag: "wx" });
      pending.set(token, { path, skin: data.skin, ext, name: basename(data.name.replaceAll("\\", "/")).slice(0, 120), size: data.size, received: 0, hash: createHash("sha256"), revision: data.revision, expires: Date.now() + 6e5, busy: false });
      return json({ id: token, chunkSize: CHUNK_SIZE });
    }
    if (!/^[a-f0-9]{48}$/.test(id || "")) throw failure(404, "\u4E0A\u4F20\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F\u3002");
    const item = pending.get(id);
    if (!item || item.expires < Date.now()) throw failure(404, "\u4E0A\u4F20\u4E0D\u5B58\u5728\u6216\u5DF2\u8FC7\u671F\u3002");
    if (item.busy) throw failure(409, "\u8BF7\u7B49\u5F85\u5F53\u524D\u5206\u5757\u5B8C\u6210\u3002");
    item.busy = true;
    try {
      if (action === "cancel") {
        await input(request);
        await discard(id);
        return json({ cancelled: true });
      }
      if (action === "chunk") {
        if (request.headers.get("content-type") !== "application/octet-stream") throw failure(415, "\u9700\u8981\u89C6\u9891\u5206\u5757\u3002");
        const offset = Number(url.searchParams.get("offset"));
        if (!Number.isSafeInteger(offset) || offset !== item.received) throw failure(409, "\u5206\u5757\u987A\u5E8F\u4E0D\u5339\u914D\u3002");
        const bytes = await boundedBody(request, CHUNK_SIZE);
        if (!bytes.length || item.received + bytes.length > item.size) throw failure(413, "\u5206\u5757\u5927\u5C0F\u4E0D\u5339\u914D\u3002");
        const file = await open(item.path, "a");
        try {
          await file.writeFile(bytes);
        } finally {
          await file.close();
        }
        item.hash.update(bytes);
        item.received += bytes.length;
        item.expires = Date.now() + 6e5;
        return json({ received: item.received });
      }
      if (action === "complete") {
        await input(request);
        if (item.received !== item.size) throw failure(409, "\u89C6\u9891\u5C1A\u672A\u4E0A\u4F20\u5B8C\u6574\u3002");
        const file = await open(item.path, "r"), magic = Buffer.alloc(12);
        try {
          await file.read(magic, 0, 12, 0);
        } finally {
          await file.close();
        }
        if (item.ext === "mp4" ? magic.toString("ascii", 4, 8) !== "ftyp" : magic.readUInt32BE(0) !== 440786851) {
          await discard(id);
          throw failure(415, "\u89C6\u9891\u5185\u5BB9\u4E0E\u683C\u5F0F\u4E0D\u7B26\u3002");
        }
        return await queue(async () => {
          if (item.revision !== state.revision) {
            await discard(id);
            throw failure(409, "\u8BBE\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u89C6\u9891\u3002");
          }
          const name = item.hash.digest("hex") + "." + item.ext;
          await rename(item.path, join(directory, name));
          pending.delete(id);
          return json(await commit({ ...state.skins, [item.skin]: { ...state.skins[item.skin], file: name, name: item.name } }, item.revision));
        });
      }
      throw failure(405, "\u4E0D\u652F\u6301\u7684\u64CD\u4F5C\u3002");
    } finally {
      item.busy = false;
    }
  }
  async function video(request) {
    const url = new URL(request.url), skin = url.searchParams.get("skin"), file = url.searchParams.get("file");
    if (!IDS.includes(skin) || !(file === "default" || mediaName.test(file || "") && state.skins[skin].file === file)) throw failure(404, "\u89C6\u9891\u4E0D\u5B58\u5728\u3002");
    let path;
    try {
      path = file === "default" ? join(resolvePackage(skin), "media/boot.mp4") : join(directory, file);
    } catch {
      throw failure(404, "\u89C6\u9891\u4E0D\u5B58\u5728\u3002");
    }
    let info;
    try {
      info = await stat(path);
    } catch {
      throw failure(404, "\u89C6\u9891\u4E0D\u5B58\u5728\u3002");
    }
    const range = parseRange(request.headers.get("range"), info.size), headers = { "content-type": file?.endsWith(".webm") ? "video/webm" : "video/mp4", "accept-ranges": "bytes", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "cross-origin-resource-policy": "same-origin" };
    if (range === "unsatisfiable") return new Response(null, { status: 416, headers: { ...headers, "content-range": "bytes */" + info.size } });
    const start = range?.start || 0, end = range?.end ?? info.size - 1;
    headers["content-length"] = String(end - start + 1);
    if (range) headers["content-range"] = `bytes ${start}-${end}/${info.size}`;
    return new Response(request.method === "HEAD" ? null : Readable.toWeb(createReadStream(path, { start, end, signal: request.signal })), { status: range ? 206 : 200, headers });
  }
  const safe = (fn) => async (request) => {
    try {
      if (closed) throw failure(503, "\u4E3B\u9898\u7BA1\u7406\u6B63\u5728\u91CD\u8F7D\u3002");
      return await fn(request);
    } catch (e) {
      return json({ message: e.status ? e.message : "\u89C6\u9891\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u53EF\u7528\u7A7A\u95F4\u540E\u91CD\u8BD5\u3002" }, e.status || 500);
    }
  };
  return { settings: safe(settings), upload: safe(upload), video: safe(video), snapshot, async close() {
    closed = true;
    clearInterval(sweeper);
    await tail;
    for (const id of pending.keys()) await discard(id);
  } };
}

// src/boot-generated.mjs
var BOOT_SCRIPT = '(()=>{var B=`\n.ekko-boot{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#10171e;color:#fff;opacity:1;isolation:isolate;font:14px/1.5 system-ui,sans-serif}\n.ekko-boot[data-skin="rose"]{background:#241a20;--boot-accent:#f3b3c6}.ekko-boot[data-skin="miku"]{--boot-accent:#81eff0}\n.ekko-boot video{display:block;width:100%;height:100%;position:absolute;inset:0;object-fit:cover}\n.ekko-boot:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 2px var(--boot-accent),inset 0 -100px 100px -75px #000b}\n.ekko-boot button{position:relative;z-index:2;cursor:pointer;border:1px solid #fff8;background:#101820b8;color:white;border-radius:999px;min-height:44px;padding:9px 16px;font:inherit;backdrop-filter:blur(8px)}\n.ekko-boot button:focus-visible{outline:3px solid var(--boot-accent);outline-offset:3px}\n.ekko-boot-skip{position:absolute!important;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top))}\n.ekko-boot-footer{position:absolute;bottom:max(20px,env(safe-area-inset-bottom));left:max(20px,env(safe-area-inset-left));right:max(20px,env(safe-area-inset-right));display:grid;gap:10px;z-index:2;text-shadow:0 1px 8px #000}\n.ekko-boot-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.ekko-boot-toolbar span{margin-left:auto}.ekko-boot progress{width:100%;height:4px;accent-color:var(--boot-accent)}\n@media(prefers-reduced-motion:reduce){.ekko-boot{scroll-behavior:auto}}\n`,K=()=>/^zh/i.test(document.documentElement.lang||navigator.language)?{skip:"\\u8DF3\\u8FC7\\u89C6\\u9891",sound:"\\u5F00\\u542F\\u58F0\\u97F3",mute:"\\u9759\\u97F3",play:"\\u64AD\\u653E\\u89C6\\u9891",loading:"\\u6B63\\u5728\\u52A0\\u8F7D\\u542F\\u52A8\\u89C6\\u9891\\u2026",hint:"\\u70B9\\u51FB\\u753B\\u9762\\u6216\\u6309 Esc \\u8DF3\\u8FC7",title:"\\u4E3B\\u9898\\u542F\\u52A8\\u89C6\\u9891"}:{skip:"Skip video",sound:"Enable sound",mute:"Mute",play:"Play video",loading:"Loading startup video\\u2026",hint:"Click the picture or press Esc to skip",title:"Theme startup video"};function I(g,n,{preview:r=!1}={}){if(!n?.url||n.available===!1||!r&&!n.enabled||!r&&window.matchMedia?.("(prefers-reduced-motion: reduce)").matches||document.querySelector(".ekko-boot"))return Promise.resolve();let t=K(),a=document.createElement("section"),e=document.createElement("video");a.className="ekko-boot",a.dataset.skin=g,a.setAttribute("role","dialog"),a.setAttribute("aria-modal","true"),a.setAttribute("aria-label",t.title);let k=document.createElement("style");k.dataset.ekkoBoot="",k.textContent=B,document.head.append(k),e.playsInline=!0,e.preload="auto",e.muted=!n.sound,e.volume=n.volume??.65,e.style.objectFit=n.fit||"cover",e.src=n.url;let E=(o,c)=>{let u=document.createElement("button");return u.type="button",u.textContent=o,u.className=c||"",u},m=E(t.skip,"ekko-boot-skip"),l=E(e.muted?t.sound:t.mute),i=E(t.play);i.hidden=!0;let w=document.createElement("div");w.className="ekko-boot-footer";let T=document.createElement("div");T.className="ekko-boot-toolbar";let v=document.createElement("span");v.textContent=t.loading;let d=document.createElement("progress");d.max=1,d.value=0,d.setAttribute("aria-label",t.title),T.append(l,i,v),w.append(T,d),a.append(e,m,w),document.body.append(a);let _=document.activeElement,p=document.getElementById("root"),M=p?.inert;p&&(p.inert=!0),m.focus();let A=new MutationObserver(()=>{t=K(),m.textContent=t.skip,l.textContent=e.muted?t.sound:t.mute,i.textContent=t.play,v.textContent=e.currentTime>0?t.hint:t.loading,a.setAttribute("aria-label",t.title),d.setAttribute("aria-label",t.title)});A.observe(document.documentElement,{attributes:!0,attributeFilter:["lang"]});let x=!1,b=!1,h=0,f,y,C,N=new Promise(o=>C=o);function S(){b||(b=!0,clearTimeout(y),clearTimeout(f),cancelAnimationFrame(h),A.disconnect(),document.removeEventListener("keydown",P,!0),e.pause(),e.removeAttribute("src"),e.load(),a.remove(),k.remove(),p&&(p.inert=M),_?.isConnected&&_!==document.body&&_.focus({preventScroll:!0}),C())}function s(o=800){if(x)return;x=!0,clearTimeout(y),clearTimeout(f),cancelAnimationFrame(h);let c=performance.now(),u=e.volume,F=()=>{if(b)return;let O=Math.min(1,(performance.now()-c)/o);a.style.opacity=String(1-O),e.volume=u*(1-O),O===1?S():h=requestAnimationFrame(F)};h=requestAnimationFrame(F),f=setTimeout(S,o+150)}function P(o){if(o.key==="Escape"&&(o.preventDefault(),o.stopPropagation(),s(250)),o.key==="Tab"){let c=[m,l,...i.hidden?[]:[i]],u=c.indexOf(document.activeElement);o.preventDefault(),c[(u+(o.shiftKey?-1:1)+c.length)%c.length].focus()}}return document.addEventListener("keydown",P,!0),m.onclick=o=>{o.stopPropagation(),s(250)},a.onclick=o=>{o.target.closest("button")||s(250)},l.onclick=async o=>{o.stopPropagation(),e.muted=!e.muted;try{await e.play()}catch{i.hidden=!1}l.textContent=e.muted?t.sound:t.mute},i.onclick=async o=>{o.stopPropagation();try{await e.play(),i.hidden=!0}catch{e.muted=!0,l.textContent=t.sound;try{await e.play(),i.hidden=!0}catch{s(200)}}},e.addEventListener("ended",()=>s()),e.addEventListener("error",()=>s(200)),e.addEventListener("playing",()=>{clearTimeout(y),i.hidden=!0,f||(f=setTimeout(()=>s(),Math.max(5,Math.min(60,n.maxSeconds||30))*1e3)),v.textContent=t.hint}),e.addEventListener("timeupdate",()=>{Number.isFinite(e.duration)&&e.duration>0&&(d.value=Math.min(1,e.currentTime/e.duration))}),y=setTimeout(()=>s(200),12e3),(async()=>{try{await e.play()}catch{if(b||x)return;e.muted=!0,l.textContent=t.sound;try{await e.play()}catch{!b&&!x&&(i.hidden=!1)}}})(),N}function L({defaultSkin:g="miku"}={}){if(window.__EKKO_BOOT_STARTED__)return;window.__EKKO_BOOT_STARTED__=!0;let n=g;try{let r=JSON.parse(localStorage.getItem("dsh:ekko-skins:selection:v1"));r?.version===1&&["rose","miku","default"].includes(r.skin)&&(n=r.skin)}catch{}["rose","miku"].includes(n)&&(async()=>{try{let r=await fetch("./api/ekko-skins/boot",{credentials:"same-origin",signal:AbortSignal.timeout(3e3)});if(!r.ok)return;let t=await r.json();await I(n,t.skins?.[n])}catch{}})()}try{L(globalThis.__EKKO_STARTUP_CONFIG__||{})}catch{}})();\n';

// src/index.mjs
var require2 = createRequire(import.meta.url);
var PREFIX = "/ekko-skins";
var PACKAGES = { rose: "dsh-plugin-rose-theme", miku: "dsh-plugin-miku-theme" };
function createHandler({ resolvePackage = (name) => dirname(require2.resolve(name + "/package.json")), defaultSkin = "miku" } = {}) {
  async function catalog() {
    const skins = [];
    for (const [id, pkg] of Object.entries(PACKAGES)) {
      try {
        const root = resolvePackage(pkg), meta = JSON.parse(await readFile2(join2(root, "package.json"), "utf8"));
        skins.push({ id, version: meta.version, available: meta.dsh?.ekkoSkinProvider === 1, preview: { light: "./ekko-skins/preview/" + id + "/light.webp", dark: "./ekko-skins/preview/" + id + "/dark.webp" } });
      } catch {
        skins.push({ id, available: false });
      }
    }
    const installed = skins.filter((s) => s.available).map((s) => s.id);
    const preferred = ["rose", "miku", "default"].includes(defaultSkin) ? defaultSkin : "miku";
    const selected = preferred === "default" || installed.includes(preferred) ? preferred : installed[0] || "default";
    return { version: "0.2.0", defaultSkin: selected, skins };
  }
  return async (req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const pathname = new URL(req.url || "/", "http://localhost").pathname;
    if (pathname === PREFIX + "/catalog") {
      const bytes2 = Buffer.from(JSON.stringify(await catalog()));
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store", "Content-Length": bytes2.length, "X-Content-Type-Options": "nosniff" });
      res.end(req.method === "HEAD" ? void 0 : bytes2);
      return;
    }
    const match = /^\/ekko-skins\/(assets|preview)\/(rose|miku)\/([a-z0-9.-]+)$/.exec(pathname);
    if (!match) {
      res.writeHead(404).end();
      return;
    }
    const [, kind, id, file] = match;
    let bytes;
    try {
      const root = resolvePackage(PACKAGES[id]);
      if (kind === "assets") {
        if (!/^[a-f0-9]{64}\.(webp|png|svg|woff2)$/.test(file)) {
          res.writeHead(404).end();
          return;
        }
        const manifest = JSON.parse(await readFile2(join2(root, "assets/manifest.json"), "utf8"));
        if (!Object.values(manifest).includes(file)) {
          res.writeHead(404).end();
          return;
        }
        bytes = await readFile2(join2(root, "assets/runtime", file));
      } else {
        if (!["light.webp", "dark.webp"].includes(file)) {
          res.writeHead(404).end();
          return;
        }
        bytes = await readFile2(join2(root, "preview", file));
      }
    } catch {
      res.writeHead(404).end();
      return;
    }
    const etag = '"' + createHash2("sha256").update(bytes).digest("hex") + '"';
    const type = file.endsWith(".svg") ? "image/svg+xml" : file.endsWith(".png") ? "image/png" : file.endsWith(".woff2") ? "font/woff2" : "image/webp";
    const headers = { "Content-Type": type, "Cache-Control": kind === "assets" ? "public, max-age=31536000, immutable" : "no-cache", ETag: etag, "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" };
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers).end();
      return;
    }
    res.writeHead(200, { ...headers, "Content-Length": bytes.length });
    res.end(req.method === "HEAD" ? void 0 : bytes);
  };
}
function apply(ctx, config = {}) {
  ctx.on("webserver/index-inject", (table) => table.push({ kind: "script", placement: "body", text: "globalThis.__EKKO_STARTUP_CONFIG__=" + toInlineJson({ defaultSkin: config.defaultSkin || "miku" }) + ";\n" + BOOT_SCRIPT }));
  ctx.inject(["webServer", "profileContext", "connection"], async (child) => {
    const profile = child.get("profileContext"), resolver = createRequire(pathToFileURL(join2(profile.dir, "package.json")));
    const resolvePackage = (name) => dirname(resolver.resolve(name + "/package.json"));
    const media = await createMediaStore({ directory: join2(profile.dir, "ekko-skins-media"), resolvePackage: (id) => resolvePackage(PACKAGES[id]) });
    child.effect(() => () => media.close(), "ekko-skins: private media store");
    child.effect(() => child.get("webServer").register({ kind: "prefix", path: PREFIX, handler: createHandler({ defaultSkin: config.defaultSkin, resolvePackage }) }));
    for (const [path, methods, fetch, requestBody] of [
      ["/api/ekko-skins/boot", ["GET"], media.settings, "buffered"],
      ["/api/ekko-skins/boot-settings", ["POST"], media.settings, "streaming"],
      ["/api/ekko-skins/upload", ["POST"], media.upload, "streaming"],
      ["/api/ekko-skins/video", ["GET", "HEAD"], media.video, "buffered"]
    ]) child.effect(() => child.get("connection").fetch.register({ path, methods, requestBody, fetch }));
  });
}

// src/shared-lease.mjs
function acquireShared(ctx, key, plugin, config = {}) {
  const symbol = /* @__PURE__ */ Symbol.for("dsh.ekko-skins.leases." + key);
  const leases = globalThis[symbol] ??= /* @__PURE__ */ new WeakMap(), root = ctx.root;
  if (!root || typeof root.plugin !== "function") throw Error("DSH root context unavailable");
  let state = leases.get(root);
  if (!state) {
    state = { users: 0, fiber: null };
    leases.set(root, state);
    try {
      state.fiber = root.plugin(plugin, config);
    } catch (error) {
      leases.delete(root);
      throw error;
    }
  }
  state.users++;
  let released = false;
  ctx.effect(() => () => {
    if (released) return;
    released = true;
    if (--state.users === 0) {
      leases.delete(root);
      return state.fiber.dispose();
    }
  }, "ekko-skins: shared " + key + " lease");
  return state.fiber;
}

// src/host-entry.mjs
var host = { name: "ekko-skins-shared-host-v2", apply };
function acquireHost(ctx, config = {}) {
  return acquireShared(ctx, "host-v2", host, config);
}
function apply2(ctx, config = {}) {
  acquireHost(ctx, config);
}
export {
  PREFIX,
  acquireHost,
  apply2 as apply,
  createHandler
};
