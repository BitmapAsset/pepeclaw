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
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="fixed right-4 top-16 z-50 px-2.5 py-1.5 rounded-lg text-[10px] font-mono tracking-wider uppercase cursor-pointer border"
        style={{
          background: open ? 'rgba(139,92,246,0.2)' : 'rgba(26,27,46,0.8)',
          borderColor: open ? '#8b5cf660' : '#2a2b3d',
          color: open ? '#c4b5fd' : '#64748b',
          backdropFilter: 'blur(8px)',
        }}
      >
        Activity {entries.length > 0 && <span style={{ color: '#22c55e' }}>●</span>}
      </motion.button>

      {/* Feed panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.2 }}
            className="fixed right-4 top-28 z-50 w-72 max-h-[60vh] overflow-y-auto rounded-xl border"
            style={{
              background: 'rgba(10,11,20,0.95)',
              borderColor: '#2a2b3d',
              backdropFilter: 'blur(12px)',
              scrollbarWidth: 'thin',
            }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: '#1a1b2e' }}>
              <div className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#64748b' }}>
                Live Activity
              </div>
            </div>
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                {entries.map(entry => {
                  const roomData = rooms.find(r => r.id === entry.room)
                  return (
                    <motion.button
                      key={entry.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onClick={() => { onRoomChange(entry.room); setOpen(false) }}
                      className="flex items-start gap-2 px-3 py-2 text-left cursor-pointer border-b transition-colors hover:bg-white/5"
                      style={{ borderColor: '#1a1b2e10' }}
                    >
                      {/* Agent dot */}
                      <div
                        className="w-2 h-2 rounded-full mt-1 shrink-0"
                        style={{ background: entry.agentColor, boxShadow: `0 0 6px ${entry.agentColor}66` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono" style={{ color: '#e2e8f0' }}>
                          <span style={{ color: entry.agentColor }}>{entry.agentName}</span>
                          {' '}{entry.action}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] font-mono" style={{ color: roomData?.color ?? '#64748b' }}>
                            {roomData?.name ?? entry.room}
                          </span>
                          <span className="text-[8px] font-mono" style={{ color: '#475569' }}>
                            {timeAgo(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
