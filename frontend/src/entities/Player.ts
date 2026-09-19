import Phaser from "phaser";

// ─── Constants ───────────────────────────────────────────────────────────────

export const PLAYER_MAX_HP = 100;
export const PLAYER_START_HEALS = 3;
export const MOVE_SPEED = 160; // px/s
export const ATTACK_RADIUS = 60; // px — melee range
export const ATTACK_DAMAGE = 20; // HP — melee damage
export const BULLET_DAMAGE = 20; // HP — bullet damage (same as melee)
export const ATTACK_COOLDOWN_MS = 1000; // ms — melee cooldown
export const BULLET_COOLDOWN_MS = 1200; // ms — bullet cooldown (slightly slower, longer range)
export const BULLET_SPEED = 320; // px/s
export const ATTACK_FLASH_DURATION_MS = 120; // ms how long the attack circle shows

// Size of the character rectangle
export const CHAR_WIDTH = 30;
export const CHAR_HEIGHT = 30;

// ─── Player update result ─────────────────────────────────────────────────────

export interface PlayerUpdateResult {
  attacked: boolean;  // fired melee this frame
  firedBullet: boolean; // fired bullet this frame
}

// ─── Player class ────────────────────────────────────────────────────────────

/**
 * Human-controlled player.
 * WASD = move, SPACE = melee attack, F = fire bullet, E = heal
 */
export class Player {
  scene: Phaser.Scene;

  // Physics body
  body: Phaser.Physics.Arcade.Body;

  // Visuals
  rect: Phaser.GameObjects.Rectangle;
  attackCircle: Phaser.GameObjects.Arc;

  // Stats
  hp = PLAYER_MAX_HP;
  heals = PLAYER_START_HEALS;
  attackCooldownMs = 0;
  bulletCooldownMs = 0;
  alive = true;

  // Input
  private keys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    attack: Phaser.Input.Keyboard.Key;
    shoot: Phaser.Input.Keyboard.Key;
    heal: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Rectangle graphic
    this.rect = scene.add.rectangle(x, y, CHAR_WIDTH, CHAR_HEIGHT, 0x4488ff);
    this.rect.setDepth(1);

    // Attack flash circle (hidden by default)
    this.attackCircle = scene.add.circle(x, y, ATTACK_RADIUS, 0x88bbff, 0.3);
    this.attackCircle.setDepth(0);
    this.attackCircle.setVisible(false);

    // Physics body attached to the rectangle
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(CHAR_WIDTH, CHAR_HEIGHT);

    // Keyboard input
    const kb = scene.input.keyboard!;
    this.keys = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      attack: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      shoot: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      heal: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };
  }

  get x(): number {
    return this.rect.x;
  }
  get y(): number {
    return this.rect.y;
  }

  /**
   * Called every frame from GameScene.update().
   * Returns attacked=true if melee fired, firedBullet=true if bullet fired.
   * GameScene handles the actual bullet creation via BulletSystem.
   */
  update(delta: number): PlayerUpdateResult {
    if (!this.alive) return { attacked: false, firedBullet: false };

    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - delta);
    this.bulletCooldownMs = Math.max(0, this.bulletCooldownMs - delta);

    // Movement
    let vx = 0;
    let vy = 0;
    if (this.keys.left.isDown) vx = -MOVE_SPEED;
    else if (this.keys.right.isDown) vx = MOVE_SPEED;
    if (this.keys.up.isDown) vy = -MOVE_SPEED;
    else if (this.keys.down.isDown) vy = MOVE_SPEED;

    this.body.setVelocity(vx, vy);

    // Heal
    if (Phaser.Input.Keyboard.JustDown(this.keys.heal)) {
      this.tryHeal();
    }

    // Melee attack (SPACE)
    const attacked =
      Phaser.Input.Keyboard.JustDown(this.keys.attack) && this.tryAttack();

    // Bullet (F)
    const firedBullet =
      Phaser.Input.Keyboard.JustDown(this.keys.shoot) && this.tryFireBullet();

    // Sync attack circle position
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
