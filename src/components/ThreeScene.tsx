import { Suspense } from 'react'
import { OfficeWorld } from '../three/OfficeWorld'
import type { AgentState as Agent } from '../api/gateway'

import type { RoomId } from '../data/types'

interface ThreeSceneProps {
  onSelectAgent?: (agent: Agent | null) => void
  onRoomChange?: (roomId: RoomId) => void
  className?: string
}

function LoadingFallback() {
  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full gap-4"
      style={{ background: '#0a0a18', color: '#8b5cf6' }}
    >
      <div className="text-4xl animate-bounce">🐸</div>
      <div className="text-sm font-mono" style={{ color: '#06b6d4' }}>
        Initializing 3D Office...
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              background: '#8b5cf6',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function WebGLError() {
  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full gap-4 p-8"
      style={{ background: '#0a0a18', color: '#ef4444' }}
    >
      <div className="text-3xl">⚠️</div>
      <div className="text-sm font-mono text-center" style={{ color: '#94a3b8' }}>
        3D rendering requires a modern browser
      </div>
      <div className="text-xs font-mono" style={{ color: '#6b7280' }}>
        Please use Chrome, Firefox, or Safari
      </div>
    </div>
  )
}

export function ThreeScene({ onSelectAgent, onRoomChange, className }: ThreeSceneProps) {
  // WebGL support check
  const hasWebGL = (() => {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
    } catch {
      return false
    }
  })()

  if (!hasWebGL) return <WebGLError />

  return (
    <Suspense fallback={<LoadingFallback />}>
      <OfficeWorld onSelectAgent={onSelectAgent} onRoomChange={onRoomChange} className={className} />
    </Suspense>
  )
}
