/* eslint-disable no-console */
// Capture screenshot pairs for visual convergence work (Obsidian 9222 vs Logseq 9221).
//
// Usage:
//   node scripts/cdp-screenshot-pair.js
//   node scripts/cdp-screenshot-pair.js --outdir .tmp/cdp-shots
//
// Notes:
// - This script captures the *current* app viewport on each port. For meaningful diffs,
//   open comparable content in Obsidian and Logseq before running.
// - Diff is cropped to the overlapping width/height if the two windows differ in size.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const pixelmatch = require("pixelmatch");
const { PNG } = require("pngjs");

const DEFAULT_OUTDIR = path.join(".tmp", "cdp-shots");

function parseArgs(argv) {
  const out = {
    outDir: DEFAULT_OUTDIR,
    obsidianPort: "9222",
    obsidianUrlContains: "app://obsidian.md/index.html",
    logseqPort: "9221",
    logseqUrlContains: "electron.html",
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--outdir") out.outDir = argv[++i] || out.outDir;
    else if (a === "--obsidian-port") out.obsidianPort = argv[++i] || out.obsidianPort;
    else if (a === "--obsidian-url-contains") out.obsidianUrlContains = argv[++i] || out.obsidianUrlContains;
    else if (a === "--logseq-port") out.logseqPort = argv[++i] || out.logseqPort;
    else if (a === "--logseq-url-contains") out.logseqUrlContains = argv[++i] || out.logseqUrlContains;
  }

  return out;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function captureScreenshot({ port, urlContains, outFile }) {
  const script = path.join(__dirname, "obsidian-cdp.js");
  execFileSync(
    process.execPath,
    [script, "screenshot", outFile],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        OB_CDP_PORT: String(port),
        OB_CDP_URL_CONTAINS: String(urlContains || ""),
      },
    }
  );
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function cropPng(png, width, height) {
  if (png.width === width && png.height === height) return png;

  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (png.width * y + x) << 2;
      const dstIdx = (width * y + x) << 2;
      out.data[dstIdx] = png.data[srcIdx];
      out.data[dstIdx + 1] = png.data[srcIdx + 1];
      out.data[dstIdx + 2] = png.data[srcIdx + 2];
      out.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureDir(args.outDir);

  const obsidianPng = path.join(args.outDir, "obsidian.png");
  const logseqPng = path.join(args.outDir, "logseq.png");
  const diffPng = path.join(args.outDir, "diff.png");

  console.log(`[cdp] capture obsidian:${args.obsidianPort} -> ${obsidianPng}`);
  captureScreenshot({
    port: args.obsidianPort,
    urlContains: args.obsidianUrlContains,
    outFile: obsidianPng,
  });

  console.log(`[cdp] capture logseq:${args.logseqPort} -> ${logseqPng}`);
  captureScreenshot({
    port: args.logseqPort,
    urlContains: args.logseqUrlContains,
    outFile: logseqPng,
  });

  const a = readPng(obsidianPng);
  const b = readPng(logseqPng);
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);

  if (a.width !== b.width || a.height !== b.height) {
    console.log(`[cdp] size mismatch: obsidian=${a.width}x${a.height} logseq=${b.width}x${b.height} -> crop=${width}x${height}`);
  }

  const ac = cropPng(a, width, height);
  const bc = cropPng(b, width, height);
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(ac.data, bc.data, diff.data, width, height, {
    threshold: 0.12,
    includeAA: true,
  });

  fs.writeFileSync(diffPng, PNG.sync.write(diff));

  const total = width * height;
  const pct = total ? (diffPixels / total) * 100 : 0;
  console.log(`[cdp] diff: ${diffPixels}/${total} (${pct.toFixed(3)}%) -> ${diffPng}`);
}

main();

