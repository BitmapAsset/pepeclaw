import { motion, AnimatePresence } from 'framer-motion';
import { rooms, type RoomId } from '../data/mockData';

interface HUDProps {
  currentRoom: RoomId;
  onRoomChange: (room: RoomId) => void;
}

export default function HUD({ currentRoom, onRoomChange }: HUDProps) {
  const currentRoomData = rooms.find(r => r.id === currentRoom);

  return (
    <>
      {/* Top bar */}
      <motion.div
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{
          background: 'linear-gradient(180deg, rgba(10,11,20,0.95) 0%, rgba(10,11,20,0.7) 80%, transparent 100%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              boxShadow: '0 0 20px rgba(139,92,246,0.3)',
            }}
          >
            A
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wider" style={{ color: '#e2e8f0' }}>
              ANIMA 3D
            </div>
            <div className="text-[10px] tracking-widest uppercase" style={{ color: '#64748b' }}>
              Self-Evolving Intelligence
            </div>
          </div>
        </div>

        {/* Room indicator */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRoom}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-xs tracking-widest uppercase font-mono"
            style={{ color: currentRoomData?.color || '#8b5cf6' }}
          >
            {currentRoomData?.name || 'Unknown'}
          </motion.div>
        </AnimatePresence>

        {/* Status indicators */}
        <div className="flex items-center gap-4">
          <StatusDot color="#22c55e" label="SYSTEMS" />
          <StatusDot color="#f59e0b" label="EVOLVING" pulse />
          <div className="text-[10px] font-mono" style={{ color: '#64748b' }}>
            v0.1.0
          </div>
        </div>
      </motion.div>

      {/* Room selector - bottom bar */}
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-6 py-3"
        style={{
          background: 'linear-gradient(0deg, rgba(10,11,20,0.95) 0%, rgba(10,11,20,0.7) 80%, transparent 100%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {rooms.map((room) => (
          <motion.button
            key={room.id}
            onClick={() => onRoomChange(room.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative px-4 py-2 rounded-lg text-xs font-mono tracking-wider uppercase transition-all cursor-pointer border"
            style={{
              background: currentRoom === room.id
                ? `${room.color}15`
                : 'rgba(26,27,46,0.6)',
              borderColor: currentRoom === room.id
                ? `${room.color}60`
                : 'rgba(42,43,61,0.6)',
              color: currentRoom === room.id ? room.color : '#64748b',
              boxShadow: currentRoom === room.id
                ? `0 0 20px ${room.color}20, inset 0 0 20px ${room.color}10`
                : 'none',
            }}
          >
            {room.name}
            {currentRoom === room.id && (
              <motion.div
                layoutId="room-indicator"
                className="absolute -bottom-1 left-1/2 w-6 h-0.5 rounded-full -translate-x-1/2"
                style={{ background: room.color }}
              />
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* Corner decorations */}
      <div className="fixed top-0 left-0 w-16 h-16 pointer-events-none z-40">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path d="M0 0 L20 0 L20 2 L2 2 L2 20 L0 20 Z" fill="#2a2b3d" />
        </svg>
      </div>
      <div className="fixed top-0 right-0 w-16 h-16 pointer-events-none z-40">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path d="M64 0 L44 0 L44 2 L62 2 L62 20 L64 20 Z" fill="#2a2b3d" />
        </svg>
      </div>
    </>
  );
}

function StatusDot({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: color }}
        />
        {pulse && (
          <div
            className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
            style={{ background: color, opacity: 0.4 }}
          />
        )}
      </div>
      <span className="text-[10px] font-mono tracking-wider" style={{ color: '#64748b' }}>
        {label}
      </span>
    </div>
  );
}
