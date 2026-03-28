import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Float } from '@react-three/drei'
import * as THREE from 'three'

/* ── DNA Strand for a parent agent ────────────────────────────── */
function ParentDNA({ position, color, direction }: { position: [number, number, number]; color: string; direction: 1 | -1 }) {
  const groupRef = useRef<THREE.Group>(null)

  const helixPoints = useMemo(() => {
    const points: number[] = []
    for (let i = 0; i < 80; i++) {
      const t = (i / 80) * Math.PI * 4
      const y = (i / 80) * 4 - 2
      points.push(Math.cos(t) * 0.5 * direction, y, Math.sin(t) * 0.5)
      points.push(Math.cos(t + Math.PI) * 0.5 * direction, y, Math.sin(t + Math.PI) * 0.5)
    }
    return new Float32Array(points)
  }, [direction])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[helixPoints, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.15} color={color} transparent opacity={1.0} sizeAttenuation />
      </points>
      {/* Rungs */}
      {Array.from({ length: 8 }).map((_, i) => {
        const t = (i / 8) * Math.PI * 4
        const y = (i / 8) * 4 - 2
        return (
          <mesh key={i} position={[0, y, 0]} rotation={[0, t, 0]}>
            <boxGeometry args={[1, 0.03, 0.03]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} transparent opacity={0.8} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ── Arena Platform ──────────────────────────────────────────── */
function ArenaPlatform() {
  const ref = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  useFrame((_, delta) => {
    time.current += delta
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.3 + Math.sin(time.current * 2) * 0.15
    }
  })

  return (
    <group>
      {/* Circular platform */}
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <ringGeometry args={[1, 5, 32]} />
        <meshStandardMaterial color="#1a1030" emissive="#ec4899" emissiveIntensity={0.3} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Arena ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.95, 0]}>
        <torusGeometry args={[5, 0.06, 8, 48]} />
        <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.8} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

/* ── Intertwining Particles (breeding effect) ────────────────── */
function BreedingParticles() {
  const ref = useRef<THREE.Points>(null)
  const time = useRef(0)

  const positions = useMemo(() => {
    const count = 100
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 6
      const y = (i / count) * 6 - 3
      const r = 0.3 + Math.sin(t * 2) * 0.2
      pos[i * 3] = Math.cos(t) * r
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = Math.sin(t) * r
    }
    return pos
  }, [])

  useFrame((_, delta) => {
    time.current += delta
    if (ref.current) {
      ref.current.rotation.y += delta * 0.8
      const posArray = ref.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < posArray.length / 3; i++) {
        posArray[i * 3 + 1] += delta * 0.3
        if (posArray[i * 3 + 1] > 3) posArray[i * 3 + 1] = -3
      }
      ref.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#ec4899" transparent opacity={0.9} sizeAttenuation />
    </points>
  )
}

/* ── Child Agent Silhouette ──────────────────────────────────── */
function ChildAgent() {
  const ref = useRef<THREE.Group>(null)
  const time = useRef(0)

  useFrame((_, delta) => {
    time.current += delta
    if (ref.current) {
      ref.current.position.y = -1 + Math.sin(time.current * 1.5) * 0.1
      ref.current.scale.setScalar(0.6 + Math.sin(time.current * 0.8) * 0.05)
    }
  })

  return (
    <Float speed={2} floatIntensity={0.2}>
      <group ref={ref} position={[0, -1, 0]}>
        {/* Body */}
        <mesh>
          <cylinderGeometry args={[0.1, 0.12, 0.35, 8]} />
          <meshStandardMaterial color="#f472b6" emissive="#ec4899" emissiveIntensity={0.5} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#f472b6" emissive="#ec4899" emissiveIntensity={0.5} />
        </mesh>
        {/* Birth glow */}
        <mesh>
          <sphereGeometry args={[0.4, 12, 12]} />
          <meshBasicMaterial color="#ec4899" transparent opacity={0.08} depthWrite={false} />
        </mesh>
        <pointLight color="#ec4899" intensity={0.5} distance={3} />
      </group>
    </Float>
  )
}

/* ── Main Export ──────────────────────────────────────────────── */
export function BreedingArena3D() {
  return (
    <group>
      <Text position={[0, 4.5, 0]} fontSize={0.5} color="#ec4899" anchorX="center" font={undefined}>
        BREEDING ARENA
      </Text>
      <Text position={[0, 4.0, 0]} fontSize={0.18} color="#666" anchorX="center" font={undefined}>
        Agent Genetic Crossover & Birth
      </Text>

      <ArenaPlatform />

      {/* Parent A — left */}
      <ParentDNA position={[-3, 0, 0]} color="#00ff88" direction={1} />
      <Text position={[-3, -3.5, 0]} fontSize={0.15} color="#00ff88" anchorX="center" font={undefined}>
        Atlas
      </Text>

      {/* Parent B — right */}
      <ParentDNA position={[3, 0, 0]} color="#06b6d4" direction={-1} />
      <Text position={[3, -3.5, 0]} fontSize={0.15} color="#06b6d4" anchorX="center" font={undefined}>
        Echo
      </Text>

      {/* Intertwining particles in center */}
      <BreedingParticles />

      {/* Child materializing */}
      <ChildAgent />

      {/* Lighting */}
      <pointLight position={[0, 4, 0]} color="#ec4899" intensity={3} distance={18} />
      <pointLight position={[-4, 0, 0]} color="#00ff88" intensity={2} distance={12} />
      <pointLight position={[4, 0, 0]} color="#06b6d4" intensity={2} distance={12} />
    </group>
  )
}
