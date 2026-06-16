import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const workflowPath = path.join(repoRoot, "docs", "agent", "workflow.json");

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

const workflow = readJson(workflowPath);
const baselineRequiredPaths = [
  "AGENTS.md",
  "WORKFLOW.md",
  "CONTEXT.md",
  "docs/agent/index.md",
  "docs/agent/workflow.json",
  "docs/agent/cdp-validation.md",
  "docs/agent/evidence-format.md",
  "docs/agent/stages/index.md",
  "docs/agents/domain.md",
  "docs/agents/issue-tracker.md",
  "docs/agents/triage-labels.md",
  ".codex/skills/setup-matt-pocock-skills/SKILL.md",
  ".codex/skills/grill-with-docs/SKILL.md",
  ".codex/skills/diagnose/SKILL.md",
  ".codex/skills/tdd/SKILL.md",
];

if (workflow.schemaVersion !== 1) {
  fail("workflow.json schemaVersion must be 1");
}

if (workflow.workflow !== "blp") {
  fail("workflow.json workflow must be blp");
}

if (workflow.artifactPattern !== "docs/agent/runs/{key}/{stage}.md") {
  fail("artifactPattern must be docs/agent/runs/{key}/{stage}.md");
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
  if (stage.artifact !== `docs/agent/runs/{key}/${stage.name}.md`) {
    fail(`${stageName} artifact must follow docs/agent/runs/{key}/${stage.name}.md`);
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

for (const laneName of ["bug", "enhancement", "maintenance"]) {
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
  if (!["full", "intake"].includes(lane.automation)) {
    fail(`workflow.json lanes.${laneName}.automation must be full or intake`);
  }
}

for (const file of ["WORKFLOW.md", "docs/agent/cdp-validation.md"]) {
  const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
  if (text.includes("```powershell\ncorepack pnpm run obsidian:debug-env -- -Port")) {
    fail(`${file} still uses the known-bad pnpm -- forwarding form as a command block`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("agent workflow check passed");
