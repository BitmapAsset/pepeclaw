import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Float, Html } from '@react-three/drei'
import * as THREE from 'three'
import { dreamNodes } from '../data/mockData'

/* ── Starfield ──────────────────────────────────────────────── */
function Starfield() {
  const ref = useRef<THREE.Points>(null)

  const [positions, colors] = useMemo(() => {
    const count = 500
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30
      const c = new THREE.Color().setHSL(0.6 + Math.random() * 0.3, 0.5, 0.5 + Math.random() * 0.5)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return [pos, col]
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02
      ref.current.rotation.x += delta * 0.01
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.2} vertexColors transparent opacity={1.0} sizeAttenuation />
    </points>
  )
}

/* ── Aurora ──────────────────────────────────────────────────── */
function AuroraPlane() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const shaderData = useMemo(() => ({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float wave1 = sin(vUv.x * 4.0 + uTime * 0.5) * 0.5 + 0.5;
        float wave2 = sin(vUv.x * 6.0 - uTime * 0.3 + 2.0) * 0.5 + 0.5;
        float wave3 = sin(vUv.y * 3.0 + uTime * 0.2) * 0.5 + 0.5;
        float mask = smoothstep(0.3, 0.7, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
        vec3 color1 = vec3(0.3, 0.0, 0.8);
        vec3 color2 = vec3(0.0, 0.8, 0.6);
        vec3 color3 = vec3(0.5, 0.0, 1.0);
        vec3 col = mix(color1, color2, wave1) + color3 * wave2 * 0.3;
        float alpha = mask * (wave1 * 0.3 + wave3 * 0.2) * 0.4;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  }), [])

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <mesh position={[0, 5, -8]} rotation={[0.3, 0, 0]}>
      <planeGeometry args={[25, 10, 1, 1]} />
      <shaderMaterial ref={materialRef} {...shaderData} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

/* ── Connection Line ────────────────────────────────────────── */
function ConnectionLine({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  const time = useRef(Math.random() * 100)

  const { midPoint, length, rotation } = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const mid = start.clone().add(end).multiplyScalar(0.5)
    const dir = end.clone().sub(start)
    const len = dir.length()
    const quat = new THREE.Quaternion()
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    const rot = new THREE.Euler().setFromQuaternion(quat)
    return { midPoint: mid, length: len, rotation: rot }
  }, [from, to])

  useFrame((_, delta) => {
    time.current += delta
    if (ref.current) {
      const material = ref.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.15 + Math.sin(time.current * 2) * 0.1
    }
  })

  return (
    <mesh ref={ref} position={midPoint} rotation={rotation}>
      <cylinderGeometry args={[0.015, 0.015, length, 4]} />
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.4} />
    </mesh>
  )
}

/* ── Dream Node ─────────────────────────────────────────────── */
function DreamNodeSphere({ node, floatSpeed }: { node: typeof dreamNodes[0]; floatSpeed: number }) {
  return (
    <Float speed={floatSpeed} rotationIntensity={0.05} floatIntensity={0.5}>
      <group position={[node.x, node.y, node.z]}>
        <mesh>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={1.5} transparent opacity={1.0} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.2} />
        </mesh>
        <Text position={[0, 0.55, 0]} fontSize={0.15} color="#c4b5fd" anchorX="center" maxWidth={2.5} font={undefined}>
          {node.title}
        </Text>
        {node.entry && (
          <group position={[0, -0.5, 0]}>
            <mesh>
              <planeGeometry args={[2.2, 0.6]} />
              <meshStandardMaterial color="#1a1030" transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
            <Text position={[0, 0, 0.01]} fontSize={0.08} color="#9ca3af" anchorX="center" maxWidth={2} font={undefined}>
              {node.entry}
            </Text>
          </group>
        )}
        <pointLight color="#8b5cf6" intensity={0.5} distance={3} />
      </group>
    </Float>
  )
}

/* ── Memory Palace ──────────────────────────────────────────── */
interface MemoryRoom {
  id: string
  category: string
  color: string
  position: [number, number, number]
  items: { name: string; type: 'conversation' | 'task' | 'fact' }[]
}

const memoryRooms: MemoryRoom[] = [
  {
    id: 'mr1', category: 'Conversations', color: '#a855f7',
    position: [-6, -3, 5],
    items: [
      { name: 'Architecture debate', type: 'conversation' },
      { name: 'Bug triage session', type: 'conversation' },
      { name: 'Sprint planning', type: 'conversation' },
    ],
  },
  {
    id: 'mr2', category: 'Tasks', color: '#06b6d4',
    position: [0, -3, 7],
    items: [
      { name: 'Deploy pipeline', type: 'task' },
      { name: 'Code review #47', type: 'task' },
      { name: 'Fix auth flow', type: 'task' },
    ],
  },
  {
    id: 'mr3', category: 'Learned Facts', color: '#22c55e',
    position: [6, -3, 5],
    items: [
      { name: 'React concurrent mode', type: 'fact' },
      { name: 'WebSocket best practices', type: 'fact' },
      { name: 'Database indexing', type: 'fact' },
    ],
  },
]

function MemoryPalaceRoom({ room }: { room: MemoryRoom }) {
  const ref = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const time = useRef(Math.random() * 100)

  useFrame((_, delta) => {
    time.current += delta
    if (ref.current) {
      ref.current.rotation.y = Math.sin(time.current * 0.3) * 0.05
    }
  })

  return (
    <group ref={ref} position={room.position}>
      {/* Room floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial
          color={room.color}
          emissive={room.color}
          emissiveIntensity={hovered ? 0.4 : 0.15}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Room walls (wireframe) */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[3, 2, 3]} />
        <meshBasicMaterial color={room.color} wireframe transparent opacity={hovered ? 0.3 : 0.1} />
      </mesh>

      {/* Room label */}
      <Text position={[0, 2.3, 0]} fontSize={0.18} color={room.color} anchorX="center" font={undefined}>
        {room.category}
      </Text>

      {/* Memory items as floating objects */}
      {room.items.map((item, i) => {
        const itemX = (i - 1) * 0.8
        const shape = item.type === 'conversation' ? 'sphere' : item.type === 'task' ? 'box' : 'octahedron'
        return (
          <Float key={item.name} speed={1.2 + i * 0.3} floatIntensity={0.2}>
            <group position={[itemX, 0.8 + i * 0.3, 0]}>
              <mesh>
                {shape === 'sphere' && <sphereGeometry args={[0.12, 8, 8]} />}
                {shape === 'box' && <boxGeometry args={[0.2, 0.2, 0.2]} />}
                {shape === 'octahedron' && <octahedronGeometry args={[0.12]} />}
                <meshStandardMaterial
                  color={room.color}
                  emissive={room.color}
                  emissiveIntensity={0.6}
                  transparent
                  opacity={0.8}
                />
              </mesh>
              <Text position={[0, 0.25, 0]} fontSize={0.07} color="#94a3b8" anchorX="center" font={undefined}>
                {item.name}
              </Text>
            </group>
          </Float>
        )
      })}

      {/* Hover info */}
      {hovered && (
        <Html position={[0, 2.8, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(10,11,20,0.9)',
            border: `1px solid ${room.color}`,
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 8,
            fontFamily: 'monospace',
            color: '#d1d5db',
            whiteSpace: 'nowrap',
          }}>
            {room.items.length} memories stored
          </div>
        </Html>
      )}

      <pointLight position={[0, 1, 0]} color={room.color} intensity={0.5} distance={4} />
    </group>
  )
}

function MemoryPalace() {
  return (
    <group>
      <Text position={[0, -1.5, 8]} fontSize={0.25} color="#c4b5fd" anchorX="center" font={undefined}>
        MEMORY PALACE
      </Text>
      <Text position={[0, -1.9, 8]} fontSize={0.1} color="#555" anchorX="center" font={undefined}>
        Walkable rooms of stored memories
      </Text>

      {memoryRooms.map(room => (
        <MemoryPalaceRoom key={room.id} room={room} />
      ))}

      {/* Connecting paths between rooms */}
      {memoryRooms.length > 1 && memoryRooms.slice(0, -1).map((room, i) => {
        const next = memoryRooms[i + 1]
        const mid: [number, number, number] = [
          (room.position[0] + next.position[0]) / 2,
          room.position[1],
          (room.position[2] + next.position[2]) / 2,
        ]
        return (
          <mesh key={room.id} rotation={[-Math.PI / 2, 0, 0]} position={mid}>
            <planeGeometry args={[0.2, 3]} />
            <meshBasicMaterial color="#8b5cf6" transparent opacity={0.1} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ── Main Export ─────────────────────────────────────────────── */
export function DreamChamber() {
  const nodeMap = useMemo(() => {
    const map: Record<string, [number, number, number]> = {}
    dreamNodes.forEach(n => { map[n.id] = [n.x, n.y, n.z] })
    return map
  }, [])

  const connections = useMemo(() => {
    const seen = new Set<string>()
    const conns: { from: [number, number, number]; to: [number, number, number] }[] = []
    dreamNodes.forEach(node => {
      node.connections.forEach(targetId => {
        const key = [node.id, targetId].sort().join('-')
        if (!seen.has(key) && nodeMap[targetId]) {
          seen.add(key)
          conns.push({ from: [node.x, node.y, node.z], to: nodeMap[targetId] })
        }
      })
    })
    return conns
  }, [nodeMap])

  const floatSpeeds = useMemo(
    () => dreamNodes.map(() => 0.8 + Math.random()),
    [],
  )

  return (
    <group>
      <Starfield />
      <AuroraPlane />

      <Text position={[0, 6, 0]} fontSize={0.5} color="#8b5cf6" anchorX="center" font={undefined}>
        DREAM CHAMBER
      </Text>
      <Text position={[0, 5.5, 0]} fontSize={0.18} color="#666" anchorX="center" font={undefined}>
        Creative Exploration & Synthesis
      </Text>

      {connections.map((conn, i) => (
        <ConnectionLine key={i} from={conn.from} to={conn.to} />
      ))}

      {dreamNodes.map((node, i) => (
        <DreamNodeSphere key={node.id} node={node} floatSpeed={floatSpeeds[i]} />
      ))}

      {/* Memory Palace — walkable rooms */}
      <MemoryPalace />

      {/* Ethereal lighting */}
      <pointLight position={[0, 5, 0]} color="#6d28d9" intensity={3} distance={20} />
      <pointLight position={[-5, -2, 3]} color="#0ea5e9" intensity={1.5} distance={15} />
      <pointLight position={[4, 2, -3]} color="#a855f7" intensity={1.5} distance={15} />
    </group>
  )
}
