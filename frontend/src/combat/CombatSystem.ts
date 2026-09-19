import type { Agent } from "../entities/Agent";
import { GAME_CONFIG } from "../config/gameConfig";

const ARENA_W = 800;
const ARENA_H = 600;
const WALL_MARGIN = 32;

/**
 * Checks whether attacker's melee hit any enemy agents within melee radius.
 * Returns true if at least one enemy was hit.
 */
export function resolveMeleeAttack(
  attacker: Agent,
  allAgents: Agent[]
): boolean {
  let hit = false;
  for (const target of allAgents) {
    if (!target.alive || target.id === attacker.id) continue;

    const dx = attacker.x - target.x;
    const dy = attacker.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= GAME_CONFIG.meleeRadius) {
      target.takeDamage(GAME_CONFIG.meleeDamage);

      // ── Physical Knockback / Bounce Impulse ───────────────────────────────
      let knockDirX = target.x - attacker.x;
      let knockDirY = target.y - attacker.y;
      let len = Math.sqrt(knockDirX * knockDirX + knockDirY * knockDirY);

      if (len < 0.001) {
        // If perfectly concentric / overlapping, push outward towards arena center or random angle
        const angle = Math.random() * Math.PI * 2;
        knockDirX = Math.cos(angle);
        knockDirY = Math.sin(angle);
        len = 1;
      }

      let normX = knockDirX / len;
      let normY = knockDirY / len;

      // ── Wall Safety & Rebound Reflection ──────────────────────────────────
      // If victim is already trapped near a wall and the knockback pushes them
      // into that wall, reflect the vector into the open arena to prevent clipping
      // or getting stuck.
      if (target.x < WALL_MARGIN && normX < 0) {
        normX = Math.abs(normX) * 0.9; // Rebound to the right
      } else if (target.x > ARENA_W - WALL_MARGIN && normX > 0) {
        normX = -Math.abs(normX) * 0.9; // Rebound to the left
      }

      if (target.y < WALL_MARGIN && normY < 0) {
        normY = Math.abs(normY) * 0.9; // Rebound downward
      } else if (target.y > ARENA_H - WALL_MARGIN && normY > 0) {
        normY = -Math.abs(normY) * 0.9; // Rebound upward
      }

      target.applyKnockback(
        normX * GAME_CONFIG.meleeKnockbackSpeed,
        normY * GAME_CONFIG.meleeKnockbackSpeed,
        GAME_CONFIG.meleeKnockbackDurationMs
      );

      hit = true;
    }
  }
  return hit;
}

