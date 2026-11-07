window.__ModuleLoader__.load({id:"dsh-plugin-ekko-skin-manager",factory:(require)=>{const module={exports:{}};const exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client-entry.mjs
var client_entry_exports = {};
__export(client_entry_exports, {
  acquireClient: () => acquireClient,
  apply: () => apply2,
  inject: () => inject
});
module.exports = __toCommonJS(client_entry_exports);

// src/client.jsx
var import_react2 = __toESM(require("react"), 1);

// src/video-settings.jsx
var import_react = __toESM(require("react"), 1);

// src/boot-player.mjs
var BOOT_CSS = `
.ekko-boot{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#10171e;color:#fff;opacity:1;isolation:isolate;font:14px/1.5 system-ui,sans-serif}
.ekko-boot[data-skin="rose"]{background:#241a20;--boot-accent:#f3b3c6}.ekko-boot[data-skin="miku"]{--boot-accent:#81eff0}
.ekko-boot video{display:block;width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
.ekko-boot:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 2px var(--boot-accent),inset 0 -100px 100px -75px #000b}
.ekko-boot button{position:relative;z-index:2;cursor:pointer;border:1px solid #fff8;background:#101820b8;color:white;border-radius:999px;min-height:44px;padding:9px 16px;font:inherit;backdrop-filter:blur(8px)}
.ekko-boot button:focus-visible{outline:3px solid var(--boot-accent);outline-offset:3px}
.ekko-boot-skip{position:absolute!important;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top))}
.ekko-boot-footer{position:absolute;bottom:max(20px,env(safe-area-inset-bottom));left:max(20px,env(safe-area-inset-left));right:max(20px,env(safe-area-inset-right));display:grid;gap:10px;z-index:2;text-shadow:0 1px 8px #000}
.ekko-boot-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.ekko-boot-toolbar span{margin-left:auto}.ekko-boot progress{width:100%;height:4px;accent-color:var(--boot-accent)}
@media(prefers-reduced-motion:reduce){.ekko-boot{scroll-behavior:auto}}
`;
var text = () => /^zh/i.test(document.documentElement.lang || navigator.language) ? {
  skip: "\u8DF3\u8FC7\u89C6\u9891",
  sound: "\u5F00\u542F\u58F0\u97F3",
  mute: "\u9759\u97F3",
  play: "\u64AD\u653E\u89C6\u9891",
  loading: "\u6B63\u5728\u52A0\u8F7D\u542F\u52A8\u89C6\u9891\u2026",
  hint: "\u70B9\u51FB\u753B\u9762\u6216\u6309 Esc \u8DF3\u8FC7",
  title: "\u4E3B\u9898\u542F\u52A8\u89C6\u9891"
} : { skip: "Skip video", sound: "Enable sound", mute: "Mute", play: "Play video", loading: "Loading startup video\u2026", hint: "Click the picture or press Esc to skip", title: "Theme startup video" };
var MOBILE_SCREEN = "(max-width: 768px), (hover: none) and (pointer: coarse) and (max-height: 768px)";
function selectBootVideo(entry, mobile = false) {
  if (!entry) return entry;
  return mobile && entry.mobile ? { ...entry, ...entry.mobile, device: "mobile" } : { ...entry, device: mobile ? "mobile" : "desktop" };
}
function videoSources(options, canPlayWebM) {
  const original = options?.url, alternate = options?.fallbackUrl;
  return [...new Set((canPlayWebM ? [alternate, original] : [original, alternate]).filter(Boolean))];
}
function playBoot(skin, options, { preview = false } = {}) {
  if (!options?.url || options.available === false || !preview && !options.enabled) return Promise.resolve();
  if (!preview && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
  if (document.querySelector(".ekko-boot")) return Promise.resolve();
  let c = text();
  const overlay = document.createElement("section"), video = document.createElement("video");
  overlay.className = "ekko-boot";
  overlay.dataset.skin = skin;
  overlay.dataset.device = options.device || "desktop";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", c.title);
  const style = document.createElement("style");
  style.dataset.ekkoBoot = "";
  style.textContent = BOOT_CSS;
  document.head.append(style);
  video.playsInline = true;
  video.preload = "auto";
  video.muted = !options.sound;
  video.volume = options.volume ?? 0.65;
  video.style.objectFit = options.fit || "cover";
  const sources = videoSources(options, Boolean(video.canPlayType('video/webm; codecs="vp8, opus"')));
  let sourceIndex = 0;
  video.src = sources[sourceIndex];
  const button = (label, cl) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.className = cl || "";
    return b;
  };
  const skip = button(c.skip, "ekko-boot-skip"), sound = button(video.muted ? c.sound : c.mute), play = button(c.play);
  play.hidden = true;
  const footer = document.createElement("div");
  footer.className = "ekko-boot-footer";
  const toolbar = document.createElement("div");
  toolbar.className = "ekko-boot-toolbar";
  const hint = document.createElement("span");
  hint.textContent = c.loading;
  const progress = document.createElement("progress");
  progress.max = 1;
  progress.value = 0;
  progress.setAttribute("aria-label", c.title);
  toolbar.append(sound, play, hint);
  footer.append(toolbar, progress);
  overlay.append(video, skip, footer);
  document.body.append(overlay);
  const previousFocus = document.activeElement, root = document.getElementById("root"), previousInert = root?.inert;
  if (root) root.inert = true;
  skip.focus();
  const localeObserver = new MutationObserver(() => {
    c = text();
    skip.textContent = c.skip;
    sound.textContent = video.muted ? c.sound : c.mute;
    play.textContent = c.play;
    hint.textContent = video.currentTime > 0 ? c.hint : c.loading;
    overlay.setAttribute("aria-label", c.title);
    progress.setAttribute("aria-label", c.title);
  });
  localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  let leaving = false, finished = false, frame = 0, playTimer, loadTimer, resolve;
  const done = new Promise((r) => resolve = r);
  function cleanup() {
    if (finished) return;
    finished = true;
    clearTimeout(loadTimer);
    clearTimeout(playTimer);
    cancelAnimationFrame(frame);
    localeObserver.disconnect();
    document.removeEventListener("keydown", key, true);
    video.pause();
    video.removeAttribute("src");
    video.load();
    overlay.remove();
    style.remove();
    if (root) root.inert = previousInert;
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
    resolve();
  }
  function leave(ms = 800) {
    if (leaving) return;
    leaving = true;
    clearTimeout(loadTimer);
    clearTimeout(playTimer);
    cancelAnimationFrame(frame);
    const start = performance.now(), volume = video.volume;
    const fade = () => {
      if (finished) return;
      const p = Math.min(1, (performance.now() - start) / ms);
      overlay.style.opacity = String(1 - p);
      video.volume = volume * (1 - p);
      if (p === 1) cleanup();
      else frame = requestAnimationFrame(fade);
    };
    frame = requestAnimationFrame(fade);
    playTimer = setTimeout(cleanup, ms + 150);
  }
  function key(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      leave(250);
    }
    if (e.key === "Tab") {
      const buttons = [skip, sound, ...play.hidden ? [] : [play]], index = buttons.indexOf(document.activeElement);
      e.preventDefault();
      buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    }
  }
  document.addEventListener("keydown", key, true);
  skip.onclick = (e) => {
    e.stopPropagation();
    leave(250);
  };
  overlay.onclick = (e) => {
    if (!e.target.closest("button")) leave(250);
  };
  sound.onclick = async (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    try {
      await video.play();
    } catch {
      play.hidden = false;
    }
    sound.textContent = video.muted ? c.sound : c.mute;
  };
  play.onclick = async (e) => {
    e.stopPropagation();
    try {
      await video.play();
      play.hidden = true;
    } catch {
      video.muted = true;
      sound.textContent = c.sound;
      try {
        await video.play();
        play.hidden = true;
      } catch {
        leave(200);
      }
    }
  };
  video.addEventListener("ended", () => leave());
  video.addEventListener("error", () => {
    if (finished || leaving) return;
    if (sourceIndex + 1 < sources.length) {
      clearTimeout(loadTimer);
      loadTimer = setTimeout(() => leave(200), 12e3);
      video.src = sources[++sourceIndex];
      video.load();
      void startPlayback();
    } else leave(200);
  });
  video.addEventListener("playing", () => {
    clearTimeout(loadTimer);
    play.hidden = true;
    if (!playTimer) playTimer = setTimeout(() => leave(), Math.max(5, Math.min(60, options.maxSeconds || 30)) * 1e3);
    hint.textContent = c.hint;
  });
  video.addEventListener("timeupdate", () => {
    if (Number.isFinite(video.duration) && video.duration > 0) progress.value = Math.min(1, video.currentTime / video.duration);
  });
  loadTimer = setTimeout(() => leave(200), 12e3);
  async function startPlayback() {
    try {
      await video.play();
    } catch {
      if (finished || leaving) return;
      video.muted = true;
      sound.textContent = c.sound;
      try {
        await video.play();
      } catch {
        if (!finished && !leaving) play.hidden = false;
      }
    }
  }
  void startPlayback();
  return done;
}

// src/video-settings.jsx
var API = "./api/ekko-skins/";
var LIMIT = 96 * 1024 * 1024;
var fields = (entry) => Object.fromEntries(["enabled", "sound", "volume", "fit", "maxSeconds"].map((k) => [k, entry[k]]));
var draftFrom = (entry) => ({ ...fields(entry), mobileFit: entry.mobile?.fit || entry.fit });
async function request(path, options = {}) {
  const response = await fetch(API + path, { credentials: "same-origin", ...options });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error(response.status === 401 ? "\u767B\u5F55\u5DF2\u5931\u6548\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u65B0\u767B\u5F55\u3002" : "\u65E0\u6CD5\u8BFB\u53D6\u89C6\u9891\u8BBE\u7F6E\u3002");
  }
  if (!response.ok) throw Error(data.message || "\u89C6\u9891\u64CD\u4F5C\u5931\u8D25\u3002");
  return data;
}
var jsonBody = (data) => ({ headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
function previewError(video) {
  const code = video.error?.code;
  if (code === 2) return "\u89C6\u9891\u9884\u89C8\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5\u3002\u5DF2\u4FDD\u5B58\u7684\u89C6\u9891\u4E0D\u4F1A\u88AB\u5220\u9664\u3002";
  if (code === 3 || code === 4) return "\u5F53\u524D\u6D4F\u89C8\u5668\u6682\u65F6\u65E0\u6CD5\u64AD\u653E\u6B64\u89C6\u9891\u3002\u6587\u4EF6\u4ECD\u53EF\u4E0A\u4F20\u548C\u4FDD\u5B58\uFF0C\u53EF\u6362\u6D4F\u89C8\u5668\u9884\u89C8\uFF1B\u82E5\u542F\u52A8\u65F6\u4E5F\u65E0\u6CD5\u64AD\u653E\uFF0C\u8BF7\u8F6C\u6362\u4E3A\u517C\u5BB9\u7684 H.264 MP4 \u6216 WebM\u3002";
  return "\u5F53\u524D\u9884\u89C8\u4E0D\u53EF\u7528\uFF0C\u4E0D\u5F71\u54CD\u4E0A\u4F20\u548C\u4FDD\u5B58\u89C6\u9891\u3002";
}
function VideoSettings({ skin }) {
  const [data, setData] = (0, import_react.useState)(null), [draft, setDraft] = (0, import_react.useState)(null), [message, setMessage] = (0, import_react.useState)(""), [busy, setBusy] = (0, import_react.useState)(false), [progress, setProgress] = (0, import_react.useState)(null);
  const [device, setDevice] = (0, import_react.useState)(() => window.matchMedia?.(MOBILE_SCREEN).matches ? "mobile" : "desktop"), [mediaError, setMediaError] = (0, import_react.useState)(""), [sourceIndex, setSourceIndex] = (0, import_react.useState)(0);
  const preview = (0, import_react.useRef)(null), operation = (0, import_react.useRef)(null), uploadId = (0, import_react.useRef)(null), alive = (0, import_react.useRef)(true), input = (0, import_react.useRef)(null);
  const accept = (value, preserve = false) => {
    if (!alive.current) return;
    setData(value);
    if (!preserve) setDraft(draftFrom(value.skins[skin]));
  };
  const load = async () => {
    try {
      accept(await request("boot"));
    } catch (e) {
      if (alive.current) setMessage(e.message);
    }
  };
  const base = data?.skins[skin], entry = selectBootVideo(base, device === "mobile");
  const sources = videoSources(entry, Boolean(document.createElement("video").canPlayType('video/webm; codecs="vp8, opus"'))), source = sources[sourceIndex] || sources[0];
  (0, import_react.useEffect)(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      operation.current?.abort();
      if (uploadId.current) void request("upload?action=cancel&id=" + uploadId.current, { method: "POST", ...jsonBody({}) }).catch(() => {
      });
    };
  }, [skin]);
  (0, import_react.useEffect)(() => {
    setSourceIndex(0);
    setMediaError("");
  }, [entry?.url, entry?.fallbackUrl, device]);
  (0, import_react.useEffect)(() => {
    const video = preview.current;
    return () => {
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [source, device]);
  (0, import_react.useEffect)(() => {
    if (preview.current) preview.current.volume = draft?.volume ?? 0.65;
  }, [draft?.volume, source, device]);
  const save = async (reset = false) => {
    setBusy(true);
    setMessage("");
    try {
      const patch = reset ? { reset: true } : { ...fields(draft), mobile: { fit: draft.mobileFit } };
      accept(await request("boot-settings", { method: "POST", ...jsonBody({ skin, device, revision: data.revision, patch }) }), reset);
      setMessage(reset ? device === "mobile" ? "\u624B\u673A\u7AEF\u5DF2\u6539\u4E3A\u6CBF\u7528\u7535\u8111\u7AEF\u89C6\u9891\u3002" : "\u7535\u8111\u7AEF\u5DF2\u6062\u590D\u9ED8\u8BA4\u542F\u52A8\u89C6\u9891\u3002" : "\u542F\u52A8\u89C6\u9891\u8BBE\u7F6E\u5DF2\u4FDD\u5B58\u3002");
    } catch (e) {
      setMessage(e.message);
      await load();
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const upload = async (file) => {
    if (!file) return;
    setMessage("");
    if (!/\.(mp4|webm)$/i.test(file.name) || file.size > LIMIT || file.size < 16) {
      setMessage("\u8BF7\u9009\u62E9\u4E0D\u8D85\u8FC7 96 MiB \u7684 MP4 \u6216 WebM \u89C6\u9891\u3002");
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setProgress(0);
    try {
      const start = await request("upload", { method: "POST", signal: controller.signal, ...jsonBody({ skin, device, size: file.size, name: file.name, revision: data.revision }) });
      uploadId.current = start.id;
      for (let offset = 0; offset < file.size; offset += start.chunkSize) {
        const chunk = file.slice(offset, offset + start.chunkSize);
        await request("upload?action=chunk&id=" + start.id + "&offset=" + offset, { method: "POST", signal: controller.signal, headers: { "content-type": "application/octet-stream" }, body: chunk });
        if (alive.current) setProgress(Math.round(Math.min(file.size, offset + chunk.size) / file.size * 100));
      }
      const result = await request("upload?action=complete&id=" + start.id, { method: "POST", signal: controller.signal, ...jsonBody({}) });
      uploadId.current = null;
      accept(result, true);
      if (alive.current) setMessage((device === "mobile" ? "\u624B\u673A\u7AEF" : "\u7535\u8111\u7AEF") + "\u89C6\u9891\u5DF2\u4E0A\u4F20\u5E76\u4FDD\u5B58\uFF0C\u5237\u65B0\u9875\u9762\u65F6\u4F7F\u7528\u3002");
    } catch (e) {
      if (alive.current) setMessage(controller.signal.aborted ? "\u5DF2\u53D6\u6D88\u4E0A\u4F20\u3002" : e.message);
    } finally {
      if (uploadId.current) {
        const id = uploadId.current;
        uploadId.current = null;
        void request("upload?action=cancel&id=" + id, { method: "POST", ...jsonBody({}) }).catch(() => {
        });
      }
      operation.current = null;
      if (alive.current) {
        setBusy(false);
        setProgress(null);
        if (input.current) input.current.value = "";
      }
    }
  };
  if (!data || !draft) return /* @__PURE__ */ import_react.default.createElement("section", { className: "ekko-skin-options ekko-video-settings", "data-testid": "ekko-video-settings" }, /* @__PURE__ */ import_react.default.createElement("h3", null, "\u542F\u52A8\u89C6\u9891"), /* @__PURE__ */ import_react.default.createElement("p", { role: "status" }, message || "\u6B63\u5728\u8BFB\u53D6\u89C6\u9891\u8BBE\u7F6E\u2026"), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", onClick: load }, "\u91CD\u8BD5"));
  const update = (patch) => setDraft({ ...draft, ...patch }), fitKey = device === "mobile" ? "mobileFit" : "fit";
  return /* @__PURE__ */ import_react.default.createElement("section", { className: "ekko-skin-options ekko-video-settings", "data-testid": "ekko-video-settings", "data-device": device }, /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-skin-toolbar" }, /* @__PURE__ */ import_react.default.createElement("h3", null, skin === "miku" ? "\u521D\u97F3\u672A\u6765" : "\u73AB\u7470\u5973\u738B", " \xB7 \u542F\u52A8\u89C6\u9891"), /* @__PURE__ */ import_react.default.createElement("span", { className: "ekko-skin-version" }, "\u6BCF\u6B3E\u4E3B\u9898\u5206\u522B\u4FDD\u5B58")), /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-video-controls" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "ekko-skin-option" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u542F\u7528\u542F\u52A8\u89C6\u9891", /* @__PURE__ */ import_react.default.createElement("small", null, "\u9875\u9762\u542F\u52A8\u65F6\u64AD\u653E\uFF0C\u53EF\u968F\u65F6\u8DF3\u8FC7")), /* @__PURE__ */ import_react.default.createElement("input", { type: "checkbox", checked: draft.enabled, disabled: busy, onChange: (e) => update({ enabled: e.target.checked }) })), /* @__PURE__ */ import_react.default.createElement("label", { className: "ekko-skin-option" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u64AD\u653E\u58F0\u97F3", /* @__PURE__ */ import_react.default.createElement("small", null, "\u6D4F\u89C8\u5668\u9650\u5236\u81EA\u52A8\u64AD\u653E\u65F6\u5148\u9759\u97F3\uFF0C\u70B9\u51FB\u53EF\u5F00\u542F\u58F0\u97F3")), /* @__PURE__ */ import_react.default.createElement("input", { type: "checkbox", checked: draft.sound, disabled: busy, onChange: (e) => update({ sound: e.target.checked }) })), /* @__PURE__ */ import_react.default.createElement("label", { className: "ekko-skin-option" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u97F3\u91CF", /* @__PURE__ */ import_react.default.createElement("small", null, Math.round(draft.volume * 100), "%")), /* @__PURE__ */ import_react.default.createElement("input", { type: "range", min: "0", max: "100", value: Math.round(draft.volume * 100), disabled: busy, onChange: (e) => update({ volume: Number(e.target.value) / 100 }) })), /* @__PURE__ */ import_react.default.createElement("label", { className: "ekko-skin-option" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u6700\u957F\u64AD\u653E\u65F6\u95F4", /* @__PURE__ */ import_react.default.createElement("small", null, "5\u201360 \u79D2\uFF0C\u5230\u65F6\u81EA\u52A8\u8FDB\u5165\u754C\u9762")), /* @__PURE__ */ import_react.default.createElement("input", { className: "ekko-video-seconds", type: "number", min: "5", max: "60", value: draft.maxSeconds, disabled: busy, onChange: (e) => update({ maxSeconds: Number(e.target.value) }) }))), /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-video-device-tabs", role: "tablist", "aria-label": "\u542F\u52A8\u89C6\u9891\u5C4F\u5E55\u7C7B\u578B" }, ["desktop", "mobile"].map((value) => /* @__PURE__ */ import_react.default.createElement("button", { key: value, type: "button", role: "tab", id: "ekko-video-tab-" + skin + "-" + value, "aria-selected": device === value, "aria-controls": "ekko-video-panel-" + skin, disabled: busy, className: "ekko-skin-button", "data-active": device === value, onClick: () => {
    setDevice(value);
    setMessage("");
  } }, value === "mobile" ? "\u624B\u673A\u7AEF\u89C6\u9891" : "\u7535\u8111\u7AEF\u89C6\u9891"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-video-device-panel", role: "tabpanel", id: "ekko-video-panel-" + skin, "aria-labelledby": "ekko-video-tab-" + skin + "-" + device }, /* @__PURE__ */ import_react.default.createElement("p", { className: "ekko-skin-version" }, device === "mobile" ? "\u624B\u673A\u53CA\u7A84\u5C4F\u81EA\u52A8\u4F7F\u7528\u6B64\u89C6\u9891\uFF0C\u63A8\u8350 9:16 \u7AD6\u5C4F\uFF1B\u672A\u4E0A\u4F20\u65F6\u6CBF\u7528\u7535\u8111\u7AEF\u89C6\u9891\u3002" : "\u7535\u8111\u53CA\u5BBD\u5C4F\u4F7F\u7528\u6B64\u89C6\u9891\uFF0C\u63A8\u8350 16:9 \u6A2A\u5C4F\u3002", "\u652F\u6301\u5176\u4ED6\u5206\u8FA8\u7387\u4E0E\u6BD4\u4F8B\u3002"), /* @__PURE__ */ import_react.default.createElement("label", { className: "ekko-skin-option" }, /* @__PURE__ */ import_react.default.createElement("span", null, device === "mobile" ? "\u624B\u673A\u7AEF" : "\u7535\u8111\u7AEF", "\u753B\u9762\u663E\u793A"), /* @__PURE__ */ import_react.default.createElement("select", { "aria-label": (device === "mobile" ? "\u624B\u673A\u7AEF" : "\u7535\u8111\u7AEF") + "\u753B\u9762\u663E\u793A", value: draft[fitKey], disabled: busy, onChange: (e) => update({ [fitKey]: e.target.value }) }, /* @__PURE__ */ import_react.default.createElement("option", { value: "cover" }, "\u94FA\u6EE1\u5C4F\u5E55"), /* @__PURE__ */ import_react.default.createElement("option", { value: "contain" }, "\u5B8C\u6574\u663E\u793A"))), /* @__PURE__ */ import_react.default.createElement("video", { key: device + source, ref: preview, className: "ekko-video-preview", "data-device": device, muted: !draft.sound, controls: true, playsInline: true, preload: "metadata", onLoadedMetadata: () => setMediaError(""), onError: (e) => {
    if (sourceIndex + 1 < sources.length) {
      setSourceIndex(sourceIndex + 1);
      setMediaError("\u6B63\u5728\u5C1D\u8BD5\u53E6\u4E00\u79CD\u89C6\u9891\u7F16\u7801\u2026");
    } else setMediaError(previewError(e.currentTarget));
  }, src: source, "aria-label": (device === "mobile" ? "\u624B\u673A\u7AEF" : "\u7535\u8111\u7AEF") + "\u542F\u52A8\u89C6\u9891\u9884\u89C8" }), /* @__PURE__ */ import_react.default.createElement("p", { className: "ekko-video-name" }, entry.source === "upload" ? entry.name : entry.source === "fallback" ? "\u6CBF\u7528\u7535\u8111\u7AEF\u89C6\u9891" + (base.name ? " \xB7 " + base.name : "") : "\u9ED8\u8BA4\u542F\u52A8\u89C6\u9891"), mediaError && /* @__PURE__ */ import_react.default.createElement("p", { className: "ekko-video-message", role: "status" }, mediaError)), /* @__PURE__ */ import_react.default.createElement("p", { className: "ekko-skin-version" }, "\u652F\u6301 MP4 / WebM\uFF0C\u6BCF\u4E2A\u89C6\u9891\u6700\u5927 96 MiB\u3002\u7535\u8111\u7AEF\u4E0E\u624B\u673A\u7AEF\u5206\u522B\u4FDD\u5B58\uFF0C\u53EF\u5728\u5F53\u524D DSH \u7684\u5176\u4ED6\u8BBE\u5907\u4E0A\u4F7F\u7528\u3002"), /* @__PURE__ */ import_react.default.createElement("input", { ref: input, className: "ekko-video-file", tabIndex: "-1", type: "file", accept: "video/mp4,video/webm,.mp4,.webm", disabled: busy, "aria-label": "\u4E0A\u4F20" + (device === "mobile" ? "\u624B\u673A\u7AEF" : "\u7535\u8111\u7AEF") + "\u542F\u52A8\u89C6\u9891", onChange: (e) => void upload(e.target.files?.[0]) }), progress !== null && /* @__PURE__ */ import_react.default.createElement("div", { role: "status" }, /* @__PURE__ */ import_react.default.createElement("progress", { max: "100", value: progress }), /* @__PURE__ */ import_react.default.createElement("span", null, " \u4E0A\u4F20 ", progress, "%"), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", onClick: () => operation.current?.abort() }, "\u53D6\u6D88\u4E0A\u4F20")), /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-video-actions" }, /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", disabled: busy, onClick: () => input.current?.click() }, "\u4E0A\u4F20", device === "mobile" ? "\u624B\u673A\u7AEF" : "\u7535\u8111\u7AEF", "\u89C6\u9891"), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", disabled: busy, onClick: () => void playBoot(skin, { ...entry, ...fields(draft), fit: draft[fitKey] }, { preview: true }) }, "\u9884\u89C8\u542F\u52A8\u6548\u679C"), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", disabled: busy || entry.source !== "upload", onClick: () => void save(true) }, device === "mobile" ? "\u6CBF\u7528\u7535\u8111\u7AEF\u89C6\u9891" : "\u6062\u590D\u9ED8\u8BA4\u89C6\u9891"), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", "data-active": "true", disabled: busy, onClick: () => void save() }, "\u4FDD\u5B58\u542F\u52A8\u8BBE\u7F6E")), /* @__PURE__ */ import_react.default.createElement("p", { role: "status", className: "ekko-video-message" }, message));
}

// src/controller.mjs
var SELECTION_KEY = "dsh:ekko-skins:selection:v1";
var SKIN_IDS = ["default", "rose", "miku"];
function readSelection(storage, fallback = "rose") {
  try {
    const value = JSON.parse(storage.getItem(SELECTION_KEY));
    if (value?.version === 1 && SKIN_IDS.includes(value.skin)) return value.skin;
  } catch {
  }
  const old = {};
  for (const id of ["rose", "miku"]) try {
    old[id] = JSON.parse(storage.getItem("dsh:ekko-" + id + ":v1"))?.enabled;
  } catch {
  }
  if (old.rose === false && old.miku === true) return "miku";
  if (old.miku === false && old.rose === true) return "rose";
  if (old.rose === false && old.miku === false) return "default";
  return SKIN_IDS.includes(fallback) ? fallback : "rose";
}
function createController({ storage, mount, prepare = async () => {
}, fallback = "rose" }) {
  const providers = /* @__PURE__ */ new Map(), listeners = /* @__PURE__ */ new Set();
  let wanted = readSelection(storage, fallback), persistWanted = true, runtime = null, epoch = 0, closed = false, initialized = false, tail = Promise.resolve();
  let snapshot = { selected: "default", desired: wanted, busy: false, error: null, available: [] };
  const publish = (value) => {
    snapshot = { ...snapshot, ...value, available: [...providers.keys()] };
    for (const fn of listeners) fn();
  };
  async function release() {
    const previous = runtime;
    runtime = null;
    if (previous) await previous.handle.dispose();
  }
  function reconcile() {
    if (closed) return Promise.resolve();
    const ticket = ++epoch, target = wanted, persist = persistWanted;
    publish({ desired: target, busy: true, error: null });
    tail = tail.catch(() => {
    }).then(async () => {
      if (closed || ticket !== epoch) return;
      const provider = providers.get(target);
      if (target !== "default" && !provider) {
        if (runtime && providers.get(runtime.provider.id) !== runtime.provider) {
          await release();
          publish({ selected: "default" });
        }
        return;
      }
      if (runtime?.provider !== provider || target === "default") {
        if (provider) await prepare(provider);
        if (closed || ticket !== epoch) return;
        await release();
        if (closed || ticket !== epoch) return;
        if (provider) {
          runtime = { provider, handle: mount(provider) };
          try {
            await runtime.handle.ready();
          } catch (error) {
            await release();
            throw error;
          }
          if (closed || ticket !== epoch) {
            await release();
            return;
          }
        }
      }
      if (persist) try {
        storage.setItem(SELECTION_KEY, JSON.stringify({ version: 1, skin: target }));
      } catch {
      }
      publish({ selected: target, busy: false, error: null });
    }).catch((error) => {
      if (!closed && ticket === epoch) publish({ selected: runtime?.provider.id || "default", busy: false, error: String(error?.message || error) });
    });
    return tail;
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    register(provider) {
      if (!["rose", "miku"].includes(provider.id) || typeof provider.plugin?.apply !== "function") throw new TypeError("Unknown Ekko skin provider");
      const existing = providers.get(provider.id);
      if (existing && (existing.priority || 0) > (provider.priority || 0)) return () => {
      };
      providers.set(provider.id, provider);
      publish({});
      if (initialized && provider.id === wanted) void reconcile();
      return () => {
        if (providers.get(provider.id) !== provider) return;
        providers.delete(provider.id);
        publish({});
        if (provider.id === wanted || runtime?.provider === provider) void reconcile();
      };
    },
    choose(id, { persist = true } = {}) {
      if (!SKIN_IDS.includes(id)) return Promise.reject(new TypeError("Unknown skin"));
      initialized = true;
      wanted = id;
      persistWanted = persist;
      return reconcile();
    },
    initialize(defaultSkin, installedIds) {
      initialized = true;
      wanted = readSelection(storage, defaultSkin);
      if (Array.isArray(installedIds) && wanted !== "default" && !installedIds.includes(wanted)) wanted = defaultSkin === "default" ? "default" : installedIds.includes(defaultSkin) ? defaultSkin : SKIN_IDS.find((id) => id !== "default" && installedIds.includes(id)) || "default";
      persistWanted = true;
      return reconcile();
    },
    provider: (id) => providers.get(id),
    settled: () => tail,
    async dispose() {
      if (closed) return;
      closed = true;
      ++epoch;
      await tail.catch(() => {
      });
      await release();
      listeners.clear();
      providers.clear();
    }
  };
}

// src/generated.mjs
var STYLES = ".ekko-skins{display:grid;gap:18px;color:var(--dsw-alias-label-primary);font:14px/1.6 var(--ds-font-family,system-ui);}\n.ekko-skins h2,.ekko-skins h3,.ekko-skins p{margin:0;}.ekko-skins h2{font-size:20px;line-height:1.5;}.ekko-skins h3{font-size:15px;}\n.ekko-skins-intro{display:grid;gap:5px;}.ekko-skins-intro p,.ekko-skin-version,.ekko-skin-option small{color:var(--dsw-alias-label-secondary);font-size:12px;}\n.ekko-skin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}\n.ekko-skin-card{min-width:0;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 4px 12px #234c6510;}\n.ekko-skin-card[data-active='true']{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);}\n.ekko-skin-cover{display:block;width:100%;aspect-ratio:1400/787;object-fit:cover;border-bottom:1px solid var(--dsw-alias-border-l3);}\n.ekko-skin-description{display:grid;gap:10px;padding:13px;}.ekko-skin-title{display:flex;align-items:center;justify-content:space-between;gap:8px;}.ekko-skin-state{color:var(--dsw-alias-brand-text);font-size:11px;white-space:nowrap;}\n.ekko-skin-button{border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:7px 12px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;}\n.ekko-skin-button:disabled{opacity:.65;cursor:default;}.ekko-skin-button:focus-visible,.ekko-skins input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px;}\n.ekko-skin-button[data-active='true']{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary-invert);}\n.ekko-skin-option select{min-height:40px;max-width:52%;padding:6px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;}\n.ekko-skin-option select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px;}\n.ekko-skin-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;}.ekko-skin-options{padding:15px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);}\n.ekko-skin-option{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:40px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l3);}.ekko-skin-option:last-child{border:0;}.ekko-skin-option span{display:grid;gap:2px;}.ekko-skin-option input{accent-color:var(--dsw-alias-brand-primary);}.ekko-skin-option input[type='range']{width:130px;max-width:40%;}.ekko-skin-error{padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;color:var(--dsw-alias-state-danger,#c43d3d);font-size:13px;}\n@media(max-width:640px){.ekko-skin-grid{grid-template-columns:1fr;}.ekko-skins h2{font-size:18px;}.ekko-skin-toolbar{align-items:flex-start;}.ekko-skin-description{padding:12px;}}\n/* Keep the native settings shell usable on phones: tabs above the content. */\n@media(max-width:640px){\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']){flex-direction:column;width:calc(100vw - 24px);max-width:calc(100vw - 24px);height:min(800px,calc(100dvh - 48px));}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList'])>[class*='_nav']{width:100%;padding:15px 12px 0;gap:12px;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']) [class*='_navTitle']{padding-inline:5px;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']) [class*='_navList']{flex-direction:row;gap:4px;overflow:auto;padding-bottom:5px;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']) [class*='_navCell']{flex:none;width:max-content;height:36px;padding:7px 10px;font-size:13px;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList'])>[class*='_content']{min-height:0;width:100%;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList'])>[class*='_content']>[class*='_header']{position:absolute;top:10px;right:10px;height:auto;padding:0;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList'])>[class*='_content']>[class*='_header'] button{white-space:nowrap;flex-shrink:0;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']) [class*='_options']{padding:12px 12px 18px;min-width:0;}\n .ekko-skins{gap:13px;width:100%;min-width:0;}\n .ekko-skin-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}\n .ekko-skin-description{padding:9px;gap:7px;min-width:0;}.ekko-skin-title{gap:4px;flex-wrap:wrap;}.ekko-skin-title h3{font-size:13px;}.ekko-skin-state{font-size:10px;}\n .ekko-skin-button{font-size:12px;padding:6px;min-height:36px;max-width:100%;overflow-wrap:anywhere;}\n .ekko-skin-toolbar{flex-wrap:wrap;min-width:0;}.ekko-skin-options{min-width:0;padding:11px;}.ekko-skin-options .ekko-skin-toolbar h3{font-size:13px;}\n}\n\n.ekko-video-settings{display:grid;gap:10px;min-width:0}.ekko-video-settings .ekko-skin-option{margin:0}.ekko-video-preview{display:block;width:100%;max-height:160px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:#101820;object-fit:contain}.ekko-video-name{font-weight:500;overflow-wrap:anywhere}.ekko-video-file{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none}.ekko-video-file::file-selector-button{font:inherit;padding:8px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);margin-right:8px}.ekko-video-actions{display:flex;gap:8px;flex-wrap:wrap}.ekko-video-seconds{width:72px;padding:7px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:inherit;font:inherit}.ekko-video-settings progress{max-width:100%;accent-color:var(--dsw-alias-brand-primary)}.ekko-video-message{font-size:12px;overflow-wrap:anywhere}\n\n.ekko-video-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px;min-width:0}.ekko-video-controls .ekko-skin-option{min-width:0;gap:10px}.ekko-video-controls .ekko-skin-option:last-child{grid-column:1/-1}.ekko-video-controls .ekko-skin-option span{min-width:0}.ekko-video-controls input[type=range]{width:100px}.ekko-video-actions .ekko-skin-button{min-height:40px}.ekko-video-settings{scroll-margin-top:12px}\n@media(max-width:640px){.ekko-video-controls{grid-template-columns:1fr}.ekko-video-preview{max-height:140px}.ekko-video-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ekko-video-actions .ekko-skin-button{width:100%;min-height:42px}.ekko-video-settings .ekko-skin-option small{font-size:11px}}\n\n.ekko-video-device-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:5px;border:1px solid var(--dsw-alias-border-l3);border-radius:13px;background:var(--dsw-alias-bg-layer-2)}\n.ekko-video-device-tabs .ekko-skin-button{min-height:40px;box-shadow:none;background:transparent;border-color:transparent}\n.ekko-video-device-tabs .ekko-skin-button[data-active='true']{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}\n.ekko-video-device-panel{display:grid;gap:8px;min-width:0}\n.ekko-video-preview[data-device='mobile']{width:100%;height:210px;max-height:210px;object-fit:contain}\n.ekko-video-device-tabs .ekko-skin-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}\n.ekko-video-controls .ekko-skin-option:last-child{grid-column:auto}\n@media(max-width:640px){.ekko-video-preview[data-device='mobile']{height:200px;max-height:200px}.ekko-video-device-tabs{gap:4px;padding:4px}.ekko-video-device-tabs .ekko-skin-button{min-height:40px}}\n\n/* Both phone modes use the active skin's existing artwork and jewellery tokens. */\n.ekko-mobile-navigation{display:none;}\n@media(max-width:700px) and (orientation:portrait){\n body[data-ekko-mobile-nav] .ekko-mobile-navigation{position:fixed;z-index:65;display:flex;box-sizing:border-box;align-items:center;color:var(--dsw-alias-brand-primary);}\n body[data-ekko-mobile-nav] .ekko-mobile-brand,\n body[data-ekko-mobile-nav] .ekko-mobile-action{position:relative;display:flex;flex:none;align-items:center;justify-content:center;box-sizing:border-box;width:44px;height:44px;min-height:44px;padding:8px;border:1px solid var(--ekko-rim-soft);border-radius:14px;background:var(--ekko-panel);box-shadow:inset 0 1px 0 var(--ekko-shine),0 3px 8px var(--ekko-shadow);color:inherit;cursor:pointer;}\n body[data-ekko-mobile-nav] .ekko-mobile-brand{padding:6px;border-color:var(--ekko-rim);}\n body[data-ekko-mobile-nav] .ekko-mobile-brand img{display:block;width:31px;height:31px;object-fit:contain;}\n body[data-ekko-mobile-nav] .ekko-mobile-action :is(svg,img){width:21px;height:21px;flex:none;}\n body[data-ekko-mobile-nav] .ekko-mobile-action[data-ekko-mobile-action='new']{margin-top:4px;border-color:var(--ekko-rim);box-shadow:inset 0 0 0 2px var(--ekko-shine),0 3px 8px var(--ekko-shadow);}\n body[data-ekko-mobile-nav] .ekko-mobile-action[aria-current]{background:var(--ekko-tint);border-color:var(--ekko-rim);}\n body[data-ekko-mobile-nav] .ekko-mobile-action:disabled{opacity:.45;cursor:default;}\n body[data-ekko-mobile-nav] .ekko-mobile-navigation button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}\n body[data-ekko-mobile-nav] .ekko-mobile-navigation button:active{box-shadow:inset 1px 2px 5px var(--ekko-shadow);}\n body[data-ekko-mobile-nav='corner'] .ekko-mobile-navigation{top:calc(env(safe-area-inset-top,0px) + 7px);left:9px;}\n body[data-ekko-mobile-nav='corner'] :is(.ekko-mobile-actions,.ekko-mobile-footer){display:none;}\n /* Set clearance on the content column so native drawer/platform frame rules cannot override it. */\n body[data-ekko-mobile-nav='corner'] [data-ekko-mobile-frame] [data-ekko-mobile-center]{--dsh-frame-leading-clearance:62px;}\n body[data-ekko-mobile-nav='corner'] :is(.miku-welcome-brand,.rose-welcome-brand){padding-left:48px;}\n body[data-ekko-mobile-nav='corner'] :is(.miku-mark,.rose-mark){display:none;}\n body[data-ekko-mobile-nav='rail'] .ekko-mobile-navigation{inset:0 auto 0 0;width:60px;flex-direction:column;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 13px) 7px max(10px,env(safe-area-inset-bottom,0px));background:var(--ekko-panel);border-right:1px solid var(--ekko-rim);box-shadow:inset -2px 0 0 var(--ekko-shine),inset -4px 0 0 var(--ekko-rim-soft);}\n body[data-ekko-mobile-nav='rail'] .ekko-mobile-actions{display:flex;flex:1;min-height:0;flex-direction:column;gap:10px;padding:0 0 4px;overflow:auto;scrollbar-width:none;}\n body[data-ekko-mobile-nav='rail'] .ekko-mobile-footer{display:flex;flex:none;padding-top:5px;border-top:1px solid var(--ekko-rim-soft);}\n body[data-ekko-mobile-nav='rail'] [data-ekko-mobile-frame] [data-ekko-mobile-center]{margin-inline-start:60px;--dsh-frame-leading-clearance:0px;}\n /* The native drawer stays inert while closed. Only our launchers remain visible. */\n body[data-ekko-mobile-nav] [data-ekko-mobile-frame] [data-shell-leading]{display:none;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-frame] [data-ekko-mobile-drawer]{z-index:80;background:var(--ekko-panel);box-shadow:12px 0 30px var(--ekko-shadow);}\n body[data-ekko-mobile-nav][data-ekko-mobile-drawer-open='true'] .ekko-mobile-navigation{visibility:hidden;pointer-events:none;}\n}\n\n/* Keep phone controls aligned when the icon rail reduces the editor width. */\n@media(max-width:700px) and (orientation:portrait){\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] :is([data-miku-editor-root],[data-rose-editor-root]){width:calc(100% + 8px);margin-inline-start:-4px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card]{container:ekko-composer / inline-size;gap:6px;padding-top:14px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] :is([data-miku-editor-root],[data-rose-editor-root]) [data-composer-card]{min-height:140px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card]>[class*='_scroll']{flex:1;min-height:56px;margin-right:0;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] [contenteditable]{padding-inline:12px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] button[class*='_primary']{align-self:center;transform:none;}\n}\n@container ekko-composer (max-width:350px){\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card]>[class*='_row']{display:grid;grid-template-columns:auto minmax(0,1fr) 30px 34px;grid-template-areas:'extras extras extras extras' 'tools model activity send';gap:4px 6px;padding:4px 7px 6px;align-items:center;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card]>[class*='_row']:not(:has([data-slot='conversation.input.right']:not(:empty))){grid-template-areas:'tools model activity send';}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] [class*='_tools']{grid-area:tools;gap:5px;align-items:center;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] :is([class*='_trailing'],[class*='_standardControls'],[class*='_modes']){display:contents;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] :is([class*='_tools'],[class*='_standardControls'])[hidden]{display:none!important;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] [class*='_trailing']>[class*='_activity']{display:contents;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.right']{grid-area:extras;display:flex!important;align-items:center;justify-content:flex-start;gap:8px;min-width:0;max-width:100%;overflow-x:auto;scrollbar-width:thin;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.right']:empty{display:none!important;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.right']>*{flex:none;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.model']{grid-area:model;display:flex!important;min-width:0;justify-content:flex-end;align-items:center;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.model']>div{min-width:0;max-width:100%;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.model'] button{min-width:0;max-width:100%;height:34px;padding-inline:4px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.model'] :is([class*='_triggerLabel'],[class*='_triggerEffort']){display:none;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.model'] button>svg:first-child{display:block;flex:none;width:18px;height:18px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.activity']{grid-area:activity;display:flex!important;align-items:center;justify-content:center;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] button[class*='_primary']{grid-area:send;justify-self:end;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] button:is([aria-label^='\u8BBF\u95EE\u6A21\u5F0F'],[aria-label^='Access mode']){padding-inline:6px;}\n}\n";

// src/mobile-navigation.mjs
function createMobileNavigation({ layout, document: doc = document }) {
  const view = doc.defaultView, body = doc.body;
  let current = null, nav, brand, actions, footer, frame, sidebar, center, raf = 0, disposed = false;
  const marked = /* @__PURE__ */ new Map(), buttons = /* @__PURE__ */ new Map();
  const mark = (el, name, value = "") => {
    if (!el) return;
    if (!marked.has(el)) marked.set(el, /* @__PURE__ */ new Map());
    const attrs = marked.get(el);
    if (!attrs.has(name)) attrs.set(name, el.getAttribute(name));
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  };
  const restore = () => {
    for (const [el, attrs] of marked) for (const [name, value] of attrs) value === null ? el.removeAttribute(name) : el.setAttribute(name, value);
    marked.clear();
  };
  const phone = () => view.innerWidth <= 700 && view.innerHeight >= view.innerWidth;
  const isOpen = () => frame && !frame.hasAttribute("data-sidebar-collapsed");
  const nativeButton = (key) => {
    if (!sidebar) return null;
    if (key === "new") return sidebar.querySelector('button[class*="_newSession"]');
    if (key === "search") return sidebar.querySelector('button[class*="_searchButton"]');
    if (key === "account") return sidebar.querySelector('button[aria-label="\u8D26\u53F7\u83DC\u5355"],button[aria-label="Account menu"]');
    if (key.startsWith("panel:")) return [...sidebar.querySelectorAll('button[class*="_panelRow"]')].find((el) => el.getAttribute("aria-label") === key.slice(6));
    return null;
  };
  function activate(key) {
    const target = nativeButton(key);
    if (!target || target.disabled) return;
    if (key === "search" || key === "account" || target.hasAttribute("aria-haspopup")) {
      if (!isOpen()) layout.toggleSidebar();
      view.requestAnimationFrame(() => {
        if (!disposed) nativeButton(key)?.click();
      });
    } else target.click();
  }
  function makeButton(key, label) {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "ekko-mobile-action";
    button.dataset.ekkoMobileAction = key;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.addEventListener("click", () => activate(key));
    buttons.set(key, button);
    return button;
  }
  function mount() {
    nav = doc.createElement("nav");
    nav.className = "ekko-mobile-navigation";
    nav.setAttribute("aria-label", "\u624B\u673A\u5BFC\u822A");
    nav.dataset.ekkoMobileNavigation = "";
    brand = doc.createElement("button");
    brand.type = "button";
    brand.className = "ekko-mobile-brand";
    brand.dataset.sidebarOpener = "";
    brand.setAttribute("aria-label", "\u6253\u5F00\u4FA7\u8FB9\u680F");
    brand.title = "\u6253\u5F00\u4FA7\u8FB9\u680F";
    brand.addEventListener("click", () => layout.toggleSidebar());
    actions = doc.createElement("div");
    actions.className = "ekko-mobile-actions";
    footer = doc.createElement("div");
    footer.className = "ekko-mobile-footer";
    nav.append(brand, actions, footer);
    body.prepend(nav);
  }
  function paintButton(key, target, parent) {
    if (!target) return;
    const label = target.getAttribute("aria-label") || target.textContent.trim();
    let button = buttons.get(key);
    if (!button) {
      button = makeButton(key, label);
      parent.append(button);
    }
    button.setAttribute("aria-label", label);
    button.title = label;
    button.disabled = target.disabled;
    const selected = target.getAttribute("aria-current");
    if (selected) button.setAttribute("aria-current", selected);
    else button.removeAttribute("aria-current");
    const icon = target.querySelector("svg,img");
    const signature = icon?.outerHTML || "";
    if (button.dataset.iconSignature !== signature) {
      button.replaceChildren(...icon ? [icon.cloneNode(true)] : []);
      button.dataset.iconSignature = signature;
    }
  }
  function clear() {
    nav?.remove();
    nav = brand = actions = footer = void 0;
    buttons.clear();
    restore();
    frame = sidebar = center = void 0;
  }
  function sync() {
    if (disposed) return;
    if (!current || !phone() || !body.hasAttribute("data-dsh-ekko-" + current.skin)) {
      if (nav || marked.size) clear();
      return;
    }
    const nextSidebar = doc.querySelector('[data-slot="sidebar"]'), nextFrame = nextSidebar?.closest('[class*="_frame"]');
    if (!nextSidebar || !nextFrame) return;
    if (frame && frame !== nextFrame) clear();
    frame = nextFrame;
    sidebar = nextSidebar;
    center = frame.querySelector('[class*="_centerCol"]');
    if (!nav) mount();
    mark(body, "data-ekko-mobile-nav", current.mode === "rail" ? "rail" : "corner");
    mark(body, "data-ekko-mobile-drawer-open", String(isOpen()));
    mark(frame, "data-ekko-mobile-frame");
    mark(center, "data-ekko-mobile-center");
    mark(sidebar.closest('[class*="_sidebarCol"]'), "data-ekko-mobile-drawer");
    mark(sidebar, "id", "ekko-mobile-native-sidebar");
    brand.setAttribute("aria-controls", "ekko-mobile-native-sidebar");
    brand.setAttribute("aria-expanded", String(isOpen()));
    const lang = /^zh/i.test(doc.documentElement.lang || view.navigator.language), openLabel = lang ? "\u6253\u5F00\u4FA7\u8FB9\u680F" : "Open sidebar";
    nav.setAttribute("aria-label", lang ? "\u624B\u673A\u5BFC\u822A" : "Phone navigation");
    brand.setAttribute("aria-label", openLabel);
    brand.title = openLabel;
    if (brand.dataset.mark !== current.mark) {
      const img = doc.createElement("img");
      img.src = current.mark;
      img.alt = "";
      img.draggable = false;
      brand.replaceChildren(img);
      brand.dataset.mark = current.mark;
    }
    const wanted = /* @__PURE__ */ new Set(["new", "search", "account"]);
    paintButton("new", nativeButton("new"), actions);
    for (const target of sidebar.querySelectorAll('button[class*="_panelRow"]')) {
      const label = target.getAttribute("aria-label");
      if (!label) continue;
      const key = "panel:" + label;
      wanted.add(key);
      paintButton(key, target, actions);
    }
    paintButton("search", nativeButton("search"), actions);
    paintButton("account", nativeButton("account"), footer);
    for (const [key, button] of buttons) if (!wanted.has(key) || !nativeButton(key)) {
      button.remove();
      buttons.delete(key);
    }
  }
  function schedule() {
    if (!raf && !disposed) raf = view.requestAnimationFrame(() => {
      raf = 0;
      sync();
    });
  }
  const observer = new view.MutationObserver((records) => {
    if (records.some((record) => {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (target?.closest("[data-ekko-mobile-navigation]")) return false;
      if (record.type === "attributes") return record.attributeName === "data-sidebar-collapsed" || target?.closest('[data-slot="sidebar"]') || target === doc.documentElement;
      return [...record.addedNodes, ...record.removedNodes].some((node) => node.nodeType === 1 && !node.hasAttribute?.("data-ekko-mobile-navigation"));
    })) schedule();
  });
  observer.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-sidebar-collapsed", "aria-current", "aria-label", "disabled", "lang"] });
  const closeAfterSelection = (event) => {
    if (!current || !phone() || !isOpen() || !sidebar?.contains(event.target)) return;
    const target = event.target.closest?.('button,[role="button"],a'), row = event.target.closest?.('[data-row-key^="session:"]');
    if (event.target.closest?.('[aria-haspopup],[role="menu"],input,textarea')) return;
    if (row && target && target !== row) return;
    if (!row && !event.target.closest?.('button[class*="_newSession"]')) return;
    view.requestAnimationFrame(() => {
      if (!disposed && isOpen()) layout.toggleSidebar();
    });
  };
  doc.addEventListener("click", closeAfterSelection, true);
  view.addEventListener("resize", schedule);
  return {
    update(value) {
      current = value;
      sync();
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      doc.removeEventListener("click", closeAfterSelection, true);
      view.removeEventListener("resize", schedule);
      if (raf) view.cancelAnimationFrame(raf);
      clear();
    }
  };
}

// src/client.jsx
var inject = ["slots", "theme", "layout"];
var NAMES = { rose: { zh: "\u73AB\u7470\u5973\u738B", en: "Rose Queen" }, miku: { zh: "\u521D\u97F3\u672A\u6765", en: "Hatsune Miku" } };
var COPY = {
  zh: { nav: "Ekko \u76AE\u80A4", title: "\u73AB\u7470\u4E0E\u521D\u97F3", intro: "\u9009\u62E9\u4F60\u7684\u521B\u4F5C\u7A7A\u95F4\uFF1B\u6BCF\u4E2A\u4E3B\u9898\u7684\u88C5\u9970\u504F\u597D\u5206\u522B\u4FDD\u7559\u3002", use: "\u4F7F\u7528", active: "\u5F53\u524D\u4F7F\u7528", switching: "\u6B63\u5728\u5207\u6362\u2026", native: "\u539F\u751F\u754C\u9762", options: "\u4E3B\u9898\u88C5\u9970", artwork: "\u6B22\u8FCE\u9875\u88C5\u9970", companion: "\u5BF9\u8BDD\u4EBA\u7269\u80CC\u666F", polaroid: "\u53F3\u4E0B\u89D2\u7167\u7247", opacity: "\u5BF9\u8BDD\u80CC\u666F\u6D53\u5EA6", reset: "\u6062\u590D\u6B64\u4E3B\u9898\u9ED8\u8BA4", loading: "\u6B63\u5728\u52A0\u8F7D\u4E3B\u9898\u2026", unavailable: "\u53EF\u9009\u4E3B\u9898\uFF0C\u5C1A\u672A\u5B89\u88C5", retry: "\u91CD\u8BD5", loadFailed: "\u76AE\u80A4\u7BA1\u7406\u5668\u6682\u65F6\u65E0\u6CD5\u52A0\u8F7D\uFF0C\u8BF7\u91CD\u8BD5\u3002", materialFailed: "\u4E3B\u9898\u7D20\u6750\u672A\u80FD\u52A0\u8F7D\uFF0C\u8BF7\u91CD\u8BD5\u3002" },
  en: { nav: "Ekko skins", title: "Rose & Miku", intro: "Choose your creative space. Each skin keeps its own appearance preferences.", use: "Use", active: "In use", switching: "Switching\u2026", native: "Native appearance", options: "Artwork preferences", artwork: "Welcome artwork", companion: "Chat character background", polaroid: "Corner photo", opacity: "Chat background opacity", reset: "Reset this skin", loading: "Loading skins\u2026", unavailable: "Optional skin, not installed", retry: "Retry", loadFailed: "Unable to load the skin manager. Please retry.", materialFailed: "Unable to load the skin artwork. Please retry." }
};
var language = () => /^zh/i.test(document.documentElement.lang || navigator.language) ? "zh" : "en";
function apply(ctx) {
  const storage = window.localStorage, imageCache = /* @__PURE__ */ new Map();
  let alive = true, catalog = null, loadError = null, view, preferenceRevision = 0, initialized = false;
  const navigation = createMobileNavigation({ layout: ctx.get("layout") });
  const listeners = /* @__PURE__ */ new Set();
  const prepare = (provider) => Promise.all([...new Set(Object.values(provider.assets))].filter((url) => !url.startsWith("data:")).map((url) => {
    if (!imageCache.has(url)) imageCache.set(url, new Promise((resolve, reject) => {
      const img = new Image(), timer = setTimeout(() => {
        img.onload = img.onerror = null;
        reject(Error(COPY[language()].materialFailed));
      }, 12e3);
      img.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(Error(COPY[language()].materialFailed));
      };
      img.src = url;
    }).catch((error) => {
      imageCache.delete(url);
      throw error;
    }));
    return imageCache.get(url);
  }));
  const controller = createController({ storage, prepare, mount(provider) {
    const fiber = ctx.plugin(provider.plugin);
    return { ready: () => fiber.await(), dispose: () => fiber.dispose() };
  } });
  const refresh = () => {
    const presentation = controller.getSnapshot(), provider = controller.provider(presentation.selected);
    navigation.update(provider ? { skin: provider.id, mode: provider.readSettings(storage).mobileNav, mark: provider.assets.mark || provider.assets.rose } : null);
    view = { catalog, error: loadError, presentation, preferenceRevision };
    for (const fn of listeners) fn();
  };
  const unsubscribe = controller.subscribe(refresh);
  refresh();
  ctx.provide("ekkoSkins", controller);
  const style = document.createElement("style");
  style.dataset.ekkoSkinManager = "";
  style.textContent = STYLES;
  document.head.append(style);
  async function load() {
    loadError = null;
    refresh();
    try {
      const response = await fetch("./ekko-skins/catalog", { credentials: "same-origin" });
      if (!response.ok) throw Error("catalog");
      const result = await response.json();
      if (!Array.isArray(result.skins)) throw Error("catalog");
      if (!alive) return;
      catalog = result;
      refresh();
      if (!initialized) {
        initialized = true;
        await controller.initialize(result.defaultSkin, result.skins.filter((s) => s.available).map((s) => s.id));
      } else {
        const current = controller.getSnapshot().desired;
        if (current !== "default" && !result.skins.some((s) => s.id === current && s.available)) await controller.choose(result.defaultSkin);
      }
    } catch {
      if (alive) {
        loadError = COPY[language()].loadFailed;
        refresh();
      }
    }
  }
  function setPreference(id, patch) {
    const provider = controller.provider(id);
    if (!provider) return;
    const value = { ...provider.normalizeSettings({ ...provider.readSettings(storage), ...patch }), enabled: true };
    let oldValue;
    try {
      oldValue = storage.getItem(provider.storageKey);
      storage.setItem(provider.storageKey, JSON.stringify(value));
    } catch {
    }
    window.dispatchEvent(new StorageEvent("storage", { key: provider.storageKey, newValue: JSON.stringify(value), oldValue: oldValue || null, storageArea: storage }));
    preferenceRevision++;
    refresh();
  }
  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  function Panel() {
    (0, import_react2.useEffect)(() => {
      if (innerWidth > 640) return;
      const frame = requestAnimationFrame(() => document.querySelector("[role='dialog'] [class*='_navList'] [class*='_active']")?.scrollIntoView({ block: "nearest", inline: "nearest" }));
      return () => cancelAnimationFrame(frame);
    }, []);
    const state = (0, import_react2.useSyncExternalStore)(subscribe, () => view), lang = language(), c = COPY[lang], p = state.presentation;
    const id = p.selected, provider = controller.provider(id), prefs = provider ? provider.readSettings(storage) : null;
    const choose = (target) => {
      void controller.choose(target);
    };
    return /* @__PURE__ */ import_react2.default.createElement("section", { className: "ekko-skins", "data-ekko-skin-manager": "", "aria-label": c.nav }, /* @__PURE__ */ import_react2.default.createElement("header", { className: "ekko-skins-intro" }, /* @__PURE__ */ import_react2.default.createElement("h2", null, c.title), /* @__PURE__ */ import_react2.default.createElement("p", null, c.intro)), state.error && /* @__PURE__ */ import_react2.default.createElement("div", { className: "ekko-skin-error", role: "alert" }, state.error, " ", /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "ekko-skin-button", onClick: load }, c.retry)), !state.catalog && !state.error && /* @__PURE__ */ import_react2.default.createElement("p", { role: "status" }, c.loading), /* @__PURE__ */ import_react2.default.createElement("div", { className: "ekko-skin-grid" }, ["rose", "miku"].map((skin) => {
      const entry = state.catalog?.skins.find((s) => s.id === skin), name = NAMES[skin][lang], active = id === skin, available = entry?.available && p.available.includes(skin);
      return /* @__PURE__ */ import_react2.default.createElement("article", { key: skin, className: "ekko-skin-card", "data-active": active }, entry?.preview && /* @__PURE__ */ import_react2.default.createElement("img", { className: "ekko-skin-cover", src: entry.preview[document.body.hasAttribute("data-ds-dark-theme") ? "dark" : "light"], alt: name, loading: "lazy" }), /* @__PURE__ */ import_react2.default.createElement("div", { className: "ekko-skin-description" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "ekko-skin-title" }, /* @__PURE__ */ import_react2.default.createElement("h3", null, name), active && /* @__PURE__ */ import_react2.default.createElement("span", { className: "ekko-skin-state" }, c.active)), /* @__PURE__ */ import_react2.default.createElement("span", { className: "ekko-skin-version" }, entry?.version ? "v" + entry.version : c.unavailable), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "ekko-skin-button", "data-active": active, disabled: !available || active || p.busy, onClick: () => choose(skin) }, p.busy && p.desired === skin ? c.switching : active ? c.active : c.use + " " + name)));
    })), /* @__PURE__ */ import_react2.default.createElement("div", { className: "ekko-skin-toolbar" }, /* @__PURE__ */ import_react2.default.createElement("span", null, p.busy ? c.switching : id === "default" ? c.native : NAMES[id]?.[lang]), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "ekko-skin-button", disabled: id === "default" || p.busy, onClick: () => choose("default") }, c.native)), p.error && /* @__PURE__ */ import_react2.default.createElement("div", { className: "ekko-skin-error", role: "alert" }, p.error, /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "ekko-skin-button", onClick: () => choose(p.desired) }, c.retry)), prefs && /* @__PURE__ */ import_react2.default.createElement("div", { className: "ekko-skin-options" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "ekko-skin-toolbar" }, /* @__PURE__ */ import_react2.default.createElement("h3", null, NAMES[id][lang], " \xB7 ", c.options), /* @__PURE__ */ import_react2.default.createElement("button", { type: "button", className: "ekko-skin-button", disabled: p.busy, onClick: () => setPreference(id, { artwork: true, companion: true, polaroid: true, opacity: 0.12, mobileNav: "corner" }) }, c.reset)), /* @__PURE__ */ import_react2.default.createElement("label", { className: "ekko-skin-option" }, /* @__PURE__ */ import_react2.default.createElement("span", null, lang === "zh" ? "\u624B\u673A\u5BFC\u822A\u65B9\u5F0F" : "Phone navigation", /* @__PURE__ */ import_react2.default.createElement("small", null, lang === "zh" ? "\u7AD6\u5C4F\u624B\u673A\u751F\u6548\uFF0C\u4E24\u4E2A\u4E3B\u9898\u5206\u522B\u4FDD\u5B58" : "Portrait phones; saved separately for each skin")), /* @__PURE__ */ import_react2.default.createElement("select", { "aria-label": lang === "zh" ? "\u624B\u673A\u5BFC\u822A\u65B9\u5F0F" : "Phone navigation", value: prefs.mobileNav || "corner", disabled: p.busy, onChange: (e) => setPreference(id, { mobileNav: e.target.value }) }, /* @__PURE__ */ import_react2.default.createElement("option", { value: "corner" }, lang === "zh" ? "\u5DE6\u4E0A\u89D2\u6309\u94AE + \u62BD\u5C49" : "Corner button + drawer"), /* @__PURE__ */ import_react2.default.createElement("option", { value: "rail" }, lang === "zh" ? "\u5DE6\u4FA7\u7EB5\u5411\u56FE\u6807\u680F" : "Vertical icon rail"))), ["artwork", "companion", "polaroid"].map((key) => /* @__PURE__ */ import_react2.default.createElement("label", { className: "ekko-skin-option", key }, /* @__PURE__ */ import_react2.default.createElement("span", null, c[key]), /* @__PURE__ */ import_react2.default.createElement("input", { type: "checkbox", checked: prefs[key], disabled: p.busy, onChange: (e) => setPreference(id, { [key]: e.target.checked }) }))), /* @__PURE__ */ import_react2.default.createElement("label", { className: "ekko-skin-option" }, /* @__PURE__ */ import_react2.default.createElement("span", null, c.opacity, /* @__PURE__ */ import_react2.default.createElement("small", null, Math.round(prefs.opacity * 100), "%")), /* @__PURE__ */ import_react2.default.createElement("input", { type: "range", min: ".04", max: ".24", step: ".01", value: prefs.opacity, disabled: p.busy, onChange: (e) => setPreference(id, { opacity: Number(e.target.value) }) }))), prefs && /* @__PURE__ */ import_react2.default.createElement(VideoSettings, { key: id, skin: id }));
  }
  function registerSection() {
    return ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "ekko-skins", order: 115, label: () => COPY[language()].nav }, Panel));
  }
  let section = registerSection();
  const locale = new MutationObserver(() => {
    section?.();
    section = registerSection();
    refresh();
  });
  locale.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  const appearance = new MutationObserver(refresh);
  appearance.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
  const onStorage = (e) => {
    if (e.key === SELECTION_KEY) void controller.choose(readSelection(storage, catalog?.defaultSkin), { persist: false });
    if (e.key?.startsWith("dsh:ekko-")) {
      preferenceRevision++;
      refresh();
    }
  };
  const onPreferences = () => {
    preferenceRevision++;
    refresh();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("dsh:ekko-skin-preferences", onPreferences);
  void load();
  const catalogTimer = setInterval(() => void load(), 15e3);
  const reloadCatalog = () => void load();
  window.addEventListener("focus", reloadCatalog);
  ctx.effect(() => async () => {
    alive = false;
    clearInterval(catalogTimer);
    window.removeEventListener("focus", reloadCatalog);
    section?.();
    locale.disconnect();
    appearance.disconnect();
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("dsh:ekko-skin-preferences", onPreferences);
    unsubscribe();
    navigation.dispose();
    await controller.dispose();
    style.remove();
    listeners.clear();
    imageCache.clear();
  }, "ekko-skins: controller, section and presentation cleanup");
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

// src/client-entry.mjs
var manager = { name: "ekko-skins-shared-client-v2", inject, apply };
function acquireClient(ctx) {
  return acquireShared(ctx, "client-v2", manager);
}
function apply2(ctx) {
  acquireClient(ctx);
}

return module.exports;}});
