const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3033';

interface GatewayResponse<T> {
  data: T;
  timestamp: number;
}

async function fetchEndpoint<T>(path: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(10_000);
  const combined = signal
    ? AbortSignal.any([signal, timeout])
    : timeout;

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    headers: { 'Accept': 'application/json' },
    signal: combined,
  });
  if (!res.ok) throw new Error(`Gateway ${path} ${res.status}: ${res.statusText}`);
  const json: GatewayResponse<T> = await res.json();
  return json.data;
}

export interface AgentState {
  id: string;
  name: string;
  role: string;
  status: 'working' | 'idle' | 'break';
  currentRoom: string;
  color: string;
}

export const gateway = {
  getSkills: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/mockData').Skill[]>('/api/v1/skills', signal),

  getDreamNodes: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/mockData').DreamNode[]>('/api/v1/dreams', signal),

  getProjects: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/mockData').Project[]>('/api/v1/projects', signal),

  getRedTeamData: (signal?: AbortSignal) =>
    fetchEndpoint<typeof import('../data/mockData').redTeamData>('/api/v1/redteam', signal),

  getMetaLearningData: (signal?: AbortSignal) =>
    fetchEndpoint<typeof import('../data/mockData').metaLearningData>('/api/v1/metalearning', signal),

  getTemporalData: (signal?: AbortSignal) =>
    fetchEndpoint<typeof import('../data/mockData').temporalData>('/api/v1/temporal', signal),

  getAgents: (signal?: AbortSignal) =>
    fetchEndpoint<AgentState[]>('/api/v1/agents', signal),
};
