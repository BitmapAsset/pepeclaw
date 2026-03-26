import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgents } from '../api/DataProvider';
import { mockActivities, type RoomId, type ActivityEntry } from '../data/mockData';

const roomColors: Record<string, string> = {
  genome: '#10b981', dream: '#8b5cf6', war: '#ef4444', redteam: '#ef4444',
  metalearning: '#06b6d4', temporal: '#f59e0b', identity: '#6366f1', breeding: '#ec4899',
};

const roomEmojis: Record<string, string> = {
  genome: '🧬', dream: '💭', war: '⚔️', redteam: '🔴',
  metalearning: '🧠', temporal: '⏳', identity: '🔐', breeding: '🧪',
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function ActivityLog() {
  const agents = useAgents();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  // Generate live activities from agent state + mock history
  const activities: ActivityEntry[] = useMemo(() => {
    const live: ActivityEntry[] = agents.map((a, i) => ({
      id: `live-${a.id}-${i}`,
      agentName: a.name,
      agentColor: a.color,
      action: a.taskDescription ?? a.activity ?? a.status,
      room: a.currentRoom as RoomId,
      timestamp: Date.now() - i * 3000,
    }));
    return [...live, ...mockActivities].sort((a, b) => b.timestamp - a.timestamp);
  }, [agents]);

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
        <h1 className="text-lg font-semibold mb-1" style={{ color: '#e2e8f0' }}>Activity Log</h1>
        <p className="text-[11px] font-mono mb-4" style={{ color: '#64748b' }}>
          {filtered.length} events — live feed from all agents
        </p>

        {/* Search */}
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

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-2">
          <FilterPill label="Agent" value={filterAgent} options={['all', ...uniqueAgents]} onChange={setFilterAgent} />
          <FilterPill label="Room" value={filterRoom} options={['all', ...uniqueRooms]} onChange={setFilterRoom} />
          <FilterPill label="Type" value={filterAction} options={['all', ...uniqueActions]} onChange={setFilterAction} />
        </div>
      </motion.div>

      {/* Event list */}
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
              {/* Agent avatar */}
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
