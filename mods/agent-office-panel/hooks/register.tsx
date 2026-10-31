import { atom, read, update } from 'claude-code'
import type { AgentInfo, Register } from 'claude-code'

const PANE = 'agent-office'
// Bumped whenever something agent-related happens, so the pane redraws.
const tick = atom({ plugin: 'agent-office-panel', key: 'tick' } as const, 0, { shape: 'tick-1' })

const MARK: Record<string, string> = {
  pending: '…',
  running: '▶',
  waiting: '!',
  idle: '·',
  completed: '✓',
  failed: '✗',
  killed: '■',
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'office-panel', description: 'Show this session’s agents and their statuses in a panel' })
    return next(e)
  })

  on('command.run', { command: 'office-panel' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Agent Office' })
    return { text: 'Agent Office panel opened. The full isometric office: /agent-office:office' }
  })

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    await update($, tick, n => n + 1)
    return r
  })

  on('tool.call', async ($, e, next) => {
    const r = await next(e)
    await update($, tick, n => n + 1)
    return r
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    await read($, tick)
    const agents: AgentInfo[] = await $.agent.list()
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 3)
    const active = agents.filter(a => a.status === 'running' || a.status === 'waiting' || a.status === 'pending')
    return (
      <Box flexDirection="column">
        <Text bold>
          {active.length} active · {agents.length} total
        </Text>
        {agents.length === 0 && <Text dimColor>No subagents yet.</Text>}
        {agents.slice(-room).map(a => (
          <Text dimColor={a.status === 'completed' || a.status === 'idle'} color={a.status === 'failed' ? 'red' : a.status === 'waiting' ? 'yellow' : undefined}>
            {MARK[a.status] ?? '?'} {a.type.padEnd(16).slice(0, 16)} {a.status.padEnd(9)} {a.description}
          </Text>
        ))}
      </Box>
    )
  })
}
