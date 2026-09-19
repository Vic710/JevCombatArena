/**
 * Global Game Configuration
 *
 * Tweak these settings to switch between Player vs Jev, Jev vs Jev self-play,
 * or multi-agent simulations with N Jev agents!
 */
export interface GameConfig {
  /**
   * If true: Player 1 is human-controlled with WASD / SPACE / F / E.
   * If false: All combatants are autonomous Jev AI agents (spectator mode).
   */
  playerEnabled: boolean;

  /**
   * Total number of Jev agents in the arena.
   * - If playerEnabled is true: 1 Human Player + jevAgentCount Jev Bosses.
   * - If playerEnabled is false: jevAgentCount Jev agents fighting each other in FFA self-play.
   * Default is 2 (for 1v1 Jev vs Jev self-play).
   */
  jevAgentCount: number;

  /**
   * How often (ms) each Jev agent evaluates the arena and makes decisions.
   */
  decisionIntervalMs: number;

  /** Max HP for all combatants */
  maxHp: number;

  /** Starting heal charges */
  startHeals: number;

  /** Movement speed (px/sec) */
  moveSpeed: number;

  /** Melee attack radius in pixels */
  meleeRadius: number;

  /** Melee damage per hit */
  meleeDamage: number;

  /** Melee cooldown in milliseconds */
  meleeCooldownMs: number;

  /** Projectile speed in pixels/sec */
  bulletSpeed: number;

  /** Projectile damage per hit */
  bulletDamage: number;

  /** Bullet cooldown in milliseconds */
  bulletCooldownMs: number;

  /** Dash burst speed (px/sec) */
  dashSpeed: number;

  /** Dash duration in milliseconds */
  dashDurationMs: number;

  /** Dash cooldown in milliseconds */
  dashCooldownMs: number;

  /** Melee knockback speed (px/sec) applied to the victim */
  meleeKnockbackSpeed: number;

  /** Melee knockback duration in milliseconds */
  meleeKnockbackDurationMs: number;

  /**
   * Personality / combat style prompt vectors for each Jev agent.
   * Agent i will be assigned personalities[i] (or fallback).
   */
  personalities: string[];
}

export const GAME_CONFIG: GameConfig = {
  // Set to false for pure Jev vs Jev self-play, or true to control Player 1 yourself!
  playerEnabled: false,

  // Number of Jev agents (e.g. 2 for 1v1 Jev vs Jev, or 3-4 for multi-agent FFA)
  jevAgentCount: 2,

  // Personality tags for each Jev agent (1-2 words, displayed on HUD)
  personalities: [
    "Berserker",
    "Sniper",
    "Survivor",
    "Scared just tryna live",
    "Headfirst fighter"
  ],

  decisionIntervalMs: 100,
  maxHp: 100,
  startHeals: 3,
  moveSpeed: 160,
  meleeRadius: 60,
  meleeDamage: 20,
  meleeCooldownMs: 1000,
  bulletSpeed: 320,
  bulletDamage: 20,
  bulletCooldownMs: 1200,

  // Dash & Knockback Mechanics
  dashSpeed: 480,
  dashDurationMs: 150,
  dashCooldownMs: 2500,
  meleeKnockbackSpeed: 380,
  meleeKnockbackDurationMs: 140,
};
