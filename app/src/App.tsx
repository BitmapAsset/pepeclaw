import { useState } from 'react'
import { Scene } from './components/Scene'
import { NavBar } from './components/NavBar'
import { Header } from './components/Header'
import type { RoomId } from './data/mockData'

export default function App() {
  const [activeRoom, setActiveRoom] = useState<RoomId>('dream')

  return (
    <div className="w-full h-full relative">
      <Header />
      <Scene activeRoom={activeRoom} />
      <NavBar activeRoom={activeRoom} onRoomChange={setActiveRoom} />
    </div>
  )
}
