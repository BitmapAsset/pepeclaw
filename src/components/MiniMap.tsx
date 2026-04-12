import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { rooms, type RoomId } from '../data/types';
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
  const activeAgents = agents.filter(a => a.currentRoom === activeRoom).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="mini-map fixed bottom-20 right-2 sm:right-4 z-40"
    >
      {/* Header */}
      <div className="mini-map__header">
        <div>
          <div className="mini-map__eyebrow">Office Map</div>
          <div className="mini-map__meta">{activeAgents} agents in focus</div>
        </div>
        <div className="mini-map__status">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="mini-map__grid">
        {roomLayout.map(room => {
          const isActive = activeRoom === room.id;
          const agentsHere = agents.filter(a => a.currentRoom === room.id);
          const roomData = rooms.find(r => r.id === room.id);
          return (
            <motion.button
              key={room.id}
              onClick={() => onRoomChange(room.id)}
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.9 }}
              title={`${roomData?.name ?? room.id} (${agentsHere.length} agents)`}
              className="mini-map__room"
              style={{
                '--room-color': room.color,
                gridColumn: room.x + 1,
                gridRow: room.y + 1,
                border: `1px solid ${isActive ? room.color + '80' : 'rgba(255,255,255,0.06)'}`,
                background: isActive
                  ? `linear-gradient(135deg, ${room.color}25, ${room.color}10)`
                  : 'rgba(255,255,255,0.02)',
                boxShadow: isActive
                  ? `0 0 12px ${room.color}40, inset 0 0 8px ${room.color}10, 0 0 20px ${room.color}15`
                  : 'none',
              } as CSSProperties}
            >
              <span className="mini-map__emoji">{room.emoji}</span>
              <span className="mini-map__label">{room.label}</span>
              {agentsHere.length > 0 && (
                <div className="mini-map__agents">
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
                    <span className="mini-map__agent-more">+{agentsHere.length - 3}</span>
                  )}
                </div>
              )}
              {/* Active room indicator — fixed position div, no layoutId to avoid SVG circle attribute bug */}
              {isActive && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    left: '25%',
                    right: '25%',
                    height: 2,
                    borderRadius: 1,
                    background: room.color,
                    boxShadow: `0 0 8px ${room.color}`,
                    transformOrigin: 'center',
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
