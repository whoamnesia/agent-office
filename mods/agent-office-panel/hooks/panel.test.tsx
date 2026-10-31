import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'agent-office-panel',
  component: 'Pane',
  requestId: 'agent-office',
  props: {
    title: 'Agent Office',
    isFocused: false,
    bodyColumns: 48,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const AGENTS = [
  { id: 'a1', type: 'Explore', description: 'map the repo', status: 'running' },
  { id: 'a2', type: 'Plan', description: 'design the fix', status: 'completed' },
] as const

test('a subagent at work shows as a desk on desktop and a row in the terminal', async ($, on) => {
  on('command.register', () => ({ value: { command: 'office-panel' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [...AGENTS] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  let release = () => {}
  on('tool.call', (_, e) => (e.tool === 'Edit' ? new Promise(r => (release = () => r({ result: {} }))) : { result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // The subagent's Edit is still running while the panel draws.
  const pending = $.tool.call({ tool: 'Edit', file_path: '/x.ts', old_string: 'a', new_string: 'b', agentId: 'a1' })

  for (let i = 0; i < 50; i++) await Promise.resolve()
  const desk = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await desk.find({ type: 'Text', text: /1 активных · 2 всего/ }))?.text).toContain('директор')
  const svg = await desk.find({ type: 'Svg' })
  expect(svg).toBeTruthy()
  const props = (svg as unknown as { props: { source: string; alt: string } }).props
  expect(props.source.startsWith('<svg')).toBe(true)
  expect(props.source.length).toBeLessThan(131072)
  expect(props.source).toContain('Explore · пишет · Edit · map the repo')
  expect(props.source).toContain('Plan · готово')
  expect(props.alt).toContain('1 активных')
  await desk.unmount()

  const term = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await term.find({ type: 'Svg' as never })).toBeFalsy()
  expect((await term.find({ type: 'Text', text: /Explore/ }))?.text).toContain('пишет')
  await term.unmount()

  release()
  await pending
})

test('a permission ask makes the director wait for you', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [] }))
  on('classic.PermissionRequest', () => ({}))
  await $.classic.PermissionRequest({ tool_name: 'Write', tool_input: {} })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /директор/ }))?.text).toContain('ждёт вас')
  await ui.unmount()
})
