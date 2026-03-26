export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="w-8 h-8 rounded-lg bg-anima-accent/20 border border-anima-accent/30 flex items-center justify-center">
          <span className="text-anima-accent font-bold text-sm">A</span>
        </div>
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight">Anima 3D</h1>
          <p className="text-[10px] text-anima-text-dim tracking-widest uppercase">Self-Evolving Agents</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-anima-surface/60 backdrop-blur border border-anima-border text-xs text-anima-text-dim">
          <span className="w-1.5 h-1.5 rounded-full bg-anima-green animate-pulse" />
          Mock Data
        </div>
      </div>
    </header>
  )
}
