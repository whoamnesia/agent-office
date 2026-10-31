/** Dependency-free constants shared by the emitter bundle and everything else. */
export const SCHEMA_VERSION = 1 as const;
export const SOURCES = ['local', 'cloud', 'demo', 'replay'] as const;
export const AGENT_STATUSES = [
  'thinking',
  'reading',
  'writing',
  'running',
  'searching',
  'waiting_user',
  'error',
  'done',
  'idle',
] as const;
export const DEPARTMENTS = ['frontend', 'backend', 'qa', 'devops', 'docs', 'research', 'security', 'general'] as const;
/** The director (main agent of a session) always has this agent id. */
export const MAIN_AGENT_ID = 'main';

export type SourceName = (typeof SOURCES)[number];
export type AgentStatusName = (typeof AGENT_STATUSES)[number];
export type DepartmentName = (typeof DEPARTMENTS)[number];
