# Community Agent-Harness Practices: a Counterevidence Review

Date: 2026-08-08

Status: research note; no implementation decision

## Question

Should the BLP Runner mechanically generate an authoritative, minimal input
list (a "Stage Packet") for every stage worker, or does that move knowledge
selection to the wrong layer?

This review deliberately looked for evidence against the proposal. It weights
2026 first-party practice and current framework behavior above older recipes or
community popularity. Sources are labelled as:

- **Fact**: documented behavior, implementation, or reported experiment.
- **Maintainer guidance**: a recommendation from the team maintaining the
  product or framework.
- **Inference for BLP**: a conclusion drawn from those sources; not a fact
  claimed by the source.

## Bottom line

The original proposal has a real directional error if "authoritative Stage
Packet" means that the Runner decides, before exploration, the complete set of
content a worker needs.

The strongest current evidence supports a hybrid boundary:

```text
Runner owns the execution contract and hard invariants.
Repository owns durable knowledge and navigation.
Worker owns task-local discovery and decides what additional content to read.
Evaluators and deterministic checks own proof of completion.
```

A launch-time object may still be useful, but it should be a **Stage Contract
Envelope**, not a content bundle or input whitelist. It should carry identity,
accepted decisions, authority boundaries, mandatory predecessor references,
expected outputs, evidence requirements, and stop conditions. Paths to likely
useful material are navigation seeds. The worker must remain able—and be
expected—to search the repository and load further context.

Most importantly, the next action should not be to build a
`StagePacketBuilder`. With GPT-5.6 now in scope, first establish an evaluation
baseline and ablate existing scaffolding one component at a time.

## Highest-weight evidence: 2026 first-party practice

### 1. OpenAI's own Codex harness uses a map, repo navigation, and mechanical invariants

**Fact.** OpenAI reports using repository tools and repository-embedded skills
so Codex gathers context directly, without humans copying it into the prompt.
Its failed first approach was one large `AGENTS.md`. The replacement is a short
table of contents (roughly 100 lines) pointing into a structured, versioned
`docs/` knowledge base. OpenAI calls this progressive disclosure: a small,
stable entry point teaches the agent where to look next. Freshness and
cross-links are mechanically checked. [OpenAI, *Harness engineering: leveraging
Codex in an agent-first world*, 2026-02-11](https://openai.com/index/harness-engineering/)

**Fact.** The same report separates centrally enforced architecture and tests
from local implementation freedom: it mechanically enforces dependency edges,
boundary parsing, structural rules, and other invariants, while avoiding a
prescription of the implementation mechanism. [OpenAI harness
engineering](https://openai.com/index/harness-engineering/)

**Maintainer guidance.** The explicit rule is to enforce invariants rather than
micromanage implementations, and to enforce boundaries centrally while allowing
autonomy locally. [OpenAI harness
engineering](https://openai.com/index/harness-engineering/)

**Inference for BLP.** This supports making stage transitions, accepted
verdicts, artifact freshness, output schema, runtime gates, and validations
mechanical. It argues against asking the Runner to predict the complete reading
set for a semantic coding task.

### 2. GPT-5.6 changes the assumptions under older harness scaffolding

**Fact.** Current GPT-5.6 guidance says improved intent understanding means it
is often unnecessary to prescribe every step. It asks developers to retain
domain context, hard constraints, approval boundaries, success criteria, and
important ambiguity rules. [OpenAI, *Using GPT-5.6*](https://developers.openai.com/api/docs/guides/latest-model)

**Fact.** In OpenAI's internal coding-agent eval sample, leaner system prompts
improved scores by roughly 10–15% while reducing tokens by 41–66% and cost by
33–67%. OpenAI labels these figures directional and advises removing one group
of instructions at a time and rerunning the same representative evals.
[OpenAI, *Using GPT-5.6*](https://developers.openai.com/api/docs/guides/latest-model)

**Maintainer guidance.** State each instruction once, expose only relevant
tools, and keep product requirements or examples only when they encode a real
requirement or correct a measured gap. [OpenAI, *Using
GPT-5.6*](https://developers.openai.com/api/docs/guides/latest-model)

**Inference for BLP.** A design motivated by reducing Luna's attention burden
cannot be accepted on intuition alone. An extra generated packet could reduce
noise, but it could equally duplicate current stage specs and native Codex
context management. Its value has to be measured against GPT-5.6, not assumed
from older models.

### 3. Anthropic removed formerly useful harness structure when the model improved

**Fact.** Anthropic's March 2026 long-running application harness intentionally
kept planning at product context and high-level design. It avoided granular
implementation details because an early mistake would cascade downstream; it
constrained deliverables and let the implementation agent determine the path.
Agents exchanged structured files and agreed on testable contracts.
[Anthropic, *Harness design for long-running application
development*, 2026-03-24](https://www.anthropic.com/engineering/harness-design-long-running-apps)

**Fact.** Anthropic describes every harness component as an assumption about
what the model cannot do. Those assumptions can be wrong or go stale. It used
one-at-a-time ablation and trace review; after moving from Opus 4.5 to 4.6 it
removed context resets and then the sprint construct because the stronger model
could handle them natively. The evaluator remained only where it still produced
measurable lift. [Anthropic, *Harness design for long-running application
development*](https://www.anthropic.com/engineering/harness-design-long-running-apps)

**Maintainer guidance.** Re-examine a harness whenever the model changes; strip
components that are no longer load-bearing, and retain specialized agents only
where representative runs show value. [Anthropic, *Harness design for
long-running application development*](https://www.anthropic.com/engineering/harness-design-long-running-apps)

**Inference for BLP.** The first GPT-5.6-era change should be a harness audit
and evaluation loop, not a new orchestration layer. BLP should be prepared to
remove stages or repeated instructions as well as add mechanisms.

## Context selection: current convergence and important limits

### Just-in-time retrieval is the default direction

**Fact.** Anthropic describes a shift from preprocessing all relevant data up
front toward just-in-time context: provide lightweight identifiers such as file
paths, stored queries, and links, then let the agent load data using tools.
Claude Code uses a hybrid: `CLAUDE.md` is loaded up front, while glob and grep
support autonomous retrieval. Anthropic says this avoids stale indexes and lets
the agent refine its understanding from file names, hierarchy, sizes, and other
signals. [Anthropic, *Effective context engineering for AI
agents*, 2025-09-29](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

**Fact.** Anthropic also records the failure mode of aggressive selection:
subtle but critical context may only become visibly important later. Its
compaction guidance starts by maximizing recall, then improves precision after
testing on complex traces. [Anthropic, *Effective context engineering for AI
agents*](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

**Maintainer guidance.** Use a hybrid when appropriate; the correct autonomy
boundary depends on the task. As model capability improves, expect less manual
curation, and prefer the simplest design that works. [Anthropic, *Effective
context engineering for AI agents*](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

**Inference for BLP.** A Runner is well positioned to resolve known canonical
predecessors. It is poorly positioned to decide that no unlisted source file,
test, ADR, history entry, or runtime evidence will matter. Treat generated paths
as seeds or minimum obligations, never as the worker's complete information
universe.

### Codex and OpenHands already provide progressive disclosure

**Fact.** Codex builds an `AGENTS.md` instruction chain from repository root to
the worker's current directory, using closer files as later, more local
guidance. It caps the combined default at 32 KiB. [OpenAI Codex,
*Custom instructions with AGENTS.md*](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

**Fact.** Codex skills advertise only names and descriptions initially, then
load the full `SKILL.md` when selected. The initial skill catalog has a context
budget; referenced resources are separate. [OpenAI Codex, *Build
skills*](https://learn.chatgpt.com/docs/build-skills)

**Fact.** Current OpenHands makes the same distinction: concise, always-on
`AGENTS.md`; skill name/description discovery; full skill on invocation;
resources only when needed. It additionally supports deterministic file-path
rules that activate when a matching file is touched. [OpenHands, *Skills
Overview*](https://docs.openhands.dev/overview/skills)

**Inference for BLP.** A Runner-generated packet that repeats all harness guides
would sit on top of native `AGENTS.md` and skill disclosure and may produce a
second context-routing system. A better investment is a clear repository index,
accurate stage spec, searchable domain language, and verifiable links.

### Structured context is useful, but not equivalent to an exhaustive packet

**Fact.** Anthropic's earlier long-running harness used a feature list,
progress file, and git history so fresh sessions could regain project state.
Each coding session read those stable artifacts, chose the highest-priority
unfinished feature, worked incrementally, tested end-to-end, and left a clean
handoff. [Anthropic, *Effective harnesses for long-running
agents*, 2025-11-26](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

**Fact.** Anthropic's production research system uses lead-agent plans,
specialized worker objectives, filesystem artifacts, and lightweight references
back to the coordinator. It contrasts dynamic multi-step search with static RAG,
and notes that coding tasks often have fewer truly independent parallel parts
than research. [Anthropic, *How we built our multi-agent research
system*, 2025-06-13](https://www.anthropic.com/engineering/multi-agent-research-system)

**Inference for BLP.** Durable accepted decisions and predecessor artifacts are
valuable because they preserve state and accountability. They do not imply that
the preceding agent or Runner should filter all knowledge for the next agent.
The artifact should say what was decided and proved; the next worker should
still inspect the real repository and environment.

## What current frameworks actually expose

Frameworks show multiple valid architectures rather than one universal best
practice.

### LangGraph / LangChain

**Fact.** The current subagent pattern uses a stateful supervisor that
dynamically chooses workers and their inputs. Its design surface explicitly
offers query-only versus full-context inputs rather than declaring one correct
choice. Current guidance treats context engineering as dynamic and recommends
starting simple, adding one feature at a time, and monitoring model quality,
tokens, and latency. [LangChain, *Subagents*](https://docs.langchain.com/oss/python/langchain/multi-agent/subagents),
[LangChain, *Context engineering in agents*](https://docs.langchain.com/oss/python/langchain/context-engineering)

**Fact.** LangChain distinguishes a deterministic router, suitable for clear
categories, from a supervisor, suitable when evolving context requires flexible
decisions. [LangChain, *Router*](https://docs.langchain.com/oss/python/langchain/multi-agent/router)

**Inference for BLP.** The BLP lane/stage transition graph is a good candidate
for deterministic routing. Within an investigation or implementation stage,
file relevance evolves during work and is a better candidate for agentic
selection.

### AutoGen

**Fact.** Current AutoGen says to start with simple conversational teams when
ad-hoc flow is sufficient and move to `GraphFlow` when strict ordering,
branching, or cycles are required. Execution flow and message flow are separate;
message filters can reduce hallucination and memory load. `GraphFlow` remains
experimental. [AutoGen, *GraphFlow*](https://microsoft.github.io/autogen/dev/user-guide/agentchat-user-guide/graph-flow.html)

**Fact.** `SelectorGroupChat` lets a model choose the next worker from current
context and role descriptions. The documentation warns against overloading the
selector prompt and recommends a custom function when conditions become large
and deterministic. [AutoGen, *Selector Group
Chat*](https://microsoft.github.io/autogen/dev/user-guide/agentchat-user-guide/selector-group-chat.html)

**Inference for BLP.** Deterministic state-machine semantics and dynamic
semantic navigation can coexist. The mistake is not having a Runner; it is
making deterministic code answer questions whose relevance can only be known
after semantic exploration.

### OpenHands, SWE-agent, and Aider

**Fact.** OpenHands uses deterministic stop hooks for checks such as tests and
lint, while skills supply repository-specific workflows and knowledge.
[OpenHands, *Repository Customization*](https://docs.openhands.dev/openhands/usage/customization/repository)

**Fact.** OpenHands retains a configurable condenser with no-op, LLM summary,
rolling, and pipeline forms instead of one mandatory compression strategy.
[OpenHands, *Condenser*](https://docs.openhands.dev/sdk/arch/condenser)

**Fact.** SWE-agent still exposes history processors, but its current docs say
the classic “keep the last five observations” processor is not always needed
with modern state-of-the-art models and can break prompt caching. [SWE-agent,
*History processors*](https://swe-agent.com/1.0/reference/history_processor_config/)

**Fact.** Aider provides a small, dynamically ranked repository map and lets the
model request full files. The map budget changes with chat state. Aider warns
that adding every file often distracts the model and increases cost.
[Aider, *Repository map*](https://aider.chat/docs/repomap.html),
[Aider, *FAQ*](https://aider.chat/docs/faq.html)

**Inference for BLP.** The recurring pattern is `small index + dynamic
retrieval + deterministic checks`, not `static exhaustive bundle`. Older fixed
history trimming and broad preloading should not be copied without a current
model evaluation.

## Empirical counterevidence: useful, conflicting, and not yet a universal law

### Repository context files can increase work without improving success

**Fact (2026 preprint).** A study across multiple coding agents and models on
SWE-bench and CTXbench found that context files did not significantly improve
task success overall, while increasing steps and cost by more than 20%.
LLM-generated files tended to reduce success; developer-written files did
better than generated ones but still added cost. The agents followed the
instructions and explored and tested more, yet that extra activity did not
reliably improve resolution. The authors recommend minimal, human-written
requirements and evaluation before adoption. [Gloaguen et al., *Evaluating
AGENTS.md*, arXiv:2602.11988](https://arxiv.org/abs/2602.11988)

**Fact (conflicting 2026 preprint).** A smaller paired study of Codex on 124 pull
requests reported lower median runtime and output tokens with `AGENTS.md`, while
maintaining comparable task completion behavior. It measured efficiency, not a
broad cross-agent success lift. [Lulla et al., *On the Impact of AGENTS.md Files
on the Efficiency of AI Coding Agents*, arXiv:2601.20404](https://arxiv.org/abs/2601.20404)

**Inference for BLP.** The conflict is exactly why “more context is better” and
“less context is better” are both unsafe design rules. Content, repo quality,
task distribution, model, and harness interact. BLP needs paired task trials,
not a generic best-practice verdict.

### Progressive disclosure helps at scale, but extra routing depth can hurt

**Fact (2026 preprint).** A controlled long-document study across three
harnesses and model families found that progressive disclosure was redundant
when a strong harness already navigated a single document well, but helped when
the corpus expanded to many books. A second routing level never helped and
sometimes reduced accuracy. [He et al., *Is Progressive Disclosure All You Need
for Long-Context Agents?*, arXiv:2607.17598](https://arxiv.org/abs/2607.17598)

**Inference for BLP.** One clear map from stage contract to canonical repo
artifacts is defensible. Layering `workflow.json -> generated Stage Packet ->
stage spec -> guide index -> guide` risks becoming routing depth with no proven
benefit.

## Failure modes of an authoritative Stage Packet

1. **Selection bottleneck.** The Runner must decide relevance before the worker
   has followed code, tests, imports, git history, or runtime behavior.
2. **False completeness.** Calling the packet authoritative encourages the
   worker to stop searching even when new evidence changes the relevant area.
3. **Second source of truth.** Generated summaries or duplicated rules can drift
   from repo artifacts. Even a path list duplicates dependency knowledge if it
   must be maintained separately from the stage spec.
4. **Cascading upstream error.** A wrong omission or classification is inherited
   by every downstream stage; the worker may never see the evidence needed to
   challenge it.
5. **Double context routing.** Codex already loads hierarchical `AGENTS.md` and
   selects skills progressively. A second bespoke selector may add cost and
   hidden interactions.
6. **Stale model assumptions.** A packet optimized around an older model's
   weaknesses may reduce GPT-5.6 performance or become dead weight.
7. **Unobservable benefit.** Without paired evals, lower token use can disguise
   omitted requirements, while more exploration can look diligent without
   increasing task success.

## Who should decide what to read?

| Decision | Owner | Why |
| --- | --- | --- |
| Current lane and stage | Runner/state machine | Deterministic workflow state |
| Stage identity and objective | Repo-owned stage contract | Stable domain semantics |
| Accepted product/design decisions | Human-approved canonical artifact | Must not be reinterpreted silently |
| Permissions, write scope, destructive boundaries | Runner/sandbox/policy | Safety must not depend on model judgment |
| Mandatory predecessor artifacts | Runner verifies; worker reads | Their existence, verdict, and freshness are machine-checkable |
| Output schema, verdict vocabulary, evidence gates | Repo contract + Runner checks | Downstream automation needs deterministic interfaces |
| Relevant code, tests, ADRs, guides, history, and runtime probes | Worker, using repo tools | Relevance emerges during semantic exploration |
| Additional skill or reference loading | Worker/native skill router | Progressive disclosure is already supported |
| Whether a candidate context rule improves outcomes | Eval suite plus trace review | Neither author intuition nor model confidence is sufficient |

The packet, if retained, should therefore contain two visibly different
sections:

```yaml
contract:                 # authoritative
  stage: implementation
  objective: ...
  accepted_decisions: ...
  action_boundaries: ...
  mandatory_predecessors: # paths + hashes/verdicts, not copied summaries
  required_outputs: ...
  evidence_and_gates: ...
  stop_or_escalate_when: ...

navigation_seeds:         # explicitly non-exhaustive
  - path: docs/harness/guides/tdd.md
    why: implementation evidence format
  - path: docs/agents/domain.md
    why: domain vocabulary

worker_discovery:
  repository_search: required
  may_read_beyond_seeds: true
  record_material_sources: true
```

This example is an interface sketch, not an implementation recommendation.

## Direction correction for BLP

### Stop or defer

- Do not implement an authoritative `StagePacketBuilder` now.
- Do not move every `Required Inputs` list into `workflow.json` merely to make
  the Runner the source of truth.
- Do not make `requiredPaths` an injection list or reading whitelist. Its
  current repository-integrity role is conceptually different.
- Do not generate AI summaries of canonical artifacts for worker startup unless
  an eval shows they preserve all decision-critical information.
- Do not optimize specifically for Luna/max based only on expected cost or
  intuition; run representative trials.

### Preserve

- Preserve BLP's deterministic lane and stage transitions.
- Preserve independent review where it catches self-evaluation failures.
- Preserve canonical filesystem artifacts, explicit verdicts, hashes,
  publishing plans, runtime evidence, and Human Review authority.
- Preserve worker access to the real repo, git history, tests, and runtime.

### Reframe

- Treat each stage spec as the stable contract and index, not as an exhaustive
  reading script.
- Make only truly non-inferable invariants always-on: accepted scope, approval
  state, forbidden actions, required result/evidence, and escalation semantics.
- Turn supporting guides into one-level progressive disclosure: concise
  descriptions and direct paths; load full content when relevant.
- Prefer mechanical enforcement at the output boundary: artifact schema,
  accepted predecessor hash, test/runtime evidence, unchanged protected files,
  and verdict routing.
- Record actual source reads and tool trajectories for diagnosis; do not use
  the trace to require one canonical path when multiple valid paths reach the
  correct outcome.

## The actual first priority: a GPT-5.6 harness ablation suite

Before changing the contract surface, select approximately 10–30 archived BLP
tasks covering:

- bug investigation with runtime proof;
- accepted RCA to fix design;
- small implementation;
- implementation that discovers a design mismatch;
- runtime-blocked work;
- code review with a planted or historical defect;
- enhancement intake and Human Review routing.

Run multiple trials where feasible. Compare at least:

1. current BLP stage prompt and required reading;
2. current contract with repeated/general guidance removed;
3. lean stage contract + navigation seeds + unrestricted repo discovery;
4. only if still justified, a mechanically assembled envelope.

Measure outcomes first:

- correct verdict and route;
- scope/approval violations;
- missed accepted constraints;
- defect discovery or task success;
- quality of cited runtime/TDD evidence;
- unnecessary file changes;
- human rework required.

Then measure operational cost:

- input/output/reasoning tokens;
- wall time;
- tool calls and files read;
- retries and loop count;
- context compactions/resets;
- model and reasoning setting.

Read failed and surprising traces. A component is load-bearing only when its
removal creates a repeatable, relevant regression. This follows both OpenAI's
current lean-prompt guidance and Anthropic's 2026 harness ablation method.
[OpenAI, *Using GPT-5.6*](https://developers.openai.com/api/docs/guides/latest-model),
[Anthropic, *Harness design for long-running application
development*](https://www.anthropic.com/engineering/harness-design-long-running-apps),
[Anthropic, *Demystifying evals for AI
agents*](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

## Time-sensitive interpretation

| Source period | What remains useful | What may now be stale |
| --- | --- | --- |
| 2024 agent-pattern guidance | Deterministic workflows for truly fixed tasks; agent autonomy for path-dependent work; simplest system first | Specific model limitations and amount of decomposition required |
| 2025 long-running harnesses | Filesystem artifacts, clean handoffs, end-to-end testing, dynamic search | Mandatory context resets, fixed one-feature sessions, aggressive history trimming |
| Early 2026 harness reports | Repo as system of record, map-not-manual, mechanical invariants, evaluator separation | Any component not re-tested against GPT-5.6 |
| Current GPT-5.6/Codex guidance | Lean prompts, native intent inference, hierarchical instructions, skills, subagents, eval-based tuning | Still workload-dependent; internal directional figures are not a BLP guarantee |

The defensible conclusion is not that orchestration is obsolete. It is that
orchestration should concentrate on state, authority, isolation, interfaces,
and verification. Semantic navigation should remain with the model unless a
BLP-specific evaluation proves a deterministic selector is better.
