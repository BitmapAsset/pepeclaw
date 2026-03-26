import { useState, lazy, Suspense, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RoomId } from './data/mockData'
import { DataProvider, useAgents, useConnectionStatus } from './api/DataProvider'
import type { ConnectionStatus } from './api/gateway'
import { MiniMap } from './components/MiniMap'
import { ActivityFeed } from './components/ActivityFeed'

const Scene = lazy(() => import('./components/Scene').then(m => ({ default: m.Scene })))
const RedTeamArena = lazy(() => import('./rooms/RedTeamArena'))
const MetaLearningCenter = lazy(() => import('./rooms/MetaLearningCenter'))
const TemporalEngine = lazy(() => import('./rooms/TemporalEngine'))
const IdentityVault = lazy(() => import('./rooms/IdentityVault'))
const BreedingArenaPanel = lazy(() => import('./rooms/BreedingArena'))

const panelRooms: Partial<Record<RoomId, React.LazyExoticComponent<React.ComponentType>>> = {
  redteam: RedTeamArena,
  metalearning: MetaLearningCenter,
  temporal: TemporalEngine,
  identity: IdentityVault,
  breeding: BreedingArenaPanel,
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            boxShadow: '0 0 40px rgba(139,92,246,0.4), 0 0 80px rgba(6,182,212,0.2)',
          }}
          animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          PC
        </motion.div>
        <div className="flex flex-col items-center gap-2 w-48">
          <div className="skeleton w-full h-3" />
          <div className="skeleton w-3/4 h-3" />
          <div className="skeleton w-1/2 h-3" />
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
  const [overviewMode, setOverviewMode] = useState(true) // Default to overview

  // Handle room click from overview mode — zoom into room
  const handleRoomClick = useCallback((roomId: RoomId) => {
    setActiveRoom(roomId)
    setOverviewMode(false)
  }, [])

  // Escape key returns to overview
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOverviewMode(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const PanelRoom = !overviewMode ? panelRooms[activeRoom] : undefined

  return (
    <DataProvider>
      <div className="w-full h-full relative">
        <Suspense fallback={<LoadingFallback />}>
          <Scene activeRoom={activeRoom} overviewMode={overviewMode} onRoomClick={handleRoomClick} />
        </Suspense>

        <AnimatePresence mode="wait">
          {PanelRoom && (
            <motion.div
              key={activeRoom}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 z-30 pt-14 pb-16 overflow-hidden"
            >
              <div className="w-full h-full bg-[#0a0b14]/90 backdrop-blur-md">
                <Suspense fallback={<LoadingFallback />}>
                  <PanelRoom />
                </Suspense>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <HUD
          activeRoom={activeRoom}
          onRoomChange={(r) => { setActiveRoom(r); setOverviewMode(false); }}
          overviewMode={overviewMode}
          onOverviewToggle={() => setOverviewMode(!overviewMode)}
        />
        {!overviewMode && <MiniMap activeRoom={activeRoom} onRoomChange={(r) => { setActiveRoom(r); setOverviewMode(false); }} />}
        <ActivityFeed onRoomChange={(r) => { setActiveRoom(r); setOverviewMode(false); }} />
      </div>
    </DataProvider>
  )
}

/* ─── Room Emojis ───────────────────────────────────────────────────── */
const roomEmojis: Record<RoomId, string> = {
  genome: '🧬',
  dream: '💭',
  war: '⚔️',
  redteam: '🔴',
  metalearning: '🧠',
  temporal: '⏳',
  identity: '🔐',
  breeding: '🧪',
}

/* ─── Room Signature Colors (updated to spec) ──────────────────────── */
const roomColors: Record<RoomId, string> = {
  genome: '#10b981',
  dream: '#8b5cf6',
  war: '#ef4444',
  redteam: '#ef4444',
  metalearning: '#06b6d4',
  temporal: '#f59e0b',
  identity: '#6366f1',
  breeding: '#ec4899',
}

/* ─── Connection Status Colors ──────────────────────────────────────── */
const connectionStatusConfig: Record<ConnectionStatus, { color: string; label: string; pulse: boolean }> = {
  connected: { color: '#22c55e', label: 'LIVE', pulse: false },
  trying: { color: '#f59e0b', label: 'CONNECTING', pulse: true },
  offline: { color: '#64748b', label: 'MOCK', pulse: false },
}

/* ─── Inline HUD ─────────────────────────────────────────────────── */
import { rooms } from './data/mockData'

function HUD({ activeRoom, onRoomChange, overviewMode, onOverviewToggle }: {
  activeRoom: RoomId;
  onRoomChange: (r: RoomId) => void;
  overviewMode: boolean;
  onOverviewToggle: () => void;
}) {
  const currentRoomData = rooms.find(r => r.id === activeRoom)
  const agents = useAgents()
  const connectionStatus = useConnectionStatus()
  const roomColor = roomColors[activeRoom] || '#8b5cf6'
  const connConfig = connectionStatusConfig[connectionStatus]

  // Live clock
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {/* ── Top bar ── */}
      <motion.div
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="fixed top-0 left-0 right-0 z-50 glass-strong"
        style={{
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          background: 'linear-gradient(180deg, rgba(10,11,20,0.92) 0%, rgba(10,11,20,0.8) 100%)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-2.5">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                boxShadow: '0 0 20px rgba(139,92,246,0.3), 0 4px 12px rgba(0,0,0,0.3)',
              }}
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              PC
            </motion.div>
            <div>
              <div className="text-sm font-semibold tracking-wider text-glow" style={{ color: '#e2e8f0' }}>
                PEPECLAW
              </div>
              <div className="text-[10px] tracking-widest uppercase" style={{ color: '#64748b' }}>
                Self-Evolving AI Agents You Can See
              </div>
            </div>
          </div>

          {/* Room indicator (center) — shows "OFFICE OVERVIEW" when in overview */}
          <AnimatePresence mode="wait">
            <motion.div
              key={overviewMode ? 'overview' : activeRoom}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="hidden sm:flex items-center gap-2"
            >
              {overviewMode ? (
                <>
                  <span className="text-base">🏢</span>
                  <span className="text-xs tracking-widest uppercase font-mono font-medium text-glow" style={{ color: '#8b5cf6' }}>
                    Office Overview
                  </span>
                </>
              ) : (
                <>
                  <span className="text-base">{roomEmojis[activeRoom]}</span>
                  <span
                    className="text-xs tracking-widest uppercase font-mono font-medium text-glow"
                    style={{ color: roomColor }}
                  >
                    {currentRoomData?.name || 'Unknown'}
                  </span>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Right: status + controls */}
          <div className="flex items-center gap-4">
            {/* Agent count */}
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-[10px] font-mono" style={{ color: '#64748b' }}>AGENTS</span>
              <motion.span
                key={agents.length}
                initial={{ scale: 1.3, color: '#22c55e' }}
                animate={{ scale: 1, color: '#e2e8f0' }}
                className="text-sm font-mono font-bold"
              >
                {agents.length}
              </motion.span>
            </div>

            {/* Overview toggle button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOverviewToggle}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider uppercase cursor-pointer border-0"
              style={{
                background: overviewMode
                  ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
                  : 'rgba(139,92,246,0.12)',
                color: overviewMode ? '#fff' : '#8b5cf6',
                boxShadow: overviewMode ? '0 0 20px rgba(139,92,246,0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {overviewMode ? 'Overview' : 'Overview'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(249,115,22,0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onRoomChange('identity')}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider uppercase cursor-pointer border-0"
              style={{
                background: activeRoom === 'identity' && !overviewMode
                  ? 'linear-gradient(135deg, #f97316, #ea580c)'
                  : 'rgba(249,115,22,0.12)',
                color: activeRoom === 'identity' && !overviewMode ? '#fff' : '#f97316',
                boxShadow: activeRoom === 'identity' && !overviewMode ? '0 0 20px rgba(249,115,22,0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Mint Agent Identity
            </motion.button>

            {/* Connection status dot */}
            <StatusDot color={connConfig.color} label={connConfig.label} pulse={connConfig.pulse} />
            <StatusDot color="#f59e0b" label="EVOLVING" pulse />

            {/* Clock */}
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] font-mono tabular-nums" style={{ color: '#e2e8f0' }}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[8px] font-mono" style={{ color: '#475569' }}>
                {time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div className="text-[10px] font-mono hidden sm:block" style={{ color: '#475569' }}>
              v0.2.0
            </div>
          </div>
        </div>
        {/* Gradient accent border at bottom */}
        <div
          className="h-px w-full"
          style={{
            background: overviewMode
              ? 'linear-gradient(90deg, transparent 5%, #8b5cf640 30%, #06b6d460 50%, #8b5cf640 70%, transparent 95%)'
              : `linear-gradient(90deg, transparent 5%, ${roomColor}40 30%, ${roomColor}60 50%, ${roomColor}40 70%, transparent 95%)`,
          }}
        />
      </motion.div>

      {/* ── Bottom nav (pill-shaped glass container) ── */}
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-3 pt-1"
        style={{ background: 'linear-gradient(0deg, rgba(10,11,20,0.9) 0%, transparent 100%)' }}
      >
        <motion.div
          className="glass-strong flex items-center gap-1 px-3 py-2 overflow-x-auto"
          style={{
            borderRadius: 20,
            maxWidth: '100%',
          }}
        >
          {rooms.map((room) => {
            const isActive = activeRoom === room.id && !overviewMode
            const color = roomColors[room.id] || room.color
            return (
              <motion.button
                key={room.id}
                onClick={() => onRoomChange(room.id)}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.93 }}
                className="tab-pill relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-mono tracking-wider uppercase cursor-pointer border-0 shrink-0"
                style={{
                  background: isActive ? `${color}18` : 'transparent',
                  color: isActive ? color : '#64748b',
                  boxShadow: isActive ? `0 0 20px ${color}25, 0 4px 12px rgba(0,0,0,0.2)` : 'none',
                  minHeight: 44,
                }}
                title={room.name}
                aria-label={room.name}
                tabIndex={0}
              >
                <span className="text-sm">{roomEmojis[room.id]}</span>
                <span className="hidden sm:inline">{room.name}</span>

                {isActive && (
                  <motion.div
                    layoutId="room-indicator"
                    className="absolute -bottom-0.5 left-3 right-3 h-[2px] rounded-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                      boxShadow: `0 0 8px ${color}80`,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}
        </motion.div>
      </motion.div>

      {/* Corner decorations */}
      <div className="fixed top-0 left-0 w-16 h-16 pointer-events-none z-40 opacity-40">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path d="M0 0 L20 0 L20 2 L2 2 L2 20 L0 20 Z" fill="#2a2b3d" />
        </svg>
      </div>
      <div className="fixed top-0 right-0 w-16 h-16 pointer-events-none z-40 opacity-40">
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
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
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
  )
}
