// Auto-discovery gateway candidates (tried in order)
const GATEWAY_CANDIDATES = [
  import.meta.env.VITE_GATEWAY_URL,
  'http://localhost:3033',
  'http://localhost:3000',
  typeof window !== 'undefined' ? window.location.origin : null,
].filter(Boolean) as string[];

interface GatewayResponse<T> {
  data: T;
  timestamp: number;
}

export type ConnectionStatus = 'connected' | 'trying' | 'offline';

let _discoveredUrl: string | null = null;
let _connectionStatus: ConnectionStatus = 'offline';
let _statusListeners: Array<(s: ConnectionStatus) => void> = [];

function setStatus(s: ConnectionStatus) {
  _connectionStatus = s;
  _statusListeners.forEach(fn => fn(s));
}

export function onConnectionStatusChange(fn: (s: ConnectionStatus) => void) {
  _statusListeners.push(fn);
  return () => { _statusListeners = _statusListeners.filter(l => l !== fn); };
}

export function getConnectionStatus(): ConnectionStatus {
  return _connectionStatus;
}

/** Probe a URL to see if a gateway is listening */
async function probeUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/v1/agents`, {
      signal: AbortSignal.timeout(3000),
      headers: { 'Accept': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Try each candidate URL, return first that responds */
export async function discoverGateway(): Promise<string | null> {
  if (_discoveredUrl) {
    // Re-verify current URL still works
    if (await probeUrl(_discoveredUrl)) return _discoveredUrl;
    _discoveredUrl = null;
  }

  setStatus('trying');

  for (const url of GATEWAY_CANDIDATES) {
    if (await probeUrl(url)) {
      _discoveredUrl = url;
      setStatus('connected');
      return url;
    }
  }

  setStatus('offline');
  return null;
}

async function fetchEndpoint<T>(path: string, signal?: AbortSignal): Promise<T> {
  const baseUrl = _discoveredUrl;
  if (!baseUrl) throw new Error('No gateway discovered');

  const timeout = AbortSignal.timeout(10_000);
  const combined = signal
    ? AbortSignal.any([signal, timeout])
    : timeout;

  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Accept': 'application/json' },
    signal: combined,
  });
  if (!res.ok) throw new Error(`Gateway ${path} ${res.status}: ${res.statusText}`);
  const json: GatewayResponse<T> = await res.json();
  return json.data;
}

export interface AgentSession {
  id: string;
  name: string;
  role: string;
  status: 'working' | 'idle' | 'break';
  currentRoom: string;
  color: string;
  activity?: string;
  taskDescription?: string;
  hasSubAgents?: boolean;
  isSearching?: boolean;
  hasError?: boolean;
}

export type AgentState = AgentSession;

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
    fetchEndpoint<AgentSession[]>('/api/v1/agents', signal),
};
