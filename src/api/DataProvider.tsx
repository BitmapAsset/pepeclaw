import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { gateway, type AgentState } from './gateway';
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

// Default mock agents when gateway is unavailable
const mockAgents: AgentState[] = [
  { id: 'a1', name: 'Atlas', role: 'architect', status: 'working', currentRoom: 'genome', color: '#00ff88' },
  { id: 'a2', name: 'Nova', role: 'researcher', status: 'working', currentRoom: 'dream', color: '#8b5cf6' },
  { id: 'a3', name: 'Sentinel', role: 'defender', status: 'idle', currentRoom: 'war', color: '#ef4444' },
  { id: 'a4', name: 'Cipher', role: 'analyst', status: 'working', currentRoom: 'redteam', color: '#f87171' },
  { id: 'a5', name: 'Echo', role: 'learner', status: 'working', currentRoom: 'metalearning', color: '#06b6d4' },
  { id: 'a6', name: 'Chrono', role: 'scheduler', status: 'break', currentRoom: 'temporal', color: '#f59e0b' },
  { id: 'a7', name: 'Vault', role: 'verifier', status: 'idle', currentRoom: 'identity', color: '#f97316' },
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
};

const DataContext = createContext<DataState>(defaults);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(defaults);

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
        setState(prev => ({
          skills: skills ?? prev.skills,
          dreamNodes: dreamNodes ?? prev.dreamNodes,
          projects: projects ?? prev.projects,
          redTeamData: redTeamData ?? prev.redTeamData,
          metaLearningData: metaLearningData ?? prev.metaLearningData,
          temporalData: temporalData ?? prev.temporalData,
          agents: agents ?? prev.agents,
          connected: anySucceeded,
        }));
      }
    } catch (err) {
      if (!signal.aborted) {
        console.warn('[PepeClaw] Gateway unavailable, using mock data:', err);
      }
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchAll(ac.signal);
    const interval = setInterval(() => fetchAll(ac.signal), 15000);
    return () => {
      ac.abort();
      clearInterval(interval);
    };
  }, [fetchAll]);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}

export function useAgents() {
  return useContext(DataContext).agents;
}
