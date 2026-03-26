import { motion } from 'framer-motion';
import { useSettings } from '../hooks/useSettings';
import { useConnectionStatus } from '../api/DataProvider';
import { discoverGateway, getConnectionStatus } from '../api/gateway';
import { useState } from 'react';

function Toggle({ value, onChange, label, description }: {
  value: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <div className="text-sm" style={{ color: '#e2e8f0' }}>{label}</div>
        {description && <div className="text-[11px]" style={{ color: '#64748b' }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-10 h-5 rounded-full cursor-pointer border-0 transition-colors duration-200"
        style={{ background: value ? '#8b5cf6' : '#2a2b3d' }}
      >
        <motion.div
          className="absolute top-0.5 w-4 h-4 rounded-full"
          style={{ background: '#e2e8f0' }}
          animate={{ left: value ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function Select<T extends string>({ value, onChange, label, options }: {
  value: T; onChange: (v: T) => void; label: string; options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="text-sm" style={{ color: '#e2e8f0' }}>{label}</div>
      <div className="flex gap-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="px-2.5 py-1 rounded-md text-[11px] font-mono cursor-pointer border-0 transition-all duration-200"
            style={{
              background: value === opt.value ? '#8b5cf620' : 'transparent',
              color: value === opt.value ? '#8b5cf6' : '#64748b',
              border: value === opt.value ? '1px solid #8b5cf640' : '1px solid transparent',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({ value, onChange, label, min, max, step }: {
  value: number; onChange: (v: number) => void; label: string; min: number; max: number; step: number;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="text-sm" style={{ color: '#e2e8f0' }}>{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="w-24 accent-[#8b5cf6]"
        />
        <span className="text-[11px] font-mono w-8 text-right" style={{ color: '#64748b' }}>
          {value.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-[10px] font-mono tracking-widest uppercase mb-3" style={{ color: '#8b5cf6' }}>
        {title}
      </div>
      <div className="glass rounded-xl px-4 py-2">
        {children}
      </div>
    </div>
  );
}

export default function Settings() {
  const [settings, update] = useSettings();
  const connectionStatus = useConnectionStatus();
  const [reconnecting, setReconnecting] = useState(false);

  const handleReconnect = async () => {
    setReconnecting(true);
    await discoverGateway();
    setReconnecting(false);
  };

  const connColor = connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'trying' ? '#f59e0b' : '#64748b';
  const connLabel = connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'trying' ? 'Connecting...' : 'Offline (Mock)';

  return (
    <div className="h-full overflow-y-auto scroll-fade px-6 py-4">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-lg font-semibold mb-1" style={{ color: '#e2e8f0' }}>Settings</h1>
          <p className="text-[11px] font-mono mb-6" style={{ color: '#64748b' }}>
            All settings are stored locally. Nothing leaves your machine unless you opt in.
          </p>

          <Section title="Privacy & Social">
            <Toggle
              value={settings.officeSharing}
              onChange={v => update({ officeSharing: v })}
              label="Office Sharing"
              description="Generate a visitor URL to share your office view"
            />
            <Toggle
              value={settings.leaderboard}
              onChange={v => update({ leaderboard: v })}
              label="Leaderboard"
              description="Submit anonymous fitness scores"
            />
            <Toggle
              value={settings.agentVoice}
              onChange={v => update({ agentVoice: v })}
              label="Agent Voice"
              description="Enable text-to-speech for agent thoughts"
            />
            <Toggle
              value={settings.highlightReel}
              onChange={v => update({ highlightReel: v })}
              label="Highlight Reel"
              description="Auto-capture key moments"
            />
            <div className="border-t border-white/5 mt-2 pt-2">
              <div className="text-[10px] font-mono mb-2" style={{ color: '#64748b' }}>Visitor Visibility</div>
              <Toggle value={settings.visitorHideRooms} onChange={v => update({ visitorHideRooms: v })} label="Hide room contents" />
              <Toggle value={settings.visitorHideAgentNames} onChange={v => update({ visitorHideAgentNames: v })} label="Hide agent names" />
              <Toggle value={settings.visitorHideTaskDetails} onChange={v => update({ visitorHideTaskDetails: v })} label="Hide task details" />
            </div>
          </Section>

          <Section title="Display">
            <Select
              value={settings.theme}
              onChange={v => update({ theme: v })}
              label="Theme"
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'darker', label: 'Darker' },
                { value: 'midnight', label: 'Midnight' },
              ]}
            />
            <Select
              value={settings.particleDensity}
              onChange={v => update({ particleDensity: v })}
              label="Particle Density"
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
            <Slider
              value={settings.animationSpeed}
              onChange={v => update({ animationSpeed: v })}
              label="Animation Speed"
              min={0.2}
              max={2.0}
              step={0.1}
            />
            <Toggle
              value={settings.showThoughtBubbles}
              onChange={v => update({ showThoughtBubbles: v })}
              label="Thought Bubbles"
            />
            <Toggle
              value={settings.showProgressBars}
              onChange={v => update({ showProgressBars: v })}
              label="Progress Bars"
            />
          </Section>

          <Section title="Connection">
            <div className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-sm" style={{ color: '#e2e8f0' }}>Gateway URL</div>
                <div className="text-[11px]" style={{ color: '#64748b' }}>Auto-detected if blank</div>
              </div>
              <input
                type="text"
                value={settings.gatewayUrl}
                onChange={e => update({ gatewayUrl: e.target.value })}
                placeholder="auto"
                className="w-40 px-2 py-1 rounded-md text-[11px] font-mono border-0"
                style={{ background: '#1a1b2e', color: '#e2e8f0', outline: 'none' }}
              />
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: connColor, boxShadow: `0 0 6px ${connColor}80` }} />
                <span className="text-sm" style={{ color: '#e2e8f0' }}>{connLabel}</span>
              </div>
              <button
                onClick={handleReconnect}
                disabled={reconnecting || getConnectionStatus() === 'trying'}
                className="px-3 py-1 rounded-md text-[11px] font-mono cursor-pointer border-0 transition-all"
                style={{
                  background: '#8b5cf620',
                  color: '#8b5cf6',
                  opacity: reconnecting ? 0.5 : 1,
                }}
              >
                {reconnecting ? 'Connecting...' : 'Reconnect'}
              </button>
            </div>
          </Section>

          <Section title="Replay">
            <div className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-sm" style={{ color: '#e2e8f0' }}>Retention</div>
                <div className="text-[11px]" style={{ color: '#64748b' }}>How long to keep replay events</div>
              </div>
              <div className="flex gap-1">
                {[6, 12, 24, 48].map(h => (
                  <button
                    key={h}
                    onClick={() => update({ replayRetentionHours: h })}
                    className="px-2 py-1 rounded-md text-[11px] font-mono cursor-pointer border-0 transition-all"
                    style={{
                      background: settings.replayRetentionHours === h ? '#8b5cf620' : 'transparent',
                      color: settings.replayRetentionHours === h ? '#8b5cf6' : '#64748b',
                      border: settings.replayRetentionHours === h ? '1px solid #8b5cf640' : '1px solid transparent',
                    }}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <div className="text-center py-4">
            <span className="text-[10px] font-mono" style={{ color: '#475569' }}>
              PepeClaw v0.3.0 — All social features are private by default
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
