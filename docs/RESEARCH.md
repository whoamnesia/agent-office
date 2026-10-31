# Research notes

This is what the design rests on. Facts checked on a live session are in [VERIFIED.md](VERIFIED.md).

## Data sources, ranked

| Source | Live? | Granularity | Used for |
|---|---|---|---|
| **Plugin hooks** (`hooks/hooks.json`) | yes, synchronous with the tool loop | per tool call, per subagent | the single source of truth for the office |
| Transcripts `~/.claude/projects/<cwd-slug>/<session>.jsonl` (+ `<session>/subagents/agent-<id>.jsonl`) | written asynchronously, may lag | per message, includes `usage` | token totals, history, replay, gap filling |
| Status line JSON (`statusLine` in the user's settings) | refreshed by the CLI | per session: `cost.total_cost_usd`, `context_window.*` | optional cost ticks; a plugin can't install it, so it's opt-in in the README |
| Mods (`$.agent.list()`, CLI ≥ 2.1.287) | yes | subagent statuses as text | an optional text panel inside the terminal; can't draw isometric graphics, not available in the cloud |
| Cloud sessions (Claude Code on the web) | **no public live API** | – | handled by the relay (hooks inside the cloud VM POST outward), teleport, or transcript import |

## Hook → event mapping

Implemented in `packages/protocol/src/mapping.ts`. It's pure and dependency-free so it can be bundled into the hook binary.

| Hook | Office events |
|---|---|
| SessionStart | `session.start`, `agent.spawn(main, director)`, `agent.status(idle)` |
| UserPromptSubmit | director → `thinking` |
| PreToolUse | `tool.call{name,target,dept}` + status by tool (Read/Grep/Glob → reading, Edit/Write → writing, Bash → running, Web* → searching, other → thinking) |
| PostToolUse / PostToolUseFailure | `tool.result{ok,duration_ms}` + status `thinking` / `error` (interrupts aren't errors) |
| PermissionRequest, Notification(permission_prompt) | `waiting_user` + `notify` |
| Notification(idle_prompt), Stop | director → `idle` |
| SubagentStart / SubagentStop | `agent.spawn` / `agent.status(done)` + `agent.end` |
| TaskCreated / TaskCompleted | kanban `task.created` / `task.completed` |
| SessionEnd | `session.end` |

When a subagent spawns, its parent is inferred in the world model. The `Agent` tool call that came right before `SubagentStart` in the same session names the parent. The payload doesn't carry a parent id.

## Privacy model

- By default only metadata leaves the hook: tool name, project-relative path, status, and the department hint.
- Bash shows only the program name (`npm …`).
- Prompts, file contents, tool responses and assistant messages are never read into events (there's a unit test for this).
- `showContent` adds masked, truncated command lines, queries and agent descriptions.
- `hidePaths` reduces paths to their extension.
- `maskSecrets` runs over every displayed string: bearer tokens, `KEY=…`, `--token=…`, known key prefixes, long base64 runs, and `user:pass@` in URLs.
- A project is identified by an FNV hash of its path plus the folder name. The full path never leaves the machine.

## Departments

The department is classified in the emitter, because only there is the full path available, even when `hidePaths` is on. The rules are an ordered glob/command/tool list (`DEFAULT_DEPT_RULES`), and they can be replaced through `deptRules` in `agent-office.config.json`.

## Cloud reality check

- The hooks of a cloud session run **inside the cloud VM**. Its `localhost` isn't yours, and egress follows the environment's network policy (an allowlist).
- So the cloud path is: hook → `ao-emit` → HTTPS POST to a relay you host → your local daemon subscribes to the relay over SSE.
- The relay host has to be added to the environment's *Allowed domains*. Its URL and token come from the environment's variables or secrets, not from the repository.
- `claude --teleport <id>` brings a cloud session into the local terminal. From then on the normal local hooks apply.

## Rendering choices

- **PixiJS v8 (WebGL).** Static layers are baked into textures. Lighting is a full-screen composite pass: scene × ambient(time of day) + light map, with bloom from a ¼-resolution light buffer, plus vignette and grain. The emissive layer (screens, neon, lit windows) is drawn on top, after lighting. That's why night is "real" instead of a darkening overlay.
- **Assets** are generated procedurally and deterministically (`packages/asset-gen`, @napi-rs/canvas), with soft shading but without baked lighting.
- **UI** is a DOM overlay. It's accessible, keeps text crisp, and works with the keyboard. In-scene name tags are Pixi text.
