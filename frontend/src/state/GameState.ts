// Shared game state types — must stay in sync with backend/src/server.ts

export type NpcMoveAction =
  | "MOVE_UP"
  | "MOVE_DOWN"
  | "MOVE_LEFT"
  | "MOVE_RIGHT"
  | "MOVE_UP_LEFT"
  | "MOVE_UP_RIGHT"
  | "MOVE_DOWN_LEFT"
  | "MOVE_DOWN_RIGHT"
  | "STOP";

export interface AgentCombatState {
  id: string;
  name: string;
  personality?: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  heals: number;
  attackCooldownMs: number;
  bulletCooldownMs: number;
  dashCooldownMs: number;
  nearLeftWall?: boolean;
  nearRightWall?: boolean;
  nearTopWall?: boolean;
  nearBottomWall?: boolean;
}

export interface EnemySummary {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  distance: number;
}

export interface BulletInfo {
  distancePx: number;
  relativeDx: number;
  relativeDy: number;
  vx: number;
  vy: number;
}

export interface GameState {
  // ── Perspective agent (the agent Jev is deciding for) ─────────────────────
  self: AgentCombatState;

  // ── Primary target (closest living enemy) ─────────────────────────────────
  primaryTarget: {
    id: string;
    name: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    heals: number;
    distance: number;
    inMeleeRange: boolean;
    dx: number;
    dy: number;
    bestMoveTowardTarget: NpcMoveAction;
    bestMoveAwayFromTarget: NpcMoveAction;
    hpAdvantage: number;
  } | null;

  // ── Other living enemies (for multi-agent FFA) ─────────────────────────────
  otherEnemies: EnemySummary[];

  // ── Raw Bullet Observation (Objective sensory data) ────────────────────────
  bullets: BulletInfo[];

  arenaWidth: number;
  arenaHeight: number;
}

