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
import { sceneRoomIds } from '../data/types'
import type { RoomId } from '../data/types'
import type { AgentActivity } from './Agent3D'
import type { AgentState } from '../api/gateway'

// Grid layout: 4 columns x 2 rows for isometric overview
const roomPositions: Record<string, [number, number, number]> = {
  genome:       [-15, 0, -10],
  dream:        [0,   0, -10],
  war:          [15,  0, -10],
  redteam:      [30,  0, -10],
  metalearning: [-15, 0,  10],
  temporal:     [0,   0,  10],
  identity:     [15,  0,  10],
  breeding:     [30,  0,  10],
}

const roomAmbience: Record<string, { color: string; intensity: number }> = {
  genome: { color: '#00ff88', intensity: 0.35 },
  dream: { color: '#8b5cf6', intensity: 0.3 },
  war: { color: '#ef4444', intensity: 0.35 },
  redteam: { color: '#f87171', intensity: 0.3 },
  metalearning: { color: '#06b6d4', intensity: 0.3 },
  temporal: { color: '#f59e0b', intensity: 0.3 },
  identity: { color: '#f97316', intensity: 0.3 },
  breeding: { color: '#ec4899', intensity: 0.35 },
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

function mapAgentToActivity(agent: AgentState): AgentActivity {
  if (agent.hasError) return 'frustrated';
  if (agent.hasSubAgents) return 'meeting';
  if (agent.isSearching) return 'browsing';
  if (agent.status === 'working' && agent.activity === 'processing') return 'typing';
  if (agent.status === 'idle') return 'walking';
  return defaultAgentActivities[agent.currentRoom] ?? 'examining';
}

const OVERVIEW_CENTER = new THREE.Vector3(7.5, 0, 0);
const OVERVIEW_CAM_POS = new THREE.Vector3(7.5 + 25, 35, 40);

const _lerpTarget = new THREE.Vector3();
const _lerpCamPos = new THREE.Vector3();

// Per-room camera offsets for cinematic variety
const roomCameraOffsets: Record<string, [number, number, number]> = {
  genome:       [5, 7, 9],      // slightly lower, closer to DNA helix
  dream:        [4, 9, 11],     // higher, dreamy overview
  war:          [7, 6, 8],      // tighter, war room intensity
  redteam:      [8, 7, 9],      // wide view of arena
  metalearning: [5, 8, 10],     // balanced, see the brain
  temporal:     [6, 6, 10],     // slightly lower, see hourglass up close
  identity:     [4, 7, 11],     // further back, see the vault door
  breeding:     [6, 7, 9],      // balanced, see both parents
}

function CameraRig({ target, overviewMode, followPosition, activeRoom }: {
  target: [number, number, number];
  overviewMode: boolean;
  followPosition: [number, number, number] | null;
  activeRoom: string;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const targetVec = useRef(new THREE.Vector3(...target))

  useFrame(() => {
    if (!cameraRef.current) return;

    // Smoother lerp factor for cinematic transitions
    const lerpSpeed = 0.04;

    if (followPosition) {
      _lerpTarget.set(followPosition[0], followPosition[1], followPosition[2]);
      targetVec.current.lerp(_lerpTarget, 0.06);
      _lerpCamPos.set(
        targetVec.current.x + 3,
        targetVec.current.y + 4,
        targetVec.current.z + 5,
      );
      cameraRef.current.position.lerp(_lerpCamPos, 0.06);
    } else if (overviewMode) {
      targetVec.current.lerp(OVERVIEW_CENTER, lerpSpeed);
      cameraRef.current.position.lerp(OVERVIEW_CAM_POS, lerpSpeed);
    } else {
      const offset = roomCameraOffsets[activeRoom] ?? [6, 8, 10];
      _lerpTarget.set(target[0], target[1], target[2]);
      targetVec.current.lerp(_lerpTarget, lerpSpeed);
      _lerpCamPos.set(
        targetVec.current.x + offset[0],
        targetVec.current.y + offset[1],
        targetVec.current.z + offset[2],
      );
      cameraRef.current.position.lerp(_lerpCamPos, lerpSpeed);
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

const _roomFloorPlane = new THREE.PlaneGeometry(12, 12);
const _roomFloorEdges = new THREE.EdgesGeometry(_roomFloorPlane);

function RoomFloorMarker({ position, color }: { position: [number, number, number]; color: string }) {
  const glowRef = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.15 + Math.sin(performance.now() * 0.001) * 0.08
    }
  })

  return (
    <group position={[position[0], -3.98, position[2]]}>
      {/* Soft glowing floor */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} transparent opacity={0.12} />
      </mesh>
      {/* Brighter edge glow */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} geometry={_roomFloorEdges}>
        <lineBasicMaterial color={color} transparent opacity={0.35} />
      </lineSegments>
      {/* Soft point light under each room */}
      <pointLight position={[0, 0.5, 0]} color={color} intensity={0.4} distance={8} />
    </group>
  )
}

function RoomAgents({ selectedAgentId, onAgentSelect, onAgentFollow }: {
  selectedAgentId: string | null;
  onAgentSelect: (id: string | null) => void;
  onAgentFollow: (id: string) => void;
}) {
  const agents = useAgents()

  const agentPositionMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    agents.forEach(agent => {
      const roomPos = roomPositions[agent.currentRoom]
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
            id={agent.id}
            name={agent.name}
            color={agent.color}
            status={agent.status}
            position={pos}
            activity={activity}
            taskDescription={agent.taskDescription}
            hasError={agent.hasError}
            selected={selectedAgentId === agent.id}
            onSelect={onAgentSelect}
            onFollow={onAgentFollow}
          />
        )
      })}

      <ConsciousnessStream agentPositions={agentPositionMap} />
    </>
  )
}

function RoomAmbientLight({ activeRoom }: { activeRoom: RoomId }) {
  const ref = useRef<THREE.PointLight>(null)
  const fillRef = useRef<THREE.PointLight>(null)
  const targetColor = useRef(new THREE.Color(roomAmbience[activeRoom]?.color ?? '#8b5cf6'))

  useFrame(() => {
    if (roomAmbience[activeRoom]) {
      const target = new THREE.Color(roomAmbience[activeRoom].color)
      targetColor.current.lerp(target, 0.03)
      if (ref.current) ref.current.color.copy(targetColor.current)
      if (fillRef.current) fillRef.current.color.copy(targetColor.current)
    }
  })

  return (
    <>
      <pointLight ref={ref} position={[7.5, 10, 0]} intensity={roomAmbience[activeRoom]?.intensity ?? 0.07} distance={60} />
      {/* Fill light from below for atmosphere */}
      <pointLight ref={fillRef} position={[7.5, -2, 0]} intensity={(roomAmbience[activeRoom]?.intensity ?? 0.07) * 0.3} distance={40} />
    </>
  )
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function GlobalParticles() {
  const ref = useRef<THREE.Points>(null)

  const { positions, sizes } = useMemo(() => {
    const count = 350
    const pos = new Float32Array(count * 3)
    const sz = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (seededRandom(i * 4) - 0.5) * 80 + 7.5
      pos[i * 3 + 1] = seededRandom(i * 4 + 1) * 18 - 3
      pos[i * 3 + 2] = (seededRandom(i * 4 + 2) - 0.5) * 40
      sz[i] = 0.04 + seededRandom(i * 4 + 3) * 0.08
    }
    return { positions: pos, sizes: sz }
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      const posArray = ref.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < posArray.length / 3; i++) {
        posArray[i * 3 + 1] += delta * (0.1 + sizes[i] * 0.8)
        // Gentle horizontal drift
        posArray[i * 3] += Math.sin(posArray[i * 3 + 1] * 0.5 + i) * delta * 0.03
        if (posArray[i * 3 + 1] > 15) posArray[i * 3 + 1] = -3
      }
      ref.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#a78bfa" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

function RoomClickTarget({ roomId, position, onRoomClick }: {
  roomId: RoomId;
  position: [number, number, number];
  onRoomClick: (roomId: RoomId) => void;
}) {
  const handleClick = useCallback(() => onRoomClick(roomId), [roomId, onRoomClick]);

  return (
    <mesh
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

function SceneContent({ activeRoom, overviewMode, onRoomClick, selectedAgentId, followingAgentId, onAgentSelect, onAgentFollow }: {
  activeRoom: RoomId;
  overviewMode: boolean;
  onRoomClick: (roomId: RoomId) => void;
  selectedAgentId: string | null;
  followingAgentId: string | null;
  onAgentSelect: (id: string | null) => void;
  onAgentFollow: (id: string) => void;
}) {
  const agents = useAgents()

  // Get followed agent position for camera tracking
  const followPosition = useMemo(() => {
    if (!followingAgentId) return null;
    const agent = agents.find(a => a.id === followingAgentId);
    if (!agent) return null;
    const roomPos = roomPositions[agent.currentRoom];
    if (!roomPos) return null;
    const offsets = agentRoomOffsets[agent.currentRoom] ?? [[0, -0.2, 2]];
    const agentIndex = agents.filter(a => a.currentRoom === agent.currentRoom).indexOf(agent);
    const offset = offsets[agentIndex % offsets.length];
    return [roomPos[0] + offset[0], roomPos[1] + offset[1], roomPos[2] + offset[2]] as [number, number, number];
  }, [agents, followingAgentId])

  // Use scene room position or default to overview center for non-scene rooms
  const targetPos = roomPositions[activeRoom] ?? [7.5, 0, 0] as [number, number, number]

  return (
    <>
      <CameraRig target={targetPos} overviewMode={overviewMode} followPosition={followPosition} activeRoom={activeRoom} />
      <OrbitControls
        enablePan={overviewMode}
        enableZoom
        minDistance={followingAgentId ? 3 : overviewMode ? 20 : 6}
        maxDistance={overviewMode ? 80 : 25}
        maxPolarAngle={Math.PI / 2.2}
      />

      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={0.6} color="#e0e0ff" />
      <RoomAmbientLight activeRoom={activeRoom} />

      <FloorGrid />
      <GlobalParticles />

      {sceneRoomIds.map(roomId => (
        <RoomFloorMarker
          key={roomId}
          position={roomPositions[roomId]}
          color={roomAmbience[roomId].color}
        />
      ))}

      {overviewMode && sceneRoomIds.map(roomId => (
        <RoomClickTarget
          key={`click-${roomId}`}
          roomId={roomId}
          position={roomPositions[roomId]}
          onRoomClick={onRoomClick}
        />
      ))}

      <group position={roomPositions.genome}><GenomeLab /></group>
      <group position={roomPositions.dream}><DreamChamber /></group>
      <group position={roomPositions.war}><WarRoom /></group>
      <group position={roomPositions.redteam}><RedTeamArena3D /></group>
      <group position={roomPositions.metalearning}><MetaLearning3D /></group>
      <group position={roomPositions.temporal}><TemporalEngine3D /></group>
      <group position={roomPositions.identity}><IdentityVault3D /></group>
      <group position={roomPositions.breeding}><BreedingArena3D /></group>

      <RoomAgents
        selectedAgentId={selectedAgentId}
        onAgentSelect={onAgentSelect}
        onAgentFollow={onAgentFollow}
      />
    </>
  )
}

export function Scene({ activeRoom, overviewMode, onRoomClick, selectedAgentId, followingAgentId, onAgentSelect, onAgentFollow }: {
  activeRoom: RoomId;
  overviewMode: boolean;
  onRoomClick: (roomId: RoomId) => void;
  selectedAgentId: string | null;
  followingAgentId: string | null;
  onAgentSelect: (id: string | null) => void;
  onAgentFollow: (id: string) => void;
}) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0a0b14']} />
      <fog attach="fog" args={['#0a0b14', 50, 120]} />
      <SceneContent
        activeRoom={activeRoom}
        overviewMode={overviewMode}
        onRoomClick={onRoomClick}
        selectedAgentId={selectedAgentId}
        followingAgentId={followingAgentId}
        onAgentSelect={onAgentSelect}
        onAgentFollow={onAgentFollow}
      />
    </Canvas>
  )
}
