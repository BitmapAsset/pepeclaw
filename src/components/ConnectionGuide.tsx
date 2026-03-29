import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STORAGE_KEY = 'pepeclaw-gateway-url'

type Step = 1 | 2 | 3 | 4

interface ConnectionGuideProps {
  onConnect: (url: string) => void
  onDemoMode: () => void
  connectionStatus: 'connected' | 'trying' | 'offline'
}

export function ConnectionGuide({ onConnect, onDemoMode, connectionStatus }: ConnectionGuideProps) {
  const [step, setStep] = useState<Step>(1)
  const [url, setUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || 'http://localhost:3000')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null)
  const [visible, setVisible] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-advance to success when connected externally
  useEffect(() => {
    if (connectionStatus === 'connected' && step !== 4) {
      setStep(4)
      setTestResult('success')
    }
  }, [connectionStatus, step])

  // Auto-dismiss after success animation
  useEffect(() => {
    if (step === 4) {
      const t = setTimeout(() => setVisible(false), 2200)
      return () => clearTimeout(t)
    }
  }, [step])

  const testConnection = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`${url.replace(/\/+$/, '')}/api/v1/agents`, {
        signal: AbortSignal.timeout(3000),
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const cleanUrl = url.replace(/\/+$/, '')
        localStorage.setItem(STORAGE_KEY, cleanUrl)
        setTestResult('success')
        setStep(4)
        onConnect(cleanUrl)
      } else {
        setTestResult('fail')
      }
    } catch {
      setTestResult('fail')
    } finally {
      setTesting(false)
    }
  }, [url, onConnect])

  const stepData = [
    { num: 1, title: 'Check OpenClaw' },
    { num: 2, title: 'Gateway URL' },
    { num: 3, title: 'Test Connection' },
    { num: 4, title: 'Connected' },
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(10,11,20,0.95) 0%, rgba(5,5,10,0.98) 100%)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}
        >
          {/* Ambient glow orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute w-96 h-96 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                top: '10%', left: '15%',
              }}
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-80 h-80 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
                bottom: '15%', right: '10%',
              }}
              animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-[calc(100vw-2rem)] max-w-lg rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(18,19,31,0.8)',
              backdropFilter: 'blur(40px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(40px) saturate(1.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 120px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Header */}
            <div className="px-6 sm:px-8 pt-8 pb-4">
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white mx-auto mb-5"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                  boxShadow: '0 0 40px rgba(139,92,246,0.35), 0 8px 24px rgba(0,0,0,0.4)',
                }}
                animate={{ rotate: [0, 1, -1, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                PC
              </motion.div>
              <h1
                className="text-center text-lg sm:text-xl font-bold tracking-wide mb-1"
                style={{ color: '#e2e8f0' }}
              >
                Connect to Your OpenClaw Gateway
              </h1>
              <p className="text-center text-[11px] font-mono" style={{ color: '#64748b' }}>
                PepeClaw needs a running gateway to visualize your AI agents
              </p>
            </div>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-1 px-8 mb-6">
              {stepData.map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <motion.div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold"
                    animate={{
                      background: step >= s.num
                        ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
                        : 'rgba(255,255,255,0.05)',
                      color: step >= s.num ? '#fff' : '#64748b',
                      boxShadow: step === s.num ? '0 0 16px rgba(139,92,246,0.4)' : '0 0 0 transparent',
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {step > s.num ? '✓' : s.num}
                  </motion.div>
                  {i < stepData.length - 1 && (
                    <div className="w-6 sm:w-10 h-px mx-1" style={{
                      background: step > s.num
                        ? 'linear-gradient(90deg, #8b5cf6, #06b6d4)'
                        : 'rgba(255,255,255,0.08)',
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* Step content */}
            <div className="px-6 sm:px-8 pb-6 min-h-[180px]">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <StepContent key="s1">
                    <StepTitle>Is OpenClaw running?</StepTitle>
                    <StepDescription>
                      Make sure your OpenClaw instance is started. Run this in your terminal:
                    </StepDescription>
                    <CodeBlock>openclaw status</CodeBlock>
                    <StepDescription>
                      If you don't have OpenClaw yet, check the docs to get started.
                      Or try Demo Mode to explore PepeClaw with sample data.
                    </StepDescription>
                    <div className="flex gap-3 mt-5">
                      <PrimaryButton onClick={() => setStep(2)}>
                        It's Running
                      </PrimaryButton>
                      <GhostButton onClick={onDemoMode}>
                        Demo Mode
                      </GhostButton>
                    </div>
                  </StepContent>
                )}

                {step === 2 && (
                  <StepContent key="s2">
                    <StepTitle>Enter Gateway URL</StepTitle>
                    <StepDescription>
                      Where is your OpenClaw gateway running? The default is usually fine.
                    </StepDescription>
                    <div className="mt-4 mb-5">
                      <input
                        ref={inputRef}
                        type="url"
                        value={url}
                        onChange={e => { setUrl(e.target.value); setTestResult(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') setStep(3) }}
                        placeholder="http://localhost:3000"
                        className="w-full px-4 py-3 rounded-xl text-[13px] font-mono border-0 outline-none"
                        style={{
                          background: 'rgba(10,11,20,0.8)',
                          color: '#e2e8f0',
                          border: '1px solid rgba(139,92,246,0.2)',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.2)'}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3">
                      <GhostButton onClick={() => setStep(1)}>Back</GhostButton>
                      <PrimaryButton onClick={() => setStep(3)} disabled={!url.trim()}>
                        Next
                      </PrimaryButton>
                    </div>
                  </StepContent>
                )}

                {step === 3 && (
                  <StepContent key="s3">
                    <StepTitle>Test Connection</StepTitle>
                    <StepDescription>
                      Connecting to <span className="font-mono" style={{ color: '#8b5cf6' }}>{url}</span>
                    </StepDescription>
                    <div className="mt-4 mb-5 flex flex-col items-center gap-3">
                      {testing && (
                        <motion.div
                          className="flex items-center gap-3"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <motion.div
                            className="w-5 h-5 rounded-full border-2"
                            style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          />
                          <span className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>
                            Testing connection...
                          </span>
                        </motion.div>
                      )}
                      {testResult === 'fail' && !testing && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="w-full px-4 py-3 rounded-xl text-[11px] font-mono"
                          style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171',
                          }}
                        >
                          Could not reach gateway. Check the URL and that OpenClaw is running.
                        </motion.div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <GhostButton onClick={() => setStep(2)}>Back</GhostButton>
                      <PrimaryButton onClick={testConnection} disabled={testing}>
                        {testing ? 'Testing...' : testResult === 'fail' ? 'Retry' : 'Test Connection'}
                      </PrimaryButton>
                    </div>
                  </StepContent>
                )}

                {step === 4 && (
                  <StepContent key="s4">
                    <div className="flex flex-col items-center py-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                        style={{
                          background: 'linear-gradient(135deg, #22c55e, #10b981)',
                          boxShadow: '0 0 40px rgba(34,197,94,0.3), 0 0 80px rgba(34,197,94,0.1)',
                        }}
                      >
                        <motion.svg
                          width="32" height="32" viewBox="0 0 24 24" fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ delay: 0.2, duration: 0.4 }}
                        >
                          <motion.path
                            d="M5 13l4 4L19 7"
                            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                          />
                        </motion.svg>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <h3 className="text-center text-lg font-bold mb-1" style={{ color: '#22c55e' }}>
                          Connected
                        </h3>
                        <p className="text-center text-[11px] font-mono" style={{ color: '#64748b' }}>
                          Loading your agents...
                        </p>
                      </motion.div>
                    </div>
                  </StepContent>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom accent line */}
            <div className="h-px w-full" style={{
              background: 'linear-gradient(90deg, transparent 5%, #8b5cf630 30%, #06b6d440 50%, #8b5cf630 70%, transparent 95%)',
            }} />
          </motion.div>

          {/* Version tag */}
          <div className="absolute bottom-4 text-[10px] font-mono" style={{ color: '#2a2b3d' }}>
            PepeClaw v0.3.0
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Sub-components ─────────────────────────────────────── */

function StepContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  )
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold tracking-wide mb-2" style={{ color: '#e2e8f0' }}>
      {children}
    </h2>
  )
}

function StepDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] leading-relaxed" style={{ color: '#94a3b8' }}>
      {children}
    </p>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 mb-3 px-4 py-3 rounded-xl text-[12px] font-mono"
      style={{
        background: 'rgba(10,11,20,0.9)',
        border: '1px solid rgba(255,255,255,0.06)',
        color: '#22c55e',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
      }}
    >
      <span style={{ color: '#64748b' }}>$ </span>{children}
    </div>
  )
}

function PrimaryButton({ onClick, disabled, children }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="flex-1 px-5 py-2.5 rounded-xl text-[12px] font-mono font-semibold tracking-wide cursor-pointer border-0"
      style={{
        background: disabled ? 'rgba(139,92,246,0.1)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        color: disabled ? '#64748b' : '#fff',
        boxShadow: disabled ? 'none' : '0 0 20px rgba(139,92,246,0.25), 0 4px 12px rgba(0,0,0,0.3)',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.2s',
      }}
    >
      {children}
    </motion.button>
  )
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, background: 'rgba(255,255,255,0.08)' }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="px-5 py-2.5 rounded-xl text-[12px] font-mono tracking-wide cursor-pointer border-0"
      style={{
        background: 'rgba(255,255,255,0.04)',
        color: '#94a3b8',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </motion.button>
  )
}
