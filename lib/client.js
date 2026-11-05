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

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = __toESM(require("react"), 1);

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
var STYLES = ".ekko-skins{display:grid;gap:18px;color:var(--dsw-alias-label-primary);font:14px/1.6 var(--ds-font-family,system-ui);}\n.ekko-skins h2,.ekko-skins h3,.ekko-skins p{margin:0;}.ekko-skins h2{font-size:20px;line-height:1.5;}.ekko-skins h3{font-size:15px;}\n.ekko-skins-intro{display:grid;gap:5px;}.ekko-skins-intro p,.ekko-skin-version,.ekko-skin-option small{color:var(--dsw-alias-label-secondary);font-size:12px;}\n.ekko-skin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}\n.ekko-skin-card{min-width:0;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 4px 12px #234c6510;}\n.ekko-skin-card[data-active='true']{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);}\n.ekko-skin-cover{display:block;width:100%;aspect-ratio:1400/787;object-fit:cover;border-bottom:1px solid var(--dsw-alias-border-l3);}\n.ekko-skin-description{display:grid;gap:10px;padding:13px;}.ekko-skin-title{display:flex;align-items:center;justify-content:space-between;gap:8px;}.ekko-skin-state{color:var(--dsw-alias-brand-text);font-size:11px;white-space:nowrap;}\n.ekko-skin-button{border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:7px 12px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;}\n.ekko-skin-button:disabled{opacity:.65;cursor:default;}.ekko-skin-button:focus-visible,.ekko-skins input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px;}\n.ekko-skin-button[data-active='true']{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary-invert);}\n.ekko-skin-option select{min-height:40px;max-width:52%;padding:6px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;}\n.ekko-skin-option select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px;}\n.ekko-skin-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;}.ekko-skin-options{padding:15px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);}\n.ekko-skin-option{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:40px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l3);}.ekko-skin-option:last-child{border:0;}.ekko-skin-option span{display:grid;gap:2px;}.ekko-skin-option input{accent-color:var(--dsw-alias-brand-primary);}.ekko-skin-option input[type='range']{width:130px;max-width:40%;}.ekko-skin-error{padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;color:var(--dsw-alias-state-danger,#c43d3d);font-size:13px;}\n@media(max-width:640px){.ekko-skin-grid{grid-template-columns:1fr;}.ekko-skins h2{font-size:18px;}.ekko-skin-toolbar{align-items:flex-start;}.ekko-skin-description{padding:12px;}}\n/* Keep the native settings shell usable on phones: tabs above the content. */\n@media(max-width:640px){\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']){flex-direction:column;width:calc(100vw - 24px);max-width:calc(100vw - 24px);height:min(800px,calc(100dvh - 48px));}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList'])>[class*='_nav']{width:100%;padding:15px 12px 0;gap:12px;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']) [class*='_navTitle']{padding-inline:5px;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']) [class*='_navList']{flex-direction:row;gap:4px;overflow:auto;padding-bottom:5px;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']) [class*='_navCell']{flex:none;width:max-content;height:36px;padding:7px 10px;font-size:13px;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList'])>[class*='_content']{min-height:0;width:100%;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']) [class*='_header']{position:absolute;top:10px;right:10px;height:auto;padding:0;}\n [role='dialog']:has(>[class*='_nav']>[class*='_navList']) [class*='_options']{padding:12px 12px 18px;min-width:0;}\n .ekko-skins{gap:13px;width:100%;min-width:0;}\n .ekko-skin-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}\n .ekko-skin-description{padding:9px;gap:7px;min-width:0;}.ekko-skin-title{gap:4px;flex-wrap:wrap;}.ekko-skin-title h3{font-size:13px;}.ekko-skin-state{font-size:10px;}\n .ekko-skin-button{font-size:12px;padding:6px;min-height:36px;max-width:100%;overflow-wrap:anywhere;}\n .ekko-skin-toolbar{flex-wrap:wrap;min-width:0;}.ekko-skin-options{min-width:0;padding:11px;}.ekko-skin-options .ekko-skin-toolbar h3{font-size:13px;}\n}\n\n/* Both phone modes use the active skin's existing artwork and jewellery tokens. */\n.ekko-mobile-navigation{display:none;}\n@media(max-width:700px) and (orientation:portrait){\n body[data-ekko-mobile-nav] .ekko-mobile-navigation{position:fixed;z-index:65;display:flex;box-sizing:border-box;align-items:center;color:var(--dsw-alias-brand-primary);}\n body[data-ekko-mobile-nav] .ekko-mobile-brand,\n body[data-ekko-mobile-nav] .ekko-mobile-action{position:relative;display:flex;flex:none;align-items:center;justify-content:center;box-sizing:border-box;width:44px;height:44px;min-height:44px;padding:8px;border:1px solid var(--ekko-rim-soft);border-radius:14px;background:var(--ekko-panel);box-shadow:inset 0 1px 0 var(--ekko-shine),0 3px 8px var(--ekko-shadow);color:inherit;cursor:pointer;}\n body[data-ekko-mobile-nav] .ekko-mobile-brand{padding:6px;border-color:var(--ekko-rim);}\n body[data-ekko-mobile-nav] .ekko-mobile-brand img{display:block;width:31px;height:31px;object-fit:contain;}\n body[data-ekko-mobile-nav] .ekko-mobile-action :is(svg,img){width:21px;height:21px;flex:none;}\n body[data-ekko-mobile-nav] .ekko-mobile-action[data-ekko-mobile-action='new']{margin-top:4px;border-color:var(--ekko-rim);box-shadow:inset 0 0 0 2px var(--ekko-shine),0 3px 8px var(--ekko-shadow);}\n body[data-ekko-mobile-nav] .ekko-mobile-action[aria-current]{background:var(--ekko-tint);border-color:var(--ekko-rim);}\n body[data-ekko-mobile-nav] .ekko-mobile-action:disabled{opacity:.45;cursor:default;}\n body[data-ekko-mobile-nav] .ekko-mobile-navigation button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;}\n body[data-ekko-mobile-nav] .ekko-mobile-navigation button:active{box-shadow:inset 1px 2px 5px var(--ekko-shadow);}\n body[data-ekko-mobile-nav='corner'] .ekko-mobile-navigation{top:calc(env(safe-area-inset-top,0px) + 7px);left:9px;}\n body[data-ekko-mobile-nav='corner'] :is(.ekko-mobile-actions,.ekko-mobile-footer){display:none;}\n body[data-ekko-mobile-nav='corner'] [data-ekko-mobile-frame]{--dsh-frame-leading-clearance:62px;}\n body[data-ekko-mobile-nav='corner'] :is(.miku-welcome-brand,.rose-welcome-brand){padding-left:48px;}\n body[data-ekko-mobile-nav='corner'] :is(.miku-mark,.rose-mark){display:none;}\n body[data-ekko-mobile-nav='rail'] .ekko-mobile-navigation{inset:0 auto 0 0;width:60px;flex-direction:column;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 13px) 7px max(10px,env(safe-area-inset-bottom,0px));background:var(--ekko-panel);border-right:1px solid var(--ekko-rim);box-shadow:inset -2px 0 0 var(--ekko-shine),inset -4px 0 0 var(--ekko-rim-soft);}\n body[data-ekko-mobile-nav='rail'] .ekko-mobile-actions{display:flex;flex:1;min-height:0;flex-direction:column;gap:10px;padding:0 0 4px;overflow:auto;scrollbar-width:none;}\n body[data-ekko-mobile-nav='rail'] .ekko-mobile-footer{display:flex;flex:none;padding-top:5px;border-top:1px solid var(--ekko-rim-soft);}\n body[data-ekko-mobile-nav='rail'] [data-ekko-mobile-frame] [data-ekko-mobile-center]{margin-inline-start:60px;}\n body[data-ekko-mobile-nav='rail'] [data-ekko-mobile-frame]{--dsh-frame-leading-clearance:0px;}\n /* The native drawer stays inert while closed. Only our launchers remain visible. */\n body[data-ekko-mobile-nav] [data-ekko-mobile-frame] [data-shell-leading]{display:none;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-frame] [data-ekko-mobile-drawer]{z-index:80;background:var(--ekko-panel);box-shadow:12px 0 30px var(--ekko-shadow);}\n body[data-ekko-mobile-nav][data-ekko-mobile-drawer-open='true'] .ekko-mobile-navigation{visibility:hidden;pointer-events:none;}\n}\n\n/* Keep phone controls aligned when the icon rail reduces the editor width. */\n@media(max-width:700px) and (orientation:portrait){\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] :is([data-miku-editor-root],[data-rose-editor-root]){width:calc(100% + 8px);margin-inline-start:-4px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card]{container:ekko-composer / inline-size;gap:6px;padding-top:14px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] :is([data-miku-editor-root],[data-rose-editor-root]) [data-composer-card]{min-height:140px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card]>[class*='_scroll']{flex:1;min-height:56px;margin-right:0;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] [contenteditable]{padding-inline:12px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] button[class*='_primary']{align-self:center;transform:none;}\n}\n@container ekko-composer (max-width:350px){\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card]>[class*='_row']{display:grid;grid-template-columns:auto minmax(0,1fr) 30px 34px;grid-template-areas:'extras extras extras extras' 'tools model activity send';gap:4px 6px;padding:4px 7px 6px;align-items:center;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card]>[class*='_row']:not(:has([data-slot='conversation.input.right']:not(:empty))){grid-template-areas:'tools model activity send';}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] [class*='_tools']{grid-area:tools;gap:5px;align-items:center;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] :is([class*='_trailing'],[class*='_standardControls'],[class*='_modes']){display:contents;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] :is([class*='_tools'],[class*='_standardControls'])[hidden]{display:none!important;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] [class*='_trailing']>[class*='_activity']{display:contents;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.right']{grid-area:extras;display:flex!important;align-items:center;justify-content:flex-start;gap:8px;min-width:0;max-width:100%;overflow-x:auto;scrollbar-width:thin;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.right']:empty{display:none!important;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.right']>*{flex:none;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.model']{grid-area:model;display:flex!important;min-width:0;justify-content:flex-end;align-items:center;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.model']>div{min-width:0;max-width:100%;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.model'] button{min-width:0;max-width:100%;height:34px;padding-inline:4px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.model'] :is([class*='_triggerLabel'],[class*='_triggerEffort']){display:none;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.model'] button>svg:first-child{display:block;flex:none;width:18px;height:18px;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-slot='conversation.input.activity']{grid-area:activity;display:flex!important;align-items:center;justify-content:center;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] button[class*='_primary']{grid-area:send;justify-self:end;}\n body[data-ekko-mobile-nav] [data-ekko-mobile-center] [data-composer-card] button:is([aria-label^='\u8BBF\u95EE\u6A21\u5F0F'],[aria-label^='Access mode']){padding-inline:6px;}\n}\n";

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
var NAMES = { rose: { zh: "\u6709\u83DC\u73AB\u7470", en: "Arina Rose" }, miku: { zh: "\u521D\u97F3\u672A\u6765", en: "Hatsune Miku" } };
var COPY = {
  zh: { nav: "Ekko \u76AE\u80A4", title: "\u73AB\u7470\u4E0E\u521D\u97F3", intro: "\u9009\u62E9\u4F60\u7684\u521B\u4F5C\u7A7A\u95F4\uFF1B\u6BCF\u4E2A\u4E3B\u9898\u7684\u88C5\u9970\u504F\u597D\u5206\u522B\u4FDD\u7559\u3002", use: "\u4F7F\u7528", active: "\u5F53\u524D\u4F7F\u7528", switching: "\u6B63\u5728\u5207\u6362\u2026", native: "\u539F\u751F\u754C\u9762", options: "\u4E3B\u9898\u88C5\u9970", artwork: "\u6B22\u8FCE\u9875\u88C5\u9970", companion: "\u5BF9\u8BDD\u4EBA\u7269\u80CC\u666F", polaroid: "\u53F3\u4E0B\u89D2\u7167\u7247", opacity: "\u5BF9\u8BDD\u80CC\u666F\u6D53\u5EA6", reset: "\u6062\u590D\u6B64\u4E3B\u9898\u9ED8\u8BA4", loading: "\u6B63\u5728\u52A0\u8F7D\u4E3B\u9898\u2026", unavailable: "\u53EF\u9009\u4E3B\u9898\uFF0C\u5C1A\u672A\u5B89\u88C5", retry: "\u91CD\u8BD5", loadFailed: "\u76AE\u80A4\u7BA1\u7406\u5668\u6682\u65F6\u65E0\u6CD5\u52A0\u8F7D\uFF0C\u8BF7\u91CD\u8BD5\u3002", materialFailed: "\u4E3B\u9898\u7D20\u6750\u672A\u80FD\u52A0\u8F7D\uFF0C\u8BF7\u91CD\u8BD5\u3002" },
  en: { nav: "Ekko skins", title: "Rose & Miku", intro: "Choose your creative space. Each skin keeps its own appearance preferences.", use: "Use", active: "In use", switching: "Switching\u2026", native: "Native appearance", options: "Artwork preferences", artwork: "Welcome artwork", companion: "Chat character background", polaroid: "Corner photo", opacity: "Chat background opacity", reset: "Reset this skin", loading: "Loading skins\u2026", unavailable: "Optional skin, not installed", retry: "Retry", loadFailed: "Unable to load the skin manager. Please retry.", materialFailed: "Unable to load the skin artwork. Please retry." }
};
var language = () => /^zh/i.test(document.documentElement.lang || navigator.language) ? "zh" : "en";
function apply(ctx) {
  const storage = window.localStorage, imageCache = /* @__PURE__ */ new Map();
  let alive = true, catalog = null, loadError = null, view, preferenceRevision = 0;
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
      await controller.initialize(result.defaultSkin, result.skins.filter((s) => s.available).map((s) => s.id));
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
    (0, import_react.useEffect)(() => {
      if (innerWidth > 640) return;
      const frame = requestAnimationFrame(() => document.querySelector("[role='dialog'] [class*='_navList'] [class*='_active']")?.scrollIntoView({ block: "nearest", inline: "nearest" }));
      return () => cancelAnimationFrame(frame);
    }, []);
    const state = (0, import_react.useSyncExternalStore)(subscribe, () => view), lang = language(), c = COPY[lang], p = state.presentation;
    const id = p.selected, provider = controller.provider(id), prefs = provider ? provider.readSettings(storage) : null;
    const choose = (target) => {
      void controller.choose(target);
    };
    return /* @__PURE__ */ import_react.default.createElement("section", { className: "ekko-skins", "data-ekko-skin-manager": "", "aria-label": c.nav }, /* @__PURE__ */ import_react.default.createElement("header", { className: "ekko-skins-intro" }, /* @__PURE__ */ import_react.default.createElement("h2", null, c.title), /* @__PURE__ */ import_react.default.createElement("p", null, c.intro)), state.error && /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-skin-error", role: "alert" }, state.error, " ", /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", onClick: load }, c.retry)), !state.catalog && !state.error && /* @__PURE__ */ import_react.default.createElement("p", { role: "status" }, c.loading), /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-skin-grid" }, ["rose", "miku"].map((skin) => {
      const entry = state.catalog?.skins.find((s) => s.id === skin), name = NAMES[skin][lang], active = id === skin, available = entry?.available && p.available.includes(skin);
      return /* @__PURE__ */ import_react.default.createElement("article", { key: skin, className: "ekko-skin-card", "data-active": active }, entry?.preview && /* @__PURE__ */ import_react.default.createElement("img", { className: "ekko-skin-cover", src: entry.preview[document.body.hasAttribute("data-ds-dark-theme") ? "dark" : "light"], alt: name, loading: "lazy" }), /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-skin-description" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-skin-title" }, /* @__PURE__ */ import_react.default.createElement("h3", null, name), active && /* @__PURE__ */ import_react.default.createElement("span", { className: "ekko-skin-state" }, c.active)), /* @__PURE__ */ import_react.default.createElement("span", { className: "ekko-skin-version" }, entry?.version ? "v" + entry.version : c.unavailable), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", "data-active": active, disabled: !available || active || p.busy, onClick: () => choose(skin) }, p.busy && p.desired === skin ? c.switching : active ? c.active : c.use + " " + name)));
    })), /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-skin-toolbar" }, /* @__PURE__ */ import_react.default.createElement("span", null, p.busy ? c.switching : id === "default" ? c.native : NAMES[id]?.[lang]), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", disabled: id === "default" || p.busy, onClick: () => choose("default") }, c.native)), p.error && /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-skin-error", role: "alert" }, p.error, /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", onClick: () => choose(p.desired) }, c.retry)), prefs && /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-skin-options" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "ekko-skin-toolbar" }, /* @__PURE__ */ import_react.default.createElement("h3", null, NAMES[id][lang], " \xB7 ", c.options), /* @__PURE__ */ import_react.default.createElement("button", { type: "button", className: "ekko-skin-button", disabled: p.busy, onClick: () => setPreference(id, { artwork: true, companion: true, polaroid: true, opacity: 0.12, mobileNav: "corner" }) }, c.reset)), /* @__PURE__ */ import_react.default.createElement("label", { className: "ekko-skin-option" }, /* @__PURE__ */ import_react.default.createElement("span", null, lang === "zh" ? "\u624B\u673A\u5BFC\u822A\u65B9\u5F0F" : "Phone navigation", /* @__PURE__ */ import_react.default.createElement("small", null, lang === "zh" ? "\u7AD6\u5C4F\u624B\u673A\u751F\u6548\uFF0C\u4E24\u4E2A\u4E3B\u9898\u5206\u522B\u4FDD\u5B58" : "Portrait phones; saved separately for each skin")), /* @__PURE__ */ import_react.default.createElement("select", { "aria-label": lang === "zh" ? "\u624B\u673A\u5BFC\u822A\u65B9\u5F0F" : "Phone navigation", value: prefs.mobileNav || "corner", disabled: p.busy, onChange: (e) => setPreference(id, { mobileNav: e.target.value }) }, /* @__PURE__ */ import_react.default.createElement("option", { value: "corner" }, lang === "zh" ? "\u5DE6\u4E0A\u89D2\u6309\u94AE + \u62BD\u5C49" : "Corner button + drawer"), /* @__PURE__ */ import_react.default.createElement("option", { value: "rail" }, lang === "zh" ? "\u5DE6\u4FA7\u7EB5\u5411\u56FE\u6807\u680F" : "Vertical icon rail"))), ["artwork", "companion", "polaroid"].map((key) => /* @__PURE__ */ import_react.default.createElement("label", { className: "ekko-skin-option", key }, /* @__PURE__ */ import_react.default.createElement("span", null, c[key]), /* @__PURE__ */ import_react.default.createElement("input", { type: "checkbox", checked: prefs[key], disabled: p.busy, onChange: (e) => setPreference(id, { [key]: e.target.checked }) }))), /* @__PURE__ */ import_react.default.createElement("label", { className: "ekko-skin-option" }, /* @__PURE__ */ import_react.default.createElement("span", null, c.opacity, /* @__PURE__ */ import_react.default.createElement("small", null, Math.round(prefs.opacity * 100), "%")), /* @__PURE__ */ import_react.default.createElement("input", { type: "range", min: ".04", max: ".24", step: ".01", value: prefs.opacity, disabled: p.busy, onChange: (e) => setPreference(id, { opacity: Number(e.target.value) }) }))));
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
  ctx.effect(() => async () => {
    alive = false;
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

return module.exports;}});
