/** Shared types for the Phaser isometric office scene */

export type AgentStatus = 'walking' | 'working' | 'idle' | 'meeting' | 'researching';

export interface AgentData {
  id: string;
  name: string;
  color: number;       // hex color e.g. 0x00ffcc
  status: AgentStatus;
  x: number;
  y: number;
  health: 'active' | 'thinking' | 'error';
}

export interface DeskData {
  x: number;
  y: number;
  ownerId: string;
}
