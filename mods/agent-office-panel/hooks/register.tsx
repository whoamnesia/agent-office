import { atom, read, update } from 'claude-code'
import type { AgentInfo, Register } from 'claude-code'
import type { AgentView, Board, Status } from '../types'
import { MAX_DESKS, OFFICE_RATIO, WORD, officeSvg, type Worker } from './office-svg'

const PANE = 'agent-office'
const MAIN = 'main'
const board = atom({ plugin: 'agent-office-panel', key: 'board' } as const, {} as Board, { shape: 'board-1' })

/** The protocol's tool → status mapping (packages/protocol/src/mapping.ts). */
function toolStatus(tool: string): Status {
  switch (tool) {
    case 'Read': case 'Grep': case 'Glob': case 'LS': case 'NotebookRead':
      return 'reading'
    case 'Edit': case 'Write': case 'MultiEdit': case 'NotebookEdit':
      return 'writing'
    case 'Bash': case 'PowerShell': case 'Monitor':
      return 'running'
    case 'WebSearch': case 'WebFetch':
      return 'searching'
    default:
      return tool.startsWith('mcp__') ? 'searching' : 'thinking'
  }
}

const set = (id: string, patch: Partial<AgentView>) =>
  (b: Board): Board => {
    const was: AgentView = b[id] ?? { status: 'idle', tool: '', calls: 0 }
    return { ...b, [id]: { ...was, ...patch } }
  }

/** A subagent's status: the engine's lifecycle first, the hooks' detail while it runs. */
function statusOf(a: AgentInfo, seen: AgentView | undefined): Status {
  switch (a.status) {
    case 'completed': return 'done'
    case 'failed': case 'killed': return 'error'
    case 'waiting': return 'waiting_user'
    case 'idle': return 'idle'
    case 'pending': return 'thinking'
    default: return seen?.status === 'done' || seen?.status === 'idle' ? 'thinking' : seen?.status ?? 'thinking'
  }
}

const ACTIVE = new Set(['running', 'waiting', 'pending'])
/** A board write that never fails the hook it rides in: the panel is decoration, the tool call is not. */const mark = ($: Parameters<typeof update>[0], fn: (b: Board) => Board) => update($, board, fn).then(() => undefined, () => undefined)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'office-panel', description: 'Show this session’s agents as a mini office in a panel' })
    return next(e)
  })

  on('command.run', { command: 'office-panel' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Agent Office' })
    return { text: 'Agent Office panel opened. The full isometric office: /agent-office:office' }
  })

  // ── data: who is doing what ──────────────────────────────────────────────
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) await mark($, set(MAIN, { status: 'thinking', tool: '' }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    const id = e.agentId ?? MAIN
    await mark($, set(id, { status: e.reason === 'error' ? 'error' : id === MAIN ? 'idle' : 'done' }))
    return r
  })

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if ('agentId' in r && r.agentId) await mark($, set(r.agentId, { status: 'thinking', tool: '' }))
    return r
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId ?? MAIN
    await mark($, b => set(id, { status: toolStatus(e.tool), tool: e.tool, calls: (b[id]?.calls ?? 0) + 1 })(b))
    const r = await next(e)
    await mark($, set(id, { status: r.isError ? 'error' : 'thinking' }))
    return r
  })

  on('classic.PermissionRequest', async ($, e, next) => {
    await mark($, set(e.agent_id ?? MAIN, { status: 'waiting_user' }))
    return next(e)
  })

  // ── drawing ──────────────────────────────────────────────────────────────
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text } = els
    const seen = await read($, board)
    const agents: AgentInfo[] = await $.agent.list()
    const active = agents.filter(a => ACTIVE.has(a.status))

    const workers: Worker[] = agents.map(a => {
      const st = statusOf(a, seen[a.id])
      const tool = ACTIVE.has(a.status) ? seen[a.id]?.tool : ''
      return { id: a.id, label: a.name ?? a.type, detail: [tool, a.description].filter(Boolean).join(' · '), status: st }
    })
    // Desks go to the running ones first, then the most recent finished.
    const desks = [...workers.filter((_, i) => ACTIVE.has(agents[i]!.status)), ...workers.filter((_, i) => !ACTIVE.has(agents[i]!.status)).reverse()]
      .slice(0, MAX_DESKS)
    const main = seen[MAIN]
    const director: Worker = { id: MAIN, label: 'Директор', detail: main?.tool ?? '', status: main?.status ?? 'idle' }

    const header = (
      <Text bold>
        {active.length} активных · {agents.length} всего · директор {WORD[director.status]}
      </Text>
    )
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 3)
    const list = agents.slice(-room).map((a, i, shown) => {
      const w = workers[agents.length - shown.length + i]!
      return (
        <Text dimColor={w.status === 'done' || w.status === 'idle'} color={w.status === 'error' ? 'red' : w.status === 'waiting_user' ? 'yellow' : undefined}>
          {w.label.padEnd(16).slice(0, 16)} {WORD[w.status].padEnd(9)} {a.description}
        </Text>
      )
    })

    if ('Svg' in els) {
      const { Svg } = els
      const width = Math.min(720, Math.max(260, (e.props.bodyColumns ?? 40) * 8))
      const alt = `Мини-офис: директор ${WORD[director.status]}, ${active.length} активных агентов из ${agents.length}`
      return (
        <Box flexDirection="column" gap={1}>
          {header}
          <Svg source={officeSvg(director, desks)} alt={alt} width={width} height={Math.round(width * OFFICE_RATIO)} isInteractive />
          {list.length > 0 ? list : <Text dimColor>Субагентов пока нет. Полный офис: /agent-office:office</Text>}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {header}
        {agents.length === 0 && <Text dimColor>Субагентов пока нет.</Text>}
        {list}
      </Box>
    )
  })
}
