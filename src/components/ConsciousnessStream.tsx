import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { ThoughtBubble } from '../data/types'
import { useData } from '../api/DataProvider'

/* ── Thought Bubble ─────────────────────────────────────────── */
function ThoughtBubbleDisplay({ thought, offset }: { thought: ThoughtBubble; offset: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  const time = useRef<number | null>(null)

  const typeColors: Record<string, string> = {
    reasoning: '#3b82f6',
    decision: '#22c55e',
    observation: '#f59e0b',
    question: '#a855f7',
  }

  useFrame((_, delta) => {
    if (time.current === null) time.current = Math.random() * 100
    time.current += delta
    if (ref.current) {
      ref.current.position.y = offset[1] + Math.sin(time.current * 1.5) * 0.1
      const mat = ref.current.children[0] as THREE.Mesh
      if (mat) {
        const m = mat.material as THREE.MeshBasicMaterial
        m.opacity = 0.6 + Math.sin(time.current * 2) * 0.2
      }
    }
  })

  return (
    <group ref={ref} position={offset}>
      <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: 'rgba(10,11,20,0.9)',
            border: `1px solid ${typeColors[thought.type] ?? '#666'}`,
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 9,
            fontFamily: 'monospace',
            color: '#d1d5db',
            whiteSpace: 'nowrap',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: `0 0 12px ${typeColors[thought.type] ?? '#666'}33`,
          }}
        >
          <span style={{ color: typeColors[thought.type], marginRight: 4, fontSize: 7 }}>
            {thought.type === 'reasoning' ? '⚙' : thought.type === 'decision' ? '✓' : thought.type === 'question' ? '?' : '◉'}
          </span>
          {thought.text}
        </div>
      </Html>
    </group>
  )
}

/* ── Neural Pathways ───────────────────────────────────────── */
function NeuralPathway({ from, to, color }: { from: THREE.Vector3; to: THREE.Vector3; color: string }) {
  const ref = useRef<THREE.Mesh>(null)
  const time = useRef<number | null>(null)

  const { midPoint, length, rotation } = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5)
    const dir = to.clone().sub(from)
    const len = dir.length()
    const quat = new THREE.Quaternion()
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    const rot = new THREE.Euler().setFromQuaternion(quat)
    return { midPoint: mid, length: len, rotation: rot }
  }, [from, to])

  useFrame((_, delta) => {
    if (time.current === null) time.current = Math.random() * 100
    time.current += delta
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial
      // Pulse glow to simulate "activation"
      mat.opacity = 0.1 + Math.sin(time.current * 4) * 0.15
    }
  })

  return (
    <mesh ref={ref} position={midPoint} rotation={rotation}>
      <cylinderGeometry args={[0.008, 0.008, length, 4]} />
      <meshBasicMaterial color={color} transparent opacity={0.2} />
    </mesh>
  )
}

/* ── Decision Tree ─────────────────────────────────────────── */
function DecisionTree({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  const branches = useMemo(() => {
    const b: { start: THREE.Vector3; end: THREE.Vector3; color: string; depth: number }[] = []
    const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b']

    function grow(start: THREE.Vector3, dir: THREE.Vector3, depth: number) {
      if (depth > 3) return
      const end = start.clone().add(dir)
      b.push({ start, end, color: colors[depth], depth })
      const leftDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.5).multiplyScalar(0.7)
      const rightDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), -0.5).multiplyScalar(0.7)
      grow(end, leftDir, depth + 1)
      grow(end, rightDir, depth + 1)
    }

    grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.6, 0), 0)
    return b
  }, [])

  useFrame((_, delta) => {
    time.current += delta
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time.current * 0.3) * 0.2
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {branches.map((branch, i) => {
        const mid = branch.start.clone().add(branch.end).multiplyScalar(0.5)
        const dir = branch.end.clone().sub(branch.start)
        const len = dir.length()
        const quat = new THREE.Quaternion()
        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
        const rot = new THREE.Euler().setFromQuaternion(quat)
        return (
          <mesh key={i} position={mid} rotation={rot}>
            <cylinderGeometry args={[0.015 / (branch.depth + 1), 0.02 / (branch.depth + 1), len, 4]} />
            <meshBasicMaterial color={branch.color} transparent opacity={0.5} />
          </mesh>
        )
      })}
      {/* Leaf nodes */}
      {branches.filter(b => b.depth === 3).map((b, i) => (
        <mesh key={`leaf-${i}`} position={b.end}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color={b.color} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/* ── Main Consciousness Stream ─────────────────────────────── */
export function ConsciousnessStream({ agentPositions }: { agentPositions: Map<string, [number, number, number]> }) {
  const { thoughts } = useData()
  const [activeThoughts, setActiveThoughts] = useState<ThoughtBubble[]>([])

  // Seed initial thoughts when data arrives
  useEffect(() => {
    if (thoughts.length > 0 && activeThoughts.length === 0) {
      setActiveThoughts(thoughts.slice(0, 3))
    }
  }, [thoughts, activeThoughts.length])

  // Rotate visible thoughts every 4 seconds
  useEffect(() => {
    if (thoughts.length === 0) return
    let idx = 3
    const interval = setInterval(() => {
      setActiveThoughts(prev => {
        const next = [...prev.slice(1)]
        next.push(thoughts[idx % thoughts.length])
        idx++
        return next
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [thoughts])

  // Neural pathway connections between agents
  const pathways = useMemo(() => {
    const positions = Array.from(agentPositions.values())
    const paths: { from: THREE.Vector3; to: THREE.Vector3; color: string }[] = []
    const colors = ['#8b5cf6', '#06b6d4', '#22c55e']
    for (let i = 0; i < positions.length - 1; i++) {
      const from = new THREE.Vector3(positions[i][0], positions[i][1] + 0.5, positions[i][2])
      const to = new THREE.Vector3(positions[i + 1][0], positions[i + 1][1] + 0.5, positions[i + 1][2])
      // Only connect agents in nearby rooms (within 20 units)
      if (from.distanceTo(to) < 20) {
        paths.push({ from, to, color: colors[i % colors.length] })
      }
    }
    return paths
  }, [agentPositions])

  return (
    <group>
      {/* Thought bubbles above agents */}
      {activeThoughts.map(thought => {
        const pos = agentPositions.get(thought.agentId)
        if (!pos) return null
        return (
          <ThoughtBubbleDisplay
            key={thought.id}
            thought={thought}
            offset={[pos[0], pos[1] + 1.3, pos[2]]}
          />
        )
      })}

      {/* Neural pathways between nearby agents */}
      {pathways.map((p, i) => (
        <NeuralPathway key={i} from={p.from} to={p.to} color={p.color} />
      ))}

      {/* Decision tree near the first agent */}
      {agentPositions.size > 0 && (
        <DecisionTree position={[
          Array.from(agentPositions.values())[0][0] + 1.5,
          Array.from(agentPositions.values())[0][1] + 0.5,
          Array.from(agentPositions.values())[0][2] - 1,
        ]} />
      )}
    </group>
  )
}
