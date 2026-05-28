export type DrakoMood =
  | 'idle'
  | 'wave'
  | 'celebrate'
  | 'confused'
  | 'thinking'
  | 'sleeping'
  | 'pointing'
  | 'sad'
  | 'fire-breath'
  | 'teacher'
  | 'working'
  | 'coffee-break'
  | 'birthday'
  | 'growth-chart'
  | 'levelup'
  | 'achievement';

export type DrakoAnchor =
  | 'sidebar'
  | 'sidebar-dock'
  | 'top-right'
  | 'stage'
  | 'header'
  | 'center'
  | 'table'
  | 'empty-state'
  | 'bottom-right'
  | 'free';

export type DrakoSize = 'sm' | 'md' | 'lg' | 'xl';

export const DRAKO_ALT: Record<DrakoMood, string> = {
  idle: 'Drako the dragon, at rest',
  wave: 'Drako waving hello',
  celebrate: 'Drako celebrating a win',
  confused: 'Drako looking confused',
  thinking: 'Drako thinking',
  sleeping: 'Drako sleeping',
  pointing: 'Drako pointing at something',
  sad: "Drako looking sad",
  'fire-breath': 'Drako breathing fire — major achievement!',
  teacher: 'Drako in teacher mode',
  working: 'Drako hard at work',
  'coffee-break': 'Drako taking a coffee break',
  birthday: 'Drako celebrating a birthday',
  'growth-chart': 'Drako with a growth chart',
  levelup: 'Drako leveling up with a burst of energy',
  achievement: 'Drako unlocking an achievement',
};

export const DRAKO_SIZE_PX: Record<DrakoSize, number> = {
  sm: 64,
  md: 96,
  lg: 192,
  xl: 384,
};

// Walking frames: reference drako-walk-1/2 when available; companion falls back
// to idle+working until walk sprites are dropped into public/drako/.
export const WALK_FRAMES: DrakoMood[] = ['idle', 'working'];

export const COMPANION_PX = 168; // live-action video display width

export type DrakoPresence = 'companion' | 'lair' | 'hidden';

export interface DrakoCompanionState {
  mood: DrakoMood;
  pendingMood: DrakoMood;
  anchor: DrakoAnchor;
  position: { x: number; y: number };
  isWalking: boolean;
  isVisible: boolean;
  caption: string | null;
}

export interface DrakoContextValue {
  state: DrakoCompanionState;
  presence: DrakoPresence;
  setPresence: (presence: DrakoPresence) => void;
  moveTo: (anchor: DrakoAnchor, opts?: { mood?: DrakoMood; caption?: string }) => void;
  setMood: (mood: DrakoMood, opts?: { caption?: string }) => void;
  placeAt: (position: { x: number; y: number }) => void;
  cycleVideoMood: () => void;
  arrive: () => void;
  show: () => void;
  hide: () => void;
}
