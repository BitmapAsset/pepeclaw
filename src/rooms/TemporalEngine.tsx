import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TimelineTask } from '../data/types';
import { useData } from '../api/DataProvider';

// ─── Theme ───────────────────────────────────────────────────────────
const C = {
  bg: '#0a0b14',
  surface: '#12131f',
  surfaceLight: '#1a1b2e',
  border: '#2a2b3d',
  text: '#e2e8f0',
  textDim: '#64748b',
  accent: '#8b5cf6',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
  cyan: '#06b6d4',
} as const;

const priorityColor: Record<TimelineTask['priority'], string> = {
  urgent: C.red,
  normal: C.blue,
  done: C.green,
  low: C.amber,
};

// ─── Hourglass ───────────────────────────────────────────────────────
// Pre-computed random offsets for hourglass particles
const hourglassOffsets = Array.from({ length: 12 }, () => (Math.random() - 0.5) * 8);

function Hourglass() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 0.35,
    x: hourglassOffsets[i],
  }));

  return (
    <div className="flex flex-col items-center">
      <svg width="80" height="120" viewBox="0 0 80 120">
        {/* Glow filter */}
        <defs>
          <filter id="hg-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="sand-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.amber} />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Hourglass outline */}
        <motion.path
          d="M 15 10 L 65 10 L 42 55 L 42 65 L 65 110 L 15 110 L 38 65 L 38 55 Z"
          fill="none"
          stroke={C.accent}
          strokeWidth="2"
          filter="url(#hg-glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        />

        {/* Top sand pile */}
        <motion.ellipse
          cx="40"
          cy="35"
          rx="12"
          ry="4"
          fill="url(#sand-grad)"
          initial={{ ry: 8 }}
          animate={{ ry: [8, 3, 8] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Bottom sand pile */}
        <motion.ellipse
          cx="40"
          cy="95"
          rx="14"
          ry="4"
          fill="url(#sand-grad)"
          initial={{ ry: 3 }}
          animate={{ ry: [3, 9, 3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Falling sand stream (center) */}
        <motion.line
          x1="40"
          y1="45"
          x2="40"
          y2="75"
          stroke={C.amber}
          strokeWidth="1.5"
          opacity={0.7}
          strokeDasharray="3 4"
          animate={{ strokeDashoffset: [0, -14] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Sand particles */}
        {particles.map((p) => (
          <motion.circle
            key={p.id}
            cx={40 + p.x}
            r="1.5"
            fill={C.amber}
            opacity={0.8}
            initial={{ cy: 42 }}
            animate={{ cy: [42, 90], opacity: [0.9, 0] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeIn',
            }}
          />
        ))}

        {/* Top/bottom caps */}
        <rect x="12" y="8" width="56" height="3" rx="1" fill={C.accent} opacity={0.8} />
        <rect x="12" y="109" width="56" height="3" rx="1" fill={C.accent} opacity={0.8} />
      </svg>
    </div>
  );
}

// ─── Circular Progress ───────────────────────────────────────────────
function CircularProgress({ pct, color, size = 48 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth="4" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (circ * pct) / 100 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={C.text}
        fontSize={size * 0.24}
        fontFamily="monospace"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ─── Clock Icon (SVG) ────────────────────────────────────────────────
function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8.5" stroke={C.cyan} strokeWidth="1.5" />
      <line x1="10" y1="10" x2="10" y2="5" stroke={C.cyan} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="10" x2="14" y2="10" stroke={C.cyan} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="1" fill={C.cyan} />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function TemporalEngine() {
  const { temporalData } = useData();
  const { batches, tasks, currentHour } = temporalData ?? { batches: [], tasks: [], currentHour: new Date().getHours() };
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  // Group tasks by batch
  const batchGroups = useMemo(
    () =>
      batches.map((b) => ({
        ...b,
        tasks: tasks.filter((t) => t.batchId === b.id),
      })),
    [batches, tasks],
  );

  // Batch summaries
  const batchSummaries = useMemo(
    () =>
      batchGroups.map((bg) => {
        const done = bg.tasks.filter((t) => t.priority === 'done').length;
        const total = bg.tasks.length;
        return { ...bg, total, done, pct: total > 0 ? (done / total) * 100 : 0 };
      }),
    [batchGroups],
  );

  // Procrastination list sorted by deferrals desc
  const procrastinators = useMemo(
    () => [...tasks].filter((t) => t.deferrals > 0).sort((a, b) => b.deferrals - a.deferrals),
    [tasks],
  );

  const maxDeferrals = useMemo(
    () => Math.max(...procrastinators.map((t) => t.deferrals), 1),
    [procrastinators],
  );

  const timeUnits = Array.from({ length: 13 }, (_, i) => i); // 0-12

  const legendItems: { label: string; color: string }[] = [
    { label: 'Urgent', color: C.red },
    { label: 'Normal', color: C.blue },
    { label: 'Low', color: C.amber },
    { label: 'Done', color: C.green },
  ];

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden"
      style={{ background: C.bg, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-3">
          <ClockIcon />
          <div>
            <h1 className="text-lg font-bold tracking-widest" style={{ color: C.accent }}>
              TEMPORAL ENGINE
            </h1>
            <p className="text-xs" style={{ color: C.textDim }}>
              Timeline position: T+{currentHour}h &middot; {tasks.length} tasks across{' '}
              {batches.length} batches
            </p>
          </div>
        </div>
        {/* Priority Legend */}
        <div className="flex items-center gap-4">
          {legendItems.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: l.color }}
              />
              <span className="text-xs" style={{ color: C.textDim }}>
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hourglass Centerpiece ──────────────────────────────── */}
      <motion.div
        className="flex justify-center py-3 shrink-0"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <Hourglass />
      </motion.div>

      {/* ── Task Timeline (Gantt) ──────────────────────────────── */}
      <div
        className="flex-1 mx-6 mb-3 overflow-auto rounded-2xl glass"
        style={{ background: 'rgba(18,19,31,0.6)' }}
      >
        <div className="min-w-[700px]">
          {/* Time axis header */}
          <div className="flex items-end px-4 pt-3 pb-1" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="w-40 shrink-0 text-xs" style={{ color: C.textDim }}>
              Batch / Task
            </div>
            <div className="flex-1 relative h-6">
              {timeUnits.map((t) => (
                <div
                  key={t}
                  className="absolute text-[10px] -translate-x-1/2"
                  style={{ left: `${(t / 12) * 100}%`, color: C.textDim }}
                >
                  {t}h
                </div>
              ))}
            </div>
          </div>

          {/* Batch rows */}
          {batchGroups.map((bg, batchIdx) => (
            <div key={bg.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              {/* Batch label */}
              <div
                className="px-4 py-1.5 text-xs font-semibold flex items-center gap-2"
                style={{ background: C.surfaceLight, color: bg.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: bg.color }} />
                {bg.name}
              </div>

              {/* Tasks in this batch */}
              {bg.tasks.map((task, taskIdx) => {
                const leftPct = (task.startTime / 12) * 100;
                const widthPct = ((task.endTime - task.startTime) / 12) * 100;
                const color = priorityColor[task.priority];
                const isHovered = hoveredTask === task.id;

                return (
                  <div key={task.id} className="flex items-center px-4 py-1.5 relative">
                    {/* Task label */}
                    <div
                      className="w-40 shrink-0 text-xs truncate pr-2"
                      style={{ color: C.textDim }}
                      title={task.title}
                    >
                      {task.title}
                    </div>

                    {/* Timeline area */}
                    <div className="flex-1 relative h-7">
                      {/* Grid lines */}
                      {timeUnits.map((t) => (
                        <div
                          key={t}
                          className="absolute top-0 h-full w-px"
                          style={{
                            left: `${(t / 12) * 100}%`,
                            background: C.border,
                            opacity: 0.5,
                          }}
                        />
                      ))}

                      {/* Current time line */}
                      {taskIdx === 0 && batchIdx === 0 ? null : null}

                      {/* Task bar */}
                      <motion.div
                        className="absolute top-1 h-5 rounded cursor-pointer"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          background: `${color}33`,
                          border: `1px solid ${color}`,
                          boxShadow: isHovered ? `0 0 12px ${color}66` : 'none',
                        }}
                        initial={{ scaleX: 0, originX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{
                          duration: 0.6,
                          delay: batchIdx * 0.15 + taskIdx * 0.08,
                          ease: 'easeOut',
                        }}
                        onMouseEnter={() => setHoveredTask(task.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        <span
                          className="text-[10px] leading-5 px-1.5 truncate block"
                          style={{ color }}
                        >
                          {task.title}
                        </span>
                      </motion.div>

                      {/* Tooltip */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            className="absolute z-50 rounded-md px-3 py-2 text-[11px] max-w-60 pointer-events-none"
                            style={{
                              left: `${leftPct + widthPct / 2}%`,
                              top: -48,
                              transform: 'translateX(-50%)',
                              background: C.surfaceLight,
                              border: `1px solid ${color}`,
                              color: C.text,
                              boxShadow: `0 4px 20px ${C.bg}cc`,
                            }}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div className="font-semibold mb-0.5" style={{ color }}>
                              {task.title}
                            </div>
                            <div style={{ color: C.textDim }}>{task.description}</div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Current time indicator (rendered on every row for the glowing line) */}
                      <div
                        className="absolute top-0 h-full w-0.5"
                        style={{
                          left: `${(currentHour / 12) * 100}%`,
                          background: C.cyan,
                          boxShadow: `0 0 8px ${C.cyan}, 0 0 16px ${C.cyan}55`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Panels ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-6 pb-4 shrink-0" style={{ maxHeight: '35%' }}>
        {/* ── Batch Summary (left) ─────────────────────────────── */}
        <div
          className="rounded-2xl p-4 overflow-auto glass"
          style={{ background: 'rgba(18,19,31,0.6)' }}
        >
          <h2 className="text-xs font-bold tracking-wider mb-3" style={{ color: C.textDim }}>
            BATCH SUMMARY
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {batchSummaries.map((bs, i) => (
              <motion.div
                key={bs.id}
                className="flex items-center gap-3 rounded-md p-2.5"
                style={{ background: C.surfaceLight, border: `1px solid ${C.border}` }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <CircularProgress pct={bs.pct} color={bs.color} size={48} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: bs.color }}>
                    {bs.name}
                  </div>
                  <div className="text-[10px]" style={{ color: C.textDim }}>
                    {bs.done}/{bs.total} tasks done
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Procrastination Tracker (right) ──────────────────── */}
        <div
          className="rounded-2xl p-4 overflow-auto glass"
          style={{ background: 'rgba(18,19,31,0.6)' }}
        >
          <h2 className="text-xs font-bold tracking-wider mb-3" style={{ color: C.textDim }}>
            PROCRASTINATION TRACKER
          </h2>
          <div className="space-y-2">
            {procrastinators.map((task, i) => {
              const isChronic = task.deferrals >= 5;
              const isWarning = task.deferrals >= 3;
              const barPct = (task.deferrals / maxDeferrals) * 100;
              return (
                <motion.div
                  key={task.id}
                  className="flex items-center gap-3 rounded-md px-3 py-2"
                  style={{ background: C.surfaceLight }}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.35 }}
                >
                  {/* Warning icon for 3+ */}
                  <div className="w-4 shrink-0 flex justify-center">
                    {isWarning && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M7 1L13 12H1L7 1Z"
                          fill={isChronic ? C.red : C.amber}
                          opacity={0.9}
                        />
                        <text
                          x="7"
                          y="10.5"
                          textAnchor="middle"
                          fontSize="7"
                          fontWeight="bold"
                          fill={C.bg}
                        >
                          !
                        </text>
                      </svg>
                    )}
                  </div>

                  {/* Task name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs truncate" style={{ color: C.text }}>
                        {task.title}
                      </span>
                      {isChronic && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0"
                          style={{ background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}55` }}
                        >
                          CHRONIC
                        </span>
                      )}
                    </div>
                    {/* Deferral bar */}
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ background: C.border }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: isChronic ? C.red : isWarning ? C.amber : C.blue,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${barPct}%` }}
                          transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-mono shrink-0 w-6 text-right"
                        style={{ color: isChronic ? C.red : isWarning ? C.amber : C.textDim }}
                      >
                        {task.deferrals}x
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
