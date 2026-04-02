import { useRef, useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Stars, Text, Billboard, Html } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { AgentMesh } from './AgentMesh'
import { useAgents } from '../api/DataProvider'
import { gateway } from '../api/gateway'
import type { AgentState } from '../api/gateway'
import type { RoomId } from '../data/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const BRAND = { purple: '#8b5cf6', cyan: '#06b6d4', bg: '#0a0a18', surface: '#1a1b2e', green: '#10b981', amber: '#f59e0b' }

// 8 visible room zones in 3D space — arranged in 2 rows of 4
const ROOM_ZONES: { id: RoomId; name: string; color: string; position: [number, number, number] }[] = [
  { id: 'genome',       name: 'Genome Lab',      color: '#00ff88', position: [-10, 0, -5] },
  { id: 'dream',        name: 'Dream Chamber',   color: '#8b5cf6', position: [-3,  0, -5] },
  { id: 'war',          name: 'War Room',         color: '#ef4444', position: [4,   0, -5] },
  { id: 'redteam',      name: 'Red Team Arena',  color: '#f87171', position: [11,  0, -5] },
  { id: 'metalearning', name: 'Meta-Learning',   color: '#06b6d4', position: [-10, 0,  3] },
  { id: 'temporal',     name: 'Temporal Engine', color: '#f59e0b', position: [-3,  0,  3] },
  { id: 'identity',     name: 'Identity Vault',  color: '#f97316', position: [4,   0,  3] },
  { id: 'breeding',     name: 'Breeding Arena',  color: '#ec4899', position: [11,  0,  3] },
]

// Agent standing positions (in front of desks)
const AGENT_POSITIONS: [number, number, number][] = [
  [-10, 0, -3.5], [-3, 0, -3.5], [4, 0, -3.5], [11, 0, -3.5],
  [-10, 0, 4.5],  [-3, 0, 4.5],  [4, 0, 4.5],  [11, 0, 4.5],
]

// ─── Camera Controller ───────────────────────────────────────────────────────

interface CameraTarget { position: THREE.Vector3; lookAt: THREE.Vector3 }

function CameraRig({ target, screenshotMode }: { target: CameraTarget | null, screenshotMode: boolean }) {
  const { camera } = useThree()
  const orbitRef = useRef<any>(null)
  const isAnimating = useRef(false)
  const driftTime = useRef(0)

  useFrame((_, delta) => {
    // Screenshot mode — perfect angle
    if (screenshotMode) {
      const perfectPos = new THREE.Vector3(0, 12, 18)
      camera.position.lerp(perfectPos, delta * 2)
      camera.lookAt(0, 1, 0)
      return
    }

    // Target animation
    if (target && isAnimating.current) {
      const speed = 3 * delta
      camera.position.lerp(target.position, speed)
      const currentLookAt = new THREE.Vector3()
      camera.getWorldDirection(currentLookAt)
      currentLookAt.multiplyScalar(10).add(camera.position)
      currentLookAt.lerp(target.lookAt, speed)
      camera.lookAt(currentLookAt)
      if (camera.position.distanceTo(target.position) < 0.1) {
        isAnimating.current = false
      }
      return
    }

    // Drone camera drift
    if (!target && orbitRef.current) {
      driftTime.current += delta * 0.2
      const driftX = Math.sin(driftTime.current * 0.3) * 2
      const driftZ = Math.cos(driftTime.current * 0.5) * 2
      orbitRef.current.target.set(driftX, 1, driftZ)
    }
  })

  useEffect(() => {
    if (target) isAnimating.current = true
  }, [target])

  return (
    <OrbitControls
      ref={orbitRef}
      enablePan={!screenshotMode}
      enableZoom={!screenshotMode}
      enableRotate={!screenshotMode}
      minPolarAngle={Math.PI / 10}
      maxPolarAngle={Math.PI / 2.1}
      minDistance={3}
      maxDistance={30}
      autoRotate={!target && !screenshotMode}
      autoRotateSpeed={0.3}
      dampingFactor={0.06}
      enableDamping
      target={[0, 1, 0]}
    />
  )
}

// ─── Holographic Room Title ──────────────────────────────────────────────────

function HolographicRoomTitle({ zone, position }: { zone: typeof ROOM_ZONES[0], position: [number, number, number] }) {
  const titleRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (titleRef.current) {
      const time = Date.now() * 0.001
      titleRef.current.position.y = position[1] + 3.2 + Math.sin(time * 2) * 0.05
    }
  })

  // Fake stats that look real
  const tasks = Math.floor(600 + Math.random() * 400)
  const efficiency = (92 + Math.random() * 7).toFixed(1)
  const uptime = (99.0 + Math.random() * 0.9).toFixed(1)

  return (
    <group ref={titleRef} position={position}>
      <Billboard follow={true} position={[0, 3.2, 0]}>
        <mesh>
          <boxGeometry args={[3.2, 0.8, 0.05]} />
          <meshStandardMaterial
            color="#0a0a1e"
            transparent
            opacity={0.7}
            emissive={zone.color}
            emissiveIntensity={0.3}
          />
        </mesh>
        <Text position={[0, 0.15, 0.03]} fontSize={0.28} color={zone.color} anchorX="center" fontWeight="bold">
          {zone.name.toUpperCase()}
        </Text>
        <Text position={[0, -0.15, 0.03]} fontSize={0.11} color="#94a3b8" anchorX="center">
          TASKS: {tasks} | EFF: {efficiency}% | UP: {uptime}%
        </Text>
        {/* Glowing border */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[3.24, 0.84, 0.01]} />
          <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={2} wireframe />
        </mesh>
      </Billboard>
    </group>
  )
}

// ─── Floor Hologram Pulse ─────────────────────────────────────────────────────

function FloorHologram({ position, color }: { position: [number, number, number], color: string }) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (ringRef.current) {
      const time = Date.now() * 0.001
      const pulse = Math.sin(time * 1.5) * 0.5 + 0.5
      const scale = 0.5 + pulse * 0.5
      ringRef.current.scale.set(scale, 1, scale)
      const mat = ringRef.current.material as THREE.MeshStandardMaterial
      mat.opacity = 0.4 - pulse * 0.3
    }
  })

  return (
    <mesh ref={ringRef} position={[position[0], 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1.2, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.5}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ─── Data Stream Particles ────────────────────────────────────────────────────

function DataStreams({ positions }: { positions: [number, number, number][] }) {
  const linesRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points[]>([])

  const streams = useMemo(() => {
    const result: Array<{ start: [number, number, number], end: [number, number, number] }> = []
    for (let i = 0; i < positions.length - 1; i++) {
      if (Math.random() > 0.5) {
        result.push({ start: positions[i], end: positions[i + 1] })
      }
    }
    return result
  }, [positions])

  useFrame(() => {
    particlesRef.current.forEach((particles, idx) => {
      if (particles) {
        const time = Date.now() * 0.001
        const offset = (time * 0.5 + idx * 0.3) % 1
        const positions = particles.geometry.attributes.position.array as Float32Array
        const stream = streams[idx]
        if (stream) {
          const [sx, sy, sz] = stream.start
          const [ex, ey, ez] = stream.end
          for (let i = 0; i < 5; i++) {
            const t = (offset + i * 0.2) % 1
            positions[i * 3] = sx + (ex - sx) * t
            positions[i * 3 + 1] = sy + (ey - sy) * t + 1.5
            positions[i * 3 + 2] = sz + (ez - sz) * t
          }
          particles.geometry.attributes.position.needsUpdate = true
        }
      }
    })
  })

  return (
    <group ref={linesRef}>
      {streams.map((_, idx) => {
        const positions = new Float32Array(15)
        return (
          <points key={idx} ref={(el: THREE.Points | null) => { if (el) particlesRef.current[idx] = el }}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial size={0.06} color="#8b5cf6" transparent opacity={0.8} sizeAttenuation />
          </points>
        )
      })}
    </group>
  )
}

// ─── Desk + Room Zone ────────────────────────────────────────────────────────

function RoomZone({
  zone,
  agentName,
  unitId,
  isActive,
  onClick,
}: {
  zone: typeof ROOM_ZONES[0]
  agentName: string
  unitId: string
  isActive: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = isActive ? 2 + Math.sin(Date.now() * 0.004) * 0.5 : hovered ? 1.2 : 0.4
    }
  })

  return (
    <group position={zone.position}>
      {/* Floor zone indicator */}
      <mesh ref={glowRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.5, 7]} />
        <meshStandardMaterial
          color={zone.color}
          emissive={zone.color}
          emissiveIntensity={0.4}
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Zone border */}
      {[[-2.75, 0, 0], [2.75, 0, 0]].map(([bx], i) => (
        <mesh key={i} position={[bx, 0.03, 0]}>
          <boxGeometry args={[0.04, 0.04, 7]} />
          <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={2} />
        </mesh>
      ))}
      {[[-3.5, 0, 0], [3.5, 0, 0]].map(([bz], i) => (
        <mesh key={i} position={[0, 0.03, bz]}>
          <boxGeometry args={[5.5, 0.04, 0.04]} />
          <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={2} />
        </mesh>
      ))}

      {/* Desk surface */}
      <mesh position={[0, 0.75, -1.2]} castShadow receiveShadow
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
        onClick={(e) => { e.stopPropagation(); onClick() }}
      >
        <boxGeometry args={[2.0, 0.06, 1.0]} />
        <meshStandardMaterial color="#1e1e3a" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Monitor */}
      <mesh position={[0, 1.3, -1.6]} castShadow>
        <boxGeometry args={[1.2, 0.7, 0.05]} />
        <meshStandardMaterial color="#0a0a1e" metalness={0.5} />
      </mesh>
      {/* Screen content — typing simulation */}
      <mesh position={[0, 1.3, -1.57]}>
        <boxGeometry args={[1.1, 0.6, 0.01]} />
        <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.6} transparent opacity={0.9} />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, 0.88, -1.6]}>
        <boxGeometry args={[0.12, 0.28, 0.12]} />
        <meshStandardMaterial color="#2a2a4a" metalness={0.6} />
      </mesh>

      {/* Keyboard */}
      <mesh position={[0, 0.79, -1.05]}>
        <boxGeometry args={[0.8, 0.02, 0.28]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
      </mesh>

      {/* Desk legs */}
      {([-0.85, 0.85] as number[]).map(dx =>
        ([-0.55, 0.55] as number[]).map(dz => (
          <mesh key={`${dx}-${dz}`} position={[dx, 0.37, -1.2 + dz]} castShadow>
            <boxGeometry args={[0.06, 0.74, 0.06]} />
            <meshStandardMaterial color="#2a2a4a" metalness={0.6} />
          </mesh>
        ))
      )}

      {/* UNIT label — billboard style above desk */}
      <Billboard follow position={[0, 2.2, -1.2]}>
        <mesh>
          <boxGeometry args={[1.6, 0.45, 0.02]} />
          <meshStandardMaterial color="#0a0a1e" transparent opacity={0.85} />
        </mesh>
        {/* Border */}
        <mesh>
          <boxGeometry args={[1.62, 0.47, 0.01]} />
          <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={2} wireframe />
        </mesh>
        <Text position={[0, 0.04, 0.02]} fontSize={0.2} color={zone.color} anchorX="center" fontWeight="bold">
          {unitId}
        </Text>
        <Text position={[0, -0.1, 0.02]} fontSize={0.13} color="#ffffff" anchorX="center" fillOpacity={0.8}>
          {agentName}
        </Text>
      </Billboard>

      {/* Room label on floor */}
      <Text
        position={[0, 0.05, 1.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color={zone.color}
        anchorX="center"
        fillOpacity={0.6}
      >
        {zone.name}
      </Text>

      {/* Point light for zone ambiance */}
      <pointLight color={zone.color} intensity={0.6} distance={5} decay={2} position={[0, 2, -1.2]} />
    </group>
  )
}

// ─── Agent Chat Popup ─────────────────────────────────────────────────────────

function AgentChatPopup({
  agent,
  position,
  onClose,
}: {
  agent: AgentState
  position: [number, number, number]
  onClose: () => void
}) {
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!message.trim()) return
    setLoading(true)
    try {
      const res = await gateway.sendAgentMessage(agent.id, message)
      setReply(res.reply)
      setMessage('')
    } catch (e) {
      setReply('(Agent unavailable)')
    }
    setLoading(false)
  }

  return (
    <Billboard follow position={[position[0], position[1] + 3.2, position[2]]}>
      <Html center transform distanceFactor={6}>
        <div style={{
          background: 'rgba(10,10,30,0.96)',
          border: `1px solid ${BRAND.purple}`,
          borderRadius: 10,
          padding: '12px 16px',
          width: 240,
          boxShadow: `0 0 20px ${BRAND.purple}44`,
          fontFamily: 'monospace',
          color: '#fff',
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: BRAND.purple, fontWeight: 'bold' }}>🤖 {agent.name}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          <div style={{ marginBottom: 6, color: '#94a3b8', fontSize: 11 }}>
            {agent.activity || agent.taskDescription || agent.role}
          </div>
          {reply && (
            <div style={{
              background: 'rgba(139,92,246,0.15)',
              borderRadius: 6,
              padding: '6px 8px',
              marginBottom: 8,
              color: '#c4b5fd',
              fontSize: 11,
              maxHeight: 80,
              overflow: 'auto',
            }}>
              {reply}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Chat with agent..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: 6,
                padding: '5px 8px',
                color: '#fff',
                fontSize: 11,
                outline: 'none',
              }}
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                background: BRAND.purple,
                border: 'none',
                borderRadius: 6,
                padding: '5px 10px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              {loading ? '…' : '→'}
            </button>
          </div>
        </div>
      </Html>
    </Billboard>
  )
}

// ─── Office Shell (walls, ceiling, floor) ────────────────────────────────────

function OfficeShell() {
  const W = 24, D = 18, H = 5

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0d0d1a" roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Floor grid */}
      <Grid position={[0, 0.01, 0]} args={[W, D]}
        cellSize={1} cellThickness={0.3} cellColor="#1a1a3e"
        sectionSize={5.5} sectionThickness={0.5} sectionColor="#2a2a5a"
        fadeDistance={35} fadeStrength={1} />

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#080818" side={THREE.BackSide} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#0c0c22" />
      </mesh>

      {/* Front wall */}
      <mesh position={[0, H / 2, D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#0c0c22" />
      </mesh>

      {/* Side walls */}
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#0c0c22" />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D, H]} />
        <meshStandardMaterial color="#0c0c22" />
      </mesh>

      {/* Neon floor trim — purple */}
      {[
        { pos: [0, 0.02, -D/2+0.01] as [number,number,number], s: [W, 0.04, 0.04] as [number,number,number] },
        { pos: [0, 0.02,  D/2-0.01] as [number,number,number], s: [W, 0.04, 0.04] as [number,number,number] },
        { pos: [-W/2+0.01, 0.02, 0] as [number,number,number], s: [0.04, 0.04, D] as [number,number,number] },
        { pos: [ W/2-0.01, 0.02, 0] as [number,number,number], s: [0.04, 0.04, D] as [number,number,number] },
      ].map((t, i) => (
        <mesh key={i} position={t.pos} scale={t.s}>
          <boxGeometry />
          <meshStandardMaterial color={BRAND.purple} emissive={BRAND.purple} emissiveIntensity={3} />
        </mesh>
      ))}

      {/* Cyan floor trim — middle divider */}
      <mesh position={[0, 0.02, -0.5]} scale={[W, 0.03, 0.03]}>
        <boxGeometry />
        <meshStandardMaterial color={BRAND.cyan} emissive={BRAND.cyan} emissiveIntensity={2} />
      </mesh>

      {/* City windows — back wall */}
      {[-8, -2.5, 3, 8.5].map((x) => (
        <group key={x} position={[x, H / 2 + 0.2, -D / 2 + 0.05]}>
          <mesh>
            <boxGeometry args={[3.2, 3.5, 0.04]} />
            <meshStandardMaterial color="#060e1e" emissive="#061428" emissiveIntensity={0.8} transparent opacity={0.92} />
          </mesh>
          {/* Window frame */}
          {[[-1.6, 0], [1.6, 0]].map(([fx], fi) => (
            <mesh key={fi} position={[fx, 0, 0.03]}>
              <boxGeometry args={[0.06, 3.5, 0.02]} />
              <meshStandardMaterial color={BRAND.cyan} emissive={BRAND.cyan} emissiveIntensity={1.5} />
            </mesh>
          ))}
          {/* City light streaks */}
          {[-1, 0, 1].map((lx) => (
            <mesh key={lx} position={[lx * 0.7, -0.5, 0.03]}>
              <planeGeometry args={[0.04, 2.8]} />
              <meshStandardMaterial color={lx === 0 ? BRAND.cyan : BRAND.purple} emissive={lx === 0 ? BRAND.cyan : BRAND.purple} emissiveIntensity={0.6} transparent opacity={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* PepeClaw neon sign */}
      <group position={[0, H - 0.3, -D / 2 + 0.15]}>
        <Text fontSize={0.55} color={BRAND.purple} anchorX="center" fontWeight="bold" outlineWidth={0.03} outlineColor={BRAND.cyan}>
          PEPECLAW
        </Text>
        <Text position={[0, -0.55, 0]} fontSize={0.22} color={BRAND.cyan} anchorX="center">
          AI OPERATIONS CENTER
        </Text>
      </group>

      {/* Ceiling lights */}
      {[[-7,0],[0,0],[7,0],[-7,-4],[7,-4],[-7,4],[7,4]].map(([x,z],i)=>(
        <group key={i} position={[x, H-0.06, z]}>
          <mesh><boxGeometry args={[1.0,0.08,1.0]}/><meshStandardMaterial color="#b0b0d0" emissive="#b0b0d0" emissiveIntensity={0.5}/></mesh>
          <pointLight color="#e0e0ff" intensity={1.5} distance={9} decay={2}/>
        </group>
      ))}
    </group>
  )
}

// ─── CCTV Overlay HUD ────────────────────────────────────────────────────────

function CCTVCorners() {
  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, fontFamily: 'monospace', fontSize: 11, color: BRAND.cyan, opacity: 0.7 }}>
        ⬛ REC ● LIVE
      </div>
      <div style={{ position: 'absolute', top: 12, right: 12, fontFamily: 'monospace', fontSize: 11, color: BRAND.cyan, opacity: 0.7 }}>
        CAM-01 / OVERVIEW
      </div>
      {/* Corner brackets */}
      {[
        { top: 8, left: 8 },
        { top: 8, right: 8 },
        { bottom: 8, left: 8 },
        { bottom: 8, right: 8 },
      ].map((style, i) => (
        <div key={i} style={{
          position: 'absolute', ...style,
          width: 20, height: 20,
          borderTop: i < 2 ? `2px solid ${BRAND.cyan}` : undefined,
          borderBottom: i >= 2 ? `2px solid ${BRAND.cyan}` : undefined,
          borderLeft: i % 2 === 0 ? `2px solid ${BRAND.cyan}` : undefined,
          borderRight: i % 2 === 1 ? `2px solid ${BRAND.cyan}` : undefined,
          opacity: 0.6,
        }} />
      ))}
    </Html>
  )
}

// ─── Room Picker HUD ─────────────────────────────────────────────────────────

function RoomPickerHUD({
  activeRoom,
  onRoomClick,
}: {
  activeRoom: RoomId | null
  onRoomClick: (zone: typeof ROOM_ZONES[0]) => void
}) {
  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 6,
        pointerEvents: 'all',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '90vw',
      }}>
        {ROOM_ZONES.map(zone => (
          <button
            key={zone.id}
            onClick={() => onRoomClick(zone)}
            style={{
              background: activeRoom === zone.id ? `${zone.color}33` : 'rgba(10,10,30,0.85)',
              border: `1px solid ${activeRoom === zone.id ? zone.color : 'rgba(139,92,246,0.3)'}`,
              color: activeRoom === zone.id ? zone.color : '#94a3b8',
              fontFamily: 'monospace',
              fontSize: 11,
              padding: '5px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeRoom === zone.id ? `0 0 10px ${zone.color}44` : 'none',
            }}
          >
            {zone.name}
          </button>
        ))}
      </div>
    </Html>
  )
}

// ─── Main Scene ───────────────────────────────────────────────────────────────

function Scene({
  agents,
  onRoomChange,
}: {
  agents: AgentState[]
  onRoomChange?: (roomId: RoomId) => void
}) {
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null)
  const [chatAgent, setChatAgent] = useState<AgentState | null>(null)
  const [activeRoom, setActiveRoom] = useState<RoomId | null>(null)
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null)
  const [movingAgents, setMovingAgents] = useState<Set<string>>(new Set())
  const [agentSlots, setAgentSlots] = useState<Record<string, number>>({})
  const [screenshotMode, setScreenshotMode] = useState(false)

  // Screenshot mode — S key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        setScreenshotMode(true)
        // All agents wave
        agents.forEach(a => setSelectedAgent(a))
        setTimeout(() => {
          setSelectedAgent(null)
          setScreenshotMode(false)
        }, 3000)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [agents])

  // Assign agents to room slots on mount
  useEffect(() => {
    const slots: Record<string, number> = {}
    agents.forEach((a, i) => { slots[a.id] = i % AGENT_POSITIONS.length })
    setAgentSlots(slots)
  }, [agents.length])

  // Auto-roam agents
  useEffect(() => {
    if (agents.length < 2) return
    const interval = setInterval(() => {
      const agent = agents[Math.floor(Math.random() * agents.length)]
      if (movingAgents.has(agent.id)) return
      const cur = agentSlots[agent.id] ?? 0
      let next = Math.floor(Math.random() * AGENT_POSITIONS.length)
      while (next === cur) next = Math.floor(Math.random() * AGENT_POSITIONS.length)
      setMovingAgents(p => new Set([...p, agent.id]))
      setAgentSlots(p => ({ ...p, [agent.id]: next }))
      setTimeout(() => setMovingAgents(p => { const s = new Set(p); s.delete(agent.id); return s }), 4000)
    }, 15000 + Math.random() * 10000)
    return () => clearInterval(interval)
  }, [agents, agentSlots, movingAgents])

  const flyToZone = useCallback((zone: typeof ROOM_ZONES[0]) => {
    const [x, , z] = zone.position
    setActiveRoom(zone.id)
    setCameraTarget({
      position: new THREE.Vector3(x, 5, z + 6),
      lookAt: new THREE.Vector3(x, 1, z),
    })
    onRoomChange?.(zone.id)
  }, [onRoomChange])

  const flyToAgent = useCallback((agent: AgentState, slotIdx: number) => {
    const pos = AGENT_POSITIONS[slotIdx] ?? AGENT_POSITIONS[0]
    setSelectedAgent(agent)
    setChatAgent(agent)
    setCameraTarget({
      position: new THREE.Vector3(pos[0] + 2, 3, pos[2] + 4),
      lookAt: new THREE.Vector3(pos[0], 1.5, pos[2]),
    })
  }, [])

  return (
    <>
      <OfficeShell />
      <Stars radius={80} depth={40} count={1000} factor={3} saturation={0.5} fade speed={0.4} />

      {/* Ambient particles */}
      <AmbientParticles />

      {/* Digital rain at edges */}
      <DigitalRain />

      {/* Room zones */}
      {ROOM_ZONES.map((zone, i) => {
        const agent = agents[i]
        const unitId = `UNIT ${String(i + 1).padStart(2, '0')}`
        return (
          <RoomZone
            key={zone.id}
            zone={zone}
            agentName={agent?.name ?? unitId}
            unitId={unitId}
            isActive={activeRoom === zone.id}
            onClick={() => flyToZone(zone)}
          />
        )
      })}

      {/* Holographic room titles */}
      {ROOM_ZONES.map((zone) => (
        <HolographicRoomTitle key={`title-${zone.id}`} zone={zone} position={zone.position} />
      ))}

      {/* Floor holograms */}
      {ROOM_ZONES.map((zone) => (
        <FloorHologram key={`holo-${zone.id}`} position={zone.position} color={zone.color} />
      ))}

      {/* Data streams between desks */}
      <DataStreams positions={ROOM_ZONES.map(z => z.position)} />

      {/* Agents */}
      {agents.slice(0, AGENT_POSITIONS.length).map((agent) => {
        const slotIdx = agentSlots[agent.id] ?? 0
        const pos = AGENT_POSITIONS[slotIdx]
        return (
          <AgentMesh
            key={agent.id}
            agent={agent}
            position={pos}
            isSelected={selectedAgent?.id === agent.id || screenshotMode}
            isMoving={movingAgents.has(agent.id)}
            targetPosition={pos}
            onClick={() => flyToAgent(agent, slotIdx)}
          />
        )
      })}

      {/* Chat popup */}
      {chatAgent && !screenshotMode && (() => {
        const slotIdx = agentSlots[chatAgent.id] ?? 0
        const pos = AGENT_POSITIONS[slotIdx]
        return (
          <AgentChatPopup
            agent={chatAgent}
            position={pos}
            onClose={() => { setChatAgent(null); setSelectedAgent(null) }}
          />
        )
      })()}

      {/* Activity feed ticker */}
      {!screenshotMode && <ActivityFeedHUD agents={agents} />}

      {/* CCTV overlay */}
      {!screenshotMode && <CCTVCorners />}

      {/* Room picker bottom bar */}
      {!screenshotMode && <RoomPickerHUD activeRoom={activeRoom} onRoomClick={flyToZone} />}

      {/* Camera rig */}
      <CameraRig target={cameraTarget} screenshotMode={screenshotMode} />
    </>
  )
}

function AmbientParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 200
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random()-0.5) * 24
      pos[i*3+1] = Math.random() * 5
      pos[i*3+2] = (Math.random()-0.5) * 18
    }
    return pos
  }, [])
  useFrame((_, d) => { if (ref.current) ref.current.rotation.y += d * 0.01 })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={BRAND.purple} transparent opacity={0.5} sizeAttenuation />
    </points>
  )
}

// ─── Digital Rain Effect ──────────────────────────────────────────────────────

function DigitalRain() {
  const rainRef = useRef<THREE.Points>(null)
  const count = 150
  const positions = useMemo(() => new Float32Array(count * 3), [])
  const velocities = useMemo(() => {
    const v = new Float32Array(count)
    for (let i = 0; i < count; i++) v[i] = 0.5 + Math.random() * 1.5
    return v
  }, [])

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 28
      positions[i * 3 + 1] = Math.random() * 6
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22
    }
  }, [positions])

  useFrame((_, delta) => {
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= velocities[i] * delta * 2
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 5.5
        positions[i * 3] = (Math.random() - 0.5) * 28
        positions[i * 3 + 2] = (Math.random() - 0.5) * 22
      }
    }
    if (rainRef.current) {
      rainRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={rainRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color={BRAND.cyan} transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

// ─── Activity Feed Ticker ─────────────────────────────────────────────────────

function ActivityFeedHUD({ agents }: { agents: AgentState[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % agents.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [agents.length])

  const currentAgent = agents[currentIndex]
  if (!currentAgent) return null

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        top: 50,
        right: 16,
        background: 'rgba(10, 10, 30, 0.92)',
        border: `1px solid ${BRAND.purple}`,
        borderRadius: 8,
        padding: '10px 14px',
        maxWidth: 280,
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#e0e0ff',
        boxShadow: `0 0 16px ${BRAND.purple}44`,
      }}>
        <div style={{ color: BRAND.cyan, fontWeight: 'bold', marginBottom: 4 }}>
          🤖 LIVE ACTIVITY FEED
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: BRAND.purple, fontWeight: 'bold' }}>{currentAgent.name}:</span>
          <span style={{ color: '#94a3b8' }}>{currentAgent.activity || currentAgent.role}</span>
        </div>
      </div>
    </Html>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

interface OfficeWorldProps {
  onSelectAgent?: (agent: AgentState | null) => void
  onRoomChange?: (roomId: RoomId) => void
  className?: string
}

export function OfficeWorld({ onRoomChange, className }: OfficeWorldProps) {
  const rawAgents = useAgents()

  const agents = useMemo(() => {
    if (rawAgents && rawAgents.length > 0) return rawAgents
    return Array.from({ length: 8 }, (_, i) => ({
      id: `demo-${i}`,
      name: ['Pepe','Nova','Spark','Blaze','Echo','Nexus','Vega','Kira'][i],
      status: (['working','idle','working','idle','working','idle','working','idle'] as const)[i],
      role: ['Orchestrator','Analyst','Builder','Researcher','Trader','Strategist','Designer','Optimizer'][i],
      currentRoom: ROOM_ZONES[i].id,
      color: [BRAND.purple, BRAND.cyan, BRAND.green, BRAND.amber,'#f87171','#ec4899','#06b6d4','#a78bfa'][i],
      activity: ['Running tasks','Analyzing data','Building features','Deep research','Trading signals','Planning strategy','UI design','Optimizing'][i],
    } as AgentState))
  }, [rawAgents])

  return (
    <Canvas
      className={className}
      camera={{ position: [0, 10, 16], fov: 52, near: 0.1, far: 300 }}
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ background: '#0a0a18' }}
    >
      <ambientLight intensity={0.25} color="#1a1a4a" />
      <directionalLight
        position={[8, 14, 8]} intensity={0.7} color="#e8e8ff"
        castShadow shadow-mapSize={[2048,2048]}
        shadow-camera-far={60} shadow-camera-left={-18}
        shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18}
      />
      <pointLight position={[-10, 4, 0]} color={BRAND.purple} intensity={2} distance={14} decay={2} />
      <pointLight position={[10, 4, 0]} color={BRAND.cyan}   intensity={2} distance={14} decay={2} />

      <Suspense fallback={null}>
        <Scene agents={agents} onRoomChange={onRoomChange} />
        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0005, 0.0005] as any}
          />
          <Vignette eskil={false} offset={0.15} darkness={0.7} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
