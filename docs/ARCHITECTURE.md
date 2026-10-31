# Architecture

```
Claude Code (local)            Claude Code (cloud VM)
  hooks/hooks.json               .claude/settings.json  ← written by `agent-office init-cloud`
        │                                │
  bin/ao-emit (CJS, no deps)     .claude/agent-office/ao-emit.cjs --relay-only
   stdin JSON → hookToEvents()           │  HTTPS POST + Bearer (AO_RELAY_URL / AO_RELAY_TOKEN)
   POST 127.0.0.1 (300 ms)               ▼
   └─ on failure → spool.jsonl     relay (Node or Cloudflare Durable Object)
        │                                │  SSE /stream
        ▼                                ▼
  daemon (127.0.0.1 only) ◄──────── RelayClient (source = cloud)
   zod validation · ring buffer · events.jsonl journal · spool replay
   token + Origin + Host checks · token totals from local transcripts
   SSE /stream · /snapshot · /config · /replay · /demo · static UI
        │
        ▼
  office-web (Vite + PixiJS 8, WebGL)
   World (office-core) ← events          NpcSim, TrafficSim ← clock
   Scene: sky · parallax skyline · baked ground · sorted objects · buildings/interiors
          light buffer → composite shader (ambient × albedo + lights, bloom, grading)
   DOM HUD: team list, agent card, timeline/replay, minimap, settings, toasts
```

## Packages

| Package | Role | Depends on |
|---|---|---|
| `protocol` | zod schemas (`v: 1` on every event), hook → event mapping, privacy filters, department rules, name generator, tolerant transcript reader | zod (the schemas only; the mapping is dependency-free and bundled into the hook binary) |
| `daemon` | `ao-emit` (hook handler), the daemon itself, the `agent-office` CLI (`start`/`stop`/`status`/`url`/`replay`/`init-cloud`/`relay`), the demo generator, the relay client | protocol |
| `relay` | web-standard relay core with Node and Cloudflare Worker + Durable Object front ends | protocol |
| `office-core` | the world model, pure and deterministic. Covers floor/city plans, A* with blocked edges for glass walls, worker behaviour, NPC utility AI with schedules and queues, traffic, the day cycle and seasons | protocol |
| `office-web` | the renderer and the UI | office-core, pixi.js 8.22 |
| `asset-gen` | deterministic procedural sprite atlases, skyline layers and the plugin icon | @napi-rs/canvas |

Everything that ships is under `plugin/`: `bin/ao-emit`, `bin/ao-daemon`, `bin/agent-office`, `dist/daemon.mjs`, `dist/cli.mjs`, `dist/relay.mjs` and `dist/web/`. It is built by `npm run build` and committed, so installing from the marketplace needs no build step.

## Mapping the data onto the world

- **Project → tower.** Keyed by an FNV hash of the project dir. There are three lots; the third is reserved for the *Cloud Branch*. A fourth and later local projects share the second tower.
- **Session → storey.** The newest storey is the open one. Older storeys show closed façades with lit windows at night. Up to 5 storeys per tower.
- **Agent → worker.** The main agent is the *director* in the glass office. A subagent comes out of the elevator and walks to a desk in its department.
- **Department.** Picked by majority vote over the `dept` hints on tool calls: glob and command rules in the emitter, configurable through `deptRules`.
- **Rooms.** A long-running `running` status sends the worker to the server room, `searching` to the analytics room with the red-thread board. A subagent spawned by another subagent meets its parent in the meeting room. Hysteresis keeps workers from pacing back and forth.
- **Leaving.** On end the worker carries a document to the Outbox, celebrates and leaves. Late hook events for an ended agent are ignored (regression test: *late hook events never resurrect a worker*).

## Rendering

- **Art scale.** Tile is 32×16 art px. Zoom snaps to integer ratios once the user stops zooming (nearest filtering, `roundPixels`).
- **Static content.**
  - Ground is baked into 24×24-tile chunk textures; water stays as animated sprites.
  - Each storey's floor, back walls and wall decor are baked once into a shared shell texture.
  - Furniture, glass partitions, characters and NPCs are depth-sorted by `x + y` of the footprint centre, with small biases so a chair back covers or sits behind its worker.
- **Lighting.** The scene is rendered into `sceneRT`. Lights render into a quarter-resolution `lightRT`: radial cookies for lamps, monitors (tinted by the agent's status), lit windows, headlights, the guard's flashlight and the neon. A full-screen mesh shader then computes:
  - `albedo × (ambient(time) + light × strength)`;
  - a soft-knee tone map;
  - bloom from the light buffer;
  - violet-blue lift of the shadows;
  - saturation and warmth grading, fog, vignette and grain.

  Nothing is baked into the sprites, so day and night are a real relighting, not an overlay.
- **Cast shadows** are hull polygons of each tower, tree and lamp projected along the sun vector. They swing from west to east during the day and fade at night.
- **Unlit overlays** sit above the composite: status icons, particles and screen-space name tags. Building labels appear on the overview.

## Resilience and security

- `ao-emit` always exits 0 and never writes to stdout or stderr. It has a hard 1.5 s stop and spools to disk when the daemon is down. The daemon drains the spool every 1.5 s.
- The daemon listens on `127.0.0.1` only. It requires the token (header or `?t=`) on every data route.
  - It rejects foreign `Origin`s (403) and non-loopback `Host` headers (421, a DNS-rebinding guard).
  - Request bodies are limited to 512 KB (16 MB for `/replay`).
  - The UI ships a strict CSP without `eval` (Pixi's `unsafe-eval` shim swaps in static code paths), plus `no-referrer` and `frame-ancestors 'none'`.
- The UI strips the token from the address bar after reading it. When the stream drops it shows *Offline* and reconnects with backoff; the NPC and traffic simulation keeps running in the meantime.
- Relay tokens must be at least 16 characters and are compared in constant time. The relay rate-limits requests (token bucket) and caps the body size. Transcript paths are stripped before anything is stored.

## Tests

| Suite | What it proves |
|---|---|
| `tests/unit/protocol.test.ts` | mapping on **real captured hook payloads**, privacy (no prompt, output or secret leaks), departments, schema validation, transcript parsing |
| `tests/unit/office-core.test.ts` | every desk and room is reachable, glass partitions block movement, the worker lifecycle, parent inference and meetings, floors and buildings, catch-up, the day cycle (smooth, 15 min), seasons |
| `tests/integration/pipeline.test.ts` | hook → `ao-emit` → daemon → SSE in under 1 s; spool replay; security responses; journal restore; demo toggle |
| `tests/integration/relay.test.ts` | `init-cloud` output; emulated cloud emitter → relay → daemon (`source: cloud`); the Worker + Durable Object on web APIs; rate and size limits |
| `tests/e2e/smoke.spec.ts` (Playwright) | office live in under 5 s, token stripped from the URL, Day/Night/Auto buttons and the `N` key, agent card, replay ↔ live, screenshots of every phase, no console errors, dialog closes with Escape |
