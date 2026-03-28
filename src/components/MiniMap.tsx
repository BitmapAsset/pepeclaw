import { motion } from 'framer-motion';
import type { RoomId } from '../data/mockData';
import { useData } from '../api/DataProvider';

const roomLayout: { id: RoomId; label: string; emoji: string; x: number; y: number; color: string }[] = [
  { id: 'genome', label: 'GEN', emoji: '🧬', x: 0, y: 0, color: '#10b981' },
  { id: 'dream', label: 'DRM', emoji: '💭', x: 1, y: 0, color: '#8b5cf6' },
  { id: 'war', label: 'WAR', emoji: '⚔️', x: 2, y: 0, color: '#ef4444' },
  { id: 'redteam', label: 'RED', emoji: '🔴', x: 3, y: 0, color: '#ef4444' },
  { id: 'metalearning', label: 'MET', emoji: '🧠', x: 0, y: 1, color: '#06b6d4' },
  { id: 'temporal', label: 'TMP', emoji: '⏳', x: 1, y: 1, color: '#f59e0b' },
  { id: 'identity', label: 'IDV', emoji: '🔐', x: 2, y: 1, color: '#6366f1' },
  { id: 'breeding', label: 'BRD', emoji: '🧪', x: 3, y: 1, color: '#ec4899' },
];

export function MiniMap({ activeRoom, onRoomChange }: { activeRoom: RoomId; onRoomChange: (r: RoomId) => void }) {
  const { agents } = useData();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="fixed bottom-20 right-2 sm:right-4 z-40 glass-strong rounded-xl p-2 sm:p-2.5"
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 60px rgba(139,92,246,0.05)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[7px] font-mono tracking-widest uppercase" style={{ color: '#64748b' }}>MAP</span>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full" style={{ background: '#22c55e' }} />
          <div className="w-1 h-1 rounded-full" style={{ background: '#f59e0b' }} />
          <div className="w-1 h-1 rounded-full" style={{ background: '#ef4444' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 34px)', gridTemplateRows: 'repeat(2, 34px)', gap: 3 }}>
        {roomLayout.map(room => {
          const isActive = activeRoom === room.id;
          const agentsHere = agents.filter(a => a.currentRoom === room.id);
          return (
            <motion.button
              key={room.id}
              onClick={() => onRoomChange(room.id)}
              whileHover={{ scale: 1.15, y: -1 }}
              whileTap={{ scale: 0.9 }}
              title={`${room.id} (${agentsHere.length} agents)`}
              style={{
                gridColumn: room.x + 1,
                gridRow: room.y + 1,
                width: 34,
                height: 34,
                borderRadius: 8,
                border: `1px solid ${isActive ? room.color + '80' : 'rgba(255,255,255,0.06)'}`,
                background: isActive
                  ? `linear-gradient(135deg, ${room.color}25, ${room.color}10)`
                  : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: isActive
                  ? `0 0 12px ${room.color}40, inset 0 0 8px ${room.color}10, 0 0 20px ${room.color}15`
                  : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 11 }}>{room.emoji}</span>
              {agentsHere.length > 0 && (
                <div style={{ display: 'flex', gap: 2, marginTop: 1 }}>
                  {agentsHere.slice(0, 3).map(a => (
                    <div
                      key={a.id}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        background: a.color,
                        boxShadow: `0 0 6px ${a.color}aa`,
                      }}
                    />
                  ))}
                  {agentsHere.length > 3 && (
                    <span style={{ fontSize: 6, color: '#64748b', lineHeight: '5px' }}>+{agentsHere.length - 3}</span>
                  )}
                </div>
              )}
              {/* Active room indicator */}
              {isActive && (
                <motion.div
                  className="absolute -bottom-0.5 left-1/4 right-1/4 h-[2px] rounded-full"
                  style={{ background: room.color, boxShadow: `0 0 6px ${room.color}` }}
                  layoutId="minimap-indicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
