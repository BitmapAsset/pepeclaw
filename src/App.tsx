import { useState, lazy, Suspense, useEffect, useCallback, useRef, Component, type ReactNode, type ErrorInfo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RoomId } from './data/types'
import { DataProvider, useAgents, useConnectionStatus, useDemoMode, useDataActions } from './api/DataProvider'
import type { ConnectionStatus } from './api/gateway'
import { MiniMap } from './components/MiniMap'
import { ActivityFeed } from './components/ActivityFeed'
import { AgentVoice } from './components/AgentVoice'
import { PWAInstall } from './components/PWAInstall'
import { SkillScore } from './components/SkillScore'
import { LearningLoop } from './components/LearningLoop'
import { ConnectionGuide } from './components/ConnectionGuide'

import { Scene } from './components/Scene'
import type { CameraMode } from './components/Scene'
const RedTeamArena = lazy(() => import('./rooms/RedTeamArena'))
const MetaLearningCenter = lazy(() => import('./rooms/MetaLearningCenter'))
const TemporalEngine = lazy(() => import('./rooms/TemporalEngine'))
const IdentityVault = lazy(() => import('./rooms/IdentityVault'))
const BreedingArenaPanel = lazy(() => import('./rooms/BreedingArena'))
const SettingsPanel = lazy(() => import('./rooms/Settings'))
const ReplayPanel = lazy(() => import('./rooms/Replay'))
const ActivityLogPanel = lazy(() => import('./rooms/ActivityLog'))
const OptimizerPanel = lazy(() => import('./rooms/Optimizer'))

const panelRooms: Partial<Record<RoomId, React.LazyExoticComponent<React.ComponentType>>> = {
  redteam: RedTeamArena,
  metalearning: MetaLearningCenter,
  temporal: TemporalEngine,
  identity: IdentityVault,
  breeding: BreedingArenaPanel,
  optimizer: OptimizerPanel,
  settings: SettingsPanel,
  replay: ReplayPanel,
  activitylog: ActivityLogPanel,
}

// Rooms that are panel-only (no 3D scene behind them)
const panelOnlyRooms = new Set<RoomId>(['settings', 'replay', 'activitylog', 'optimizer'])

class RoomErrorBoundary extends Component<
  { children: ReactNode; roomName?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; roomName?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.debug('[PepeClaw] Room error:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <div className="text-3xl">⚠️</div>
          <div className="text-sm font-mono text-center" style={{ color: '#94a3b8' }}>
            {this.props.roomName || 'This room'} encountered an error
          </div>
          <div className="text-[10px] font-mono px-3 py-1.5 rounded-lg" style={{ background: '#1a1b2e', color: '#ef4444' }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg text-[11px] font-mono cursor-pointer border-0"
            style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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

export interface InteractiveState {
  selectedAgentId: string | null;
  followingAgentId: string | null;
  chatInput: string;
}

export default function App() {
  const [activeRoom, setActiveRoom] = useState<RoomId>('overview')
  const [overviewMode, setOverviewMode] = useState(true)
  const [cameraMode, setCameraMode] = useState<CameraMode>(() => {
    try { return (localStorage.getItem('pepeclaw-camera-mode') as CameraMode) || 'isometric' } catch { return 'isometric' }
  })
  const toggleCameraMode = useCallback(() => {
    setCameraMode(prev => {
      const next = prev === 'isometric' ? 'perspective' : 'isometric'
      try { localStorage.setItem('pepeclaw-camera-mode', next) } catch {}
      return next
    })
  }, [])
  const [interactive, setInteractive] = useState<InteractiveState>({
    selectedAgentId: null,
    followingAgentId: null,
    chatInput: '',
  })

  const handleRoomClick = useCallback((roomId: RoomId) => {
    setActiveRoom(roomId)
    setOverviewMode(false)
  }, [])

  const handleRoomChange = useCallback((roomId: RoomId) => {
    if (roomId === 'overview') {
      setOverviewMode(true)
      setActiveRoom('overview')
    } else {
      setActiveRoom(roomId)
      setOverviewMode(false)
    }
  }, [])

  const handleAgentSelect = useCallback((agentId: string | null) => {
    setInteractive(prev => ({ ...prev, selectedAgentId: agentId, chatInput: '' }))
  }, [])

  const handleAgentFollow = useCallback((agentId: string) => {
    setInteractive(prev => ({
      ...prev,
      followingAgentId: prev.followingAgentId === agentId ? null : agentId,
    }))
  }, [])

  // Keyboard navigation: ESC for overview, arrow keys for rooms
  useEffect(() => {
    const navigableRooms: RoomId[] = ['genome', 'dream', 'war', 'redteam', 'metalearning', 'temporal', 'identity', 'breeding']

    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Escape') {
        if (interactive.selectedAgentId) {
          setInteractive({ selectedAgentId: null, followingAgentId: null, chatInput: '' })
        } else {
          setOverviewMode(true)
          setActiveRoom('overview')
        }
        return
      }

      // Space bar → toggle overview
      if (e.key === ' ') {
        e.preventDefault()
        const next = !overviewMode
        setOverviewMode(next)
        if (next) setActiveRoom('overview')
        return
      }

      // Arrow key room navigation (Left/Right = linear, Up/Down = row jump)
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault()
        const currentIdx = navigableRooms.indexOf(activeRoom)
        const base = currentIdx === -1 ? 0 : currentIdx
        let next = base
        if (e.key === 'ArrowRight') next = (base + 1) % navigableRooms.length
        else if (e.key === 'ArrowLeft') next = (base - 1 + navigableRooms.length) % navigableRooms.length
        else if (e.key === 'ArrowDown') next = (base + 4) % navigableRooms.length  // jump to next row
        else if (e.key === 'ArrowUp') next = (base - 4 + navigableRooms.length) % navigableRooms.length
        setActiveRoom(navigableRooms[next])
        setOverviewMode(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [interactive.selectedAgentId, activeRoom, overviewMode])

  const isPanelOnly = panelOnlyRooms.has(activeRoom)
  const PanelRoom = !overviewMode ? panelRooms[activeRoom] : undefined

  return (
    <DataProvider>
      <div className="w-full h-full relative">
        {/* 3D Scene — always rendered unless in panel-only room */}
        {!isPanelOnly && (
          <Scene
            activeRoom={activeRoom}
            overviewMode={overviewMode}
            onRoomClick={handleRoomClick}
            selectedAgentId={interactive.selectedAgentId}
            followingAgentId={interactive.followingAgentId}
            onAgentSelect={handleAgentSelect}
            onAgentFollow={handleAgentFollow}
            cameraMode={cameraMode}
          />
        )}

        {/* Panel-only rooms get a dark background */}
        {isPanelOnly && !overviewMode && (
          <div className="absolute inset-0" style={{ background: '#0a0b14' }} />
        )}

        <AnimatePresence mode="wait">
          {PanelRoom && (
            <motion.div
              key={activeRoom}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 z-30 pt-14 pb-16 overflow-hidden"
            >
              <div className={`w-full h-full ${isPanelOnly ? 'bg-[#0a0b14]' : 'bg-[#0a0b14]/90 backdrop-blur-md'}`}>
                <RoomErrorBoundary roomName={rooms.find(r => r.id === activeRoom)?.name}>
                  <Suspense fallback={<LoadingFallback />}>
                    <PanelRoom />
                  </Suspense>
                </RoomErrorBoundary>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <InteractiveChat interactive={interactive} setInteractive={setInteractive} />

        <HUD
          activeRoom={activeRoom}
          onRoomChange={handleRoomChange}
          overviewMode={overviewMode}
          onOverviewToggle={() => {
            const next = !overviewMode
            setOverviewMode(next)
            if (next) setActiveRoom('overview')
          }}
          cameraMode={cameraMode}
          onCameraToggle={toggleCameraMode}
        />
        {!overviewMode && !isPanelOnly && (
          <div className="hidden sm:block">
            <MiniMap activeRoom={activeRoom} onRoomChange={(r) => { setActiveRoom(r); setOverviewMode(false); }} />
          </div>
        )}
        <ActivityFeed onRoomChange={(r) => { setActiveRoom(r); setOverviewMode(false); }} />
        <SkillScore />
        <LearningLoop />
        <PWAInstall />
        <ConnectionGuideWrapper />
      </div>
    </DataProvider>
  )
}

/* ─── Connection Guide Wrapper (uses DataProvider hooks) ─── */
function ConnectionGuideWrapper() {
  const connectionStatus = useConnectionStatus()
  const demoMode = useDemoMode()
  const { enterDemoMode, connectToGateway } = useDataActions()

  if (connectionStatus === 'connected' || demoMode) return null

  return (
    <ConnectionGuide
      connectionStatus={connectionStatus}
      onConnect={connectToGateway}
      onDemoMode={enterDemoMode}
    />
  )
}

/* ─── Interactive Chat Panel ─────────────────────────────────────── */
function InteractiveChat({ interactive, setInteractive }: {
  interactive: InteractiveState;
  setInteractive: React.Dispatch<React.SetStateAction<InteractiveState>>;
}) {
  const agents = useAgents()
  const selectedAgent = interactive.selectedAgentId
    ? agents.find(a => a.id === interactive.selectedAgentId)
    : null

  if (!selectedAgent) return null

  const handleSend = () => {
    if (!interactive.chatInput.trim()) return
    setInteractive(prev => ({ ...prev, chatInput: '' }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 rounded-2xl px-3 sm:px-4 py-3 w-[calc(100vw-2rem)] sm:w-80 max-w-80"
      style={{
        background: 'rgba(10,11,20,0.85)',
        backdropFilter: 'blur(24px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ background: selectedAgent.color }} />
        <span className="text-[12px] font-mono font-bold" style={{ color: selectedAgent.color }}>
          {selectedAgent.name}
        </span>
        <span className="text-[10px] font-mono" style={{ color: '#64748b' }}>
          {selectedAgent.status}
        </span>
        {interactive.followingAgentId === selectedAgent.id && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded"
            style={{ background: '#8b5cf620', color: '#8b5cf6' }}>FOLLOWING</span>
        )}
        <button
          onClick={() => setInteractive({ selectedAgentId: null, followingAgentId: null, chatInput: '' })}
          className="ml-auto text-[10px] cursor-pointer border-0 bg-transparent"
          style={{ color: '#64748b' }}
        >✕</button>
      </div>
      {selectedAgent.taskDescription && (
        <div className="text-[11px] mb-2 px-2 py-1 rounded" style={{ background: '#1a1b2e', color: '#94a3b8' }}>
          {selectedAgent.taskDescription}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={interactive.chatInput}
          onChange={e => setInteractive(prev => ({ ...prev, chatInput: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Message this agent..."
          className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-mono border-0"
          style={{ background: '#12131f', color: '#e2e8f0', outline: 'none' }}
          autoFocus
        />
        <button
          onClick={handleSend}
          className="px-3 py-1.5 rounded-lg text-[10px] font-mono cursor-pointer border-0"
          style={{ background: '#8b5cf620', color: '#8b5cf6' }}
        >Send</button>
      </div>
    </motion.div>
  )
}

/* ─── Room Emojis ───────────────────────────────────────────────────── */
const roomEmojis: Record<RoomId, string> = {
  overview: '🏠',
  genome: '🧬',
  dream: '💭',
  war: '⚔️',
  redteam: '🔴',
  metalearning: '🧠',
  temporal: '⏳',
  identity: '🔐',
  breeding: '🧪',
  optimizer: '🚀',
  replay: '🎬',
  activitylog: '📜',
  settings: '⚙️',
}

/* ─── Room Signature Colors ──────────────────────────────────────── */
const roomColors: Record<RoomId, string> = {
  overview: '#8b5cf6',
  genome: '#10b981',
  dream: '#8b5cf6',
  war: '#ef4444',
  redteam: '#ef4444',
  metalearning: '#06b6d4',
  temporal: '#f59e0b',
  identity: '#6366f1',
  breeding: '#ec4899',
  optimizer: '#f97316',
  replay: '#a855f7',
  activitylog: '#f59e0b',
  settings: '#64748b',
}

/* ─── Connection Status Colors ──────────────────────────────────────── */
const connectionStatusConfig: Record<ConnectionStatus, { color: string; label: string; pulse: boolean }> = {
  connected: { color: '#3b82f6', label: 'LIVE', pulse: false },
  trying: { color: '#f59e0b', label: 'CONNECTING', pulse: true },
  offline: { color: '#22c55e', label: 'MOCK', pulse: false },
}

/* ─── Inline HUD ─────────────────────────────────────────────────── */
import { rooms } from './data/types'
import { useData } from './api/DataProvider'

function HUD({ activeRoom, onRoomChange, overviewMode, onOverviewToggle, cameraMode, onCameraToggle }: {
  activeRoom: RoomId;
  onRoomChange: (r: RoomId) => void;
  overviewMode: boolean;
  onOverviewToggle: () => void;
  cameraMode: CameraMode;
  onCameraToggle: () => void;
}) {
  const currentRoomData = rooms.find(r => r.id === activeRoom)
  const agents = useAgents()
  const connectionStatus = useConnectionStatus()
  const roomColor = roomColors[activeRoom] || '#8b5cf6'
  const connConfig = connectionStatusConfig[connectionStatus]
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          background: 'linear-gradient(180deg, rgba(10,11,20,0.88) 0%, rgba(10,11,20,0.75) 100%)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        }}
      >
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5">
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
              <div className="text-sm font-bold tracking-wider text-glow" style={{ color: '#e2e8f0', letterSpacing: '0.15em' }}>
                PEPECLAW
              </div>
              <div className="text-[9px] tracking-widest uppercase font-mono hidden sm:block" style={{ color: '#64748b' }}>
                Self-Evolving AI Agents You Can See
              </div>
            </div>
          </div>

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
                  <span className="text-xs tracking-widest uppercase font-mono font-medium text-glow" style={{ color: roomColor }}>
                    {currentRoomData?.name || 'Unknown'}
                  </span>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <button
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg cursor-pointer border-0"
              style={{ background: mobileMenuOpen ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)' }}
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                {mobileMenuOpen ? (
                  <path d="M4 4L14 14M14 4L4 14" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
                ) : (
                  <>
                    <line x1="3" y1="5" x2="15" y2="5" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="3" y1="9" x2="15" y2="9" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="3" y1="13" x2="15" y2="13" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>

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

            <AgentVoice />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCameraToggle}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono tracking-wider uppercase cursor-pointer border-0"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#94a3b8',
                transition: 'all 0.2s ease',
              }}
              title={`Switch to ${cameraMode === 'isometric' ? 'Perspective' : 'Isometric'} view`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {cameraMode === 'isometric' ? (
                  <>
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </>
                ) : (
                  <>
                    <path d="M2 7l10-4 10 4-10 4z" />
                    <path d="M2 7v10l10 4V11" />
                    <path d="M22 7v10l-10 4V11" />
                  </>
                )}
              </svg>
              <span className="hidden sm:inline">{cameraMode === 'isometric' ? 'ISO' : 'PERSP'}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOverviewToggle}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider uppercase cursor-pointer border-0"
              style={{
                background: overviewMode ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' : 'rgba(139,92,246,0.12)',
                color: overviewMode ? '#fff' : '#8b5cf6',
                boxShadow: overviewMode ? '0 0 20px rgba(139,92,246,0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Overview
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(249,115,22,0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onRoomChange('identity')}
              className="px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider uppercase cursor-pointer border-0"
              style={{
                background: activeRoom === 'identity' && !overviewMode ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(249,115,22,0.12)',
                color: activeRoom === 'identity' && !overviewMode ? '#fff' : '#f97316',
                boxShadow: activeRoom === 'identity' && !overviewMode ? '0 0 20px rgba(249,115,22,0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Mint Agent Identity
            </motion.button>

            <StatusDot color={connConfig.color} label={connConfig.label} pulse={connConfig.pulse} />
            <StatusDot color="#f59e0b" label="EVOLVING" pulse />
            <LearningPulse />

            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] font-mono tabular-nums" style={{ color: '#e2e8f0' }}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[8px] font-mono" style={{ color: '#475569' }}>
                {time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div className="text-[10px] font-mono hidden sm:block" style={{ color: '#475569' }}>v0.3.0</div>
          </div>
        </div>
        <div
          className="h-px w-full"
          style={{
            background: overviewMode
              ? 'linear-gradient(90deg, transparent 5%, #8b5cf640 30%, #06b6d460 50%, #8b5cf640 70%, transparent 95%)'
              : `linear-gradient(90deg, transparent 5%, ${roomColor}40 30%, ${roomColor}60 50%, ${roomColor}40 70%, transparent 95%)`,
          }}
        />
      </motion.div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-14 left-0 right-0 bottom-0 md:hidden"
            style={{
              zIndex: 45,
              background: 'rgba(10,11,20,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="p-4 grid grid-cols-2 gap-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {rooms.map((room) => {
                const isOverviewTab = room.id === 'overview'
                const isActive = isOverviewTab ? overviewMode : activeRoom === room.id && !overviewMode
                const color = roomColors[room.id] || room.color
                return (
                  <motion.button
                    key={room.id}
                    onClick={() => { onRoomChange(room.id); setMobileMenuOpen(false) }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl text-[11px] font-mono tracking-wider cursor-pointer border-0"
                    style={{
                      background: isActive ? `${color}18` : 'rgba(255,255,255,0.04)',
                      color: isActive ? color : '#94a3b8',
                      border: isActive ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.06)',
                      minHeight: 48,
                    }}
                  >
                    <span className="text-lg">{roomEmojis[room.id]}</span>
                    <span className="font-medium">{room.name}</span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom nav ── */}
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="fixed bottom-0 left-0 right-0 z-50 hidden md:flex justify-center px-2 sm:px-4 pb-2 sm:pb-3 pt-1"
        style={{ background: 'linear-gradient(0deg, rgba(10,11,20,0.9) 0%, transparent 100%)' }}
      >
        <motion.div
          className="glass-strong flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2 overflow-x-auto"
          style={{ borderRadius: 20, maxWidth: '100%', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {rooms.map((room) => {
            const isOverviewTab = room.id === 'overview'
            const isActive = isOverviewTab ? overviewMode : activeRoom === room.id && !overviewMode
            const color = roomColors[room.id] || room.color
            return (
              <motion.button
                key={room.id}
                onClick={() => onRoomChange(room.id)}
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.93 }}
                animate={isActive ? { scale: 1.04 } : { scale: 1 }}
                className="tab-pill relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-mono tracking-wider uppercase cursor-pointer border-0 shrink-0"
                style={{
                  background: isActive ? `${color}20` : 'transparent',
                  color: isActive ? color : '#64748b',
                  boxShadow: isActive ? `0 0 20px ${color}30, 0 4px 12px rgba(0,0,0,0.3), inset 0 0 12px ${color}10` : 'none',
                  borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                  minHeight: 44,
                  minWidth: 44,
                  justifyContent: 'center',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'border-left 0.3s ease, background 0.3s ease',
                }}
                title={room.name}
                aria-label={room.name}
                tabIndex={0}
              >
                <span className="text-sm">{roomEmojis[room.id]}</span>
                <span className="hidden sm:inline font-medium">{room.name}</span>
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

      {/* ── Mobile compact bottom bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-between px-4 pb-3 pt-1"
        style={{ background: 'linear-gradient(0deg, rgba(10,11,20,0.95) 0%, transparent 100%)' }}
      >
        <button
          onClick={() => {
            const navigable: RoomId[] = ['genome', 'dream', 'war', 'redteam', 'metalearning', 'temporal', 'identity', 'breeding']
            const idx = navigable.indexOf(activeRoom)
            const prev = idx <= 0 ? navigable.length - 1 : idx - 1
            onRoomChange(navigable[prev])
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer border-0"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
          aria-label="Previous room"
        >
          ◀
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg">{roomEmojis[activeRoom]}</span>
          <span className="text-[11px] font-mono font-semibold tracking-wider uppercase" style={{ color: roomColor }}>
            {overviewMode ? 'Overview' : (rooms.find(r => r.id === activeRoom)?.name || activeRoom)}
          </span>
        </div>
        <button
          onClick={() => {
            const navigable: RoomId[] = ['genome', 'dream', 'war', 'redteam', 'metalearning', 'temporal', 'identity', 'breeding']
            const idx = navigable.indexOf(activeRoom)
            const next = idx === -1 ? 0 : (idx + 1) % navigable.length
            onRoomChange(navigable[next])
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer border-0"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
          aria-label="Next room"
        >
          ▶
        </button>
      </div>

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

function LearningPulse() {
  const { microLearnings } = useData()
  const [count, setCount] = useState(microLearnings.length)
  const [showDropdown, setShowDropdown] = useState(false)
  const [pulsing, setPulsing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCount(c => c + 1)
      setPulsing(true)
      setTimeout(() => setPulsing(false), 1500)
    }, 8000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  return (
    <div className="relative hidden md:block">
      <motion.button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 cursor-pointer border-0 bg-transparent px-1"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          <motion.span
            className="text-sm"
            animate={pulsing ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            🧠
          </motion.span>
          {pulsing && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: '#8b5cf6', filter: 'blur(6px)' }}
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 2 }}
              transition={{ duration: 1 }}
            />
          )}
        </div>
        <span className="text-[10px] font-mono tracking-wider" style={{ color: '#64748b' }}>
          LEARNED:
        </span>
        <motion.span
          key={count}
          className="text-[10px] font-mono font-bold"
          style={{ color: '#8b5cf6' }}
          initial={{ scale: 1.4, color: '#22c55e' }}
          animate={{ scale: 1, color: '#8b5cf6' }}
        >
          {count}
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-72 rounded-2xl overflow-hidden z-50"
            style={{
              background: 'rgba(10,11,20,0.85)',
              backdropFilter: 'blur(24px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid #1a1b2e' }}>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#8b5cf6' }}>
                Recent Micro-Learnings
              </span>
              <span className="text-[9px] font-mono" style={{ color: '#64748b' }}>{count} today</span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {microLearnings.slice(0, 8).map((ml, i) => {
                const scoreColor = ml.score >= 4 ? '#22c55e' : ml.score >= 3 ? '#f59e0b' : ml.score >= 2 ? '#f97316' : '#ef4444';
                return (
                  <motion.div
                    key={ml.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-3 py-2 flex items-start gap-2 hover:brightness-125 transition-all"
                    style={{ borderBottom: '1px solid #12131f' }}
                  >
                    <span
                      className="text-[10px] font-bold font-mono mt-0.5 w-4 text-center shrink-0"
                      style={{ color: scoreColor }}
                    >
                      {ml.score}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px]" style={{ color: '#e2e8f0' }}>{ml.text}</div>
                      <div className="text-[8px] font-mono mt-0.5" style={{ color: '#475569' }}>{ml.skill}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatusDot({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="items-center gap-1.5 hidden md:flex">
      <div className="relative">
        <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}80` }} />
        {pulse && (
          <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping" style={{ background: color, opacity: 0.4 }} />
        )}
      </div>
      <span className="text-[10px] font-mono tracking-wider" style={{ color: '#64748b' }}>{label}</span>
    </div>
  )
}
