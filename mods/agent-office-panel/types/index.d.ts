export type Tick = number

declare module 'claude-code' {
  interface PluginState {
    'agent-office-panel': { tick: Shaped<Tick> }
  }
}
