// Auto-discovery gateway candidates (tried in order)
const GATEWAY_CANDIDATES = [
  import.meta.env.VITE_GATEWAY_URL,
  'http://localhost:3033',
  'http://localhost:3000',
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
  if (_connectionStatus === s) return;
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

/** Probe a URL to see if a gateway is listening (fast timeout, silent failures) */
async function probeUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/v1/agents`, {
      signal: AbortSignal.timeout(1500),
      headers: { 'Accept': 'application/json' },
    });
    return res.ok;
  } catch {
    // Silent failure — no console output
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
    fetchEndpoint<import('../data/types').Skill[]>('/api/v1/skills', signal),

  getDreamNodes: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').DreamNode[]>('/api/v1/dreams', signal),

  getProjects: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').Project[]>('/api/v1/projects', signal),

  getRedTeamData: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').RedTeamData>('/api/v1/redteam', signal),

  getMetaLearningData: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').MetaLearningData>('/api/v1/metalearning', signal),

  getTemporalData: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').TemporalData>('/api/v1/temporal', signal),

  getAgents: (signal?: AbortSignal) =>
    fetchEndpoint<AgentSession[]>('/api/v1/agents', signal),

  getThoughts: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').ThoughtBubble[]>('/api/v1/thoughts', signal),

  getActivities: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').ActivityEntry[]>('/api/v1/activities', signal),

  getMicroLearnings: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').MicroLearning[]>('/api/v1/microlearnings', signal),

  getMutations: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').SkillMutation[]>('/api/v1/mutations', signal),

  getTraces: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').TraceEntry[]>('/api/v1/traces', signal),

  getBreedingCandidates: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').BreedingCandidate[]>('/api/v1/breeding', signal),

  getOptimizerData: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').OptimizerSection[]>('/api/v1/optimizer', signal),

  getUserModel: (signal?: AbortSignal) =>
    fetchEndpoint<import('../data/types').UserModelDimension[]>('/api/v1/usermodel', signal),

  /** Send TTS request — returns audio ArrayBuffer */
  postTTS: async (text: string, signal?: AbortSignal): Promise<ArrayBuffer> => {
    const baseUrl = _discoveredUrl;
    if (!baseUrl) throw new Error('No gateway discovered');
    const res = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'audio/*' },
      body: JSON.stringify({ text }),
      signal: signal ?? AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`TTS ${res.status}: ${res.statusText}`);
    return res.arrayBuffer();
  },

  /** Send a message to a specific agent session */
  sendAgentMessage: async (agentId: string, message: string, signal?: AbortSignal): Promise<{ reply: string }> => {
    const baseUrl = _discoveredUrl;
    if (!baseUrl) throw new Error('No gateway discovered');
    const res = await fetch(`${baseUrl}/api/v1/agents/${agentId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: signal ?? AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Agent message ${res.status}: ${res.statusText}`);
    return res.json();
  },

  getDiscoveredUrl: () => _discoveredUrl,
};
