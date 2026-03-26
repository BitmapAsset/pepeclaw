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
];

export function MiniMap({ activeRoom, onRoomChange }: { activeRoom: RoomId; onRoomChange: (r: RoomId) => void }) {
  const { agents } = useData();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="fixed bottom-20 right-4 z-40 glass-strong rounded-xl p-2"
      style={{
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 32px)', gridTemplateRows: 'repeat(2, 32px)', gap: 3 }}>
        {roomLayout.map(room => {
          const isActive = activeRoom === room.id;
          const agentsHere = agents.filter(a => a.currentRoom === room.id);
          return (
            <motion.button
              key={room.id}
              onClick={() => onRoomChange(room.id)}
              whileHover={{ scale: 1.15, y: -1 }}
              whileTap={{ scale: 0.9 }}
              title={room.id}
              style={{
                gridColumn: room.x + 1,
                gridRow: room.y + 1,
                width: 32,
                height: 32,
                borderRadius: 6,
                border: `1px solid ${isActive ? room.color + '80' : 'rgba(255,255,255,0.06)'}`,
                background: isActive ? `${room.color}20` : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: isActive ? `0 0 12px ${room.color}40, inset 0 0 8px ${room.color}10` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 10 }}>{room.emoji}</span>
              {agentsHere.length > 0 && (
                <div style={{ display: 'flex', gap: 1, marginTop: 1 }}>
                  {agentsHere.slice(0, 3).map(a => (
                    <div
                      key={a.id}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        background: a.color,
                        boxShadow: `0 0 4px ${a.color}88`,
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
