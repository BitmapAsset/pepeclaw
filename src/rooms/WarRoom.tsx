import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useData } from '../api/DataProvider'

const statusColors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' }

function HealthGauge({ health, color, position }: { health: number; color: string; position: [number, number, number] }) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.3
    }
  })

  const angle = (health / 100) * Math.PI * 2

  return (
    <group position={position}>
      {/* Background ring */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[0.5, 0.06, 8, 32]} />
        <meshBasicMaterial color="#2a2a3e" transparent opacity={0.5} />
      </mesh>

      {/* Health arc */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.5, 0.08, 8, 32, angle]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Center value */}
      <Text
        position={[0, 0, 0.1]}
        fontSize={0.25}
        color={color}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {health}
      </Text>
    </group>
  )
}

function VelocityChart({ data, position, color }: { data: number[]; position: [number, number, number]; color: string }) {
  const barWidth = 0.15
  const maxVal = 100
  const totalWidth = data.length * (barWidth + 0.05)

  return (
    <group position={position}>
      {data.map((val, i) => {
        const height = (val / maxVal) * 1.2
        const x = i * (barWidth + 0.05) - totalWidth / 2
        return (
          <mesh key={i} position={[x, height / 2 - 0.3, 0]}>
            <boxGeometry args={[barWidth, height, 0.1]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
              transparent
              opacity={0.5 + (i / data.length) * 0.5}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function StatusLight({ status, position }: { status: 'green' | 'yellow' | 'red'; position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  const time = useRef(Math.random() * 10)

  useFrame((_, delta) => {
    time.current += delta
    if (ref.current && status === 'red') {
      const mat = ref.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.5 + Math.sin(time.current * 4) * 0.5
    }
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.1, 12, 12]} />
      <meshStandardMaterial
        color={statusColors[status]}
        emissive={statusColors[status]}
        emissiveIntensity={0.8}
      />
    </mesh>
  )
}

function ProjectCard({ project, index, total }: { project: import('../data/types').Project; index: number; total: number }) {
  const x = (index - (total - 1) / 2) * 3.2

  return (
    <group position={[x, 0, 0]}>
      {/* Card base */}
      <RoundedBox args={[2.8, 3.5, 0.15]} radius={0.08} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#12121f"
          transparent
          opacity={0.9}
        />
      </RoundedBox>

      {/* Card border glow */}
      <RoundedBox args={[2.85, 3.55, 0.1]} radius={0.08} position={[0, 0, -0.05]}>
        <meshBasicMaterial
          color={statusColors[project.status]}
          transparent
          opacity={0.1}
        />
      </RoundedBox>

      {/* Project name */}
      <Text
        position={[0, 1.35, 0.1]}
        fontSize={0.2}
        color="#fff"
        anchorX="center"
        font={undefined}
      >
        {project.name}
      </Text>

      {/* Status light */}
      <StatusLight status={project.status} position={[1.1, 1.35, 0.1]} />

      {/* Health gauge */}
      <HealthGauge
        health={project.health}
        color={statusColors[project.status]}
        position={[0, 0.4, 0.1]}
      />

      {/* Velocity chart */}
      <VelocityChart
        data={project.velocity}
        position={[0, -0.7, 0.1]}
        color={statusColors[project.status]}
      />

      {/* Velocity label */}
      <Text
        position={[0, -1.15, 0.1]}
        fontSize={0.09}
        color="#666"
        anchorX="center"
        font={undefined}
      >
        VELOCITY (7d)
      </Text>

      {/* Alerts */}
      {project.alerts.map((alert, i) => (
        <Text
          key={i}
          position={[0, -1.4 - i * 0.18, 0.1]}
          fontSize={0.08}
          color="#ef4444"
          anchorX="center"
          maxWidth={2.5}
          font={undefined}
        >
          ! {alert}
        </Text>
      ))}
    </group>
  )
}

function AlertPulse() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) {
      const t = performance.now() * 0.001;
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.03 + Math.sin(t * 1.5) * 0.02;
      ref.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.02);
    }
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, 0]}>
      <circleGeometry args={[8, 32]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.03} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function WarRoom() {
  const { projects } = useData()
  return (
    <group>
      <Text
        position={[0, 4.5, 0]}
        fontSize={0.5}
        color="#ef4444"
        anchorX="center"
        font={undefined}
      >
        WAR ROOM
      </Text>

      <Text
        position={[0, 4.0, 0]}
        fontSize={0.18}
        color="#666"
        anchorX="center"
        font={undefined}
      >
        Project Health Command Center
      </Text>

      <group position={[0, -0.5, 0]}>
        {projects.map((project, i) => (
          <ProjectCard key={project.name} project={project} index={i} total={projects.length} />
        ))}
      </group>

      {/* Pulsing red alert floor */}
      <AlertPulse />

      {/* War room lighting — tense and focused */}
      <pointLight position={[0, 5, 3]} color="#ff3333" intensity={3} distance={20} />
      <pointLight position={[-6, 2, 0]} color="#ff6600" intensity={2} distance={15} />
      <pointLight position={[6, 2, 0]} color="#ff6600" intensity={2} distance={15} />
    </group>
  )
}
