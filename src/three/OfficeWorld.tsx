import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Stars, Text } from '@react-three/drei'
import * as THREE from 'three'
import { AgentMesh } from './AgentMesh'
import { useAgents } from '../api/DataProvider'
import type { AgentState as Agent } from '../api/gateway'

// ─── Desk Component ──────────────────────────────────────────────────────────

function Desk({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Desk surface */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.06, 0.9]} />
        <meshStandardMaterial color="#1e1e3a" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Desk legs */}
      {([-0.8, 0.8] as number[]).map((x) =>
        ([-0.35, 0.35] as number[]).map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.37, z]} castShadow>
            <boxGeometry args={[0.06, 0.74, 0.06]} />
            <meshStandardMaterial color="#2a2a4a" metalness={0.6} roughness={0.3} />
          </mesh>
        ))
      )}
      {/* Monitor */}
      <mesh position={[0, 1.25, -0.3]} castShadow>
        <boxGeometry args={[1.0, 0.6, 0.05]} />
        <meshStandardMaterial color="#0f0f1e" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Monitor screen glow */}
      <mesh position={[0, 1.25, -0.27]}>
        <boxGeometry args={[0.9, 0.5, 0.01]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, 0.88, -0.3]} castShadow>
        <boxGeometry args={[0.1, 0.26, 0.1]} />
        <meshStandardMaterial color="#2a2a4a" metalness={0.6} />
      </mesh>
      {/* Keyboard */}
      <mesh position={[0, 0.79, 0.1]}>
        <boxGeometry args={[0.7, 0.02, 0.25]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
      </mesh>
      {/* Coffee mug */}
      <mesh position={[0.6, 0.82, 0]}>
        <cylinderGeometry args={[0.07, 0.06, 0.12, 16]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.3} />
      </mesh>
      {/* Desk lamp */}
      <mesh position={[-0.65, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshStandardMaterial color="#3a3a5a" metalness={0.7} />
      </mesh>
      <mesh position={[-0.65, 1.35, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[-0.65, 1.3, 0]} color="#fbbf24" intensity={0.5} distance={2} decay={2} />
    </group>
  )
}

// ─── Office Room ─────────────────────────────────────────────────────────────

function OfficeRoom() {
  const W = 18, D = 14, H = 4.5

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0d0d1a" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Floor grid overlay */}
      <Grid
        position={[0, 0.01, 0]}
        args={[W, D]}
        cellSize={1}
        cellThickness={0.3}
        cellColor="#1a1a3e"
        sectionSize={4}
        sectionThickness={0.6}
        sectionColor="#2a2a5a"
        fadeDistance={30}
        fadeStrength={1}
      />

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0a0a18" side={THREE.BackSide} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#0f0f24" roughness={0.9} />
      </mesh>

      {/* Front wall */}
      <mesh position={[0, H / 2, D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#0f0f24" roughness={0.9} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#0f0f24" roughness={0.9} />
      </mesh>

      {/* Right wall */}
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#0f0f24" roughness={0.9} />
      </mesh>

      {/* Neon trim lines — floor edge purple */}
      {[
        { pos: [0, 0.02, -D / 2 + 0.01] as [number, number, number], scale: [W, 0.04, 0.04] as [number, number, number] },
        { pos: [0, 0.02, D / 2 - 0.01] as [number, number, number], scale: [W, 0.04, 0.04] as [number, number, number] },
        { pos: [-W / 2 + 0.01, 0.02, 0] as [number, number, number], scale: [0.04, 0.04, D] as [number, number, number] },
        { pos: [W / 2 - 0.01, 0.02, 0] as [number, number, number], scale: [0.04, 0.04, D] as [number, number, number] },
      ].map((t, i) => (
        <mesh key={i} position={t.pos} scale={t.scale}>
          <boxGeometry />
          <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={3} />
        </mesh>
      ))}

      {/* Window panels on back wall (city view glow) */}
      {[-5, 0, 5].map((x) => (
        <group key={x} position={[x, H / 2, -D / 2 + 0.05]}>
          <mesh>
            <boxGeometry args={[2.5, 2.8, 0.05]} />
            <meshStandardMaterial
              color="#0a1628"
              emissive="#0a2040"
              emissiveIntensity={1}
              transparent
              opacity={0.9}
            />
          </mesh>
          {/* Window frame */}
          <mesh>
            <boxGeometry args={[2.6, 2.9, 0.04]} />
            <meshStandardMaterial color="#2a2a5a" wireframe />
          </mesh>
          {/* City light streaks */}
          {[-0.8, 0, 0.8].map((lx) => (
            <mesh key={lx} position={[lx, 0, 0.04]}>
              <planeGeometry args={[0.05, 2.5]} />
              <meshStandardMaterial
                color="#06b6d4"
                emissive="#06b6d4"
                emissiveIntensity={0.5}
                transparent
                opacity={0.4}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Ceiling lights */}
      {[[-4, 0], [0, 0], [4, 0], [-4, -3], [4, -3], [-4, 3], [4, 3]].map(([x, z], i) => (
        <group key={i} position={[x, H - 0.05, z]}>
          <mesh>
            <boxGeometry args={[0.8, 0.08, 0.8]} />
            <meshStandardMaterial color="#c0c0d0" emissive="#c0c0d0" emissiveIntensity={0.5} />
          </mesh>
          <pointLight color="#e8e8ff" intensity={1.2} distance={8} decay={2} />
        </group>
      ))}

      {/* PepeClaw sign on back wall */}
      <Text
        position={[-5.5, 3.5, -D / 2 + 0.1]}
        fontSize={0.5}
        color="#8b5cf6"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        outlineWidth={0.04}
        outlineColor="#06b6d4"
      >
        🐸 PEPECLAW
      </Text>
      <Text
        position={[-5.5, 3.0, -D / 2 + 0.1]}
        fontSize={0.2}
        color="#06b6d4"
        anchorX="center"
        anchorY="middle"
      >
        AI OPERATIONS CENTER
      </Text>
    </group>
  )
}

// ─── Desk Layout ─────────────────────────────────────────────────────────────

const DESK_POSITIONS: [number, number, number][] = [
  [-5, 0, -3],
  [-2, 0, -3],
  [1,  0, -3],
  [4,  0, -3],
  [-5, 0,  1],
  [-2, 0,  1],
  [1,  0,  1],
  [4,  0,  1],
]

// ─── Scene content (inside Canvas) ───────────────────────────────────────────

interface SceneProps {
  agents: Agent[]
  selectedAgentId: string | null
  onSelectAgent: (id: string | null) => void
}

function MovingAgents({ agents, selectedAgentId, onSelectAgent }: SceneProps) {
  const [agentDesks, setAgentDesks] = useState<Record<string, number>>({})
  const [movingAgents, setMovingAgents] = useState<Set<string>>(new Set())

  // Assign agents to desks on mount
  useEffect(() => {
    const assignments: Record<string, number> = {}
    agents.forEach((agent, i) => {
      assignments[agent.id] = i % DESK_POSITIONS.length
    })
    setAgentDesks(assignments)
  }, [agents.length])

  // Randomly move agents between desks
  useEffect(() => {
    if (agents.length < 2) return
    const interval = setInterval(() => {
      const agent = agents[Math.floor(Math.random() * agents.length)]
      if (movingAgents.has(agent.id)) return

      const currentDesk = agentDesks[agent.id] ?? 0
      let newDesk = Math.floor(Math.random() * DESK_POSITIONS.length)
      while (newDesk === currentDesk) newDesk = Math.floor(Math.random() * DESK_POSITIONS.length)

      setMovingAgents(prev => new Set([...prev, agent.id]))
      setAgentDesks(prev => ({ ...prev, [agent.id]: newDesk }))

      setTimeout(() => {
        setMovingAgents(prev => { const s = new Set(prev); s.delete(agent.id); return s })
      }, 4000)
    }, 12000 + Math.random() * 8000)

    return () => clearInterval(interval)
  }, [agents, agentDesks, movingAgents])

  return (
    <>
      {agents.slice(0, DESK_POSITIONS.length).map((agent) => {
        const deskIdx = agentDesks[agent.id] ?? 0
        const deskPos = DESK_POSITIONS[deskIdx] ?? DESK_POSITIONS[0]
        const agentPos: [number, number, number] = [deskPos[0], 0, deskPos[2] + 0.7]
        return (
          <AgentMesh
            key={agent.id}
            agent={agent}
            position={agentPos}
            isSelected={selectedAgentId === agent.id}
            isMoving={movingAgents.has(agent.id)}
            targetPosition={agentPos}
            onClick={() => onSelectAgent(agent.id === selectedAgentId ? null : agent.id)}
          />
        )
      })}
    </>
  )
}

function AmbientParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 120
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18
      pos[i * 3 + 1] = Math.random() * 4.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14
    }
    return pos
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#8b5cf6" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

// ─── Main Export ─────────────────────────────────────────────────────────────

interface OfficeWorldProps {
  onSelectAgent?: (agent: Agent | null) => void
  className?: string
}

export function OfficeWorld({ onSelectAgent, className }: OfficeWorldProps) {
  const agents = useAgents()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  const agentList = useMemo(() => {
    // Use real agents, pad with demo agents if empty
    if (agents && agents.length > 0) return agents
    return Array.from({ length: 4 }, (_, i) => ({
      id: `demo-${i}`,
      name: ['Pepe', 'Nova', 'Spark', 'Blaze'][i],
      status: ['working', 'idle', 'idle', 'working'][i] as 'working' | 'idle' | 'break',
      role: 'AI Agent',
      currentRoom: 'office',
      color: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][i],
    } as Agent))
  }, [agents])

  const handleSelectAgent = (id: string | null) => {
    setSelectedAgentId(id)
    if (onSelectAgent) {
      const agent = id ? agentList.find(a => a.id === id) ?? null : null
      onSelectAgent(agent)
    }
  }

  return (
    <Canvas
      className={className}
      camera={{ position: [0, 8, 12], fov: 55, near: 0.1, far: 200 }}
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ background: '#0a0a18' }}
      onPointerMissed={() => handleSelectAgent(null)}
    >
      {/* Lighting */}
      <ambientLight intensity={0.3} color="#1a1a4a" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        color="#e8e8ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <pointLight position={[-7, 3, 0]} color="#8b5cf6" intensity={1.5} distance={12} decay={2} />
      <pointLight position={[7, 3, 0]} color="#06b6d4" intensity={1.5} distance={12} decay={2} />

      {/* Stars background */}
      <Stars radius={60} depth={30} count={800} factor={3} saturation={0.5} fade speed={0.5} />

      {/* Office environment */}
      <OfficeRoom />

      {/* Desks */}
      {DESK_POSITIONS.map((pos, i) => (
        <Desk key={i} position={pos} rotation={0} />
      ))}

      {/* Agents */}
      <MovingAgents
        agents={agentList}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
      />

      {/* Ambient particles */}
      <AmbientParticles />

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={25}
        autoRotate={true}
        autoRotateSpeed={0.4}
        dampingFactor={0.05}
        enableDamping={true}
        target={[0, 1, 0]}
      />
    </Canvas>
  )
}
