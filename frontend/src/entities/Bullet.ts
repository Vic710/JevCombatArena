import Phaser from "phaser";
import { BULLET_SPEED } from "./Player";

/** A single projectile travelling in a straight line */
export class Bullet {
  scene: Phaser.Scene;
  rect: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;

  /** ID of the agent who fired this bullet */
  readonly shooterId: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    shooterId: string,
    color = 0x00ffff
  ) {
    this.scene = scene;
    this.shooterId = shooterId;

    this.rect = scene.add.rectangle(x, y, 8, 8, color);
    this.rect.setDepth(2);

    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;

    // Normalize direction and apply speed
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    this.body.setVelocity(
      (dirX / len) * BULLET_SPEED,
      (dirY / len) * BULLET_SPEED
    );
  }

  get x(): number {
    return this.rect.x;
  }
  get y(): number {
    return this.rect.y;
  }
  get vx(): number {
    return this.body.velocity.x;
  }
  get vy(): number {
    return this.body.velocity.y;
  }

  /** Returns true if the bullet has left the arena bounds and should be destroyed */
  isOutOfBounds(arenaW: number, arenaH: number): boolean {
    return (
      this.rect.x < -20 ||
      this.rect.x > arenaW + 20 ||
      this.rect.y < -20 ||
      this.rect.y > arenaH + 20
    );
  }

  destroy(): void {
    this.rect.destroy();
  }
}
