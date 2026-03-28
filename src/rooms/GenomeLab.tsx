import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Float, Html } from '@react-three/drei'
import * as THREE from 'three'
import { skills, mockMutations } from '../data/mockData'

/* ── DNA Helix ──────────────────────────────────────────────── */
function DNAHelix() {
  const groupRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const time = useRef(0)

  const helixPoints = useMemo(() => {
    const points: number[] = []
    const colors: number[] = []
    for (let i = 0; i < 200; i++) {
      const t = (i / 200) * Math.PI * 6
      const y = (i / 200) * 8 - 4
      points.push(Math.cos(t) * 1.2, y, Math.sin(t) * 1.2)
      colors.push(0, 1, 0.53)
      points.push(Math.cos(t + Math.PI) * 1.2, y, Math.sin(t + Math.PI) * 1.2)
      colors.push(0.23, 0.51, 0.96)
    }
    return { positions: new Float32Array(points), colors: new Float32Array(colors) }
  }, [])

  const mutationParticles = useMemo(() => {
    const count = 60
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4
      col[i * 3] = 1
      col[i * 3 + 1] = 0.4 + Math.random() * 0.4
      col[i * 3 + 2] = 0
    }
    return { positions: pos, colors: col }
  }, [])

  useFrame((_, delta) => {
    time.current += delta
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3
    }
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += delta * (0.5 + Math.random() * 0.5)
        if (positions[i * 3 + 1] > 5) positions[i * 3 + 1] = -5
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <group position={[0, 0, 0]}>
      <group ref={groupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[helixPoints.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[helixPoints.colors, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.2} vertexColors transparent opacity={1.0} sizeAttenuation />
        </points>
        {Array.from({ length: 20 }).map((_, i) => {
          const t = (i / 20) * Math.PI * 6
          const y = (i / 20) * 8 - 4
          return (
            <mesh key={i} position={[0, y, 0]} rotation={[0, t, 0]}>
              <boxGeometry args={[2.4, 0.04, 0.04]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#00ff88' : '#3b82f6'}
                emissive={i % 2 === 0 ? '#00ff88' : '#3b82f6'}
                emissiveIntensity={1.2}
                transparent
                opacity={0.8}
              />
            </mesh>
          )
        })}
      </group>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[mutationParticles.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[mutationParticles.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.1} vertexColors transparent opacity={0.85} sizeAttenuation />
      </points>
    </group>
  )
}

/* ── Skill Gene Editor (CRISPR) ─────────────────────────────── */
function GeneSegment({ skill, index, total }: { skill: typeof skills[0]; index: number; total: number }) {
  const ref = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const time = useRef(Math.random() * 100)

  const angle = (index / total) * Math.PI * 2
  const y = (index / total) * 6 - 3

  useFrame((_, delta) => {
    time.current += delta
    if (ref.current) {
      // Gentle orbit
      ref.current.position.x = Math.cos(angle + time.current * 0.2) * 1.8
      ref.current.position.z = Math.sin(angle + time.current * 0.2) * 1.8
    }
  })

  return (
    <group ref={ref} position={[Math.cos(angle) * 1.8, y, Math.sin(angle) * 1.8]}>
      {/* Gene segment — capsule */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <capsuleGeometry args={[0.08, 0.3, 4, 8]} />
        <meshStandardMaterial
          color={skill.color}
          emissive={skill.color}
          emissiveIntensity={hovered ? 1.2 : 0.4}
          transparent
          opacity={hovered ? 1 : 0.8}
        />
      </mesh>

      {/* Hover tooltip */}
      {hovered && (
        <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(10,11,20,0.95)',
            border: `1px solid ${skill.color}`,
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 9,
            fontFamily: 'monospace',
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            boxShadow: `0 0 12px ${skill.color}44`,
          }}>
            <div style={{ color: skill.color, fontWeight: 'bold', marginBottom: 2 }}>{skill.name}</div>
            <div>Fitness: {skill.fitness}%</div>
            <div>Gen: {skill.generation} | {skill.status}</div>
            <div style={{ color: '#64748b', fontSize: 8, marginTop: 2 }}>Click to edit gene</div>
          </div>
        </Html>
      )}

      {/* Connection line to center helix */}
      <mesh position={[-(Math.cos(angle) * 0.9), 0, -(Math.sin(angle) * 0.9)]} rotation={[0, angle + Math.PI / 2, 0]}>
        <boxGeometry args={[0.01, 0.01, 1.6]} />
        <meshBasicMaterial color={skill.color} transparent opacity={0.2} />
      </mesh>
    </group>
  )
}

function GeneEditor() {
  return (
    <group position={[5.5, 0, -1]}>
      <Text position={[0, 3.5, 0]} fontSize={0.2} color="#00ff88" anchorX="center" font={undefined}>
        CRISPR EDITOR
      </Text>
      <Text position={[0, 3.1, 0]} fontSize={0.1} color="#555" anchorX="center" font={undefined}>
        Hover genes to inspect | Click to edit
      </Text>
      {skills.map((skill, i) => (
        <GeneSegment key={skill.name} skill={skill} index={i} total={skills.length} />
      ))}
    </group>
  )
}

/* ── Ego Death / Rebirth Sequence ───────────────────────────── */
function EgoDeathEffect() {
  const particlesRef = useRef<THREE.Points>(null)
  const shockwaveRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const phase = useRef<'dissolving' | 'reforming'>('dissolving')

  const positions = useMemo(() => {
    const count = 150
    const pos = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Start as a humanoid shape cluster
      pos[i * 3] = (Math.random() - 0.5) * 0.5
      pos[i * 3 + 1] = Math.random() * 1.5 - 0.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5
      const c = new THREE.Color().setHSL(0.35, 1, 0.5 + Math.random() * 0.3)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    return { pos, colors }
  }, [])

  useFrame((_, delta) => {
    time.current += delta
    const cycle = time.current % 8 // 8-second cycle

    if (cycle < 4) {
      phase.current = 'dissolving'
    } else {
      phase.current = 'reforming'
    }

    if (particlesRef.current) {
      const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array
      const colArray = particlesRef.current.geometry.attributes.color.array as Float32Array
      for (let i = 0; i < posArray.length / 3; i++) {
        if (phase.current === 'dissolving') {
          // Expand outward
          const dx = posArray[i * 3]
          const dz = posArray[i * 3 + 2]
          const dist = Math.sqrt(dx * dx + dz * dz) + 0.01
          posArray[i * 3] += (dx / dist) * delta * 0.5
          posArray[i * 3 + 1] += (Math.random() - 0.4) * delta * 0.8
          posArray[i * 3 + 2] += (dz / dist) * delta * 0.5
          // Shift color towards red
          colArray[i * 3] = Math.min(1, colArray[i * 3] + delta * 0.1)
          colArray[i * 3 + 1] = Math.max(0, colArray[i * 3 + 1] - delta * 0.15)
        } else {
          // Contract back to center with new colors
          posArray[i * 3] *= 1 - delta * 0.4
          posArray[i * 3 + 1] *= 1 - delta * 0.4
          posArray[i * 3 + 2] *= 1 - delta * 0.4
          // Shift to new color (cyan)
          colArray[i * 3] = Math.max(0, colArray[i * 3] - delta * 0.2)
          colArray[i * 3 + 1] = Math.min(1, colArray[i * 3 + 1] + delta * 0.15)
          colArray[i * 3 + 2] = Math.min(1, colArray[i * 3 + 2] + delta * 0.1)
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
      particlesRef.current.geometry.attributes.color.needsUpdate = true
    }

    // Shockwave at phase transition
    if (shockwaveRef.current) {
      const shockProgress = cycle < 0.5 || (cycle > 4 && cycle < 4.5)
        ? (cycle % 4) / 0.5
        : 0
      shockwaveRef.current.scale.setScalar(1 + shockProgress * 3)
      const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.3 - shockProgress * 0.3)
    }
  })

  return (
    <group position={[-5.5, 0, -1]}>
      <Text position={[0, 3.5, 0]} fontSize={0.2} color="#ef4444" anchorX="center" font={undefined}>
        EGO DEATH
      </Text>
      <Text position={[0, 3.1, 0]} fontSize={0.1} color="#555" anchorX="center" font={undefined}>
        Dissolution & Rebirth Cycle
      </Text>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[positions.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.06} vertexColors transparent opacity={0.8} sizeAttenuation depthWrite={false} />
      </points>

      {/* Shockwave ring */}
      <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.02, 8, 32]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.2} depthWrite={false} />
      </mesh>

      {/* Before/after stats */}
      <Html position={[0, -2, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(10,11,20,0.9)',
          border: '1px solid #333',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 8,
          fontFamily: 'monospace',
          color: '#94a3b8',
          display: 'flex',
          gap: 12,
        }}>
          <div>
            <div style={{ color: '#ef4444', marginBottom: 2 }}>Before</div>
            <div>Fitness: 67%</div>
            <div>Gen: 31</div>
          </div>
          <div style={{ borderLeft: '1px solid #333', paddingLeft: 12 }}>
            <div style={{ color: '#22c55e', marginBottom: 2 }}>After</div>
            <div>Fitness: 89%</div>
            <div>Gen: 32</div>
          </div>
        </div>
      </Html>

      <pointLight position={[0, 1, 1]} color="#ef4444" intensity={0.8} distance={5} />
    </group>
  )
}

/* ── Skill Card ─────────────────────────────────────────────── */
function SkillCard({ skill, index }: { skill: typeof skills[0]; index: number }) {
  const angle = (index / skills.length) * Math.PI * 2
  const radius = 3.5
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <group position={[x, -1.5 + (index % 2) * 0.5, z]}>
        <mesh>
          <planeGeometry args={[1.6, 1.0]} />
          <meshStandardMaterial color="#1a1a2e" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.25, 0.01]}>
          <planeGeometry args={[1.3, 0.12]} />
          <meshBasicMaterial color="#2a2a3e" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-(1.3 * (1 - skill.fitness / 100)) / 2, -0.25, 0.02]}>
          <planeGeometry args={[1.3 * (skill.fitness / 100), 0.12]} />
          <meshBasicMaterial color={skill.color} side={THREE.DoubleSide} />
        </mesh>
        <Text position={[0, 0.15, 0.01]} fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle" font={undefined}>
          {skill.name}
        </Text>
        <Text position={[0.55, 0.15, 0.01]} fontSize={0.1} color={skill.color} anchorX="right" anchorY="middle" font={undefined}>
          {skill.fitness}%
        </Text>
        <Text position={[0, -0.05, 0.01]} fontSize={0.08} color="#888" anchorX="center" anchorY="middle" font={undefined}>
          Gen {skill.generation} · {skill.status}
        </Text>
        {skill.status === 'mutating' && (
          <mesh>
            <planeGeometry args={[1.7, 1.1]} />
            <meshBasicMaterial color={skill.color} transparent opacity={0.15} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    </Float>
  )
}

/* ── Evolution Timeline ──────────────────────────────────────── */
function EvolutionTimeline() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const groupRef = useRef<THREE.Group>(null)
  const time = useRef(0)

  useFrame((_, delta) => {
    time.current += delta
    if (groupRef.current) {
      // Gentle scroll animation
      groupRef.current.position.x = Math.sin(time.current * 0.1) * 0.3
    }
  })

  const sortedMutations = useMemo(() =>
    [...mockMutations].sort((a, b) => a.timestamp - b.timestamp),
  [])

  return (
    <group position={[0, -4.5, 0]} ref={groupRef}>
      <Text position={[0, 1.2, 0]} fontSize={0.15} color="#00ff88" anchorX="center" font={undefined}>
        EVOLUTION TIMELINE
      </Text>

      {/* Timeline base line */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[14, 0.02, 0.02]} />
        <meshBasicMaterial color="#2a2b3d" transparent opacity={0.6} />
      </mesh>

      {sortedMutations.map((mut, i) => {
        const x = (i / (sortedMutations.length - 1)) * 12 - 6
        const isImproved = mut.newFitness > mut.oldFitness
        const isRegression = mut.newFitness < mut.oldFitness
        const nodeColor = isImproved ? '#22c55e' : isRegression ? '#ef4444' : '#f59e0b'
        const isHovered = hoveredId === mut.id

        return (
          <group key={mut.id} position={[x, 0.5, 0]}>
            {/* Connection line to next */}
            {i < sortedMutations.length - 1 && (
              <mesh position={[(12 / (sortedMutations.length - 1)) / 2, 0, 0]}>
                <boxGeometry args={[12 / (sortedMutations.length - 1), 0.015, 0.015]} />
                <meshBasicMaterial
                  color={isImproved ? '#22c55e' : isRegression ? '#ef4444' : '#f59e0b'}
                  transparent
                  opacity={0.4}
                />
              </mesh>
            )}

            {/* Mutation node */}
            <mesh
              onPointerOver={() => setHoveredId(mut.id)}
              onPointerOut={() => setHoveredId(null)}
            >
              <sphereGeometry args={[isHovered ? 0.15 : 0.1, 16, 16]} />
              <meshStandardMaterial
                color={nodeColor}
                emissive={nodeColor}
                emissiveIntensity={isHovered ? 1.2 : 0.5}
                transparent
                opacity={isHovered ? 1 : 0.8}
              />
            </mesh>

            {/* Fitness change indicator */}
            <Text
              position={[0, -0.25, 0]}
              fontSize={0.07}
              color={nodeColor}
              anchorX="center"
              font={undefined}
            >
              {mut.oldFitness}→{mut.newFitness}
            </Text>

            {/* Hover tooltip */}
            {isHovered && (
              <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                <div style={{
                  background: 'rgba(10,11,20,0.95)',
                  border: `1px solid ${mut.color}`,
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 9,
                  fontFamily: 'monospace',
                  color: '#e2e8f0',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 0 12px ${mut.color}44`,
                  minWidth: 140,
                }}>
                  <div style={{ color: mut.color, fontWeight: 'bold', marginBottom: 2 }}>{mut.skill}</div>
                  <div>Gen {mut.generation}: {mut.oldFitness}% → {mut.newFitness}%</div>
                  <div style={{ color: '#94a3b8', marginTop: 2, fontSize: 8 }}>{mut.change}</div>
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}

/* ── Main Export ─────────────────────────────────────────────── */
export function GenomeLab() {
  return (
    <group>
      <Text position={[0, 4.5, 0]} fontSize={0.5} color="#00ff88" anchorX="center" font={undefined}>
        GENOME LAB
      </Text>
      <Text position={[0, 4.0, 0]} fontSize={0.18} color="#666" anchorX="center" font={undefined}>
        Skill Evolution & Mutation Engine
      </Text>

      <DNAHelix />

      {skills.map((skill, i) => (
        <SkillCard key={skill.name} skill={skill} index={i} />
      ))}

      {/* Gene Editor — CRISPR for AI */}
      <GeneEditor />

      {/* Ego Death / Rebirth Sequence */}
      <EgoDeathEffect />

      {/* Evolution Timeline */}
      <EvolutionTimeline />

      {/* Room ambient glow */}
      <pointLight position={[0, 3, 0]} color="#00ff88" intensity={3} distance={18} />
      <pointLight position={[0, -3, 0]} color="#3b82f6" intensity={2.5} distance={15} />
    </group>
  )
}
