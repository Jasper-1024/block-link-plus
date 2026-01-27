/* eslint-disable no-console */
// Minimal CDP (Chrome DevTools Protocol) helper for driving a running Obsidian instance
// that was started with `--remote-debugging-port=9222`.
//
// Usage examples:
//   node scripts/obsidian-cdp.js list
//   node scripts/obsidian-cdp.js eval "location.href"
//   node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/dump-state.js"
//   node scripts/obsidian-cdp.js eval "(async()=>app.workspace.getActiveFile()?.path)()"
//   node scripts/obsidian-cdp.js open-note "Review/_blp-ai-workbench.md"
//   node scripts/obsidian-cdp.js set-editor "doc/_blp-ai-workbench-baseline.md"
//   node scripts/obsidian-cdp.js write-note "Review/_blp-ai-workbench.md" "doc/_blp-ai-workbench-baseline.md"
//   node scripts/obsidian-cdp.js key "ctrl+c"
//   node scripts/obsidian-cdp.js screenshot out.png
//
// Keep this script dependency-light: it uses the `ws` package that already exists in
// this repo's dependency tree (via jsdom).

const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 9222;

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function httpJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf8");
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function listTargets({ host, port }) {
  const url = `http://${host}:${port}/json/list`;
  return httpJson(url);
}

function pickTarget(targets, { id, titleContains, urlContains }) {
  if (!Array.isArray(targets) || targets.length === 0) return null;

  if (id) {
    const found = targets.find((t) => t && t.id === id);
    if (found) return found;
  }

  const pageTargets = targets.filter((t) => t && t.type === "page");

  const byUrl = urlContains
    ? pageTargets.filter((t) => String(t.url || "").includes(urlContains))
    : pageTargets;
  const byTitle = titleContains
    ? byUrl.filter((t) => String(t.title || "").includes(titleContains))
    : byUrl;

  // Prefer the main Obsidian app page.
  const obsidian = byTitle.find((t) => String(t.url || "") === "app://obsidian.md/index.html");
  return obsidian || byTitle[0] || pageTargets[0] || targets[0];
}

class CdpClient {
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
        if (msg.error) {
          const err = new Error(msg.error.message || "CDP error");
          err.data = msg.error.data;
          p.reject(err);
        } else {
          p.resolve(msg.result);
        }
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
    } catch {
      // ignore
    }
    this.ws = null;
  }

  send(method, params = {}) {
    if (!this.ws) throw new Error("CDP WebSocket not connected");
    const id = this.nextId++;
    const payload = { id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload), (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }
}

function printTargets(targets) {
  for (const t of targets) {
    const line = [
      t.type,
      t.id,
      JSON.stringify(t.title || ""),
      JSON.stringify(t.url || ""),
    ].join("\t");
    console.log(line);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd || ["-h", "--help"].includes(cmd)) {
    console.log(`obsidian-cdp.js

Commands:
  list
  call <Method> [JsonParams]
  eval <js>
  eval-file <localFile>
  mouse-click <x> <y> [--shift] [--ctrl] [--alt] [--meta]
  key <combo>  (e.g. "ctrl+c", "shift+enter", "esc")
  open-note <vaultPath>
  set-editor <localFile>
  write-note <vaultPath> <localFile>
  screenshot <out.png>

Env:
  OB_CDP_HOST (default ${DEFAULT_HOST})
  OB_CDP_PORT (default ${DEFAULT_PORT})
`);
    process.exit(0);
  }

  const host = process.env.OB_CDP_HOST || DEFAULT_HOST;
  const port = Number(process.env.OB_CDP_PORT || DEFAULT_PORT);

  const targets = await listTargets({ host, port });
  if (cmd === "list") {
    printTargets(targets);
    return;
  }

  const target = pickTarget(targets, {
    urlContains: "app://obsidian.md/index.html",
  });
  if (!target?.webSocketDebuggerUrl) {
    die("No CDP target found (is Obsidian running with --remote-debugging-port=9222?)");
  }

  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  try {
    if (cmd === "call") {
      const method = args[1];
      if (!method) die("call requires a CDP method name, e.g. Runtime.evaluate");
      const paramsText = args.slice(2).join(" ").trim();
      let params = {};
      if (paramsText) {
        try {
          params = JSON.parse(paramsText);
        } catch (e) {
          die(`Invalid JSON params: ${e?.message || e}`);
        }
      }
      const res = await client.send(method, params);
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    if (cmd === "eval") {
      const expr = args.slice(1).join(" ");
      if (!expr) die("eval requires a JS expression");

      const res = await client.send("Runtime.evaluate", {
        expression: expr,
        awaitPromise: true,
        returnByValue: true,
      });
      // When returnByValue is true, primitives/JSON-ish values appear in `value`.
      if (res?.result && Object.prototype.hasOwnProperty.call(res.result, "value")) {
        console.log(JSON.stringify(res.result.value, null, 2));
      } else {
        console.log(JSON.stringify(res, null, 2));
      }
      return;
    }

    if (cmd === "eval-file") {
      const localFile = args.slice(1).join(" ").trim();
      if (!localFile) die("eval-file requires a local file path");

      const code = fs.readFileSync(path.resolve(localFile), "utf8");
      const res = await client.send("Runtime.evaluate", {
        expression: code,
        awaitPromise: true,
        returnByValue: true,
      });
      if (res?.result && Object.prototype.hasOwnProperty.call(res.result, "value")) {
        console.log(JSON.stringify(res.result.value, null, 2));
      } else {
        console.log(JSON.stringify(res, null, 2));
      }
      return;
    }

    if (cmd === "mouse-click") {
      const x = Number(args[1]);
      const y = Number(args[2]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        die("mouse-click requires numeric <x> <y>");
      }

      const flags = new Set(args.slice(3));
      // Chrome DevTools Protocol modifier bitmask:
      // Alt=1, Ctrl=2, Meta=4, Shift=8
      let modifiers = 0;
      if (flags.has("--alt")) modifiers |= 1;
      if (flags.has("--ctrl")) modifiers |= 2;
      if (flags.has("--meta")) modifiers |= 4;
      if (flags.has("--shift")) modifiers |= 8;

      await client.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x,
        y,
        modifiers,
      });
      await client.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button: "left",
        clickCount: 1,
        modifiers,
      });
      await client.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x,
        y,
        button: "left",
        clickCount: 1,
        modifiers,
      });

      console.log("ok");
      return;
    }

    if (cmd === "key") {
      const combo = args.slice(1).join(" ").trim();
      if (!combo) die('key requires a combo string, e.g. "ctrl+c"');

      const parts = combo
        .split("+")
        .map((p) => String(p || "").trim().toLowerCase())
        .filter(Boolean);

      let modifiers = 0;
      let keyPart = null;

      for (const p of parts) {
        if (p === "shift") modifiers |= 8;
        else if (p === "ctrl" || p === "control") modifiers |= 2;
        else if (p === "alt" || p === "option") modifiers |= 1;
        else if (p === "meta" || p === "cmd" || p === "command") modifiers |= 4;
        else keyPart = p;
      }

      if (!keyPart) die(`key combo missing a key: ${combo}`);

      let key = keyPart;
      let code = "";
      let vk = 0;
      let commands = undefined;

      if (keyPart === "esc" || keyPart === "escape") {
        key = "Escape";
        code = "Escape";
        vk = 27;
      } else if (keyPart === "enter" || keyPart === "return") {
        key = "Enter";
        code = "Enter";
        vk = 13;
      } else if (keyPart.length === 1) {
        const ch = keyPart;
        const upper = ch.toUpperCase();
        key = ch;

        if (upper >= "A" && upper <= "Z") {
          code = `Key${upper}`;
          vk = upper.charCodeAt(0);
          if ((modifiers & 2) === 2) {
            if (upper === "C") commands = ["copy"];
            if (upper === "X") commands = ["cut"];
            if (upper === "V") commands = ["paste"];
          }
        } else if (ch >= "0" && ch <= "9") {
          code = `Digit${ch}`;
          vk = ch.charCodeAt(0);
        } else {
          die(`Unsupported key character: ${keyPart}`);
        }
      } else {
        die(`Unsupported key combo: ${combo}`);
      }

      await client.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        modifiers,
        windowsVirtualKeyCode: vk,
        nativeVirtualKeyCode: vk,
        key,
        code,
        commands,
      });
      await client.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        modifiers,
        windowsVirtualKeyCode: vk,
        nativeVirtualKeyCode: vk,
        key,
        code,
      });

      console.log("ok");
      return;
    }

    if (cmd === "open-note") {
      const vaultPath = args.slice(1).join(" ").trim();
      if (!vaultPath) die("open-note requires a vault path, e.g. Review/foo.md");

      const res = await client.send("Runtime.evaluate", {
        expression: `(async()=>{
          const p=${JSON.stringify(vaultPath)};
          const f=app.vault.getAbstractFileByPath(p);
          if(!f) throw new Error('File not found: '+p);
          await app.workspace.getLeaf(false).openFile(f);
          return app.workspace.getActiveFile()?.path ?? null;
        })()`,
        awaitPromise: true,
        returnByValue: true,
      });

      console.log(JSON.stringify(res?.result?.value ?? null, null, 2));
      return;
    }

    if (cmd === "set-editor") {
      const localFile = args.slice(1).join(" ").trim();
      if (!localFile) die("set-editor requires a local file path");

      const text = fs.readFileSync(path.resolve(localFile), "utf8");
      const res = await client.send("Runtime.evaluate", {
        expression: `(async()=>{
          const v=app.workspace.activeLeaf?.view;
          const ed=v?.editor;
          if(!ed||typeof ed.setValue!=='function') throw new Error('No active editor');
          ed.setValue(${JSON.stringify(text)});
          return {path: app.workspace.getActiveFile?.()?.path ?? null, length: ed.getValue().length};
        })()`,
        awaitPromise: true,
        returnByValue: true,
      });

      console.log(JSON.stringify(res?.result?.value ?? null, null, 2));
      return;
    }

    if (cmd === "write-note") {
      const vaultPath = args[1];
      const localFile = args.slice(2).join(" ").trim();
      if (!vaultPath || !localFile) die("write-note requires: <vaultPath> <localFile>");

      const text = fs.readFileSync(path.resolve(localFile), "utf8");
      const res = await client.send("Runtime.evaluate", {
        expression: `(async()=>{
          const p=${JSON.stringify(vaultPath)};
          const t=${JSON.stringify(text)};
          let f=app.vault.getAbstractFileByPath(p);
          if(!f){
            f=await app.vault.create(p,t);
          } else {
            await app.vault.modify(f,t);
          }
          // If the note is already open with unsaved edits, vault.modify() may not
          // immediately update the editor buffer. After opening, force the active
          // editor to match the requested content for deterministic debugging.
          await app.workspace.getLeaf(false).openFile(f);
          const v=app.workspace.activeLeaf?.view;
          if(v?.editor?.setValue) v.editor.setValue(t);
          return {path: app.workspace.getActiveFile()?.path ?? null, length: t.length};
        })()`,
        awaitPromise: true,
        returnByValue: true,
      });

      console.log(JSON.stringify(res?.result?.value ?? null, null, 2));
      return;
    }

    if (cmd === "screenshot") {
      const outFile = args[1];
      if (!outFile) die("screenshot requires an output file path, e.g. out.png");

      await client.send("Page.enable");
      const { data } = await client.send("Page.captureScreenshot", { format: "png" });
      const abs = path.resolve(outFile);
      fs.writeFileSync(abs, Buffer.from(data, "base64"));
      console.log(abs);
      return;
    }

    die(`Unknown command: ${cmd}`);
  } finally {
    client.close();
  }
}

run().catch((e) => die(e?.stack || String(e)));
