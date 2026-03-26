import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import * as THREE from 'three';

function ArenaPodium({ position, color, label }: { position: [number, number, number]; color: string; label: string }) {
  return (
    <group position={position}>
      {/* Podium base */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[1.2, 1.4, 0.3, 16]} />
        <meshStandardMaterial color="#1a1b2e" emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {/* Podium column */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 1.8, 8]} />
        <meshStandardMaterial color="#12131f" emissive={color} emissiveIntensity={0.1} />
      </mesh>
      {/* Podium top */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.8, 0.3, 0.2, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.8} />
      </mesh>
      {/* Glow ring */}
      <mesh position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.03, 8, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <Text position={[0, -1.0, 1.2]} fontSize={0.2} color={color} anchorX="center" font={undefined}>
        {label}
      </Text>
    </group>
  );
}

function ArgumentBeams() {
  const ref = useRef<THREE.Group>(null);
  const time = useRef(0);

  const beams = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      y: -1 + (i / 7) * 3,
      speed: 1 + Math.random() * 2,
      color: i % 2 === 0 ? '#ef4444' : '#3b82f6',
      offset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((_, delta) => {
    time.current += delta;
    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        const beam = beams[i];
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.15 + Math.sin(time.current * beam.speed + beam.offset) * 0.15;
      });
    }
  });

  return (
    <group ref={ref}>
      {beams.map((beam, i) => (
        <mesh key={i} position={[0, beam.y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 8, 4]} />
          <meshBasicMaterial color={beam.color} transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function ArenaParticles() {
  const ref = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      const isRed = Math.random() > 0.5;
      col[i * 3] = isRed ? 0.94 : 0.23;
      col[i * 3 + 1] = isRed ? 0.27 : 0.51;
      col[i * 3 + 2] = isRed ? 0.27 : 0.96;
    }
    return [pos, col];
  }, []);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.05;
      const posArray = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < posArray.length / 3; i++) {
        posArray[i * 3 + 1] += delta * 0.2;
        if (posArray[i * 3 + 1] > 4) posArray[i * 3 + 1] = -4;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export function RedTeamArena3D() {
  return (
    <group>
      <Text position={[0, 4.5, 0]} fontSize={0.5} color="#f87171" anchorX="center" font={undefined}>
        RED TEAM ARENA
      </Text>
      <Text position={[0, 4.0, 0]} fontSize={0.18} color="#666" anchorX="center" font={undefined}>
        Adversarial Debate Visualization
      </Text>

      {/* Arena floor - octagonal ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0]}>
        <circleGeometry args={[5, 8]} />
        <meshStandardMaterial color="#12131f" emissive="#8b5cf6" emissiveIntensity={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.68, 0]}>
        <ringGeometry args={[4.8, 5, 8]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
      </mesh>

      {/* Podiums */}
      <ArenaPodium position={[-3, 0, 0]} color="#ef4444" label="ATTACKER" />
      <ArenaPodium position={[3, 0, 0]} color="#3b82f6" label="DEFENDER" />

      {/* VS indicator */}
      <Float speed={1.5} floatIntensity={0.3}>
        <mesh position={[0, 1.5, 0]}>
          <octahedronGeometry args={[0.4]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.6} wireframe />
        </mesh>
        <Text position={[0, 1.5, 0]} fontSize={0.2} color="#fff" anchorX="center" font={undefined}>
          VS
        </Text>
      </Float>

      <ArgumentBeams />
      <ArenaParticles />

      {/* Lighting */}
      <pointLight position={[-4, 4, 2]} color="#ef4444" intensity={2} distance={15} />
      <pointLight position={[4, 4, 2]} color="#3b82f6" intensity={2} distance={15} />
      <pointLight position={[0, 5, 0]} color="#8b5cf6" intensity={1} distance={12} />
    </group>
  );
}
