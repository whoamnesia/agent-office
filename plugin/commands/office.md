---
description: Open the Agent Office (starts the local daemon if needed and prints the URL)
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/bin/agent-office" start --open --data "${CLAUDE_PLUGIN_DATA}"`

Reply with exactly one short line. If the output above contains a URL, give it as a clickable link and say it's the Agent Office. If it says the daemon couldn't start, show that message and the log path. Don't add anything else.
