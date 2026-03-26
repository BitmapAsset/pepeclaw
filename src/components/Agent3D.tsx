import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { activityToEmotion, emotionColors, type EmotionState } from '../data/mockData';

export type AgentActivity =
  | 'examining' | 'meditating' | 'strategizing' | 'debating'
  | 'studying' | 'managing' | 'verifying' | 'breeding'
  | 'typing' | 'walking' | 'meeting' | 'browsing' | 'frustrated';

// Extended emotion mapping for new activities
const extendedActivityToEmotion: Record<string, EmotionState> = {
  ...activityToEmotion,
  typing: 'focused',
  walking: 'satisfied',
  meeting: 'curious',
  browsing: 'curious',
  frustrated: 'stressed',
};

export interface Agent3DProps {
  name: string;
  color: string;
  status: 'working' | 'idle' | 'break';
  position: [number, number, number];
  activity?: AgentActivity;
  taskDescription?: string;
  hasError?: boolean;
}

const statusRingColors: Record<string, string> = {
  working: '#22c55e',
  idle: '#f59e0b',
  break: '#64748b',
};

function EmotionAura({ emotion, radius = 0.55, hasError }: { emotion: EmotionState; radius?: number; hasError?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const time = useRef(Math.random() * 100);
  const auraColor = hasError ? '#ef4444' : emotionColors[emotion];

  const speed = hasError ? 5.0 : emotion === 'stressed' ? 3.5 : emotion === 'curious' ? 2.0 : 1.2;

  useFrame((_, delta) => {
    time.current += delta;
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      if (hasError) {
        // Flash red for errors
        mat.opacity = 0.05 + Math.abs(Math.sin(time.current * speed)) * 0.15;
        ref.current.scale.setScalar(1 + Math.sin(time.current * speed) * 0.15);
      } else {
        mat.opacity = 0.08 + Math.sin(time.current * speed) * 0.06;
        ref.current.scale.setScalar(1 + Math.sin(time.current * speed * 0.5) * 0.08);
      }
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial color={auraColor} transparent opacity={0.1} depthWrite={false} />
    </mesh>
  );
}

export function Agent3D({ name, color, status, position, activity, taskDescription, hasError }: Agent3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(Math.random() * 100);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Mesh>(null);
  const legRRef = useRef<THREE.Mesh>(null);

  const emotion: EmotionState = activity ? (extendedActivityToEmotion[activity] ?? 'focused') : 'focused';
  const animSpeed = emotion === 'stressed' ? 1.6 : emotion === 'curious' ? 1.2 : 1.0;
  const baseY = position[1];

  useFrame((_, delta) => {
    time.current += delta * animSpeed;
    const t = time.current;

    if (!groupRef.current) return;

    // Walking animation — move around in a circle
    if (activity === 'walking') {
      const walkRadius = 0.8;
      const walkSpeed = 0.6;
      groupRef.current.position.x = position[0] + Math.sin(t * walkSpeed) * walkRadius;
      groupRef.current.position.z = position[2] + Math.cos(t * walkSpeed) * walkRadius;
      groupRef.current.position.y = baseY + Math.abs(Math.sin(t * walkSpeed * 4)) * 0.05;
      groupRef.current.rotation.y = t * walkSpeed + Math.PI;

      // Leg movement for walking
      if (legLRef.current && legRRef.current) {
        legLRef.current.rotation.x = Math.sin(t * walkSpeed * 4) * 0.3;
        legRRef.current.rotation.x = Math.sin(t * walkSpeed * 4 + Math.PI) * 0.3;
      }
    } else {
      // Idle bob
      groupRef.current.position.y = baseY + Math.sin(t * 1.5) * 0.05;
      groupRef.current.position.x = position[0];
      groupRef.current.position.z = position[2];
      // Subtle body sway
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;
    }

    // Frustrated gesture — shake
    if (activity === 'frustrated' || hasError) {
      groupRef.current.rotation.z = Math.sin(t * 12) * 0.05;
      groupRef.current.position.x = position[0] + Math.sin(t * 15) * 0.02;
    } else {
      groupRef.current.rotation.z = 0;
    }

    // Arm animations based on activity
    if (armLRef.current && armRRef.current) {
      if (activity === 'typing') {
        // Fast typing — arms in front, rapid alternating
        armLRef.current.rotation.x = -0.6 + Math.sin(t * 8) * 0.12;
        armRRef.current.rotation.x = -0.6 + Math.sin(t * 8 + 1.5) * 0.12;
        armLRef.current.rotation.z = 0.2;
        armRRef.current.rotation.z = -0.2;
      } else if (activity === 'browsing') {
        // One arm raised, pointing at holographic screen
        armLRef.current.rotation.x = -0.8 + Math.sin(t * 1.5) * 0.1;
        armRRef.current.rotation.x = -0.2 + Math.sin(t * 0.8) * 0.05;
        armLRef.current.rotation.z = 0;
        armRRef.current.rotation.z = 0;
      } else if (activity === 'meeting') {
        // Gesticulating — wider arm movements
        armLRef.current.rotation.x = -0.3 + Math.sin(t * 2) * 0.25;
        armRRef.current.rotation.x = -0.3 + Math.sin(t * 1.8 + 1) * 0.25;
        armLRef.current.rotation.z = 0.3 + Math.sin(t * 1.5) * 0.15;
        armRRef.current.rotation.z = -0.3 - Math.sin(t * 1.5) * 0.15;
      } else if (activity === 'examining' || activity === 'studying') {
        armLRef.current.rotation.x = -0.4 + Math.sin(t * 2) * 0.15;
        armRRef.current.rotation.x = -0.4 + Math.sin(t * 2 + 1) * 0.15;
        armLRef.current.rotation.z = 0;
        armRRef.current.rotation.z = 0;
      } else if (activity === 'meditating') {
        armLRef.current.rotation.z = 0.5 + Math.sin(t * 0.8) * 0.1;
        armRRef.current.rotation.z = -0.5 - Math.sin(t * 0.8) * 0.1;
        armLRef.current.rotation.x = 0;
        armRRef.current.rotation.x = 0;
      } else if (activity === 'debating') {
        armLRef.current.rotation.x = -0.3 + Math.sin(t * 3) * 0.3;
        armRRef.current.rotation.x = -0.3 + Math.sin(t * 3 + 2) * 0.3;
        armLRef.current.rotation.z = 0;
        armRRef.current.rotation.z = 0;
      } else if (activity === 'frustrated') {
        // Arms up in frustration
        armLRef.current.rotation.x = -0.8 + Math.sin(t * 6) * 0.2;
        armRRef.current.rotation.x = -0.8 + Math.sin(t * 6 + Math.PI) * 0.2;
        armLRef.current.rotation.z = 0.4;
        armRRef.current.rotation.z = -0.4;
      } else if (activity === 'walking') {
        const walkSpeed = 0.6;
        armLRef.current.rotation.x = Math.sin(t * walkSpeed * 4) * 0.3;
        armRRef.current.rotation.x = Math.sin(t * walkSpeed * 4 + Math.PI) * 0.3;
        armLRef.current.rotation.z = 0;
        armRRef.current.rotation.z = 0;
      } else {
        armLRef.current.rotation.x = Math.sin(t * 1.2) * 0.1;
        armRRef.current.rotation.x = Math.sin(t * 1.2 + Math.PI) * 0.1;
        armLRef.current.rotation.z = 0;
        armRRef.current.rotation.z = 0;
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

  // Truncate task description for the label
  const labelText = useMemo(() => {
    if (!taskDescription) return null;
    return taskDescription.length > 40 ? taskDescription.slice(0, 37) + '...' : taskDescription;
  }, [taskDescription]);

  return (
    <group ref={groupRef} position={position}>
      {/* Status ring under feet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
        <torusGeometry args={[0.35, 0.04, 8, 24]} />
        <meshStandardMaterial
          color={hasError ? '#ef4444' : statusRingColors[status]}
          emissive={hasError ? '#ef4444' : statusRingColors[status]}
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
      <mesh ref={legLRef} position={[-0.08, -0.45, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.35, 6]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* Right leg */}
      <mesh ref={legRRef} position={[0.08, -0.45, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.35, 6]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>

      {/* Name tag + activity label */}
      <Html
        position={[0, 0.8, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(10,11,20,0.85)',
            border: `1px solid ${hasError ? '#ef4444' : color}`,
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 10,
            fontFamily: 'monospace',
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            boxShadow: `0 0 8px ${hasError ? '#ef444444' : color + '44'}`,
            textAlign: 'center',
          }}
        >
          {name}
          <span style={{ marginLeft: 4, fontSize: 8, color: hasError ? '#ef4444' : statusRingColors[status] }}>
            {hasError ? '✕' : status === 'working' ? '●' : status === 'idle' ? '○' : '◌'}
          </span>
          {labelText && (
            <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1, maxWidth: 160 }}>
              {labelText}
            </div>
          )}
        </div>
      </Html>

      {/* Holographic screen for browsing agents */}
      {activity === 'browsing' && (
        <group position={[0, 0.6, -0.6]} rotation={[0.2, 0, 0]}>
          <mesh>
            <planeGeometry args={[0.6, 0.4]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.15} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[0.56, 0.36]} />
            <meshBasicMaterial color="#0a0b14" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Emotion aura */}
      <EmotionAura emotion={emotion} hasError={hasError} />

      {/* Subtle point light per agent */}
      <pointLight color={hasError ? '#ef4444' : color} intensity={0.3} distance={3} />
    </group>
  );
}
