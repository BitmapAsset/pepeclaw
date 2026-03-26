import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { GenomeLab } from '../rooms/GenomeLab'
import { DreamChamber } from '../rooms/DreamChamber'
import { WarRoom } from '../rooms/WarRoom'
import { RedTeamArena3D } from '../rooms/RedTeamArena3D'
import { MetaLearning3D } from '../rooms/MetaLearning3D'
import { TemporalEngine3D } from '../rooms/TemporalEngine3D'
import { IdentityVault3D } from '../rooms/IdentityVault3D'
import { BreedingArena3D } from '../rooms/BreedingArena3D'
import { Agent3D } from './Agent3D'
import { ConsciousnessStream } from './ConsciousnessStream'
import { useAgents } from '../api/DataProvider'
import type { RoomId } from '../data/mockData'
import type { AgentActivity } from './Agent3D'

const roomPositions: Record<RoomId, [number, number, number]> = {
  genome: [-14, 0, 0],
  dream: [0, 0, 0],
  war: [14, 0, 0],
  redteam: [28, 0, 0],
  metalearning: [42, 0, 0],
  temporal: [56, 0, 0],
  identity: [70, 0, 0],
  breeding: [84, 0, 0],
}

const roomAmbience: Record<RoomId, { color: string; intensity: number }> = {
  genome: { color: '#00ff88', intensity: 0.08 },
  dream: { color: '#8b5cf6', intensity: 0.06 },
  war: { color: '#ef4444', intensity: 0.08 },
  redteam: { color: '#f87171', intensity: 0.07 },
  metalearning: { color: '#06b6d4', intensity: 0.07 },
  temporal: { color: '#f59e0b', intensity: 0.07 },
  identity: { color: '#f97316', intensity: 0.07 },
  breeding: { color: '#ec4899', intensity: 0.08 },
}

const agentRoomOffsets: Record<string, [number, number, number][]> = {
  genome: [[2, -0.2, 2], [-2, -0.2, 2]],
  dream: [[0, 1, 3], [2, 0.5, -2]],
  war: [[-5, -0.2, 2], [5, -0.2, 2]],
  redteam: [[-3, 0.8, 2], [3, 0.8, 2]],
  metalearning: [[2, -0.2, 3]],
  temporal: [[-3, -0.2, 3]],
  identity: [[-1.5, -0.2, 3], [0, -0.2, 3], [1.5, -0.2, 3]],
  breeding: [[-3, -0.2, 3], [3, -0.2, 3]],
}

const agentActivities: Record<string, AgentActivity> = {
  genome: 'examining',
  dream: 'meditating',
  war: 'strategizing',
  redteam: 'debating',
  metalearning: 'studying',
  temporal: 'managing',
  identity: 'verifying',
  breeding: 'breeding',
}

function CameraRig({ target }: { target: [number, number, number] }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const targetVec = useRef(new THREE.Vector3(...target))

  useFrame(() => {
    targetVec.current.lerp(new THREE.Vector3(...target), 0.04)
    if (cameraRef.current) {
      cameraRef.current.position.lerp(
        new THREE.Vector3(
          targetVec.current.x + 6,
          targetVec.current.y + 8,
          targetVec.current.z + 10,
        ),
        0.04,
      )
      cameraRef.current.lookAt(targetVec.current)
    }
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[6, 8, 10]} fov={50} />
}

function FloorGrid() {
  return (
    <group position={[35, -4, 0]}>
      <gridHelper args={[120, 120, '#1a1b2e', '#12131f']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[120, 40]} />
        <meshStandardMaterial color="#08090e" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

function RoomAgents() {
  const agents = useAgents()

  // Build agent position map for consciousness stream
  const agentPositionMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    agents.forEach(agent => {
      const roomPos = roomPositions[agent.currentRoom as RoomId]
      if (!roomPos) return
      const offsets = agentRoomOffsets[agent.currentRoom] ?? [[0, -0.2, 2]]
      const agentIndex = agents.filter(a => a.currentRoom === agent.currentRoom).indexOf(agent)
      const offset = offsets[agentIndex % offsets.length]
      map.set(agent.id, [
        roomPos[0] + offset[0],
        roomPos[1] + offset[1],
        roomPos[2] + offset[2],
      ])
    })
    return map
  }, [agents])

  return (
    <>
      {agents.map((agent) => {
        const pos = agentPositionMap.get(agent.id)
        if (!pos) return null
        const activity = agentActivities[agent.currentRoom]

        return (
          <Agent3D
            key={agent.id}
            name={agent.name}
            color={agent.color}
            status={agent.status}
            position={pos}
            activity={activity}
          />
        )
      })}

      {/* Consciousness Stream — thought bubbles & neural pathways */}
      <ConsciousnessStream agentPositions={agentPositionMap} />
    </>
  )
}

function RoomAmbientLight({ activeRoom }: { activeRoom: RoomId }) {
  const ref = useRef<THREE.PointLight>(null)
  const targetColor = useRef(new THREE.Color(roomAmbience[activeRoom].color))

  useFrame(() => {
    if (ref.current) {
      const target = new THREE.Color(roomAmbience[activeRoom].color)
      targetColor.current.lerp(target, 0.03)
      ref.current.color.copy(targetColor.current)
    }
  })

  return <pointLight ref={ref} position={[0, 10, 0]} intensity={roomAmbience[activeRoom].intensity} distance={50} />
}

function GlobalParticles() {
  const ref = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const count = 200
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 120 + 35
      pos[i * 3 + 1] = Math.random() * 15 - 2
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30
    }
    return pos
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      const posArray = ref.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < posArray.length / 3; i++) {
        posArray[i * 3 + 1] += delta * 0.15
        if (posArray[i * 3 + 1] > 13) posArray[i * 3 + 1] = -2
      }
      ref.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#8b5cf6" transparent opacity={0.25} sizeAttenuation />
    </points>
  )
}

function SceneContent({ activeRoom }: { activeRoom: RoomId }) {
  return (
    <>
      <CameraRig target={roomPositions[activeRoom]} />
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={6}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.2}
      />

      {/* Global lighting */}
      <ambientLight intensity={0.12} />
      <directionalLight position={[10, 15, 10]} intensity={0.25} color="#e0e0ff" />
      <RoomAmbientLight activeRoom={activeRoom} />

      <FloorGrid />
      <GlobalParticles />

      {/* All 8 rooms */}
      <group position={roomPositions.genome}>
        <GenomeLab />
      </group>

      <group position={roomPositions.dream}>
        <DreamChamber />
      </group>

      <group position={roomPositions.war}>
        <WarRoom />
      </group>

      <group position={roomPositions.redteam}>
        <RedTeamArena3D />
      </group>

      <group position={roomPositions.metalearning}>
        <MetaLearning3D />
      </group>

      <group position={roomPositions.temporal}>
        <TemporalEngine3D />
      </group>

      <group position={roomPositions.identity}>
        <IdentityVault3D />
      </group>

      <group position={roomPositions.breeding}>
        <BreedingArena3D />
      </group>

      {/* Agents in all rooms */}
      <RoomAgents />
    </>
  )
}

export function Scene({ activeRoom }: { activeRoom: RoomId }) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0a0b14']} />
      <fog attach="fog" args={['#0a0b14', 25, 55]} />
      <SceneContent activeRoom={activeRoom} />
    </Canvas>
  )
}
