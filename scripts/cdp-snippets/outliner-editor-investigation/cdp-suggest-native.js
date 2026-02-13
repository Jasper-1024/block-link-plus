// Scratch CDP driver: open a native markdown note, type `[[` via CDP Input.insertText, then screenshot.
//
// Run (from repo root):
//   node .tmp/outliner-editor-investigation/cdp-suggest-native.js

const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const HOST = process.env.OB_CDP_HOST || "127.0.0.1";
const PORT = Number(process.env.OB_CDP_PORT || 9222);
const URL_CONTAINS = process.env.OB_CDP_URL_CONTAINS || "app://obsidian.md/index.html";

function httpJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function pickTarget() {
  const targets = await httpJson(`http://${HOST}:${PORT}/json/list`);
  const pages = (targets || []).filter((t) => t && t.type === "page");
  const byUrl = pages.filter((t) => String(t.url || "").includes(URL_CONTAINS));
  return byUrl[0] || pages[0] || targets[0];
}

class Cdp {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    const ws = new WebSocket(this.wsUrl);
    this.ws = ws;

    ws.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg && typeof msg.id === "number") {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message || "CDP error"));
        else p.resolve(msg.result);
      }
    });

    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
  }

  close() {
    try {
      this.ws?.close();
    } catch {}
  }

  send(method, params) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params: params || {} });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const target = await pickTarget();
  if (!target?.webSocketDebuggerUrl) throw new Error("No CDP target found");

  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.connect();
  try {
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");

    const notePath = "_blp_tmp/_outliner-editor-baseline-native.md";

    // Open note + focus editor + clear.
    await cdp.send("Runtime.evaluate", {
      expression: `(async()=>{const p=${JSON.stringify(notePath)}; const f=app.vault.getAbstractFileByPath(p); if(!f) throw new Error('missing file '+p); await app.workspace.getLeaf(false).openFile(f); await new Promise(r=>setTimeout(r,300)); const v=app.workspace.activeLeaf?.view; if(v?.getViewType?.()!=='markdown') throw new Error('not markdown'); v.editor.setValue(''); v.editor.cm.focus(); return {viewType:v.getViewType(), file: app.workspace.getActiveFile()?.path};})()`,
      awaitPromise: true,
      returnByValue: true,
    });

    // Type `[[` via CDP (triggers real input events).
    await cdp.send("Input.insertText", { text: "[[" });
    await sleep(600);

    // Screenshot
    const outDir = path.join(__dirname, "shots");
    fs.mkdirSync(outDir, { recursive: true });
    const pngPath = path.join(outDir, "native-[[.png");

    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(pngPath, Buffer.from(shot.data, "base64"));

    // Return suggest-ish DOM sample (best-effort).
    const dom = await cdp.send("Runtime.evaluate", {
      expression: `(async()=>{const pick=(sel)=>Array.from(document.querySelectorAll(sel)).slice(0,5).map(n=>({cls:n.className||'', text:(n.textContent||'').slice(0,80)})); return {suggestion: pick('.suggestion-container'), suggest: pick('[class*=\"suggest\"]')};})()`,
      awaitPromise: true,
      returnByValue: true,
    });

    console.log(JSON.stringify({ pngPath, dom: dom?.result?.value || null }, null, 2));
  } finally {
    cdp.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
