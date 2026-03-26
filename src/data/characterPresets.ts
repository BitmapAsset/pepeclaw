// ─── Character Presets for 3D Agents ────────────────────────────
// 11 default characters. Auto-assigned by name, changeable by user.
// All procedural geometry — just colors + proportions, no 3D models.

export interface CharacterPreset {
  id: string;
  name: string;
  emoji: string;
  bodyColor: string;
  headColor: string;
  accentColor: string;
  heightScale: number;    // 0.8 = short, 1.0 = normal, 1.2 = tall
  widthScale: number;     // body width multiplier
  headScale: number;      // head size multiplier
  hasAccessory: 'none' | 'glasses' | 'hat' | 'cape' | 'robe' | 'goggles' | 'antenna';
  limbStyle: 'normal' | 'thin' | 'bulky' | 'stubby';
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'dev-male', name: 'Developer', emoji: '👨‍💻',
    bodyColor: '#3b82f6', headColor: '#fbbf24', accentColor: '#60a5fa',
    heightScale: 1.0, widthScale: 1.0, headScale: 1.0,
    hasAccessory: 'none', limbStyle: 'normal',
  },
  {
    id: 'dev-female', name: 'Developer', emoji: '👩‍💻',
    bodyColor: '#ec4899', headColor: '#fbbf24', accentColor: '#f472b6',
    heightScale: 0.95, widthScale: 0.9, headScale: 1.05,
    hasAccessory: 'glasses', limbStyle: 'thin',
  },
  {
    id: 'robot', name: 'Robot', emoji: '🤖',
    bodyColor: '#6b7280', headColor: '#9ca3af', accentColor: '#10b981',
    heightScale: 1.1, widthScale: 1.1, headScale: 0.9,
    hasAccessory: 'antenna', limbStyle: 'bulky',
  },
  {
    id: 'wizard', name: 'Wizard', emoji: '🧙‍♂️',
    bodyColor: '#7c3aed', headColor: '#fbbf24', accentColor: '#a78bfa',
    heightScale: 1.05, widthScale: 0.95, headScale: 1.0,
    hasAccessory: 'robe', limbStyle: 'thin',
  },
  {
    id: 'scientist-male', name: 'Scientist', emoji: '👨‍🔬',
    bodyColor: '#f0fdf4', headColor: '#fbbf24', accentColor: '#10b981',
    heightScale: 1.0, widthScale: 1.0, headScale: 1.0,
    hasAccessory: 'glasses', limbStyle: 'normal',
  },
  {
    id: 'scientist-female', name: 'Scientist', emoji: '👩‍🔬',
    bodyColor: '#f0fdf4', headColor: '#fbbf24', accentColor: '#06b6d4',
    heightScale: 0.95, widthScale: 0.9, headScale: 1.05,
    hasAccessory: 'goggles', limbStyle: 'thin',
  },
  {
    id: 'hero', name: 'Hero', emoji: '🦸‍♂️',
    bodyColor: '#dc2626', headColor: '#fbbf24', accentColor: '#fbbf24',
    heightScale: 1.15, widthScale: 1.1, headScale: 1.0,
    hasAccessory: 'cape', limbStyle: 'bulky',
  },
  {
    id: 'elder', name: 'Elder', emoji: '🧓',
    bodyColor: '#78716c', headColor: '#d6d3d1', accentColor: '#a8a29e',
    heightScale: 0.95, widthScale: 1.05, headScale: 1.1,
    hasAccessory: 'hat', limbStyle: 'normal',
  },
  {
    id: 'rookie', name: 'Rookie', emoji: '👶',
    bodyColor: '#fbbf24', headColor: '#fde68a', accentColor: '#f59e0b',
    heightScale: 0.8, widthScale: 0.85, headScale: 1.2,
    hasAccessory: 'none', limbStyle: 'stubby',
  },
  {
    id: 'pepe', name: 'Pepe', emoji: '🐸',
    bodyColor: '#10b981', headColor: '#34d399', accentColor: '#6ee7b7',
    heightScale: 0.9, widthScale: 1.05, headScale: 1.15,
    hasAccessory: 'none', limbStyle: 'stubby',
  },
  {
    id: 'lobster', name: 'Lobster', emoji: '🦞',
    bodyColor: '#ef4444', headColor: '#f87171', accentColor: '#fca5a5',
    heightScale: 0.85, widthScale: 1.15, headScale: 0.95,
    hasAccessory: 'antenna', limbStyle: 'bulky',
  },
];

// ─── Auto-Assignment Logic ──────────────────────────────────────
const FEMALE_HINTS = /girl|she|her|fem|woman|lady|queen|princess|alice|nova|luna|aria|stella|iris/i;
const ROBOT_HINTS = /bot|auto|ai|machine|cyber|mech|droid|system|daemon/i;
const WIZARD_HINTS = /sage|oracle|wizard|mage|mystic|prophet|seer|merlin/i;
const HERO_HINTS = /guard|sentinel|defender|shield|hero|champion|titan|atlas/i;
const ELDER_HINTS = /master|sensei|elder|wise|mentor|guru|chief|prime/i;
const PEPE_HINTS = /pepe|frog|kek/i;
const LOBSTER_HINTS = /lobster|claw|pinch/i;

export function autoAssignCharacter(agentName: string, generation?: number): CharacterPreset {
  const name = agentName.toLowerCase();

  if (PEPE_HINTS.test(name)) return CHARACTER_PRESETS.find(p => p.id === 'pepe')!;
  if (LOBSTER_HINTS.test(name)) return CHARACTER_PRESETS.find(p => p.id === 'lobster')!;
  if (ROBOT_HINTS.test(name)) return CHARACTER_PRESETS.find(p => p.id === 'robot')!;
  if (WIZARD_HINTS.test(name)) return CHARACTER_PRESETS.find(p => p.id === 'wizard')!;
  if (HERO_HINTS.test(name)) return CHARACTER_PRESETS.find(p => p.id === 'hero')!;
  if (ELDER_HINTS.test(name)) return CHARACTER_PRESETS.find(p => p.id === 'elder')!;
  if (generation !== undefined && generation === 0) return CHARACTER_PRESETS.find(p => p.id === 'rookie')!;
  if (FEMALE_HINTS.test(name)) return CHARACTER_PRESETS.find(p => p.id === 'dev-female')!;

  // Default: hash name to pick consistently from male/scientist options
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const defaults = CHARACTER_PRESETS.filter(p => ['dev-male', 'scientist-male'].includes(p.id));
  return defaults[hash % defaults.length];
}

// ─── User Override (localStorage) ───────────────────────────────
const STORAGE_KEY = 'pepeclaw-character-overrides';

export function getUserCharacterOverride(agentId: string): CharacterPreset | null {
  try {
    const overrides = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const presetId = overrides[agentId];
    return presetId ? CHARACTER_PRESETS.find(p => p.id === presetId) || null : null;
  } catch { return null; }
}

export function setUserCharacterOverride(agentId: string, presetId: string): void {
  try {
    const overrides = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    overrides[agentId] = presetId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch { /* silent */ }
}

export function getCharacterForAgent(agentName: string, agentId: string, generation?: number): CharacterPreset {
  return getUserCharacterOverride(agentId) || autoAssignCharacter(agentName, generation);
}
