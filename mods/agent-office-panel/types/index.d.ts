/** What the office shows an agent doing: the statuses of packages/protocol. */
export type Status = 'thinking' | 'reading' | 'writing' | 'running' | 'searching' | 'waiting_user' | 'error' | 'done' | 'idle'

/** One agent's activity, as the hooks saw it. `main` is the director (the main loop). */
export type AgentView = { status: Status; tool: string; calls: number }

export type Board = Record<string, AgentView>

declare module 'claude-code' {
  interface PluginState {
    'agent-office-panel': { board: Shaped<Board> }
  }
}
