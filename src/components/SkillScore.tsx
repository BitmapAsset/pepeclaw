import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockMicroLearnings } from '../data/mockData';

const scoreConfig: Record<number, { color: string; bg: string; label: string }> = {
  4: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', label: 'Excellent' },
  3: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Good' },
  2: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'Fair' },
  1: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Poor' },
};

interface ScorePopup {
  id: string;
  score: 1 | 2 | 3 | 4;
  skill: string;
  x: number;
  y: number;
}

export function SkillScore() {
  const [popups, setPopups] = useState<ScorePopup[]>([]);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      const learning = mockMicroLearnings[idx % mockMicroLearnings.length];
      const popup: ScorePopup = {
        id: `${learning.id}-${Date.now()}`,
        score: learning.score,
        skill: learning.skill,
        x: 20 + Math.random() * 60,
        y: 15 + Math.random() * 30,
      };
      setPopups(prev => [...prev.slice(-3), popup]);
      idx++;
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (popups.length === 0) return;
    const timer = setTimeout(() => {
      setPopups(prev => prev.slice(1));
    }, 2500);
    return () => clearTimeout(timer);
  }, [popups]);

  return (
    <div className="fixed inset-0 pointer-events-none z-35">
      <AnimatePresence>
        {popups.map(popup => {
          const config = scoreConfig[popup.score];
          return (
            <motion.div
              key={popup.id}
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.8 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                left: `${popup.x}%`,
                top: `${popup.y}%`,
                background: config.bg,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${config.color}30`,
                boxShadow: `0 0 20px ${config.color}20`,
              }}
            >
              <motion.span
                className="text-lg font-bold font-mono"
                style={{ color: config.color }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.3 }}
              >
                {popup.score}
              </motion.span>
              <div>
                <div className="text-[10px] font-mono font-semibold" style={{ color: config.color }}>
                  {config.label}
                </div>
                <div className="text-[9px] font-mono" style={{ color: '#64748b' }}>
                  {popup.skill}
                </div>
              </div>
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{ background: config.color, opacity: 0.15 }}
                animate={{ opacity: [0.15, 0, 0] }}
                transition={{ duration: 0.5 }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
