import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { metaLearningData } from '../data/mockData';
import type { MetricPoint, ModificationProposal } from '../data/mockData';

// ─── Theme Constants ────────────────────────────────────────────────
const colors = {
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
};

const impactColors: Record<string, string> = {
  high: colors.red,
  medium: colors.amber,
  low: colors.blue,
};

const statusColumns = ['proposed', 'in-progress', 'completed'] as const;
const statusLabels: Record<string, string> = {
  proposed: 'Proposed',
  'in-progress': 'In Progress',
  completed: 'Completed',
};
const statusColors: Record<string, string> = {
  proposed: colors.amber,
  'in-progress': colors.cyan,
  completed: colors.green,
};

// ─── Holographic Card Wrapper ───────────────────────────────────────
function HoloCard({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden card-tilt ${className}`}
      style={{
        background: 'rgba(18,19,31,0.7)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        ...style,
      }}
    >
      {/* animated gradient border */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          padding: '1px',
          background:
            'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(6,182,212,0.2), rgba(139,92,246,0.1), rgba(59,130,246,0.3))',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ─── Mini Line Chart ────────────────────────────────────────────────
function MiniLineChart({
  data,
  label,
  color,
  unit,
  invert,
}: {
  data: MetricPoint[];
  label: string;
  color: string;
  unit: string;
  invert?: boolean;
}) {
  const currentValue = data[data.length - 1].value;
  const prevValue = data[data.length - 2]?.value ?? currentValue;
  const delta = currentValue - prevValue;
  const improving = invert ? delta < 0 : delta > 0;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const w = 200;
  const h = 60;
  const padX = 4;
  const padY = 4;

  const points = data
    .map((d, i) => {
      const x = padX + (i / (data.length - 1)) * (w - padX * 2);
      const y = padY + (1 - (d.value - min) / range) * (h - padY * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const fillPoints = `${padX},${h - padY} ${points} ${w - padX},${h - padY}`;
  const gradientId = `grad-${label.replace(/\s/g, '')}`;

  return (
    <HoloCard className="flex-1 min-w-0 p-4">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: colors.textDim }}
        >
          {label}
        </span>
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded"
          style={{
            color: improving ? colors.green : colors.red,
            background: improving
              ? 'rgba(34,197,94,0.12)'
              : 'rgba(239,68,68,0.12)',
          }}
        >
          {improving ? '+' : ''}
          {delta.toLocaleString()}
          {unit}
        </span>
      </div>
      <motion.span
        className="text-2xl font-bold font-mono block mb-2"
        style={{ color }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {currentValue.toLocaleString()}
        <span className="text-sm ml-0.5" style={{ color: colors.textDim }}>
          {unit}
        </span>
      </motion.span>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height: 60 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <motion.polygon
          points={fillPoints}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
        <motion.polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
    </HoloCard>
  );
}

// ─── Radar Chart ────────────────────────────────────────────────────
function RadarChart() {
  const { capabilities } = metaLearningData;
  const n = capabilities.length;
  const cx = 150;
  const cy = 150;
  const R = 110;

  function polarToXY(index: number, value: number) {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (value / 100) * R;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const gridLevels = [20, 40, 60, 80, 100];

  const currentPoints = capabilities
    .map((c, i) => {
      const p = polarToXY(i, c.current);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  const targetPoints = capabilities
    .map((c, i) => {
      const p = polarToXY(i, c.target);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <HoloCard className="p-4 flex flex-col">
      <span
        className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: colors.textDim }}
      >
        Capability Radar
      </span>
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 300 300" className="w-full max-w-[280px]">
          {/* grid */}
          {gridLevels.map((level) => (
            <polygon
              key={level}
              points={Array.from({ length: n })
                .map((_, i) => {
                  const p = polarToXY(i, level);
                  return `${p.x},${p.y}`;
                })
                .join(' ')}
              fill="none"
              stroke={colors.border}
              strokeWidth={0.5}
            />
          ))}
          {/* axes */}
          {capabilities.map((c, i) => {
            const p = polarToXY(i, 100);
            return (
              <line
                key={c.axis}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke={colors.border}
                strokeWidth={0.5}
              />
            );
          })}
          {/* target polygon */}
          <motion.polygon
            points={targetPoints}
            fill="none"
            stroke={colors.cyan}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.6}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          {/* current polygon */}
          <motion.polygon
            points={currentPoints}
            fill={`${colors.accent}33`}
            stroke={colors.accent}
            strokeWidth={2}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          {/* dots + labels */}
          {capabilities.map((c, i) => {
            const p = polarToXY(i, c.current);
            const lp = polarToXY(i, 118);
            return (
              <g key={c.axis}>
                <circle cx={p.x} cy={p.y} r={3} fill={colors.accent} />
                <text
                  x={lp.x}
                  y={lp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={colors.textDim}
                  fontSize={9}
                  fontWeight={600}
                >
                  {c.axis}
                </text>
                <text
                  x={lp.x}
                  y={lp.y + 11}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={colors.accent}
                  fontSize={8}
                  fontFamily="monospace"
                >
                  {c.current}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: colors.textDim }}>
          <span className="w-3 h-0.5 inline-block rounded" style={{ background: colors.accent }} />
          Current
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: colors.textDim }}>
          <span
            className="w-3 h-0.5 inline-block rounded"
            style={{
              background: colors.cyan,
              opacity: 0.6,
              borderTop: `1.5px dashed ${colors.cyan}`,
              height: 0,
            }}
          />
          Target
        </span>
      </div>
    </HoloCard>
  );
}

// ─── Kanban Board ───────────────────────────────────────────────────
function KanbanBoard() {
  const { proposals } = metaLearningData;
  const rejected = proposals.filter((p) => p.status === 'rejected');

  return (
    <HoloCard className="p-4 flex flex-col overflow-hidden">
      <span
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: colors.textDim }}
      >
        Self-Modification Proposals
      </span>
      <div className="flex gap-3 flex-1 min-h-0 overflow-auto">
        {statusColumns.map((status) => {
          const items = proposals.filter((p) => p.status === status);
          return (
            <div key={status} className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: statusColors[status] }}
                />
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: colors.text }}
                >
                  {statusLabels[status]}
                </span>
                <span
                  className="text-xs font-mono ml-auto"
                  style={{ color: colors.textDim }}
                >
                  {items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <AnimatePresence>
                  {items.map((p, idx) => (
                    <ProposalCard key={p.id} proposal={p} index={idx} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
      {/* Rejected section */}
      {rejected.length > 0 && (
        <div className="mt-3 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
          <span className="text-xs" style={{ color: colors.textDim }}>
            Rejected:{' '}
          </span>
          {rejected.map((p) => (
            <span
              key={p.id}
              className="text-xs line-through mr-3"
              style={{ color: colors.red, opacity: 0.6 }}
            >
              {p.title}
            </span>
          ))}
        </div>
      )}
    </HoloCard>
  );
}

function ProposalCard({
  proposal,
  index,
}: {
  proposal: ModificationProposal;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className="rounded-xl p-2.5 card-tilt"
      style={{ background: 'rgba(26,27,46,0.6)', backdropFilter: 'blur(8px)', border: `1px solid ${colors.border}` }}
    >
      <div className="text-xs font-semibold mb-1" style={{ color: colors.text }}>
        {proposal.title}
      </div>
      <div
        className="text-xs mb-2 leading-relaxed"
        style={{ color: colors.textDim }}
      >
        {proposal.description}
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
          style={{
            color: impactColors[proposal.impact],
            background: `${impactColors[proposal.impact]}18`,
          }}
        >
          {proposal.impact}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{
            color: colors.accent,
            background: `${colors.accent}15`,
          }}
        >
          {proposal.category}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Before / After Card ────────────────────────────────────────────
function BeforeAfterCard({
  metric,
  before,
  after,
  unit,
  index,
}: {
  metric: string;
  before: number;
  after: number;
  unit: string;
  index: number;
}) {
  const [showAfter, setShowAfter] = useState(false);

  // Calculate improvement
  const isLowerBetter = metric.toLowerCase().includes('error') || metric.toLowerCase().includes('time');
  const improvement = isLowerBetter
    ? ((before - after) / before) * 100
    : ((after - before) / before) * 100;
  const improved = improvement > 0;

  // Auto-trigger transition
  useMemo(() => {
    const timer = setTimeout(() => setShowAfter(true), 800 + index * 300);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <HoloCard className="flex-1 min-w-0 p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <div
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: colors.textDim }}
        >
          {metric}
        </div>

        <div className="relative h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!showAfter ? (
              <motion.span
                key="before"
                className="text-2xl font-mono font-bold"
                style={{ color: colors.textDim }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.7, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                {before}
                <span className="text-sm">{unit}</span>
              </motion.span>
            ) : (
              <motion.div
                key="after"
                className="flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
              >
                <span
                  className="text-sm font-mono line-through mb-0.5"
                  style={{ color: colors.textDim, opacity: 0.5 }}
                >
                  {before}
                  {unit}
                </span>
                <span
                  className="text-2xl font-mono font-bold"
                  style={{ color: improved ? colors.green : colors.red }}
                >
                  {after}
                  <span className="text-sm">{unit}</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showAfter && (
          <motion.span
            className="inline-block text-xs font-bold font-mono mt-2 px-2 py-0.5 rounded-full"
            style={{
              color: improved ? colors.green : colors.red,
              background: improved
                ? 'rgba(34,197,94,0.12)'
                : 'rgba(239,68,68,0.12)',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {improved ? '+' : ''}
            {improvement.toFixed(1)}%
          </motion.span>
        )}
      </motion.div>
    </HoloCard>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function MetaLearningCenter() {
  const { performanceMetrics, beforeAfter } = metaLearningData;

  return (
    <div
      className="h-full w-full flex flex-col gap-4 p-5 overflow-auto"
      style={{ background: colors.bg, color: colors.text }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div
        className="flex items-center gap-3 shrink-0"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1
          className="text-xl font-black tracking-[0.25em] uppercase"
          style={{
            textShadow: `
              0 0 6px ${colors.accent},
              2px 0 0 ${colors.cyan},
              -2px 0 0 ${colors.red},
              0 0 30px rgba(139,92,246,0.3)
            `,
            color: colors.text,
          }}
        >
          Meta-Learning Center
        </h1>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${colors.accent}44, transparent)` }} />
        <span
          className="text-xs font-mono px-2 py-1 rounded"
          style={{ color: colors.green, background: 'rgba(34,197,94,0.1)' }}
        >
          SELF-IMPROVING
        </span>
      </motion.div>

      {/* ── Performance Metrics Row ────────────────────────── */}
      <div className="flex gap-3 shrink-0">
        <MiniLineChart
          data={performanceMetrics.accuracy}
          label="Accuracy"
          color={colors.green}
          unit="%"
        />
        <MiniLineChart
          data={performanceMetrics.responseTime}
          label="Response Time"
          color={colors.cyan}
          unit="ms"
          invert
        />
        <MiniLineChart
          data={performanceMetrics.taskCompletion}
          label="Task Completion"
          color={colors.accent}
          unit="%"
        />
      </div>

      {/* ── Middle Row: Radar + Kanban ─────────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0">
        <div className="w-[320px] shrink-0">
          <RadarChart />
        </div>
        <div className="flex-1 min-w-0">
          <KanbanBoard />
        </div>
      </div>

      {/* ── Before / After Row ─────────────────────────────── */}
      <div className="flex gap-3 shrink-0">
        {beforeAfter.map((item, i) => (
          <BeforeAfterCard
            key={item.metric}
            metric={item.metric}
            before={item.before}
            after={item.after}
            unit={item.unit}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
