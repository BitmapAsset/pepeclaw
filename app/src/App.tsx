import { useState } from 'react'
import { Scene } from './components/Scene'
import { NavBar } from './components/NavBar'
import { Header } from './components/Header'
import RedTeamArena from './rooms/RedTeamArena'
import MetaLearningCenter from './rooms/MetaLearningCenter'
import TemporalEngine from './rooms/TemporalEngine'
import type { RoomId } from './data/mockData'

const panelRooms: Record<string, React.ComponentType> = {
  redteam: RedTeamArena,
  metalearning: MetaLearningCenter,
  temporal: TemporalEngine,
}

export default function App() {
  const [activeRoom, setActiveRoom] = useState<RoomId>('dream')

  const PanelRoom = panelRooms[activeRoom]

  return (
    <div className="w-full h-full relative">
      <Header />
      <Scene activeRoom={activeRoom} />
      {PanelRoom && (
        <div className="absolute inset-0 z-30 pt-16 pb-20 overflow-hidden">
          <div className="w-full h-full bg-[#0a0b14]/95 backdrop-blur-sm">
            <PanelRoom />
          </div>
        </div>
      )}
      <NavBar activeRoom={activeRoom} onRoomChange={setActiveRoom} />
    </div>
  )
}
