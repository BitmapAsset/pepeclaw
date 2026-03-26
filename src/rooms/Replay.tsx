import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAgents } from '../api/DataProvider';

// ─── IndexedDB Replay Store ─────────────────────────────────────────

export interface ReplayEvent {
  id: number;
  timestamp: number;
  agent: string;
  agentColor: string;
  action: string;
  room: string;
  thought: string;
  position: [number, number, number];
}

const DB_NAME = 'pepeclaw-replay';
const STORE_NAME = 'events';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addEvent(event: Omit<ReplayEvent, 'id'>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).add(event);
  db.close();
}

async function getEvents(since: number): Promise<ReplayEvent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const idx = tx.objectStore(STORE_NAME).index('timestamp');
    const range = IDBKeyRange.lowerBound(since);
    const req = idx.getAll(range);
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function pruneEvents(before: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const idx = store.index('timestamp');
  const range = IDBKeyRange.upperBound(before);
  const req = idx.openCursor(range);
  req.onsuccess = () => {
    const cursor = req.result;
    if (cursor) { cursor.delete(); cursor.continue(); }
  };
  tx.oncomplete = () => db.close();
}

// Export for use by DataProvider to record events
export { addEvent as recordReplayEvent, pruneEvents as pruneReplayEvents };

// ─── Room ID colors for badges ──────────────────────────────────────
const roomBadgeColors: Record<string, string> = {
  genome: '#10b981', dream: '#8b5cf6', war: '#ef4444', redteam: '#ef4444',
  metalearning: '#06b6d4', temporal: '#f59e0b', identity: '#6366f1', breeding: '#ec4899',
};

// ─── Component ──────────────────────────────────────────────────────

export default function Replay() {
  const agents = useAgents();
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playbackIdx, setPlaybackIdx] = useState(0);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Record agent activity as replay events
  useEffect(() => {
    const interval = setInterval(() => {
      agents.forEach(agent => {
        addEvent({
          timestamp: Date.now(),
          agent: agent.name,
          agentColor: agent.color,
          action: agent.activity ?? agent.status,
          room: agent.currentRoom,
          thought: agent.taskDescription ?? '',
          position: [0, 0, 0],
        });
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [agents]);

  // Load events
  useEffect(() => {
    const load = async () => {
      const since = Date.now() - 24 * 60 * 60 * 1000;
      const evts = await getEvents(since);
      setEvents(evts);
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  // Prune old events periodically
  useEffect(() => {
    const prune = () => pruneEvents(Date.now() - 24 * 60 * 60 * 1000);
    prune();
    const id = setInterval(prune, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Playback control
  const togglePlayback = useCallback(() => {
    if (playing) {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
      setPlaying(false);
    } else {
      setPlaying(true);
      playIntervalRef.current = setInterval(() => {
        setPlaybackIdx(prev => {
          if (prev >= events.length - 1) {
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    }
  }, [playing, events.length, speed]);

  // Update interval when speed changes during playback
  useEffect(() => {
    if (playing && playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = setInterval(() => {
        setPlaybackIdx(prev => {
          if (prev >= events.length - 1) {
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [speed, playing, events.length]);

  const currentEvent = events[playbackIdx];
  const progress = events.length > 0 ? (playbackIdx / (events.length - 1)) * 100 : 0;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>Replay</h1>
          <p className="text-[11px] font-mono" style={{ color: '#64748b' }}>
            {events.length} events recorded — last 24 hours
          </p>
        </div>
        {playing && (
          <div className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider"
            style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
            REPLAY
          </div>
        )}
      </motion.div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto scroll-fade px-6">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl mb-3">🎬</div>
              <div className="text-sm" style={{ color: '#64748b' }}>Recording agent activity...</div>
              <div className="text-[11px]" style={{ color: '#475569' }}>Events will appear here as agents work</div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((evt, idx) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{
                  opacity: playing && idx === playbackIdx ? 1 : playing && idx > playbackIdx ? 0.3 : 1,
                  x: 0,
                  scale: playing && idx === playbackIdx ? 1.02 : 1,
                }}
                className="glass rounded-lg px-3 py-2 flex items-center gap-3 cursor-pointer"
                style={{
                  borderLeft: playing && idx === playbackIdx ? `2px solid ${evt.agentColor}` : '2px solid transparent',
                }}
                onClick={() => { setPlaybackIdx(idx); setPlaying(false); }}
              >
                <div className="text-[10px] font-mono tabular-nums shrink-0" style={{ color: '#64748b', width: 70 }}>
                  {formatTime(evt.timestamp)}
                </div>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: evt.agentColor }} />
                <div className="text-[11px] font-mono shrink-0" style={{ color: evt.agentColor }}>
                  {evt.agent}
                </div>
                <div className="text-[11px] truncate" style={{ color: '#94a3b8' }}>
                  {evt.thought || evt.action}
                </div>
                <div
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: `${roomBadgeColors[evt.room] ?? '#64748b'}15`,
                    color: roomBadgeColors[evt.room] ?? '#64748b',
                  }}
                >
                  {evt.room}
                </div>
                <div className="text-[9px] font-mono shrink-0" style={{ color: '#475569' }}>
                  {formatTimeAgo(evt.timestamp)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Playback controls (video player style) */}
      <div className="glass-strong px-6 py-3 flex flex-col gap-2">
        {/* Scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono tabular-nums" style={{ color: '#64748b', width: 60 }}>
            {currentEvent ? formatTime(currentEvent.timestamp) : '--:--:--'}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(events.length - 1, 0)}
            value={playbackIdx}
            onChange={e => setPlaybackIdx(parseInt(e.target.value))}
            className="flex-1 accent-[#8b5cf6] h-1"
          />
          <span className="text-[10px] font-mono tabular-nums" style={{ color: '#64748b', width: 60, textAlign: 'right' }}>
            {events.length > 0 ? formatTime(events[events.length - 1].timestamp) : '--:--:--'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-0.5 rounded-full" style={{ background: '#1a1b2e' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: '#8b5cf6' }} />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPlaybackIdx(0)}
            className="text-lg cursor-pointer border-0 bg-transparent"
            style={{ color: '#64748b' }}
            title="Rewind"
          >⏮</button>
          <button
            onClick={togglePlayback}
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-0 text-lg"
            style={{ background: '#8b5cf620', color: '#8b5cf6' }}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => setPlaybackIdx(Math.max(events.length - 1, 0))}
            className="text-lg cursor-pointer border-0 bg-transparent"
            style={{ color: '#64748b' }}
            title="Skip to end"
          >⏭</button>
          <div className="ml-4 flex gap-1">
            {[1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer border-0 transition-all"
                style={{
                  background: speed === s ? '#8b5cf620' : 'transparent',
                  color: speed === s ? '#8b5cf6' : '#64748b',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono ml-2" style={{ color: '#475569' }}>
            {playbackIdx + 1} / {events.length}
          </span>
        </div>
      </div>
    </div>
  );
}
