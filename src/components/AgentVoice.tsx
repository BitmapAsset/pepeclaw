import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAgents } from '../api/DataProvider';
import { getSettings } from '../hooks/useSettings';

interface TTSQueueItem {
  text: string;
  agentIndex: number;
}

const audioCtxRef: { current: AudioContext | null } = { current: null };

function getAudioContext(): AudioContext {
  if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
  return audioCtxRef.current;
}

export function AgentVoice() {
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const agents = useAgents();
  const queueRef = useRef<TTSQueueItem[]>([]);
  const processingRef = useRef(false);
  const lastThoughtsRef = useRef<Map<string, string>>(new Map());
  const gatewayUrlRef = useRef<string>('');

  // Discover gateway URL
  useEffect(() => {
    const settings = getSettings();
    gatewayUrlRef.current = settings.gatewayUrl || 'http://localhost:3033';
  }, []);

  // Process TTS queue
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    processingRef.current = true;
    setSpeaking(true);

    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift()!;
      try {
        const ctx = getAudioContext();
        const res = await fetch(`${gatewayUrlRef.current}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: item.text }),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          const gainNode = ctx.createGain();

          // Pitch shift per agent (subtle)
          source.playbackRate.value = 0.9 + (item.agentIndex % 5) * 0.05;
          source.buffer = audioBuffer;
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          gainNode.gain.value = 0.7;
          source.start();

          await new Promise<void>(resolve => { source.onended = () => resolve(); });
        }
      } catch {
        // Gateway TTS not available, use browser SpeechSynthesis as fallback
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(item.text);
          utterance.rate = 0.9 + (item.agentIndex % 5) * 0.05;
          utterance.pitch = 0.8 + (item.agentIndex % 5) * 0.1;
          utterance.volume = 0.7;
          await new Promise<void>(resolve => {
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            speechSynthesis.speak(utterance);
          });
        }
      }
    }

    processingRef.current = false;
    setSpeaking(false);
  }, []);

  // Watch agent thoughts and queue new ones
  useEffect(() => {
    if (!enabled) return;
    const settings = getSettings();
    if (!settings.agentVoice) return;

    agents.forEach((agent, idx) => {
      const thought = agent.taskDescription;
      if (!thought) return;
      const prev = lastThoughtsRef.current.get(agent.id);
      if (prev !== thought) {
        lastThoughtsRef.current.set(agent.id, thought);
        queueRef.current.push({ text: `${agent.name} says: ${thought}`, agentIndex: idx });
        processQueue();
      }
    });
  }, [agents, enabled, processQueue]);

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => setEnabled(!enabled)}
      className="relative flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer border-0"
      style={{
        background: enabled ? '#8b5cf620' : 'transparent',
        color: enabled ? '#8b5cf6' : '#64748b',
      }}
      title={enabled ? 'Mute agent voices' : 'Enable agent voices'}
    >
      <span className="text-base">{enabled ? '🔊' : '🔇'}</span>
      {speaking && (
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
          style={{ background: '#22c55e' }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}
