import Phaser from "phaser";
import type { NpcMoveAction } from "../state/GameState";
import type { JevResponse } from "../jev/JevClient";
import {
  PLAYER_MAX_HP,
  PLAYER_START_HEALS,
  MOVE_SPEED,
  ATTACK_COOLDOWN_MS,
  BULLET_COOLDOWN_MS,
  ATTACK_FLASH_DURATION_MS,
  ATTACK_RADIUS,
  CHAR_WIDTH,
  CHAR_HEIGHT,
} from "./Player";

/**
 * Jev-controlled NPC boss.
 * Identical stats to the player. Accepts 8-directional movement, melee, bullet, and heal
 * in parallel from JevClient. Movement is continuous and not interrupted by actions.
 */
export class NPC {
  scene: Phaser.Scene;

  body: Phaser.Physics.Arcade.Body;
  rect: Phaser.GameObjects.Rectangle;
  attackCircle: Phaser.GameObjects.Arc;

  hp = PLAYER_MAX_HP;
  heals = PLAYER_START_HEALS;
  attackCooldownMs = 0;
  bulletCooldownMs = 0;
  alive = true;

  /** The continuous movement action from Jev — applied every frame */
  private currentMoveAction: NpcMoveAction = "STOP";

  /** Whether Jev triggered a melee attack this cycle */
  private pendingAttack = false;

  /** Whether Jev triggered a bullet shot this cycle */
  private pendingShoot = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.rect = scene.add.rectangle(x, y, CHAR_WIDTH, CHAR_HEIGHT, 0xff4444);
    this.rect.setDepth(1);

    this.attackCircle = scene.add.circle(x, y, ATTACK_RADIUS, 0xff8888, 0.3);
    this.attackCircle.setDepth(0);
    this.attackCircle.setVisible(false);

    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(CHAR_WIDTH, CHAR_HEIGHT);
  }

  get x(): number {
    return this.rect.x;
  }
  get y(): number {
    return this.rect.y;
  }

  /** Apply a Jev decision cycle. Movement and actions are evaluated independently. */
  applyDecision(decision: JevResponse): void {
    this.currentMoveAction = decision.moveAction;
    if (decision.shouldMelee) this.pendingAttack = true;
    if (decision.shouldShoot) this.pendingShoot = true;
    if (decision.shouldHeal) this.tryHeal();
  }

  /**
   * Called every frame.
   * Returns attacked=true if melee fired, firedBullet=true if bullet should be spawned.
   * GameScene handles bullet creation.
   */
  update(delta: number): { attacked: boolean; firedBullet: boolean } {
    if (!this.alive) return { attacked: false, firedBullet: false };

    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - delta);
    this.bulletCooldownMs = Math.max(0, this.bulletCooldownMs - delta);

    // Apply 8-directional continuous movement
    let vx = 0;
    let vy = 0;
    switch (this.currentMoveAction) {
      case "MOVE_UP":
        vy = -MOVE_SPEED;
        break;
      case "MOVE_DOWN":
        vy = MOVE_SPEED;
        break;
      case "MOVE_LEFT":
        vx = -MOVE_SPEED;
        break;
      case "MOVE_RIGHT":
        vx = MOVE_SPEED;
        break;
      case "MOVE_UP_LEFT":
        vx = -MOVE_SPEED;
        vy = -MOVE_SPEED;
        break;
      case "MOVE_UP_RIGHT":
        vx = MOVE_SPEED;
        vy = -MOVE_SPEED;
        break;
      case "MOVE_DOWN_LEFT":
        vx = -MOVE_SPEED;
        vy = MOVE_SPEED;
        break;
      case "MOVE_DOWN_RIGHT":
        vx = MOVE_SPEED;
        vy = MOVE_SPEED;
        break;
      case "STOP":
      default:
        break;
    }
    this.body.setVelocity(vx, vy);

    // Consume pending melee attack
    let attacked = false;
    if (this.pendingAttack) {
      this.pendingAttack = false;
      attacked = this.tryAttack();
    }

    // Consume pending bullet
    let firedBullet = false;
    if (this.pendingShoot) {
      this.pendingShoot = false;
      firedBullet = this.tryFireBullet();
    }

    this.attackCircle.setPosition(this.rect.x, this.rect.y);
    return { attacked, firedBullet };
  }

  tryAttack(): boolean {
    if (this.attackCooldownMs > 0) return false;
    this.attackCooldownMs = ATTACK_COOLDOWN_MS;
    this.flashAttackCircle();
    return true;
  }

  tryFireBullet(): boolean {
    if (this.bulletCooldownMs > 0) return false;
    this.bulletCooldownMs = BULLET_COOLDOWN_MS;
    return true;
  }

  tryHeal(): void {
    if (this.heals <= 0 || this.hp >= PLAYER_MAX_HP) return;
    this.heals--;
    this.hp = PLAYER_MAX_HP;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
      this.rect.setFillStyle(0x333333);
    }
  }

  private flashAttackCircle(): void {
    this.attackCircle.setVisible(true);
    this.scene.time.delayedCall(ATTACK_FLASH_DURATION_MS, () => {
      this.attackCircle.setVisible(false);
    });
  }

  destroy(): void {
    this.rect.destroy();
    this.attackCircle.destroy();
  }
}
