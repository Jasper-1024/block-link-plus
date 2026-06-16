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

if (workflow.schemaVersion !== 1) {
  fail("workflow.json schemaVersion must be 1");
}

if (workflow.workflow !== "blp") {
  fail("workflow.json workflow must be blp");
}

if (workflow.artifactPattern !== "docs/agent/runs/{key}/{stage}.md") {
  fail("artifactPattern must be docs/agent/runs/{key}/{stage}.md");
}

for (const requiredPath of [
  "AGENTS.md",
  "WORKFLOW.md",
  "CONTEXT.md",
  "docs/agent/index.md",
  "docs/agent/cdp-validation.md",
  "docs/agents/domain.md",
  "docs/agents/issue-tracker.md",
  "docs/agents/triage-labels.md",
  ".codex/skills/setup-matt-pocock-skills/SKILL.md",
  ".codex/skills/grill-with-docs/SKILL.md",
  ".codex/skills/diagnose/SKILL.md",
  ".codex/skills/tdd/SKILL.md",
]) {
  if (!exists(requiredPath)) fail(`required harness path is missing: ${requiredPath}`);
}

const stages = workflow.stages ?? [];
if (!Array.isArray(stages) || stages.length === 0) {
  fail("workflow.json stages must be a non-empty array");
}

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
