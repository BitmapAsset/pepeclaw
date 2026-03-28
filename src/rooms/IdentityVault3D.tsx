import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

function VaultDoor() {
  const ref = useRef<THREE.Group>(null);
  const gearRef = useRef<THREE.Group>(null);
  const innerGearRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    if (gearRef.current) {
      gearRef.current.rotation.z -= delta * 0.5;
    }
    if (innerGearRef.current) {
      innerGearRef.current.rotation.z += delta * 0.8;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 1.5 + Math.sin(performance.now() * 0.0015) * 0.8;
    }
  });

  return (
    <group ref={ref} position={[0, 0, -4]}>
      {/* Door frame */}
      <mesh>
        <boxGeometry args={[5, 5, 0.3]} />
        <meshStandardMaterial color="#1a1b2e" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Door surface */}
      <mesh position={[0, 0, 0.2]}>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial color="#12131f" metalness={0.9} roughness={0.2} emissive="#f97316" emissiveIntensity={0.35} />
      </mesh>
      {/* Outer gear mechanism */}
      <group ref={gearRef} position={[0, 0, 0.3]}>
        <mesh>
          <torusGeometry args={[1.5, 0.08, 8, 32]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.0} metalness={0.8} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.75, Math.sin(angle) * 0.75, 0]} rotation={[0, 0, angle]}>
              <boxGeometry args={[1.5, 0.06, 0.06]} />
              <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.7} metalness={0.7} />
            </mesh>
          );
        })}
      </group>
      {/* Inner counter-rotating gear */}
      <group ref={innerGearRef} position={[0, 0, 0.35]}>
        <mesh>
          <torusGeometry args={[0.8, 0.05, 8, 24]} />
          <meshStandardMaterial color="#ea580c" emissive="#ea580c" emissiveIntensity={1.2} metalness={0.8} />
        </mesh>
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 0]} rotation={[0, 0, angle]}>
              <boxGeometry args={[0.8, 0.04, 0.04]} />
              <meshStandardMaterial color="#ea580c" emissive="#ea580c" emissiveIntensity={0.6} metalness={0.7} />
            </mesh>
          );
        })}
      </group>
      {/* Pulsing glow */}
      <pointLight ref={glowRef} position={[0, 0, 1]} color="#f97316" intensity={1.5} distance={8} />
    </group>
  );
}

function IdentityCard({ name, fitness, verified, index }: { name: string; fitness: number; verified: boolean; index: number }) {
  const angle = (index / 3) * Math.PI * 0.6 - Math.PI * 0.3;
  const r = 3;
  const x = Math.sin(angle) * r;
  const z = Math.cos(angle) * r;

  return (
    <Float speed={1.2} floatIntensity={0.3}>
      <group position={[x, 0.5 + index * 0.3, z]} rotation={[0, -angle, 0]}>
        <RoundedBox args={[1.8, 2.4, 0.1]} radius={0.06}>
          <meshStandardMaterial color="#12131f" emissive="#f97316" emissiveIntensity={0.05} transparent opacity={0.9} />
        </RoundedBox>

        {/* Border glow */}
        <RoundedBox args={[1.85, 2.45, 0.08]} radius={0.06} position={[0, 0, -0.02]}>
          <meshBasicMaterial color={verified ? '#22c55e' : '#f97316'} transparent opacity={0.15} />
        </RoundedBox>

        {/* Avatar circle */}
        <mesh position={[0, 0.5, 0.06]}>
          <circleGeometry args={[0.35, 16]} />
          <meshStandardMaterial color={verified ? '#22c55e' : '#f97316'} emissive={verified ? '#22c55e' : '#f97316'} emissiveIntensity={0.4} />
        </mesh>

        <Text position={[0, 0, 0.06]} fontSize={0.14} color="#fff" anchorX="center" font={undefined}>
          {name}
        </Text>

        {/* Fitness bar bg */}
        <mesh position={[0, -0.3, 0.06]}>
          <planeGeometry args={[1.3, 0.1]} />
          <meshBasicMaterial color="#2a2b3d" />
        </mesh>
        {/* Fitness bar fill */}
        <mesh position={[-(1.3 * (1 - fitness / 100)) / 2, -0.3, 0.07]}>
          <planeGeometry args={[1.3 * (fitness / 100), 0.1]} />
          <meshBasicMaterial color={verified ? '#22c55e' : '#f97316'} />
        </mesh>

        <Text position={[0, -0.5, 0.06]} fontSize={0.09} color="#64748b" anchorX="center" font={undefined}>
          Fitness: {fitness}%
        </Text>

        {/* Status badge */}
        <Text position={[0, -0.7, 0.06]} fontSize={0.1} color={verified ? '#22c55e' : '#f97316'} anchorX="center" font={undefined}>
          {verified ? 'VERIFIED' : 'UNMINTED'}
        </Text>
      </group>
    </Float>
  );
}

function VaultParticles() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 100;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.03;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#f97316" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export function IdentityVault3D() {
  const agents = [
    { name: 'Alpha', fitness: 92, verified: true },
    { name: 'Beta', fitness: 78, verified: false },
    { name: 'Gamma', fitness: 73, verified: false },
  ];

  return (
    <group>
      <Text position={[0, 4.5, 0]} fontSize={0.5} color="#f97316" anchorX="center" font={undefined}>
        IDENTITY VAULT
      </Text>
      <Text position={[0, 4.0, 0]} fontSize={0.18} color="#666" anchorX="center" font={undefined}>
        Bitcoin-Verified Agent DNA
      </Text>

      <VaultDoor />

      {agents.map((agent, i) => (
        <IdentityCard key={agent.name} name={agent.name} fitness={agent.fitness} verified={agent.verified} index={i} />
      ))}

      <VaultParticles />

      {/* Lighting */}
      <pointLight position={[0, 4, 2]} color="#f97316" intensity={3} distance={20} />
      <pointLight position={[-3, 1, 3]} color="#f59e0b" intensity={1.5} distance={15} />
      <pointLight position={[3, 1, 3]} color="#ea580c" intensity={1.5} distance={15} />
    </group>
  );
}
