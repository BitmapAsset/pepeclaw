import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { gateway, discoverGateway, onConnectionStatusChange, type AgentState, type ConnectionStatus } from './gateway';
import type {
  Skill,
  DreamNode,
  Project,
  RedTeamData,
  MetaLearningData,
  TemporalData,
  ThoughtBubble,
  ActivityEntry,
  MicroLearning,
  SkillMutation,
  TraceEntry,
  BreedingCandidate,
  OptimizerSection,
  UserModelDimension,
} from '../data/types';

interface DataState {
  skills: Skill[];
  dreamNodes: DreamNode[];
  projects: Project[];
  redTeamData: RedTeamData | null;
  metaLearningData: MetaLearningData | null;
  temporalData: TemporalData | null;
  agents: AgentState[];
  thoughts: ThoughtBubble[];
  activities: ActivityEntry[];
  microLearnings: MicroLearning[];
  mutations: SkillMutation[];
  traces: TraceEntry[];
  breedingCandidates: BreedingCandidate[];
  optimizerSections: OptimizerSection[];
  userModelDimensions: UserModelDimension[];
  connected: boolean;
  connectionStatus: ConnectionStatus;
}

const defaults: DataState = {
  skills: [],
  dreamNodes: [],
  projects: [],
  redTeamData: null,
  metaLearningData: null,
  temporalData: null,
  agents: [],
  thoughts: [],
  activities: [],
  microLearnings: [],
  mutations: [],
  traces: [],
  breedingCandidates: [],
  optimizerSections: [],
  userModelDimensions: [],
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
      const [
        skills, dreamNodes, projects, redTeamData, metaLearningData, temporalData, agents,
        thoughts, activities, microLearnings, mutations, traces, breedingCandidates,
        optimizerSections, userModelDimensions,
      ] = await Promise.all([
        gateway.getSkills(signal).catch(() => null),
        gateway.getDreamNodes(signal).catch(() => null),
        gateway.getProjects(signal).catch(() => null),
        gateway.getRedTeamData(signal).catch(() => null),
        gateway.getMetaLearningData(signal).catch(() => null),
        gateway.getTemporalData(signal).catch(() => null),
        gateway.getAgents(signal).catch(() => null),
        gateway.getThoughts(signal).catch(() => null),
        gateway.getActivities(signal).catch(() => null),
        gateway.getMicroLearnings(signal).catch(() => null),
        gateway.getMutations(signal).catch(() => null),
        gateway.getTraces(signal).catch(() => null),
        gateway.getBreedingCandidates(signal).catch(() => null),
        gateway.getOptimizerData(signal).catch(() => null),
        gateway.getUserModel(signal).catch(() => null),
      ]);

      const anySucceeded = [
        skills, dreamNodes, projects, redTeamData, metaLearningData, temporalData, agents,
        thoughts, activities, microLearnings, mutations, traces, breedingCandidates,
        optimizerSections, userModelDimensions,
      ].some(r => r !== null);

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
          thoughts: thoughts ?? prev.thoughts,
          activities: activities ?? prev.activities,
          microLearnings: microLearnings ?? prev.microLearnings,
          mutations: mutations ?? prev.mutations,
          traces: traces ?? prev.traces,
          breedingCandidates: breedingCandidates ?? prev.breedingCandidates,
          optimizerSections: optimizerSections ?? prev.optimizerSections,
          userModelDimensions: userModelDimensions ?? prev.userModelDimensions,
          connected: anySucceeded,
          connectionStatus: anySucceeded ? 'connected' : prev.connectionStatus,
        }));
      }
    } catch {
      // Silent failure — empty defaults already loaded
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    const unsub = onConnectionStatusChange((status) => {
      connectedRef.current = status === 'connected';
      setState(prev => {
        if (prev.connectionStatus === status) return prev;
        return { ...prev, connectionStatus: status };
      });
    });

    async function init() {
      const url = await discoverGateway();
      if (url && !ac.signal.aborted) {
        await fetchAll(ac.signal);
      }
    }

    init();

    // Poll for data every 15s ONLY when connected
    dataTimerRef.current = setInterval(() => {
      if (connectedRef.current) {
        fetchAll(ac.signal);
      }
    }, 15_000);

    // Retry gateway discovery every 120s when offline
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
