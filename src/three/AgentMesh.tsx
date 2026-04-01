import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { AgentState as Agent } from '../api/gateway'

interface AgentMeshProps {
  agent: Agent
  position: [number, number, number]
  isSelected: boolean
  isMoving?: boolean
  targetPosition?: [number, number, number]
  onClick: () => void
}

const STATUS_COLORS: Record<string, string> = {
  working: '#10b981',
  active: '#10b981',
  thinking: '#8b5cf6',
  idle: '#f59e0b',
  break: '#f59e0b',
  error: '#ef4444',
  offline: '#6b7280',
}


export function AgentMesh({ agent, position, isSelected, isMoving, targetPosition, onClick }: AgentMeshProps) {
  const meshRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const currentActionRef = useRef<THREE.AnimationAction | null>(null)
  const posRef = useRef(new THREE.Vector3(...position))
  const [hovered, setHovered] = useState(false)
  const glowRef = useRef<THREE.PointLight>(null)

  const { scene, animations } = useGLTF('/models/RobotExpressive.glb') as any
  const clonedScene = useRef<THREE.Group | null>(null)

  // Clone the scene once per agent
  useEffect(() => {
    if (!scene) return
    const clone = scene.clone(true)
    clonedScene.current = clone

    // Set up animation mixer on the clone
    const mixer = new THREE.AnimationMixer(clone)
    mixerRef.current = mixer

    // Play idle by default
    const idleClip = THREE.AnimationClip.findByName(animations, 'Idle')
    if (idleClip) {
      const action = mixer.clipAction(idleClip, clone)
      action.play()
      currentActionRef.current = action
    }

    if (meshRef.current) {
      // Clear any previous children
      while (meshRef.current.children.length > 0) {
        meshRef.current.remove(meshRef.current.children[0])
      }
      meshRef.current.add(clone)
    }

    return () => {
      mixer.stopAllAction()
    }
  }, [scene, animations])

  const switchAnimation = useCallback((name: string, loop = true) => {
    if (!mixerRef.current || !clonedScene.current) return
    const clip = THREE.AnimationClip.findByName(animations, name)
    if (!clip) return
    const newAction = mixerRef.current.clipAction(clip, clonedScene.current)
    if (currentActionRef.current && currentActionRef.current !== newAction) {
      newAction.reset()
      newAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
      newAction.clampWhenFinished = !loop
      currentActionRef.current.crossFadeTo(newAction, 0.3, true)
      newAction.play()
      currentActionRef.current = newAction
    } else if (!currentActionRef.current) {
      newAction.play()
      currentActionRef.current = newAction
    }
  }, [animations])

  // React to state changes
  useEffect(() => {
    if (isMoving) {
      switchAnimation('Walking')
    } else if (isSelected) {
      switchAnimation('Wave', false)
      const timer = setTimeout(() => switchAnimation('Idle'), 2000)
      return () => clearTimeout(timer)
    } else {
      switchAnimation('Idle')
    }
  }, [isMoving, isSelected, switchAnimation])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    // Update animation mixer
    mixerRef.current?.update(delta)

    // Smooth movement toward target
    if (isMoving && targetPosition) {
      const target = new THREE.Vector3(...targetPosition)
      posRef.current.lerp(target, delta * 2)
      meshRef.current.position.copy(posRef.current)

      // Face direction of movement
      const dir = target.clone().sub(posRef.current)
      if (dir.length() > 0.01) {
        const angle = Math.atan2(dir.x, dir.z)
        meshRef.current.rotation.y = THREE.MathUtils.lerp(
          meshRef.current.rotation.y, angle, delta * 5
        )
      }
    } else {
      posRef.current.set(...position)
      meshRef.current.position.copy(posRef.current)
    }

    // Subtle idle bob
    if (!isMoving) {
      meshRef.current.position.y = position[1] + Math.sin(Date.now() * 0.001 + position[0]) * 0.02
    }

    // Glow pulse
    if (glowRef.current) {
      const base = isSelected ? 2.5 : hovered ? 1.5 : 0.8
      glowRef.current.intensity = base + Math.sin(Date.now() * 0.003) * 0.3
    }
  })

  const statusColor = STATUS_COLORS[agent.status as string] ?? STATUS_COLORS.idle
  const glowColor = isSelected ? '#8b5cf6' : statusColor

  return (
    <group
      ref={meshRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
    >
      {/* Status glow under feet */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 32]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isSelected ? 3 : hovered ? 2 : 1}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Point light for agent glow */}
      <pointLight
        ref={glowRef}
        color={glowColor}
        intensity={0.8}
        distance={2.5}
        decay={2}
        position={[0, 0.5, 0]}
      />

      {/* Name tag floating above agent */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false} position={[0, 2.4, 0]}>
        <Text
          fontSize={0.18}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {agent.name || 'Agent'}
        </Text>
        {/* Status dot */}
        <mesh position={[0, -0.22, 0]}>
          <circleGeometry args={[0.07, 16]} />
          <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2} />
        </mesh>
      </Billboard>
    </group>
  )
}

useGLTF.preload('/models/RobotExpressive.glb')
