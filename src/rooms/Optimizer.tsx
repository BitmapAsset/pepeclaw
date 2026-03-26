import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizerData } from '../data/mockData';

const colors = {
  bg: '#0a0b14',
  surface: '#12131f',
  border: '#2a2b3d',
  text: '#e2e8f0',
  textDim: '#64748b',
  accent: '#f97316',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  cyan: '#06b6d4',
};

function scoreColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.amber;
  return colors.red;
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const color = scoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.border}
          strokeWidth={6}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          filter={`drop-shadow(0 0 6px ${color}60)`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold font-mono"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {score}%
        </motion.span>
        <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: colors.textDim }}>
          Optimized
        </span>
      </div>
    </div>
  );
}

function SectionCard({
  section,
  index,
}: {
  section: typeof optimizerData[0];
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(section.score);
  const fixedCount = section.recommendations.filter(r => r.fixed).length;
  const totalCount = section.recommendations.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="rounded-xl overflow-hidden card-tilt"
      style={{
        background: 'rgba(18,19,31,0.7)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${colors.border}`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 cursor-pointer border-0 bg-transparent text-left"
      >
        <span className="text-xl">{section.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: colors.text }}>
              {section.name}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color, background: `${color}18` }}>
              {section.score}/100
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 rounded-full" style={{ background: colors.border }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${section.score}%` }}
              transition={{ duration: 1, delay: index * 0.15, ease: 'easeOut' }}
            />
          </div>
        </div>
        <span className="text-[10px] font-mono" style={{ color: colors.textDim }}>
          {fixedCount}/{totalCount}
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          className="text-xs"
          style={{ color: colors.textDim }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex flex-col gap-2">
              {section.recommendations.map((rec, i) => {
                const priorityColor = rec.priority === 'high' ? colors.red : rec.priority === 'medium' ? colors.amber : colors.cyan;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      background: rec.fixed ? 'rgba(34,197,94,0.06)' : colors.surface,
                      opacity: rec.fixed ? 0.7 : 1,
                    }}
                  >
                    <span className="text-xs" style={{ color: rec.fixed ? colors.green : colors.textDim }}>
                      {rec.fixed ? '✓' : '○'}
                    </span>
                    <span
                      className="flex-1 text-xs"
                      style={{
                        color: rec.fixed ? colors.textDim : colors.text,
                        textDecoration: rec.fixed ? 'line-through' : 'none',
                      }}
                    >
                      {rec.text}
                    </span>
                    <span
                      className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
                      style={{ color: priorityColor, background: `${priorityColor}15` }}
                    >
                      {rec.priority}
                    </span>
                    {!rec.fixed && (
                      <button
                        className="text-[9px] font-mono px-2 py-1 rounded cursor-pointer border-0"
                        style={{ background: `${colors.accent}20`, color: colors.accent }}
                      >
                        Fix
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Optimizer() {
  const overallScore = Math.round(
    optimizerData.reduce((sum, s) => sum + s.score, 0) / optimizerData.length
  );

  return (
    <div
      className="h-full w-full flex flex-col gap-4 p-5 overflow-auto"
      style={{ background: colors.bg, color: colors.text }}
    >
      {/* Header */}
      <motion.div
        className="flex items-center gap-3 shrink-0"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1
          className="text-xl font-black tracking-[0.25em] uppercase"
          style={{
            textShadow: `0 0 6px ${colors.accent}, 2px 0 0 ${colors.cyan}, -2px 0 0 ${colors.red}, 0 0 30px rgba(249,115,22,0.3)`,
            color: colors.text,
          }}
        >
          Optimizer
        </h1>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${colors.accent}44, transparent)` }} />
        <span className="text-xs font-mono px-2 py-1 rounded" style={{ color: colors.accent, background: `${colors.accent}15` }}>
          HEALTH AUDIT
        </span>
      </motion.div>

      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-center gap-8 py-4 rounded-2xl"
        style={{
          background: 'rgba(18,19,31,0.7)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.border}`,
        }}
      >
        <ScoreRing score={overallScore} />
        <div>
          <div className="text-sm font-semibold mb-1" style={{ color: colors.text }}>
            Your OpenClaw is {overallScore}% optimized
          </div>
          <div className="text-xs" style={{ color: colors.textDim }}>
            {overallScore >= 80
              ? 'Great shape! Minor tweaks available.'
              : overallScore >= 60
              ? 'Good foundation. Several improvements available.'
              : 'Significant optimization opportunities exist.'}
          </div>
          <div className="flex gap-2 mt-3">
            {optimizerData.map(s => (
              <div key={s.name} className="flex items-center gap-1">
                <span className="text-xs">{s.icon}</span>
                <span className="text-[10px] font-mono" style={{ color: scoreColor(s.score) }}>
                  {s.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Section Cards */}
      <div className="flex flex-col gap-3">
        {optimizerData.map((section, i) => (
          <SectionCard key={section.name} section={section} index={i} />
        ))}
      </div>
    </div>
  );
}
