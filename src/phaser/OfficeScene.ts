import Phaser from 'phaser'
import {
  TILE_W, TILE_H, WALL_H, SCENE_W, SCENE_H,
  ROOMS, roomCenters, agentSlots, walkways,
  pointInDiamond, hexToComponents,
  type RoomConfig,
} from './IsoHelper'

// Status color mapping
const STATUS_COLORS: Record<string, number> = {
  working: 0x22c55e,
  idle: 0x64748b,
  break: 0xf59e0b,
  meeting: 0x8b5cf6,
  researching: 0x06b6d4,
}

interface AgentSpriteData {
  id: string
  name: string
  color: number
  roomId: string
  status: string
  currentX: number
  currentY: number
  targetX: number
  targetY: number
  bobPhase: number
  circle: Phaser.GameObjects.Arc
  nameText: Phaser.GameObjects.Text
  statusDot: Phaser.GameObjects.Arc
  glowCircle: Phaser.GameObjects.Arc
}

interface RoomGraphics {
  id: string
  config: RoomConfig
  container: Phaser.GameObjects.Container
  floor: Phaser.GameObjects.Polygon
  walls: Phaser.GameObjects.Polygon[]
  nameText: Phaser.GameObjects.Text
  glow: Phaser.GameObjects.Graphics
  interiorGfx: Phaser.GameObjects.Graphics
  isHovered: boolean
}

interface DataPacket {
  progress: number
  fromX: number; fromY: number
  toX: number; toY: number
  dot: Phaser.GameObjects.Arc
}

export class OfficeScene extends Phaser.Scene {
  private roomGraphics: Map<string, RoomGraphics> = new Map()
  private agentSprites: Map<string, AgentSpriteData> = new Map()
  private activeRoom: string = 'overview'
  private overviewMode: boolean = true
  private targetZoom: number = 1.2
  private targetScrollX: number = 0
  private targetScrollY: number = 0
  private gridLines!: Phaser.GameObjects.Graphics
  private ambientParticles!: Phaser.GameObjects.Graphics
  private particleData: Array<{ x: number; y: number; vx: number; vy: number; life: number; alpha: number }> = []
  private dataPackets: DataPacket[] = []

  // Camera drag state
  private isDragging = false
  private dragStart = { x: 0, y: 0 }
  private camScrollStart = { x: 0, y: 0 }
  private dragMoved = false

  // Callbacks
  public onRoomClick?: (roomId: string) => void
  public onAgentSelect?: (agentId: string) => void

  constructor() {
    super({ key: 'OfficeScene' })
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x080c16)

    // Outer neon border (like reference)
    const border = this.add.graphics()
    border.setDepth(60)
    const bx = 20, by = 10, bw = SCENE_W - 40, bh = SCENE_H - 20
    // Wide glow
    border.lineStyle(14, 0x22c55e, 0.08)
    border.strokeRoundedRect(bx, by, bw, bh, 12)
    border.lineStyle(7, 0x22c55e, 0.15)
    border.strokeRoundedRect(bx, by, bw, bh, 12)
    // Core line
    border.lineStyle(2.5, 0x22c55e, 0.5)
    border.strokeRoundedRect(bx, by, bw, bh, 12)

    // Background grid
    this.gridLines = this.add.graphics()
    this.drawGrid()

    // Walkways between rooms
    this.drawWalkways()

    // Create rooms sorted by depth (row then col)
    const sorted = [...ROOMS].sort((a, b) => a.gridRow - b.gridRow || a.gridCol - b.gridCol)
    sorted.forEach(room => this.createRoom(room))

    // Floating holographic panels near rooms
    this.createFloatingPanels()

    // Create room particle emitters
    this.createRoomParticles()

    // Ambient particle layer
    this.ambientParticles = this.add.graphics()
    this.ambientParticles.setDepth(50)
    this.initParticles()

    // Camera bounds and initial position
    this.cameras.main.setBounds(-200, -200, SCENE_W + 400, SCENE_H + 400)
    // Center on the room cluster (rows span y=200 to y~560)
    this.cameras.main.setZoom(1.2)
    this.cameras.main.centerOn(SCENE_W / 2, 380)

    // Input: drag to pan, wheel to zoom, click for room/agent
    this.setupInput()

    // Data packet spawner
    this.time.addEvent({
      delay: 1200,
      callback: () => this.spawnDataPacket(),
      loop: true,
    })

    // Initial camera
    this.updateCamera()
  }

  // ─── Input Setup ───

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true
      this.dragMoved = false
      this.dragStart = { x: pointer.x, y: pointer.y }
      this.camScrollStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY }
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Hover detection
      this.handleHover(pointer.worldX, pointer.worldY)

      if (!this.isDragging || !pointer.isDown) return
      const dx = pointer.x - this.dragStart.x
      const dy = pointer.y - this.dragStart.y
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        this.dragMoved = true
        const zoom = this.cameras.main.zoom
        this.cameras.main.scrollX = this.camScrollStart.x - dx / zoom
        this.cameras.main.scrollY = this.camScrollStart.y - dy / zoom
        // Override smooth camera when dragging
        this.targetScrollX = this.cameras.main.scrollX
        this.targetScrollY = this.cameras.main.scrollY
      }
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragMoved) {
        this.handleClick(pointer.worldX, pointer.worldY)
      }
      this.isDragging = false
    })

    // Scroll to zoom
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: unknown[], _dx: number, dy: number) => {
      this.targetZoom = Phaser.Math.Clamp(
        this.targetZoom - dy * 0.001,
        0.5, 2.5,
      )
    })
  }

  // ─── Grid ───

  private drawGrid(): void {
    const g = this.gridLines
    g.clear()
    // Subtle dot grid
    g.fillStyle(0x1a1b2e, 0.4)
    for (let x = 0; x < SCENE_W; x += 40) {
      for (let y = 0; y < SCENE_H; y += 40) {
        g.fillCircle(x, y, 1)
      }
    }
  }

  // ─── Walkways ───

  private drawWalkways(): void {
    const g = this.add.graphics()
    g.setDepth(48)

    walkways.forEach(({ from, to }) => {
      const a = roomCenters[from]
      const b = roomCenters[to]
      if (!a || !b) return

      // Bright yellow-green walkway color (like reference)
      const walkColor = 0x4ade80

      // L-shaped path: go horizontal first, then vertical
      const midX = b.x
      const midY = a.y

      // Wide glow
      g.lineStyle(12, walkColor, 0.04)
      g.beginPath()
      g.moveTo(a.x, a.y)
      g.lineTo(midX, midY)
      g.lineTo(b.x, b.y)
      g.strokePath()

      // Medium glow
      g.lineStyle(6, walkColor, 0.1)
      g.beginPath()
      g.moveTo(a.x, a.y)
      g.lineTo(midX, midY)
      g.lineTo(b.x, b.y)
      g.strokePath()

      // Core bright line
      g.lineStyle(2.5, walkColor, 0.45)
      g.beginPath()
      g.moveTo(a.x, a.y)
      g.lineTo(midX, midY)
      g.lineTo(b.x, b.y)
      g.strokePath()

      // Corner dot at bend
      g.fillStyle(walkColor, 0.5)
      g.fillCircle(midX, midY, 3)

      // Dots along the L-path
      const segments = [
        { x1: a.x, y1: a.y, x2: midX, y2: midY },
        { x1: midX, y1: midY, x2: b.x, y2: b.y },
      ]
      segments.forEach(seg => {
        const dx = seg.x2 - seg.x1
        const dy = seg.y2 - seg.y1
        const dist = Math.sqrt(dx * dx + dy * dy)
        const steps = Math.floor(dist / 10)
        for (let i = 0; i < steps; i++) {
          const t = i / steps
          g.fillStyle(walkColor, 0.2 + (i % 2) * 0.12)
          g.fillCircle(seg.x1 + dx * t, seg.y1 + dy * t, 2)
        }
      })
    })
  }

  private spawnDataPacket(): void {
    if (walkways.length === 0) return
    const w = walkways[Math.floor(Math.random() * walkways.length)]
    const from = roomCenters[w.from]
    const to = roomCenters[w.to]
    if (!from || !to) return

    const roomCfg = ROOMS.find(r => r.id === w.from)
    const color = roomCfg ? roomCfg.color : 0x8b5cf6

    const dot = this.add.circle(from.x, from.y, 3.5, color, 0.9)
    dot.setDepth(49)

    this.dataPackets.push({
      progress: 0,
      fromX: from.x, fromY: from.y,
      toX: to.x, toY: to.y,
      dot,
    })
  }

  private updateDataPackets(dt: number): void {
    for (let i = this.dataPackets.length - 1; i >= 0; i--) {
      const p = this.dataPackets[i]
      p.progress += dt * 0.5
      if (p.progress >= 1) {
        p.dot.destroy()
        this.dataPackets.splice(i, 1)
        continue
      }
      p.dot.x = p.fromX + (p.toX - p.fromX) * p.progress
      p.dot.y = p.fromY + (p.toY - p.fromY) * p.progress
      p.dot.setAlpha(Math.sin(p.progress * Math.PI) * 0.8)
    }
  }

  // ─── Room Creation ───

  private createRoom(config: RoomConfig): void {
    const center = roomCenters[config.id]
    if (!center) return

    const { x: cx, y: cy } = center
    const hw = TILE_W / 2
    const hh = TILE_H / 2
    const depth = config.gridRow * 10 + config.gridCol

    const container = this.add.container(0, 0)
    container.setDepth(depth)

    // Glow graphics (behind everything)
    const glow = this.add.graphics()
    container.add(glow)

    // Back walls (drawn behind floor)
    const { r: lr, g: lg, b: lb } = hexToComponents(config.color)

    // Back-left wall
    const darkColor = Phaser.Display.Color.GetColor(
      Math.floor(lr * 0.40) + 18, Math.floor(lg * 0.40) + 19, Math.floor(lb * 0.40) + 31
    )
    const backLeftWall = this.add.polygon(0, 0, [
      { x: cx - hw, y: cy - WALL_H },
      { x: cx, y: cy - hh - WALL_H },
      { x: cx, y: cy - hh },
      { x: cx - hw, y: cy },
    ], darkColor, 1.0).setOrigin(0, 0)
    backLeftWall.setStrokeStyle(2, config.color, 0.6)
    container.add(backLeftWall)

    // Back-right wall
    const midDarkColor = Phaser.Display.Color.GetColor(
      Math.floor(lr * 0.45) + 24, Math.floor(lg * 0.45) + 25, Math.floor(lb * 0.45) + 40
    )
    const backRightWall = this.add.polygon(0, 0, [
      { x: cx, y: cy - hh - WALL_H },
      { x: cx + hw, y: cy - WALL_H },
      { x: cx + hw, y: cy },
      { x: cx, y: cy - hh },
    ], midDarkColor, 1.0).setOrigin(0, 0)
    backRightWall.setStrokeStyle(2, config.color, 0.55)
    container.add(backRightWall)

    // Front walls — solid opaque to enclose the box
    const frontLeftColor = Phaser.Display.Color.GetColor(
      Math.floor(lr * 0.32) + 14, Math.floor(lg * 0.32) + 14, Math.floor(lb * 0.32) + 24
    )
    const frontLeftWall = this.add.polygon(0, 0, [
      { x: cx - hw, y: cy },
      { x: cx, y: cy + hh },
      { x: cx, y: cy + hh - WALL_H },
      { x: cx - hw, y: cy - WALL_H },
    ], frontLeftColor, 1.0).setOrigin(0, 0)
    frontLeftWall.setStrokeStyle(2, config.color, 0.5)
    container.add(frontLeftWall)
    const frontRightColor = Phaser.Display.Color.GetColor(
      Math.floor(lr * 0.27) + 12, Math.floor(lg * 0.27) + 12, Math.floor(lb * 0.27) + 20
    )
    const frontRightWall = this.add.polygon(0, 0, [
      { x: cx + hw, y: cy },
      { x: cx, y: cy + hh },
      { x: cx, y: cy + hh - WALL_H },
      { x: cx + hw, y: cy - WALL_H },
    ], frontRightColor, 1.0).setOrigin(0, 0)
    frontRightWall.setStrokeStyle(2, config.color, 0.45)
    container.add(frontRightWall)

    // Floor diamond
    const floorPoints = [
      { x: cx, y: cy - hh },
      { x: cx + hw, y: cy },
      { x: cx, y: cy + hh },
      { x: cx - hw, y: cy },
    ]
    // Vivid dark floor with strong room color tint
    const floorDark = Phaser.Display.Color.GetColor(
      Math.floor(lr * 0.38) + 18, Math.floor(lg * 0.38) + 18, Math.floor(lb * 0.38) + 28
    )
    const floor = this.add.polygon(0, 0, floorPoints, floorDark, 1.0).setOrigin(0, 0)
    floor.setStrokeStyle(3, config.color, 0.85)
    container.add(floor)

    // Floor grid lines
    const floorGrid = this.add.graphics()
    floorGrid.lineStyle(0.7, config.color, 0.18)
    const gridCount = 6
    for (let i = 1; i < gridCount; i++) {
      const t = i / gridCount
      floorGrid.lineBetween(cx - hw + hw * t, cy - hh * (1 - t), cx + hw * t, cy + hh * t)
      floorGrid.lineBetween(cx - hw * t, cy + hh * (1 - t), cx + hw - hw * t, cy - hh + hh * t)
    }
    container.add(floorGrid)

    // Neon top edges (heavy glow — multiple overlapping strokes)
    const neonEdges = this.add.graphics()
    // Back top edges — 5 glow passes for bloom effect
    // Outermost glow
    neonEdges.lineStyle(60, config.color, 0.15)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx, cy - hh - WALL_H)
    neonEdges.lineBetween(cx, cy - hh - WALL_H, cx + hw, cy - WALL_H)
    // Wide glow
    neonEdges.lineStyle(36, config.color, 0.25)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx, cy - hh - WALL_H)
    neonEdges.lineBetween(cx, cy - hh - WALL_H, cx + hw, cy - WALL_H)
    // Medium glow
    neonEdges.lineStyle(20, config.color, 0.45)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx, cy - hh - WALL_H)
    neonEdges.lineBetween(cx, cy - hh - WALL_H, cx + hw, cy - WALL_H)
    // Inner glow
    neonEdges.lineStyle(10, config.color, 0.75)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx, cy - hh - WALL_H)
    neonEdges.lineBetween(cx, cy - hh - WALL_H, cx + hw, cy - WALL_H)
    // Core bright line
    neonEdges.lineStyle(4, config.color, 1.0)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx, cy - hh - WALL_H)
    neonEdges.lineBetween(cx, cy - hh - WALL_H, cx + hw, cy - WALL_H)

    // Vertical corner edges (bright)
    neonEdges.lineStyle(28, config.color, 0.20)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx - hw, cy)
    neonEdges.lineBetween(cx + hw, cy - WALL_H, cx + hw, cy)
    neonEdges.lineStyle(12, config.color, 0.50)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx - hw, cy)
    neonEdges.lineBetween(cx + hw, cy - WALL_H, cx + hw, cy)
    neonEdges.lineStyle(4, config.color, 0.90)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx - hw, cy)
    neonEdges.lineBetween(cx + hw, cy - WALL_H, cx + hw, cy)
    neonEdges.lineStyle(2.5, config.color, 0.75)
    neonEdges.lineBetween(cx, cy - hh - WALL_H, cx, cy - hh)

    // Front top edges
    neonEdges.lineStyle(24, config.color, 0.18)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx, cy + hh - WALL_H)
    neonEdges.lineBetween(cx, cy + hh - WALL_H, cx + hw, cy - WALL_H)
    neonEdges.lineStyle(10, config.color, 0.50)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx, cy + hh - WALL_H)
    neonEdges.lineBetween(cx, cy + hh - WALL_H, cx + hw, cy - WALL_H)
    neonEdges.lineStyle(3, config.color, 0.85)
    neonEdges.lineBetween(cx - hw, cy - WALL_H, cx, cy + hh - WALL_H)
    neonEdges.lineBetween(cx, cy + hh - WALL_H, cx + hw, cy - WALL_H)

    // Bottom floor edges (bright glow)
    neonEdges.lineStyle(32, config.color, 0.20)
    neonEdges.lineBetween(cx - hw, cy, cx, cy + hh)
    neonEdges.lineBetween(cx, cy + hh, cx + hw, cy)
    neonEdges.lineStyle(14, config.color, 0.45)
    neonEdges.lineBetween(cx - hw, cy, cx, cy + hh)
    neonEdges.lineBetween(cx, cy + hh, cx + hw, cy)
    neonEdges.lineStyle(5, config.color, 0.90)
    neonEdges.lineBetween(cx - hw, cy, cx, cy + hh)
    neonEdges.lineBetween(cx, cy + hh, cx + hw, cy)
    container.add(neonEdges)

    // Interior detail graphics (animated per-room)
    const interiorGfx = this.add.graphics()
    container.add(interiorGfx)

    // Room name label (badge style, prominent)
    const nameText = this.add.text(cx, cy - hh - WALL_H - 6, config.name.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: config.colorHex,
      align: 'center',
      backgroundColor: '#0a0e1aee',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5, 0.5).setAlpha(1)
    container.add(nameText)

    // Wall panel details (equipment on back walls)
    const wallPanels = this.add.graphics()
    // Back-left wall panels (larger screens)
    for (let eq = 0; eq < 3; eq++) {
      const t = (eq + 1) / 4
      const eqx = cx - hw * (1 - t) + 5
      const eqy = cy - hh * (1 - t) - WALL_H * 0.65
      wallPanels.fillStyle(config.color, 0.1)
      wallPanels.fillRect(eqx, eqy, 28, 16)
      wallPanels.lineStyle(1, config.color, 0.3)
      wallPanels.strokeRect(eqx, eqy, 28, 16)
      // Status LEDs
      for (let led = 0; led < 4; led++) {
        wallPanels.fillStyle(config.color, 0.35)
        wallPanels.fillCircle(eqx + 5 + led * 5, eqy + 12, 1.5)
      }
      // Data lines
      for (let dl = 0; dl < 2; dl++) {
        wallPanels.fillStyle(config.color, 0.12)
        wallPanels.fillRect(eqx + 2, eqy + 2 + dl * 4, 16, 1.5)
      }
    }
    // Back-right wall panels
    for (let eq = 0; eq < 2; eq++) {
      const t = (eq + 1) / 3
      const eqx = cx + hw * t - 30
      const eqy = cy - hh * t - WALL_H * 0.65
      wallPanels.fillStyle(config.color, 0.05)
      wallPanels.fillRect(eqx, eqy, 26, 14)
      wallPanels.lineStyle(0.6, config.color, 0.18)
      wallPanels.strokeRect(eqx, eqy, 26, 14)
      for (let led = 0; led < 3; led++) {
        wallPanels.fillStyle(config.color, 0.3)
        wallPanels.fillCircle(eqx + 5 + led * 6, eqy + 10, 1.5)
      }
    }
    container.add(wallPanels)

    this.roomGraphics.set(config.id, {
      id: config.id,
      config,
      container,
      floor,
      walls: [backLeftWall, backRightWall, frontLeftWall, frontRightWall],
      nameText,
      glow,
      interiorGfx,
      isHovered: false,
    })
  }

  // ─── Room Particles ───

  private createRoomParticles(): void {
    for (const room of ROOMS) {
      const center = roomCenters[room.id]
      if (!center) continue

      const key = `particle_${room.id}`
      if (!this.textures.exists(key)) {
        const g = this.add.graphics()
        g.fillStyle(room.color, 1)
        g.fillCircle(4, 4, 4)
        g.generateTexture(key, 8, 8)
        g.destroy()
      }

      const emitter = this.add.particles(center.x, center.y - 20, key, {
        speed: { min: 8, max: 20 },
        angle: { min: 230, max: 310 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.45, end: 0 },
        lifespan: 3000,
        frequency: 300,
        quantity: 2,
        blendMode: 'ADD',
        emitting: true,
      })
      emitter.setDepth(room.gridRow * 10 + room.gridCol + 5)
    }
  }

  // ─── Ambient Particles ───

  private initParticles(): void {
    for (let i = 0; i < 80; i++) {
      this.particleData.push({
        x: Math.random() * SCENE_W,
        y: Math.random() * SCENE_H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        life: Math.random(),
        alpha: Math.random() * 0.3,
      })
    }
  }

  // ─── Update Loop ───

  update(time: number, delta: number): void {
    const dt = delta / 1000
    const t = time / 1000

    // Smooth camera transitions
    const cam = this.cameras.main
    const lerpSpeed = 3 * dt
    if (!this.isDragging) {
      cam.zoom += (this.targetZoom - cam.zoom) * lerpSpeed
      cam.scrollX += (this.targetScrollX - cam.scrollX) * lerpSpeed
      cam.scrollY += (this.targetScrollY - cam.scrollY) * lerpSpeed
    } else {
      // Still lerp zoom while dragging
      cam.zoom += (this.targetZoom - cam.zoom) * lerpSpeed
    }

    // Update agent positions (smooth movement)
    this.agentSprites.forEach(agent => {
      const speed = 2 * dt
      agent.currentX += (agent.targetX - agent.currentX) * speed
      agent.currentY += (agent.targetY - agent.currentY) * speed
      agent.bobPhase += dt * 2

      const bob = Math.sin(agent.bobPhase) * 2
      agent.circle.setPosition(agent.currentX, agent.currentY + bob)
      agent.glowCircle.setPosition(agent.currentX, agent.currentY + bob)
      agent.statusDot.setPosition(agent.currentX + 14, agent.currentY - 12 + bob)
      agent.nameText.setPosition(agent.currentX, agent.currentY - 24 + bob)
    })

    // Update room effects
    this.roomGraphics.forEach(room => {
      const isActive = room.id === this.activeRoom && !this.overviewMode
      const center = roomCenters[room.id]
      if (!center) return

      // Glow
      room.glow.clear()
      if (isActive || room.isHovered) {
        const glowAlpha = isActive ? 0.1 : 0.05
        // Multi-ring glow
        for (let i = 4; i > 0; i--) {
          const r = 40 + i * 20
          room.glow.fillStyle(room.config.color, glowAlpha * (1 - i / 6))
          room.glow.fillEllipse(center.x, center.y + 5, r * 2, r)
        }
        const { r: ar, g: ag, b: ab } = hexToComponents(room.config.color)
        const activeFill = Phaser.Display.Color.GetColor(
          Math.floor(ar * 0.42) + 20, Math.floor(ag * 0.42) + 20, Math.floor(ab * 0.42) + 30
        )
        room.floor.setFillStyle(activeFill, 1.0)
      } else {
        const { r: dr, g: dg, b: db } = hexToComponents(room.config.color)
        const darkFill = Phaser.Display.Color.GetColor(
          Math.floor(dr * 0.38) + 18, Math.floor(dg * 0.38) + 18, Math.floor(db * 0.38) + 28
        )
        room.floor.setFillStyle(darkFill, 1.0)
      }

      // Fog of war: dim non-active rooms when focused
      if (!this.overviewMode && this.activeRoom !== 'overview') {
        const targetAlpha = isActive ? 1 : 0.35
        const curAlpha = room.container.alpha
        room.container.setAlpha(curAlpha + (targetAlpha - curAlpha) * 0.04)
      } else {
        const curAlpha = room.container.alpha
        room.container.setAlpha(curAlpha + (1 - curAlpha) * 0.04)
      }

      // Animated room interiors
      this.drawRoomInterior(room, t)
    })

    // Data packets
    this.updateDataPackets(dt)

    // Floating panels
    this.updateFloatingPanels(t)

    // Ambient particles
    this.ambientParticles.clear()
    this.particleData.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.life += dt * 0.1
      p.alpha = Math.sin(p.life * Math.PI) * 0.25
      if (p.x < 0 || p.x > SCENE_W) p.vx *= -1
      if (p.y < 0 || p.y > SCENE_H) p.vy *= -1
      if (p.alpha > 0.01) {
        this.ambientParticles.fillStyle(0x8b5cf6, p.alpha)
        this.ambientParticles.fillCircle(p.x, p.y, 2.5)
      }
    })
  }

  // ─── Room Interior Drawing (per-frame animation) ───

  // Shared base layer: floor cables, wall screens, isometric desk
  private drawRoomBase(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, t: number): void {
    // Floor cables — thin isometric lines tracing across the floor
    g.lineStyle(1.5, color, 0.35)
    g.lineBetween(cx - 90, cy + 18, cx + 90, cy + 18)
    g.lineBetween(cx - 45, cy + 5, cx - 45, cy + 38)
    g.lineBetween(cx + 35, cy + 5, cx + 35, cy + 38)
    g.lineStyle(1, color, 0.20)
    g.lineBetween(cx, cy + 2, cx, cy + 45)
    g.lineBetween(cx - 70, cy + 28, cx + 70, cy + 28)

    // Wall-mounted screens on back-right wall
    for (let s = 0; s < 2; s++) {
      const sx = cx + 38 + s * 40
      const sy = cy - 38 - s * 6
      g.fillStyle(color, 0.14)
      g.fillRect(sx, sy, 28, 18)
      g.lineStyle(1.5, color, 0.55)
      g.strokeRect(sx, sy, 28, 18)
      const scanY = sy + ((t * 9 + s * 6) % 18)
      g.lineStyle(1, color, 0.35)
      g.lineBetween(sx + 1, scanY, sx + 27, scanY)
      // Active dot
      g.fillStyle(color, 0.5 + Math.sin(t * 3 + s) * 0.25)
      g.fillCircle(sx + 24, sy + 3, 2)
    }

    // Isometric desk (parallelogram) in front-left area
    const deskX = cx - 50
    const deskY = cy + 12
    g.fillStyle(0x1a1d30, 0.88)
    g.beginPath()
    g.moveTo(deskX, deskY - 8)
    g.lineTo(deskX + 44, deskY)
    g.lineTo(deskX + 44, deskY + 10)
    g.lineTo(deskX, deskY + 18)
    g.closePath()
    g.fillPath()
    g.lineStyle(1.5, color, 0.45)
    g.strokePath()
    // Monitor on desk
    g.fillStyle(color, 0.10)
    g.fillRect(deskX + 12, deskY - 16, 18, 12)
    g.lineStyle(1.5, color, 0.45)
    g.strokeRect(deskX + 12, deskY - 16, 18, 12)
    // Scan line on monitor
    const mScan = deskY - 16 + ((t * 7) % 12)
    g.lineStyle(0.8, color, 0.3)
    g.lineBetween(deskX + 13, mScan, deskX + 29, mScan)
  }

  private drawRoomInterior(room: RoomGraphics, t: number): void {
    const g = room.interiorGfx
    g.clear()

    const center = roomCenters[room.id]
    if (!center) return
    const cx = center.x
    const cy = center.y

    // Draw shared base elements for all rooms
    this.drawRoomBase(g, cx, cy, room.config.color, t)

    switch (room.id) {
      case 'genome': this.drawGenome(g, cx, cy, room.config.color, t); break
      case 'dream': this.drawDream(g, cx, cy, room.config.color, t); break
      case 'war': this.drawWar(g, cx, cy, room.config.color, t); break
      case 'redteam': this.drawRedTeam(g, cx, cy, room.config.color, t); break
      case 'metalearning': this.drawMetaLearning(g, cx, cy, room.config.color, t); break
      case 'temporal': this.drawTemporal(g, cx, cy, room.config.color, t); break
      case 'identity': this.drawIdentity(g, cx, cy, room.config.color, t); break
      case 'breeding': this.drawBreeding(g, cx, cy, room.config.color, t); break
    }
  }

  // ─── Humanoid figure drawing (2x scale) ───
  private drawHumanoid(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, phase: number, t: number): void {
    const bob = Math.sin(t * 2 + phase) * 2.5
    const walkCycle = Math.sin(t * 3 + phase) * 6
    // Body glow (brighter, larger)
    g.fillStyle(color, 0.18)
    g.fillCircle(x, y - 16 + bob, 28)
    // Head
    g.fillStyle(color, 0.85)
    g.fillCircle(x, y - 40 + bob, 10)
    // Body line (thicker)
    g.lineStyle(4, color, 0.75)
    g.lineBetween(x, y - 32 + bob, x, y - 8 + bob)
    // Arms
    g.lineStyle(3.5, color, 0.65)
    g.lineBetween(x - 14, y - 28 + bob + walkCycle * 0.3, x, y - 24 + bob)
    g.lineBetween(x, y - 24 + bob, x + 14, y - 28 + bob - walkCycle * 0.3)
    // Legs
    g.lineStyle(3.5, color, 0.65)
    g.lineBetween(x, y - 8 + bob, x - 10, y + 10 + bob + walkCycle * 0.5)
    g.lineBetween(x, y - 8 + bob, x + 10, y + 10 + bob - walkCycle * 0.5)
    // Visor/eye (bright)
    g.fillStyle(color, 1.0)
    g.fillRect(x - 6, y - 42 + bob, 12, 4)
  }

  // Genome Lab: LARGE double helix + circular platform + floating panels + humanoids
  private drawGenome(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, t: number): void {
    // Circular platform (large, brighter)
    g.lineStyle(3, color, 0.5)
    g.strokeEllipse(cx, cy + 12, 180, 90)
    g.fillStyle(color, 0.1)
    g.fillEllipse(cx, cy + 12, 180, 90)
    g.lineStyle(1.2, color, 0.2)
    g.strokeEllipse(cx, cy + 12, 220, 110)

    // LARGE Double helix (vertical, prominent — 2x scale)
    const pts = 32
    const helixH = 80
    for (let strand = 0; strand < 2; strand++) {
      g.lineStyle(5, color, 0.9)
      g.beginPath()
      for (let i = 0; i <= pts; i++) {
        const p = i / pts
        const xOff = Math.sin(p * Math.PI * 4 + t * 2 + strand * Math.PI) * 45
        const x = cx + xOff
        const y = cy - helixH + p * helixH * 2
        if (i === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.strokePath()
    }
    // Connecting rungs (thicker, brighter)
    g.lineStyle(2.5, color, 0.5)
    for (let i = 0; i <= pts; i += 2) {
      const p = i / pts
      const x1 = cx + Math.sin(p * Math.PI * 4 + t * 2) * 45
      const x2 = cx + Math.sin(p * Math.PI * 4 + t * 2 + Math.PI) * 45
      const y = cy - helixH + p * helixH * 2
      g.lineBetween(x1, y, x2, y)
    }

    // Floating data panels (larger)
    for (let i = 0; i < 3; i++) {
      const px = cx - 90 + i * 70
      const py = cy - 40 + i * 10 + Math.sin(t * 1.5 + i) * 4
      g.fillStyle(color, 0.06)
      g.fillRect(px, py, 36, 20)
      g.lineStyle(0.8, color, 0.25)
      g.strokeRect(px, py, 36, 20)
      for (let l = 0; l < 4; l++) {
        g.fillStyle(color, 0.15 + Math.sin(t * 2 + l + i) * 0.06)
        g.fillRect(px + 3, py + 3 + l * 4, 12 + (i + l) * 3, 2)
      }
    }

    // Humanoids
    this.drawHumanoid(g, cx - 55, cy + 20, color, 0, t)
    this.drawHumanoid(g, cx + 50, cy + 25, color, 2, t)
  }

  // Dream Chamber: LARGE swirling portal + concentric rings + humanoids
  private drawDream(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, t: number): void {
    // Large concentric portal rings (swirling, brighter — 2x scale)
    for (let i = 10; i > 0; i--) {
      const r = 12 + i * 16 + Math.sin(t * 1.5 + i * 0.8) * 8
      const alpha = 0.35 + Math.sin(t * 2 + i) * 0.15
      g.lineStyle(3 + (10 - i) * 0.5, color, alpha)
      g.strokeEllipse(cx, cy + 5, r * 2, r)
    }

    // Bright glowing center
    g.fillStyle(color, 0.7 + Math.sin(t * 3) * 0.2)
    g.fillCircle(cx, cy + 5, 18)
    g.fillStyle(color, 0.35)
    g.fillCircle(cx, cy + 5, 38)

    // Orbiting sparkles (more, larger)
    for (let i = 0; i < 12; i++) {
      const a = t * 1.2 + (i / 12) * Math.PI * 2
      const r = 70 + Math.sin(t + i) * 12
      const sx = cx + Math.cos(a) * r
      const sy = cy + 5 + Math.sin(a) * r * 0.45
      g.fillStyle(color, 0.6)
      g.fillCircle(sx, sy, 4)
    }

    // Humanoids
    this.drawHumanoid(g, cx - 60, cy + 20, color, 1, t)
    this.drawHumanoid(g, cx + 55, cy + 18, color, 3, t)
  }

  // War Room: LARGE central table + holographic globe + wall screens + humanoids
  private drawWar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, t: number): void {
    // Central table (isometric diamond, bigger)
    g.fillStyle(0x1a1b2e, 0.85)
    g.beginPath()
    g.moveTo(cx, cy - 20)
    g.lineTo(cx + 50, cy)
    g.lineTo(cx, cy + 20)
    g.lineTo(cx - 50, cy)
    g.closePath()
    g.fillPath()
    g.lineStyle(1.5, color, 0.3)
    g.strokePath()

    // LARGE Holographic globe wireframe (2x scale)
    const gr = 55
    const gy = cy - 35
    // Globe glow (brighter)
    g.fillStyle(color, 0.18)
    g.fillCircle(cx, gy, gr)
    g.fillStyle(color, 0.08)
    g.fillCircle(cx, gy, gr + 15)
    // Horizontal rings
    for (let i = 0; i < 6; i++) {
      const lat = -0.7 + i * 0.28
      const ringR = gr * Math.cos(lat)
      const ringY = gy + gr * Math.sin(lat) * 0.5
      g.lineStyle(1.2, color, 0.35)
      g.strokeEllipse(cx, ringY, ringR * 2, ringR * 0.4)
    }
    // Rotating meridians
    for (let m = 0; m < 3; m++) {
      const angle = t * 0.5 + m * (Math.PI / 3)
      g.lineStyle(1, color, 0.3)
      g.beginPath()
      for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * Math.PI * 2
        const x = cx + Math.cos(a + angle) * gr
        const y = gy + Math.sin(a) * gr * 0.5
        if (i === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.strokePath()
    }

    // Wall screens (bigger)
    for (let i = 0; i < 3; i++) {
      const sx = cx - 100 + i * 80
      const sy = cy - 45 + Math.abs(i - 1) * 10
      g.fillStyle(color, 0.06)
      g.fillRect(sx, sy, 35, 20)
      g.lineStyle(0.8, color, 0.25)
      g.strokeRect(sx, sy, 35, 20)
      const scanY = sy + ((t * 10 + i * 7) % 20)
      g.lineStyle(0.8, color, 0.18)
      g.lineBetween(sx + 1, scanY, sx + 34, scanY)
    }

    // Humanoids around table
    this.drawHumanoid(g, cx - 40, cy + 15, color, 0, t)
    this.drawHumanoid(g, cx + 35, cy + 18, color, 2, t)
    this.drawHumanoid(g, cx, cy + 30, color, 4, t)
  }

  // Red Team / Open Office: LARGE workspace with desks + humanoids
  private drawRedTeam(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, t: number): void {
    // Multiple desk stations (isometric)
    for (let d = 0; d < 4; d++) {
      const dx = cx - 60 + (d % 2) * 80
      const dy = cy - 15 + Math.floor(d / 2) * 30
      // Desk surface
      g.fillStyle(0x1a1b2e, 0.7)
      g.beginPath()
      g.moveTo(dx, dy - 6)
      g.lineTo(dx + 25, dy)
      g.lineTo(dx, dy + 6)
      g.lineTo(dx - 25, dy)
      g.closePath()
      g.fillPath()
      g.lineStyle(0.8, color, 0.2)
      g.strokePath()
      // Monitor on desk
      g.fillStyle(color, 0.08)
      g.fillRect(dx - 8, dy - 16, 16, 10)
      g.lineStyle(0.6, color, 0.3)
      g.strokeRect(dx - 8, dy - 16, 16, 10)
    }

    // Large crosshair overlay (2x)
    g.lineStyle(2.5, color, 0.25)
    g.strokeCircle(cx, cy + 5, 80)
    g.lineStyle(1.5, color, 0.18)
    g.lineBetween(cx - 90, cy + 5, cx + 90, cy + 5)
    g.lineBetween(cx, cy - 85, cx, cy + 95)

    // Humanoids at desks
    this.drawHumanoid(g, cx - 55, cy + 8, color, 0, t)
    this.drawHumanoid(g, cx + 50, cy + 12, color, 1.5, t)
    this.drawHumanoid(g, cx - 20, cy + 30, color, 3, t)
    this.drawHumanoid(g, cx + 25, cy + 35, color, 4.5, t)
  }

  // Meta-Learning / Brain Room: LARGE brain + neural nodes + humanoids
  private drawMetaLearning(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, t: number): void {
    // Brain hemispheres (2x scale)
    g.lineStyle(4, color, 0.5)
    g.beginPath()
    g.arc(cx - 18, cy - 5, 65, -Math.PI * 0.3, Math.PI * 0.8, false)
    g.strokePath()
    g.beginPath()
    g.arc(cx + 18, cy - 5, 65, Math.PI * 0.2, Math.PI * 1.3, false)
    g.strokePath()
    // Brain fill
    g.fillStyle(color, 0.08)
    g.fillCircle(cx, cy - 5, 55)

    // Neural network nodes (2x scale)
    const nodes: Array<{ x: number; y: number }> = []
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const nx = cx + Math.cos(a) * 70
      const ny = cy + Math.sin(a) * 36
      nodes.push({ x: nx, y: ny })
      const pulse = 0.5 + Math.sin(t * 3 + i * 0.9) * 0.3
      g.fillStyle(color, pulse)
      g.fillCircle(nx, ny, 7)
    }
    // Center node (bright)
    nodes.push({ x: cx, y: cy })
    g.fillStyle(color, 0.8)
    g.fillCircle(cx, cy, 9)

    // Signal lines
    const signalAlpha = 0.25 + Math.sin(t * 2) * 0.1
    g.lineStyle(1.5, color, signalAlpha)
    for (let i = 0; i < nodes.length - 1; i++) {
      const last = nodes[nodes.length - 1]
      g.lineBetween(nodes[i].x, nodes[i].y, last.x, last.y)
      if (i > 0 && i % 2 === 0) {
        g.lineBetween(nodes[i].x, nodes[i].y, nodes[i - 1].x, nodes[i - 1].y)
      }
    }

    // Traveling signal pulses (more visible, 2x)
    for (let p = 0; p < 8; p++) {
      const nodeIdx = Math.floor((t * 0.5 + p * 0.2) * nodes.length) % (nodes.length - 1)
      const from = nodes[nodeIdx]
      const to = nodes[nodes.length - 1]
      const prog = ((t * 2 + p) % 1)
      const px = from.x + (to.x - from.x) * prog
      const py = from.y + (to.y - from.y) * prog
      g.fillStyle(color, 0.9 * Math.sin(prog * Math.PI))
      g.fillCircle(px, py, 4.5)
    }

    // Humanoids
    this.drawHumanoid(g, cx - 60, cy + 25, color, 1, t)
    this.drawHumanoid(g, cx + 55, cy + 22, color, 3, t)
  }

  // Temporal Engine: LARGE hourglass + rotating gears + humanoids
  private drawTemporal(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, t: number): void {
    // LARGE Hourglass (2x scale, brighter)
    g.lineStyle(4, color, 0.8)
    // Top triangle
    g.beginPath()
    g.moveTo(cx - 50, cy - 65)
    g.lineTo(cx + 50, cy - 65)
    g.lineTo(cx, cy)
    g.closePath()
    g.strokePath()
    // Bottom triangle
    g.beginPath()
    g.moveTo(cx, cy)
    g.lineTo(cx - 50, cy + 65)
    g.lineTo(cx + 50, cy + 65)
    g.closePath()
    g.strokePath()
    // Sand fill (animated, 2x)
    const sandLevel = 0.3 + Math.sin(t * 0.5) * 0.3
    g.fillStyle(color, 0.25)
    g.fillTriangle(
      cx - 50 * sandLevel, cy + 65 - 65 * sandLevel,
      cx + 50 * sandLevel, cy + 65 - 65 * sandLevel,
      cx - 48, cy + 62,
    )
    // Top sand
    g.fillStyle(color, 0.18)
    g.fillTriangle(
      cx - 48, cy - 62,
      cx + 48, cy - 62,
      cx, cy - 5 + 50 * sandLevel,
    )
    // Sand stream
    g.lineStyle(1, color, 0.3 + Math.sin(t * 5) * 0.1)
    g.lineBetween(cx, cy - 2, cx, cy + 5)

    // LARGE Gears (2x)
    this.drawGear(g, cx - 75, cy + 25, 32, 10, t * 1.5, color)
    this.drawGear(g, cx + 75, cy + 22, 26, 8, -t * 2, color)

    // Clock display background (bigger)
    g.fillStyle(0x0a0b14, 0.8)
    g.fillRect(cx - 22, cy - 52, 44, 12)
    g.lineStyle(0.8, color, 0.35)
    g.strokeRect(cx - 22, cy - 52, 44, 12)

    // Humanoids
    this.drawHumanoid(g, cx - 70, cy + 15, color, 2, t)
    this.drawHumanoid(g, cx + 65, cy + 12, color, 4, t)
  }

  private drawGear(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, teeth: number, angle: number, color: number): void {
    g.lineStyle(2.5, color, 0.5)
    g.beginPath()
    for (let i = 0; i <= teeth * 2; i++) {
      const a = angle + (i / (teeth * 2)) * Math.PI * 2
      const rr = i % 2 === 0 ? r : r * 0.65
      const x = cx + Math.cos(a) * rr
      const y = cy + Math.sin(a) * rr * 0.5
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.closePath()
    g.strokePath()
    g.fillStyle(color, 0.45)
    g.fillCircle(cx, cy, 5)
  }

  // Identity Vault: LARGE vault door + spinning lock wheel + humanoids
  private drawIdentity(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, t: number): void {
    // LARGE Vault door circle (2x, brighter)
    g.lineStyle(5, color, 0.8)
    g.strokeCircle(cx, cy + 5, 75)
    // Inner ring
    g.lineStyle(3.5, color, 0.6)
    g.strokeCircle(cx, cy + 5, 50)
    // Cross on vault
    g.lineStyle(3.5, color, 0.6)
    g.lineBetween(cx - 50, cy + 5, cx + 50, cy + 5)
    g.lineBetween(cx, cy - 45, cx, cy + 55)

    // Inner secure area
    g.fillStyle(color, 0.1)
    g.fillCircle(cx, cy + 5, 48)

    // Spinning lock wheel with notches (2x)
    const r = 85
    const notches = 16
    g.lineStyle(1.5, color, 0.22)
    for (let i = 0; i < notches; i++) {
      const a = (i / notches) * Math.PI * 2 + t * 0.3
      const x1 = cx + Math.cos(a) * (r - 8)
      const y1 = (cy + 5) + Math.sin(a) * (r - 8) * 0.5
      const x2 = cx + Math.cos(a) * (r + 5)
      const y2 = (cy + 5) + Math.sin(a) * (r + 5) * 0.5
      g.lineBetween(x1, y1, x2, y2)
    }
    g.lineStyle(0.8, color, 0.16)
    g.strokeEllipse(cx, cy + 5, r * 2, r)

    // Keyhole indicator (2x, pulsing)
    g.fillStyle(color, 0.35 + Math.sin(t * 2) * 0.15)
    g.fillCircle(cx, cy + 5, 14)

    // Humanoids
    this.drawHumanoid(g, cx - 65, cy + 20, color, 0, t)
    this.drawHumanoid(g, cx + 60, cy + 22, color, 2.5, t)
  }

  // Breeding Arena: LARGE cylindrical tubes + liquid fill + rising bubbles + humanoids
  private drawBreeding(g: Phaser.GameObjects.Graphics, cx: number, cy: number, color: number, t: number): void {
    for (let i = 0; i < 3; i++) {
      const tx = cx - 80 + i * 75
      const ty = cy - 5

      // LARGE Tube outline (2x, brighter)
      g.lineStyle(3, color, 0.6)
      g.strokeRect(tx - 20, ty - 55, 40, 110)
      // Top ellipse
      g.lineStyle(3, color, 0.55)
      g.strokeEllipse(tx, ty - 55, 40, 14)
      // Bottom ellipse
      g.strokeEllipse(tx, ty + 55, 40, 14)

      // Liquid fill (animated level, bright, 2x)
      const fillH = 55 + Math.sin(t * 1.5 + i * 1.2) * 25
      g.fillStyle(color, 0.35)
      g.fillRect(tx - 19, ty + 55 - fillH, 38, fillH)

      // Rising bubbles (bigger)
      for (let b = 0; b < 8; b++) {
        const by = ty + 45 - ((t * 18 + b * 12 + i * 8) % 90)
        const bx = tx + Math.sin(t * 2 + b + i) * 8
        g.fillStyle(color, 0.4 + Math.sin(t + b) * 0.15)
        g.fillCircle(bx, by, 3.5)
      }

      // Inner silhouette in tube
      if (i === 1) {
        g.fillStyle(color, 0.15)
        g.fillCircle(tx, ty - 18, 7)
        g.fillRect(tx - 3, ty - 12, 6, 30)
      }
    }

    // Connection lines between tubes
    g.lineStyle(1, color, 0.15)
    g.lineBetween(cx - 60, cy + 28, cx, cy + 28)
    g.lineBetween(cx, cy + 28, cx + 55, cy + 28)

    // Humanoids
    this.drawHumanoid(g, cx - 85, cy + 20, color, 1, t)
    this.drawHumanoid(g, cx + 80, cy + 18, color, 3, t)
  }

  // ─── Floating Holographic Panels ───

  private floatingPanels: Array<{
    gfx: Phaser.GameObjects.Graphics
    x: number; y: number
    baseY: number
    color: number
    phase: number
  }> = []

  private createFloatingPanels(): void {
    const panelData = [
      { roomId: 'genome', dx: 120, dy: -40 },
      { roomId: 'war', dx: -120, dy: -35 },
      { roomId: 'metalearning', dx: 120, dy: -30 },
      { roomId: 'temporal', dx: -120, dy: -25 },
      { roomId: 'breeding', dx: 110, dy: -30 },
      { roomId: 'identity', dx: -110, dy: -30 },
    ]

    panelData.forEach((pd, idx) => {
      const center = roomCenters[pd.roomId]
      if (!center) return
      const room = ROOMS.find(r => r.id === pd.roomId)
      if (!room) return

      const gfx = this.add.graphics()
      gfx.setDepth(45)
      const x = center.x + pd.dx
      const y = center.y + pd.dy

      this.floatingPanels.push({
        gfx, x, y, baseY: y,
        color: room.color,
        phase: idx * 1.3,
      })
    })
  }

  private updateFloatingPanels(t: number): void {
    this.floatingPanels.forEach(panel => {
      const g = panel.gfx
      g.clear()

      const y = panel.baseY + Math.sin(t * 1.2 + panel.phase) * 5
      const w = 50
      const h = 32

      // Panel background
      g.fillStyle(panel.color, 0.06)
      g.fillRect(panel.x - w / 2, y - h / 2, w, h)
      // Border
      g.lineStyle(1, panel.color, 0.3)
      g.strokeRect(panel.x - w / 2, y - h / 2, w, h)
      // Fake data lines
      for (let l = 0; l < 4; l++) {
        const lw = 15 + Math.sin(t * 2 + l + panel.phase) * 10
        g.fillStyle(panel.color, 0.15 + Math.sin(t * 3 + l) * 0.05)
        g.fillRect(panel.x - w / 2 + 4, y - h / 2 + 5 + l * 6, lw, 2)
      }
      // Small blinking dot
      g.fillStyle(panel.color, 0.4 + Math.sin(t * 4 + panel.phase) * 0.3)
      g.fillCircle(panel.x + w / 2 - 6, y - h / 2 + 5, 2)
    })
  }

  // ─── Click / Hover Handling ───

  private handleClick(wx: number, wy: number): void {
    // Check agents first
    for (const [, agent] of this.agentSprites) {
      const dx = wx - agent.currentX
      const dy = wy - agent.currentY
      if (dx * dx + dy * dy < 20 * 20) {
        this.onAgentSelect?.(agent.id)
        return
      }
    }

    // Check rooms
    for (const [, room] of this.roomGraphics) {
      const center = roomCenters[room.id]
      if (center && pointInDiamond(wx, wy, center.x, center.y, TILE_W, TILE_H + WALL_H)) {
        this.onRoomClick?.(room.id)
        return
      }
    }
  }

  private handleHover(wx: number, wy: number): void {
    this.roomGraphics.forEach(room => {
      const center = roomCenters[room.id]
      if (center) {
        room.isHovered = pointInDiamond(wx, wy, center.x, center.y, TILE_W, TILE_H + WALL_H)
      }
    })
  }

  // ─── Public API for React ───

  setActiveRoom(roomId: string): void {
    this.activeRoom = roomId
    this.updateCamera()
  }

  setOverviewMode(overview: boolean): void {
    this.overviewMode = overview
    this.updateCamera()
  }

  private updateCamera(): void {
    const cam = this.cameras.main
    const w = cam.width || 1440
    const h = cam.height || 900

    if (this.overviewMode) {
      this.targetZoom = 1.2
      // Center on the room cluster center
      const cx = SCENE_W / 2
      const cy = 380
      this.targetScrollX = cx - w / (2 * this.targetZoom)
      this.targetScrollY = cy - h / (2 * this.targetZoom)
    } else {
      const center = roomCenters[this.activeRoom]
      if (center) {
        this.targetZoom = 1.8
        this.targetScrollX = center.x - w / (2 * this.targetZoom)
        this.targetScrollY = center.y - h / (2 * this.targetZoom)
      }
    }
  }

  updateAgents(agents: Array<{
    id: string
    name: string
    color: string
    status: string
    currentRoom: string
  }>): void {
    const activeAgentIds = new Set<string>()

    agents.forEach((agent) => {
      activeAgentIds.add(agent.id)

      const colorNum = parseInt(agent.color.replace('#', ''), 16)
      const roomCenter = roomCenters[agent.currentRoom]
      const slots = agentSlots[agent.currentRoom]
      if (!roomCenter) return

      const agentsInRoom = agents.filter(a => a.currentRoom === agent.currentRoom)
      const slotIdx = agentsInRoom.indexOf(agent)
      const slot = slots?.[slotIdx % (slots?.length || 1)] || { dx: 0, dy: 0 }

      const tx = roomCenter.x + slot.dx
      const ty = roomCenter.y + slot.dy

      if (this.agentSprites.has(agent.id)) {
        const sprite = this.agentSprites.get(agent.id)!
        sprite.targetX = tx
        sprite.targetY = ty
        sprite.roomId = agent.currentRoom
        sprite.status = agent.status
        sprite.color = colorNum
        sprite.circle.setFillStyle(colorNum, 0.9)
        sprite.glowCircle.setFillStyle(colorNum, 0.15)
        const statusColor = STATUS_COLORS[agent.status] || 0x64748b
        sprite.statusDot.setFillStyle(statusColor, 1)
      } else {
        const circle = this.add.circle(tx, ty, 14, colorNum, 0.9)
        circle.setStrokeStyle(2.5, 0xffffff, 0.4)
        circle.setDepth(10)

        const glowCircle = this.add.circle(tx, ty, 28, colorNum, 0.15)
        glowCircle.setDepth(9)

        const statusColor = STATUS_COLORS[agent.status] || 0x64748b
        const statusDot = this.add.circle(tx + 14, ty - 12, 5, statusColor, 1)
        statusDot.setDepth(11)

        const nameText = this.add.text(tx, ty - 24, agent.name.split(' ')[0], {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#e2e8f0',
          align: 'center',
        }).setOrigin(0.5, 1).setDepth(11).setAlpha(0.85)

        this.agentSprites.set(agent.id, {
          id: agent.id,
          name: agent.name,
          color: colorNum,
          roomId: agent.currentRoom,
          status: agent.status,
          currentX: tx,
          currentY: ty,
          targetX: tx,
          targetY: ty,
          bobPhase: Math.random() * Math.PI * 2,
          circle,
          nameText,
          statusDot,
          glowCircle,
        })
      }
    })

    // Remove agents that are no longer active
    this.agentSprites.forEach((sprite, id) => {
      if (!activeAgentIds.has(id)) {
        sprite.circle.destroy()
        sprite.nameText.destroy()
        sprite.statusDot.destroy()
        sprite.glowCircle.destroy()
        this.agentSprites.delete(id)
      }
    })
  }
}
