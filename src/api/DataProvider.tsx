import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { gateway, discoverGateway, onConnectionStatusChange, type AgentState, type ConnectionStatus } from './gateway';
import {
  skills as mockSkills,
  dreamNodes as mockDreamNodes,
  projects as mockProjects,
  redTeamData as mockRedTeamData,
  metaLearningData as mockMetaLearningData,
  temporalData as mockTemporalData,
  type Skill,
  type DreamNode,
  type Project,
} from '../data/mockData';

// Default mock agents — 9 agents across all 8 rooms, diverse activities and emotions
const mockAgents: AgentState[] = [
  { id: 'a1', name: 'Atlas', role: 'architect', status: 'working', currentRoom: 'genome', color: '#00ff88', activity: 'processing', taskDescription: 'Mutating Code Generation skill — gen 47 → 48' },
  { id: 'a2', name: 'Nova', role: 'researcher', status: 'working', currentRoom: 'dream', color: '#8b5cf6', activity: 'brainstorming', taskDescription: 'Exploring dream merge: neural architecture + self-modifying prompts' },
  { id: 'a3', name: 'Sentinel', role: 'defender', status: 'working', currentRoom: 'war', color: '#ef4444', activity: 'monitoring', taskDescription: 'Scanning for anomalous deployment patterns in PepeClaw Core' },
  { id: 'a4', name: 'Cipher', role: 'analyst', status: 'working', currentRoom: 'redteam', color: '#f87171', hasSubAgents: true, activity: 'debating', taskDescription: 'Round 5: microservices latency vs. blast radius tradeoff' },
  { id: 'a5', name: 'Echo', role: 'learner', status: 'working', currentRoom: 'metalearning', color: '#06b6d4', isSearching: true, activity: 'studying', taskDescription: 'Self-modifying reasoning module — accuracy +3% this cycle' },
  { id: 'a6', name: 'Chrono', role: 'scheduler', status: 'working', currentRoom: 'temporal', color: '#f59e0b', activity: 'managing', taskDescription: 'Rebalancing batch priorities — 2 urgent tasks deferred' },
  { id: 'a7', name: 'Vault', role: 'verifier', status: 'working', currentRoom: 'identity', color: '#f97316', activity: 'verifying', taskDescription: 'Minting identity token #48 — hash verification in progress' },
  { id: 'a8', name: 'Helix', role: 'breeder', status: 'working', currentRoom: 'breeding', color: '#ec4899', activity: 'processing', taskDescription: 'Crossover: Atlas × Echo — blending 6 skill genes' },
  { id: 'a9', name: 'Shade', role: 'adversary', status: 'idle', currentRoom: 'redteam', color: '#a855f7', activity: 'debating', taskDescription: 'Playing devil\'s advocate on authentication assumptions' },
];

interface DataState {
  skills: Skill[];
  dreamNodes: DreamNode[];
  projects: Project[];
  redTeamData: typeof mockRedTeamData;
  metaLearningData: typeof mockMetaLearningData;
  temporalData: typeof mockTemporalData;
  agents: AgentState[];
  connected: boolean;
  connectionStatus: ConnectionStatus;
}

const defaults: DataState = {
  skills: mockSkills,
  dreamNodes: mockDreamNodes,
  projects: mockProjects,
  redTeamData: mockRedTeamData,
  metaLearningData: mockMetaLearningData,
  temporalData: mockTemporalData,
  agents: mockAgents,
  connected: false,
  connectionStatus: 'offline',
};

const DataContext = createContext<DataState>(defaults);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(defaults);
  const connectedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async (signal: AbortSignal) => {
    try {
      const [skills, dreamNodes, projects, redTeamData, metaLearningData, temporalData, agents] =
        await Promise.all([
          gateway.getSkills(signal).catch(() => null),
          gateway.getDreamNodes(signal).catch(() => null),
          gateway.getProjects(signal).catch(() => null),
          gateway.getRedTeamData(signal).catch(() => null),
          gateway.getMetaLearningData(signal).catch(() => null),
          gateway.getTemporalData(signal).catch(() => null),
          gateway.getAgents(signal).catch(() => null),
        ]);

      const anySucceeded = [skills, dreamNodes, projects, redTeamData, metaLearningData, temporalData, agents]
        .some(r => r !== null);

      if (!signal.aborted) {
        connectedRef.current = anySucceeded;
        setState(prev => ({
          skills: skills ?? prev.skills,
          dreamNodes: dreamNodes ?? prev.dreamNodes,
          projects: projects ?? prev.projects,
          redTeamData: redTeamData ?? prev.redTeamData,
          metaLearningData: metaLearningData ?? prev.metaLearningData,
          temporalData: temporalData ?? prev.temporalData,
          agents: agents ?? prev.agents,
          connected: anySucceeded,
          connectionStatus: anySucceeded ? 'connected' : prev.connectionStatus,
        }));
      }
    } catch {
      // Silent failure — mock data already loaded as defaults
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    // Listen for connection status changes from the gateway module
    const unsub = onConnectionStatusChange((status) => {
      connectedRef.current = status === 'connected';
      setState(prev => {
        if (prev.connectionStatus === status) return prev;
        return { ...prev, connectionStatus: status };
      });
    });

    // Non-blocking gateway discovery — app renders instantly with mock data
    async function init() {
      const url = await discoverGateway();
      if (url && !ac.signal.aborted) {
        await fetchAll(ac.signal);
      }
    }

    // Fire and forget — don't block render
    init();

    // Poll for data every 15s ONLY when connected
    dataTimerRef.current = setInterval(() => {
      if (connectedRef.current) {
        fetchAll(ac.signal);
      }
    }, 15_000);

    // Retry gateway discovery every 120s when offline (quiet, debug only)
    retryTimerRef.current = setInterval(async () => {
      if (!connectedRef.current && !ac.signal.aborted) {
        console.debug('[PepeClaw] Retrying gateway discovery...');
        const url = await discoverGateway();
        if (url && !ac.signal.aborted) {
          console.debug('[PepeClaw] Gateway found:', url);
          await fetchAll(ac.signal);
        }
      }
    }, 120_000);

    return () => {
      ac.abort();
      if (dataTimerRef.current) clearInterval(dataTimerRef.current);
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
      unsub();
    };
  }, [fetchAll]);

  // Memoize context value — state reference only changes on actual data updates
  const value = useMemo(() => state, [state]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}

export function useAgents() {
  return useContext(DataContext).agents;
}

export function useConnectionStatus(): ConnectionStatus {
  return useContext(DataContext).connectionStatus;
}
