import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import * as THREE from 'three';

function Brain() {
  const groupRef = useRef<THREE.Group>(null);
  const pathwayRefs = useRef<THREE.Mesh[]>([]);
  const nodeRefs = useRef<THREE.Mesh[]>([]);
  const firingRef = useRef<number[]>([]);

  // Generate brain-like node network
  const { nodes, connections } = useMemo(() => {
    const nodeCount = 40;
    const ns: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / nodeCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.8 + (Math.random() - 0.5) * 0.4;
      ns.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) * 0.8,
        r * Math.sin(phi) * Math.sin(theta),
      ));
    }
    const conns: [number, number][] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (ns[i].distanceTo(ns[j]) < 1.2) {
          conns.push([i, j]);
        }
      }
    }
    // Initialize firing timers
    firingRef.current = ns.map(() => Math.random() * 5);
    return { nodes: ns, connections: conns };
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
    const t = performance.now() * 0.001;

    // Fire neurons — random neurons light up brightly then fade
    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      firingRef.current[i] -= delta;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (firingRef.current[i] <= 0) {
        // Neuron fires!
        firingRef.current[i] = 2 + Math.random() * 4; // next fire in 2-6s
        mat.emissiveIntensity = 4.0;
        mesh.scale.setScalar(1.8);
      } else if (firingRef.current[i] < 0.5) {
        // About to fire — building up
        const buildup = 1 - firingRef.current[i] / 0.5;
        mat.emissiveIntensity = 1.5 + buildup * 2;
        mesh.scale.setScalar(1 + buildup * 0.5);
      } else {
        // Cooling down
        mat.emissiveIntensity = Math.max(1.5, mat.emissiveIntensity - delta * 4);
        mesh.scale.setScalar(Math.max(1, mesh.scale.x - delta * 2));
      }
    });

    // Pulse neural pathways with signal propagation
    pathwayRefs.current.forEach((mesh, i) => {
      if (mesh) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const wave = Math.sin(t * 3 + i * 0.8) * 0.5 + 0.5;
        mat.opacity = 0.1 + wave * 0.3;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {/* Brain nodes — firing neurons */}
      {nodes.map((pos, i) => (
        <mesh key={i} position={pos} ref={el => { if (el) nodeRefs.current[i] = el; }}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color="#06b6d4"
            emissive="#06b6d4"
            emissiveIntensity={1.5}
          />
        </mesh>
      ))}

      {/* Neural connections */}
      {connections.map(([a, b], i) => {
        const start = nodes[a];
        const end = nodes[b];
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const dir = end.clone().sub(start);
        const len = dir.length();
        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());

        return (
          <mesh
            key={i}
            ref={el => { if (el) pathwayRefs.current[i] = el; }}
            position={mid}
            quaternion={quat}
          >
            <cylinderGeometry args={[0.012, 0.012, len, 4]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.4} />
          </mesh>
        );
      })}

      {/* Brain core glow — pulsing */}
      <mesh>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.12} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.3} transparent opacity={0.15} />
      </mesh>
      {/* Inner core light */}
      <pointLight color="#06b6d4" intensity={1.5} distance={4} />
    </group>
  );
}

function LearningParticles() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 150;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.5 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y -= delta * 0.1;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#06b6d4" transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

function CapabilityRing({ label, value, angle, color }: { label: string; value: number; angle: number; color: string }) {
  const r = 3.5;
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;

  return (
    <Float speed={1} floatIntensity={0.2}>
      <group position={[x, -1, z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.35, 0.04, 8, 24, (value / 100) * Math.PI * 2]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.35, 0.03, 8, 24]} />
          <meshBasicMaterial color="#2a2b3d" transparent opacity={0.3} />
        </mesh>
        <Text position={[0, 0.05, 0]} fontSize={0.15} color={color} anchorX="center" font={undefined}>
          {value}
        </Text>
        <Text position={[0, -0.2, 0]} fontSize={0.09} color="#64748b" anchorX="center" font={undefined}>
          {label}
        </Text>
      </group>
    </Float>
  );
}

export function MetaLearning3D() {
  const capabilities = [
    { axis: 'Reasoning', current: 82 },
    { axis: 'Code Gen', current: 88 },
    { axis: 'Planning', current: 71 },
    { axis: 'Debugging', current: 76 },
    { axis: 'Learning', current: 65 },
    { axis: 'Comm', current: 90 },
  ];

  return (
    <group>
      <Text position={[0, 4.5, 0]} fontSize={0.5} color="#06b6d4" anchorX="center" font={undefined}>
        META-LEARNING CENTER
      </Text>
      <Text position={[0, 4.0, 0]} fontSize={0.18} color="#666" anchorX="center" font={undefined}>
        Self-Improvement Dashboard
      </Text>

      <group position={[0, 1, 0]}>
        <Brain />
      </group>

      <LearningParticles />

      {capabilities.map((cap, i) => (
        <CapabilityRing
          key={cap.axis}
          label={cap.axis}
          value={cap.current}
          angle={(i / capabilities.length) * Math.PI * 2}
          color="#06b6d4"
        />
      ))}

      {/* Lighting */}
      <pointLight position={[0, 4, 0]} color="#06b6d4" intensity={3} distance={20} />
      <pointLight position={[-3, 0, 3]} color="#8b5cf6" intensity={2} distance={15} />
      <pointLight position={[3, 0, -3]} color="#0ea5e9" intensity={2} distance={15} />
    </group>
  );
}
