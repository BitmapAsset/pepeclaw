import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgents, useData } from '../api/DataProvider';
import type { RoomId, ActivityEntry } from '../data/types';

const roomColors: Record<string, string> = {
  genome: '#10b981', dream: '#8b5cf6', war: '#ef4444', redteam: '#ef4444',
  metalearning: '#06b6d4', temporal: '#f59e0b', identity: '#6366f1', breeding: '#ec4899',
};

const roomEmojis: Record<string, string> = {
  genome: '🧬', dream: '💭', war: '⚔️', redteam: '🔴',
  metalearning: '🧠', temporal: '⏳', identity: '🔐', breeding: '🧪',
};

const categoryColors: Record<string, string> = {
  file: '#3b82f6',
  search: '#8b5cf6',
  execute: '#f59e0b',
  network: '#06b6d4',
  ai: '#ec4899',
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ── Traces Waterfall ─────────────────────────────────────────── */
function TracesView() {
  const { traces } = useData();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSuccess, setFilterSuccess] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const maxEnd = useMemo(() =>
    traces.length ? Math.max(...traces.map(t => t.startTime + t.duration)) : 0,
  [traces]);

  const filtered = useMemo(() => {
    return traces.filter(t => {
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterSuccess === 'success' && !t.success) return false;
      if (filterSuccess === 'fail' && t.success) return false;
      return true;
    });
  }, [traces, filterCategory, filterSuccess]);

  const categories = [...new Set(traces.map(t => t.category))];

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-3 px-6">
        <FilterPill
          label="Category"
          value={filterCategory}
          options={['all', ...categories]}
          onChange={setFilterCategory}
        />
        <FilterPill
          label="Status"
          value={filterSuccess}
          options={['all', 'success', 'fail']}
          onChange={setFilterSuccess}
        />
        <div className="ml-auto text-[10px] font-mono" style={{ color: '#64748b' }}>
          {filtered.length} traces · Total: {formatDuration(maxEnd)}
        </div>
      </div>

      {/* Waterfall */}
      <div className="flex-1 overflow-y-auto scroll-fade px-6 pb-4">
        {/* Time axis */}
        <div className="flex items-center mb-2 pl-24" style={{ borderBottom: '1px solid #1a1b2e' }}>
          {[0, 25, 50, 75, 100].map(pct => (
            <span
              key={pct}
              className="text-[8px] font-mono"
              style={{ color: '#475569', position: 'absolute', left: `calc(96px + ${pct}% * 0.65)` }}
            >
              {formatDuration(maxEnd * pct / 100)}
            </span>
          ))}
          <div className="h-px flex-1" style={{ background: '#1a1b2e' }} />
        </div>

        <AnimatePresence initial={false}>
          {filtered.map((trace, i) => {
            const leftPct = (trace.startTime / maxEnd) * 100;
            const widthPct = Math.max((trace.duration / maxEnd) * 100, 1);
            const color = categoryColors[trace.category] || '#64748b';
            const isExpanded = expandedId === trace.id;

            return (
              <motion.div
                key={trace.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
                className="mb-1"
              >
                <div
                  className="flex items-center gap-2 py-1.5 cursor-pointer rounded-lg hover:brightness-110 transition-all px-2"
                  onClick={() => setExpandedId(isExpanded ? null : trace.id)}
                  style={{ background: isExpanded ? '#12131f' : 'transparent' }}
                >
                  {/* Tool name */}
                  <div className="w-20 shrink-0 flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: trace.success ? '#22c55e' : '#ef4444' }}
                    />
                    <span className="text-[11px] font-mono font-semibold truncate" style={{ color }}>
                      {trace.tool}
                    </span>
                  </div>

                  {/* Waterfall bar */}
                  <div className="flex-1 relative h-5">
                    <motion.div
                      className="absolute top-1 h-3 rounded-sm"
                      style={{
                        left: `${leftPct}%`,
                        background: trace.success
                          ? `linear-gradient(90deg, ${color}90, ${color}60)`
                          : `linear-gradient(90deg, #ef444490, #ef444460)`,
                        boxShadow: `0 0 8px ${trace.success ? color : '#ef4444'}30`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Duration */}
                  <span className="text-[10px] font-mono tabular-nums shrink-0 w-12 text-right" style={{ color: '#94a3b8' }}>
                    {formatDuration(trace.duration)}
                  </span>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden ml-24 mr-14"
                    >
                      <div
                        className="rounded-lg px-3 py-2 mb-1 text-[10px] font-mono"
                        style={{ background: '#0a0b14', border: '1px solid #1a1b2e' }}
                      >
                        <div className="flex gap-4 mb-1">
                          <span style={{ color: '#64748b' }}>Category:</span>
                          <span style={{ color }}>{trace.category}</span>
                          <span style={{ color: '#64748b' }}>Status:</span>
                          <span style={{ color: trace.success ? '#22c55e' : '#ef4444' }}>
                            {trace.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                        <div className="mb-1">
                          <span style={{ color: '#64748b' }}>Input: </span>
                          <span style={{ color: '#e2e8f0' }}>{trace.input}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Output: </span>
                          <span style={{ color: trace.success ? '#94a3b8' : '#ef4444' }}>{trace.output}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function ActivityLog() {
  const agents = useAgents();
  const { activities: gatewayActivities } = useData();
  const [tab, setTab] = useState<'activity' | 'traces'>('activity');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  const baseTimestamp = useRef(Date.now());
  const activities: ActivityEntry[] = useMemo(() => {
    const live: ActivityEntry[] = agents.map((a, i) => ({
      id: `live-${a.id}-${i}`,
      agentName: a.name,
      agentColor: a.color,
      action: a.taskDescription ?? a.activity ?? a.status,
      room: a.currentRoom as RoomId,
      timestamp: baseTimestamp.current - i * 3000,
    }));
    return [...live, ...gatewayActivities].sort((a, b) => b.timestamp - a.timestamp);
  }, [agents, gatewayActivities]);

  const uniqueAgents = useMemo(() => [...new Set(activities.map(a => a.agentName))], [activities]);
  const uniqueRooms = useMemo(() => [...new Set(activities.map(a => a.room))], [activities]);
  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    activities.forEach(a => {
      const type = a.action.includes('Mutated') ? 'mutation' :
        a.action.includes('Detected') || a.action.includes('Fix') ? 'alert' :
        a.action.includes('Won') || a.action.includes('Bred') ? 'achievement' : 'activity';
      actions.add(type);
    });
    return [...actions];
  }, [activities]);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (filterAgent !== 'all' && a.agentName !== filterAgent) return false;
      if (filterRoom !== 'all' && a.room !== filterRoom) return false;
      if (filterAction !== 'all') {
        const type = a.action.includes('Mutated') ? 'mutation' :
          a.action.includes('Detected') || a.action.includes('Fix') ? 'alert' :
          a.action.includes('Won') || a.action.includes('Bred') ? 'achievement' : 'activity';
        if (type !== filterAction) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return a.agentName.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q) ||
          a.room.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activities, filterAgent, filterRoom, filterAction, searchQuery]);

  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-4"
      >
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Activity Log</h1>
          <div className="flex-1" />
          {/* Tab switcher */}
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: '#12131f' }}>
            <button
              onClick={() => setTab('activity')}
              className="px-3 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider cursor-pointer border-0 transition-all"
              style={{
                background: tab === 'activity' ? '#8b5cf620' : 'transparent',
                color: tab === 'activity' ? '#8b5cf6' : '#64748b',
              }}
            >
              Activity
            </button>
            <button
              onClick={() => setTab('traces')}
              className="px-3 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider cursor-pointer border-0 transition-all"
              style={{
                background: tab === 'traces' ? '#f59e0b20' : 'transparent',
                color: tab === 'traces' ? '#f59e0b' : '#64748b',
              }}
            >
              Traces
            </button>
          </div>
        </div>

        {tab === 'activity' && (
          <>
            <p className="text-[11px] font-mono mb-4" style={{ color: '#64748b' }}>
              {filtered.length} events — live feed from all agents
            </p>
            <div className="glass rounded-lg px-3 py-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search agents, actions, rooms..."
                className="w-full bg-transparent border-0 text-sm font-mono outline-none"
                style={{ color: '#e2e8f0' }}
              />
            </div>
            <div className="flex gap-2 flex-wrap mb-2">
              <FilterPill label="Agent" value={filterAgent} options={['all', ...uniqueAgents]} onChange={setFilterAgent} />
              <FilterPill label="Room" value={filterRoom} options={['all', ...uniqueRooms]} onChange={setFilterRoom} />
              <FilterPill label="Type" value={filterAction} options={['all', ...uniqueActions]} onChange={setFilterAction} />
            </div>
          </>
        )}
      </motion.div>

      {tab === 'activity' ? (
        <div className="flex-1 overflow-y-auto scroll-fade px-6 pb-4">
          <AnimatePresence initial={false}>
            {filtered.map(entry => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="glass rounded-lg px-4 py-3 mb-2 flex items-start gap-3 cursor-pointer hover:brightness-110 transition-all"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ background: `${entry.agentColor}20`, color: entry.agentColor }}
                >
                  {entry.agentName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold" style={{ color: entry.agentColor }}>
                      {entry.agentName}
                    </span>
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1"
                      style={{
                        background: `${roomColors[entry.room] ?? '#64748b'}15`,
                        color: roomColors[entry.room] ?? '#64748b',
                      }}
                    >
                      {roomEmojis[entry.room]} {entry.room}
                    </span>
                  </div>
                  <div className="text-[11px] truncate" style={{ color: '#94a3b8' }}>
                    {entry.action}
                  </div>
                </div>
                <div className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: '#475569' }}>
                  {formatTimeAgo(entry.timestamp)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm" style={{ color: '#64748b' }}>No events match your filters</div>
            </div>
          )}
        </div>
      ) : (
        <TracesView />
      )}
    </div>
  );
}

function FilterPill({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer border-0 flex items-center gap-1 transition-all"
        style={{
          background: value !== 'all' ? '#8b5cf620' : '#1a1b2e',
          color: value !== 'all' ? '#8b5cf6' : '#64748b',
        }}
      >
        {label}: {value === 'all' ? 'All' : value}
        <span style={{ fontSize: 8 }}>▼</span>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 mt-1 glass-strong rounded-lg py-1 z-50 min-w-[120px]"
        >
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="block w-full text-left px-3 py-1.5 text-[11px] font-mono cursor-pointer border-0 bg-transparent transition-colors hover:brightness-125"
              style={{ color: value === opt ? '#8b5cf6' : '#94a3b8' }}
            >
              {opt === 'all' ? 'All' : opt}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
