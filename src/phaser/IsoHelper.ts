// Isometric math utilities for the PepeClaw office scene

export const TILE_W = 300
export const TILE_H = 150
export const WALL_H = 70
export const ROOM_SPACING_X = 160
export const ROOM_SPACING_Y = 87
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
  genome:       [{ dx: -30, dy: 10 }, { dx: 20, dy: 20 }, { dx: 35, dy: 0 }],
  dream:        [{ dx: -15, dy: 15 }, { dx: 25, dy: 10 }, { dx: 0, dy: 25 }],
  war:          [{ dx: -25, dy: 10 }, { dx: 0, dy: 25 }, { dx: 25, dy: 10 }],
  redteam:      [{ dx: -40, dy: 10 }, { dx: -10, dy: 22 }, { dx: 22, dy: 18 }, { dx: 45, dy: 5 }],
  metalearning: [{ dx: -18, dy: 12 }, { dx: 18, dy: 20 }],
  temporal:     [{ dx: -12, dy: 18 }, { dx: 18, dy: 10 }],
  identity:     [{ dx: -25, dy: 12 }, { dx: 0, dy: 25 }, { dx: 25, dy: 12 }],
  breeding:     [{ dx: -25, dy: 12 }, { dx: 0, dy: 25 }, { dx: 25, dy: 12 }],
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
