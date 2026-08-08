# Harness Improvement Discussion

Date: 2026-08-08

Status: implemented and validated on 2026-08-08

This note records only the improvements agreed during the GPT-5.6-era review
of the BLP harness. Matt Pocock's skills are a reference for predictable
workflow design; they are not being modified, copied wholesale, or treated as
an upstream contract.

## 1. Runner Generates Publish Plans

Decision: move mechanical Publish Plan generation out of stage workers and
into the Runner.

The stage worker should own the semantic result:

- the canonical stage artifact;
- the verdict;
- a concise control-plane comment;
- a summary and explicit out-of-scope facts;
- optional child-scope proposals when the stage authorizes them.

The Runner should own deterministic publication plumbing:

- validate that the verdict is allowed for the stage;
- fill `scopeKey`, stage, artifact path, and repo links;
- compute the artifact SHA-256;
- serialize and validate the Publish Plan JSON;
- write the repo-local Publish Plan artifact;
- perform the idempotent Plane+ projection.

The Publish Plan remains a durable, auditable repo artifact. Only its producer
changes. Stage workers should no longer read the publishing schema, calculate
hashes, or reproduce Runner-known metadata.

Why this is first:

- it removes deterministic infrastructure work from a stochastic worker;
- it affects every stage;
- `workflow.json` and Runner state already contain most required metadata;
- it reduces prompt load and eliminates an avoidable mismatch surface without
  changing the semantic workflow.

Verification does not require replaying historical agent runs. Existing stage
artifacts and Publish Plans can serve as fixtures for deterministic Runner
tests; the next natural task can provide observational confirmation.

## 2. Replace Flat Required-Input Lists With Conditional Disclosure

Decision: remove the broad, launch-time `Required Inputs` reading lists from
stage specs. Replace them with a small set of always-required task facts and
explicit conditional context pointers.

The Runner should not generate an exhaustive reading packet. Codex should
retain repository search and task-local context discovery.

For an implementation stage, the default input should be limited to:

- the current stage contract;
- the source issue or accepted child contract;
- the accepted implementation design or routing contract;
- the review decision that authorizes implementation;
- the accepted TDD slice plan.

Conditional references should activate only when their branch is present:

- read tracker feedback when readable human feedback exists;
- read CDP and runtime-proof guidance for `cdp-required` or real Obsidian
  behavior claims;
- trace back through investigation and RCA when implementation evidence
  contradicts the accepted design;
- read domain reference when task-local terminology or product semantics
  require it;
- load human-review guidance only when the stage actually routes to a human
  decision.

The following should not be mandatory startup reads merely to reach a known
stage:

- `AGENTS.md`, because Codex already injects it;
- `WORKFLOW.md`, because the Runner has already selected the stage;
- `docs/harness/README.md`, because it is a map;
- publishing guidance, once item 1 is implemented;
- generic evidence templates when the stage defines its own artifact;
- every historical predecessor when the accepted contract and review are
  sufficient.

Stage specs should inline only non-negotiable invariants and sharp completion
criteria. Branch-specific methods and references should remain behind clearly
worded context pointers.

Verification also does not require historical replay. On the next natural run,
inspect whether the worker enters task-local source sooner, loads conditional
material when its trigger occurs, and still satisfies every hard gate.

## 3. Use A Structured Stage Result

Decision: use Codex App Server's native `turn/start.outputSchema` for the
worker's final Stage Result. Stop using a verdict parsed from free-form
Markdown as the machine control interface.

The worker should continue writing the canonical Markdown artifact for human
review, downstream agent context, and audit history. Its final assistant
message should instead be a small schema-constrained semantic result such as:

```json
{
  "verdict": "ready-for-review",
  "comment": "Implemented the accepted slice; targeted tests and build passed.",
  "summary": "Added the bounded regression and corresponding production fix.",
  "outOfScope": ["Android-specific behavior remains unproved."],
  "blockers": [],
  "evidence": {
    "targetedTests": "passed",
    "build": "passed",
    "runtime": "not-required"
  }
}
```

Do not ask the worker to return metadata already owned by the Runner, including
the scope key, stage name, artifact path, artifact hash, repo link, or Publish
Plan schema version.

The Runner should:

- validate the structured result against the stage's allowed verdicts;
- verify that the canonical artifact exists;
- apply the stage's minimum completion gates;
- generate the Publish Plan described in item 1;
- route from the structured verdict.

The resulting interfaces are deliberately separate:

- canonical Markdown artifact: durable knowledge handoff;
- structured Stage Result: machine control interface;
- generated Publish Plan: control-plane projection.

The current App Server path can adopt this first. A `codex exec` compatibility
path may temporarily retain the Markdown parser until it has an equivalent
structured-output integration.

## 4. Fail Closed On Stage-Result Protocol Errors

Decision: a missing or invalid Stage Result is a worker protocol error, not a
stage verdict. The Runner must not infer a verdict or use a default completion
route.

Valid stage outcomes, including `runtime-blocked`, `validation-failed`,
`needs-revision`, or `human-review-required`, are semantic results and follow
the normal workflow. Protocol errors include:

- a missing Stage Result;
- output that does not satisfy the configured schema;
- a verdict that is not allowed for the current stage;
- a missing canonical artifact;
- a material conflict between the structured result and the artifact.

On a protocol error, the Runner should:

- publish no Stage Result or Publish Plan;
- make no normal stage transition;
- consume no RCA, design, or implementation loop attempt;
- preserve the trace;
- issue one short continuation turn in the same App Server thread asking only
  for a corrected Stage Result based on the existing artifact.

The continuation must not redo the task. If it also fails, classify the run as
a Runner/Worker execution error and route it to Human Review with that explicit
label. Do not disguise it as a semantic stage verdict.

The governing rule is: the Runner may validate and reject a worker verdict,
but it must not invent one.

## 5. Make Workflow Checks Protect Invariants, Not Prose Duplication

Decision: retain `agent:workflow-check`, but stop using it to require repeated
guide paths, duplicate required-path catalogs, or fixed phrases across
Markdown files.

The check should continue to validate machine contracts and durable
invariants, including:

- the `workflow.json` schema;
- unique and complete stage definitions;
- allowed verdicts and completion routes;
- the existence and integrity of referenced stage specs;
- artifact and Stage Result schemas;
- review freshness and source-hash relationships;
- protected-path, state, approval, and completion boundaries.

It should not require:

- a principle to appear with fixed wording;
- the same guide to be mentioned by every stage that might conditionally need
  it;
- `workflow.json.requiredPaths` to mirror a second hard-coded path array in
  the validation script;
- runtime, TDD, publishing, or human-review guides to be mandatory startup
  reads merely because a stage has a possible branch that uses them.

When a requirement is genuinely mechanical, encode it once as workflow
metadata or a Runner completion gate. For example, `runtime-if-required` or
`tdd-execution` describes what the Runner must verify; it is not an instruction
to preload a guide.

The principle is: CI protects behavior contracts, not documentation sediment.

## 6. Use Luna/Max As The Uniform Runner Default

Decision: configure both Runner-created stage workers and native Codex
subagents to use `gpt-5.6-luna` with `max` reasoning effort by default.

This is an operational default for cost-sensitive, high-volume agent work
where latency is acceptable. Keep the policy deliberately simple:

- pass the model and reasoning effort explicitly instead of inheriting ambient
  defaults;
- use the same combination across stages rather than creating a per-stage
  model-routing matrix;
- do not silently fall back to another model or reasoning effort when the
  requested configuration is rejected;
- do not build a full run-provenance system or rerun completed historical work
  merely to compare model configurations.

The Runner only needs enough model metadata in its ordinary trace to diagnose
a rejected or unexpectedly rerouted request. Further tuning, such as comparing
`max` with `xhigh`, should come from naturally occurring future work rather
than a retrospective benchmark project.

## 7. Separate Semantic Verdicts From Mechanical Completion Gates

Decision: a worker or reviewer owns semantic judgment, while the Runner owns
only deterministic facts that it can observe directly before allowing a state
transition.

A valid Stage Result is necessary but not always sufficient. A stage may claim
`ready-for-review` or `accepted` while an objectively required condition is
missing or stale. Keep a small set of stage-specific `completionRequirements`
for facts such as:

- the canonical artifact exists;
- the reviewed source hash still matches the current source;
- an expected implementation diff exists, or an explicit valid no-op outcome
  was returned;
- required test and build commands produced successful evidence;
- runtime evidence exists when the workflow marks it as required;
- no unresolved blocking finding remains before acceptance;
- human approval applies to the current version rather than an older artifact.

The Runner must not judge whether a design is good, a root cause is persuasive,
or an implementation is elegant. Those are semantic decisions for workers,
reviewers, or humans. It may only reject a transition whose claimed objective
preconditions do not match observable state.

Do not create one large universal completion schema. Each stage and route
should declare the minimum mechanical gates needed to make that particular
transition safe.

## 8. Let The Code-Review Worker Coordinate Its Own Subagents

Decision: the external Plane Runner launches one code-review worker. That
worker acts as the Review Coordinator and starts two isolated, read-only native
Codex subagents in parallel:

- a Contract/Spec reviewer that compares the pinned diff with the accepted
  implementation contract;
- a Correctness/Standards reviewer that examines implementation risk, tests,
  evidence, and applicable repo standards independently of product scope.

Both subagents use the configured `gpt-5.6-luna`/`max` defaults. They return
structured findings to the coordinator and must not edit source, write the
canonical review artifact, or choose the BLP workflow verdict.

The coordinator validates material findings, preserves the two axes in the
artifact, resolves duplicates, classifies blocking versus non-blocking issues,
and returns the single code-review Stage Result. The external Runner validates
and routes that result without understanding review semantics.

## 9. Pin An Uncommitted Review Snapshot Without Requiring A Commit

Decision: code review must inspect one stable implementation snapshot, but the
implementation stage must not commit merely to make review possible. Finalize
continues to own commit/merge after the human `Ready to Merge` gate.

Record the implementation base commit before the worker starts and create a
review identity that covers the complete implementation patch, including
tracked, staged, unstaged, and untracked product files. Runner-generated
`docs/harness/runs/**` process records are excluded from the implementation
tree; the accepted contracts and implementation handoff are pinned separately
by path and hash. A temporary Git index/tree or an equivalent diff-plus-manifest
hash may be used without moving a branch ref or changing the real index.

Both review subagents receive the same base, review snapshot, diff command, and
accepted-contract identity. Recheck the snapshot after aggregation. If the
worktree or accepted contract changed, the review is stale and cannot publish
an `accepted` verdict.

Do not copy Matt's committed-branch-only `git diff <fixed-point>...HEAD`
command directly: it excludes the uncommitted implementation state used by
the BLP workflow.

## 10. Run TDD Slices Inside One Implementation Attempt

Decision: the Harness owns the outer `implementation -> code-review ->
implementation` role loop. Each individual implementation worker owns its
inner feedback loop and executes all accepted behavior slices during one Codex
call before returning a Stage Result.

The accepted design, design review, implementation routing, or AFK child
contract supplies the pre-agreed test seams. For each slice the worker should
run the smallest applicable loop and targeted validation before continuing to
the next slice. After all slices, it runs the required broader tests,
typechecking/build, and conditional runtime proof.

Do not invoke Matt's `$implement` skill verbatim from the Runner. Its foreground
workflow invokes code review and commits, while BLP deliberately keeps code
review as an independent stage and commit/merge in Finalize. Borrow its
composition and validation cadence through the repo-owned implementation
playbook instead.

The slice plan must not manufacture ceremonial RED evidence. Classify work by
the proof it can honestly produce:

- `tdd`: a genuine behavior failure followed by the minimum passing change;
- `characterization`: existing behavior receives regression coverage, with an
  optional sensitivity/mutation check that is not labelled as genuine RED;
- `runtime-fix`: reproduce, change, rebuild/reload, and repeat the same runtime
  proof;
- `refactor`: establish behavior GREEN before and after a bounded,
  behavior-preserving change.

If an accepted seam or design is invalid, stop with the stage's design-mismatch
verdict rather than silently substituting a private seam or broader scope. The
implementation worker stops at `ready-for-review`; it does not review or commit
its own work.

## Discussion Boundary

No Stage Packet or `StagePacketBuilder` is approved. No Matt skill changes are
planned. Further harness changes remain open for discussion and should be added
only after reaching explicit agreement.
