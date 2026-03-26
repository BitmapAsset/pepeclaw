import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { GenomeLab } from '../rooms/GenomeLab'
import { DreamChamber } from '../rooms/DreamChamber'
import { WarRoom } from '../rooms/WarRoom'
import type { RoomId } from '../data/mockData'

function CameraRig({ target }: { target: [number, number, number] }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const targetVec = useRef(new THREE.Vector3(...target))

  useFrame(() => {
    targetVec.current.lerp(new THREE.Vector3(...target), 0.03)
    if (cameraRef.current) {
      cameraRef.current.position.lerp(
        new THREE.Vector3(
          targetVec.current.x + 8,
          targetVec.current.y + 10,
          targetVec.current.z + 12
        ),
        0.03
      )
      cameraRef.current.lookAt(targetVec.current)
    }
  })

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[8, 10, 12]} fov={45} />
}

function FloorGrid() {
  return (
    <group position={[0, -4, 0]}>
      <gridHelper args={[40, 40, '#1a1b2e', '#12131f']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#08090e" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

const roomPositions: Record<RoomId, [number, number, number]> = {
  genome: [-14, 0, 0],
  dream: [0, 0, 0],
  war: [14, 0, 0],
}

function SceneContent({ activeRoom }: { activeRoom: RoomId }) {
  return (
    <>
      <CameraRig target={roomPositions[activeRoom]} />
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={8}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.2}
      />

      {/* Ambient */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 15, 10]} intensity={0.3} color="#e0e0ff" />

      <FloorGrid />

      {/* Rooms */}
      <group position={roomPositions.genome}>
        <GenomeLab />
      </group>

      <group position={roomPositions.dream}>
        <DreamChamber />
      </group>

      <group position={roomPositions.war}>
        <WarRoom />
      </group>
    </>
  )
}

export function Scene({ activeRoom }: { activeRoom: RoomId }) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0a0b14']} />
      <fog attach="fog" args={['#0a0b14', 20, 45]} />
      <SceneContent activeRoom={activeRoom} />
    </Canvas>
  )
}
