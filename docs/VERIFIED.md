# Empirically verified facts

Environment: Claude Code **2.1.314**, Node 22.22, Linux. These runs were made **inside a Claude Code cloud session** (`CLAUDE_CODE_REMOTE=true`), with nested `claude -p` sessions started from it.

Legend: ✅ confirmed on a real run · ⚠️ partly confirmed / with caveats · ❌ could not be verified, with the reason.

## Hooks

| # | Claim | Result | Evidence |
|---|---|---|---|
| H1 | `agent_id` / `agent_type` are present in **PreToolUse/PostToolUse/PostToolUseFailure** when the tool is called by a subagent | ✅ They are present, so there's no need to correlate through the subagent transcript. For the main agent they're absent. | `tests/fixtures/hooks/real-session-subagent.jsonl` (the subagent's Read and Bash lines) |
| H2 | Common fields `session_id, transcript_path, cwd, hook_event_name, permission_mode` | ✅ Also present, though undocumented: `prompt_id`, `effort`, `scratchpad_dir`. `permission_mode` is missing on SubagentStart, SessionStart, SessionEnd and Task*. | same |
| H3 | PostToolUse has `duration_ms` and `tool_response` | ✅ We drop `tool_response` and never forward it. | same |
| H4 | PostToolUseFailure fields | ✅ `error`, `is_interrupt`, `duration_ms`, `agent_id`, `agent_type` | same (a Read of a missing file) |
| H5 | SubagentStop has `agent_transcript_path`, `last_assistant_message` | ✅ Also `stop_hook_active`, `background_tasks`, `session_crons`. | same |
| H6 | TaskCreated / TaskCompleted | ✅ Fields `task_id`, `task_subject`, `task_description`. TaskCompleted fires on `TaskUpdate status=completed`. | same |
| H7 | PermissionRequest | ✅ Fires when the tool isn't allowed in `-p` mode (Write), with `permission_suggestions`. | `real-session-permission.jsonl` |
| H8 | Notification (`permission_prompt`, `idle_prompt`) | ⚠️ **Didn't fire in headless `-p` mode** even when a permission was needed. Mapped from the documented fields and covered by unit tests, but not observed live. | – |
| H9 | Event order around a subagent | ✅ PreToolUse(Agent) → SubagentStart → … → SubagentStop → PostToolUse(Agent). For a background (parallel) subagent, PostToolUse(Agent) arrives right after the spawn, before the subagent finishes. | `tests/fixtures/sse/real-session-two-subagents.jsonl` |
| H10 | `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` in hooks | ✅ Both are set as environment variables in hook processes. With `--plugin-dir`, the data dir is `~/.claude/plugins/data/<name>-inline`. | the logger dumped its environment |
| H11 | `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` in **commands** (`!` blocks) | ✅ / ⚠️ Both are **substituted in the command text**, but **not set as environment variables** of the `!` process. That's why the commands pass `--data "${CLAUDE_PLUGIN_DATA}"`. Without it, the hook-started daemon and the command-started daemon would use different directories (two daemons; this was reproduced). | `/cmdprobe:p` run |
| H12 | Exit code / stdout | ✅ `ao-emit` prints nothing and always exits 0; tested on garbage, empty and partial input. | `tests/integration/pipeline.test.ts` |
| H13 | Nested `claude -p` from inside a session | ⚠️ The child **inherits the parent's `session_id`**, even with `CLAUDE_CODE_SESSION_ID` unset, and writes into the parent's task list. So "two parallel real sessions" were tested with distinct synthetic `session_id`s (demo and unit tests), not with two independent CLIs. | probe 2 |

## Performance (hooks must not slow Claude Code)

| Measurement | Value |
|---|---|
| `node -e 0` (bare Node start) | 34 ms median |
| `ao-emit` end to end (stdin → POST → exit) | **38 ms median, 52 ms p95**, measured on 20 runs with the V8 compile cache on |
| Hook → daemon → SSE client (real session, 39 events) | **median 8 ms, max 11 ms** |
| Real session: 2 parallel subagents, all hooks on | finished normally, no hook errors in the output |

## Transcripts

| Claim | Result |
|---|---|
| Path `~/.claude/projects/<cwd with / → ->/<session>.jsonl` | ✅ e.g. `-home-user-agent-office/<id>.jsonl` |
| Subagents in `<session>/subagents/agent-<agentId>.jsonl` | ✅ Also `.meta.json` (`agentType`, `description`, `toolUseId`, `spawnDepth`) and `.prefix.json`. |
| Line fields `parentUuid, isSidechain, agentId, uuid, sessionId` | ✅ `agentId` and `isSidechain: true` only in subagent files. |
| Token usage | ✅ At `message.usage` (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, …). |
| Link from an Agent call to its subagent | ✅ The main transcript's `toolUseResult.agentId` on the Agent `tool_result`. |
| Other line types | `queue-operation`, `attachment`, `atis-latch`, `last-prompt`, `tools-used`, `cost-state`, `system`. All of them are ignored. |

## Plugin packaging

| Claim | Result |
|---|---|
| `claude plugin validate ./plugin` | ✅ Passes. The only remark is a directory-profile warning about a missing icon, fixed by `.claude-plugin/icon.png`. |
| `.claude-plugin/marketplace.json` at the repo root | ✅ `claude plugin validate .` passes. `claude plugin marketplace add ./` plus `claude plugin install agent-office@agent-office` works (tested in an isolated `CLAUDE_CONFIG_DIR`). |
| `claude --plugin-dir ./plugin` with real hooks | ✅ Sessions show up in the office. |
| `/agent-office:office` in headless mode | ✅ Prints the URL, and the daemon starts detached. |

## Cloud (Claude Code on the web)

| Claim | Result |
|---|---|
| Cloud hooks run **inside the cloud VM** | ✅ Indirectly: these probes ran inside a cloud VM, and the plugin hooks of the nested CLI executed there and wrote to the VM's filesystem. |
| Outbound HTTPS from the cloud VM to a relay | ❌ **Not verified.** I didn't run a probe POST to third-party hosts from this VM: the session's permission policy refuses it as possible exfiltration, and I didn't try to get around that. Per the platform docs, egress is governed by the environment's network access level and *Allowed domains*. The relay host has to be allowed there. |
| Relay end to end (emitter → relay → daemon) | ✅ Locally, with the Node relay and an emulated cloud emitter (`AO_RELAY_URL`, `AO_RELAY_TOKEN`). See `tests/integration/relay.test.ts`. |
| Cloudflare Worker variant | ⚠️ The Durable Object class is unit-tested in Node against Web-standard `Request`/`Response`. **Not deployed:** there's no Cloudflare account in this environment. |

## Browser UI and rendering

| Claim | Result |
|---|---|
| `npm run demo` shows a live office in under 5 s | ✅ The daemon is ready in about 0.2 s. The UI reports `ready` **1.0–1.4 s** after page load in headless Chromium, and the Playwright test asserts less than 5 s. |
| Status changes reach the UI within about 1 s | ✅ Hook to SSE takes 8–11 ms on a real session (see above). The UI applies events as they arrive. |
| Day/night: 15-minute cycle, smooth, manual switch | ✅ Unit tests check the cycle period and the smoothness of the ambient gradient. Playwright clicks Day/Night and presses `N`. Screenshots in `docs/screens/`. |
| 60 FPS with 20 agents and about 60 NPCs | ❌ **Not verifiable here: there is no GPU.** Under SwiftShader (software WebGL) the full scene runs at about 2 FPS. JS work per frame is about 20 ms; the rest is software rasterisation. The simulation uses sub-steps, so it stays correct at any FPS. Auto quality drops to 30 FPS and cheaper lighting when the measured FPS is below 40. |
| No `eval` under a strict CSP | ✅ The page is served with `script-src 'self'`; Pixi runs through `pixi.js/unsafe-eval`, which swaps in static code paths. |
| Terminal mod (`mods/agent-office-panel`) | ⚠️ `claude plugin validate` passes and the module type-checks against the engine's `claude-code.d.ts` (2.1.314). It was **not loaded live**: enabling mods needs the user's confirmation in an interactive session. |
| Status line script | ✅ Prints a line and forwards `cost.total_cost_usd` as `cost.tick` (manual run with sample JSON). Not installed into real user settings. |
