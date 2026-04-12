// Isometric math utilities for the PepeClaw office scene

export const TILE_W = 300
export const TILE_H = 150
export const WALL_H = 84
export const ROOM_SPACING_X = 172
export const ROOM_SPACING_Y = 98
export const SCENE_W = 1500
export const SCENE_H = 900

export interface RoomConfig {
  id: string
  name: string
  color: number    // Phaser uses numeric colors
  colorHex: string // For CSS/string contexts
  gridCol: number
  gridRow: number
}

export const ROOMS: RoomConfig[] = [
  { id: 'genome',       name: 'Genome Lab',      color: 0x00ff88, colorHex: '#00ff88', gridCol: 0, gridRow: 0 },
  { id: 'war',          name: 'War Room',         color: 0xef4444, colorHex: '#ef4444', gridCol: 1, gridRow: 0 },
  { id: 'metalearning', name: 'Brain Room',       color: 0x06b6d4, colorHex: '#06b6d4', gridCol: 2, gridRow: 0 },
  { id: 'dream',        name: 'Dream Chamber',    color: 0x8b5cf6, colorHex: '#8b5cf6', gridCol: 0, gridRow: 1 },
  { id: 'redteam',      name: 'Open Office',      color: 0xf87171, colorHex: '#f87171', gridCol: 1, gridRow: 1 },
  { id: 'temporal',     name: 'Temporal Engine',   color: 0xf59e0b, colorHex: '#f59e0b', gridCol: 2, gridRow: 1 },
  { id: 'breeding',     name: 'Breeding Arena',   color: 0xec4899, colorHex: '#ec4899', gridCol: 0, gridRow: 2 },
  { id: 'identity',     name: 'Identity Vault',   color: 0xf97316, colorHex: '#f97316', gridCol: 1, gridRow: 2 },
]

const roomsPerRow = [3, 3, 2]

export function roomPosition(col: number, row: number): { x: number; y: number } {
  const rowStartX = SCENE_W / 2 - (roomsPerRow[row] - 1) * ROOM_SPACING_X / 2
  return {
    x: rowStartX + col * ROOM_SPACING_X,
    y: 200 + row * ROOM_SPACING_Y,
  }
}

// Precomputed room centers
export const roomCenters: Record<string, { x: number; y: number }> = {}
ROOMS.forEach(r => {
  roomCenters[r.id] = roomPosition(r.gridCol, r.gridRow)
})

// Agent slot offsets within rooms
export const agentSlots: Record<string, { dx: number; dy: number }[]> = {
  genome:       [{ dx: -52, dy: 12 }, { dx: -6, dy: 30 }, { dx: 48, dy: 8 }, { dx: 18, dy: -10 }],
  dream:        [{ dx: -56, dy: 18 }, { dx: 42, dy: 14 }, { dx: -6, dy: 36 }, { dx: 18, dy: -8 }],
  war:          [{ dx: -54, dy: 12 }, { dx: -6, dy: 34 }, { dx: 50, dy: 13 }, { dx: 12, dy: -10 }],
  redteam:      [{ dx: -68, dy: 8 }, { dx: -32, dy: 30 }, { dx: 18, dy: 34 }, { dx: 62, dy: 10 }, { dx: 4, dy: -12 }],
  metalearning: [{ dx: -48, dy: 14 }, { dx: 46, dy: 18 }, { dx: 0, dy: 36 }],
  temporal:     [{ dx: -52, dy: 18 }, { dx: 50, dy: 12 }, { dx: -2, dy: 36 }],
  identity:     [{ dx: -56, dy: 16 }, { dx: -4, dy: 36 }, { dx: 52, dy: 16 }],
  breeding:     [{ dx: -62, dy: 16 }, { dx: 0, dy: 36 }, { dx: 58, dy: 14 }],
}

// Check if a point is inside an isometric diamond
export function pointInDiamond(px: number, py: number, cx: number, cy: number, w: number, h: number): boolean {
  const dx = Math.abs(px - cx)
  const dy = Math.abs(py - cy)
  return (dx / (w / 2) + dy / (h / 2)) <= 1
}

// Color utilities for Phaser
export function hexToComponents(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  }
}

export function colorWithAlpha(hex: number, alpha: number): number {
  const { r, g, b } = hexToComponents(hex)
  return Phaser.Display.Color.GetColor32(r, g, b, Math.round(alpha * 255))
}

// Walkway connections between adjacent rooms
export const walkways: Array<{ from: string; to: string }> = [
  { from: 'genome', to: 'war' },
  { from: 'war', to: 'metalearning' },
  { from: 'dream', to: 'redteam' },
  { from: 'redteam', to: 'temporal' },
  { from: 'genome', to: 'dream' },
  { from: 'war', to: 'redteam' },
  { from: 'metalearning', to: 'temporal' },
  { from: 'dream', to: 'breeding' },
  { from: 'redteam', to: 'identity' },
]

// Need Phaser import for Color utility
import Phaser from 'phaser'
