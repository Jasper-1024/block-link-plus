import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const workflowPath = path.join(repoRoot, "docs", "harness", "workflow.json");
const mkdocsPath = path.join(repoRoot, "mkdocs.yml");
const docsWorkflowPath = path.join(repoRoot, ".github", "workflows", "deploy-docs.yml");

function fail(message) {
  console.error(`agent workflow check failed: ${message}`);
  process.exitCode = 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function walkFiles(relativeDir) {
  const root = path.join(repoRoot, relativeDir);
  const results = [];
  if (!fs.existsSync(root)) return results;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name).replaceAll("\\", "/");
    if (relativePath.startsWith("docs/harness/runs/")) continue;
    if (entry.isDirectory()) {
      results.push(...walkFiles(relativePath));
    } else {
      results.push(relativePath);
    }
  }
  return results;
}

const workflow = readJson(workflowPath);
const baselineRequiredPaths = [
  "AGENTS.md",
  "WORKFLOW.md",
  "CONTEXT.md",
  "docs/harness/README.md",
  "docs/harness/workflow.json",
  "docs/harness/guides/bug-investigation.md",
  "docs/harness/guides/cdp-runtime.md",
  "docs/harness/guides/doc-gardening.md",
  "docs/harness/guides/evidence-format.md",
  "docs/harness/guides/hitl-plane-publishing.md",
  "docs/harness/guides/human-review-brief.md",
  "docs/harness/guides/publishing.md",
  "docs/harness/guides/quality-gates.md",
  "docs/harness/guides/runtime-proof-package.md",
  "docs/harness/guides/tdd.md",
  "docs/harness/plans/README.md",
  "docs/harness/plans/debt.md",
  "docs/harness/stages/index.md",
  "docs/runtime/README.md",
  "docs/runtime/isolated-obsidian-cdp.md",
  "docs/runtime/cdp-script-inventory.md",
  "docs/agents/domain.md",
  "docs/agents/issue-tracker.md",
  "docs/agents/triage-labels.md",
  "docs/adr/0001-adopt-plane-backed-agent-harness.md",
];
const publicDocsRequiredPaths = [
  "doc/index.md",
  "doc/install.md",
  "doc/api.md",
  "doc/changelog.md",
  "doc/CNAME",
  "doc/en/index.md",
  "doc/zh-TW/index.md",
];

for (const publicPath of publicDocsRequiredPaths) {
  if (!exists(publicPath)) fail(`public docs path is missing: ${publicPath}`);
}

if (exists("openspec")) fail("openspec must stay archived under archive/openspec");
if (exists("memory-bank")) fail("memory-bank must stay archived under archive/memory-bank");
if (!exists("archive/openspec")) fail("archived OpenSpec directory is missing: archive/openspec");
if (!exists("archive/memory-bank")) fail("archived memory-bank directory is missing: archive/memory-bank");
if (!exists("archive/internal-docs")) fail("archived internal docs directory is missing: archive/internal-docs");
if (exists("docs/debug")) fail("current runtime docs must live under docs/runtime, not docs/debug");

const mkdocsText = fs.readFileSync(mkdocsPath, "utf8");
if (!/^docs_dir:\s*doc\s*$/m.test(mkdocsText)) {
  fail("mkdocs.yml must publish from docs_dir: doc");
}

const docsWorkflowText = fs.readFileSync(docsWorkflowPath, "utf8");
if (!docsWorkflowText.includes("'doc/**'")) {
  fail("deploy-docs workflow must listen to doc/**");
}
if (docsWorkflowText.includes("'docs/**'")) {
  fail("deploy-docs workflow must not listen to docs/**");
}

const rgignoreText = fs.readFileSync(path.join(repoRoot, ".rgignore"), "utf8");
if (!rgignoreText.includes("docs/harness/runs/**")) {
  fail(".rgignore must hide docs/harness/runs/** from normal searches");
}

if (workflow.schemaVersion !== 1) {
  fail("workflow.json schemaVersion must be 1");
}

if (workflow.workflow !== "blp") {
  fail("workflow.json workflow must be blp");
}

if (workflow.artifactPattern !== "docs/harness/runs/{key}/{stage}.md") {
  fail("artifactPattern must be docs/harness/runs/{key}/{stage}.md");
}

if (workflow.publishPlanPattern !== "docs/harness/runs/{key}/publish/{stage}.json") {
  fail("publishPlanPattern must be docs/harness/runs/{key}/publish/{stage}.json");
}

const states = workflow.states ?? {};
for (const key of ["humanReview", "reviewApproved", "reviewRejected", "readyToMerge", "done", "runtimeBlocked"]) {
  if (typeof states[key] !== "string" || states[key].trim() === "") {
    fail(`workflow.json states.${key} must be a non-empty string`);
  }
}
if (!Array.isArray(states.active) || states.active.length === 0) {
  fail("workflow.json states.active must be a non-empty array");
} else {
  for (const key of ["reviewApproved", "reviewRejected", "readyToMerge"]) {
    if (!states.active.includes(states[key])) {
      fail(`workflow.json states.active must include states.${key}`);
    }
  }
}

if (!Array.isArray(workflow.requiredPaths) || workflow.requiredPaths.length === 0) {
  fail("workflow.json requiredPaths must be a non-empty array");
}

const requiredPaths = new Set();
for (const requiredPath of workflow.requiredPaths ?? []) {
  if (typeof requiredPath !== "string" || requiredPath.trim() === "") {
    fail("workflow.json requiredPaths entries must be non-empty strings");
    continue;
  }
  if (requiredPath.includes("\\") || path.isAbsolute(requiredPath)) {
    fail(`workflow.json requiredPaths entry must be a repo-relative POSIX path: ${requiredPath}`);
  }
  if (requiredPaths.has(requiredPath)) {
    fail(`workflow.json requiredPaths has duplicate entry: ${requiredPath}`);
  }
  requiredPaths.add(requiredPath);
  if (!exists(requiredPath)) fail(`required harness path is missing: ${requiredPath}`);
}

for (const requiredPath of baselineRequiredPaths) {
  if (!requiredPaths.has(requiredPath)) {
    fail(`workflow.json requiredPaths must include: ${requiredPath}`);
  }
}

const stages = workflow.stages ?? [];
if (!Array.isArray(stages) || stages.length === 0) {
  fail("workflow.json stages must be a non-empty array");
}

const stageNames = new Set();
for (const stage of stages) {
  const stageName = stage.name ?? "<missing>";
  for (const key of ["name", "label", "spec", "artifact"]) {
    if (!stage[key]) {
      fail(`${stageName} is missing ${key}`);
    }
  }
  if (stage.artifact !== `docs/harness/runs/{key}/${stage.name}.md`) {
    fail(`${stageName} artifact must follow docs/harness/runs/{key}/${stage.name}.md`);
  }
  if (!exists(stage.spec)) {
    fail(`${stageName} spec does not exist: ${stage.spec}`);
  }
  if (stageNames.has(stage.name)) {
    fail(`duplicate stage in workflow.json: ${stage.name}`);
  }
  stageNames.add(stage.name);
}

if (!workflow.lanes || typeof workflow.lanes !== "object" || Array.isArray(workflow.lanes)) {
  fail("workflow.json lanes must be an object");
}

for (const requiredStage of ["design-intake", "implementation-routing", "implementation", "code-review"]) {
  if (!stageNames.has(requiredStage)) {
    fail(`workflow.json stages must include: ${requiredStage}`);
  }
}

for (const laneName of ["bug", "enhancement", "maintenance", "afk"]) {
  const lane = workflow.lanes?.[laneName];
  if (!lane || typeof lane !== "object" || Array.isArray(lane)) {
    fail(`workflow.json lanes.${laneName} must be an object`);
    continue;
  }
  if (!Array.isArray(lane.labels) || lane.labels.length === 0) {
    fail(`workflow.json lanes.${laneName}.labels must be a non-empty array`);
  }
  for (const label of lane.labels ?? []) {
    if (typeof label !== "string" || label.trim() === "") {
      fail(`workflow.json lanes.${laneName}.labels entries must be non-empty strings`);
    }
  }
  if (typeof lane.entryStage !== "string" || !stageNames.has(lane.entryStage)) {
    fail(`workflow.json lanes.${laneName}.entryStage must reference an existing stage`);
  }
  if (!["full", "intake", "afk"].includes(lane.automation)) {
    fail(`workflow.json lanes.${laneName}.automation must be full, intake, or afk`);
  }
}

for (const file of ["WORKFLOW.md", "docs/harness/guides/cdp-runtime.md"]) {
  const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
  if (text.includes("```powershell\ncorepack pnpm run obsidian:debug-env -- -Port")) {
    fail(`${file} still uses the known-bad pnpm -- forwarding form as a command block`);
  }
}

const runtimeProofStageSpecs = [
  "docs/harness/stages/investigation.md",
  "docs/harness/stages/rca-review.md",
  "docs/harness/stages/fix-design.md",
  "docs/harness/stages/fix-design-review.md",
  "docs/harness/stages/implementation.md",
  "docs/harness/stages/code-review.md",
];
for (const file of runtimeProofStageSpecs) {
  const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
  if (!text.includes("docs/harness/guides/runtime-proof-package.md")) {
    fail(`${file} must reference runtime-proof-package.md`);
  }
}

const tddStageSpecs = [
  "docs/harness/stages/fix-design.md",
  "docs/harness/stages/fix-design-review.md",
  "docs/harness/stages/implementation-routing.md",
  "docs/harness/stages/implementation.md",
  "docs/harness/stages/code-review.md",
  "docs/harness/guides/quality-gates.md",
];
for (const file of tddStageSpecs) {
  const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
  if (!text.includes("docs/harness/guides/tdd.md") && !text.includes("[tdd.md](tdd.md)")) {
    fail(`${file} must reference tdd.md`);
  }
}

const humanBriefFiles = [
  "WORKFLOW.md",
  "docs/harness/guides/evidence-format.md",
  "docs/harness/guides/hitl-plane-publishing.md",
  "docs/harness/guides/publishing.md",
  "docs/harness/stages/design-intake.md",
  "docs/harness/stages/implementation-routing.md",
  "docs/harness/stages/fix-design.md",
  "docs/harness/stages/fix-design-review.md",
  "docs/harness/stages/code-review.md",
  "docs/harness/stages/finalize.md",
];
for (const file of humanBriefFiles) {
  const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
  if (!text.includes("human-review-brief.md")) {
    fail(`${file} must reference human-review-brief.md`);
  }
}

const publishingGuideText = fs.readFileSync(path.join(repoRoot, "docs/harness/guides/publishing.md"), "utf8");
if (!publishingGuideText.includes("page.summary") || !publishingGuideText.includes("human-readable")) {
  fail("publishing guide must require a human-readable page.summary");
}

const qualityGuideText = fs.readFileSync(path.join(repoRoot, "docs/harness/guides/quality-gates.md"), "utf8");
for (const phrase of ["Repo-local truth", "Runtime before RCA", "TDD evidence is a gate", "Human gates are state gates"]) {
  if (!qualityGuideText.includes(phrase)) {
    fail(`quality-gates.md must include principle: ${phrase}`);
  }
}

const activeFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  "WORKFLOW.md",
  "CONTEXT.md",
  ".rgignore",
  "mkdocs.yml",
  ".github/workflows/deploy-docs.yml",
  "scripts/check-agent-workflow.mjs",
  "scripts/obsidian-cdp.js",
  ...walkFiles("docs/harness"),
  ...walkFiles("docs/agents"),
  ...walkFiles("docs/adr"),
  ...walkFiles("docs/runtime"),
];
const retiredForwardHarnessPath = ["docs", "agent", ""].join("/");
const retiredWindowsHarnessPath = ["docs", "agent", ""].join("\\");
const retiredInternalDocPath = ["doc", "debug", ""].join("/");
const retiredInternalWindowsDocPath = ["doc", "debug", ""].join("\\");
const retiredDebugDocPath = ["docs", "debug", ""].join("/");
const retiredDebugWindowsDocPath = ["docs", "debug", ""].join("\\");
const retiredOpenSpecInstruction = ["@", "openspec"].join("/");
const retiredOpenSpecMarker = ["OPENSPEC", "START"].join(":");
const retiredFixtureDocPath = ["doc", "_blp-ai"].join("/");

for (const file of activeFiles) {
  if (!exists(file)) continue;
  const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
  if (text.includes(retiredForwardHarnessPath) || text.includes(retiredWindowsHarnessPath)) {
    fail(`${file} still references the retired harness path`);
  }
  if (text.includes(retiredInternalDocPath) || text.includes(retiredInternalWindowsDocPath)) {
    fail(`${file} still references retired internal doc/debug path`);
  }
  if (text.includes(retiredDebugDocPath) || text.includes(retiredDebugWindowsDocPath)) {
    fail(`${file} still references retired docs/debug path`);
  }
  if (text.includes(retiredFixtureDocPath)) {
    fail(`${file} still references the retired BLP fixture path under public docs`);
  }
  if (text.includes(retiredOpenSpecInstruction) || text.includes(retiredOpenSpecMarker)) {
    fail(`${file} still references active OpenSpec instructions`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("agent workflow check passed");
