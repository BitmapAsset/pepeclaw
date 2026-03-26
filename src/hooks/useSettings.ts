import { useState, useEffect, useCallback } from 'react';

export interface PepeClawSettings {
  // Privacy & Social
  officeSharing: boolean;
  leaderboard: boolean;
  agentVoice: boolean;
  highlightReel: boolean;
  visitorHideRooms: boolean;
  visitorHideAgentNames: boolean;
  visitorHideTaskDetails: boolean;
  // Display
  theme: 'dark' | 'darker' | 'midnight';
  particleDensity: 'low' | 'medium' | 'high';
  animationSpeed: number;
  showThoughtBubbles: boolean;
  showProgressBars: boolean;
  // Connection
  gatewayUrl: string;
  // Replay
  replayRetentionHours: number;
}

const STORAGE_KEY = 'pepeclaw-settings';

const defaults: PepeClawSettings = {
  officeSharing: false,
  leaderboard: false,
  agentVoice: false,
  highlightReel: false,
  visitorHideRooms: false,
  visitorHideAgentNames: false,
  visitorHideTaskDetails: false,
  theme: 'darker',
  particleDensity: 'medium',
  animationSpeed: 1.0,
  showThoughtBubbles: true,
  showProgressBars: true,
  gatewayUrl: '',
  replayRetentionHours: 24,
};

function loadSettings(): PepeClawSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...defaults };
}

function saveSettings(s: PepeClawSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// Global listeners for cross-component reactivity
type Listener = (s: PepeClawSettings) => void;
let _listeners: Listener[] = [];
let _current = loadSettings();

function notify() {
  _listeners.forEach(fn => fn(_current));
}

export function getSettings(): PepeClawSettings {
  return _current;
}

export function useSettings(): [PepeClawSettings, (patch: Partial<PepeClawSettings>) => void] {
  const [settings, setSettings] = useState<PepeClawSettings>(_current);

  useEffect(() => {
    const handler: Listener = (s) => setSettings({ ...s });
    _listeners.push(handler);
    return () => { _listeners = _listeners.filter(l => l !== handler); };
  }, []);

  const update = useCallback((patch: Partial<PepeClawSettings>) => {
    _current = { ..._current, ...patch };
    saveSettings(_current);
    notify();
  }, []);

  return [settings, update];
}
