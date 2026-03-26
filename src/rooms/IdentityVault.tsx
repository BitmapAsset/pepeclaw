import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentIdentity {
  id: string;
  name: string;
  generation: number;
  dnaHash: string;
  bitcoinTx: string | null;
  mintedAt: string | null;
  skills: string[];
  fitness: number;
  status: 'unminted' | 'pending' | 'verified';
}

const mockIdentities: AgentIdentity[] = [
  {
    id: 'agent-001',
    name: 'PepeClaw Alpha',
    generation: 47,
    dnaHash: 'bc1q...7f3a8d',
    bitcoinTx: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
    mintedAt: '2026-03-20T14:32:00Z',
    skills: ['Code Generation', 'Architecture', 'Refactoring'],
    fitness: 92,
    status: 'verified',
  },
  {
    id: 'agent-002',
    name: 'PepeClaw Beta',
    generation: 31,
    dnaHash: 'bc1q...2e9b1c',
    bitcoinTx: null,
    mintedAt: null,
    skills: ['Bug Detection', 'Testing', 'Security Audit'],
    fitness: 78,
    status: 'pending',
  },
  {
    id: 'agent-003',
    name: 'PepeClaw Gamma',
    generation: 22,
    dnaHash: 'bc1q...5d4e8f',
    bitcoinTx: null,
    mintedAt: null,
    skills: ['Documentation', 'Planning', 'Communication'],
    fitness: 73,
    status: 'unminted',
  },
];

export default function IdentityVault() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>('agent-001');
  const [mintingId, setMintingId] = useState<string | null>(null);

  const handleMint = (id: string) => {
    setMintingId(id);
    setTimeout(() => setMintingId(null), 3000);
  };

  const selected = mockIdentities.find(a => a.id === selectedAgent);

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <span className="text-2xl">&#x1f512;</span>
            Identity Vault
          </h2>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>
            Bitcoin-verified agent DNA &middot; Powered by Block Genomics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 border"
            style={{
              background: 'rgba(249,115,22,0.1)',
              borderColor: 'rgba(249,115,22,0.3)',
              color: '#f97316',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            Block Genomics API
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Agent list */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto pr-2">
          {mockIdentities.map((agent) => (
            <motion.button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="text-left p-4 rounded-xl border transition-all cursor-pointer"
              style={{
                background: selectedAgent === agent.id
                  ? 'rgba(249,115,22,0.08)'
                  : 'rgba(18,19,31,0.6)',
                borderColor: selectedAgent === agent.id
                  ? 'rgba(249,115,22,0.4)'
                  : 'rgba(42,43,61,0.6)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{agent.name}</span>
                <StatusBadge status={agent.status} />
              </div>
              <div className="text-xs font-mono" style={{ color: '#64748b' }}>
                Gen {agent.generation} &middot; Fitness {agent.fitness}%
              </div>
              <div className="text-[10px] font-mono mt-1 truncate" style={{ color: '#4a5568' }}>
                {agent.dnaHash}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                {/* DNA Visualization */}
                <div
                  className="rounded-xl border p-6 mb-4"
                  style={{
                    background: 'rgba(18,19,31,0.8)',
                    borderColor: 'rgba(42,43,61,0.6)',
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{selected.name}</h3>
                      <p className="text-xs font-mono mt-1" style={{ color: '#64748b' }}>
                        Generation {selected.generation} &middot; ID: {selected.id}
                      </p>
                    </div>
                    {selected.status === 'unminted' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMint(selected.id)}
                        disabled={mintingId === selected.id}
                        className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border-0"
                        style={{
                          background: mintingId === selected.id
                            ? 'rgba(249,115,22,0.3)'
                            : 'linear-gradient(135deg, #f97316, #ea580c)',
                          color: 'white',
                          boxShadow: '0 0 20px rgba(249,115,22,0.3)',
                        }}
                      >
                        {mintingId === selected.id ? 'Minting...' : 'Mint Identity'}
                      </motion.button>
                    )}
                  </div>

                  {/* DNA Hash display */}
                  <div
                    className="rounded-lg p-4 mb-4 font-mono text-xs"
                    style={{
                      background: 'rgba(10,11,20,0.6)',
                      border: '1px solid rgba(249,115,22,0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: '#f97316' }}>DNA HASH</span>
                    </div>
                    <div className="text-white break-all">{selected.dnaHash}</div>
                    {selected.bitcoinTx && (
                      <>
                        <div className="flex items-center gap-2 mt-3 mb-2">
                          <span style={{ color: '#f59e0b' }}>BITCOIN TX</span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px]"
                            style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                          >
                            CONFIRMED
                          </span>
                        </div>
                        <div className="text-white break-all">{selected.bitcoinTx}</div>
                      </>
                    )}
                  </div>

                  {/* Fitness gauge */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: '#64748b' }}>Agent Fitness</span>
                      <span className="text-sm font-mono text-white">{selected.fitness}%</span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'rgba(42,43,61,0.6)' }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selected.fitness}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, #f97316, ${selected.fitness > 80 ? '#22c55e' : selected.fitness > 60 ? '#f59e0b' : '#ef4444'})`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <span className="text-xs mb-2 block" style={{ color: '#64748b' }}>Encoded Skills</span>
                    <div className="flex flex-wrap gap-2">
                      {selected.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-1 rounded-md text-xs font-mono"
                          style={{
                            background: 'rgba(249,115,22,0.1)',
                            color: '#f97316',
                            border: '1px solid rgba(249,115,22,0.2)',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Block Genomics integration info */}
                <div
                  className="rounded-xl border p-4 flex items-center gap-4"
                  style={{
                    background: 'rgba(18,19,31,0.6)',
                    borderColor: 'rgba(42,43,61,0.4)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #f59e0b)',
                      boxShadow: '0 0 15px rgba(249,115,22,0.3)',
                    }}
                  >
                    &#x26d3;
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">Block Genomics Integration</div>
                    <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                      Verify agent DNA on-chain &middot; Immutable identity anchored to Bitcoin
                    </div>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-lg text-xs font-mono"
                    style={{
                      background: 'rgba(249,115,22,0.1)',
                      color: '#f97316',
                      border: '1px solid rgba(249,115,22,0.2)',
                    }}
                  >
                    Placeholder
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AgentIdentity['status'] }) {
  const config = {
    verified: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Verified' },
    pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Pending' },
    unminted: { bg: 'rgba(100,116,139,0.15)', color: '#64748b', label: 'Unminted' },
  }[status];

  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-mono uppercase"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
