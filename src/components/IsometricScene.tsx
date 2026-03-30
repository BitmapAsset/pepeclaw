import { useRef, useEffect, useCallback } from 'react'
import { useAgents } from '../api/DataProvider'
import type { RoomId } from '../data/types'

export type CameraMode = 'isometric' | 'perspective'

// === ROOM CONFIGURATION ===
interface RoomConfig {
  id: string
  name: string
  color: string
  gridCol: number
  gridRow: number
}

const rooms: RoomConfig[] = [
  { id: 'genome',       name: 'Genome Lab',      color: '#00ff88', gridCol: 0, gridRow: 0 },
  { id: 'war',          name: 'War Room',         color: '#ef4444', gridCol: 1, gridRow: 0 },
  { id: 'metalearning', name: 'Brain Room',       color: '#06b6d4', gridCol: 2, gridRow: 0 },
  { id: 'dream',        name: 'Dream Chamber',    color: '#8b5cf6', gridCol: 0, gridRow: 1 },
  { id: 'redteam',      name: 'Open Office',      color: '#f87171', gridCol: 1, gridRow: 1 },
  { id: 'temporal',     name: 'Temporal Engine',   color: '#f59e0b', gridCol: 2, gridRow: 1 },
  { id: 'breeding',     name: 'Breeding Arena',   color: '#ec4899', gridCol: 0, gridRow: 2 },
  { id: 'identity',     name: 'Identity Vault',   color: '#f97316', gridCol: 1, gridRow: 2 },
]

const roomColors: Record<string, string> = {}
const roomNames: Record<string, string> = {}
rooms.forEach(r => { roomColors[r.id] = r.color; roomNames[r.id] = r.name })

// Isometric tile dimensions
const TILE_W = 300
const TILE_H = 150
const WALL_H = 80
const ROOM_SPACING_X = 330
const ROOM_SPACING_Y = 180

// Scene virtual size (tight fit so rooms fill viewport)
const SCENE_W = 1400
const SCENE_H = 800

// Room positions: staggered isometric diamond layout
function roomPosition(col: number, row: number): { x: number; y: number } {
  const roomsPerRow = [3, 3, 2]
  const rowStartX = SCENE_W / 2 - (roomsPerRow[row] - 1) * ROOM_SPACING_X / 2
  return {
    x: rowStartX + col * ROOM_SPACING_X,
    y: 160 + row * ROOM_SPACING_Y,
  }
}

// Precompute room screen centers
const roomCenters: Record<string, { x: number; y: number }> = {}
rooms.forEach(r => {
  roomCenters[r.id] = roomPosition(r.gridCol, r.gridRow)
})

// Agent slots within rooms (offsets from room center in screen space)
const agentSlots: Record<string, { dx: number; dy: number }[]> = {
  genome:       [{ dx: -30, dy: 10 }, { dx: 20, dy: 20 }, { dx: 35, dy: 0 }],
  dream:        [{ dx: -15, dy: 15 }, { dx: 25, dy: 10 }, { dx: 0, dy: 25 }],
  war:          [{ dx: -25, dy: 10 }, { dx: 0, dy: 25 }, { dx: 25, dy: 10 }],
  redteam:      [{ dx: -40, dy: 10 }, { dx: -10, dy: 22 }, { dx: 22, dy: 18 }, { dx: 45, dy: 5 }],
  metalearning: [{ dx: -18, dy: 12 }, { dx: 18, dy: 20 }],
  temporal:     [{ dx: -12, dy: 18 }, { dx: 18, dy: 10 }],
  identity:     [{ dx: -25, dy: 12 }, { dx: 0, dy: 25 }, { dx: 25, dy: 12 }],
  breeding:     [{ dx: -25, dy: 12 }, { dx: 0, dy: 25 }, { dx: 25, dy: 12 }],
}

// === TYPES ===
interface AnimatedAgent {
  id: string
  name: string
  color: string
  roomId: string
  currentX: number
  currentY: number
  targetX: number
  targetY: number
  animPhase: number
  state: 'idle' | 'walking' | 'working' | 'meeting'
}

interface Particle {
  x: number; y: number; vy: number; vx: number
  alpha: number; size: number; color: string; roomId: string
}

interface SceneState {
  pan: { x: number; y: number }
  zoom: number
  targetZoom: number
  targetPan: { x: number; y: number }
  animatedAgents: Map<string, AnimatedAgent>
  particles: Particle[]
  time: number
  hoveredRoom: string | null
}

const sceneRoomIds = rooms.map(r => r.id)

// === DRAWING HELPERS ===

// Parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function rgbaStr(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

// Draw an isometric diamond (floor)
function drawIsoDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, w: number, h: number
) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - h / 2)       // top
  ctx.lineTo(cx + w / 2, cy)       // right
  ctx.lineTo(cx, cy + h / 2)       // bottom
  ctx.lineTo(cx - w / 2, cy)       // left
  ctx.closePath()
}

// Draw isometric box (floor + left wall + right wall)
function drawIsoRoom(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number, wallH: number,
  color: string, isActive: boolean, isHovered: boolean, _time: number
) {
  const hw = w / 2
  const hh = h / 2

  // Floor shadow / ambient glow beneath
  const glowR = Math.max(w, h) * 0.7
  const floorGlow = ctx.createRadialGradient(cx, cy + 5, 0, cx, cy + 5, glowR)
  floorGlow.addColorStop(0, rgbaStr(color, isActive ? 0.12 : isHovered ? 0.08 : 0.04))
  floorGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = floorGlow
  ctx.fillRect(cx - glowR, cy - glowR + 5, glowR * 2, glowR * 2)

  // === BACK LEFT WALL (top-left side) ===
  ctx.beginPath()
  ctx.moveTo(cx - hw, cy - wallH)          // left vertex (raised)
  ctx.lineTo(cx, cy - hh - wallH)          // top vertex (raised)
  ctx.lineTo(cx, cy - hh)                  // top vertex (floor level)
  ctx.lineTo(cx - hw, cy)                  // left vertex (floor level)
  ctx.closePath()
  const backLeftGrad = ctx.createLinearGradient(cx - hw, cy - wallH, cx, cy - hh - wallH)
  backLeftGrad.addColorStop(0, '#0c0e1c')
  backLeftGrad.addColorStop(1, '#101222')
  ctx.fillStyle = backLeftGrad
  ctx.fill()
  // Neon edge on top of back-left wall (bright + bloom)
  ctx.beginPath()
  ctx.moveTo(cx - hw, cy - wallH)
  ctx.lineTo(cx, cy - hh - wallH)
  ctx.strokeStyle = rgbaStr(color, 0.85)
  ctx.lineWidth = 3
  ctx.shadowColor = color
  ctx.shadowBlur = isActive ? 28 : 22
  ctx.stroke()
  // Double stroke for bloom effect
  ctx.strokeStyle = rgbaStr(color, 0.3)
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.shadowBlur = 0

  // === BACK RIGHT WALL (top-right side) ===
  ctx.beginPath()
  ctx.moveTo(cx, cy - hh - wallH)          // top vertex (raised)
  ctx.lineTo(cx + hw, cy - wallH)           // right vertex (raised)
  ctx.lineTo(cx + hw, cy)                   // right vertex (floor level)
  ctx.lineTo(cx, cy - hh)                   // top vertex (floor level)
  ctx.closePath()
  const backRightGrad = ctx.createLinearGradient(cx, cy - hh - wallH, cx + hw, cy - wallH)
  backRightGrad.addColorStop(0, '#101222')
  backRightGrad.addColorStop(1, '#141628')
  ctx.fillStyle = backRightGrad
  ctx.fill()
  // Neon edge on top of back-right wall (bright + bloom)
  ctx.beginPath()
  ctx.moveTo(cx, cy - hh - wallH)
  ctx.lineTo(cx + hw, cy - wallH)
  ctx.strokeStyle = rgbaStr(color, 0.85)
  ctx.lineWidth = 3
  ctx.shadowColor = color
  ctx.shadowBlur = isActive ? 28 : 22
  ctx.stroke()
  ctx.strokeStyle = rgbaStr(color, 0.3)
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.shadowBlur = 0

  // === FRONT LEFT WALL (bottom-left side, shorter) ===
  ctx.beginPath()
  ctx.moveTo(cx - hw, cy)
  ctx.lineTo(cx, cy + hh)
  ctx.lineTo(cx, cy + hh - wallH)
  ctx.lineTo(cx - hw, cy - wallH)
  ctx.closePath()
  ctx.fillStyle = '#0e1020'
  ctx.fill()
  // Equipment panels on front-left wall
  for (let eq = 0; eq < 2; eq++) {
    const t = (eq + 1) / 3
    const eqx = cx - hw * (1 - t) + 2
    const eqy = cy + hh * (1 - t) - wallH * 0.6
    ctx.fillStyle = rgbaStr(color, 0.06)
    ctx.fillRect(eqx, eqy, 16, 10)
    ctx.strokeStyle = rgbaStr(color, 0.15)
    ctx.lineWidth = 0.5
    ctx.strokeRect(eqx, eqy, 16, 10)
    // Small status LEDs
    for (let led = 0; led < 3; led++) {
      ctx.fillStyle = rgbaStr(color, 0.4 + Math.sin(_time * 0.004 + eq + led) * 0.2)
      ctx.beginPath(); ctx.arc(eqx + 4 + led * 4, eqy + 7, 1, 0, Math.PI * 2); ctx.fill()
    }
  }
  // Neon edge glow
  ctx.beginPath()
  ctx.moveTo(cx - hw, cy - wallH)
  ctx.lineTo(cx, cy + hh - wallH)
  ctx.strokeStyle = rgbaStr(color, 0.4)
  ctx.lineWidth = 1.5
  ctx.shadowColor = color
  ctx.shadowBlur = isActive ? 18 : 10
  ctx.stroke()
  ctx.shadowBlur = 0

  // === FRONT RIGHT WALL (bottom-right side, shorter) ===
  ctx.beginPath()
  ctx.moveTo(cx + hw, cy)
  ctx.lineTo(cx, cy + hh)
  ctx.lineTo(cx, cy + hh - wallH)
  ctx.lineTo(cx + hw, cy - wallH)
  ctx.closePath()
  ctx.fillStyle = '#141528'
  ctx.fill()
  // Neon edge glow
  ctx.beginPath()
  ctx.moveTo(cx, cy + hh - wallH)
  ctx.lineTo(cx + hw, cy - wallH)
  ctx.strokeStyle = rgbaStr(color, 0.4)
  ctx.lineWidth = 1.5
  ctx.shadowColor = color
  ctx.shadowBlur = isActive ? 18 : 10
  ctx.stroke()
  ctx.shadowBlur = 0

  // Wall panel lines (horizontal on back-left wall)
  for (let pl = 1; pl < 3; pl++) {
    const t = pl / 3
    ctx.strokeStyle = rgbaStr(color, 0.06)
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(cx - hw, cy - wallH * (1 - t))
    ctx.lineTo(cx, cy - hh - wallH * (1 - t))
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx, cy - hh - wallH * (1 - t))
    ctx.lineTo(cx + hw, cy - wallH * (1 - t))
    ctx.stroke()
  }

  // Holographic screens on back-left wall
  const screenAlpha = 0.15
  for (let si = 0; si < 3; si++) {
    const t = (si + 1) / 4
    const sx = cx - hw + hw * t * 0.85
    const sy = cy - wallH + (hh * t * 0.85) - wallH * 0.55
    ctx.fillStyle = rgbaStr(color, screenAlpha)
    ctx.fillRect(sx - 14, sy - 9, 28, 16)
    ctx.strokeStyle = rgbaStr(color, 0.25)
    ctx.lineWidth = 0.6
    ctx.strokeRect(sx - 14, sy - 9, 28, 16)
    ctx.shadowColor = color
    ctx.shadowBlur = 3
    ctx.strokeRect(sx - 14, sy - 9, 28, 16)
    ctx.shadowBlur = 0
    // Data lines
    for (let dl = 0; dl < 4; dl++) {
      ctx.fillStyle = rgbaStr(color, 0.35)
      ctx.fillRect(sx - 10, sy - 5 + dl * 3.5, 20 - dl * 3, 1.5)
    }
  }

  // Holographic screens on back-right wall
  for (let si = 0; si < 3; si++) {
    const t = (si + 1) / 4
    const sx = cx + hw * (1 - t * 0.85)
    const sy = cy - wallH + (hh * (1 - t * 0.85)) - wallH * 0.55
    ctx.fillStyle = rgbaStr(color, screenAlpha)
    ctx.fillRect(sx - 14, sy - 9, 28, 16)
    ctx.strokeStyle = rgbaStr(color, 0.25)
    ctx.lineWidth = 0.6
    ctx.strokeRect(sx - 14, sy - 9, 28, 16)
    ctx.shadowColor = color
    ctx.shadowBlur = 3
    ctx.strokeRect(sx - 14, sy - 9, 28, 16)
    ctx.shadowBlur = 0
    for (let dl = 0; dl < 4; dl++) {
      ctx.fillStyle = rgbaStr(color, 0.35)
      ctx.fillRect(sx - 10, sy - 5 + dl * 3.5, 20 - dl * 3, 1.5)
    }
  }

  // === FLOOR ===
  drawIsoDiamond(ctx, cx, cy - wallH, w, h)
  // Dark base
  ctx.fillStyle = '#0d0e1a'
  ctx.fill()

  // Tile grid lines (4x4)
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = rgbaStr(color, 0.2)
  ctx.lineWidth = 0.8
  for (let i = 1; i < 4; i++) {
    const t = i / 4
    ctx.beginPath()
    ctx.moveTo(cx - hw + hw * t, cy - wallH - hh + hh * t)
    ctx.lineTo(cx + hw * t, cy - wallH + hh * t)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - hw * (1 - t), cy - wallH + hh * (1 - t))
    ctx.lineTo(cx + hw - hw * t, cy - wallH - hh + hh * t)
    ctx.stroke()
  }
  ctx.restore()

  // Floor radial glow in room color
  drawIsoDiamond(ctx, cx, cy - wallH, w, h)
  ctx.save()
  ctx.clip()
  const flGrad = ctx.createRadialGradient(cx, cy - wallH, 0, cx, cy - wallH, w * 0.5)
  flGrad.addColorStop(0, rgbaStr(color, isActive ? 0.55 : 0.40))
  flGrad.addColorStop(0.6, rgbaStr(color, isActive ? 0.18 : 0.12))
  flGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = flGrad
  ctx.fillRect(cx - hw, cy - wallH - hh, w, h)
  ctx.restore()

  // Reflective sheen across floor middle
  drawIsoDiamond(ctx, cx, cy - wallH, w, h)
  ctx.save()
  ctx.clip()
  const sheenGrad = ctx.createLinearGradient(cx - hw, cy - wallH, cx + hw, cy - wallH)
  sheenGrad.addColorStop(0, 'transparent')
  sheenGrad.addColorStop(0.35, 'rgba(255,255,255,0.015)')
  sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.04)')
  sheenGrad.addColorStop(0.65, 'rgba(255,255,255,0.015)')
  sheenGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = sheenGrad
  ctx.fillRect(cx - hw, cy - wallH - hh, w, h)
  ctx.restore()

  // Floor outline
  drawIsoDiamond(ctx, cx, cy - wallH, w, h)
  ctx.strokeStyle = rgbaStr(color, isActive ? 0.5 : isHovered ? 0.35 : 0.15)
  ctx.lineWidth = isActive ? 1.5 : 1
  if (isActive || isHovered) {
    ctx.shadowColor = color
    ctx.shadowBlur = 8
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  // Top edge glow (top of walls — connecting top-left to top-right via top vertex)
  ctx.beginPath()
  ctx.moveTo(cx - hw, cy - wallH)
  ctx.lineTo(cx, cy - hh - wallH)    // top vertex of floor
  ctx.lineTo(cx + hw, cy - wallH)
  ctx.strokeStyle = rgbaStr(color, 0.4)
  ctx.lineWidth = 1.5
  ctx.shadowColor = color
  ctx.shadowBlur = 8
  ctx.stroke()
  ctx.shadowBlur = 0

  // Wall-mounted indicator lights along top edges
  const numLights = 4
  for (let li = 1; li <= numLights; li++) {
    const t = li / (numLights + 1)
    // Left wall edge lights
    const lx1 = cx - hw + hw * t
    const ly1 = cy - wallH - hh * (1 - t) + hh * t - wallH
    ctx.fillStyle = rgbaStr(color, 0.5 + Math.sin(_time * 0.003 + li) * 0.2)
    ctx.shadowColor = color
    ctx.shadowBlur = 4
    ctx.beginPath(); ctx.arc(lx1, ly1 + hh * (1 - t), 1.5, 0, Math.PI * 2); ctx.fill()
    // Right wall edge lights
    const rx1 = cx + hw * t
    ctx.beginPath(); ctx.arc(rx1, ly1 + hh * t, 1.5, 0, Math.PI * 2); ctx.fill()
  }
  ctx.shadowBlur = 0

  // Room name label on back wall
  const labelY = cy - wallH - hh / 2 - 6
  ctx.save()
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'center'
  const name = roomNames[rooms.find(r => r.color === color)?.id || ''] || ''
  const tw = ctx.measureText(name).width + 20
  // Neon sign style label
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.beginPath()
  ctx.roundRect(cx - tw / 2, labelY - 9, tw, 18, 5)
  ctx.fill()
  ctx.strokeStyle = rgbaStr(color, 0.6)
  ctx.lineWidth = 1.5
  ctx.shadowColor = color
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.roundRect(cx - tw / 2, labelY - 9, tw, 18, 5)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.shadowBlur = 8
  ctx.fillText(name, cx, labelY + 5)
  ctx.shadowBlur = 0
  ctx.restore()
}

// === ROOM INTERIOR DRAWING ===

function drawGenomeLab(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const floorY = cy - WALL_H
  const c = '#00ff88'
  // DNA double helix - larger and more prominent
  const helixCx = cx - 20
  const helixBase = floorY - 3
  const helixH = 75
  // Helix glow — prominent
  const hGlow = ctx.createRadialGradient(helixCx, helixBase - helixH / 2, 0, helixCx, helixBase - helixH / 2, 55)
  hGlow.addColorStop(0, rgbaStr(c, 0.22))
  hGlow.addColorStop(0.5, rgbaStr(c, 0.08))
  hGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = hGlow
  ctx.beginPath(); ctx.arc(helixCx, helixBase - helixH / 2, 55, 0, Math.PI * 2); ctx.fill()

  for (let i = 0; i < 50; i++) {
    const angle = i * 0.14 + t * 0.003
    const y = helixBase - (i / 50) * helixH
    const x1 = helixCx + Math.sin(angle) * 28
    const x2 = helixCx + Math.sin(angle + Math.PI) * 28
    const a = 0.5 + Math.sin(angle) * 0.3
    ctx.fillStyle = rgbaStr(c, a)
    ctx.shadowColor = c
    ctx.shadowBlur = 4
    ctx.beginPath(); ctx.arc(x1, y, 3, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = rgbaStr('#00ffaa', a)
    ctx.beginPath(); ctx.arc(x2, y, 3, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    if (i % 3 === 0) {
      ctx.strokeStyle = rgbaStr(c, 0.25)
      ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
    }
  }
  // Platform
  ctx.strokeStyle = rgbaStr(c, 0.4)
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.ellipse(helixCx, helixBase + 5, 34, 12, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = rgbaStr(c, 0.06)
  ctx.fill()

  // Holographic panels
  for (let p = 0; p < 4; p++) {
    const px = cx + 35 + (p % 2) * 12
    const py = floorY - 50 + p * 12
    const pw = 28; const ph = 18
    ctx.fillStyle = rgbaStr(c, 0.1 + Math.sin(t * 0.002 + p) * 0.04)
    ctx.fillRect(px, py, pw, ph)
    ctx.strokeStyle = rgbaStr(c, 0.35)
    ctx.lineWidth = 0.7
    ctx.strokeRect(px, py, pw, ph)
    for (let l = 0; l < 4; l++) {
      ctx.fillStyle = rgbaStr(c, 0.5)
      ctx.fillRect(px + 3, py + 3 + l * 3.5, pw - 8 - (l % 2) * 6, 1.5)
    }
  }
}

function drawDreamChamber(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const floorY = cy - WALL_H
  const c = '#8b5cf6'
  // Swirling portal — larger
  const portalCx = cx
  const portalCy = floorY - 30
  // Outer glow
  const pGlow = ctx.createRadialGradient(portalCx, portalCy, 0, portalCx, portalCy, 60)
  pGlow.addColorStop(0, rgbaStr(c, 0.18))
  pGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = pGlow
  ctx.beginPath(); ctx.arc(portalCx, portalCy, 60, 0, Math.PI * 2); ctx.fill()

  for (let ring = 7; ring >= 1; ring--) {
    const r = ring * 9
    const rot = t * 0.001 * (ring % 2 === 0 ? 1 : -1)
    const grad = ctx.createConicGradient(rot, portalCx, portalCy)
    grad.addColorStop(0, rgbaStr('#8b5cf6', 0.04 * ring))
    grad.addColorStop(0.25, rgbaStr('#a78bfa', 0.07 * ring))
    grad.addColorStop(0.5, rgbaStr('#7c3aed', 0.04 * ring))
    grad.addColorStop(0.75, rgbaStr('#c084fc', 0.07 * ring))
    grad.addColorStop(1, rgbaStr('#8b5cf6', 0.04 * ring))
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.arc(portalCx, portalCy, r, 0, Math.PI * 2); ctx.fill()
  }
  // Core
  ctx.fillStyle = rgbaStr(c, 0.5 + Math.sin(t * 0.003) * 0.25)
  ctx.shadowColor = c
  ctx.shadowBlur = 15
  ctx.beginPath(); ctx.arc(portalCx, portalCy, 6, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Spiral arms
  for (let arm = 0; arm < 5; arm++) {
    const baseAngle = (arm * Math.PI * 2) / 5 + t * 0.0012
    for (let j = 0; j < 14; j++) {
      const dist = 14 + j * 5.5
      const angle = baseAngle + j * 0.3
      const px = portalCx + Math.cos(angle) * dist
      const py = portalCy + Math.sin(angle) * dist * 0.5
      const a = 0.7 - j * 0.05
      ctx.fillStyle = rgbaStr('#c084fc', a)
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill()
    }
  }

  // Floating dream bubbles
  for (let b = 0; b < 8; b++) {
    const bAngle = t * 0.0008 + b * 0.8
    const bDist = 35 + Math.sin(t * 0.001 + b * 1.3) * 15
    const bx = portalCx + Math.cos(bAngle) * bDist
    const by = portalCy + Math.sin(bAngle) * bDist * 0.5 - Math.sin(t * 0.002 + b) * 6
    const br = 3 + Math.sin(t * 0.003 + b * 2) * 1.5
    const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br)
    bGrad.addColorStop(0, rgbaStr(c, 0.03))
    bGrad.addColorStop(0.6, rgbaStr(c, 0.08))
    bGrad.addColorStop(1, rgbaStr(c, 0.02))
    ctx.fillStyle = bGrad
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = rgbaStr(c, 0.3 + Math.sin(t * 0.002 + b) * 0.1)
    ctx.lineWidth = 0.6
    ctx.stroke()
    // Highlight
    ctx.fillStyle = rgbaStr('#ffffff', 0.15)
    ctx.beginPath(); ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.25, 0, Math.PI * 2); ctx.fill()
  }
}

function drawWarRoom(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const floorY = cy - WALL_H
  const c = '#ef4444'

  // Central strategy table (iso ellipse)
  const tableY = floorY
  ctx.fillStyle = '#10131e'
  ctx.beginPath(); ctx.ellipse(cx, tableY, 45, 18, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = rgbaStr(c, 0.35)
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Map grid
  for (let g = -3; g <= 3; g++) {
    ctx.strokeStyle = rgbaStr(c, 0.12)
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(cx + g * 12, tableY - 14); ctx.lineTo(cx + g * 12, tableY + 14); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - 38, tableY + g * 5); ctx.lineTo(cx + 38, tableY + g * 5); ctx.stroke()
  }

  // Holographic globe — larger
  const globeY = floorY - 42
  const globeR = 28 + Math.sin(t * 0.002) * 1.5
  // Globe glow
  const gGlow = ctx.createRadialGradient(cx, globeY, 0, cx, globeY, globeR + 10)
  gGlow.addColorStop(0, rgbaStr(c, 0.1))
  gGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = gGlow
  ctx.beginPath(); ctx.arc(cx, globeY, globeR + 10, 0, Math.PI * 2); ctx.fill()

  ctx.strokeStyle = rgbaStr(c, 0.35)
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(cx, globeY, globeR, 0, Math.PI * 2); ctx.stroke()
  for (let lat = -3; lat <= 3; lat++) {
    const ly = globeY + lat * (globeR / 4)
    const lr = Math.sqrt(Math.max(1, globeR * globeR - lat * lat * (globeR * globeR / 16)))
    ctx.beginPath(); ctx.ellipse(cx, ly, lr, 2.5, 0, 0, Math.PI * 2); ctx.stroke()
  }
  const rot = t * 0.0005
  ctx.beginPath(); ctx.ellipse(cx, globeY, 6, globeR, rot, 0, Math.PI * 2)
  ctx.strokeStyle = rgbaStr(c, 0.5); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(cx, globeY, 6, globeR, rot + 1.2, 0, Math.PI * 2)
  ctx.strokeStyle = rgbaStr(c, 0.3); ctx.stroke()

  // Wall screens (3 holographic displays)
  for (let s = 0; s < 3; s++) {
    const sx = cx - 45 + s * 32
    const sy = floorY - 62
    const sw = 26; const sh = 16
    ctx.fillStyle = rgbaStr(c, 0.08 + Math.sin(t * 0.002 + s) * 0.03)
    ctx.fillRect(sx, sy, sw, sh)
    ctx.strokeStyle = rgbaStr(c, 0.3)
    ctx.lineWidth = 0.7
    ctx.strokeRect(sx, sy, sw, sh)
    for (let b = 0; b < 5; b++) {
      const bh = 3 + Math.sin(t * 0.003 + s + b * 0.7) * 3
      ctx.fillStyle = rgbaStr(c, 0.6)
      ctx.fillRect(sx + 3 + b * 4.5, sy + sh - 2 - bh, 3, bh)
    }
  }
}

function drawRedTeam(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const floorY = cy - WALL_H
  const c = '#f87171'
  const targetY = floorY - 28
  const outerR = 40

  // Glow
  const tGlow = ctx.createRadialGradient(cx, targetY, 0, cx, targetY, outerR + 10)
  tGlow.addColorStop(0, rgbaStr(c, 0.1))
  tGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = tGlow
  ctx.beginPath(); ctx.arc(cx, targetY, outerR + 10, 0, Math.PI * 2); ctx.fill()

  // Concentric circles
  for (let ring = 4; ring >= 1; ring--) {
    ctx.strokeStyle = rgbaStr(c, 0.15 + (4 - ring) * 0.08)
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.arc(cx, targetY, ring * 8, 0, Math.PI * 2); ctx.stroke()
  }
  // Cross lines
  ctx.strokeStyle = rgbaStr(c, 0.35)
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(cx - outerR, targetY); ctx.lineTo(cx + outerR, targetY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, targetY - outerR); ctx.lineTo(cx, targetY + outerR); ctx.stroke()

  // Rotating arcs
  const rot = t * 0.002
  ctx.save(); ctx.translate(cx, targetY); ctx.rotate(rot)
  ctx.strokeStyle = rgbaStr(c, 0.5)
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(0, 0, outerR, 0, Math.PI * 0.4); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, 0, outerR, Math.PI, Math.PI * 1.4); ctx.stroke()
  ctx.restore()

  // Second rotating ring (opposite direction)
  ctx.save(); ctx.translate(cx, targetY); ctx.rotate(-rot * 0.7)
  ctx.strokeStyle = rgbaStr(c, 0.3)
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(0, 0, outerR - 6, 0.5, 0.5 + Math.PI * 0.3); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, 0, outerR - 6, Math.PI + 0.5, Math.PI + 0.5 + Math.PI * 0.3); ctx.stroke()
  ctx.restore()

  // Alert indicators
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 + Math.PI / 6
    const ax = cx + Math.cos(angle) * (outerR + 8)
    const ay = targetY + Math.sin(angle) * (outerR * 0.5 + 4)
    const blink = Math.sin(t * 0.005 + i * 1.2) > 0.2
    if (blink) {
      ctx.fillStyle = rgbaStr(c, 0.8)
      ctx.shadowColor = c; ctx.shadowBlur = 5
      ctx.beginPath(); ctx.arc(ax, ay, 2.5, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  // Central dot
  ctx.fillStyle = rgbaStr(c, 0.6 + Math.sin(t * 0.004) * 0.3)
  ctx.beginPath(); ctx.arc(cx, targetY, 3, 0, Math.PI * 2); ctx.fill()
}

function drawMetaLearning(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const floorY = cy - WALL_H
  const c = '#06b6d4'
  const brainCx = cx
  const brainCy = floorY - 34
  const sc = 1.8 // scale factor

  // Outer glow
  const bGlow = ctx.createRadialGradient(brainCx, brainCy, 0, brainCx, brainCy, 50)
  bGlow.addColorStop(0, rgbaStr(c, 0.16))
  bGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = bGlow
  ctx.beginPath(); ctx.arc(brainCx, brainCy, 50, 0, Math.PI * 2); ctx.fill()

  // Brain shape — scaled up
  ctx.strokeStyle = rgbaStr(c, 0.55)
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(brainCx, brainCy - 22 * sc)
  ctx.bezierCurveTo(brainCx - 24 * sc, brainCy - 22 * sc, brainCx - 26 * sc, brainCy, brainCx - 22 * sc, brainCy + 12 * sc)
  ctx.bezierCurveTo(brainCx - 16 * sc, brainCy + 20 * sc, brainCx - 5 * sc, brainCy + 18 * sc, brainCx, brainCy + 14 * sc)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(brainCx, brainCy - 22 * sc)
  ctx.bezierCurveTo(brainCx + 24 * sc, brainCy - 22 * sc, brainCx + 26 * sc, brainCy, brainCx + 22 * sc, brainCy + 12 * sc)
  ctx.bezierCurveTo(brainCx + 16 * sc, brainCy + 20 * sc, brainCx + 5 * sc, brainCy + 18 * sc, brainCx, brainCy + 14 * sc)
  ctx.stroke()

  // Neural network — larger nodes and connections
  const nodes = [
    { x: -16, y: -14 }, { x: 16, y: -14 },
    { x: -22, y: 0 }, { x: 0, y: -6 }, { x: 22, y: 0 },
    { x: -14, y: 12 }, { x: 14, y: 12 },
    { x: -8, y: 4 }, { x: 8, y: 4 }, { x: 0, y: 8 },
  ]
  const conns: [number, number][] = [[0,2],[0,3],[0,7],[1,3],[1,4],[1,8],[2,5],[3,5],[3,6],[4,6],[2,9],[4,9],[5,9],[6,9],[7,9],[8,9],[7,5],[8,6]]
  ctx.strokeStyle = rgbaStr(c, 0.3)
  ctx.lineWidth = 1
  for (const [a, b] of conns) {
    ctx.beginPath()
    ctx.moveTo(brainCx + nodes[a].x, brainCy + nodes[a].y)
    ctx.lineTo(brainCx + nodes[b].x, brainCy + nodes[b].y)
    ctx.stroke()
  }
  for (let i = 0; i < nodes.length; i++) {
    const pulse = 0.5 + Math.sin(t * 0.004 + i * 0.7) * 0.3
    ctx.fillStyle = rgbaStr(c, pulse)
    ctx.shadowColor = c
    ctx.shadowBlur = 4
    ctx.beginPath(); ctx.arc(brainCx + nodes[i].x, brainCy + nodes[i].y, 3.5, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  }
  // Traveling signals
  for (let ci = 0; ci < conns.length; ci++) {
    const [a, b] = conns[ci]
    const prog = ((t * 0.002 + ci * 0.25) % 1)
    const sx = brainCx + nodes[a].x + (nodes[b].x - nodes[a].x) * prog
    const sy = brainCy + nodes[a].y + (nodes[b].y - nodes[a].y) * prog
    ctx.fillStyle = rgbaStr(c, 0.9)
    ctx.shadowColor = c; ctx.shadowBlur = 4
    ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  }
}

function drawTemporalEngine(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const floorY = cy - WALL_H
  const c = '#f59e0b'
  // Hourglass — large and prominent
  const hgCx = cx - 15
  const hgCy = floorY - 32
  const hgW = 24; const hgH = 52

  // Hourglass glow
  const hGlow = ctx.createRadialGradient(hgCx, hgCy, 0, hgCx, hgCy, 35)
  hGlow.addColorStop(0, rgbaStr(c, 0.1))
  hGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = hGlow
  ctx.beginPath(); ctx.arc(hgCx, hgCy, 35, 0, Math.PI * 2); ctx.fill()

  ctx.strokeStyle = rgbaStr(c, 0.55)
  ctx.lineWidth = 2
  // Top triangle
  ctx.beginPath()
  ctx.moveTo(hgCx - hgW, hgCy - hgH / 2)
  ctx.lineTo(hgCx + hgW, hgCy - hgH / 2)
  ctx.lineTo(hgCx, hgCy)
  ctx.closePath(); ctx.stroke()
  ctx.fillStyle = rgbaStr(c, 0.04); ctx.fill()
  // Bottom triangle
  ctx.beginPath()
  ctx.moveTo(hgCx, hgCy)
  ctx.lineTo(hgCx - hgW, hgCy + hgH / 2)
  ctx.lineTo(hgCx + hgW, hgCy + hgH / 2)
  ctx.closePath(); ctx.stroke()
  ctx.fillStyle = rgbaStr(c, 0.04); ctx.fill()

  // Sand — accumulating in bottom
  const sandProg = (t * 0.0002) % 1
  const bottomFill = sandProg * (hgH / 2 - 4)
  ctx.fillStyle = rgbaStr(c, 0.25)
  ctx.beginPath()
  ctx.moveTo(hgCx - hgW * (bottomFill / (hgH / 2)), hgCy + hgH / 2 - bottomFill)
  ctx.lineTo(hgCx + hgW * (bottomFill / (hgH / 2)), hgCy + hgH / 2 - bottomFill)
  ctx.lineTo(hgCx + hgW, hgCy + hgH / 2)
  ctx.lineTo(hgCx - hgW, hgCy + hgH / 2)
  ctx.closePath(); ctx.fill()

  // Falling sand stream
  for (let s = 0; s < 8; s++) {
    const sandT = (t * 0.004 + s * 0.12) % 1
    const sx = hgCx + Math.sin(s * 3.7) * 2
    const sy = hgCy + sandT * (hgH / 2 - 3)
    ctx.fillStyle = rgbaStr(c, 0.7 - sandT * 0.5)
    ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill()
  }

  // Clock gears — larger
  const gearCx = cx + 35
  const gearCy = floorY - 22
  for (let g = 0; g < 3; g++) {
    const gx = gearCx + g * 22 - 10
    const gy = gearCy + (g === 1 ? -8 : 5)
    const gr = 10 + g * 3
    const rot = t * 0.001 * (g % 2 === 0 ? 1 : -1)
    ctx.save()
    ctx.translate(gx, gy); ctx.rotate(rot)
    ctx.strokeStyle = rgbaStr(c, 0.45)
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.arc(0, 0, gr, 0, Math.PI * 2); ctx.stroke()
    const teeth = 8 + g * 2
    for (let tt = 0; tt < teeth; tt++) {
      const angle = (tt / teeth) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * gr, Math.sin(angle) * gr)
      ctx.lineTo(Math.cos(angle) * (gr + 4), Math.sin(angle) * (gr + 4))
      ctx.stroke()
    }
    // Center dot
    ctx.fillStyle = rgbaStr(c, 0.5)
    ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  // Time readout
  const sec = Math.floor(t / 1000) % 60
  const min = Math.floor(t / 60000) % 60
  const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  ctx.font = 'bold 10px monospace'
  ctx.fillStyle = rgbaStr(c, 0.8)
  ctx.shadowColor = c; ctx.shadowBlur = 6
  ctx.textAlign = 'center'
  ctx.fillText(timeStr, cx + 10, floorY - 58)
  ctx.shadowBlur = 0
}

function drawIdentityVault(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const floorY = cy - WALL_H
  const c = '#f97316'
  const doorCx = cx
  const doorCy = floorY - 32
  const doorR = 36

  // Vault glow
  const vGlow = ctx.createRadialGradient(doorCx, doorCy, 0, doorCx, doorCy, doorR + 15)
  vGlow.addColorStop(0, rgbaStr(c, 0.1))
  vGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = vGlow
  ctx.beginPath(); ctx.arc(doorCx, doorCy, doorR + 15, 0, Math.PI * 2); ctx.fill()

  // Outer ring
  ctx.strokeStyle = rgbaStr(c, 0.45)
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(doorCx, doorCy, doorR, 0, Math.PI * 2); ctx.stroke()

  // Inner rings
  ctx.strokeStyle = rgbaStr(c, 0.3)
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(doorCx, doorCy, doorR * 0.65, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(doorCx, doorCy, doorR * 0.35, 0, Math.PI * 2); ctx.stroke()

  // Cross pattern
  ctx.strokeStyle = rgbaStr(c, 0.35)
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(doorCx, doorCy - doorR); ctx.lineTo(doorCx, doorCy + doorR); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(doorCx - doorR, doorCy); ctx.lineTo(doorCx + doorR, doorCy); ctx.stroke()

  // Spinning lock wheel
  ctx.save()
  ctx.translate(doorCx, doorCy)
  ctx.rotate(t * 0.0008)
  for (let sp = 0; sp < 6; sp++) {
    const angle = (sp / 6) * Math.PI * 2
    ctx.fillStyle = rgbaStr(c, 0.6)
    ctx.beginPath()
    ctx.arc(Math.cos(angle) * doorR * 0.5, Math.sin(angle) * doorR * 0.5, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Security scan sweep
  const scanAngle = (t * 0.0015) % (Math.PI * 2)
  ctx.save()
  ctx.translate(doorCx, doorCy)
  ctx.rotate(scanAngle)
  const scanGrad = ctx.createConicGradient(0, 0, 0)
  scanGrad.addColorStop(0, rgbaStr(c, 0.15))
  scanGrad.addColorStop(0.1, 'transparent')
  scanGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = scanGrad
  ctx.beginPath(); ctx.arc(0, 0, doorR - 2, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Scan line
  ctx.strokeStyle = rgbaStr(c, 0.5)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(doorCx, doorCy)
  ctx.lineTo(doorCx + Math.cos(scanAngle) * doorR, doorCy + Math.sin(scanAngle) * doorR)
  ctx.stroke()
}

function drawBreedingArena(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const floorY = cy - WALL_H
  const c = '#ec4899'
  // 3 cylindrical tubes — larger
  for (let tube = 0; tube < 3; tube++) {
    const tx = cx - 40 + tube * 40
    const ty = floorY - 3
    const tw = 16; const th = 58

    // Tube glow
    const tGlow = ctx.createRadialGradient(tx, ty - th / 2, 0, tx, ty - th / 2, tw + 8)
    tGlow.addColorStop(0, rgbaStr(c, 0.08))
    tGlow.addColorStop(1, 'transparent')
    ctx.fillStyle = tGlow
    ctx.beginPath(); ctx.arc(tx, ty - th / 2, tw + 8, 0, Math.PI * 2); ctx.fill()

    // Tube body
    ctx.strokeStyle = rgbaStr(c, 0.35)
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(tx - tw, ty); ctx.lineTo(tx - tw, ty - th); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(tx + tw, ty); ctx.lineTo(tx + tw, ty - th); ctx.stroke()

    // Ellipses
    ctx.strokeStyle = rgbaStr(c, 0.45)
    ctx.beginPath(); ctx.ellipse(tx, ty - th, tw, 5, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.ellipse(tx, ty, tw, 5, 0, 0, Math.PI * 2); ctx.stroke()

    // Glowing liquid
    const liquidH = th * (0.55 + Math.sin(t * 0.002 + tube * 1.5) * 0.15)
    const lGrad = ctx.createLinearGradient(tx, ty, tx, ty - liquidH)
    lGrad.addColorStop(0, rgbaStr(c, 0.35))
    lGrad.addColorStop(0.5, rgbaStr(c, 0.15))
    lGrad.addColorStop(1, rgbaStr(c, 0.03))
    ctx.fillStyle = lGrad
    ctx.fillRect(tx - tw + 1, ty - liquidH, (tw - 1) * 2, liquidH)

    // Bubbles
    for (let b = 0; b < 8; b++) {
      const bubbleT = (t * 0.002 + tube * 0.4 + b * 0.2) % 1
      const bx = tx + Math.sin(b * 2.3 + tube * 1.7) * (tw - 4)
      const by = ty - bubbleT * liquidH
      const br = 1 + Math.sin(bubbleT * Math.PI) * 1
      ctx.fillStyle = rgbaStr(c, 0.5 - bubbleT * 0.35)
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill()
    }
  }

  // Connection pipes
  ctx.strokeStyle = rgbaStr(c, 0.25)
  ctx.lineWidth = 2
  for (let p = 0; p < 2; p++) {
    const px1 = cx - 40 + p * 40 + 14
    const px2 = cx - 40 + (p + 1) * 40 - 14
    const py = floorY - 30
    ctx.beginPath(); ctx.moveTo(px1, py)
    ctx.quadraticCurveTo((px1 + px2) / 2, py - 8, px2, py)
    ctx.stroke()
    // Flow indicator
    const flowT = (t * 0.003 + p * 0.5) % 1
    const fx = px1 + (px2 - px1) * flowT
    const fy = py - Math.sin(flowT * Math.PI) * 8
    ctx.fillStyle = rgbaStr(c, 0.7)
    ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill()
  }
}

// === ISOMETRIC FURNITURE ===
function drawIsoDesk(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  // Desk surface (parallelogram)
  ctx.fillStyle = '#0f1218'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + 16, y - 4)
  ctx.lineTo(x + 28, y + 2)
  ctx.lineTo(x + 12, y + 6)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgbaStr(color, 0.25)
  ctx.lineWidth = 0.5
  ctx.stroke()
  // Legs
  ctx.strokeStyle = '#1a1e2e'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x + 2, y + 1); ctx.lineTo(x + 2, y + 8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 26, y + 3); ctx.lineTo(x + 26, y + 10); ctx.stroke()
  // Monitor
  ctx.fillStyle = rgbaStr(color, 0.15)
  ctx.fillRect(x + 8, y - 8, 10, 5)
  ctx.strokeStyle = rgbaStr(color, 0.3)
  ctx.lineWidth = 0.5
  ctx.strokeRect(x + 8, y - 8, 10, 5)
}

function drawIsoChair(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = '#0e1018'
  ctx.beginPath()
  ctx.moveTo(x, y); ctx.lineTo(x + 6, y - 2); ctx.lineTo(x + 10, y + 1); ctx.lineTo(x + 4, y + 3)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = rgbaStr(color, 0.15)
  ctx.lineWidth = 0.4
  ctx.stroke()
  // Back rest
  ctx.fillStyle = '#12151f'
  ctx.fillRect(x + 1, y - 5, 3, 4)
}

// Isometric server rack (tall thin box with LED dots)
function drawIsoServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number) {
  const rw = 10; const rd = 6; const rh = 32
  // Left face
  ctx.fillStyle = '#0a0c16'
  ctx.beginPath()
  ctx.moveTo(x, y); ctx.lineTo(x, y - rh); ctx.lineTo(x + rw, y - rh - rd / 2); ctx.lineTo(x + rw, y - rd / 2)
  ctx.closePath(); ctx.fill()
  // Right face
  ctx.fillStyle = '#0e1020'
  ctx.beginPath()
  ctx.moveTo(x + rw, y - rd / 2); ctx.lineTo(x + rw, y - rh - rd / 2); ctx.lineTo(x + rw + rd, y - rh - rd); ctx.lineTo(x + rw + rd, y - rd)
  ctx.closePath(); ctx.fill()
  // Top face
  ctx.fillStyle = '#12141e'
  ctx.beginPath()
  ctx.moveTo(x, y - rh); ctx.lineTo(x + rw, y - rh - rd / 2); ctx.lineTo(x + rw + rd, y - rh - rd); ctx.lineTo(x + rd, y - rh - rd / 2)
  ctx.closePath(); ctx.fill()
  // Neon top edge
  ctx.strokeStyle = rgbaStr(color, 0.5)
  ctx.lineWidth = 1
  ctx.shadowColor = color; ctx.shadowBlur = 4
  ctx.beginPath(); ctx.moveTo(x, y - rh); ctx.lineTo(x + rw, y - rh - rd / 2); ctx.stroke()
  ctx.shadowBlur = 0
  // Blinking LEDs on left face
  for (let led = 0; led < 5; led++) {
    const ly = y - 4 - led * 6
    const blinkOn = Math.sin(time * 0.005 + led * 1.7 + x * 0.1) > -0.2
    ctx.fillStyle = blinkOn ? rgbaStr(color, 0.8) : rgbaStr(color, 0.15)
    ctx.beginPath(); ctx.arc(x + 3, ly, 1, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = blinkOn ? rgbaStr('#ffffff', 0.5) : rgbaStr(color, 0.1)
    ctx.beginPath(); ctx.arc(x + 6, ly, 0.8, 0, Math.PI * 2); ctx.fill()
  }
}

// Wall-mounted screen with data bars
function drawWallScreen(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number) {
  const sw = 22; const sh = 14
  ctx.fillStyle = rgbaStr(color, 0.08)
  ctx.fillRect(x, y, sw, sh)
  ctx.strokeStyle = rgbaStr(color, 0.35)
  ctx.lineWidth = 0.8
  ctx.strokeRect(x, y, sw, sh)
  ctx.shadowColor = color; ctx.shadowBlur = 4
  ctx.strokeRect(x, y, sw, sh)
  ctx.shadowBlur = 0
  // Data bars
  for (let b = 0; b < 4; b++) {
    const bh = 2 + Math.sin(time * 0.003 + b * 0.9 + x * 0.05) * 3 + 3
    ctx.fillStyle = rgbaStr(color, 0.5)
    ctx.fillRect(x + 3 + b * 5, y + sh - 2 - bh, 3, bh)
  }
}

function drawRoomFurniture(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, time: number) {
  const floorY = cy - WALL_H
  // 4 desks with workstations
  drawIsoDesk(ctx, cx - 60, floorY + 5, color)
  drawIsoDesk(ctx, cx + 35, floorY + 10, color)
  drawIsoDesk(ctx, cx - 25, floorY + 20, color)
  drawIsoDesk(ctx, cx + 55, floorY + 22, color)
  // Chairs
  drawIsoChair(ctx, cx - 50, floorY + 12, color)
  drawIsoChair(ctx, cx + 44, floorY + 17, color)
  drawIsoChair(ctx, cx - 15, floorY + 27, color)

  // 2 server racks per room
  drawIsoServerRack(ctx, cx - 85, floorY + 2, color, time)
  drawIsoServerRack(ctx, cx + 72, floorY + 8, color, time)

  // 2 wall-mounted screens
  drawWallScreen(ctx, cx - 70, cy - WALL_H - 58, color, time)
  drawWallScreen(ctx, cx + 48, cy - WALL_H - 52, color, time)

  // Floor cables (thin lines across floor)
  ctx.strokeStyle = rgbaStr(color, 0.1)
  ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.moveTo(cx - 80, floorY + 8); ctx.lineTo(cx - 30, floorY + 18); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + 30, floorY + 14); ctx.lineTo(cx + 75, floorY + 6); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - 40, floorY + 25); ctx.quadraticCurveTo(cx, floorY + 30, cx + 50, floorY + 20); ctx.stroke()

  // Vent grate (small grid pattern on floor)
  const ventX = cx + 15; const ventY = floorY + 32
  ctx.strokeStyle = rgbaStr(color, 0.08)
  ctx.lineWidth = 0.5
  for (let vi = 0; vi < 4; vi++) {
    ctx.beginPath(); ctx.moveTo(ventX + vi * 3, ventY); ctx.lineTo(ventX + vi * 3, ventY + 8); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ventX, ventY + vi * 2.5); ctx.lineTo(ventX + 10, ventY + vi * 2.5); ctx.stroke()
  }
}

const drawRoomInterior: Record<string, (ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) => void> = {
  genome: drawGenomeLab,
  dream: drawDreamChamber,
  war: drawWarRoom,
  redteam: drawRedTeam,
  metalearning: drawMetaLearning,
  temporal: drawTemporalEngine,
  identity: drawIdentityVault,
  breeding: drawBreedingArena,
}

// === MAIN COMPONENT ===
export function IsometricScene({
  activeRoom,
  overviewMode,
  onRoomClick,
  selectedAgentId,
  followingAgentId,
  onAgentSelect,
  onAgentFollow,
}: {
  activeRoom: RoomId
  overviewMode: boolean
  onRoomClick: (roomId: RoomId) => void
  selectedAgentId: string | null
  followingAgentId: string | null
  onAgentSelect: (id: string | null) => void
  onAgentFollow: (id: string) => void
  cameraMode: CameraMode
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<SceneState>({
    pan: { x: 0, y: 0 },
    zoom: 0.85,
    targetZoom: 1,
    targetPan: { x: 0, y: 0 },
    animatedAgents: new Map(),
    particles: [],
    time: 0,
    hoveredRoom: null,
  })
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const rafId = useRef<number>(0)
  const scanlinePatternRef = useRef<CanvasPattern | null>(null)
  const agents = useAgents()

  // Initialize particles
  useEffect(() => {
    const particles: Particle[] = []
    for (let i = 0; i < 240; i++) {
      const room = rooms[i % rooms.length]
      const center = roomCenters[room.id]
      particles.push({
        x: center.x + (Math.random() - 0.5) * TILE_W * 0.6,
        y: center.y - WALL_H - Math.random() * 30,
        vy: -0.15 - Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        alpha: 0.2 + Math.random() * 0.5,
        size: 0.6 + Math.random() * 2,
        color: room.color,
        roomId: room.id,
      })
    }
    stateRef.current.particles = particles
  }, [])

  // Sync agents (or spawn demo agents if none exist)
  useEffect(() => {
    const state = stateRef.current
    const agentMap = state.animatedAgents
    const slotUsage: Record<string, number> = {}

    // If no real agents, create demo agents
    const agentData = agents.length > 0 ? agents : [
      { id: 'demo-1', name: 'Architect', currentRoom: 'genome', status: 'working' as const, color: '#00ff88' },
      { id: 'demo-2', name: 'Dreamer', currentRoom: 'dream', status: 'idle' as const, color: '#8b5cf6' },
      { id: 'demo-3', name: 'Strategist', currentRoom: 'war', status: 'working' as const, color: '#ef4444' },
      { id: 'demo-4', name: 'Attacker', currentRoom: 'redteam', status: 'working' as const, color: '#f87171' },
      { id: 'demo-5', name: 'Thinker', currentRoom: 'metalearning', status: 'idle' as const, color: '#06b6d4' },
      { id: 'demo-6', name: 'Oracle', currentRoom: 'temporal', status: 'working' as const, color: '#f59e0b' },
      { id: 'demo-7', name: 'Guardian', currentRoom: 'identity', status: 'idle' as const, color: '#f97316' },
      { id: 'demo-8', name: 'Breeder', currentRoom: 'breeding', status: 'working' as const, color: '#ec4899' },
      { id: 'demo-9', name: 'Coder', currentRoom: 'genome', status: 'working' as const, color: '#00ff88' },
      { id: 'demo-10', name: 'Scout', currentRoom: 'war', status: 'idle' as const, color: '#ef4444' },
      { id: 'demo-11', name: 'Analyst', currentRoom: 'redteam', status: 'working' as const, color: '#f87171' },
      { id: 'demo-12', name: 'Watcher', currentRoom: 'metalearning', status: 'working' as const, color: '#06b6d4' },
    ]

    agentData.forEach((agent) => {
      const roomId = agent.currentRoom || 'genome'
      const center = roomCenters[roomId]
      if (!center) return

      const slots = agentSlots[roomId] || [{ dx: 0, dy: 0 }]
      const slotIndex = slotUsage[roomId] || 0
      slotUsage[roomId] = slotIndex + 1
      const slot = slots[slotIndex % slots.length]

      const targetX = center.x + slot.dx
      const targetY = center.y - WALL_H + slot.dy

      if (!agentMap.has(agent.id)) {
        agentMap.set(agent.id, {
          id: agent.id,
          name: agent.name,
          color: roomColors[roomId] || '#ffffff',
          roomId,
          currentX: targetX,
          currentY: targetY,
          targetX,
          targetY,
          animPhase: Math.random() * Math.PI * 2,
          state: agent.status === 'working' ? 'working' : 'idle',
        })
      } else {
        const existing = agentMap.get(agent.id)!
        existing.targetX = targetX
        existing.targetY = targetY
        existing.roomId = roomId
        existing.name = agent.name
        existing.color = roomColors[roomId] || '#ffffff'
        existing.state = agent.status === 'working' ? 'working' : 'idle'
      }
    })
  }, [agents])

  const getCoverScale = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return 1
    return Math.max(canvas.width / SCENE_W, canvas.height / SCENE_H)
  }, [])

  // Camera targets
  useEffect(() => {
    const state = stateRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    const coverScale = getCoverScale()
    if (overviewMode) {
      state.targetZoom = coverScale
      state.targetPan = {
        x: (canvas.width - SCENE_W * coverScale) / 2,
        y: (canvas.height - SCENE_H * coverScale) / 2,
      }
    } else {
      const center = roomCenters[activeRoom]
      if (center) {
        const zoomIn = coverScale * 2.5
        state.targetZoom = zoomIn
        state.targetPan = {
          x: canvas.width / 2 - center.x * zoomIn,
          y: canvas.height / 2 - (center.y - WALL_H / 2) * zoomIn,
        }
      }
    }
  }, [activeRoom, overviewMode, getCoverScale])

  // Screen to scene coords
  const screenToScene = useCallback((screenX: number, screenY: number) => {
    const state = stateRef.current
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const cx = screenX * scaleX
    const cy = screenY * scaleY
    return { x: (cx - state.pan.x) / state.zoom, y: (cy - state.pan.y) / state.zoom }
  }, [])

  const findRoomAt = useCallback((sx: number, sy: number): string | null => {
    for (const room of rooms) {
      const center = roomCenters[room.id]
      const dx = sx - center.x
      const dy = sy - (center.y - WALL_H / 2)
      // Isometric diamond hit test
      if (Math.abs(dx) / (TILE_W / 2) + Math.abs(dy) / (TILE_H / 2 + WALL_H / 2) < 1.1) {
        return room.id
      }
    }
    return null
  }, [])

  const findAgentAt = useCallback((sx: number, sy: number): string | null => {
    const state = stateRef.current
    for (const [id, agent] of state.animatedAgents) {
      const dx = sx - agent.currentX
      const dy = sy - agent.currentY
      if (dx * dx + dy * dy < 20 * 20) return id
    }
    return null
  }, [])

  // Draw agent
  const drawAgent = useCallback((
    ctx: CanvasRenderingContext2D,
    agent: AnimatedAgent,
    isSelected: boolean,
    isFollowing: boolean,
    time: number
  ) => {
    const { currentX, currentY, color, name, state: agentState, animPhase } = agent
    const isWalking = Math.abs(agent.targetX - agent.currentX) > 1 || Math.abs(agent.targetY - agent.currentY) > 1
    const isWorking = agentState === 'working' && !isWalking
    const s = 2.5

    ctx.save()
    ctx.translate(currentX, currentY)
    ctx.scale(s, s)

    // Pulsing highlight ring
    const pulseAlpha = 0.2 + Math.sin(time * 0.004 + animPhase) * 0.1
    const ringGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, 18)
    ringGrad.addColorStop(0, 'transparent')
    ringGrad.addColorStop(0.6, rgbaStr(color, pulseAlpha))
    ringGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = ringGrad
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill()

    // Directional shadow (dark parallelogram offset right and down)
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath()
    ctx.moveTo(2, 6); ctx.lineTo(8, 10); ctx.lineTo(10, -8); ctx.lineTo(4, -12)
    ctx.closePath(); ctx.fill()

    // Ground shadow
    const shadowGrad = ctx.createRadialGradient(1, 9, 0, 1, 9, 14)
    shadowGrad.addColorStop(0, rgbaStr(color, 0.35))
    shadowGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = shadowGrad
    ctx.beginPath(); ctx.ellipse(1, 9, 12, 5, 0, 0, Math.PI * 2); ctx.fill()

    // Selection ring
    if (isSelected || isFollowing) {
      ctx.strokeStyle = isFollowing ? '#ffff00' : '#ffffff'
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 3])
      ctx.lineDashOffset = -time * 0.03
      ctx.beginPath(); ctx.ellipse(0, 4, 14, 7, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.setLineDash([])
    }

    const bob = isWorking ? Math.sin(time * 0.004 + animPhase) * 0.8 : Math.sin(time * 0.003 + animPhase) * 1.2
    const walkCycle = time * 0.012 + animPhase
    const legAngle = isWalking ? Math.sin(walkCycle) * 0.7 : 0
    const armAngle = isWalking ? Math.sin(walkCycle + Math.PI) * 0.55 : 0
    const lean = isWalking ? 1.2 : 0
    // Idle look-around
    const lookAngle = (!isWalking && !isWorking) ? Math.sin(time * 0.0008 + animPhase * 3) * 0.4 : 0
    const bodyColor = '#1a1e2e'

    // Desk for working agents
    if (isWorking) {
      ctx.fillStyle = '#0f1218'
      ctx.fillRect(-8, 1 + bob, 16, 5)
      ctx.strokeStyle = rgbaStr(color, 0.3)
      ctx.lineWidth = 0.5
      ctx.strokeRect(-8, 1 + bob, 16, 5)
      ctx.fillStyle = rgbaStr(color, 0.2)
      ctx.fillRect(-5, -2 + bob, 10, 3)
    }

    // Legs
    ctx.save()
    ctx.translate(-2.5, -1 + bob); ctx.rotate(legAngle)
    ctx.fillStyle = bodyColor; ctx.fillRect(-1.5, 0, 3, 9)
    ctx.fillStyle = rgbaStr(color, 0.3); ctx.fillRect(-1.5, 0, 0.8, 9)
    ctx.restore()
    ctx.save()
    ctx.translate(2.5, -1 + bob); ctx.rotate(-legAngle)
    ctx.fillStyle = bodyColor; ctx.fillRect(-1.5, 0, 3, 9)
    ctx.fillStyle = rgbaStr(color, 0.3); ctx.fillRect(0.7, 0, 0.8, 9)
    ctx.restore()

    // Torso
    const torsoY = -12 + bob + lean * 0.3
    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.moveTo(-5, torsoY + 11); ctx.lineTo(-4, torsoY); ctx.lineTo(4, torsoY); ctx.lineTo(5, torsoY + 11)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = rgbaStr(color, 0.5)
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(-5, torsoY + 11); ctx.lineTo(-4, torsoY); ctx.lineTo(4, torsoY); ctx.lineTo(5, torsoY + 11)
    ctx.stroke()
    // Chest stripe
    ctx.fillStyle = rgbaStr(color, 0.4)
    ctx.fillRect(-1, torsoY + 2, 2, 5)

    // Arms
    if (isWorking) {
      ctx.fillStyle = bodyColor
      ctx.save(); ctx.translate(-5, torsoY + 2); ctx.rotate(0.7)
      ctx.fillRect(-1.2, 0, 2.5, 7); ctx.restore()
      ctx.save(); ctx.translate(5, torsoY + 2); ctx.rotate(-0.7)
      ctx.fillRect(-1.2, 0, 2.5, 7); ctx.restore()
    } else {
      ctx.fillStyle = bodyColor
      ctx.save(); ctx.translate(-6, torsoY + 2); ctx.rotate(armAngle)
      ctx.fillRect(-1.2, 0, 2.5, 8); ctx.restore()
      ctx.save(); ctx.translate(6, torsoY + 2); ctx.rotate(-armAngle)
      ctx.fillRect(-1.2, 0, 2.5, 8); ctx.restore()
    }

    // Head
    const headY = torsoY - 4
    const headOffX = lean * 0.4 + lookAngle * 3
    ctx.fillStyle = bodyColor
    ctx.beginPath(); ctx.arc(headOffX, headY + bob, 4, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = rgbaStr(color, 0.6)
    ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.arc(headOffX, headY + bob, 4, -Math.PI * 0.8, Math.PI * 0.3); ctx.stroke()
    // Visor
    ctx.fillStyle = rgbaStr(color, 0.7)
    ctx.beginPath(); ctx.arc(headOffX + 1, headY + bob - 0.3, 2, -0.3, 0.8); ctx.fill()
    // Eye
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(headOffX + 1.5, headY + bob - 0.3, 0.8, 0, Math.PI * 2); ctx.fill()

    // Status effects
    if (isWorking) {
      const dotPhase = time * 0.006 + animPhase
      for (let i = 0; i < 3; i++) {
        const da = (Math.sin(dotPhase + i * 1.2) + 1) / 2
        ctx.fillStyle = `rgba(255,255,255,${0.3 + da * 0.6})`
        ctx.beginPath()
        ctx.arc(-4 + i * 4, headY - 8 + Math.sin(dotPhase + i * 0.8) * 1.5 + bob, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Name label
    ctx.scale(1 / s, 1 / s)
    const displayName = name.length > 10 ? name.slice(0, 9) + '…' : name
    ctx.font = '7px monospace'
    const textW = ctx.measureText(displayName).width
    const pillW = textW + 6
    const pillX = -pillW / 2
    const pillY = 14 * s

    ctx.fillStyle = 'rgba(5,5,15,0.8)'
    ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, 10, 3); ctx.fill()
    ctx.strokeStyle = rgbaStr(color, 0.3)
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, 10, 3); ctx.stroke()
    ctx.fillStyle = '#d1d5db'
    ctx.textAlign = 'center'
    ctx.fillText(displayName, 0, pillY + 7.5)

    ctx.restore()
  }, [])

  // Main render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const state = stateRef.current
    if (!canvas || !ctx) { rafId.current = requestAnimationFrame(render); return }

    state.time = performance.now()

    // Follow agent camera
    if (followingAgentId) {
      const fa = state.animatedAgents.get(followingAgentId)
      if (fa) {
        const fz = getCoverScale() * 2.8
        state.targetZoom = fz
        state.targetPan = { x: canvas.width / 2 - fa.currentX * fz, y: canvas.height / 2 - fa.currentY * fz }
      }
    }

    // Smooth interpolation
    state.zoom += (state.targetZoom - state.zoom) * 0.1
    state.pan.x += (state.targetPan.x - state.pan.x) * 0.1
    state.pan.y += (state.targetPan.y - state.pan.y) * 0.1

    // Update agents
    for (const agent of state.animatedAgents.values()) {
      const dx = agent.targetX - agent.currentX
      const dy = agent.targetY - agent.currentY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0.5) {
        const speed = Math.min(0.04, 2 / dist)
        agent.currentX += dx * speed
        agent.currentY += dy * speed
        agent.state = 'walking'
      } else {
        agent.currentX = agent.targetX
        agent.currentY = agent.targetY
        if (Math.random() < 0.001) {
          const center = roomCenters[agent.roomId]
          const slots = agentSlots[agent.roomId]
          if (center && slots && slots.length > 1) {
            const newSlot = slots[Math.floor(Math.random() * slots.length)]
            agent.targetX = center.x + newSlot.dx + (Math.random() - 0.5) * 6
            agent.targetY = center.y - WALL_H + newSlot.dy + (Math.random() - 0.5) * 4
          }
        }
      }
      agent.animPhase += 0.03
    }

    // Update particles
    for (const p of state.particles) {
      p.y += p.vy
      p.x += p.vx + Math.sin(state.time * 0.001 + p.x * 0.01) * 0.1
      p.alpha -= 0.002
      if (p.alpha <= 0 || p.y < -50) {
        let roomId: string
        if (!overviewMode && Math.random() < 0.4) roomId = activeRoom
        else if (state.hoveredRoom && Math.random() < 0.3) roomId = state.hoveredRoom
        else roomId = sceneRoomIds[Math.floor(Math.random() * sceneRoomIds.length)]
        const center = roomCenters[roomId]
        if (!center) continue
        p.x = center.x + (Math.random() - 0.5) * TILE_W * 0.5
        p.y = center.y - WALL_H - Math.random() * 20
        p.vy = -0.15 - Math.random() * 0.5
        p.alpha = 0.3 + Math.random() * 0.4
        p.size = 0.6 + Math.random() * 2
        p.color = roomColors[roomId]
        p.roomId = roomId
      }
    }

    // === DRAW ===
    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    bgGrad.addColorStop(0, '#080a16')
    bgGrad.addColorStop(0.5, '#0c0e1e')
    bgGrad.addColorStop(1, '#070914')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Ambient stars/dots in background (deterministic based on position)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    for (let si = 0; si < 60; si++) {
      // Pseudo-random positions based on index
      const sx = ((si * 7919 + 3571) % canvas.width)
      const sy = ((si * 6271 + 1847) % canvas.height)
      const ss = 0.3 + (si % 5) * 0.15
      const twinkle = 0.5 + Math.sin(state.time * 0.001 + si * 2.3) * 0.5
      ctx.globalAlpha = twinkle * 0.12
      ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    ctx.save()
    ctx.translate(state.pan.x, state.pan.y)
    ctx.scale(state.zoom, state.zoom)

    // Dim factor for non-active rooms when zoomed in
    const dimAmount = Math.min(1, Math.max(0, (state.zoom / getCoverScale() - 1) / 1.5))

    // Draw isometric walkway bridges between rooms
    const connections: [string, string][] = [
      // Horizontal row 0
      ['genome', 'war'], ['war', 'metalearning'],
      // Horizontal row 1
      ['dream', 'redteam'], ['redteam', 'temporal'],
      // Horizontal row 2
      ['breeding', 'identity'],
      // Vertical connections
      ['genome', 'dream'], ['dream', 'breeding'],
      ['war', 'redteam'], ['redteam', 'identity'],
      ['metalearning', 'temporal'],
    ]
    const flowPhase = state.time * 0.0008
    const walkwayThick = 12 // half-width in screen px for the iso diamond strip
    for (let ci = 0; ci < connections.length; ci++) {
      const [fromId, toId] = connections[ci]
      const from = roomCenters[fromId]
      const to = roomCenters[toId]
      if (!from || !to) continue

      const fx = from.x; const fy = from.y - WALL_H
      const tx = to.x; const ty = to.y - WALL_H
      const dx = tx - fx; const dy = ty - fy
      const len = Math.sqrt(dx * dx + dy * dy)
      const nx = -dy / len * walkwayThick; const ny = dx / len * walkwayThick

      // Walkway floor surface (isometric parallelogram strip)
      ctx.beginPath()
      ctx.moveTo(fx + nx, fy + ny)
      ctx.lineTo(tx + nx, ty + ny)
      ctx.lineTo(tx - nx, ty - ny)
      ctx.lineTo(fx - nx, fy - ny)
      ctx.closePath()
      ctx.fillStyle = '#1a1b2e'
      ctx.fill()

      // Walkway underside (depth strip — left side)
      const wallDrop = 18
      ctx.beginPath()
      ctx.moveTo(fx - nx, fy - ny)
      ctx.lineTo(tx - nx, ty - ny)
      ctx.lineTo(tx - nx, ty - ny + wallDrop)
      ctx.lineTo(fx - nx, fy - ny + wallDrop)
      ctx.closePath()
      ctx.fillStyle = '#0e0f1a'
      ctx.fill()

      // Walkway underside (right side)
      ctx.beginPath()
      ctx.moveTo(tx + nx, ty + ny)
      ctx.lineTo(tx - nx, ty - ny)
      ctx.lineTo(tx - nx, ty - ny + wallDrop)
      ctx.lineTo(tx + nx, ty + ny + wallDrop)
      ctx.closePath()
      ctx.fillStyle = '#12131f'
      ctx.fill()

      // Blend neon color from both rooms
      const fromColor = roomColors[fromId] || '#ffffff'
      const toColor = roomColors[toId] || '#ffffff'

      // Neon edges on walkway top
      ctx.strokeStyle = rgbaStr(fromColor, 0.35)
      ctx.lineWidth = 1.5
      ctx.shadowColor = fromColor
      ctx.shadowBlur = 8
      ctx.beginPath(); ctx.moveTo(fx + nx, fy + ny); ctx.lineTo(tx + nx, ty + ny); ctx.stroke()
      ctx.shadowBlur = 0

      ctx.strokeStyle = rgbaStr(toColor, 0.35)
      ctx.shadowColor = toColor
      ctx.shadowBlur = 8
      ctx.beginPath(); ctx.moveTo(fx - nx, fy - ny); ctx.lineTo(tx - nx, ty - ny); ctx.stroke()
      ctx.shadowBlur = 0

      // Center line dashes on walkway surface
      ctx.strokeStyle = 'rgba(255,220,80,0.08)'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 10])
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke()
      ctx.setLineDash([])

      // Data packets traveling along walkway
      for (let pkt = 0; pkt < 3; pkt++) {
        const pct = (flowPhase + ci * 0.13 + pkt * 0.33) % 1
        const px = fx + (tx - fx) * pct
        const py = fy + (ty - fy) * pct
        ctx.fillStyle = `rgba(255,220,80,${0.4 - pkt * 0.1})`
        ctx.shadowColor = '#ffcc00'
        ctx.shadowBlur = 4
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    // Global floor plane — faint isometric grid lines (just crossing lines, no individual diamonds)
    ctx.strokeStyle = 'rgba(255,255,255,0.012)'
    ctx.lineWidth = 0.5
    const fgStep = 80
    // Diagonal lines going top-left to bottom-right and top-right to bottom-left
    for (let i = -10; i < 30; i++) {
      const x1 = i * fgStep; const y1 = 0
      const x2 = x1 + SCENE_H * 2; const y2 = SCENE_H
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(SCENE_W - x1, y1); ctx.lineTo(SCENE_W - x2, y2); ctx.stroke()
    }

    // Light cones from ceiling — inverted triangle gradient above each room center
    for (const room of rooms) {
      const center = roomCenters[room.id]
      const beamY = center.y - WALL_H - TILE_H / 2
      const isAct = room.id === activeRoom && !overviewMode
      // Main cone
      const beamGrad = ctx.createLinearGradient(center.x, beamY, center.x, beamY - 120)
      beamGrad.addColorStop(0, rgbaStr(room.color, isAct ? 0.12 : 0.06))
      beamGrad.addColorStop(0.5, rgbaStr(room.color, isAct ? 0.05 : 0.025))
      beamGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = beamGrad
      ctx.beginPath()
      ctx.moveTo(center.x - 30, beamY)
      ctx.lineTo(center.x - 55, beamY - 120)
      ctx.lineTo(center.x + 55, beamY - 120)
      ctx.lineTo(center.x + 30, beamY)
      ctx.closePath()
      ctx.fill()
      // Inner bright core cone
      const coreGrad = ctx.createLinearGradient(center.x, beamY, center.x, beamY - 90)
      coreGrad.addColorStop(0, rgbaStr(room.color, isAct ? 0.08 : 0.04))
      coreGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.moveTo(center.x - 12, beamY)
      ctx.lineTo(center.x - 25, beamY - 90)
      ctx.lineTo(center.x + 25, beamY - 90)
      ctx.lineTo(center.x + 12, beamY)
      ctx.closePath()
      ctx.fill()
    }

    // Ambient light layer — large colored glow patches behind rooms
    for (const room of rooms) {
      const center = roomCenters[room.id]
      const ambGrad = ctx.createRadialGradient(center.x, center.y - WALL_H, 20, center.x, center.y - WALL_H, TILE_W * 0.6)
      ambGrad.addColorStop(0, rgbaStr(room.color, 0.14))
      ambGrad.addColorStop(0.5, rgbaStr(room.color, 0.06))
      ambGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = ambGrad
      ctx.beginPath(); ctx.arc(center.x, center.y - WALL_H, TILE_W * 0.6, 0, Math.PI * 2); ctx.fill()
    }

    // Sort rooms by row for proper depth ordering
    const sortedRooms = [...rooms].sort((a, b) => {
      const ay = roomPosition(a.gridCol, a.gridRow).y
      const by = roomPosition(b.gridCol, b.gridRow).y
      return ay - by
    })

    // Draw rooms
    for (const room of sortedRooms) {
      const center = roomCenters[room.id]
      const isActive = room.id === activeRoom && !overviewMode
      const isHovered = room.id === state.hoveredRoom
      const isDimmed = dimAmount > 0.01 && !isActive

      ctx.save()
      if (isDimmed) ctx.globalAlpha = 1 - dimAmount * 0.6

      // Draw room box
      drawIsoRoom(ctx, center.x, center.y, TILE_W, TILE_H, WALL_H, room.color, isActive, isHovered, state.time)

      // Draw furniture
      drawRoomFurniture(ctx, center.x, center.y, room.color, state.time)

      // Draw room interior with clipping to floor diamond
      ctx.save()
      drawIsoDiamond(ctx, center.x, center.y - WALL_H, TILE_W, TILE_H)
      // Don't clip — let elements extend above floor into room space
      const drawInterior = drawRoomInterior[room.id]
      if (drawInterior) {
        drawInterior(ctx, center.x, center.y, state.time)
      }
      ctx.restore()

      // Agent count badge in overview
      if (overviewMode) {
        let agentCount = 0
        for (const a of state.animatedAgents.values()) {
          if (a.roomId === room.id) agentCount++
        }
        if (agentCount > 0) {
          const badgeX = center.x + TILE_W * 0.25
          const badgeY = center.y - WALL_H - TILE_H * 0.35
          ctx.shadowColor = room.color
          ctx.shadowBlur = 6
          ctx.fillStyle = room.color
          ctx.beginPath(); ctx.arc(badgeX, badgeY, 7, 0, Math.PI * 2); ctx.fill()
          ctx.shadowBlur = 0
          ctx.fillStyle = '#000000'
          ctx.font = 'bold 8px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(String(agentCount), badgeX, badgeY + 3)
        }
      }

      ctx.restore()
    }

    // Floor reflections — mirrored glow beneath each room
    for (const room of sortedRooms) {
      const center = roomCenters[room.id]
      const reflY = center.y + TILE_H * 0.2
      // Vertical reflection gradient
      const rGrad = ctx.createLinearGradient(center.x, center.y, center.x, reflY + 30)
      rGrad.addColorStop(0, rgbaStr(room.color, 0.12))
      rGrad.addColorStop(0.5, rgbaStr(room.color, 0.05))
      rGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = rGrad
      drawIsoDiamond(ctx, center.x, reflY, TILE_W * 0.8, TILE_H * 0.5)
      ctx.fill()
    }

    // Atmospheric haze between rooms
    for (const room of rooms) {
      const center = roomCenters[room.id]
      const hazeGrad = ctx.createRadialGradient(center.x, center.y - WALL_H / 2, TILE_W * 0.3, center.x, center.y - WALL_H / 2, TILE_W * 0.8)
      hazeGrad.addColorStop(0, 'transparent')
      hazeGrad.addColorStop(1, rgbaStr(room.color, 0.015))
      ctx.fillStyle = hazeGrad
      ctx.beginPath(); ctx.arc(center.x, center.y - WALL_H / 2, TILE_W * 0.8, 0, Math.PI * 2); ctx.fill()
    }

    // Fog overlay — subtle radial fog from scene center
    const fogCx = SCENE_W / 2
    const fogCy = SCENE_H / 2
    const fogGrad = ctx.createRadialGradient(fogCx, fogCy, 0, fogCx, fogCy, SCENE_W * 0.7)
    fogGrad.addColorStop(0, 'rgba(10,12,30,0.06)')
    fogGrad.addColorStop(0.4, 'rgba(10,12,30,0.03)')
    fogGrad.addColorStop(0.7, 'rgba(10,12,30,0.08)')
    fogGrad.addColorStop(1, 'rgba(10,12,30,0.12)')
    ctx.fillStyle = fogGrad
    ctx.fillRect(-200, -200, SCENE_W + 400, SCENE_H + 400)

    // Draw particles
    for (const p of state.particles) {
      // Soft glow
      ctx.globalAlpha = p.alpha * 0.2
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2); ctx.fill()
      // Core
      ctx.globalAlpha = p.alpha * 0.7
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2); ctx.fill()
      // White center
      ctx.globalAlpha = p.alpha * 0.4
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.25, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    // Draw agents (depth sorted)
    const sortedAgents = [...state.animatedAgents.values()].sort((a, b) => a.currentY - b.currentY)
    for (const agent of sortedAgents) {
      drawAgent(ctx, agent, agent.id === selectedAgentId, agent.id === followingAgentId, state.time)
    }

    ctx.restore()

    // === SCREEN-SPACE EFFECTS ===

    // Vignette
    const vigGrad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.75
    )
    vigGrad.addColorStop(0, 'transparent')
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.3)')
    ctx.fillStyle = vigGrad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Ambient scan line
    const scanPos = ((state.time * 0.0002) % 1) * (canvas.width + 200) - 100
    const scanGrad = ctx.createLinearGradient(scanPos - 80, 0, scanPos + 80, 0)
    scanGrad.addColorStop(0, 'transparent')
    scanGrad.addColorStop(0.4, 'rgba(139,92,246,0.02)')
    scanGrad.addColorStop(0.5, 'rgba(6,182,212,0.04)')
    scanGrad.addColorStop(0.6, 'rgba(139,92,246,0.02)')
    scanGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = scanGrad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Neon border frame (thick green border like reference)
    const bw = 4
    // Outer glow
    ctx.shadowColor = '#00ff88'
    ctx.shadowBlur = 25
    ctx.strokeStyle = 'rgba(0,255,136,0.5)'
    ctx.lineWidth = bw
    ctx.beginPath()
    ctx.roundRect(bw / 2, bw / 2, canvas.width - bw, canvas.height - bw, 8)
    ctx.stroke()
    // Double-stroke for bloom
    ctx.shadowBlur = 15
    ctx.strokeStyle = 'rgba(0,255,136,0.2)'
    ctx.lineWidth = bw + 6
    ctx.beginPath()
    ctx.roundRect(bw / 2, bw / 2, canvas.width - bw, canvas.height - bw, 8)
    ctx.stroke()
    ctx.shadowBlur = 0
    // Inner thin line
    ctx.strokeStyle = 'rgba(0,255,136,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(bw + 5, bw + 5, canvas.width - bw * 2 - 10, canvas.height - bw * 2 - 10, 5)
    ctx.stroke()

    // Corner accents (brighter green dots in corners)
    const cornerR = 4
    const corners = [
      [bw + 1, bw + 1], [canvas.width - bw - 1, bw + 1],
      [bw + 1, canvas.height - bw - 1], [canvas.width - bw - 1, canvas.height - bw - 1],
    ]
    for (const [cx, cy] of corners) {
      ctx.fillStyle = 'rgba(0,255,136,0.5)'
      ctx.shadowColor = '#00ff88'
      ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(cx, cy, cornerR, 0, Math.PI * 2); ctx.fill()
    }
    ctx.shadowBlur = 0

    // Scanline pattern overlay
    if (!scanlinePatternRef.current) {
      const pc = document.createElement('canvas')
      pc.width = 4; pc.height = 4
      const pCtx = pc.getContext('2d')!
      pCtx.fillStyle = 'rgba(0,0,0,0.05)'
      pCtx.fillRect(0, 0, 4, 1)
      scanlinePatternRef.current = ctx.createPattern(pc, 'repeat')
    }
    if (scanlinePatternRef.current) {
      ctx.fillStyle = scanlinePatternRef.current
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    rafId.current = requestAnimationFrame(render)
  }, [activeRoom, overviewMode, selectedAgentId, followingAgentId, drawAgent, getCoverScale])

  // Start render loop
  useEffect(() => {
    rafId.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafId.current)
  }, [render])

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let firstResize = true
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      const coverScale = Math.max(canvas.width / SCENE_W, canvas.height / SCENE_H)
      const state = stateRef.current
      if (overviewMode) {
        state.targetZoom = coverScale
        state.targetPan = {
          x: (canvas.width - SCENE_W * coverScale) / 2,
          y: (canvas.height - SCENE_H * coverScale) / 2,
        }
        if (!firstResize) { state.zoom = coverScale; state.pan = { ...state.targetPan } }
      }
      firstResize = false
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [overviewMode])

  // === INPUT HANDLERS ===
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const sc = screenToScene(mouseX, mouseY)
    stateRef.current.hoveredRoom = findRoomAt(sc.x, sc.y)
    const hoveredAgent = findAgentAt(sc.x, sc.y)
    if (canvasRef.current) {
      canvasRef.current.style.cursor = isDragging.current ? 'grabbing' : (stateRef.current.hoveredRoom || hoveredAgent) ? 'pointer' : 'grab'
    }
    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      stateRef.current.pan.x += dx; stateRef.current.pan.y += dy
      stateRef.current.targetPan.x += dx; stateRef.current.targetPan.y += dy
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
  }, [screenToScene, findRoomAt, findAgentAt])

  const handleMouseUp = useCallback(() => { isDragging.current = false }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sc = screenToScene(e.clientX - rect.left, e.clientY - rect.top)
    const agentId = findAgentAt(sc.x, sc.y)
    if (agentId) { onAgentSelect(agentId); return }
    const roomId = findRoomAt(sc.x, sc.y)
    if (roomId) onRoomClick(roomId as RoomId)
    else onAgentSelect(null)
  }, [screenToScene, findAgentAt, findRoomAt, onAgentSelect, onRoomClick])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const sc = screenToScene(e.clientX - rect.left, e.clientY - rect.top)
    const agentId = findAgentAt(sc.x, sc.y)
    if (agentId) { onAgentFollow(agentId); return }
    const roomId = findRoomAt(sc.x, sc.y)
    if (roomId) onRoomClick(roomId as RoomId)
  }, [screenToScene, findAgentAt, findRoomAt, onAgentFollow, onRoomClick])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const state = stateRef.current
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = (e.clientX - rect.left) * (canvasRef.current!.width / rect.width)
    const mouseY = (e.clientY - rect.top) * (canvasRef.current!.height / rect.height)
    const oldZoom = state.targetZoom
    const newZoom = Math.max(0.5, Math.min(5, oldZoom - e.deltaY * 0.001))
    const scale = newZoom / oldZoom
    state.targetPan.x = mouseX - (mouseX - state.targetPan.x) * scale
    state.targetPan.y = mouseY - (mouseY - state.targetPan.y) * scale
    state.targetZoom = newZoom
  }, [])

  // Touch support
  const touchRef = useRef<{ lastDist: number; lastCenter: { x: number; y: number } } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchRef.current = {
        lastDist: Math.sqrt(dx * dx + dy * dy),
        lastCenter: {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        },
      }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - lastMouse.current.x
      const dy = e.touches[0].clientY - lastMouse.current.y
      stateRef.current.pan.x += dx; stateRef.current.pan.y += dy
      stateRef.current.targetPan.x += dx; stateRef.current.targetPan.y += dy
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2 && touchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      stateRef.current.targetZoom = Math.max(0.5, Math.min(5, stateRef.current.targetZoom * (dist / touchRef.current.lastDist)))
      touchRef.current.lastDist = dist
    }
  }, [])

  const handleTouchEnd = useCallback(() => { isDragging.current = false; touchRef.current = null }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  )
}
