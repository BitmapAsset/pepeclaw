import type {
  Skill,
  DreamNode,
  Project,
  ThoughtBubble,
  ActivityEntry,
  BreedingCandidate,
  RedTeamData,
  MetaLearningData,
  TemporalData,
  MicroLearning,
  SkillMutation,
  TraceEntry,
  OptimizerSection,
  UserModelDimension,
} from '../../src/data/types';

// Re-export all types and constants for test convenience
export {
  rooms,
  sceneRoomIds,
  emotionColors,
  activityToEmotion,
} from '../../src/data/types';
export type {
  Skill,
  DreamNode,
  Project,
  RoomId,
  EmotionState,
  ThoughtBubble,
  ActivityEntry,
  BreedingCandidate,
  Argument,
  BiasAlert,
  AssumptionCard,
  RedTeamData,
  MetricPoint,
  ModificationProposal,
  CapabilityAxis,
  MetaLearningData,
  TimelineTask,
  TaskBatch,
  TemporalData,
  MicroLearning,
  SkillMutation,
  TraceEntry,
  OptimizerSection,
  UserModelDimension,
} from '../../src/data/types';

// ─── Consciousness Stream ───────────────────────────────────────────
export const mockThoughts: ThoughtBubble[] = [
  { id: 't1', agentId: 'a1', text: 'Mutation rate at 0.03 — increasing crossover probability to 0.7 for next generation...', type: 'reasoning' },
  { id: 't2', agentId: 'a2', text: 'What if we merge the neural architecture dream with self-modifying prompts? The topology could emerge...', type: 'question' },
  { id: 't3', agentId: 'a3', text: 'Anomalous deployment detected: 3 containers restarted in 5 minutes. Investigating root cause.', type: 'observation' },
  { id: 't4', agentId: 'a4', text: 'Defender\'s caching argument reduces latency by 60% — but adds a consistency problem. Pressing harder.', type: 'decision' },
  { id: 't5', agentId: 'a5', text: 'Accuracy plateaued at 89%. Hypothesis: need to diversify training signal, not just increase volume.', type: 'reasoning' },
  { id: 't6', agentId: 'a6', text: 'Auth service is blocking search indexing. Promoting auth to urgent, deferring docs another sprint.', type: 'decision' },
  { id: 't7', agentId: 'a7', text: 'Token #47 verified against 3 independent hash chains. Consistency: 100%. Minting #48 now.', type: 'observation' },
  { id: 't8', agentId: 'a1', text: 'Code Generation fitness jumped from 88 → 92. Template literal optimization was the key mutation.', type: 'observation' },
  { id: 't9', agentId: 'a2', text: 'The meta-cognition node keeps pulling me back... am I analyzing my analysis of analysis?', type: 'question' },
  { id: 't10', agentId: 'a5', text: 'Pattern discovered: test-before-refactor yields 23% fewer regressions. Encoding as heuristic.', type: 'reasoning' },
];

// ─── Activity Feed ──────────────────────────────────────────────────
export const mockActivities: ActivityEntry[] = [
  { id: 'act1', agentName: 'Atlas', agentColor: '#00ff88', action: 'Evolved Code Generation to gen 48 — fitness 92 → 94', room: 'genome', timestamp: Date.now() - 3000 },
  { id: 'act2', agentName: 'Cipher', agentColor: '#f87171', action: 'Won debate round #5 — latency argument scored 91% confidence', room: 'redteam', timestamp: Date.now() - 8000 },
  { id: 'act3', agentName: 'Nova', agentColor: '#8b5cf6', action: 'Merged dream nodes: Neural Architecture + Self-Modifying Prompts', room: 'dream', timestamp: Date.now() - 15000 },
  { id: 'act4', agentName: 'Sentinel', agentColor: '#ef4444', action: 'Flagged anomaly: 3 container restarts in 5 min on PepeClaw Core', room: 'war', timestamp: Date.now() - 22000 },
  { id: 'act5', agentName: 'Echo', agentColor: '#06b6d4', action: 'Self-modified reasoning module — chain-of-thought depth +1', room: 'metalearning', timestamp: Date.now() - 35000 },
  { id: 'act6', agentName: 'Chrono', agentColor: '#f59e0b', action: 'Promoted Auth Service to urgent — blocking search indexing', room: 'temporal', timestamp: Date.now() - 48000 },
  { id: 'act7', agentName: 'Vault', agentColor: '#f97316', action: 'Minted identity token #47 — verified against 3 hash chains', room: 'identity', timestamp: Date.now() - 62000 },
  { id: 'act8', agentName: 'Atlas', agentColor: '#00ff88', action: 'Ego death triggered — reforming genome with fresh mutation seeds', room: 'genome', timestamp: Date.now() - 80000 },
  { id: 'act9', agentName: 'Echo', agentColor: '#06b6d4', action: 'Bred with Atlas — child agent inherits Code Gen + Bug Detection', room: 'breeding', timestamp: Date.now() - 95000 },
  { id: 'act10', agentName: 'Nova', agentColor: '#8b5cf6', action: 'Explored Meta-Cognition dream node — recursive self-analysis detected', room: 'dream', timestamp: Date.now() - 115000 },
  { id: 'act11', agentName: 'Sentinel', agentColor: '#ef4444', action: 'Cleared false positive — container restart was scheduled rollout', room: 'war', timestamp: Date.now() - 140000 },
  { id: 'act12', agentName: 'Cipher', agentColor: '#f87171', action: 'Bias alert: sunk-cost fallacy detected in defender\'s K8s argument', room: 'redteam', timestamp: Date.now() - 165000 },
];

// ─── Breeding Arena ─────────────────────────────────────────────────
export const breedingCandidates: BreedingCandidate[] = [
  {
    id: 'bc1', name: 'Atlas', color: '#00ff88',
    skills: [
      { name: 'Code Generation', fitness: 92, color: '#00ff88' },
      { name: 'Architecture', fitness: 85, color: '#3b82f6' },
      { name: 'Refactoring', fitness: 88, color: '#06b6d4' },
    ],
  },
  {
    id: 'bc2', name: 'Echo', color: '#06b6d4',
    skills: [
      { name: 'Bug Detection', fitness: 78, color: '#ff6b35' },
      { name: 'Testing', fitness: 61, color: '#f59e0b' },
      { name: 'Documentation', fitness: 73, color: '#8b5cf6' },
    ],
  },
];

// ─── Genome Lab ────────────────────────────────────────────────
export const skills: Skill[] = [
  { name: 'Code Generation', fitness: 92, generation: 47, status: 'stable', color: '#00ff88' },
  { name: 'Bug Detection', fitness: 78, generation: 31, status: 'mutating', color: '#ff6b35' },
  { name: 'Architecture', fitness: 85, generation: 22, status: 'stable', color: '#3b82f6' },
  { name: 'Testing', fitness: 61, generation: 15, status: 'mutating', color: '#f59e0b' },
  { name: 'Documentation', fitness: 73, generation: 28, status: 'evolved', color: '#8b5cf6' },
  { name: 'Refactoring', fitness: 88, generation: 39, status: 'stable', color: '#06b6d4' },
  { name: 'Security Audit', fitness: 54, generation: 12, status: 'mutating', color: '#ef4444' },
];

// ─── Dream Chamber ─────────────────────────────────────────────
export const dreamNodes: DreamNode[] = [
  { id: 'a', title: 'Neural Architecture Search', x: -3, y: 1, z: 0, connections: ['b', 'c'], entry: 'Explored topology optimization via evolutionary strategies...' },
  { id: 'b', title: 'Self-Modifying Prompts', x: 2, y: 2.5, z: -1, connections: ['a', 'd'], entry: 'What if prompts could rewrite themselves based on output quality?' },
  { id: 'c', title: 'Dream Merging', x: -1, y: -1, z: 2, connections: ['a', 'e'], entry: 'Cross-pollinating ideas between unrelated projects...' },
  { id: 'd', title: 'Emergent Behaviors', x: 3, y: 0, z: 1, connections: ['b'], entry: 'Noticed patterns forming without explicit programming...' },
  { id: 'e', title: 'Skill Synthesis', x: 0, y: 3, z: -2, connections: ['c', 'f'] },
  { id: 'f', title: 'Meta-Cognition', x: -2, y: -2, z: -1, connections: ['e', 'd'], entry: 'The agent began analyzing its own analysis patterns...' },
];

// ─── War Room ──────────────────────────────────────────────────
export const projects: Project[] = [
  { name: 'PepeClaw Core', health: 94, velocity: [65, 72, 80, 78, 85, 91, 94], status: 'green', alerts: [] },
  { name: 'Skill Evolution', health: 67, velocity: [45, 52, 48, 55, 60, 58, 67], status: 'yellow', alerts: ['Mutation rate above threshold'] },
  { name: 'Dream Engine', health: 82, velocity: [70, 68, 75, 79, 82, 80, 82], status: 'green', alerts: [] },
  { name: 'Red Team', health: 38, velocity: [30, 35, 28, 32, 40, 36, 38], status: 'red', alerts: ['3 critical debates unresolved', 'Bias detector offline'] },
  { name: 'Meta-Learning', health: 71, velocity: [50, 55, 60, 63, 68, 70, 71], status: 'yellow', alerts: ['Self-modification pending review'] },
];

// ─── Red Team Arena ─────────────────────────────────────────────
export const redTeamData: RedTeamData = {
  topic: 'Should we migrate the monolith to microservices?',
  attackerName: 'Challenger',
  defenderName: 'Advocate',
  attackerScore: 72,
  defenderScore: 65,
  arguments: [
    { id: 'a1', agent: 'attacker', text: 'Microservices increase deployment complexity by 3x. Our team of 8 cannot handle 15+ services.', confidence: 85, timestamp: 1 },
    { id: 'a2', agent: 'defender', text: 'Independent deployment reduces blast radius. Each team owns their domain boundary.', confidence: 78, timestamp: 2 },
    { id: 'a3', agent: 'attacker', text: 'Network latency between services adds 40ms p99. Current monolith handles requests in 12ms.', confidence: 91, timestamp: 3 },
    { id: 'a4', agent: 'defender', text: 'Caching and async messaging patterns can reduce cross-service calls by 60%.', confidence: 70, timestamp: 4 },
    { id: 'a5', agent: 'attacker', text: 'Distributed tracing, service mesh, and container orchestration — that\'s 3 new infrastructure layers.', confidence: 88, timestamp: 5 },
    { id: 'a6', agent: 'defender', text: 'Managed platforms like K8s-as-a-service reduce operational overhead. We don\'t need to build from scratch.', confidence: 65, timestamp: 6 },
  ],
  biasAlerts: [
    { id: 'b1', type: 'sunk-cost', severity: 'high', description: 'Defender may be anchored to existing migration investment', relatedArgumentId: 'a2' },
    { id: 'b2', type: 'confirmation', severity: 'medium', description: 'Attacker selectively citing worst-case latency numbers', relatedArgumentId: 'a3' },
    { id: 'b3', type: 'bandwagon', severity: 'low', description: 'Defender appeals to industry trend rather than specific evidence', relatedArgumentId: 'a6' },
  ],
  assumptions: [
    { id: 'as1', assumption: 'Team can learn K8s in 2 months', isFlipped: false, reality: 'Average ramp-up is 4-6 months for production readiness', status: 'challenged' },
    { id: 'as2', assumption: 'Current monolith will hit scaling limits in 6 months', isFlipped: false, reality: 'Vertical scaling can extend runway by 18 months at 3x cost', status: 'unchallenged' },
    { id: 'as3', assumption: 'Microservices improve developer velocity', isFlipped: true, reality: 'Only true above ~50 engineers; below that, coordination cost dominates', status: 'debunked' },
  ],
};

// ─── Meta-Learning Center ───────────────────────────────────────
export const metaLearningData: MetaLearningData = {
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
    { id: 'p1', title: 'Add chain-of-thought reasoning', description: 'Implement explicit reasoning steps before task execution', status: 'completed', impact: 'high', category: 'Reasoning' },
    { id: 'p2', title: 'Expand context window usage', description: 'Better utilize available context for long-form tasks', status: 'in-progress', impact: 'high', category: 'Memory' },
    { id: 'p3', title: 'Improve error recovery', description: 'Add retry logic with exponential backoff and alternative strategies', status: 'in-progress', impact: 'medium', category: 'Resilience' },
    { id: 'p4', title: 'Code review self-check', description: 'Run automated review on generated code before submission', status: 'proposed', impact: 'medium', category: 'Quality' },
    { id: 'p5', title: 'Multi-language pattern matching', description: 'Apply patterns learned in Python to JavaScript and vice versa', status: 'proposed', impact: 'low', category: 'Transfer' },
    { id: 'p6', title: 'Deprecate verbose logging', description: 'Remove excessive debug output that slows execution', status: 'rejected', impact: 'low', category: 'Performance' },
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

// ─── Temporal Engine ────────────────────────────────────────────
export const temporalData: TemporalData = {
  batches: [
    { id: 'batch-1', name: 'Core Infrastructure', color: '#6366f1' },
    { id: 'batch-2', name: 'Feature Development', color: '#8b5cf6' },
    { id: 'batch-3', name: 'Bug Fixes', color: '#ec4899' },
    { id: 'batch-4', name: 'Documentation', color: '#14b8a6' },
  ],
  tasks: [
    { id: 't1', title: 'Set up CI/CD pipeline', priority: 'done', startTime: 0, endTime: 3, batchId: 'batch-1', deferrals: 0, description: 'Configure GitHub Actions for automated testing and deployment' },
    { id: 't2', title: 'Database migration framework', priority: 'done', startTime: 1, endTime: 4, batchId: 'batch-1', deferrals: 1, description: 'Implement versioned schema migrations with rollback support' },
    { id: 't3', title: 'Auth service implementation', priority: 'urgent', startTime: 3, endTime: 7, batchId: 'batch-2', deferrals: 0, description: 'JWT-based authentication with refresh token rotation' },
    { id: 't4', title: 'Fix memory leak in worker', priority: 'urgent', startTime: 4, endTime: 5, batchId: 'batch-3', deferrals: 2, description: 'Worker process accumulating 50MB/hr due to unclosed connections' },
    { id: 't5', title: 'API rate limiting', priority: 'normal', startTime: 5, endTime: 8, batchId: 'batch-2', deferrals: 0, description: 'Token bucket algorithm with per-user quotas' },
    { id: 't6', title: 'Update API docs', priority: 'low', startTime: 2, endTime: 9, batchId: 'batch-4', deferrals: 4, description: 'Swagger/OpenAPI spec update for v2 endpoints' },
    { id: 't7', title: 'Real-time notifications', priority: 'normal', startTime: 6, endTime: 10, batchId: 'batch-2', deferrals: 1, description: 'WebSocket-based notification system with fallback to SSE' },
    { id: 't8', title: 'Fix timezone rendering bug', priority: 'done', startTime: 3, endTime: 4, batchId: 'batch-3', deferrals: 0, description: 'UTC offset not applied in calendar component' },
    { id: 't9', title: 'Performance benchmarks', priority: 'low', startTime: 7, endTime: 11, batchId: 'batch-1', deferrals: 3, description: 'Establish baseline metrics for API response times' },
    { id: 't10', title: 'Write onboarding guide', priority: 'low', startTime: 8, endTime: 12, batchId: 'batch-4', deferrals: 5, description: 'Developer onboarding documentation — keeps getting pushed back' },
    { id: 't11', title: 'Search indexing service', priority: 'urgent', startTime: 9, endTime: 12, batchId: 'batch-2', deferrals: 0, description: 'Elasticsearch integration for full-text search across entities' },
    { id: 't12', title: 'Fix broken OAuth flow', priority: 'urgent', startTime: 10, endTime: 11, batchId: 'batch-3', deferrals: 0, description: 'Google OAuth callback URL mismatch in production' },
  ],
  currentHour: 8,
};

// ─── Evolution Visualization ──────────────────────────────────
export const mockMicroLearnings: MicroLearning[] = [
  { id: 'ml1', text: 'Learned to chain tool calls for file operations', timestamp: Date.now() - 2000, skill: 'Code Generation', score: 4 },
  { id: 'ml2', text: 'Improved error message parsing accuracy', timestamp: Date.now() - 15000, skill: 'Bug Detection', score: 3 },
  { id: 'ml3', text: 'Discovered pattern: test before refactor', timestamp: Date.now() - 30000, skill: 'Testing', score: 4 },
  { id: 'ml4', text: 'Adapted to user preference for concise responses', timestamp: Date.now() - 60000, skill: 'Communication', score: 3 },
  { id: 'ml5', text: 'Security scan false positive rate reduced', timestamp: Date.now() - 90000, skill: 'Security Audit', score: 2 },
  { id: 'ml6', text: 'Learned new TypeScript strict mode patterns', timestamp: Date.now() - 120000, skill: 'Code Generation', score: 4 },
  { id: 'ml7', text: 'Architecture decision: prefer composition over inheritance', timestamp: Date.now() - 180000, skill: 'Architecture', score: 3 },
  { id: 'ml8', text: 'Retry logic for flaky network calls', timestamp: Date.now() - 240000, skill: 'Bug Detection', score: 2 },
  { id: 'ml9', text: 'Documentation: auto-generate from type signatures', timestamp: Date.now() - 300000, skill: 'Documentation', score: 3 },
  { id: 'ml10', text: 'Refactoring: extract shared validation logic', timestamp: Date.now() - 360000, skill: 'Refactoring', score: 4 },
  { id: 'ml11', text: 'Improved test coverage detection heuristic', timestamp: Date.now() - 420000, skill: 'Testing', score: 1 },
  { id: 'ml12', text: 'Learned to detect SQL injection in ORM queries', timestamp: Date.now() - 500000, skill: 'Security Audit', score: 4 },
];

export const mockMutations: SkillMutation[] = [
  { id: 'sm1', skill: 'Code Generation', oldFitness: 85, newFitness: 88, generation: 44, timestamp: Date.now() - 600000, change: 'Added async/await pattern library', color: '#00ff88' },
  { id: 'sm2', skill: 'Bug Detection', oldFitness: 72, newFitness: 70, generation: 28, timestamp: Date.now() - 500000, change: 'Regression in null-check detection', color: '#ff6b35' },
  { id: 'sm3', skill: 'Architecture', oldFitness: 83, newFitness: 85, generation: 21, timestamp: Date.now() - 400000, change: 'Learned microservice boundary patterns', color: '#3b82f6' },
  { id: 'sm4', skill: 'Testing', oldFitness: 58, newFitness: 58, generation: 13, timestamp: Date.now() - 350000, change: 'Neutral: integration test restructure', color: '#f59e0b' },
  { id: 'sm5', skill: 'Code Generation', oldFitness: 88, newFitness: 92, generation: 47, timestamp: Date.now() - 200000, change: 'Template literal optimization', color: '#00ff88' },
  { id: 'sm6', skill: 'Bug Detection', oldFitness: 70, newFitness: 78, generation: 31, timestamp: Date.now() - 150000, change: 'Stack trace parsing improved', color: '#ff6b35' },
  { id: 'sm7', skill: 'Security Audit', oldFitness: 48, newFitness: 54, generation: 12, timestamp: Date.now() - 100000, change: 'XSS detection in JSX templates', color: '#ef4444' },
  { id: 'sm8', skill: 'Refactoring', oldFitness: 86, newFitness: 88, generation: 39, timestamp: Date.now() - 50000, change: 'Dead code elimination improved', color: '#06b6d4' },
];

export const mockTraces: TraceEntry[] = [
  { id: 'tr1', tool: 'Read', duration: 12, success: true, startTime: 0, input: 'src/App.tsx', output: '527 lines read', category: 'file' },
  { id: 'tr2', tool: 'Grep', duration: 45, success: true, startTime: 5, input: 'pattern: "useEffect"', output: '14 matches in 8 files', category: 'search' },
  { id: 'tr3', tool: 'Edit', duration: 8, success: true, startTime: 55, input: 'src/App.tsx line 42', output: 'Applied 1 edit', category: 'file' },
  { id: 'tr4', tool: 'Bash', duration: 3200, success: true, startTime: 65, input: 'npm run build', output: 'Build successful', category: 'execute' },
  { id: 'tr5', tool: 'WebFetch', duration: 890, success: false, startTime: 3300, input: 'https://api.example.com/status', output: 'Error: 503 Service Unavailable', category: 'network' },
  { id: 'tr6', tool: 'Read', duration: 15, success: true, startTime: 4200, input: 'src/rooms/GenomeLab.tsx', output: '377 lines read', category: 'file' },
  { id: 'tr7', tool: 'Glob', duration: 22, success: true, startTime: 4220, input: '**/*.tsx', output: '24 files matched', category: 'search' },
  { id: 'tr8', tool: 'Write', duration: 6, success: true, startTime: 4250, input: 'src/components/New.tsx', output: 'File created', category: 'file' },
  { id: 'tr9', tool: 'Bash', duration: 1500, success: false, startTime: 4260, input: 'npm test', output: '2 tests failed', category: 'execute' },
  { id: 'tr10', tool: 'Agent', duration: 5200, success: true, startTime: 5800, input: 'Explore codebase structure', output: 'Analysis complete', category: 'ai' },
  { id: 'tr11', tool: 'Edit', duration: 5, success: true, startTime: 11050, input: 'src/components/New.tsx line 12', output: 'Applied 1 edit', category: 'file' },
  { id: 'tr12', tool: 'Bash', duration: 2800, success: true, startTime: 11060, input: 'npm run build', output: 'Build successful', category: 'execute' },
];

// ─── Optimizer ──────────────────────────────────────────────────
export const optimizerData: OptimizerSection[] = [
  {
    name: 'Memory', score: 72, icon: '🧠',
    recommendations: [
      { text: 'Add project-level CLAUDE.md with architecture overview', priority: 'high', fixed: false },
      { text: 'Store user preferences in memory system', priority: 'medium', fixed: true },
      { text: 'Index frequently accessed files for faster recall', priority: 'low', fixed: false },
    ],
  },
  {
    name: 'Search', score: 58, icon: '🔍',
    recommendations: [
      { text: 'Configure custom search paths for domain-specific code', priority: 'high', fixed: false },
      { text: 'Add .clawignore for build artifacts and node_modules', priority: 'high', fixed: false },
      { text: 'Enable semantic code search indexing', priority: 'medium', fixed: false },
    ],
  },
  {
    name: 'Skills', score: 81, icon: '⚡',
    recommendations: [
      { text: 'Register project-specific build commands', priority: 'medium', fixed: true },
      { text: 'Add test runner skill for Vitest integration', priority: 'medium', fixed: false },
      { text: 'Configure linting auto-fix skill', priority: 'low', fixed: true },
    ],
  },
  {
    name: 'Automation', score: 55, icon: '🤖',
    recommendations: [
      { text: 'Set up pre-commit hook for type checking', priority: 'high', fixed: false },
      { text: 'Configure auto-format on save', priority: 'medium', fixed: true },
      { text: 'Add CI integration for PR reviews', priority: 'medium', fixed: false },
      { text: 'Enable background test runner on file changes', priority: 'low', fixed: false },
    ],
  },
];

export const userModelDimensions: UserModelDimension[] = [
  { axis: 'Communication', value: 78, description: 'Prefers concise, technical responses' },
  { axis: 'Technical Level', value: 92, description: 'Senior engineer, deep systems knowledge' },
  { axis: 'Patience', value: 65, description: 'Wants fast results, minimal back-and-forth' },
  { axis: 'Preferred Tools', value: 85, description: 'CLI-first, Vim keybindings, TypeScript' },
  { axis: 'Activity Hours', value: 70, description: 'Most active 9am-6pm PST, occasional late sessions' },
];
