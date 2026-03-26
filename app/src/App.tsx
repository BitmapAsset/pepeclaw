import { useState, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RoomId } from './data/mockData'

const Scene = lazy(() => import('./components/Scene').then(m => ({ default: m.Scene })))
const RedTeamArena = lazy(() => import('./rooms/RedTeamArena'))
const MetaLearningCenter = lazy(() => import('./rooms/MetaLearningCenter'))
const TemporalEngine = lazy(() => import('./rooms/TemporalEngine'))
const IdentityVault = lazy(() => import('./rooms/IdentityVault'))

const panelRooms: Partial<Record<RoomId, React.LazyExoticComponent<React.ComponentType>>> = {
  redteam: RedTeamArena,
  metalearning: MetaLearningCenter,
  temporal: TemporalEngine,
  identity: IdentityVault,
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            boxShadow: '0 0 30px rgba(139,92,246,0.4)',
          }}
        >
          PC
        </div>
        <div className="text-xs font-mono tracking-widest uppercase" style={{ color: '#64748b' }}>
          Loading...
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [activeRoom, setActiveRoom] = useState<RoomId>('dream')

  const PanelRoom = panelRooms[activeRoom]

  return (
    <div className="w-full h-full relative">
      <Suspense fallback={<LoadingFallback />}>
        <Scene activeRoom={activeRoom} />
      </Suspense>

      <AnimatePresence mode="wait">
        {PanelRoom && (
          <motion.div
            key={activeRoom}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-30 pt-14 pb-16 overflow-hidden"
          >
            <div className="w-full h-full bg-[#0a0b14]/95 backdrop-blur-sm">
              <Suspense fallback={<LoadingFallback />}>
                <PanelRoom />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HUD activeRoom={activeRoom} onRoomChange={setActiveRoom} />
    </div>
  )
}

/* ─── Inline HUD ─────────────────────────────────────────────────── */
import { rooms } from './data/mockData'

function HUD({ activeRoom, onRoomChange }: { activeRoom: RoomId; onRoomChange: (r: RoomId) => void }) {
  const currentRoomData = rooms.find(r => r.id === activeRoom)

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
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              boxShadow: '0 0 20px rgba(139,92,246,0.3)',
            }}
          >
            PC
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wider" style={{ color: '#e2e8f0' }}>
              PEPECLAW
            </div>
            <div className="text-[10px] tracking-widest uppercase" style={{ color: '#64748b' }}>
              Self-Evolving AI Agents You Can See
            </div>
          </div>
        </div>

        {/* Room indicator */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRoom}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-xs tracking-widest uppercase font-mono hidden sm:block"
            style={{ color: currentRoomData?.color || '#8b5cf6' }}
          >
            {currentRoomData?.name || 'Unknown'}
          </motion.div>
        </AnimatePresence>

        {/* Status indicators + Mint button */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onRoomChange('identity')}
            className="px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider uppercase cursor-pointer border-0"
            style={{
              background: activeRoom === 'identity'
                ? 'linear-gradient(135deg, #f97316, #ea580c)'
                : 'rgba(249,115,22,0.15)',
              color: '#f97316',
              boxShadow: activeRoom === 'identity' ? '0 0 15px rgba(249,115,22,0.3)' : 'none',
            }}
          >
            Mint Agent Identity
          </motion.button>
          <StatusDot color="#22c55e" label="SYSTEMS" />
          <StatusDot color="#f59e0b" label="EVOLVING" pulse />
          <div className="text-[10px] font-mono hidden sm:block" style={{ color: '#64748b' }}>
            v0.1.0
          </div>
        </div>
      </motion.div>

      {/* Bottom nav */}
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-1.5 px-4 py-3 overflow-x-auto"
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
            className="relative px-3 py-2 rounded-lg text-[11px] font-mono tracking-wider uppercase transition-all cursor-pointer border shrink-0"
            style={{
              background: activeRoom === room.id
                ? `${room.color}15`
                : 'rgba(26,27,46,0.6)',
              borderColor: activeRoom === room.id
                ? `${room.color}60`
                : 'rgba(42,43,61,0.6)',
              color: activeRoom === room.id ? room.color : '#64748b',
              boxShadow: activeRoom === room.id
                ? `0 0 20px ${room.color}20, inset 0 0 20px ${room.color}10`
                : 'none',
            }}
          >
            {room.name}
            {activeRoom === room.id && (
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
  )
}

function StatusDot({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="items-center gap-1.5 hidden md:flex">
      <div className="relative">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
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
  )
}
