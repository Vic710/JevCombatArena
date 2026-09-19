import Phaser from "phaser";
import { Bullet } from "../entities/Bullet";
import { GAME_CONFIG } from "../config/gameConfig";
import type { Agent } from "../entities/Agent";

const ARENA_W = 800;
const ARENA_H = 600;

/**
 * Manages all active bullets in the arena.
 */
export class BulletSystem {
  private scene: Phaser.Scene;
  private bullets: Bullet[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Spawn a bullet travelling from (fromX, fromY) toward (toX, toY).
   */
  fireBullet(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    shooterId: string,
    color = 0x00ffff
  ): void {
    const dirX = toX - fromX;
    const dirY = toY - fromY;
    const b = new Bullet(this.scene, fromX, fromY, dirX, dirY, shooterId, color);
    this.bullets.push(b);
  }

  /**
   * Called every frame: moves bullets and checks for hits against all opposing living agents.
   */
  update(agents: Agent[]): void {
    const surviving: Bullet[] = [];

    for (const b of this.bullets) {
      if (b.isOutOfBounds(ARENA_W, ARENA_H)) {
        b.destroy();
        continue;
      }

      let hit = false;

      for (const agent of agents) {
        if (!agent.alive || agent.id === b.shooterId) continue;

        const dx = b.x - agent.x;
        const dy = b.y - agent.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          agent.takeDamage(GAME_CONFIG.bulletDamage);
          hit = true;
          break;
        }
      }

      if (hit) {
        b.destroy();
      } else {
        surviving.push(b);
      }
    }

    this.bullets = surviving;
  }

  /** Get all currently active bullets */
  getBullets(): Bullet[] {
    return this.bullets;
  }

  /** Clean up all active bullets (call on scene shutdown) */
  destroyAll(): void {
    for (const b of this.bullets) b.destroy();
    this.bullets = [];
  }
}
