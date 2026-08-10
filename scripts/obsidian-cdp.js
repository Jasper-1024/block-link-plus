/* eslint-disable no-console */
"use strict";

// The single supported CDP client for this repository. It intentionally has no
// default port: callers must select the runtime instance they mean to inspect.

const fs = require("fs");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const DEFAULTS = Object.freeze({
  host: "127.0.0.1",
  targetType: "page",
  urlContains: "app://obsidian.md/index.html",
  discoveryTimeoutMs: 5_000,
  connectTimeoutMs: 5_000,
  slowMs: 30_000,
  timeoutMs: 60_000,
});
const EVENT_PREFIX = "BLP_CDP_EVENT ";
const CATALOG_PATH = path.join(__dirname, "cdp-snippets", "catalog.json");

class CdpError extends Error {
  constructor(message, { exitCode = 1, phase = "command", details = {} } = {}) {
    super(message);
    this.name = "CdpError";
    this.exitCode = exitCode;
    this.phase = phase;
    this.details = details;
  }
}

function emit(type, context = {}) {
  console.error(`${EVENT_PREFIX}${JSON.stringify({ type, at: new Date().toISOString(), ...context })}`);
}

function usage(message) {
  if (message) console.error(message);
  console.error(`Usage: node scripts/obsidian-cdp.js --port <port> [options] <command>

Commands:
  list
  catalog [list|show <id>]
  call <Method> [JsonParams]
  eval <js>
  eval-file <localFile>
  mouse-click <x> <y> [--shift] [--ctrl] [--alt] [--meta]
  key <combo>
  open-note <vaultPath>
  set-editor <localFile>
  write-note <vaultPath> <localFile>
  screenshot <out.png>

Connection options:
  --port <port>              Required, or set OB_CDP_PORT
  --host <host>              Default: 127.0.0.1
  --target-id <id>           Exact target id
  --target-type <type>       Default: page
  --title-contains <text>    Literal substring
  --url-contains <text>      Default: app://obsidian.md/index.html

Reliability options:
  --slow-ms <ms>             Default: 30000
  --timeout-ms <ms>          Overall command deadline, default: 60000
  --connect-timeout-ms <ms>  Default: 5000
  --discovery-timeout-ms <ms> Default: 5000

Call options:
  --params-file <jsonFile>   Read call params from JSON
  --raw                      Print the complete CDP response

Manual debugging commonly uses: --port 9222 (9222 is not a default).`);
  process.exitCode = message ? 2 : 0;
}

const VALUE_OPTIONS = new Set([
  "port", "host", "target-id", "target-type", "title-contains", "url-contains",
  "slow-ms", "timeout-ms", "connect-timeout-ms", "discovery-timeout-ms", "params-file",
]);
const FLAG_OPTIONS = new Set(["raw"]);

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const name = token.slice(2);
    if (FLAG_OPTIONS.has(name)) {
      options[name] = true;
      continue;
    }
    if (!VALUE_OPTIONS.has(name)) {
      // Command-specific modifier flags are positional and interpreted later.
      if (["shift", "ctrl", "alt", "meta"].includes(name)) {
        positional.push(token);
        continue;
      }
      throw new CdpError(`Unknown option: ${token}`, { exitCode: 2, phase: "usage" });
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new CdpError(`${token} requires a value`, { exitCode: 2, phase: "usage" });
    }
    options[name] = value;
    index += 1;
  }
  return { options, positional };
}

function integerOption(value, fallback, name, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const selected = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(selected) || selected < min || selected > max) {
    throw new CdpError(`Invalid --${name}: ${value}`, { exitCode: 2, phase: "usage" });
  }
  return selected;
}

function configFrom(options) {
  const portText = options.port ?? process.env.OB_CDP_PORT;
  if (portText === undefined || portText === "") {
    throw new CdpError("A CDP port is required: pass --port <port> or set OB_CDP_PORT", {
      exitCode: 2,
      phase: "usage",
    });
  }
  return {
    host: options.host ?? process.env.OB_CDP_HOST ?? DEFAULTS.host,
    port: integerOption(portText, undefined, "port", { max: 65535 }),
    targetId: options["target-id"] ?? process.env.OB_CDP_TARGET_ID,
    targetType: options["target-type"] ?? process.env.OB_CDP_TARGET_TYPE ?? DEFAULTS.targetType,
    titleContains: options["title-contains"] ?? process.env.OB_CDP_TITLE_CONTAINS,
    urlContains: options["url-contains"] ?? process.env.OB_CDP_URL_CONTAINS ?? DEFAULTS.urlContains,
    slowMs: integerOption(options["slow-ms"], DEFAULTS.slowMs, "slow-ms"),
    timeoutMs: integerOption(options["timeout-ms"], DEFAULTS.timeoutMs, "timeout-ms"),
    connectTimeoutMs: integerOption(
      options["connect-timeout-ms"], DEFAULTS.connectTimeoutMs, "connect-timeout-ms"
    ),
    discoveryTimeoutMs: integerOption(
      options["discovery-timeout-ms"], DEFAULTS.discoveryTimeoutMs, "discovery-timeout-ms"
    ),
  };
}

function withTimeout(promise, timeoutMs, errorFactory) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(errorFactory()), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

function httpJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new CdpError(`CDP discovery returned HTTP ${response.statusCode}`, { phase: "discovery" }));
          return;
        }
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (error) {
          reject(new CdpError(`Invalid CDP discovery JSON: ${error.message}`, { phase: "discovery" }));
        }
      });
    });
    request.setTimeout(timeoutMs, () => {
      request.destroy(new CdpError(`CDP discovery timed out after ${timeoutMs}ms`, { phase: "discovery" }));
    });
    request.on("error", reject);
  });
}

function targetSummary(target) {
  return {
    id: target?.id ?? null,
    type: target?.type ?? null,
    title: target?.title ?? "",
    url: target?.url ?? "",
  };
}

function selectUniqueTarget(targets, config) {
  const candidates = (Array.isArray(targets) ? targets : []).filter((target) => {
    if (!target || target.type !== config.targetType) return false;
    if (config.targetId && target.id !== config.targetId) return false;
    if (config.titleContains && !String(target.title || "").includes(config.titleContains)) return false;
    if (config.urlContains && !String(target.url || "").includes(config.urlContains)) return false;
    return true;
  });
  if (candidates.length !== 1) {
    throw new CdpError(
      `Expected exactly one CDP target, found ${candidates.length}. Candidates: ${JSON.stringify(candidates.map(targetSummary))}`,
      { phase: "target-selection", details: { candidates: candidates.map(targetSummary) } }
    );
  }
  const target = candidates[0];
  if (!target.webSocketDebuggerUrl) {
    throw new CdpError("Selected CDP target has no webSocketDebuggerUrl", { phase: "target-selection" });
  }
  return target;
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  rejectPending(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  async connect(timeoutMs) {
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.on("message", (data) => {
      let message;
      try { message = JSON.parse(String(data)); } catch { return; }
      if (!Number.isInteger(message?.id)) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new CdpError(message.error.message || "CDP error", { phase: "protocol" }));
      else pending.resolve(message.result);
    });
    socket.on("close", () => this.rejectPending(new CdpError("CDP WebSocket closed", { phase: "websocket" })));
    socket.on("error", (error) => this.rejectPending(new CdpError(error.message, { phase: "websocket" })));
    await withTimeout(
      new Promise((resolve, reject) => {
        socket.once("open", resolve);
        socket.once("error", reject);
      }),
      timeoutMs,
      () => new CdpError(`CDP WebSocket connect timed out after ${timeoutMs}ms`, { phase: "connect" })
    );
  }

  send(method, params = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new CdpError("CDP WebSocket is not connected", { phase: "websocket" });
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }), (error) => {
        if (!error) return;
        this.pending.delete(id);
        reject(new CdpError(error.message, { phase: "websocket" }));
      });
    });
  }

  close(reason = "CDP command ended") {
    this.rejectPending(new CdpError(reason, { phase: "cleanup" }));
    if (this.socket) {
      try { this.socket.terminate(); } catch { /* best effort */ }
    }
    this.socket = null;
  }
}

async function bringToFront(client) {
  try { await client.send("Page.bringToFront", {}); } catch { /* optional */ }
}

function evaluate(client, expression) {
  return client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
}

function evaluatedValue(response, raw) {
  if (response?.exceptionDetails) {
    const details = response.exceptionDetails;
    throw new CdpError(
      details?.exception?.description || details?.exception?.value || details?.text || "Runtime.evaluate exception",
      { phase: "evaluate" }
    );
  }
  if (raw) return response;
  if (response?.result && Object.prototype.hasOwnProperty.call(response.result, "value")) {
    return response.result.value;
  }
  return response;
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function loadCatalog() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.entries)) {
    throw new CdpError("Invalid CDP snippet catalog", { phase: "catalog" });
  }
  const ids = new Set();
  const catalogPaths = new Set();
  for (const entry of catalog.entries) {
    if (!entry || typeof entry.id !== "string" || !entry.id || ids.has(entry.id)) {
      throw new CdpError("CDP catalog entries require unique non-empty ids", { phase: "catalog" });
    }
    if (!["regression", "smoke", "probe", "archive"].includes(entry.kind)) {
      throw new CdpError(`Invalid CDP catalog kind for ${entry.id}`, { phase: "catalog" });
    }
    if (typeof entry.area !== "string" || !entry.area || typeof entry.path !== "string" || !entry.path) {
      throw new CdpError(`Catalog entry ${entry.id} requires area and path`, { phase: "catalog" });
    }
    const absolute = path.resolve(__dirname, "..", entry.path || "");
    if (!fs.existsSync(absolute)) throw new CdpError(`Catalog path does not exist: ${entry.path}`, { phase: "catalog" });
    if (catalogPaths.has(absolute)) throw new CdpError(`Duplicate CDP catalog path: ${entry.path}`, { phase: "catalog" });
    ids.add(entry.id);
    catalogPaths.add(absolute);
  }
  const activeRoots = ["regression", "smoke", "probes"];
  const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const child = path.join(directory, item.name);
    return item.isDirectory() ? walk(child) : item.name.endsWith(".js") ? [path.resolve(child)] : [];
  });
  const missing = activeRoots.flatMap((name) => walk(path.join(__dirname, "cdp-snippets", name)))
    .filter((absolute) => !catalogPaths.has(absolute));
  if (missing.length) throw new CdpError(`CDP catalog omits active snippets: ${missing.join(", ")}`, { phase: "catalog" });
  return catalog;
}

function validateRegressionResult(value, source) {
  const valid = value && value.kind === "regression" && typeof value.scenario === "string"
    && ["passed", "failed"].includes(value.status) && value.evidence && typeof value.evidence === "object"
    && value.cleanup && ["passed", "failed"].includes(value.cleanup.status)
    && Array.isArray(value.cleanup.warnings);
  if (!valid) throw new CdpError(`Regression snippet returned an invalid result contract: ${source}`, { phase: "result-contract" });
  if (value.cleanup.status !== "passed") {
    throw new CdpError(`Regression cleanup failed; runtime is tainted: ${source}`, {
      phase: "cleanup",
      details: { tainted: true, result: value },
    });
  }
  if (value.status !== "passed") throw new CdpError(`Regression failed: ${value.scenario}`, { phase: "regression", details: { result: value } });
}

async function snapshotRegressionState(client) {
  const response = await evaluate(client, `(()=>{
    const plugin=app?.plugins?.plugins?.["block-link-plus"];
    return {
      activeFile: app?.workspace?.getActiveFile?.()?.path ?? null,
      settings: JSON.stringify(plugin?.settings ?? null),
      files: (app?.vault?.getFiles?.() ?? []).map(f=>f.path).sort()
    };
  })()`);
  return evaluatedValue(response, false);
}

function regressionEntryForSource(source) {
  if (!source) return null;
  const absolute = path.resolve(source);
  return loadCatalog().entries.find((entry) =>
    entry.kind === "regression" && path.resolve(__dirname, "..", entry.path) === absolute
  ) || null;
}

function normalizeRegressionResult(entry, value, before, after) {
  const warnings = [];
  if (before.settings !== after.settings) warnings.push("plugin settings were not restored");
  if (before.activeFile !== after.activeFile) warnings.push("active file was not restored");
  const beforeFiles = JSON.stringify(before.files);
  const afterFiles = JSON.stringify(after.files);
  if (beforeFiles !== afterFiles) warnings.push("vault file set was not restored");
  if (value?.kind === "regression") {
    value.cleanup = { status: warnings.length ? "failed" : value.cleanup?.status || "passed", warnings: [...(value.cleanup?.warnings || []), ...warnings] };
    return value;
  }
  return {
    kind: "regression",
    scenario: entry.id,
    status: value?.ok === true ? "passed" : "failed",
    evidence: value && typeof value === "object" ? value : { value },
    cleanup: { status: warnings.length ? "failed" : "passed", warnings },
  };
}

async function executeCommand(client, command, args, options) {
  if (command === "call") {
    const method = args[0];
    if (!method) throw new CdpError("call requires a CDP method", { exitCode: 2, phase: "usage" });
    let params = {};
    if (options["params-file"]) params = JSON.parse(fs.readFileSync(path.resolve(options["params-file"]), "utf8"));
    else if (args.slice(1).join(" ").trim()) params = JSON.parse(args.slice(1).join(" "));
    printJson(await client.send(method, params));
    return;
  }
  if (command === "eval" || command === "eval-file") {
    const source = command === "eval-file" ? args.join(" ").trim() : null;
    const expression = source ? fs.readFileSync(path.resolve(source), "utf8") : args.join(" ");
    if (!expression) throw new CdpError(`${command} requires ${source ? "a file" : "JavaScript"}`, { exitCode: 2, phase: "usage" });
    await bringToFront(client);
    const regressionEntry = regressionEntryForSource(source);
    const before = regressionEntry ? await snapshotRegressionState(client) : null;
    let value;
    let evaluationError;
    try {
      value = evaluatedValue(await evaluate(client, expression), options.raw);
    } catch (error) {
      evaluationError = error;
    }
    if (regressionEntry) {
      const after = await snapshotRegressionState(client);
      value = normalizeRegressionResult(regressionEntry, value, before, after);
      validateRegressionResult(value, source);
    }
    if (evaluationError) throw evaluationError;
    printJson(value);
    return;
  }
  if (command === "mouse-click") {
    const [x, y] = args.slice(0, 2).map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new CdpError("mouse-click requires numeric x y", { exitCode: 2, phase: "usage" });
    let modifiers = 0;
    const flags = new Set(args.slice(2));
    if (flags.has("--alt")) modifiers |= 1;
    if (flags.has("--ctrl")) modifiers |= 2;
    if (flags.has("--meta")) modifiers |= 4;
    if (flags.has("--shift")) modifiers |= 8;
    await bringToFront(client);
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await client.send("Input.dispatchMouseEvent", { type, x, y, modifiers, ...(type === "mouseMoved" ? {} : { button: "left", clickCount: 1 }) });
    }
    console.log("ok");
    return;
  }
  if (command === "key") {
    const combo = args.join(" ").trim().toLowerCase();
    if (!combo) throw new CdpError("key requires a combo", { exitCode: 2, phase: "usage" });
    const parts = combo.split("+");
    const keyPart = parts.find((part) => !["shift", "ctrl", "control", "alt", "meta", "cmd"].includes(part));
    if (!keyPart) throw new CdpError("key combo is missing a key", { exitCode: 2, phase: "usage" });
    let modifiers = 0;
    if (parts.includes("alt")) modifiers |= 1;
    if (parts.some((part) => ["ctrl", "control"].includes(part))) modifiers |= 2;
    if (parts.some((part) => ["meta", "cmd"].includes(part))) modifiers |= 4;
    if (parts.includes("shift")) modifiers |= 8;
    const aliases = { esc: ["Escape", "Escape", 27], escape: ["Escape", "Escape", 27], enter: ["Enter", "Enter", 13], return: ["Enter", "Enter", 13] };
    const mapped = aliases[keyPart] || (keyPart.length === 1 ? [keyPart, /^[a-z]$/i.test(keyPart) ? `Key${keyPart.toUpperCase()}` : `Digit${keyPart}`, keyPart.toUpperCase().charCodeAt(0)] : null);
    if (!mapped) throw new CdpError(`Unsupported key: ${keyPart}`, { exitCode: 2, phase: "usage" });
    await bringToFront(client);
    for (const type of ["keyDown", "keyUp"]) await client.send("Input.dispatchKeyEvent", { type, modifiers, key: mapped[0], code: mapped[1], windowsVirtualKeyCode: mapped[2], nativeVirtualKeyCode: mapped[2] });
    console.log("ok");
    return;
  }
  if (["open-note", "set-editor", "write-note"].includes(command)) {
    const vaultPath = args[0];
    if (!vaultPath) throw new CdpError(`${command} requires a vault path or file`, { exitCode: 2, phase: "usage" });
    let expression;
    if (command === "open-note") expression = `(async()=>{const p=${JSON.stringify(vaultPath)};const f=app.vault.getAbstractFileByPath(p);if(!f)throw new Error('File not found: '+p);await app.workspace.getLeaf(false).openFile(f);return app.workspace.getActiveFile()?.path??null})()`;
    if (command === "set-editor") {
      const text = fs.readFileSync(path.resolve(args.join(" ")), "utf8");
      expression = `(()=>{const ed=app.workspace.activeLeaf?.view?.editor;if(!ed?.setValue)throw new Error('No active editor');ed.setValue(${JSON.stringify(text)});return {path:app.workspace.getActiveFile?.()?.path??null,length:ed.getValue().length}})()`;
    }
    if (command === "write-note") {
      const localFile = args.slice(1).join(" ");
      if (!localFile) throw new CdpError("write-note requires vaultPath localFile", { exitCode: 2, phase: "usage" });
      const text = fs.readFileSync(path.resolve(localFile), "utf8");
      expression = `(async()=>{const p=${JSON.stringify(vaultPath)},t=${JSON.stringify(text)};let f=app.vault.getAbstractFileByPath(p);f=f?(await app.vault.modify(f,t),f):await app.vault.create(p,t);await app.workspace.getLeaf(false).openFile(f);const ed=app.workspace.activeLeaf?.view?.editor;if(ed?.setValue)ed.setValue(t);return {path:app.workspace.getActiveFile()?.path??null,length:t.length}})()`;
    }
    printJson(evaluatedValue(await evaluate(client, expression), false));
    return;
  }
  if (command === "screenshot") {
    if (!args[0]) throw new CdpError("screenshot requires an output file", { exitCode: 2, phase: "usage" });
    await client.send("Page.enable");
    const result = await client.send("Page.captureScreenshot", { format: "png" });
    const output = path.resolve(args[0]);
    fs.writeFileSync(output, Buffer.from(result.data, "base64"));
    console.log(output);
    return;
  }
  throw new CdpError(`Unknown command: ${command}`, { exitCode: 2, phase: "usage" });
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) return usage();
  const { options, positional } = parseArgs(argv);
  const command = positional[0];
  if (!command || ["help", "-h", "--help"].includes(command)) return usage();
  if (command === "catalog") {
    const catalog = loadCatalog();
    const action = positional[1] || "list";
    if (action === "list") printJson(catalog.entries);
    else if (action === "show") {
      const entry = catalog.entries.find((candidate) => candidate.id === positional[2]);
      if (!entry) throw new CdpError(`Unknown catalog id: ${positional[2]}`, { exitCode: 2, phase: "catalog" });
      printJson(entry);
    } else throw new CdpError(`Unknown catalog action: ${action}`, { exitCode: 2, phase: "catalog" });
    return;
  }

  const config = configFrom(options);
  const started = Date.now();
  const context = { command, host: config.host, port: config.port };
  emit("started", context);
  const slowTimer = setTimeout(() => emit("slow", { ...context, elapsedMs: Date.now() - started }), config.slowMs);
  let client;
  try {
    await withTimeout((async () => {
      const targets = await httpJson(`http://${config.host}:${config.port}/json/list`, config.discoveryTimeoutMs);
      if (command === "list") {
        for (const target of targets) console.log([target.type, target.id, JSON.stringify(target.title || ""), JSON.stringify(target.url || "")].join("\t"));
        return;
      }
      const target = selectUniqueTarget(targets, config);
      client = new CdpClient(target.webSocketDebuggerUrl);
      await client.connect(config.connectTimeoutMs);
      await executeCommand(client, command, positional.slice(1), options);
    })(), config.timeoutMs, () => new CdpError(`CDP command timed out after ${config.timeoutMs}ms`, {
      exitCode: 124, phase: "overall", details: { timeoutMs: config.timeoutMs, tainted: true },
    }));
  } finally {
    clearTimeout(slowTimer);
    client?.close();
  }
}

main().catch((error) => {
  const value = error instanceof CdpError ? error : new CdpError(error?.stack || String(error));
  if (value.phase === "usage") usage(value.message);
  else {
    emit(value.exitCode === 124 ? "timeout" : "error", {
      phase: value.phase,
      message: value.message,
      exitCode: value.exitCode,
      ...value.details,
    });
    console.error(value.message);
    process.exitCode = value.exitCode;
  }
});
