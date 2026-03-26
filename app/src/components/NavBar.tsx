import type { RoomId } from '../data/mockData'
import { rooms } from '../data/mockData'

export function NavBar({ activeRoom, onRoomChange }: { activeRoom: RoomId; onRoomChange: (id: RoomId) => void }) {
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-2 px-3 py-2 bg-anima-surface/80 backdrop-blur-xl border border-anima-border rounded-2xl shadow-2xl">
      {rooms.map(room => {
        const isActive = activeRoom === room.id
        return (
          <button
            key={room.id}
            onClick={() => onRoomChange(room.id)}
            className={`
              px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer
              ${isActive
                ? 'text-white shadow-lg'
                : 'text-anima-text-dim hover:text-anima-text hover:bg-anima-surface-light'
              }
            `}
            style={isActive ? {
              backgroundColor: room.color + '20',
              boxShadow: `0 0 20px ${room.color}30`,
              color: room.color,
            } : undefined}
          >
            {room.name}
          </button>
        )
      })}
    </nav>
  )
}
