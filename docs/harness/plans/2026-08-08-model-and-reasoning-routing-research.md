# Model And Reasoning Routing Research

Date: 2026-08-08
Initial test: Codex `0.144.5`
Upgrade retest: Codex `0.147.0`

## Conclusion

For the BLP harness, set the model and reasoning effort explicitly in the
Runner's App Server `turn/start` request. The recommended first pilot is
`gpt-5.6-luna` with `effort: "max"`: it matches the desired quality/cost bias,
and this exact pair has been accepted by a live local `0.144.5` App Server run.

Do not rely on native Codex subagent defaults to control BLP stages. The BLP
Runner creates its own App Server threads and turns, so native `[agents]`,
custom-agent roles, and `spawn_agent` routing are a separate execution path.

```json
{
  "method": "turn/start",
  "params": {
    "threadId": "<thread-id>",
    "input": [{ "type": "text", "text": "<stage prompt>" }],
    "model": "gpt-5.6-luna",
    "effort": "max"
  }
}
```

The official App Server reference documents per-turn `model` and `effort`
overrides. It also notes that supplied turn settings become defaults for later
turns on the same thread. BLP should nevertheless send both fields on every
stage turn so the run record is explicit and independent of personal config.

## Codex 0.145.0 Update

The native subagent configuration changed at the `0.144.5` to `0.145.0`
boundary. The official `0.145.0` release stabilizes the opt-in multi-agent V2
experience and its tagged configuration schema accepts both default-routing
keys under `[agents]`:

```toml
[agents]
enabled = true
default_subagent_model = "gpt-5.6-luna"
default_subagent_reasoning_effort = "max"
```

On `0.145.0`, these defaults apply when a native spawn does not provide an
explicit model or reasoning effort; explicit spawn values take precedence.
The implementation also covers job workers, full-history forks, and roles that
do not set their own model. This removes the relevant `0.144.5` routing and
`fork_turns = "all"` limitations described below. Restart Codex or begin a new
session after changing the configuration.

This release conclusion is based on the tagged schema, release notes, and
merged regression tests. A later local retest on `0.147.0` is recorded below.

## Local Codex 0.147.0 Verification

After the local upgrade, `codex --version` reports `codex-cli 0.147.0`, and
`codex doctor` reports that `0.147.0` is the latest cached release. The stable
`multi_agent` feature is enabled. The older `multi_agent_v2` feature switch is
listed separately and disabled, so new configuration should use the stable
`[agents]` surface instead of restoring the `0.144.5` workaround by default.

A read-only diagnostic run supplied these temporary command-line overrides:

```toml
agents.enabled = true
agents.default_subagent_model = "gpt-5.6-luna"
agents.default_subagent_reasoning_effort = "max"
```

`codex doctor --json` accepted them, loaded configuration successfully, and
returned overall status `ok`. This verifies that the upgraded binary recognizes
the settings without editing the user's configuration.

The active `C:\Users\stati\.codex\config.toml` does not yet contain an
`[agents]` table or either default. Until those settings are added and a new
session begins, native subagents fall through to the parent's model and effort.

A subsequent ephemeral, read-only CLI probe treated the command-line overrides
as its test configuration. Its parent ran Luna at low effort, called
`spawn_agent` without model or effort fields, waited for the child, and received
`CHILD_OK`; the parent then returned `PARENT_OK`. This proves that the upgraded
native spawn path accepts and executes with the configured defaults in place.
The CLI JSON events do not expose the child's resolved model/effort metadata, so
the exact Luna/max value rests on the documented resolution rule plus the
accepted configuration rather than a model field printed in the trace.

## Codex 0.144.5 Findings

### Model catalog and supported effort

The bundled `0.144.5` model catalog selects different native multi-agent
runtimes:

| Model | Catalog multi-agent runtime | Observed/advertised effort choices |
| --- | --- | --- |
| `gpt-5.6-sol` | `v2` | model-dependent |
| `gpt-5.6-terra` | `v2` | model-dependent |
| `gpt-5.6-luna` | `v1` | `low`, `medium`, `high`, `xhigh`, `max` |

The public Subagents documentation describes Luna as suitable for fast,
narrowly scoped, repeatable, or high-volume agents. That makes Luna + max a
reasonable BLP hypothesis, not a proven cost optimum. Confirm it with several
real stages and compare elapsed time, token use, review rejection, and rework
against the current Sol/xhigh baseline before changing every stage.

### Native multi-agent v2 schema

In the `0.144.5` tag, the v2 defaults are effectively:

- tool namespace: `collaboration`
- `hide_spawn_agent_metadata = true`

With metadata hidden, the model-visible spawn schema omits `agent_type`,
`model`, `reasoning_effort`, and `service_tier`. This explains why merely asking
the model to choose Luna/max may not expose fields with which it can do so.

For experiments that use native Codex v2 subagents, the local schema workaround
is:

```toml
[features.multi_agent_v2]
enabled = true
tool_namespace = "agents"
hide_spawn_agent_metadata = false
```

`tool_namespace = "agents"` and `hide_spawn_agent_metadata = false` are a
native Codex v2 tool-schema workaround; they are not model defaults. Sol/Terra's
catalog `v2` selector can activate v2 option loading even when the local feature
flag was not explicitly enabled, while `codex features list` can still report
the flag as `false`. Set `enabled = true` when deliberately opting into the
feature so configuration and diagnostics agree.

When overriding a native child's model or effort, use `fork_turns = "none"` or
a partial recent-turn count. A full-history `fork_turns = "all"` inherits the
parent configuration and does not provide the independent model/effort routing
needed here.

### Version skew and current bugs

The official `0.145.0` release accepts `agents.default_subagent_model` and
`agents.default_subagent_reasoning_effort`, but the installed `0.144.5` strict
configuration parser rejects both keys. They must not be added to this machine's
active config until Codex is upgraded to at least `0.145.0`.

Custom agent roles are also unsafe as a routing mechanism on this version.
[openai/codex#32831](https://github.com/openai/codex/issues/32831) records a bug
where a role that leaves model/effort unset can discard explicit spawn
overrides. Prefer direct App Server fields for BLP and direct untyped native
spawns for experiments until the issue is fixed and verified locally.

## Recommended BLP Routing

Start with one explicit default and retain per-stage overrides:

```json
{
  "defaults": {
    "model": "gpt-5.6-luna",
    "reasoning_effort": "max"
  },
  "stages": {}
}
```

The Runner should translate `reasoning_effort` in repo metadata to App Server's
`effort` field and record the requested and effective values in stage trace
metadata. Fail before starting work if either requested value is rejected; do
not silently fall back to the user's global model.

The first evaluation should run representative stages rather than a synthetic
prompt:

1. one runtime-heavy investigation;
2. one adversarial RCA or code review;
3. one bounded implementation slice;
4. one mechanical finalize/archive stage.

Keep Luna/max only if the evidence shows acceptable artifact quality and review
outcomes. After that, cheaper efforts can be tested for mechanical stages, but
stage-specific routing is a later optimization, not required for the first
upgrade.

## Matt Skill Patterns Worth Adapting

The installed Matt skills are useful source material, but should not become a
Runner dependency. Their strongest reusable patterns are:

- preserve one coherent design context through planning, then start each
  implementation ticket in a fresh context (`ask-matt/SKILL.md:28-32`);
- use primary sources and a cited research artifact
  (`research/SKILL.md:6-12`);
- split work into independently verifiable vertical tracer bullets with
  explicit blocking edges, including expand-migrate-contract for wide
  refactors (`to-tickets/SKILL.md:25-40`);
- review Standards and Spec as separate axes so one cannot mask the other
  (`code-review/SKILL.md:6-11`, `76-89`);
- use a low-resolution map as an index and load detailed decisions only on
  demand (`wayfinder/SKILL.md:19-29`, `117-125`);
- keep handoffs small by linking canonical artifacts rather than duplicating
  them (`handoff/SKILL.md:8-14`).

BLP already adapts several of these ideas through canonical stage artifacts,
vertical TDD slices, separate review stages, and selective reading of old run
archives. Do not copy the Matt flow verbatim because it conflicts with BLP in
important places: interactive grilling cannot run unattended, Matt's
`implement` commits before BLP's human merge gate, Matt may treat the tracker as
canonical while BLP treats the repo as truth, and its fixed 100K/120K context
heuristics are not validated for the new models.

The practical borrowing rule is: copy the planning question or review axis into
a repo-owned BLP stage/guide only after adapting it to Plane state gates,
Publish Plans, runtime evidence, and independent stage threads.

## Sources

Official documentation:

- [Codex Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Codex `0.144.5` release tag](https://github.com/openai/codex/releases/tag/rust-v0.144.5)
- [Codex `0.145.0` release tag](https://github.com/openai/codex/releases/tag/rust-v0.145.0)
- [`0.145.0` tagged configuration schema](https://github.com/openai/codex/blob/rust-v0.145.0/codex-rs/core/config.schema.json)
- [#33550: unify multi-agent settings under `[agents]`](https://github.com/openai/codex/pull/33550)
- [#33631: honor configured model defaults for spawned agents](https://github.com/openai/codex/pull/33631)
- [`0.144.5` bundled model catalog](https://github.com/openai/codex/blob/rust-v0.144.5/codex-rs/models-manager/models.json)
- [`0.144.5` multi-agent configuration source](https://github.com/openai/codex/blob/rust-v0.144.5/codex-rs/core/src/config/mod.rs)
- [`0.144.5` model-visible multi-agent schema](https://github.com/openai/codex/blob/rust-v0.144.5/codex-rs/core/src/tools/handlers/multi_agents_spec.rs)
- [`0.144.5` v2 spawn implementation](https://github.com/openai/codex/blob/rust-v0.144.5/codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs)

Relevant implementation reports:

- [#32831: custom agent roles discard explicit model/reasoning overrides](https://github.com/openai/codex/issues/32831)
- [#32031: v2 spawn schema hides routing metadata](https://github.com/openai/codex/issues/32031)
- [#32705: catalog-selected v2 and feature-flag/runtime mismatch](https://github.com/openai/codex/issues/32705)

Local claims in this note are scoped to the installed `0.144.5` binary and the
live BLP Runner App Server probe. Recheck strict config parsing and native
subagent behavior after every Codex upgrade.
