import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Float } from '@react-three/drei'
import * as THREE from 'three'
import { skills } from '../data/mockData'

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

      // Strand 1
      points.push(Math.cos(t) * 1.2, y, Math.sin(t) * 1.2)
      colors.push(0, 1, 0.53)

      // Strand 2
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
            <bufferAttribute
              attach="attributes-position"
              args={[helixPoints.positions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[helixPoints.colors, 3]}
            />
          </bufferGeometry>
          <pointsMaterial size={0.12} vertexColors transparent opacity={0.9} sizeAttenuation />
        </points>

        {/* Rungs connecting the strands */}
        {Array.from({ length: 20 }).map((_, i) => {
          const t = (i / 20) * Math.PI * 6
          const y = (i / 20) * 8 - 4
          return (
            <mesh key={i} position={[0, y, 0]} rotation={[0, t, 0]}>
              <boxGeometry args={[2.4, 0.04, 0.04]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#00ff88' : '#3b82f6'}
                emissive={i % 2 === 0 ? '#00ff88' : '#3b82f6'}
                emissiveIntensity={0.5}
                transparent
                opacity={0.6}
              />
            </mesh>
          )
        })}
      </group>

      {/* Mutation particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[mutationParticles.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[mutationParticles.colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial size={0.06} vertexColors transparent opacity={0.6} sizeAttenuation />
      </points>
    </group>
  )
}

function SkillCard({ skill, index }: { skill: typeof skills[0]; index: number }) {
  const angle = (index / skills.length) * Math.PI * 2
  const radius = 3.5
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <group position={[x, -1.5 + (index % 2) * 0.5, z]}>
        {/* Card background */}
        <mesh>
          <planeGeometry args={[1.6, 1.0]} />
          <meshStandardMaterial
            color="#1a1a2e"
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Health bar background */}
        <mesh position={[0, -0.25, 0.01]}>
          <planeGeometry args={[1.3, 0.12]} />
          <meshBasicMaterial color="#2a2a3e" side={THREE.DoubleSide} />
        </mesh>

        {/* Health bar fill */}
        <mesh position={[-(1.3 * (1 - skill.fitness / 100)) / 2, -0.25, 0.02]}>
          <planeGeometry args={[1.3 * (skill.fitness / 100), 0.12]} />
          <meshBasicMaterial color={skill.color} side={THREE.DoubleSide} />
        </mesh>

        {/* Skill name */}
        <Text
          position={[0, 0.15, 0.01]}
          fontSize={0.12}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {skill.name}
        </Text>

        {/* Fitness score */}
        <Text
          position={[0.55, 0.15, 0.01]}
          fontSize={0.1}
          color={skill.color}
          anchorX="right"
          anchorY="middle"
          font={undefined}
        >
          {skill.fitness}%
        </Text>

        {/* Generation */}
        <Text
          position={[0, -0.05, 0.01]}
          fontSize={0.08}
          color="#888"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          Gen {skill.generation} · {skill.status}
        </Text>

        {/* Glow border for mutating skills */}
        {skill.status === 'mutating' && (
          <mesh>
            <planeGeometry args={[1.7, 1.1]} />
            <meshBasicMaterial
              color={skill.color}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </Float>
  )
}

export function GenomeLab() {
  return (
    <group>
      {/* Room title */}
      <Text
        position={[0, 4.5, 0]}
        fontSize={0.5}
        color="#00ff88"
        anchorX="center"
        font={undefined}
      >
        GENOME LAB
      </Text>

      <Text
        position={[0, 4.0, 0]}
        fontSize={0.18}
        color="#666"
        anchorX="center"
        font={undefined}
      >
        Skill Evolution & Mutation Engine
      </Text>

      <DNAHelix />

      {skills.map((skill, i) => (
        <SkillCard key={skill.name} skill={skill} index={i} />
      ))}

      {/* Room ambient glow */}
      <pointLight position={[0, 3, 0]} color="#00ff88" intensity={2} distance={12} />
      <pointLight position={[0, -3, 0]} color="#3b82f6" intensity={1.5} distance={10} />
    </group>
  )
}
