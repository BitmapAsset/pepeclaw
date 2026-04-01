import Phaser from 'phaser'
import type { AgentData, AgentStatus } from './types'

// ── Constants ───────────────────────────────────────────────
const WALK_SPEED   = 80   // px / sec
const STEP_MS      = 400  // one full leg cycle
const LEG_SWING    = 20   // degrees
const ARM_SWING    = 15
const BOB_PX       = 2
const IDLE_BOB     = 1
const IDLE_BOB_MS  = 2000
const LOOK_ANGLE   = 10   // degrees for idle look-around

const STATUS_COLORS: Record<AgentData['health'], number> = {
  active:   0x00ff88,
  thinking: 0xffcc00,
  error:    0xff3344,
}

// ── AgentSprite ─────────────────────────────────────────────
// Wrapper around a Phaser Container (not extending it, to avoid TS conflicts)

export class AgentSprite {
  readonly container: Phaser.GameObjects.Container
  private scene: Phaser.Scene

  // Body-part graphics
  private shadow: Phaser.GameObjects.Graphics
  private leftLeg: Phaser.GameObjects.Graphics
  private rightLeg: Phaser.GameObjects.Graphics
  private torso: Phaser.GameObjects.Graphics
  private leftArm: Phaser.GameObjects.Graphics
  private rightArm: Phaser.GameObjects.Graphics
  private headGfx: Phaser.GameObjects.Graphics

  // Overlay elements
  private nameLabel: Phaser.GameObjects.Text
  private statusDot: Phaser.GameObjects.Graphics
  private selectionRing: Phaser.GameObjects.Graphics

  // Desk parts (shown when working)
  private deskGroup: Phaser.GameObjects.Container

  // Typing indicator (shown when working)
  private typingDots: Phaser.GameObjects.Graphics

  // Speech bubble (shown during meeting)
  private speechBubble: Phaser.GameObjects.Graphics

  // Follow ring
  private followRing: Phaser.GameObjects.Graphics

  // State
  private agentData: AgentData
  private currentAnim: AgentStatus = 'idle'
  private animTweens: Phaser.Tweens.Tween[] = []
  private _selected = false
  private _isFollowing = false
  private dashOffset = 0
  private lastClickTime = 0

  constructor(scene: Phaser.Scene, x: number, y: number, data: AgentData) {
    this.scene = scene
    this.agentData = { ...data }
    this.container = scene.add.container(x, y)

    // Shadow
    this.shadow = scene.add.graphics()
    this.shadow.fillStyle(0x000000, 0.3)
    this.shadow.fillEllipse(0, 42, 32, 12)
    this.container.add(this.shadow)

    // Glow beneath
    const glow = scene.add.graphics()
    glow.fillStyle(data.color, 0.14)
    glow.fillCircle(0, 16, 36)
    this.container.add(glow)

    // Legs
    this.leftLeg  = this.makeRect(-6, 20, 6, 24, data.color, 0.85)
    this.rightLeg = this.makeRect(2, 20, 6, 24, data.color, 0.85)

    // Body torso
    this.torso = scene.add.graphics()
    this.torso.fillStyle(data.color, 1)
    this.torso.fillRoundedRect(-10, -8, 20, 28, 4)
    this.container.add(this.torso)

    // Arms
    this.leftArm  = this.makeRect(-16, -4, 6, 20, data.color, 0.75)
    this.rightArm = this.makeRect(10, -4, 6, 20, data.color, 0.75)

    // Head
    this.headGfx = scene.add.graphics()
    this.headGfx.fillStyle(data.color, 1)
    this.headGfx.fillCircle(0, -18, 10)
    this.headGfx.fillStyle(0xffffff, 0.25)
    this.headGfx.fillCircle(-2, -22, 4)
    this.container.add(this.headGfx)

    // Status dot
    this.statusDot = scene.add.graphics()
    this.drawStatusDot()
    this.container.add(this.statusDot)

    // Name label
    this.nameLabel = scene.add.text(0, 52, data.name, {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.55)',
      padding: { x: 4, y: 2 },
      align: 'center',
    }).setOrigin(0.5, 0)
    this.container.add(this.nameLabel)

    // Selection ring
    this.selectionRing = scene.add.graphics()
    this.selectionRing.setVisible(false)
    this.container.add(this.selectionRing)

    // Follow ring
    this.followRing = scene.add.graphics()
    this.followRing.setVisible(false)
    this.container.add(this.followRing)

    // Desk group
    this.deskGroup = scene.add.container(18, 6)
    const desk = scene.add.graphics()
    desk.fillStyle(0x1a1e2e, 1)
    desk.fillRect(-10, -3, 20, 12)
    desk.lineStyle(1, 0x2a3050)
    desk.strokeRect(-10, -3, 20, 12)
    this.deskGroup.add(desk)
    const monitor = scene.add.graphics()
    monitor.fillStyle(0x0e1525, 1)
    monitor.fillRect(-4, -9, 8, 6)
    monitor.lineStyle(1, data.color, 0.6)
    monitor.strokeRect(-4, -9, 8, 6)
    monitor.fillStyle(data.color, 0.15)
    monitor.fillRect(-3, -8, 6, 4)
    this.deskGroup.add(monitor)
    const chair = scene.add.graphics()
    chair.fillStyle(0x1a1e2e, 0.8)
    chair.fillCircle(-18, 2, 5)
    this.deskGroup.add(chair)
    this.deskGroup.setVisible(false)
    this.container.add(this.deskGroup)

    // Typing dots
    this.typingDots = scene.add.graphics()
    this.typingDots.setVisible(false)
    this.container.add(this.typingDots)

    // Speech bubble
    this.speechBubble = scene.add.graphics()
    this.speechBubble.setVisible(false)
    this.container.add(this.speechBubble)

    // Interaction
    this.container.setSize(48, 88)
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-24, -36, 48, 88),
      Phaser.Geom.Rectangle.Contains,
    )
    this.container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.container.emit('select', this.agentData)
      if (pointer.leftButtonDown()) {
        const now = Date.now()
        if (now - this.lastClickTime < 350) {
          this.container.emit('follow', this.agentData)
        }
        this.lastClickTime = now
      }
    })

    this.playIdle()
  }

  // ── Public API ────────────────────────────────────────────

  get x(): number { return this.container.x }
  get y(): number { return this.container.y }

  updateAgent(data: AgentData): void {
    const prev = this.agentData
    this.agentData = { ...data }
    if (data.status !== prev.status) this.transitionTo(data.status)
    if (data.health !== prev.health) this.drawStatusDot()
    if (data.status !== 'walking' && (data.x !== this.container.x || data.y !== this.container.y)) {
      this.walkTo(data.x, data.y)
    }
  }

  walkTo(tx: number, ty: number): void {
    const dist = Phaser.Math.Distance.Between(this.container.x, this.container.y, tx, ty)
    if (dist < 2) return
    const duration = (dist / WALK_SPEED) * 1000
    this.transitionTo('walking')
    const moveTween = this.scene.tweens.add({
      targets: this.container, x: tx, y: ty, duration, ease: 'Sine.InOut',
      onComplete: () => {
        this.transitionTo(this.agentData.status === 'walking' ? 'idle' : this.agentData.status)
      },
    })
    this.animTweens.push(moveTween)
  }

  setSelected(v: boolean): void {
    this._selected = v
    this.selectionRing.setVisible(v)
    if (v) this.drawSelectionRing()
  }

  setFollowing(v: boolean): void {
    this._isFollowing = v
    this.followRing.setVisible(v)
    if (v) this.startFollowPulse()
  }

  destroy(): void {
    this.stopAnimations()
    this.container.destroy()
  }

  // ── Animation state machine ───────────────────────────────

  private transitionTo(status: AgentStatus): void {
    if (status === this.currentAnim) return
    this.stopAnimations()
    this.currentAnim = status
    switch (status) {
      case 'walking':     this.playWalking(); break
      case 'working':     this.playWorking(); break
      case 'idle':        this.playIdle(); break
      case 'meeting':     this.playMeeting(); break
      case 'researching': this.playResearching(); break
    }
  }

  private stopAnimations(): void {
    for (const tw of this.animTweens) {
      if (tw.isPlaying()) tw.stop()
    }
    this.animTweens = []
    this.leftLeg.setRotation(0)
    this.rightLeg.setRotation(0)
    this.leftArm.setRotation(0)
    this.rightArm.setRotation(0)
    this.headGfx.setRotation(0)
    this.torso.y = 0
    this.torso.setRotation(0)
    this.deskGroup.setVisible(false)
    this.typingDots.setVisible(false)
    this.speechBubble.setVisible(false)
  }

  private playWalking(): void {
    const deg = Phaser.Math.DegToRad
    this.animTweens.push(this.scene.tweens.add({ targets: this.leftLeg, rotation: deg(LEG_SWING), duration: STEP_MS / 2, yoyo: true, repeat: -1, ease: 'Sine.InOut' }))
    this.animTweens.push(this.scene.tweens.add({ targets: this.rightLeg, rotation: deg(-LEG_SWING), duration: STEP_MS / 2, yoyo: true, repeat: -1, ease: 'Sine.InOut' }))
    this.animTweens.push(this.scene.tweens.add({ targets: this.leftArm, rotation: deg(-ARM_SWING), duration: STEP_MS / 2, yoyo: true, repeat: -1, ease: 'Sine.InOut' }))
    this.animTweens.push(this.scene.tweens.add({ targets: this.rightArm, rotation: deg(ARM_SWING), duration: STEP_MS / 2, yoyo: true, repeat: -1, ease: 'Sine.InOut' }))
    this.animTweens.push(this.scene.tweens.add({ targets: this.torso, y: -BOB_PX, duration: STEP_MS / 2, yoyo: true, repeat: -1, ease: 'Sine.InOut' }))
    this.headGfx.setRotation(Phaser.Math.DegToRad(5))
  }

  private playWorking(): void {
    this.deskGroup.setVisible(true)
    this.typingDots.setVisible(true)
    this.leftLeg.setRotation(Phaser.Math.DegToRad(45))
    this.rightLeg.setRotation(Phaser.Math.DegToRad(45))
    this.leftArm.setRotation(Phaser.Math.DegToRad(-30))
    this.rightArm.setRotation(Phaser.Math.DegToRad(-30))
    this.drawTypingDots(0)
    let dotIndex = 0
    this.animTweens.push(this.scene.tweens.addCounter({
      from: 0, to: 3, duration: 900, repeat: -1,
      onUpdate: (tween) => {
        const val = tween.getValue()
        if (val == null) return
        const next = Math.floor(val)
        if (next !== dotIndex) { dotIndex = next; this.drawTypingDots(dotIndex) }
      },
    }))
    this.animTweens.push(this.scene.tweens.add({ targets: this.headGfx, rotation: Phaser.Math.DegToRad(6), duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 2000 }))
  }

  private playIdle(): void {
    this.animTweens.push(this.scene.tweens.add({ targets: this.torso, y: -IDLE_BOB, duration: IDLE_BOB_MS, yoyo: true, repeat: -1, ease: 'Sine.InOut' }))
    this.animTweens.push(this.scene.tweens.add({ targets: this.leftArm, rotation: Phaser.Math.DegToRad(3), duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.InOut' }))
    this.animTweens.push(this.scene.tweens.add({ targets: this.rightArm, rotation: Phaser.Math.DegToRad(-3), duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 300 }))
    this.scheduleLookAround()
  }

  private scheduleLookAround(): void {
    const delay = 3000 + Math.random() * 2000
    const tw = this.scene.tweens.add({
      targets: this.headGfx,
      rotation: Phaser.Math.DegToRad(Math.random() > 0.5 ? LOOK_ANGLE : -LOOK_ANGLE),
      duration: 600, yoyo: true, delay, ease: 'Sine.InOut',
      onComplete: () => { if (this.currentAnim === 'idle') this.scheduleLookAround() },
    })
    this.animTweens.push(tw)
  }

  private playMeeting(): void {
    this.speechBubble.setVisible(true)
    this.drawSpeechBubble()
    this.torso.setRotation(Phaser.Math.DegToRad(8))
    let dotIdx = 0
    this.animTweens.push(this.scene.tweens.addCounter({
      from: 0, to: 3, duration: 1200, repeat: -1,
      onUpdate: (tween) => {
        const val = tween.getValue()
        if (val == null) return
        const next = Math.floor(val)
        if (next !== dotIdx) { dotIdx = next; this.drawSpeechBubble(dotIdx) }
      },
    }))
  }

  private playResearching(): void {
    this.rightArm.setRotation(Phaser.Math.DegToRad(-50))
    this.animTweens.push(this.scene.tweens.addCounter({
      from: 0, to: 1, duration: 800, repeat: -1,
      onRepeat: () => { this.emitDataParticle() },
    }))
    this.animTweens.push(this.scene.tweens.add({ targets: this.torso, y: -IDLE_BOB, duration: IDLE_BOB_MS, yoyo: true, repeat: -1, ease: 'Sine.InOut' }))
  }

  private emitDataParticle(): void {
    const p = this.scene.add.graphics()
    p.fillStyle(this.agentData.color, 0.8)
    p.fillCircle(0, 0, 1.5)
    p.setPosition(this.container.x + 20, this.container.y - 5 + Math.random() * 10)
    this.scene.tweens.add({
      targets: p, x: this.container.x + 5, y: this.container.y - 8, alpha: 0,
      duration: 600, ease: 'Sine.In', onComplete: () => p.destroy(),
    })
  }

  // ── Drawing helpers ───────────────────────────────────────

  private makeRect(rx: number, ry: number, w: number, h: number, color: number, alpha: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics()
    g.fillStyle(color, alpha)
    g.fillRect(0, 0, w, h)
    g.setPosition(rx, ry)
    this.container.add(g)
    return g
  }

  private drawStatusDot(): void {
    this.statusDot.clear()
    const c = STATUS_COLORS[this.agentData.health] ?? 0x888888
    this.statusDot.fillStyle(c, 1)
    this.statusDot.fillCircle(16, -28, 4.5)
    this.statusDot.lineStyle(1.5, 0x000000, 0.4)
    this.statusDot.strokeCircle(16, -28, 4.5)
  }

  private drawTypingDots(active: number): void {
    this.typingDots.clear()
    for (let i = 0; i < 3; i++) {
      const a = i <= active ? 0.9 : 0.2
      this.typingDots.fillStyle(this.agentData.color, a)
      this.typingDots.fillCircle(-4 + i * 5, -22, 1.5)
    }
  }

  private drawSpeechBubble(dotActive = 0): void {
    this.speechBubble.clear()
    this.speechBubble.fillStyle(0x1a1e2e, 0.9)
    this.speechBubble.fillRoundedRect(-10, -32, 20, 10, 3)
    this.speechBubble.fillTriangle(-2, -22, 2, -22, 0, -18)
    for (let i = 0; i < 3; i++) {
      const a = i <= dotActive ? 1 : 0.3
      this.speechBubble.fillStyle(0xffffff, a)
      this.speechBubble.fillCircle(-4 + i * 5, -27, 1.5)
    }
  }

  private drawSelectionRing(): void {
    this.selectionRing.clear()
    this.selectionRing.lineStyle(1, 0xffffff, 0.6)
    const r = 16
    const segments = 12
    for (let i = 0; i < segments; i += 2) {
      const start = (i / segments) * Math.PI * 2 + this.dashOffset
      const end = ((i + 1) / segments) * Math.PI * 2 + this.dashOffset
      this.selectionRing.beginPath()
      this.selectionRing.arc(0, 4, r, start, end, false)
      this.selectionRing.strokePath()
    }
  }

  private startFollowPulse(): void {
    this.animTweens.push(this.scene.tweens.add({
      targets: this.followRing, alpha: 0.2, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      onUpdate: () => {
        this.followRing.clear()
        this.followRing.lineStyle(2, this.agentData.color, this.followRing.alpha)
        this.followRing.strokeCircle(0, 4, 20)
      },
    }))
  }

  onUpdate(): void {
    if (this._selected) {
      this.dashOffset += 0.02
      this.drawSelectionRing()
    }
    if (this._isFollowing) {
      this.followRing.setVisible(true)
    }
  }
}
