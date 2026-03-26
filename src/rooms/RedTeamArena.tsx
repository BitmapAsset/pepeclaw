import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { redTeamData } from '../data/mockData'
import type { AssumptionCard } from '../data/mockData'

// ─── Bias type icons (SVG-free, text-based) ─────────────────────────
const biasIcons: Record<string, string> = {
  'confirmation': '⊘',
  'anchoring': '⚓',
  'availability': '◉',
  'sunk-cost': '⛓',
  'bandwagon': '⟿',
}

const severityColors: Record<string, { border: string; bg: string; text: string }> = {
  high:   { border: 'border-anima-red',   bg: 'bg-anima-red/10',   text: 'text-anima-red' },
  medium: { border: 'border-anima-amber', bg: 'bg-anima-amber/10', text: 'text-anima-amber' },
  low:    { border: 'border-yellow-400',  bg: 'bg-yellow-400/10',  text: 'text-yellow-400' },
}

const assumptionBorders: Record<AssumptionCard['status'], string> = {
  unchallenged: 'border-anima-green',
  challenged:   'border-anima-amber',
  debunked:     'border-anima-red',
}

// ─── Sub-components ──────────────────────────────────────────────────

function AgentAvatar({ name, side, score }: { name: string; side: 'attacker' | 'defender'; score: number }) {
  const isAttacker = side === 'attacker'
  const color = isAttacker ? 'anima-red' : 'anima-blue'
  const glow = isAttacker ? 'anima-red-glow' : 'anima-blue-glow'
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className={`relative w-20 h-20 rounded-full border-2 border-${color} flex items-center justify-center`}
        style={{
          boxShadow: `0 0 20px var(--color-${glow}), 0 0 40px var(--color-${glow})40, inset 0 0 15px var(--color-${glow})20`,
        }}
        animate={{
          boxShadow: [
            `0 0 20px var(--color-${glow}), 0 0 40px var(--color-${glow})40, inset 0 0 15px var(--color-${glow})20`,
            `0 0 30px var(--color-${glow}), 0 0 60px var(--color-${glow})60, inset 0 0 25px var(--color-${glow})30`,
            `0 0 20px var(--color-${glow}), 0 0 40px var(--color-${glow})40, inset 0 0 15px var(--color-${glow})20`,
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className={`text-2xl font-bold font-mono text-${color}`}>{initials}</span>
        {/* Corner icon */}
        <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-anima-surface border border-${color} flex items-center justify-center text-xs`}>
          {isAttacker ? '⚔' : '🛡'}
        </div>
      </motion.div>
      <span className={`text-sm font-semibold text-${color} tracking-wide uppercase`}>{name}</span>
      <span className="text-xs text-anima-text-dim font-mono">Score: {score}</span>
    </div>
  )
}

function ScoreBar({ score, side }: { score: number; side: 'attacker' | 'defender' }) {
  const isAttacker = side === 'attacker'
  const color = isAttacker ? '#ef4444' : '#3b82f6'
  const glowColor = isAttacker ? '#f87171' : '#60a5fa'

  return (
    <div className="flex flex-col items-center gap-1 w-5">
      <span className="text-[10px] font-mono text-anima-text-dim">{score}</span>
      <div className="relative w-3 flex-1 rounded-full bg-anima-surface-light overflow-hidden border border-anima-border">
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${glowColor}` }}
          initial={{ height: '0%' }}
          animate={{ height: `${score}%` }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  )
}

function SpeechBubble({ agent, text, confidence, index }: { agent: 'attacker' | 'defender'; text: string; confidence: number; index: number }) {
  const isAttacker = agent === 'attacker'

  return (
    <motion.div
      className={`flex ${isAttacker ? 'justify-start' : 'justify-end'}`}
      initial={{ opacity: 0, x: isAttacker ? -40 : 40, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15, ease: 'easeOut' }}
    >
      <div
        className={`relative max-w-[75%] p-4 rounded-2xl border ${
          isAttacker
            ? 'bg-anima-red/5 border-anima-red/30 rounded-bl-sm'
            : 'bg-anima-blue/5 border-anima-blue/30 rounded-br-sm'
        }`}
        style={{
          boxShadow: isAttacker
            ? '0 0 15px rgba(239,68,68,0.08)'
            : '0 0 15px rgba(59,130,246,0.08)',
        }}
      >
        {/* Agent label */}
        <div className={`text-[10px] font-mono uppercase tracking-wider mb-1.5 ${isAttacker ? 'text-anima-red/70' : 'text-anima-blue/70'}`}>
          {isAttacker ? '⚔ Attacker' : '🛡 Defender'}
        </div>
        <p className="text-sm text-anima-text leading-relaxed">{text}</p>
        {/* Confidence bar */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-mono text-anima-text-dim">Confidence</span>
          <div className="flex-1 h-1.5 rounded-full bg-anima-surface-light overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor: isAttacker ? '#ef4444' : '#3b82f6',
                boxShadow: isAttacker ? '0 0 6px #f87171' : '0 0 6px #60a5fa',
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.8, delay: index * 0.15 + 0.3 }}
            />
          </div>
          <span className={`text-[10px] font-mono font-bold ${isAttacker ? 'text-anima-red' : 'text-anima-blue'}`}>
            {confidence}%
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function BiasAlertCard({ alert, index }: { alert: typeof redTeamData.biasAlerts[0]; index: number }) {
  const sev = severityColors[alert.severity]
  return (
    <motion.div
      className={`p-3 rounded-lg border ${sev.border} ${sev.bg} backdrop-blur-sm`}
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.8 + index * 0.2, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">{biasIcons[alert.type] ?? '⚠'}</span>
        <span className={`text-xs font-mono font-bold uppercase tracking-wider ${sev.text}`}>
          {alert.severity}
        </span>
      </div>
      <p className="text-xs text-anima-text leading-relaxed">{alert.description}</p>
      <div className="mt-1.5 flex items-center gap-1">
        <span className="text-[9px] font-mono text-anima-text-dim">TYPE:</span>
        <span className="text-[9px] font-mono text-anima-text-dim uppercase">{alert.type.replace('-', ' ')}</span>
      </div>
    </motion.div>
  )
}

function AssumptionFlipCard({ card, onFlip }: { card: AssumptionCard & { flipped: boolean }; onFlip: () => void }) {
  const borderClass = assumptionBorders[card.status]
  const isDebunked = card.status === 'debunked'

  return (
    <motion.div
      className="relative cursor-pointer perspective-[600px]"
      onClick={onFlip}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative w-full"
        animate={{ rotateY: card.flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front — Assumption */}
        <div
          className={`p-4 rounded-xl border-2 ${borderClass} bg-anima-surface min-h-[120px]`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {isDebunked && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className="text-6xl text-anima-red/30 font-black rotate-[-15deg]">✕</span>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${borderClass} ${
              card.status === 'unchallenged' ? 'text-anima-green' :
              card.status === 'challenged' ? 'text-anima-amber' : 'text-anima-red'
            }`}>
              {card.status}
            </span>
          </div>
          <p className="text-xs text-anima-text leading-relaxed">{card.assumption}</p>
          <p className="text-[9px] text-anima-text-dim font-mono mt-2">Click to reveal reality</p>
        </div>

        {/* Back — Reality */}
        <div
          className={`absolute inset-0 p-4 rounded-xl border-2 ${borderClass} bg-anima-surface-light min-h-[120px]`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono uppercase tracking-wider text-anima-accent">Reality</span>
          </div>
          <p className="text-xs text-anima-text leading-relaxed">{card.reality}</p>
          <p className="text-[9px] text-anima-text-dim font-mono mt-2">Click to flip back</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export default function RedTeamArena() {
  const { topic, attackerName, defenderName, attackerScore, defenderScore, arguments: args, biasAlerts, assumptions } = redTeamData

  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="relative h-full w-full bg-anima-bg overflow-hidden flex flex-col">
      {/* ── Dramatic lighting overlays ── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Red glow from left */}
        <div
          className="absolute inset-y-0 left-0 w-1/3"
          style={{
            background: 'radial-gradient(ellipse at 0% 50%, rgba(239,68,68,0.08) 0%, transparent 70%)',
          }}
        />
        {/* Blue glow from right */}
        <div
          className="absolute inset-y-0 right-0 w-1/3"
          style={{
            background: 'radial-gradient(ellipse at 100% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)',
          }}
        />
        {/* Top center clash glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px]"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.1) 0%, transparent 70%)',
          }}
        />
        {/* Scan line effect */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          }}
        />
      </div>

      {/* ── Header ── */}
      <motion.header
        className="relative z-10 px-6 pt-5 pb-4 text-center border-b border-anima-border/50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.h1
          className="text-3xl font-black tracking-[0.25em] uppercase font-mono"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #8b5cf6, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 40px rgba(139,92,246,0.3)',
          }}
        >
          Red Team Arena
        </motion.h1>
        <motion.p
          className="mt-2 text-sm text-anima-text-dim font-mono tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          &ldquo;{topic}&rdquo;
        </motion.p>
        {/* VS indicator */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-10 h-10 rounded-full bg-anima-surface border border-anima-accent/40 flex items-center justify-center z-20"
          style={{ boxShadow: '0 0 15px rgba(139,92,246,0.3)' }}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-xs font-black font-mono text-anima-accent">VS</span>
        </motion.div>
      </motion.header>

      {/* ── Main battle area ── */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {/* Left: Attacker avatar + score bar */}
        <div className="flex flex-col items-center justify-start pt-10 px-4 gap-6 w-[120px] shrink-0">
          <AgentAvatar name={attackerName} side="attacker" score={attackerScore} />
          <ScoreBar score={attackerScore} side="attacker" />
        </div>

        {/* Center: Debate stream */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {args.map((arg, i) => (
              <SpeechBubble key={arg.id} agent={arg.agent} text={arg.text} confidence={arg.confidence} index={i} />
            ))}
          </div>
        </div>

        {/* Right: Defender avatar + score bar + bias alerts */}
        <div className="flex flex-col items-center pt-10 px-4 w-[220px] shrink-0 overflow-y-auto">
          <AgentAvatar name={defenderName} side="defender" score={defenderScore} />
          <div className="mt-4 mb-4">
            <ScoreBar score={defenderScore} side="defender" />
          </div>

          {/* Bias alerts */}
          <div className="w-full space-y-3 mt-2">
            <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-anima-text-dim text-center mb-2">
              Bias Detection
            </h3>
            <AnimatePresence>
              {biasAlerts.map((alert, i) => (
                <BiasAlertCard key={alert.id} alert={alert} index={i} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Assumption cards ── */}
      <motion.section
        className="relative z-10 border-t border-anima-border/50 px-6 py-5"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h3 className="text-[10px] font-mono uppercase tracking-[0.25em] text-anima-text-dim mb-4 text-center">
          Assumption Challenge Board
        </h3>
        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
          {assumptions.map(card => (
            <AssumptionFlipCard
              key={card.id}
              card={{ ...card, flipped: !!flippedCards[card.id] }}
              onFlip={() => toggleFlip(card.id)}
            />
          ))}
        </div>
      </motion.section>
    </div>
  )
}
