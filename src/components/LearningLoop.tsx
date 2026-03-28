import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const phases = [
  { label: 'Observe', color: '#06b6d4', icon: '👁' },
  { label: 'Score', color: '#f59e0b', icon: '📊' },
  { label: 'Learn', color: '#22c55e', icon: '🧠' },
  { label: 'Evolve', color: '#8b5cf6', icon: '🧬' },
];

export function LearningLoop() {
  const [activePhase, setActivePhase] = useState(0);
  const [speed, setSpeed] = useState(2000);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhase(prev => (prev + 1) % phases.length);
    }, speed);
    return () => clearInterval(interval);
  }, [speed]);

  // Simulate speed bursts when "active learning"
  useEffect(() => {
    const burstInterval = setInterval(() => {
      setSpeed(800);
      setTimeout(() => setSpeed(2000), 6000);
    }, 15000);
    return () => clearInterval(burstInterval);
  }, []);

  const size = 80;
  const cx = size / 2;
  const cy = size / 2;
  const r = 28;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="fixed bottom-20 left-4 z-40 hidden sm:flex items-end gap-1"
    >
      <div
        className="rounded-xl p-1.5"
        style={{
          background: 'rgba(10,11,20,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="#1a1b2e" strokeWidth={1} />

          {/* Spinning arc */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={r + 6}
            fill="none"
            stroke={phases[activePhase].color}
            strokeWidth={2}
            strokeDasharray={`${(Math.PI * 2 * (r + 6)) / 4} ${(Math.PI * 2 * (r + 6)) * 3 / 4}`}
            strokeLinecap="round"
            opacity={0.6}
            animate={{ rotate: 360 }}
            transition={{
              duration: speed / 500,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />

          {/* Phase nodes */}
          {phases.map((phase, i) => {
            const angle = (i / phases.length) * Math.PI * 2 - Math.PI / 2;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            const isActive = i === activePhase;

            return (
              <g key={phase.label}>
                {/* Connection line to next */}
                <line
                  x1={px}
                  y1={py}
                  x2={cx + r * Math.cos(((i + 1) / phases.length) * Math.PI * 2 - Math.PI / 2)}
                  y2={cy + r * Math.sin(((i + 1) / phases.length) * Math.PI * 2 - Math.PI / 2)}
                  stroke={isActive ? phase.color : '#2a2b3d'}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  opacity={isActive ? 0.8 : 0.4}
                />
                {/* Node */}
                <motion.circle
                  cx={px}
                  cy={py}
                  r={isActive ? 8 : 5}
                  fill={isActive ? `${phase.color}30` : '#12131f'}
                  stroke={phase.color}
                  strokeWidth={isActive ? 2 : 1}
                  animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.6, repeat: isActive ? Infinity : 0 }}
                  style={{ transformOrigin: `${px}px ${py}px` }}
                />
                {/* Glow for active */}
                {isActive && (
                  <motion.circle
                    cx={px}
                    cy={py}
                    r={12}
                    fill="none"
                    stroke={phase.color}
                    strokeWidth={1}
                    initial={{ opacity: 0.4, scale: 1 }}
                    animate={{ opacity: [0.4, 0], scale: [1, 1.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ transformOrigin: `${px}px ${py}px` }}
                  />
                )}
                {/* Label */}
                <text
                  x={px}
                  y={py + (py > cy ? 16 : -12)}
                  textAnchor="middle"
                  fill={isActive ? phase.color : '#475569'}
                  fontSize={6}
                  fontFamily="monospace"
                  fontWeight={isActive ? 700 : 400}
                >
                  {phase.label}
                </text>
              </g>
            );
          })}

          {/* Center icon */}
          <text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
          >
            {phases[activePhase].icon}
          </text>
        </svg>

        {/* Speed indicator */}
        <div className="text-center">
          <span
            className="text-[7px] font-mono tracking-wider uppercase"
            style={{ color: speed < 1500 ? '#22c55e' : '#475569' }}
          >
            {speed < 1500 ? '⚡ ACTIVE' : 'IDLE'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
