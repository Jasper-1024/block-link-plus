const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const { WebSocketServer } = require("ws");

const repoRoot = path.resolve(__dirname, "..", "..");
const cli = path.join(repoRoot, "scripts", "obsidian-cdp.js");

test("embed jump regression restores every CDP lifecycle boundary", () => {
  const source = fs.readFileSync(path.join(
    repoRoot,
    "scripts/cdp-snippets/regression/inline-edit/embed-jump-affordance.js",
  ), "utf8");

  assert.match(source, /originalLayout/);
  assert.match(source, /originalActivePath/);
  assert.match(source, /originalSettings/);
  assert.match(source, /app\.workspace\.changeLayout\(originalLayout\)/);
  assert.match(source, /restoreFile\(sourcePath/);
  assert.match(source, /restoreFile\(hostPath/);
});

function runCli(args, env = {}) {
  const childEnv = { ...process.env, ...env };
  delete childEnv.OB_CDP_PORT;
  delete childEnv.BLP_RUNTIME_LEASE_FILE;
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    env: childEnv,
    encoding: "utf8",
  });
}

function listen(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function runCliAsync(args, env = {}) {
  return new Promise((resolve) => {
    const childEnv = { ...process.env, ...env };
    if (!("OB_CDP_PORT" in env)) delete childEnv.OB_CDP_PORT;
    if (!("BLP_RUNTIME_LEASE_FILE" in env)) delete childEnv.BLP_RUNTIME_LEASE_FILE;
    const child = spawn(process.execPath, [cli, ...args], { cwd: repoRoot, env: childEnv });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

test("requires an explicit CDP port", () => {
  const result = runCli(["list"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /OB_CDP_PORT|--port/);
  assert.doesNotMatch(result.stderr, /ECONNREFUSED/);
});

test("runner lease file overrides a stale inherited CDP port", async () => {
  const server = await listen((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end("[]");
  });
  const leaseDir = fs.mkdtempSync(path.join(repoRoot, ".tmp-cdp-lease-"));
  const leasePath = path.join(leaseDir, "BLP-10.json");
  try {
    const port = server.address().port;
    fs.writeFileSync(leasePath, JSON.stringify({ taskKey: "BLP-10", port }), "utf8");
    const result = await runCliAsync(["list"], {
      OB_CDP_PORT: "1",
      BLP_RUNTIME_LEASE_FILE: leasePath,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, new RegExp(`"port":${port}`));
  } finally {
    fs.rmSync(leaseDir, { recursive: true, force: true });
    await close(server);
  }
});
test("CLI port takes precedence over OB_CDP_PORT", async () => {
  const server = await listen((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end("[]");
  });
  try {
    const port = server.address().port;
    const result = await runCliAsync(["--port", String(port), "list"], { OB_CDP_PORT: "1" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /"type":"started"/);
  } finally {
    await close(server);
  }
});

test("refuses ambiguous targets instead of choosing the first", async () => {
  const targets = ["one", "two"].map((id) => ({
    id,
    type: "page",
    title: `blp-${id}`,
    url: "app://obsidian.md/index.html",
    webSocketDebuggerUrl: `ws://127.0.0.1:9/${id}`,
  }));
  const server = await listen((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(targets));
  });
  try {
    const result = await runCliAsync(["--port", String(server.address().port), "eval", "1"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /exactly one CDP target, found 2/);
    assert.match(result.stderr, /one/);
    assert.match(result.stderr, /two/);
  } finally {
    await close(server);
  }
});

test("emits slow and timeout events and exits 124", async () => {
  const server = await listen(() => {});
  try {
    const result = await runCliAsync([
      "--port", String(server.address().port),
      "--slow-ms", "20",
      "--timeout-ms", "70",
      "--discovery-timeout-ms", "500",
      "list",
    ]);
    assert.equal(result.status, 124, result.stderr);
    assert.match(result.stderr, /BLP_CDP_EVENT .*"type":"started"/);
    assert.match(result.stderr, /BLP_CDP_EVENT .*"type":"slow"/);
    assert.match(result.stderr, /BLP_CDP_EVENT .*"type":"timeout"/);
  } finally {
    await close(server);
  }
});

test("normalizes catalogued regressions and verifies cleanup state", async () => {
  let port;
  const server = http.createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify([{
      id: "only",
      type: "page",
      title: "blp-test",
      url: "app://obsidian.md/index.html",
      webSocketDebuggerUrl: `ws://127.0.0.1:${port}`,
    }]));
  });
  const sockets = new WebSocketServer({ server });
  let evaluation = 0;
  sockets.on("connection", (socket) => socket.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    let result = {};
    if (message.method === "Runtime.evaluate") {
      evaluation += 1;
      const value = evaluation === 2
        ? { ok: true, observed: "legacy result" }
        : { activeFile: "start.md", settings: "{}", files: ["start.md"] };
      result = { result: { value } };
    }
    socket.send(JSON.stringify({ id: message.id, result }));
  }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
  try {
    const result = await runCliAsync([
      "--port", String(port),
      "--title-contains", "blp-test",
      "eval-file", "scripts/cdp-snippets/regression/file-outliner/arrow-nav-e2e.js",
    ]);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.kind, "regression");
    assert.equal(output.scenario, "file-outliner-arrow-nav-e2e");
    assert.equal(output.status, "passed");
    assert.deepEqual(output.cleanup, { status: "passed", warnings: [] });
  } finally {
    sockets.close();
    await close(server);
  }
});

test("--raw preserves the complete CDP protocol envelope", async () => {
  let port;
  const server = http.createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify([{
      id: "only", type: "page", title: "blp-raw",
      url: "app://obsidian.md/index.html",
      webSocketDebuggerUrl: `ws://127.0.0.1:${port}`,
    }]));
  });
  const sockets = new WebSocketServer({ server });
  sockets.on("connection", (socket) => socket.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    socket.send(JSON.stringify({ id: message.id, result: { answer: 42 } }));
  }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
  try {
    const result = await runCliAsync([
      "--port", String(port), "--title-contains", "blp-raw", "--raw", "call", "Test.method",
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { id: 1, result: { answer: 42 } });
  } finally {
    sockets.close();
    await close(server);
  }
});

test("taints a regression when persisted settings or plugin state are not restored", async () => {
  let port;
  const server = http.createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify([{
      id: "only", type: "page", title: "blp-cleanup",
      url: "app://obsidian.md/index.html",
      webSocketDebuggerUrl: `ws://127.0.0.1:${port}`,
    }]));
  });
  const sockets = new WebSocketServer({ server });
  let evaluation = 0;
  sockets.on("connection", (socket) => socket.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    const snapshots = [
      { activeFile: "start.md", settings: "{}", persistedSettings: "{}", pluginEnabled: true, pluginLoaded: true, workspaceLayout: "{}", files: ["start.md"] },
      { ok: true },
      { activeFile: "start.md", settings: "{}", persistedSettings: "{\"dirty\":true}", pluginEnabled: false, pluginLoaded: false, workspaceLayout: "{}", files: ["start.md"] },
    ];
    let result = {};
    if (message.method === "Runtime.evaluate") {
      evaluation += 1;
      result = { result: { value: snapshots[evaluation - 1] } };
    }
    socket.send(JSON.stringify({ id: message.id, result }));
  }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
  try {
    const result = await runCliAsync([
      "--port", String(port), "--title-contains", "blp-cleanup",
      "eval-file", "scripts/cdp-snippets/regression/file-outliner/arrow-nav-e2e.js",
    ]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /runtime is tainted/);
    assert.match(result.stderr, /"tainted":true/);
  } finally {
    sockets.close();
    await close(server);
  }
});

test("taints an explicit cleanup exception even when snapshots match", async () => {
  let port;
  const server = http.createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify([{
      id: "only", type: "page", title: "blp-explicit-cleanup",
      url: "app://obsidian.md/index.html",
      webSocketDebuggerUrl: `ws://127.0.0.1:${port}`,
    }]));
  });
  const sockets = new WebSocketServer({ server });
  let evaluation = 0;
  const snapshot = {
    activeFile: "start.md", settings: "{}", persistedSettings: "{}",
    pluginEnabled: true, pluginLoaded: true, workspaceLayout: "{}", files: ["start.md"],
  };
  sockets.on("connection", (socket) => socket.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    let result = {};
    if (message.method === "Runtime.evaluate") {
      evaluation += 1;
      result = evaluation === 2
        ? { exceptionDetails: { text: "BLP_CLEANUP_FAILED: monkeypatch restore failed" } }
        : { result: { value: snapshot } };
    }
    socket.send(JSON.stringify({ id: message.id, result }));
  }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
  try {
    const result = await runCliAsync([
      "--port", String(port), "--title-contains", "blp-explicit-cleanup",
      "eval-file", "scripts/cdp-snippets/regression/journal-feed/subfolder-smoke.js",
    ]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /runtime is tainted/);
    assert.match(result.stderr, /"tainted":true/);
  } finally {
    sockets.close();
    await close(server);
  }
});
