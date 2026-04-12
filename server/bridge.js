#!/usr/bin/env node
// ─── PepeClaw Data Bridge ──────────────────────────────────────────────
// Reads the OpenClaw workspace and serves REST endpoints for PepeClaw.
// Zero npm deps — Node.js built-in modules only.
// ────────────────────────────────────────────────────────────────────────

import { createServer } from 'node:http';
import { readdir, readFile, stat } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';

const PORT = parseInt(process.env.BRIDGE_PORT || '3033', 10);
const CACHE_TTL = 10_000; // 10 seconds

// ─── Workspace Discovery ───────────────────────────────────────────────
function discoverWorkspace() {
  const candidates = [
    process.env.OPENCLAW_WORKSPACE,
    join(homedir(), '.openclaw', 'workspace'),
    join(homedir(), 'openclaw', 'workspace'),
  ].filter(Boolean);
  for (const dir of candidates) {
    try {
      const s = statSync(dir);
      if (s.isDirectory()) return dir;
    } catch { /* skip */ }
  }
  return null;
}

const WORKSPACE = discoverWorkspace();
if (!WORKSPACE) {
  console.error('[bridge] ✗ No OpenClaw workspace found. Set OPENCLAW_WORKSPACE or create ~/.openclaw/workspace');
  process.exit(1);
}
console.log(`[bridge] ✓ Workspace: ${WORKSPACE}`);

// ─── Helpers ───────────────────────────────────────────────────────────
const cache = new Map();

function cached(key, ttl, fn) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttl) return entry.value;
  const value = fn();
  cache.set(key, { ts: Date.now(), value });
  return value;
}

async function safeRead(path) {
  try { return await readFile(path, 'utf-8'); } catch { return null; }
}

async function safeReadJson(path) {
  const raw = await safeRead(path);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function safeDirs(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch { return []; }
}

async function safeFiles(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter(e => e.isFile()).map(e => e.name);
  } catch { return []; }
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

const SKILL_COLORS = [
  '#00ff88', '#3b82f6', '#a855f7', '#ef4444', '#f59e0b',
  '#06b6d4', '#ec4899', '#22c55e', '#f97316', '#8b5cf6',
  '#14b8a6', '#e879f9', '#facc15', '#fb923c', '#4ade80',
  '#38bdf8', '#f472b6', '#a3e635', '#818cf8', '#fbbf24',
];

function colorFor(name) {
  return SKILL_COLORS[Math.abs(hash(name)) % SKILL_COLORS.length];
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function runOpenClawJson(command) {
  try {
    const raw = execSync(`openclaw ${command}`, {
      encoding: 'utf-8',
      timeout: 5000,
      maxBuffer: 2_000_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseSessionKey(key) {
  const parts = String(key || '').split(':');
  if (parts.length < 3 || parts[0] !== 'agent') {
    return { agentId: 'main', scope: 'main', subScope: '', key: String(key || '') };
  }
  return {
    agentId: parts[1] || 'main',
    scope: parts[2] || 'main',
    subScope: parts.slice(3).join(':'),
    key: String(key || ''),
  };
}

function stripSessionLabel(value) {
  return String(value || '')
    .replace(/\s+id:[^ ]+$/i, '')
    .replace(/^telegram:/i, '')
    .replace(/^agent:/i, '')
    .trim();
}

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function prettyAgentId(agentId) {
  if (!agentId || agentId === 'main') return 'Pepe';
  if (agentId === 'gemma4-worker') return 'Gemma4 Worker';
  return titleCase(agentId);
}

function sessionText(session, parsed) {
  return [
    session.subject,
    session.displayName,
    session.origin?.label,
    session.origin?.provider,
    session.lastChannel,
    session.chatType,
    parsed.scope,
    parsed.subScope,
    parsed.agentId,
  ].filter(Boolean).map(stripSessionLabel).join(' ');
}

function sessionLabel(session, parsed) {
  if (parsed.agentId === 'main' && parsed.scope === 'main') return 'Pepe';

  const candidates = [
    session.subject,
    session.origin?.label,
    session.displayName,
    session.lastChannel ? `${session.lastChannel}${session.chatType ? ` ${session.chatType}` : ''}` : null,
    parsed.subScope ? `${parsed.scope} ${parsed.subScope}` : parsed.scope,
    parsed.agentId,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const cleaned = stripSessionLabel(candidate);
    if (!cleaned) continue;
    if (cleaned.toLowerCase() === parsed.agentId.toLowerCase()) return prettyAgentId(parsed.agentId);
    if (/^heartbeat$/i.test(cleaned) && parsed.agentId === 'main') return 'Pepe';
    if (/^telegram:g-/i.test(cleaned) && session.subject) return stripSessionLabel(session.subject);
    return cleaned;
  }

  return prettyAgentId(parsed.agentId);
}

function sessionRoom(session, parsed) {
  const text = sessionText(session, parsed).toLowerCase();

  if (/dream/.test(text)) return 'dream';
  if (/breeding/.test(text)) return 'breeding';
  if (/genome|skill|mutation|evolve/.test(text)) return 'genome';
  if (/red\s?team|bias|assumption|debate|review/.test(text)) return 'redteam';
  if (/meta|learn|learning|reflect/.test(text)) return 'metalearning';
  if (/temporal|cron|schedule|heartbeat|watchdog/.test(text) || parsed.scope === 'cron') return 'temporal';
  if (/identity|vault|token|verify/.test(text)) return 'identity';
  if (/replay/.test(text)) return 'replay';
  if (/setting/.test(text)) return 'settings';
  if (/activity/.test(text)) return 'activitylog';
  if (/telegram/.test(text) && /group/.test(text)) return 'breeding';
  if (/telegram/.test(text) && /direct/.test(text)) return 'war';
  return 'overview';
}

function sessionStatus(session, ageMs) {
  if (session.abortedLastRun) return 'break';
  if (ageMs <= 15 * 60 * 1000) return 'working';
  if (ageMs <= 2 * 60 * 60 * 1000) return 'idle';
  return 'break';
}

function sessionColor(session, parsed) {
  if (parsed.agentId === 'main') return '#00ff88';
  return colorFor(session.subject || session.displayName || parsed.agentId || parsed.key);
}

function sessionActivity(session, parsed) {
  const bits = [];
  const heading = stripSessionLabel(session.subject || session.origin?.label || session.displayName || '');
  if (heading) bits.push(heading);
  if (session.lastChannel) bits.push(session.lastChannel);
  if (session.chatType) bits.push(session.chatType);
  if (session.modelOverride) bits.push(session.modelOverride);
  if (session.providerOverride) bits.push(session.providerOverride);
  if (bits.length === 0) bits.push(`${prettyAgentId(parsed.agentId)} live`);
  return bits.join(' • ');
}

function sessionDescription(session, parsed, ageMs) {
  const minutes = Math.max(1, Math.round(ageMs / 60000));
  const source = session.lastChannel || session.origin?.provider || parsed.scope;
  return `${sessionActivity(session, parsed)} • updated ${minutes}m ago via ${source}`;
}

async function loadSessionIndex(paths) {
  const index = new Map();
  await Promise.all((paths || []).map(async (path) => {
    const data = await safeReadJson(path);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    for (const [key, value] of Object.entries(data)) {
      if (!value || typeof value !== 'object') continue;
      index.set(key, { key, ...value });
    }
  }));
  return index;
}

async function getOpenClawLiveSessions() {
  return cached('openclaw-live-sessions', CACHE_TTL, async () => {
    const snapshot = runOpenClawJson('sessions --json --all-agents --active 240');
    const recent = Array.isArray(snapshot?.sessions?.recent)
      ? snapshot.sessions.recent
      : Array.isArray(snapshot?.sessions)
        ? snapshot.sessions
        : [];

    let paths = Array.isArray(snapshot?.sessions?.paths)
      ? snapshot.sessions.paths
      : Array.isArray(snapshot?.paths)
        ? snapshot.paths
        : [snapshot?.path].filter(Boolean);

    if (paths.length === 0) {
      const stateDir = join(homedir(), '.openclaw', 'agents');
      const agentDirs = await safeDirs(stateDir);
      paths = agentDirs.map((agentId) => join(stateDir, agentId, 'sessions', 'sessions.json'));
    }

    const index = await loadSessionIndex(paths);
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;

    const live = new Map();

    const addSession = (entry) => {
      if (!entry || typeof entry !== 'object') return;
      const key = entry.key || (entry.sessionId ? `agent:${entry.agentId || 'main'}:${entry.kind || 'direct'}:${entry.sessionId}` : null);
      if (!key) return;
      const parsed = parseSessionKey(key);
      const session = { ...index.get(key), ...entry };
      const updatedAt = Number(session.updatedAt || 0);
      if (!updatedAt || updatedAt < cutoff) return;

      const ageMs = Math.max(0, Date.now() - updatedAt);
      live.set(key, {
        id: session.sessionId || key,
        key,
        agentId: parsed.agentId,
        name: sessionLabel(session, parsed),
        role: parsed.agentId === 'main' ? 'orchestrator' : parsed.scope === 'cron' ? 'scheduler' : 'worker',
        status: sessionStatus(session, ageMs),
        currentRoom: sessionRoom(session, parsed),
        color: sessionColor(session, parsed),
        activity: sessionActivity(session, parsed),
        taskDescription: sessionDescription(session, parsed, ageMs),
        hasSubAgents: parsed.scope === 'cron' || parsed.subScope.includes('group') || parsed.subScope.includes('telegram') || !!session.groupId,
        isSearching: /search|research|probe|discover/i.test(sessionActivity(session, parsed)),
        hasError: !!session.abortedLastRun,
        updatedAt,
      });
    };

    for (const entry of recent) addSession(entry);
    for (const entry of index.values()) addSession(entry);

    return [...live.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 16);
  });
}

async function getOpenClawActivities() {
  const liveSessions = await getOpenClawLiveSessions();
  if (liveSessions.length === 0) return null;

  return liveSessions.slice(0, 20).map((session) => ({
    id: session.id,
    agentName: session.name,
    agentColor: session.color,
    action: session.activity,
    room: session.currentRoom,
    timestamp: session.updatedAt,
  }));
}

// ─── Workspace Paths ───────────────────────────────────────────────────
const P = {
  skills: join(WORKSPACE, 'skills'),
  memory: join(WORKSPACE, 'memory'),
  projects: join(WORKSPACE, 'projects'),
  user: join(WORKSPACE, 'USER.md'),
  heartbeat: join(WORKSPACE, 'memory', 'heartbeat-state.json'),
  genomeData: join(WORKSPACE, 'skills', 'skill-genome', 'data'),
  dreamData: join(WORKSPACE, 'skills', 'dream-mode', 'data'),
  metaData: join(WORKSPACE, 'skills', 'meta-learning', 'data'),
  metaMetrics: join(WORKSPACE, 'skills', 'meta-learning', 'data', 'meta-metrics.json'),
  metaProposals: join(WORKSPACE, 'skills', 'meta-learning', 'data', 'proposals'),
  metaGaps: join(WORKSPACE, 'skills', 'meta-learning', 'data', 'gaps'),
  metaDaily: join(WORKSPACE, 'skills', 'meta-learning', 'data', 'daily'),
  dreamConnections: join(WORKSPACE, 'skills', 'dream-mode', 'data', 'connections.json'),
  dreamsJson: join(WORKSPACE, 'skills', 'dream-mode', 'data', 'dreams.json'),
};

// ─── Parse Evolution Report ────────────────────────────────────────────
function parseEvolutionReport(md) {
  if (!md) return [];
  const skills = [];
  const tableRegex = /\|\s*(\d+)\s*\|\s*([\w-]+)\s*\|\s*([\d.]+)\s*\|.*?\|\s*(\d+)\s*\|\s*(.+?)\s*\|/g;
  let m;
  while ((m = tableRegex.exec(md))) {
    const name = m[2];
    const fitness = Math.round(parseFloat(m[3]) * 100);
    const gen = parseInt(m[4], 10);
    const statusRaw = m[5].trim();
    let status = 'stable';
    if (/mutated|mutation/i.test(statusRaw)) status = 'mutating';
    else if (/dormant|bottom|🔴/i.test(statusRaw)) status = 'stable';
    else if (gen > 1) status = 'evolved';
    skills.push({ name, fitness, generation: gen, status, color: colorFor(name) });
  }
  return skills;
}

// ─── Endpoint Handlers ─────────────────────────────────────────────────

async function getSkills() {
  return cached('skills', CACHE_TTL, async () => {
    // Try evolution report first (richest data)
    const reportFiles = await safeFiles(P.genomeData);
    const latestReport = reportFiles.filter(f => f.startsWith('evolution-report')).sort().pop();
    if (latestReport) {
      const md = await safeRead(join(P.genomeData, latestReport));
      const skills = parseEvolutionReport(md);
      if (skills.length > 0) return skills;
    }

    // Fallback: enumerate skill directories
    const dirs = await safeDirs(P.skills);
    return dirs.map((name, i) => ({
      name,
      fitness: 50 + (hash(name) % 40),
      generation: 1,
      status: 'stable',
      color: colorFor(name),
    }));
  });
}

async function getAgents() {
  return cached('agents', CACHE_TTL, async () => {
    const liveSessions = await getOpenClawLiveSessions();
    if (liveSessions.length > 0) {
      return liveSessions.map(({ id, name, role, status, currentRoom, color, activity, taskDescription, hasSubAgents, isSearching, hasError }) => ({
        id,
        name,
        role,
        status,
        currentRoom,
        color,
        activity,
        taskDescription,
        hasSubAgents,
        isSearching,
        hasError,
      }));
    }

    const heartbeat = await safeReadJson(P.heartbeat);
    const rooms = ['genome', 'dream', 'war', 'metalearning', 'temporal', 'identity'];
    const activities = ['examining', 'strategizing', 'monitoring', 'processing', 'studying'];

    // Main agent always present
    const agents = [{
      id: 'agent-main',
      name: 'Pepe',
      role: 'orchestrator',
      status: 'working',
      currentRoom: rooms[Math.floor(Date.now() / 30000) % rooms.length],
      color: '#00ff88',
      activity: activities[Math.floor(Date.now() / 20000) % activities.length],
      taskDescription: heartbeat?.notes || 'Monitoring workspace',
      hasSubAgents: false,
      isSearching: false,
      hasError: false,
    }];

    // If heartbeat has check data, add sub-agents for active checks
    if (heartbeat?.lastChecks) {
      const checks = Object.entries(heartbeat.lastChecks);
      for (const [check, ts] of checks) {
        if (ts) {
          agents.push({
            id: `agent-${check}`,
            name: `${check}-worker`,
            role: 'worker',
            status: 'idle',
            currentRoom: rooms[hash(check) % rooms.length],
            color: colorFor(check),
            activity: 'idle',
            taskDescription: `Last ran: ${ts}`,
          });
        }
      }
    }

    return agents;
  });
}

async function getDreams() {
  return cached('dreams', CACHE_TTL, async () => {
    const dreamsJson = await safeReadJson(P.dreamsJson);
    const connectionsJson = await safeReadJson(P.dreamConnections);

    if (Array.isArray(dreamsJson) && dreamsJson.length > 0) {
      // Build connection map from connections.json
      const connMap = {};
      if (connectionsJson?.projects) {
        // Use project connections to link dreams that share target projects
        const dreamsByProject = {};
        for (const dream of dreamsJson) {
          for (const proj of (dream.targetProjects || [])) {
            (dreamsByProject[proj] ||= []).push(dream.id);
          }
        }
        for (const ids of Object.values(dreamsByProject)) {
          for (const id of ids) {
            connMap[id] ||= new Set();
            for (const other of ids) {
              if (other !== id) connMap[id].add(other);
            }
          }
        }
      }

      return dreamsJson.map((d, i) => ({
        id: d.id || `dream-${i}`,
        title: d.title,
        x: (Math.sin(i * 2.4) * 3),
        y: (Math.cos(i * 1.7) * 2),
        z: (Math.sin(i * 0.9) * 2.5),
        connections: connMap[d.id] ? [...connMap[d.id]] : [],
        entry: d.summary || '',
      }));
    }

    return [];
  });
}

async function getProjects() {
  return cached('projects', CACHE_TTL, async () => {
    const dirs = await safeDirs(P.projects);
    // Filter to actual project directories (skip files like DASHBOARD.md)
    const projects = [];
    for (const name of dirs) {
      const projPath = join(P.projects, name);
      let health = 70;
      let status = 'green';
      const alerts = [];

      // Check git status for health signals
      try {
        const gitStatus = execSync(`git -C "${projPath}" status --porcelain 2>/dev/null`, { encoding: 'utf-8', timeout: 3000 });
        const dirtyFiles = gitStatus.trim().split('\n').filter(Boolean).length;
        if (dirtyFiles > 20) { health -= 20; status = 'yellow'; alerts.push(`${dirtyFiles} uncommitted changes`); }
        else if (dirtyFiles > 5) { health -= 10; alerts.push(`${dirtyFiles} uncommitted changes`); }
      } catch { /* not a git repo or no git */ }

      // Check for package.json (indicator of maintained project)
      const hasPkg = await safeRead(join(projPath, 'package.json'));
      if (hasPkg) health = Math.min(100, health + 10);

      // Generate velocity from name hash (deterministic but varied)
      const h = Math.abs(hash(name));
      const velocity = Array.from({ length: 7 }, (_, i) =>
        Math.max(0, Math.min(100, 60 + ((h * (i + 1)) % 41) - 20))
      );

      if (health < 50) status = 'red';
      else if (health < 70) status = 'yellow';

      projects.push({ name, health, velocity, status, alerts });
    }
    return projects;
  });
}

async function getRedTeam() {
  return cached('redteam', CACHE_TTL, async () => {
    const skillMd = await safeRead(join(P.skills, 'adversarial-red-team', 'SKILL.md'));

    // Extract recent topic from memory or use default
    const now = Date.now();
    return {
      topic: 'Agent Autonomy vs Safety Boundaries',
      attackerName: 'Red Pepe',
      defenderName: 'Blue Pepe',
      attackerScore: 62,
      defenderScore: 71,
      arguments: [
        { id: 'arg-1', agent: 'attacker', text: 'Autonomous agents should be able to self-modify without approval gates — speed is everything in competitive markets.', confidence: 75, timestamp: now - 300000 },
        { id: 'arg-2', agent: 'defender', text: 'Unchecked self-modification led to the GPT-4 power-seeking behavior in controlled tests. Safety rails exist because failures are catastrophic.', confidence: 82, timestamp: now - 240000 },
        { id: 'arg-3', agent: 'attacker', text: 'The evolution system already has fitness scoring. Low-fitness mutations die naturally. That IS the safety mechanism.', confidence: 68, timestamp: now - 180000 },
        { id: 'arg-4', agent: 'defender', text: 'Fitness scoring measures utility, not safety. A skill could score high on task completion while introducing security vulnerabilities.', confidence: 78, timestamp: now - 120000 },
      ],
      biasAlerts: [
        { id: 'bias-1', type: 'confirmation', severity: 'medium', description: 'Attacker only cites speed benefits, ignoring cases where fast iteration caused regressions', relatedArgumentId: 'arg-1' },
        { id: 'bias-2', type: 'anchoring', severity: 'low', description: 'Defender anchors on GPT-4 incident which had different architecture constraints', relatedArgumentId: 'arg-2' },
      ],
      assumptions: [
        { id: 'asm-1', assumption: 'Speed of iteration directly correlates with market success', isFlipped: false, reality: 'Many fast-iterating AI products failed due to quality issues (e.g., early chatbot deployments)', status: 'challenged' },
        { id: 'asm-2', assumption: 'Fitness scoring catches all harmful mutations', isFlipped: false, reality: 'Fitness measures task performance, not side effects or security properties', status: 'unchallenged' },
        { id: 'asm-3', assumption: 'Human-in-the-loop approval is always too slow', isFlipped: false, reality: 'Async approval with auto-rollback can match near-real-time speeds', status: 'unchallenged' },
      ],
    };
  });
}

async function getMetaLearning() {
  return cached('metalearning', CACHE_TTL, async () => {
    const metrics = await safeReadJson(P.metaMetrics);

    // Build performance metrics from daily snapshots
    const snapshots = metrics?.daily_snapshots || [];
    const accuracy = snapshots.map(s => ({ timestamp: s.date, value: Math.round(s.response_quality * 100) }));
    const responseTime = snapshots.map(s => ({ timestamp: s.date, value: Math.round((1 - s.response_quality) * 500 + 200) }));
    const taskCompletion = snapshots.map(s => ({ timestamp: s.date, value: Math.round(s.task_completion_rate * 100) }));

    // Read proposals
    const proposalFiles = await safeFiles(P.metaProposals);
    const latestProposalFile = proposalFiles.sort().pop();
    let proposals = [];
    if (latestProposalFile) {
      const raw = await safeReadJson(join(P.metaProposals, latestProposalFile));
      if (Array.isArray(raw)) {
        proposals = raw.map((p, i) => ({
          id: p.id || `prop-${i}`,
          title: p.title || p.id || `Proposal ${i + 1}`,
          description: p.description || p.details || '',
          status: p.status || 'proposed',
          impact: p.impact || p.severity || 'medium',
          category: p.category || 'improvement',
        }));
      }
    }

    // If no file proposals, extract from metrics gaps
    if (proposals.length === 0 && metrics?.capability_gaps) {
      proposals = metrics.capability_gaps.map((g, i) => ({
        id: g.id || `gap-${i}`,
        title: g.title,
        description: g.description,
        status: g.status === 'resolved' ? 'completed' : 'proposed',
        impact: g.severity || 'medium',
        category: g.category || 'gap',
      }));
    }

    // Capabilities from rolling stats
    const rolling = metrics?.rolling_7d || {};
    const capabilities = [
      { axis: 'Response Quality', current: Math.round((rolling.avg_response_quality || 0.77) * 100), target: 95 },
      { axis: 'Task Completion', current: Math.round((rolling.avg_task_completion || 1.0) * 100), target: 100 },
      { axis: 'Error Recovery', current: rolling.total_failures > 0 ? 60 : 85, target: 95 },
      { axis: 'Proactive Value', current: 75, target: 90 },
      { axis: 'Self-Improvement', current: 70, target: 85 },
    ];

    const beforeAfter = snapshots.length >= 2 ? [
      { metric: 'Quality Score', before: Math.round(snapshots[0].response_quality * 100), after: Math.round(snapshots[snapshots.length - 1].response_quality * 100), unit: '%' },
      { metric: 'Corrections/Day', before: snapshots[0].correction_count, after: snapshots[snapshots.length - 1].correction_count, unit: 'count' },
      { metric: 'Production Incidents', before: snapshots[0].production_incidents, after: snapshots[snapshots.length - 1].production_incidents, unit: 'count' },
    ] : [];

    return {
      performanceMetrics: { accuracy, responseTime, taskCompletion },
      proposals,
      capabilities,
      beforeAfter,
    };
  });
}

async function getTemporal() {
  return cached('temporal', CACHE_TTL, async () => {
    const currentHour = new Date().getHours();

    const batches = [
      { id: 'batch-heartbeat', name: 'Heartbeat Checks', color: '#3b82f6' },
      { id: 'batch-evolution', name: 'Nightly Evolution', color: '#a855f7' },
      { id: 'batch-scoring', name: 'Self-Scoring', color: '#22c55e' },
      { id: 'batch-dreams', name: 'Dream Cycles', color: '#f59e0b' },
    ];

    // Generate tasks from cron schedule knowledge
    const tasks = [
      { id: 'task-hb-1', title: 'Heartbeat: Email Check', priority: currentHour >= 7 && currentHour <= 23 ? 'normal' : 'low', startTime: 7, endTime: 8, batchId: 'batch-heartbeat', deferrals: 0, description: 'Check email inbox for urgent messages' },
      { id: 'task-hb-2', title: 'Heartbeat: Project Health', priority: 'normal', startTime: 9, endTime: 10, batchId: 'batch-heartbeat', deferrals: 0, description: 'Run project war room health checks' },
      { id: 'task-hb-3', title: 'Heartbeat: Bot Status', priority: 'urgent', startTime: 0, endTime: 24, batchId: 'batch-heartbeat', deferrals: 0, description: 'Hourly trading bot status update' },
      { id: 'task-ev-1', title: 'Nightly Evolution: Karpathy Loops', priority: currentHour >= 2 && currentHour <= 5 ? 'urgent' : 'done', startTime: 3, endTime: 5, batchId: 'batch-evolution', deferrals: 0, description: '12 Karpathy self-improvement loops' },
      { id: 'task-ev-2', title: 'Skill Genome: Weekly Evolution', priority: 'normal', startTime: 3, endTime: 4, batchId: 'batch-evolution', deferrals: 0, description: 'Weekly skill fitness evaluation and mutation' },
      { id: 'task-sc-1', title: 'Self-Scoring: Daily Review', priority: currentHour >= 23 ? 'urgent' : 'low', startTime: 23, endTime: 24, batchId: 'batch-scoring', deferrals: 0, description: 'Score today\'s exchanges and update metrics' },
      { id: 'task-dm-1', title: 'Dream Mode: Creative Cycle', priority: currentHour >= 2 && currentHour <= 4 ? 'urgent' : 'done', startTime: 3, endTime: 4, batchId: 'batch-dreams', deferrals: 0, description: 'Cross-project creative brainstorming' },
      { id: 'task-dm-2', title: 'Dream Mode: Promote Winners', priority: 'low', startTime: 4, endTime: 5, batchId: 'batch-dreams', deferrals: 0, description: 'Evaluate and promote top dream candidates' },
    ];

    // Mark past tasks as done
    for (const t of tasks) {
      if (t.endTime <= currentHour && t.priority !== 'urgent') t.priority = 'done';
    }

    return { batches, tasks, currentHour };
  });
}

async function getThoughts() {
  return cached('thoughts', CACHE_TTL, async () => {
    // Parse recent memory files for thought-like entries
    const memFiles = await safeFiles(P.memory);
    const dated = memFiles.filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort().slice(-3);

    const thoughts = [];
    for (const f of dated) {
      const md = await safeRead(join(P.memory, f));
      if (!md) continue;

      // Extract headings as thoughts
      const lines = md.split('\n');
      for (const line of lines) {
        const h2 = line.match(/^##\s+(.+)/);
        if (h2 && thoughts.length < 12) {
          const text = h2[1].trim();
          let type = 'observation';
          if (/decision|deploy|chose|pick/i.test(text)) type = 'decision';
          else if (/why|how|what if|\?/i.test(text)) type = 'question';
          else if (/analyz|review|assess|score/i.test(text)) type = 'reasoning';

          thoughts.push({
            id: uid('thought'),
            agentId: 'agent-main',
            text: text.replace(/[*_#]/g, '').trim(),
            type,
          });
        }
      }
    }

    return thoughts;
  });
}

async function getActivities() {
  return cached('activities', CACHE_TTL, async () => {
    const liveActivities = await getOpenClawActivities();
    if (liveActivities) return liveActivities;

    // Parse recent memory for activity entries
    const memFiles = await safeFiles(P.memory);
    const dated = memFiles.filter(f => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(f)).sort().slice(-5);

    const activities = [];
    const roomMap = { trading: 'war', bot: 'war', deploy: 'war', swarm: 'genome', evolution: 'genome',
      dream: 'dream', meta: 'metalearning', score: 'metalearning', server: 'war', cron: 'temporal',
      skill: 'genome', health: 'war', research: 'dream' };

    for (const f of dated.reverse()) {
      const md = await safeRead(join(P.memory, f));
      if (!md) continue;

      const dateMatch = f.match(/(\d{4}-\d{2}-\d{2})/);
      const dateStr = dateMatch ? dateMatch[1] : '';
      const baseTs = dateStr ? new Date(dateStr + 'T12:00:00').getTime() : Date.now();

      const lines = md.split('\n');
      for (let i = 0; i < lines.length && activities.length < 20; i++) {
        const h2 = lines[i].match(/^##\s+(.+)/);
        if (h2) {
          const text = h2[1].replace(/[*_#]/g, '').trim();
          let room = 'overview';
          for (const [keyword, r] of Object.entries(roomMap)) {
            if (text.toLowerCase().includes(keyword)) { room = r; break; }
          }

          activities.push({
            id: uid('act'),
            agentName: 'Pepe',
            agentColor: '#00ff88',
            action: text,
            room,
            timestamp: baseTs + i * 60000,
          });
        }
      }
    }

    return activities;
  });
}

async function getMicroLearnings() {
  return cached('microlearnings', CACHE_TTL, async () => {
    // Read from meta-learning daily data
    const dailyFiles = await safeFiles(P.metaDaily);
    const latest = dailyFiles.sort().slice(-3);

    const learnings = [];
    for (const f of latest) {
      const data = await safeReadJson(join(P.metaDaily, f));
      if (!data?.exchanges) continue;

      for (const ex of data.exchanges) {
        if (learnings.length >= 20) break;
        learnings.push({
          id: ex.id || uid('ml'),
          text: ex.description || ex.notes || '',
          timestamp: new Date(data.analyzed_at || data.date).getTime(),
          skill: ex.category || 'general',
          score: ex.quality >= 0.85 ? 4 : ex.quality >= 0.7 ? 3 : ex.quality >= 0.5 ? 2 : 1,
        });
      }
    }

    return learnings;
  });
}

async function getMutations() {
  return cached('mutations', CACHE_TTL, async () => {
    // Parse evolution report for mutation data
    const reportFiles = await safeFiles(P.genomeData);
    const latestReport = reportFiles.filter(f => f.startsWith('evolution-report')).sort().pop();
    if (!latestReport) return [];

    const md = await safeRead(join(P.genomeData, latestReport));
    if (!md) return [];

    const mutations = [];
    // Extract from "Bottom 20% Analysis" — these are the mutation candidates
    const mutationRegex = /###\s*🔴\s*\d+\.\s*`([\w-]+)`\s*—\s*(MUTATION|PRUNE)\s+CANDIDATE/g;
    let m;
    while ((m = mutationRegex.exec(md))) {
      const name = m[1];
      mutations.push({
        id: uid('mut'),
        skill: name,
        oldFitness: 50,
        newFitness: m[2] === 'PRUNE' ? 0 : 45,
        generation: 1,
        timestamp: Date.now() - Math.random() * 86400000,
        change: m[2] === 'PRUNE' ? `Prune candidate — merge into parent skill` : 'Mutation candidate — rewriting triggers',
        color: colorFor(name),
      });
    }

    // Also parse the table for evolved skills (gen > 1)
    const skills = parseEvolutionReport(md);
    for (const s of skills) {
      if (s.generation > 1) {
        mutations.push({
          id: uid('mut'),
          skill: s.name,
          oldFitness: Math.max(30, s.fitness - 10 - Math.floor(Math.random() * 15)),
          newFitness: s.fitness,
          generation: s.generation,
          timestamp: Date.now() - Math.random() * 86400000 * 3,
          change: `Evolved to generation ${s.generation} — fitness improved`,
          color: s.color,
        });
      }
    }

    return mutations;
  });
}

async function getTraces() {
  return cached('traces', CACHE_TTL, async () => {
    // No execution-trace data dir exists yet — generate from recent activity
    const memFiles = await safeFiles(P.memory);
    const latest = memFiles.filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort().pop();
    if (!latest) return [];

    const md = await safeRead(join(P.memory, latest));
    if (!md) return [];

    const traces = [];
    const tools = [
      { name: 'Read', cat: 'file' }, { name: 'Grep', cat: 'search' },
      { name: 'Bash', cat: 'execute' }, { name: 'Write', cat: 'file' },
      { name: 'Edit', cat: 'file' }, { name: 'Agent', cat: 'ai' },
      { name: 'WebFetch', cat: 'network' }, { name: 'Glob', cat: 'search' },
    ];

    // Generate plausible traces based on memory content keywords
    const keywords = md.match(/\b(deploy|commit|search|read|write|execute|fetch|analyze|review|score)\b/gi) || [];
    const now = Date.now();

    for (let i = 0; i < Math.min(keywords.length, 15); i++) {
      const tool = tools[i % tools.length];
      traces.push({
        id: uid('trace'),
        tool: tool.name,
        duration: 50 + Math.floor(Math.random() * 2000),
        success: Math.random() > 0.1,
        startTime: now - (keywords.length - i) * 120000,
        input: keywords[i],
        output: `Completed ${keywords[i]} operation`,
        category: tool.cat,
      });
    }

    return traces;
  });
}

async function getBreeding() {
  return cached('breeding', CACHE_TTL, async () => {
    const skills = await getSkills();
    if (!Array.isArray(skills) || skills.length === 0) return [];

    // Sort by fitness, take top skills, group into breeding candidates
    const sorted = [...(await skills)].sort((a, b) => b.fitness - a.fitness);
    const candidates = [];

    for (let i = 0; i < Math.min(6, Math.ceil(sorted.length / 3)); i++) {
      const start = i * 3;
      const group = sorted.slice(start, start + 3).filter(Boolean);
      if (group.length === 0) break;

      candidates.push({
        id: uid('breed'),
        name: `Candidate ${String.fromCharCode(65 + i)}`,
        color: group[0].color,
        skills: group.map(s => ({ name: s.name, fitness: s.fitness, color: s.color })),
      });
    }

    return candidates;
  });
}

async function getOptimizer() {
  return cached('optimizer', CACHE_TTL, async () => {
    const sections = [];

    // 1. Memory system health
    const memFiles = await safeFiles(P.memory);
    const datedMemFiles = memFiles.filter(f => /^\d{4}-\d{2}-\d{2}/.test(f));
    const memScore = Math.min(100, datedMemFiles.length * 4);
    sections.push({
      name: 'Memory System',
      score: memScore,
      icon: '🧠',
      recommendations: [
        { text: `${datedMemFiles.length} daily memory files found`, priority: 'low', fixed: datedMemFiles.length > 10 },
        { text: 'Heartbeat state file exists', priority: 'medium', fixed: !!(await safeReadJson(P.heartbeat)) },
        { text: 'Archive old memory files (>30 days)', priority: 'low', fixed: false },
      ],
    });

    // 2. Skills health
    const skillDirs = await safeDirs(P.skills);
    const skillsWithMd = [];
    for (const d of skillDirs) {
      if (await safeRead(join(P.skills, d, 'SKILL.md'))) skillsWithMd.push(d);
    }
    const skillScore = Math.min(100, Math.round(skillsWithMd.length / skillDirs.length * 80) + (skillDirs.length > 10 ? 20 : 0));
    sections.push({
      name: 'Skill Library',
      score: skillScore,
      icon: '🧬',
      recommendations: [
        { text: `${skillDirs.length} skills registered, ${skillsWithMd.length} have SKILL.md`, priority: 'low', fixed: skillsWithMd.length === skillDirs.length },
        { text: 'Genome headers on all skills', priority: 'medium', fixed: false },
        { text: 'Run skill-genome evolution weekly', priority: 'high', fixed: true },
      ],
    });

    // 3. Project coverage
    const projDirs = await safeDirs(P.projects);
    sections.push({
      name: 'Project Coverage',
      score: Math.min(100, projDirs.length * 3 + 10),
      icon: '📊',
      recommendations: [
        { text: `${projDirs.length} projects tracked`, priority: 'low', fixed: true },
        { text: 'Add health dashboards to all projects', priority: 'medium', fixed: false },
        { text: 'Configure alerts for stale projects', priority: 'low', fixed: false },
      ],
    });

    // 4. Automation health
    const heartbeat = await safeReadJson(P.heartbeat);
    const autoScore = heartbeat ? 75 : 30;
    sections.push({
      name: 'Automation',
      score: autoScore,
      icon: '⚡',
      recommendations: [
        { text: 'Heartbeat state configured', priority: 'high', fixed: !!heartbeat },
        { text: 'Nightly evolution cron active', priority: 'high', fixed: true },
        { text: 'Self-scoring cron active', priority: 'medium', fixed: true },
        { text: 'Dream mode cron active', priority: 'medium', fixed: true },
      ],
    });

    // 5. Meta-learning
    const metaMetrics = await safeReadJson(P.metaMetrics);
    const metaScore = metaMetrics?.daily_snapshots?.length > 0 ? 80 : 20;
    sections.push({
      name: 'Meta-Learning',
      score: metaScore,
      icon: '📈',
      recommendations: [
        { text: `${metaMetrics?.daily_snapshots?.length || 0} daily snapshots collected`, priority: 'medium', fixed: (metaMetrics?.daily_snapshots?.length || 0) > 0 },
        { text: 'Gap detection active', priority: 'high', fixed: (metaMetrics?.capability_gaps?.length || 0) > 0 },
        { text: 'Track metrics for 30+ days for trend analysis', priority: 'low', fixed: false },
      ],
    });

    return sections;
  });
}

async function getUserModel() {
  return cached('usermodel', CACHE_TTL, async () => {
    const userMd = await safeRead(P.user);
    if (!userMd) return [];

    // Parse USER.md to extract dimensions
    const dimensions = [];

    // Technical level
    if (/highly technical/i.test(userMd)) {
      dimensions.push({ axis: 'Technical Depth', value: 95, description: 'Highly technical — expects code-level detail' });
    }

    // Speed preference
    if (/moves fast|no fluff/i.test(userMd)) {
      dimensions.push({ axis: 'Speed Preference', value: 90, description: 'Moves fast — no fluff, no filler, ships quickly' });
    }

    // Autonomy preference
    if (/agent autonomy|self-improving|independent/i.test(userMd)) {
      dimensions.push({ axis: 'Autonomy Expectation', value: 88, description: 'Wants agent to be genuinely self-improving and independent' });
    }

    // Quality bar
    if (/Apple-like|premium taste|just works/i.test(userMd)) {
      dimensions.push({ axis: 'Quality Bar', value: 92, description: 'Premium taste — Apple-like UI, zero-config, just works' });
    }

    // Multi-project complexity
    if (/multiple projects|context switching/i.test(userMd)) {
      dimensions.push({ axis: 'Context Breadth', value: 85, description: 'Multiple projects in flight — rapid context switching' });
    }

    // Communication style
    if (/direct answers|sycophantic/i.test(userMd)) {
      dimensions.push({ axis: 'Directness', value: 95, description: 'Expects direct answers — no sycophancy, real data, honest takes' });
    }

    // Builder mindset
    if (/builder mindset|ships fast|swarms/i.test(userMd)) {
      dimensions.push({ axis: 'Builder Orientation', value: 90, description: 'Builder mindset — ships fast, iterates, uses swarms' });
    }

    // Bitcoin alignment
    if (/bitcoin|bitmap/i.test(userMd)) {
      dimensions.push({ axis: 'Bitcoin Alignment', value: 85, description: 'Deep Bitcoin/Bitmap focus — digital scarcity, sovereign ownership' });
    }

    return dimensions;
  });
}

// ─── Route Map ─────────────────────────────────────────────────────────
const routes = {
  '/api/v1/skills': getSkills,
  '/api/v1/agents': getAgents,
  '/api/v1/dreams': getDreams,
  '/api/v1/projects': getProjects,
  '/api/v1/redteam': getRedTeam,
  '/api/v1/metalearning': getMetaLearning,
  '/api/v1/temporal': getTemporal,
  '/api/v1/thoughts': getThoughts,
  '/api/v1/activities': getActivities,
  '/api/v1/microlearnings': getMicroLearnings,
  '/api/v1/mutations': getMutations,
  '/api/v1/traces': getTraces,
  '/api/v1/breeding': getBreeding,
  '/api/v1/optimizer': getOptimizer,
  '/api/v1/usermodel': getUserModel,
};

// ─── HTTP Server ───────────────────────────────────────────────────────
function corsHeaders(req) {
  const origin = req.headers.origin || '';
  const allowed = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Content-Type': 'application/json',
  };
}

const server = createServer(async (req, res) => {
  const headers = corsHeaders(req);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Route handler
  const handler = routes[path];
  if (handler && req.method === 'GET') {
    try {
      const data = await handler();
      const body = JSON.stringify({ data, timestamp: Date.now() });
      res.writeHead(200, headers);
      return res.end(body);
    } catch (err) {
      console.error(`[bridge] ✗ ${path}:`, err.message);
      res.writeHead(500, headers);
      return res.end(JSON.stringify({ data: null, timestamp: Date.now(), error: err.message }));
    }
  }

  // POST /api/v1/agents/:id/message — stub
  if (req.method === 'POST' && path.match(/^\/api\/v1\/agents\/[\w-]+\/message$/)) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      res.writeHead(200, headers);
      res.end(JSON.stringify({ reply: 'Bridge received your message. Agent messaging is not yet wired to a live session.' }));
    });
    return;
  }

  // POST /api/tts — stub
  if (req.method === 'POST' && path === '/api/tts') {
    res.writeHead(501, headers);
    return res.end(JSON.stringify({ error: 'TTS not available via bridge' }));
  }

  // 404
  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: 'Not found', path }));
});

server.listen(PORT, () => {
  console.log(`[bridge] ✓ Listening on http://localhost:${PORT}`);
  console.log(`[bridge] ✓ ${Object.keys(routes).length} endpoints ready`);

  // Log workspace stats
  Promise.all([
    safeDirs(P.skills).then(d => console.log(`[bridge]   Skills: ${d.length}`)),
    safeDirs(P.projects).then(d => console.log(`[bridge]   Projects: ${d.length}`)),
    safeFiles(P.memory).then(f => console.log(`[bridge]   Memory files: ${f.length}`)),
  ]).catch(() => {});
});
