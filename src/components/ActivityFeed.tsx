import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockActivities, rooms, type ActivityEntry, type RoomId } from '../data/mockData'

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export function ActivityFeed({ onRoomChange }: { onRoomChange: (r: RoomId) => void }) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<ActivityEntry[]>(mockActivities)

  // Simulate new activity arriving every 8s
  useEffect(() => {
    const actions = [
      'Evolved skill chromosome',
      'Completed dream synthesis',
      'Flagged bias in argument',
      'Optimized batch schedule',
      'Verified identity hash',
      'Triggered mutation cycle',
      'Self-modified learning rate',
    ]
    const interval = setInterval(() => {
      const agents = ['Atlas', 'Nova', 'Sentinel', 'Cipher', 'Echo', 'Chrono', 'Vault']
      const agentColors = ['#00ff88', '#8b5cf6', '#ef4444', '#f87171', '#06b6d4', '#f59e0b', '#f97316']
      const agentRooms: RoomId[] = ['genome', 'dream', 'war', 'redteam', 'metalearning', 'temporal', 'identity']
      const idx = Math.floor(Math.random() * agents.length)
      const newEntry: ActivityEntry = {
        id: `act-${Date.now()}`,
        agentName: agents[idx],
        agentColor: agentColors[idx],
        action: actions[Math.floor(Math.random() * actions.length)],
        room: agentRooms[idx],
        timestamp: Date.now(),
      }
      setEntries(prev => [newEntry, ...prev].slice(0, 20))
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.08, boxShadow: '0 0 16px rgba(139,92,246,0.3)' }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen(o => !o)}
        className="fixed right-4 top-16 z-50 px-3 py-2 rounded-xl text-[10px] font-mono tracking-wider uppercase cursor-pointer glass-strong"
        style={{
          color: open ? '#c4b5fd' : '#94a3b8',
          borderColor: open ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
          minHeight: 44, // touch-friendly
        }}
      >
        <span className="flex items-center gap-1.5">
          Activity
          {entries.length > 0 && (
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ color: '#22c55e', fontSize: 8 }}
            >
              ●
            </motion.span>
          )}
        </span>
      </motion.button>

      {/* Feed panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed right-4 top-28 z-50 w-72 max-h-[60vh] flex flex-col rounded-2xl glass-strong overflow-hidden"
            style={{
              boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1)',
            }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#94a3b8' }}>
                  Live Activity
                </div>
                <div className="text-[9px] font-mono" style={{ color: '#475569' }}>
                  {entries.length} events
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scroll-fade" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex flex-col">
                <AnimatePresence initial={false}>
                  {entries.map((entry, i) => {
                    const roomData = rooms.find(r => r.id === entry.room)
                    return (
                      <motion.button
                        key={entry.id}
                        initial={{ opacity: 0, x: 30, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                        exit={{ opacity: 0, x: -30, height: 0 }}
                        transition={{ duration: 0.3, delay: i < 3 ? i * 0.05 : 0 }}
                        onClick={() => { onRoomChange(entry.room); setOpen(false) }}
                        className="flex items-start gap-2.5 px-4 py-2.5 text-left cursor-pointer border-b transition-colors duration-200"
                        style={{ borderColor: 'rgba(255,255,255,0.03)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {/* Agent dot with glow */}
                        <div className="relative mt-1 shrink-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              background: entry.agentColor,
                              boxShadow: `0 0 8px ${entry.agentColor}66`,
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px]" style={{ color: '#e2e8f0' }}>
                            <span className="font-semibold" style={{ color: entry.agentColor }}>{entry.agentName}</span>
                            {' '}<span style={{ color: '#94a3b8' }}>{entry.action}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-mono" style={{ color: roomData?.color ?? '#64748b' }}>
                              {roomData?.name ?? entry.room}
                            </span>
                            <span className="text-[9px] font-mono tabular-nums" style={{ color: '#475569' }}>
                              {timeAgo(entry.timestamp)}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
