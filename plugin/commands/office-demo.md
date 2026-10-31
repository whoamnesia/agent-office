---
description: Open the Agent Office in demo mode (simulated agents, no real session needed)
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/bin/agent-office" start --demo --open --data "${CLAUDE_PLUGIN_DATA}"`

Reply with exactly one short line. If the output above contains a URL, give it as a clickable link and say the Agent Office demo is running there. If it reports an error, show it. Don't add anything else.
