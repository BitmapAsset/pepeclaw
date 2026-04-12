import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { rooms, type ActivityEntry, type RoomId } from '../data/types'
import { useData } from '../api/DataProvider'

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export function ActivityFeed({ onRoomChange }: { onRoomChange: (r: RoomId) => void }) {
  const { activities } = useData()
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const latestEntry = entries[0]
  const latestRoom = latestEntry ? rooms.find(r => r.id === latestEntry.room) : null

  // Seed entries when data arrives
  useEffect(() => {
    if (activities.length > 0) setEntries(activities)
  }, [activities])

  // Simulate new activity arriving every 8s
  useEffect(() => {
    const actions = [
      'Evolved skill chromosome — fitness +4%',
      'Completed dream synthesis: emergent pattern detected',
      'Flagged confirmation bias in Round 7 argument',
      'Optimized batch schedule — 3 tasks parallelized',
      'Verified identity hash #0x4a8f...c2e1',
      'Triggered mutation cycle: Code Gen gen 48→49',
      'Self-modified learning rate: 0.003→0.0025',
      'Bred new agent variant — inheriting 6 skills',
      'Detected anomalous latency spike in Auth Service',
      'Completed ego death cycle — rebirth score: 89%',
      'Cross-pollinated Reasoning + Planning skills',
      'Discovered novel optimization pathway via dreams',
      'Resolved debate: monolith wins by confidence 0.73',
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
        whileHover={{ scale: 1.04, boxShadow: '0 12px 32px rgba(0,0,0,0.35), 0 0 18px rgba(6,182,212,0.18)' }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen(o => !o)}
        className="activity-toggle fixed right-2 sm:right-4 top-14 sm:top-16 z-50 cursor-pointer"
        style={{
          color: open ? '#e2e8f0' : '#94a3b8',
          borderColor: open ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)',
        }}
      >
        <span className="activity-toggle__label">
          <span>Activity</span>
          {latestEntry && (
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="activity-toggle__live"
            >
              ●
            </motion.span>
          )}
        </span>
        {latestEntry && (
          <span className="activity-toggle__preview">
            <span style={{ color: latestEntry.agentColor }}>{latestEntry.agentName}</span>
            <span>{latestRoom?.name ?? latestEntry.room}</span>
          </span>
        )}
      </motion.button>

      {/* Feed panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="activity-panel fixed right-2 sm:right-4 top-[6.7rem] sm:top-28 z-50 w-[calc(100vw-1rem)] sm:w-[22rem] max-h-[64vh] flex flex-col overflow-hidden"
          >
            <div className="activity-panel__header">
              <div className="flex items-center justify-between">
                <div className="activity-panel__eyebrow">
                  Live Activity
                </div>
                <div className="activity-panel__count">
                  {entries.length} events
                </div>
              </div>
              <div className="activity-panel__subhead">Agent movement, mutations, and room-level decisions.</div>
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
                        className="activity-entry"
                        style={{ '--agent-color': entry.agentColor, '--room-color': roomData?.color ?? '#64748b' } as CSSProperties}
                      >
                        {/* Agent dot with glow */}
                        <div className="activity-entry__dot-wrap">
                          <div className="activity-entry__dot" />
                        </div>
                        <div className="activity-entry__body">
                          <div className="activity-entry__agent-row">
                            <span className="activity-entry__agent">{entry.agentName}</span>
                            <span className="activity-entry__time">{timeAgo(entry.timestamp)}</span>
                          </div>
                          <div className="activity-entry__action">
                            {entry.action}
                          </div>
                          <div className="activity-entry__meta">
                            <span className="activity-entry__room">
                              {roomData?.name ?? entry.room}
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
