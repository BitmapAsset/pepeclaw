import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { activityToEmotion, emotionColors, type EmotionState } from '../data/mockData';

export type AgentActivity = 'examining' | 'meditating' | 'strategizing' | 'debating' | 'studying' | 'managing' | 'verifying' | 'breeding';

export interface Agent3DProps {
  name: string;
  color: string;
  status: 'working' | 'idle' | 'break';
  position: [number, number, number];
  activity?: AgentActivity;
}

const statusRingColors: Record<string, string> = {
  working: '#22c55e',
  idle: '#f59e0b',
  break: '#64748b',
};

function EmotionAura({ emotion, radius = 0.55 }: { emotion: EmotionState; radius?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const time = useRef(Math.random() * 100);
  const auraColor = emotionColors[emotion];

  // Stressed = faster pulsing
  const speed = emotion === 'stressed' ? 3.5 : emotion === 'curious' ? 2.0 : 1.2;

  useFrame((_, delta) => {
    time.current += delta;
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(time.current * speed) * 0.06;
      ref.current.scale.setScalar(1 + Math.sin(time.current * speed * 0.5) * 0.08);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial color={auraColor} transparent opacity={0.1} depthWrite={false} />
    </mesh>
  );
}

export function Agent3D({ name, color, status, position, activity }: Agent3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(Math.random() * 100);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);

  const emotion: EmotionState = activity ? (activityToEmotion[activity] ?? 'focused') : 'focused';
  const animSpeed = emotion === 'stressed' ? 1.6 : emotion === 'curious' ? 1.2 : 1.0;
  const baseY = position[1];

  useFrame((_, delta) => {
    time.current += delta * animSpeed;
    const t = time.current;

    if (!groupRef.current) return;

    // Idle bob
    groupRef.current.position.y = baseY + Math.sin(t * 1.5) * 0.05;

    // Subtle body sway
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;

    // Arm animations based on activity
    if (armLRef.current && armRRef.current) {
      if (activity === 'examining' || activity === 'studying') {
        armLRef.current.rotation.x = -0.4 + Math.sin(t * 2) * 0.15;
        armRRef.current.rotation.x = -0.4 + Math.sin(t * 2 + 1) * 0.15;
      } else if (activity === 'meditating') {
        armLRef.current.rotation.z = 0.5 + Math.sin(t * 0.8) * 0.1;
        armRRef.current.rotation.z = -0.5 - Math.sin(t * 0.8) * 0.1;
        armLRef.current.rotation.x = 0;
        armRRef.current.rotation.x = 0;
      } else if (activity === 'debating') {
        armLRef.current.rotation.x = -0.3 + Math.sin(t * 3) * 0.3;
        armRRef.current.rotation.x = -0.3 + Math.sin(t * 3 + 2) * 0.3;
      } else {
        armLRef.current.rotation.x = Math.sin(t * 1.2) * 0.1;
        armRRef.current.rotation.x = Math.sin(t * 1.2 + Math.PI) * 0.1;
      }
    }
  });

  const materialProps = useMemo(() => ({
    color,
    emissive: color,
    emissiveIntensity: 0.3,
    roughness: 0.6,
    metalness: 0.2,
  }), [color]);

  return (
    <group ref={groupRef} position={position}>
      {/* Status ring under feet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
        <torusGeometry args={[0.35, 0.04, 8, 24]} />
        <meshStandardMaterial
          color={statusRingColors[status]}
          emissive={statusRingColors[status]}
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Body - capsule (cylinder + 2 spheres) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.5, 8]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* Head */}
      <Float speed={2} rotationIntensity={0.02} floatIntensity={0.05}>
        <mesh position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.05, 0.47, 0.13]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.05, 0.47, 0.13]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </Float>

      {/* Left arm */}
      <group ref={armLRef} position={[-0.22, 0.1, 0]}>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3, 6]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      </group>

      {/* Right arm */}
      <group ref={armRRef} position={[0.22, 0.1, 0]}>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3, 6]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      </group>

      {/* Left leg */}
      <mesh position={[-0.08, -0.45, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.35, 6]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* Right leg */}
      <mesh position={[0.08, -0.45, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.35, 6]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* Name tag */}
      <Html
        position={[0, 0.8, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(10,11,20,0.85)',
            border: `1px solid ${color}`,
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 10,
            fontFamily: 'monospace',
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            boxShadow: `0 0 8px ${color}44`,
          }}
        >
          {name}
          <span style={{ marginLeft: 4, fontSize: 8, color: statusRingColors[status] }}>
            {status === 'working' ? '●' : status === 'idle' ? '○' : '◌'}
          </span>
        </div>
      </Html>

      {/* Emotion aura */}
      <EmotionAura emotion={emotion} />

      {/* Subtle point light per agent */}
      <pointLight color={color} intensity={0.3} distance={3} />
    </group>
  );
}
