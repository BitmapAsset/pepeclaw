import { useRef, useEffect } from 'react'
import Phaser from 'phaser'
import { useAgents } from '../api/DataProvider'
import { OfficeScene } from '../phaser/OfficeScene'
// IsoHelper provides room layout constants used by OfficeScene
import type { RoomId } from '../data/types'

export type CameraMode = 'isometric' | 'perspective'

interface PhaserSceneProps {
  activeRoom: RoomId
  overviewMode: boolean
  onRoomClick: (roomId: RoomId) => void
  selectedAgentId: string | null
  followingAgentId: string | null
  onAgentSelect: (agentId: string | null) => void
  onAgentFollow: (agentId: string) => void
  cameraMode: CameraMode
}

export function PhaserScene({
  activeRoom,
  overviewMode,
  onRoomClick,
  onAgentSelect,
}: PhaserSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<OfficeScene | null>(null)
  const agents = useAgents()

  // Initialize Phaser game
  useEffect(() => {
    if (!containerRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#0a0e1a',
      scene: OfficeScene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
      audio: { noAudio: true },
      banner: false,
      input: {
        mouse: { preventDefaultWheel: false },
      },
    }

    const game = new Phaser.Game(config)
    gameRef.current = game

    // Get scene reference once it's ready
    game.events.once('ready', () => {
      const scene = game.scene.getScene('OfficeScene') as OfficeScene
      sceneRef.current = scene
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
      sceneRef.current = null
    }
  }, [])

  // Sync activeRoom and overviewMode to Phaser
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) {
      // Scene might not be ready yet, retry after a short delay
      const timeout = setTimeout(() => {
        const s = gameRef.current?.scene.getScene('OfficeScene') as OfficeScene | undefined
        if (s) {
          sceneRef.current = s
          s.setActiveRoom(activeRoom)
          s.setOverviewMode(overviewMode)
          s.onRoomClick = (id) => onRoomClick(id as RoomId)
          s.onAgentSelect = (id) => onAgentSelect(id)
        }
      }, 200)
      return () => clearTimeout(timeout)
    }

    scene.setActiveRoom(activeRoom)
    scene.setOverviewMode(overviewMode)
    scene.onRoomClick = (id) => onRoomClick(id as RoomId)
    scene.onAgentSelect = (id) => onAgentSelect(id)
  }, [activeRoom, overviewMode, onRoomClick, onAgentSelect])

  // Sync agent data to Phaser
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    scene.updateAgents(agents.map(a => ({
      id: a.id,
      name: a.name,
      color: a.color,
      status: a.status,
      currentRoom: a.currentRoom,
    })))
  }, [agents])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    />
  )
}
