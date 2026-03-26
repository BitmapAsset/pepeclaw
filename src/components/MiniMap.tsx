import { motion } from 'framer-motion';
import type { RoomId } from '../data/mockData';
import { useData } from '../api/DataProvider';

const roomLayout: { id: RoomId; label: string; x: number; y: number; color: string }[] = [
  { id: 'genome', label: 'GEN', x: 0, y: 0, color: '#00ff88' },
  { id: 'dream', label: 'DRM', x: 1, y: 0, color: '#8b5cf6' },
  { id: 'war', label: 'WAR', x: 2, y: 0, color: '#ef4444' },
  { id: 'redteam', label: 'RED', x: 3, y: 0, color: '#f87171' },
  { id: 'metalearning', label: 'MET', x: 0, y: 1, color: '#06b6d4' },
  { id: 'temporal', label: 'TMP', x: 1, y: 1, color: '#f59e0b' },
  { id: 'identity', label: 'IDV', x: 2, y: 1, color: '#f97316' },
];

export function MiniMap({ activeRoom, onRoomChange }: { activeRoom: RoomId; onRoomChange: (r: RoomId) => void }) {
  const { agents } = useData();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-20 right-4 z-40"
      style={{
        background: 'rgba(10,11,20,0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(42,43,61,0.6)',
        borderRadius: 8,
        padding: 8,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 28px)', gridTemplateRows: 'repeat(2, 28px)', gap: 3 }}>
        {roomLayout.map(room => {
          const isActive = activeRoom === room.id;
          const agentsHere = agents.filter(a => a.currentRoom === room.id);
          return (
            <motion.button
              key={room.id}
              onClick={() => onRoomChange(room.id)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              title={room.id}
              style={{
                gridColumn: room.x + 1,
                gridRow: room.y + 1,
                width: 28,
                height: 28,
                borderRadius: 4,
                border: `1px solid ${isActive ? room.color : 'rgba(42,43,61,0.6)'}`,
                background: isActive ? `${room.color}25` : 'rgba(18,19,31,0.6)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: isActive ? `0 0 8px ${room.color}44` : 'none',
              }}
            >
              <span style={{ fontSize: 7, fontFamily: 'monospace', color: isActive ? room.color : '#64748b', fontWeight: 600 }}>
                {room.label}
              </span>
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
