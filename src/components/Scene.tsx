import { useRef, useMemo, useCallback } from 'react'
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
import type { AgentState } from '../api/gateway'

// Grid layout: 4 columns x 2 rows for isometric overview
const roomPositions: Record<RoomId, [number, number, number]> = {
  genome:       [-15, 0, -10],
  dream:        [0,   0, -10],
  war:          [15,  0, -10],
  redteam:      [30,  0, -10],
  metalearning: [-15, 0,  10],
  temporal:     [0,   0,  10],
  identity:     [15,  0,  10],
  breeding:     [30,  0,  10],
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
  war: [[-3, -0.2, 2], [3, -0.2, 2]],
  redteam: [[-3, 0.8, 2], [3, 0.8, 2]],
  metalearning: [[2, -0.2, 3]],
  temporal: [[-3, -0.2, 3]],
  identity: [[-1.5, -0.2, 3], [0, -0.2, 3], [1.5, -0.2, 3]],
  breeding: [[-3, -0.2, 3], [3, -0.2, 3]],
}

const defaultAgentActivities: Record<string, AgentActivity> = {
  genome: 'examining',
  dream: 'meditating',
  war: 'strategizing',
  redteam: 'debating',
  metalearning: 'studying',
  temporal: 'managing',
  identity: 'verifying',
  breeding: 'breeding',
}

/** Map real agent session data to 3D activity */
function mapAgentToActivity(agent: AgentState): AgentActivity {
  if (agent.hasError) return 'frustrated';
  if (agent.hasSubAgents) return 'meeting';
  if (agent.isSearching) return 'browsing';
  if (agent.status === 'working' && agent.activity === 'processing') return 'typing';
  if (agent.status === 'idle') return 'walking';
  // Fall back to room-based activity
  return defaultAgentActivities[agent.currentRoom] ?? 'examining';
}

// Overview camera position (isometric, high up, looking at center)
const OVERVIEW_CENTER = new THREE.Vector3(7.5, 0, 0);
const OVERVIEW_CAM_POS = new THREE.Vector3(7.5 + 25, 35, 40);

// Pre-create vectors for CameraRig (avoids allocations in useFrame)
const _lerpTarget = new THREE.Vector3();
const _lerpCamPos = new THREE.Vector3();

function CameraRig({ target, overviewMode }: { target: [number, number, number]; overviewMode: boolean }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const targetVec = useRef(new THREE.Vector3(...target))

  useFrame(() => {
    if (!cameraRef.current) return;

    if (overviewMode) {
      targetVec.current.lerp(OVERVIEW_CENTER, 0.04);
      cameraRef.current.position.lerp(OVERVIEW_CAM_POS, 0.04);
    } else {
      _lerpTarget.set(target[0], target[1], target[2]);
      targetVec.current.lerp(_lerpTarget, 0.04);
      _lerpCamPos.set(
        targetVec.current.x + 6,
        targetVec.current.y + 8,
        targetVec.current.z + 10,
      );
      cameraRef.current.position.lerp(_lerpCamPos, 0.04);
    }
    cameraRef.current.lookAt(targetVec.current);
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[6, 8, 10]} fov={50} />
}

function FloorGrid() {
  return (
    <group position={[7.5, -4, 0]}>
      <gridHelper args={[80, 80, '#1a1b2e', '#12131f']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[80, 50]} />
        <meshStandardMaterial color="#08090e" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

// Shared geometry for room floor borders (avoids re-creation)
const _roomFloorPlane = new THREE.PlaneGeometry(12, 12);
const _roomFloorEdges = new THREE.EdgesGeometry(_roomFloorPlane);

/** Room floor marker — subtle glowing border around each room area */
function RoomFloorMarker({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={[position[0], -3.98, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.03} />
      </mesh>
      {/* Border lines */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} geometry={_roomFloorEdges}>
        <lineBasicMaterial color={color} transparent opacity={0.15} />
      </lineSegments>
    </group>
  )
}

function RoomAgents() {
  const agents = useAgents()

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
        const activity = mapAgentToActivity(agent)

        return (
          <Agent3D
            key={agent.id}
            name={agent.name}
            color={agent.color}
            status={agent.status}
            position={pos}
            activity={activity}
            taskDescription={agent.taskDescription}
            hasError={agent.hasError}
          />
        )
      })}

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

  return <pointLight ref={ref} position={[7.5, 10, 0]} intensity={roomAmbience[activeRoom].intensity} distance={60} />
}

function GlobalParticles() {
  const ref = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const count = 200
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80 + 7.5
      pos[i * 3 + 1] = Math.random() * 15 - 2
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40
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

/** Clickable room hitbox for overview mode */
function RoomClickTarget({ roomId, position, onRoomClick }: {
  roomId: RoomId;
  position: [number, number, number];
  onRoomClick: (roomId: RoomId) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const handleClick = useCallback(() => onRoomClick(roomId), [roomId, onRoomClick]);

  return (
    <mesh
      ref={meshRef}
      position={[position[0], -3.5, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleClick}
      visible={false}
    >
      <planeGeometry args={[12, 12]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

function SceneContent({ activeRoom, overviewMode, onRoomClick }: {
  activeRoom: RoomId;
  overviewMode: boolean;
  onRoomClick: (roomId: RoomId) => void;
}) {
  return (
    <>
      <CameraRig target={roomPositions[activeRoom]} overviewMode={overviewMode} />
      <OrbitControls
        enablePan={overviewMode}
        enableZoom
        minDistance={overviewMode ? 20 : 6}
        maxDistance={overviewMode ? 80 : 25}
        maxPolarAngle={Math.PI / 2.2}
      />

      {/* Global lighting */}
      <ambientLight intensity={0.12} />
      <directionalLight position={[10, 15, 10]} intensity={0.25} color="#e0e0ff" />
      <RoomAmbientLight activeRoom={activeRoom} />

      <FloorGrid />
      <GlobalParticles />

      {/* Room floor markers (visible in overview) */}
      {(Object.keys(roomPositions) as RoomId[]).map(roomId => (
        <RoomFloorMarker
          key={roomId}
          position={roomPositions[roomId]}
          color={roomAmbience[roomId].color}
        />
      ))}

      {/* Clickable targets for overview mode */}
      {overviewMode && (Object.keys(roomPositions) as RoomId[]).map(roomId => (
        <RoomClickTarget
          key={`click-${roomId}`}
          roomId={roomId}
          position={roomPositions[roomId]}
          onRoomClick={onRoomClick}
        />
      ))}

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

export function Scene({ activeRoom, overviewMode, onRoomClick }: {
  activeRoom: RoomId;
  overviewMode: boolean;
  onRoomClick: (roomId: RoomId) => void;
}) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0a0b14']} />
      <fog attach="fog" args={['#0a0b14', 30, 70]} />
      <SceneContent activeRoom={activeRoom} overviewMode={overviewMode} onRoomClick={onRoomClick} />
    </Canvas>
  )
}
