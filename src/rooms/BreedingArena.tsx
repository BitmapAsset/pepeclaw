import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { breedingCandidates, type BreedingCandidate } from '../data/mockData'

function SkillBar({ name, fitness, color }: { name: string; fitness: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span style={{ color: '#94a3b8', width: 100 }}>{name}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1a1b2e' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fitness}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span style={{ color, width: 28, textAlign: 'right' }}>{fitness}%</span>
    </div>
  )
}

function ParentCard({ candidate, label }: { candidate: BreedingCandidate; label: string }) {
  return (
    <div className="rounded-2xl border p-4 flex-1 card-tilt" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', borderColor: `${candidate.color}30`, boxShadow: `0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ background: candidate.color, boxShadow: `0 0 8px ${candidate.color}66` }} />
        <span className="text-xs font-mono font-semibold" style={{ color: candidate.color }}>{candidate.name}</span>
        <span className="text-[8px] font-mono tracking-wider uppercase ml-auto" style={{ color: '#64748b' }}>{label}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {candidate.skills.map(s => (
          <SkillBar key={s.name} name={s.name} fitness={s.fitness} color={s.color} />
        ))}
      </div>
    </div>
  )
}

function ChildCard({ parentA, parentB, visible }: { parentA: BreedingCandidate; parentB: BreedingCandidate; visible: boolean }) {
  if (!visible) return null

  // Simulated child: mix skills from both parents
  const childSkills = parentA.skills.map((s, i) => {
    const other = parentB.skills[i]
    const fitness = Math.round((s.fitness + other.fitness) / 2 + (Math.random() - 0.5) * 10)
    return { name: s.name, fitness: Math.min(100, Math.max(0, fitness)), color: '#f472b6' }
  })

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="rounded-2xl border p-4 mt-4 glass"
      style={{ background: 'rgba(236,72,153,0.06)', borderColor: '#ec489940', boxShadow: '0 8px 32px rgba(236,72,153,0.1)' }}
    >
      <div className="text-center mb-3">
        <div className="text-[10px] font-mono tracking-widest uppercase" style={{ color: '#ec4899' }}>Child Agent Born</div>
        <div className="text-sm font-mono font-bold mt-1" style={{ color: '#f472b6' }}>
          {parentA.name.slice(0, 2)}{parentB.name.slice(0, 2)}-{Math.floor(Math.random() * 999).toString().padStart(3, '0')}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {childSkills.map(s => (
          <SkillBar key={s.name} name={s.name} fitness={s.fitness} color={s.color} />
        ))}
      </div>
      <div className="mt-3 text-center">
        <div className="text-[9px] font-mono" style={{ color: '#64748b' }}>
          Inherited from {parentA.name} + {parentB.name} | Gen 1
        </div>
      </div>
    </motion.div>
  )
}

export default function BreedingArena() {
  const [breeding, setBreeding] = useState(false)
  const [childVisible, setChildVisible] = useState(false)
  const parentA = breedingCandidates[0]
  const parentB = breedingCandidates[1]

  const handleBreed = () => {
    setBreeding(true)
    setChildVisible(false)
    setTimeout(() => {
      setChildVisible(true)
      setBreeding(false)
    }, 2000)
  }

  return (
    <div className="h-full overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-mono font-bold tracking-wider" style={{ color: '#ec4899' }}>
            BREEDING ARENA
          </h2>
          <p className="text-[11px] font-mono mt-1" style={{ color: '#64748b' }}>
            Cross agent genomes to create superior offspring
          </p>
        </div>

        {/* Parents */}
        <div className="flex gap-4 mb-4">
          <ParentCard candidate={parentA} label="Parent A" />
          <ParentCard candidate={parentB} label="Parent B" />
        </div>

        {/* Breed button */}
        <div className="text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBreed}
            disabled={breeding}
            className="px-6 py-2.5 rounded-lg text-xs font-mono tracking-wider uppercase cursor-pointer border-0"
            style={{
              background: breeding
                ? 'rgba(236,72,153,0.3)'
                : 'linear-gradient(135deg, #ec4899, #a855f7)',
              color: '#fff',
              boxShadow: '0 0 20px rgba(236,72,153,0.3)',
              opacity: breeding ? 0.7 : 1,
            }}
          >
            {breeding ? 'Intertwining DNA...' : 'Breed Agents'}
          </motion.button>
        </div>

        {/* Breeding animation */}
        <AnimatePresence>
          {breeding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-6"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 rounded-full border-2"
                  style={{ borderColor: '#00ff88', borderTopColor: 'transparent' }}
                />
                <span className="text-[10px] font-mono" style={{ color: '#ec4899' }}>
                  Crossover in progress...
                </span>
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 rounded-full border-2"
                  style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Child result */}
        <ChildCard parentA={parentA} parentB={parentB} visible={childVisible} />
      </div>
    </div>
  )
}
