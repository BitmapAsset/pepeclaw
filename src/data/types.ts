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

export type RoomId = 'overview' | 'genome' | 'dream' | 'war' | 'redteam' | 'metalearning' | 'temporal' | 'identity' | 'breeding' | 'optimizer' | 'replay' | 'settings' | 'activitylog';

// Room IDs that have 3D scenes
export const sceneRoomIds: RoomId[] = ['genome', 'dream', 'war', 'redteam', 'metalearning', 'temporal', 'identity', 'breeding'];

// ─── Emotion Engine ─────────────────────────────────────────────────
export type EmotionState = 'focused' | 'creative' | 'stressed' | 'curious' | 'satisfied';

export const emotionColors: Record<EmotionState, string> = {
  focused: '#3b82f6',
  creative: '#a855f7',
  stressed: '#ef4444',
  curious: '#22c55e',
  satisfied: '#eab308',
};

export const activityToEmotion: Record<string, EmotionState> = {
  examining: 'curious',
  meditating: 'creative',
  strategizing: 'focused',
  debating: 'stressed',
  studying: 'curious',
  managing: 'focused',
  verifying: 'satisfied',
  breeding: 'creative',
  processing: 'focused',
  brainstorming: 'creative',
  monitoring: 'curious',
  idle: 'satisfied',
};

// ─── Consciousness Stream ───────────────────────────────────────────
export interface ThoughtBubble {
  id: string;
  agentId: string;
  text: string;
  type: 'reasoning' | 'decision' | 'observation' | 'question';
}

// ─── Activity Feed ──────────────────────────────────────────────────
export interface ActivityEntry {
  id: string;
  agentName: string;
  agentColor: string;
  action: string;
  room: RoomId;
  timestamp: number;
}

// ─── Breeding Arena ─────────────────────────────────────────────────
export interface BreedingCandidate {
  id: string;
  name: string;
  color: string;
  skills: { name: string; fitness: number; color: string }[];
}

// ─── Red Team Arena ─────────────────────────────────────────────────
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

export interface RedTeamData {
  topic: string;
  attackerName: string;
  defenderName: string;
  attackerScore: number;
  defenderScore: number;
  arguments: Argument[];
  biasAlerts: BiasAlert[];
  assumptions: AssumptionCard[];
}

// ─── Meta-Learning Center ───────────────────────────────────────────
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

export interface MetaLearningData {
  performanceMetrics: {
    accuracy: MetricPoint[];
    responseTime: MetricPoint[];
    taskCompletion: MetricPoint[];
  };
  proposals: ModificationProposal[];
  capabilities: CapabilityAxis[];
  beforeAfter: { metric: string; before: number; after: number; unit: string }[];
}

// ─── Temporal Engine ────────────────────────────────────────────────
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

export interface TemporalData {
  batches: TaskBatch[];
  tasks: TimelineTask[];
  currentHour: number;
}

// ─── Evolution Visualization ──────────────────────────────────────
export interface MicroLearning {
  id: string;
  text: string;
  timestamp: number;
  skill: string;
  score: 1 | 2 | 3 | 4;
}

export interface SkillMutation {
  id: string;
  skill: string;
  oldFitness: number;
  newFitness: number;
  generation: number;
  timestamp: number;
  change: string;
  color: string;
}

export interface TraceEntry {
  id: string;
  tool: string;
  duration: number;
  success: boolean;
  startTime: number;
  input: string;
  output: string;
  category: 'file' | 'search' | 'execute' | 'network' | 'ai';
}

export interface OptimizerSection {
  name: string;
  score: number;
  icon: string;
  recommendations: { text: string; priority: 'high' | 'medium' | 'low'; fixed: boolean }[];
}

export interface UserModelDimension {
  axis: string;
  value: number;
  description: string;
}

// ─── Navigation ─────────────────────────────────────────────────────
export const rooms: { id: RoomId; name: string; position: [number, number, number]; color: string }[] = [
  { id: 'overview', name: 'Overview', position: [7.5, 0, 0], color: '#8b5cf6' },
  { id: 'genome', name: 'Genome Lab', position: [-8, 0, 0], color: '#00ff88' },
  { id: 'dream', name: 'Dream Chamber', position: [0, 0, 0], color: '#8b5cf6' },
  { id: 'war', name: 'War Room', position: [8, 0, 0], color: '#ef4444' },
  { id: 'redteam', name: 'Red Team Arena', position: [16, 0, 0], color: '#f87171' },
  { id: 'metalearning', name: 'Meta-Learning', position: [24, 0, 0], color: '#06b6d4' },
  { id: 'temporal', name: 'Temporal Engine', position: [32, 0, 0], color: '#f59e0b' },
  { id: 'identity', name: 'Identity Vault', position: [40, 0, 0], color: '#f97316' },
  { id: 'breeding', name: 'Breeding Arena', position: [48, 0, 0], color: '#ec4899' },
  { id: 'optimizer', name: 'Optimizer', position: [0, 0, 0], color: '#f97316' },
  { id: 'replay', name: 'Replay', position: [0, 0, 0], color: '#a855f7' },
  { id: 'activitylog', name: 'Activity Log', position: [0, 0, 0], color: '#f59e0b' },
  { id: 'settings', name: 'Settings', position: [0, 0, 0], color: '#64748b' },
];
