// work/dsh-plugin-ekko-skin-manager/src/index.mjs
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
var require2 = createRequire(import.meta.url);
var PREFIX = "/ekko-skins";
var PACKAGES = { rose: "dsh-plugin-rose-theme", miku: "dsh-plugin-miku-theme" };
function createHandler({ resolvePackage = (name) => dirname(require2.resolve(name + "/package.json")), defaultSkin = "miku" } = {}) {
  async function catalog() {
    const skins = [];
    for (const [id, pkg] of Object.entries(PACKAGES)) {
      try {
        const root = resolvePackage(pkg), meta = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
        skins.push({ id, version: meta.version, available: meta.dsh?.ekkoSkinProvider === 1, preview: { light: "./ekko-skins/preview/" + id + "/light.webp", dark: "./ekko-skins/preview/" + id + "/dark.webp" } });
      } catch {
        skins.push({ id, available: false });
      }
    }
    const installed = skins.filter((s) => s.available).map((s) => s.id);
    const preferred = ["rose", "miku", "default"].includes(defaultSkin) ? defaultSkin : "miku";
    const selected = preferred === "default" || installed.includes(preferred) ? preferred : installed[0] || "default";
    return { version: "0.1.3", defaultSkin: selected, skins };
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
        const manifest = JSON.parse(await readFile(join(root, "assets/manifest.json"), "utf8"));
        if (!Object.values(manifest).includes(file)) {
          res.writeHead(404).end();
          return;
        }
        bytes = await readFile(join(root, "assets/runtime", file));
      } else {
        if (!["light.webp", "dark.webp"].includes(file)) {
          res.writeHead(404).end();
          return;
        }
        bytes = await readFile(join(root, "preview", file));
      }
    } catch {
      res.writeHead(404).end();
      return;
    }
    const etag = '"' + createHash("sha256").update(bytes).digest("hex") + '"';
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
  ctx.inject(["webServer", "profileContext"], (child) => {
    const resolver = createRequire(pathToFileURL(join(child.get("profileContext").dir, "package.json")));
    child.effect(() => child.get("webServer").register({ kind: "prefix", path: PREFIX, handler: createHandler({ defaultSkin: config.defaultSkin, resolvePackage: (name) => dirname(resolver.resolve(name + "/package.json")) }) }));
  });
}
export {
  PREFIX,
  apply,
  createHandler
};
