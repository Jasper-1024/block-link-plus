const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const { WebSocketServer } = require("ws");

const repoRoot = path.resolve(__dirname, "..", "..");
const cli = path.join(repoRoot, "scripts", "obsidian-cdp.js");

function runCli(args, env = {}) {
  const childEnv = { ...process.env, ...env };
  delete childEnv.OB_CDP_PORT;
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
