// ─── Core Types ─────────────────────────────────────────────────────
export interface Skill {
  name: string;
  fitness: number;
  generation: number;
  status: 'stable' | 'mutating' | 'evolved';
  color: string;
}

export interface DreamNode {
  id: string;
  title: string;
  x: number;
  y: number;
  z: number;
  connections: string[];
  entry?: string;
}

export interface Project {
  name: string;
  health: number;
  velocity: number[];
  status: 'green' | 'yellow' | 'red';
  alerts: string[];
}

export type RoomId = 'genome' | 'dream' | 'war' | 'redteam' | 'metalearning' | 'temporal' | 'identity';

// ─── Genome Lab Data ────────────────────────────────────────────────
export const skills: Skill[] = [
  { name: 'Code Generation', fitness: 92, generation: 47, status: 'stable', color: '#00ff88' },
  { name: 'Bug Detection', fitness: 78, generation: 31, status: 'mutating', color: '#ff6b35' },
  { name: 'Architecture', fitness: 85, generation: 22, status: 'stable', color: '#3b82f6' },
  { name: 'Testing', fitness: 61, generation: 15, status: 'mutating', color: '#f59e0b' },
  { name: 'Documentation', fitness: 73, generation: 28, status: 'evolved', color: '#8b5cf6' },
  { name: 'Refactoring', fitness: 88, generation: 39, status: 'stable', color: '#06b6d4' },
  { name: 'Security Audit', fitness: 54, generation: 12, status: 'mutating', color: '#ef4444' },
];

// ─── Dream Chamber Data ─────────────────────────────────────────────
export const dreamNodes: DreamNode[] = [
  { id: 'a', title: 'Neural Architecture Search', x: -3, y: 1, z: 0, connections: ['b', 'c'], entry: 'Explored topology optimization via evolutionary strategies...' },
  { id: 'b', title: 'Self-Modifying Prompts', x: 2, y: 2.5, z: -1, connections: ['a', 'd'], entry: 'What if prompts could rewrite themselves based on output quality?' },
  { id: 'c', title: 'Dream Merging', x: -1, y: -1, z: 2, connections: ['a', 'e'], entry: 'Cross-pollinating ideas between unrelated projects...' },
  { id: 'd', title: 'Emergent Behaviors', x: 3, y: 0, z: 1, connections: ['b'], entry: 'Noticed patterns forming without explicit programming...' },
  { id: 'e', title: 'Skill Synthesis', x: 0, y: 3, z: -2, connections: ['c', 'f'] },
  { id: 'f', title: 'Meta-Cognition', x: -2, y: -2, z: -1, connections: ['e', 'd'], entry: 'The agent began analyzing its own analysis patterns...' },
];

// ─── War Room Data ──────────────────────────────────────────────────
export const projects: Project[] = [
  { name: 'PepeClaw Core', health: 94, velocity: [65, 72, 80, 78, 85, 91, 94], status: 'green', alerts: [] },
  { name: 'Skill Evolution', health: 67, velocity: [45, 52, 48, 55, 60, 58, 67], status: 'yellow', alerts: ['Mutation rate above threshold'] },
  { name: 'Dream Engine', health: 82, velocity: [70, 68, 75, 79, 82, 80, 82], status: 'green', alerts: [] },
  { name: 'Red Team', health: 38, velocity: [30, 35, 28, 32, 40, 36, 38], status: 'red', alerts: ['3 critical debates unresolved', 'Bias detector offline'] },
  { name: 'Meta-Learning', health: 71, velocity: [50, 55, 60, 63, 68, 70, 71], status: 'yellow', alerts: ['Self-modification pending review'] },
];

// ─── Navigation ─────────────────────────────────────────────────────
export const rooms: { id: RoomId; name: string; position: [number, number, number]; color: string }[] = [
  { id: 'genome', name: 'Genome Lab', position: [-8, 0, 0], color: '#00ff88' },
  { id: 'dream', name: 'Dream Chamber', position: [0, 0, 0], color: '#8b5cf6' },
  { id: 'war', name: 'War Room', position: [8, 0, 0], color: '#ef4444' },
  { id: 'redteam', name: 'Red Team Arena', position: [16, 0, 0], color: '#f87171' },
  { id: 'metalearning', name: 'Meta-Learning', position: [24, 0, 0], color: '#06b6d4' },
  { id: 'temporal', name: 'Temporal Engine', position: [32, 0, 0], color: '#f59e0b' },
  { id: 'identity', name: 'Identity Vault', position: [40, 0, 0], color: '#f97316' },
];

// ─── Red Team Arena Data ─────────────────────────────────────────────
export interface Argument {
  id: string;
  agent: 'attacker' | 'defender';
  text: string;
  confidence: number;
  timestamp: number;
}

export interface BiasAlert {
  id: string;
  type: 'confirmation' | 'anchoring' | 'availability' | 'sunk-cost' | 'bandwagon';
  severity: 'low' | 'medium' | 'high';
  description: string;
  relatedArgumentId: string;
}

export interface AssumptionCard {
  id: string;
  assumption: string;
  isFlipped: boolean;
  reality: string;
  status: 'unchallenged' | 'challenged' | 'debunked';
}

export const redTeamData = {
  topic: 'Should we migrate the monolith to microservices?',
  attackerName: 'Challenger',
  defenderName: 'Advocate',
  attackerScore: 72,
  defenderScore: 65,
  arguments: [
    { id: 'a1', agent: 'attacker' as const, text: 'Microservices increase deployment complexity by 3x. Our team of 8 cannot handle 15+ services.', confidence: 85, timestamp: 1 },
    { id: 'a2', agent: 'defender' as const, text: 'Independent deployment reduces blast radius. Each team owns their domain boundary.', confidence: 78, timestamp: 2 },
    { id: 'a3', agent: 'attacker' as const, text: 'Network latency between services adds 40ms p99. Current monolith handles requests in 12ms.', confidence: 91, timestamp: 3 },
    { id: 'a4', agent: 'defender' as const, text: 'Caching and async messaging patterns can reduce cross-service calls by 60%.', confidence: 70, timestamp: 4 },
    { id: 'a5', agent: 'attacker' as const, text: 'Distributed tracing, service mesh, and container orchestration — that\'s 3 new infrastructure layers.', confidence: 88, timestamp: 5 },
    { id: 'a6', agent: 'defender' as const, text: 'Managed platforms like K8s-as-a-service reduce operational overhead. We don\'t need to build from scratch.', confidence: 65, timestamp: 6 },
  ],
  biasAlerts: [
    { id: 'b1', type: 'sunk-cost' as const, severity: 'high' as const, description: 'Defender may be anchored to existing migration investment', relatedArgumentId: 'a2' },
    { id: 'b2', type: 'confirmation' as const, severity: 'medium' as const, description: 'Attacker selectively citing worst-case latency numbers', relatedArgumentId: 'a3' },
    { id: 'b3', type: 'bandwagon' as const, severity: 'low' as const, description: 'Defender appeals to industry trend rather than specific evidence', relatedArgumentId: 'a6' },
  ],
  assumptions: [
    { id: 'as1', assumption: 'Team can learn K8s in 2 months', isFlipped: false, reality: 'Average ramp-up is 4-6 months for production readiness', status: 'challenged' as const },
    { id: 'as2', assumption: 'Current monolith will hit scaling limits in 6 months', isFlipped: false, reality: 'Vertical scaling can extend runway by 18 months at 3x cost', status: 'unchallenged' as const },
    { id: 'as3', assumption: 'Microservices improve developer velocity', isFlipped: true, reality: 'Only true above ~50 engineers; below that, coordination cost dominates', status: 'debunked' as const },
  ],
};

// ─── Meta-Learning Center Data ───────────────────────────────────────
export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface ModificationProposal {
  id: string;
  title: string;
  description: string;
  status: 'proposed' | 'in-progress' | 'completed' | 'rejected';
  impact: 'low' | 'medium' | 'high';
  category: string;
}

export interface CapabilityAxis {
  axis: string;
  current: number;
  target: number;
}

export const metaLearningData = {
  performanceMetrics: {
    accuracy: [
      { timestamp: 'Week 1', value: 62 },
      { timestamp: 'Week 2', value: 68 },
      { timestamp: 'Week 3', value: 71 },
      { timestamp: 'Week 4', value: 75 },
      { timestamp: 'Week 5', value: 79 },
      { timestamp: 'Week 6', value: 83 },
      { timestamp: 'Week 7', value: 85 },
      { timestamp: 'Week 8', value: 89 },
    ],
    responseTime: [
      { timestamp: 'Week 1', value: 4200 },
      { timestamp: 'Week 2', value: 3800 },
      { timestamp: 'Week 3', value: 3200 },
      { timestamp: 'Week 4', value: 2900 },
      { timestamp: 'Week 5', value: 2400 },
      { timestamp: 'Week 6', value: 2100 },
      { timestamp: 'Week 7', value: 1800 },
      { timestamp: 'Week 8', value: 1500 },
    ],
    taskCompletion: [
      { timestamp: 'Week 1', value: 45 },
      { timestamp: 'Week 2', value: 52 },
      { timestamp: 'Week 3', value: 58 },
      { timestamp: 'Week 4', value: 64 },
      { timestamp: 'Week 5', value: 71 },
      { timestamp: 'Week 6', value: 76 },
      { timestamp: 'Week 7', value: 82 },
      { timestamp: 'Week 8', value: 87 },
    ],
  },
  proposals: [
    { id: 'p1', title: 'Add chain-of-thought reasoning', description: 'Implement explicit reasoning steps before task execution', status: 'completed' as const, impact: 'high' as const, category: 'Reasoning' },
    { id: 'p2', title: 'Expand context window usage', description: 'Better utilize available context for long-form tasks', status: 'in-progress' as const, impact: 'high' as const, category: 'Memory' },
    { id: 'p3', title: 'Improve error recovery', description: 'Add retry logic with exponential backoff and alternative strategies', status: 'in-progress' as const, impact: 'medium' as const, category: 'Resilience' },
    { id: 'p4', title: 'Code review self-check', description: 'Run automated review on generated code before submission', status: 'proposed' as const, impact: 'medium' as const, category: 'Quality' },
    { id: 'p5', title: 'Multi-language pattern matching', description: 'Apply patterns learned in Python to JavaScript and vice versa', status: 'proposed' as const, impact: 'low' as const, category: 'Transfer' },
    { id: 'p6', title: 'Deprecate verbose logging', description: 'Remove excessive debug output that slows execution', status: 'rejected' as const, impact: 'low' as const, category: 'Performance' },
  ],
  capabilities: [
    { axis: 'Reasoning', current: 82, target: 95 },
    { axis: 'Code Gen', current: 88, target: 92 },
    { axis: 'Planning', current: 71, target: 90 },
    { axis: 'Debugging', current: 76, target: 88 },
    { axis: 'Learning', current: 65, target: 85 },
    { axis: 'Communication', current: 90, target: 93 },
  ],
  beforeAfter: [
    { metric: 'Task Success Rate', before: 64, after: 87, unit: '%' },
    { metric: 'Avg Response Time', before: 4.2, after: 1.5, unit: 's' },
    { metric: 'Error Rate', before: 18, after: 5, unit: '%' },
    { metric: 'Code Quality Score', before: 6.2, after: 8.7, unit: '/10' },
  ],
};

// ─── Temporal Engine Data ────────────────────────────────────────────
export interface TimelineTask {
  id: string;
  title: string;
  priority: 'urgent' | 'normal' | 'low' | 'done';
  startTime: number;
  endTime: number;
  batchId: string;
  deferrals: number;
  description: string;
}

export interface TaskBatch {
  id: string;
  name: string;
  color: string;
}

export const temporalData = {
  batches: [
    { id: 'batch-1', name: 'Core Infrastructure', color: '#6366f1' },
    { id: 'batch-2', name: 'Feature Development', color: '#8b5cf6' },
    { id: 'batch-3', name: 'Bug Fixes', color: '#ec4899' },
    { id: 'batch-4', name: 'Documentation', color: '#14b8a6' },
  ],
  tasks: [
    { id: 't1', title: 'Set up CI/CD pipeline', priority: 'done' as const, startTime: 0, endTime: 3, batchId: 'batch-1', deferrals: 0, description: 'Configure GitHub Actions for automated testing and deployment' },
    { id: 't2', title: 'Database migration framework', priority: 'done' as const, startTime: 1, endTime: 4, batchId: 'batch-1', deferrals: 1, description: 'Implement versioned schema migrations with rollback support' },
    { id: 't3', title: 'Auth service implementation', priority: 'urgent' as const, startTime: 3, endTime: 7, batchId: 'batch-2', deferrals: 0, description: 'JWT-based authentication with refresh token rotation' },
    { id: 't4', title: 'Fix memory leak in worker', priority: 'urgent' as const, startTime: 4, endTime: 5, batchId: 'batch-3', deferrals: 2, description: 'Worker process accumulating 50MB/hr due to unclosed connections' },
    { id: 't5', title: 'API rate limiting', priority: 'normal' as const, startTime: 5, endTime: 8, batchId: 'batch-2', deferrals: 0, description: 'Token bucket algorithm with per-user quotas' },
    { id: 't6', title: 'Update API docs', priority: 'low' as const, startTime: 2, endTime: 9, batchId: 'batch-4', deferrals: 4, description: 'Swagger/OpenAPI spec update for v2 endpoints' },
    { id: 't7', title: 'Real-time notifications', priority: 'normal' as const, startTime: 6, endTime: 10, batchId: 'batch-2', deferrals: 1, description: 'WebSocket-based notification system with fallback to SSE' },
    { id: 't8', title: 'Fix timezone rendering bug', priority: 'done' as const, startTime: 3, endTime: 4, batchId: 'batch-3', deferrals: 0, description: 'UTC offset not applied in calendar component' },
    { id: 't9', title: 'Performance benchmarks', priority: 'low' as const, startTime: 7, endTime: 11, batchId: 'batch-1', deferrals: 3, description: 'Establish baseline metrics for API response times' },
    { id: 't10', title: 'Write onboarding guide', priority: 'low' as const, startTime: 8, endTime: 12, batchId: 'batch-4', deferrals: 5, description: 'Developer onboarding documentation — keeps getting pushed back' },
    { id: 't11', title: 'Search indexing service', priority: 'urgent' as const, startTime: 9, endTime: 12, batchId: 'batch-2', deferrals: 0, description: 'Elasticsearch integration for full-text search across entities' },
    { id: 't12', title: 'Fix broken OAuth flow', priority: 'urgent' as const, startTime: 10, endTime: 11, batchId: 'batch-3', deferrals: 0, description: 'Google OAuth callback URL mismatch in production' },
  ],
  currentHour: 8,
};
