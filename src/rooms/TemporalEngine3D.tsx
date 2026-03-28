import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import * as THREE from 'three';

function TimelineRiver() {
  const ref = useRef<THREE.Points>(null);
  const time = useRef(0);

  const positions = useMemo(() => {
    const count = 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * 20 - 10;
      pos[i * 3] = t;
      pos[i * 3 + 1] = Math.sin(t * 0.5) * 0.5;
      pos[i * 3 + 2] = Math.cos(t * 0.3) * 1.5;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    time.current += delta;
    if (ref.current) {
      const posArray = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < posArray.length / 3; i++) {
        const t = (i / (posArray.length / 3)) * 20 - 10;
        posArray[i * 3 + 1] = Math.sin(t * 0.5 + time.current) * 0.5;
        posArray[i * 3 + 2] = Math.cos(t * 0.3 + time.current * 0.5) * 1.5;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#fbbf24" transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

function Hourglass3D() {
  const topRef = useRef<THREE.Mesh>(null);
  const botRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
    if (topRef.current && botRef.current) {
      const t = performance.now() * 0.001;
      const topScale = 0.5 + Math.sin(t) * 0.3;
      const botScale = 1.0 - Math.sin(t) * 0.3;
      topRef.current.scale.setScalar(Math.max(0.2, topScale));
      botRef.current.scale.setScalar(Math.max(0.2, botScale));
    }
  });

  return (
    <group ref={groupRef}>
      {/* Top cone */}
      <mesh position={[0, 1, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.8, 1.5, 8]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} wireframe />
      </mesh>
      {/* Bottom cone */}
      <mesh position={[0, -1, 0]}>
        <coneGeometry args={[0.8, 1.5, 8]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} wireframe />
      </mesh>
      {/* Sand particles top */}
      <mesh ref={topRef} position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.0} transparent opacity={0.8} />
      </mesh>
      {/* Sand particles bottom */}
      <mesh ref={botRef} position={[0, -0.8, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.0} transparent opacity={0.8} />
      </mesh>
      {/* Center stream */}
      <mesh>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function TimeMarker({ hour, label, color, position }: { hour: number; label: string; color: string; position: [number, number, number] }) {
  return (
    <Float speed={1} floatIntensity={0.15}>
      <group position={position}>
        {/* Marker post */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.1, 2, 0.1]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} transparent opacity={0.7} />
        </mesh>
        {/* Top sphere */}
        <mesh position={[0, 1.1, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
        <Text position={[0, 1.5, 0]} fontSize={0.12} color={color} anchorX="center" font={undefined}>
          T+{hour}h
        </Text>
        <Text position={[0, -1.3, 0]} fontSize={0.09} color="#64748b" anchorX="center" maxWidth={2} font={undefined}>
          {label}
        </Text>
      </group>
    </Float>
  );
}

function TemporalParticles() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 120;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) {
      const posArray = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < posArray.length / 3; i++) {
        posArray[i * 3] -= delta * 0.5;
        if (posArray[i * 3] < -8) posArray[i * 3] = 8;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#f59e0b" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export function TemporalEngine3D() {
  const markers = [
    { hour: 0, label: 'CI/CD Pipeline', color: '#6366f1' },
    { hour: 3, label: 'Auth Service', color: '#8b5cf6' },
    { hour: 5, label: 'Rate Limiting', color: '#3b82f6' },
    { hour: 8, label: 'NOW', color: '#06b6d4' },
    { hour: 10, label: 'Notifications', color: '#f59e0b' },
    { hour: 12, label: 'Search Index', color: '#ef4444' },
  ];

  return (
    <group>
      <Text position={[0, 4.5, 0]} fontSize={0.5} color="#f59e0b" anchorX="center" font={undefined}>
        TEMPORAL ENGINE
      </Text>
      <Text position={[0, 4.0, 0]} fontSize={0.18} color="#666" anchorX="center" font={undefined}>
        Time Optimization & Scheduling
      </Text>

      {/* Central hourglass */}
      <group position={[0, 1.5, 0]}>
        <Hourglass3D />
      </group>

      <TimelineRiver />
      <TemporalParticles />

      {/* Time markers along the river */}
      {markers.map((m, i) => (
        <TimeMarker
          key={m.hour}
          hour={m.hour}
          label={m.label}
          color={m.color}
          position={[(i - 2.5) * 2.5, -1.5, 2]}
        />
      ))}

      {/* Lighting */}
      <pointLight position={[0, 5, 0]} color="#f59e0b" intensity={3} distance={20} />
      <pointLight position={[-5, 2, 0]} color="#6366f1" intensity={2} distance={15} />
      <pointLight position={[5, 2, 0]} color="#f97316" intensity={2} distance={15} />
    </group>
  );
}
