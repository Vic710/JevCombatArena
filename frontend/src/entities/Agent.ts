import Phaser from "phaser";
import type { NpcMoveAction } from "../state/GameState";
import type { JevResponse } from "../jev/JevClient";
import { GAME_CONFIG } from "../config/gameConfig";

export const CHAR_WIDTH = 30;
export const CHAR_HEIGHT = 30;
export const ATTACK_FLASH_DURATION_MS = 120;

export interface AgentUpdateResult {
  attacked: boolean;
  firedBullet: boolean;
}

/**
 * Universal combatant agent — can be either Human-controlled or Jev AI-controlled.
 */
export class Agent {
  scene: Phaser.Scene;
  id: string;
  name: string;
  color: number;
  isHuman: boolean;
  personality?: string;

  // Physics body & visuals
  body: Phaser.Physics.Arcade.Body;
  rect: Phaser.GameObjects.Rectangle;
  attackCircle: Phaser.GameObjects.Arc;
  nameText: Phaser.GameObjects.Text;

  // Stats
  hp = GAME_CONFIG.maxHp;
  maxHp = GAME_CONFIG.maxHp;
  heals = GAME_CONFIG.startHeals;
  attackCooldownMs = 0;
  bulletCooldownMs = 0;
  dashCooldownMs = 0;
  alive = true;

  // Dash & Knockback state
  private dashActiveTimer = 0;
  private knockbackTimer = 0;
  private knockbackVx = 0;
  private knockbackVy = 0;

  // AI-controlled state
  private currentMoveAction: NpcMoveAction = "STOP";
  private pendingAttack = false;
  private pendingShoot = false;
  private pendingDash = false;

  // Human keyboard keys (if human)
  private keys?: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    attack: Phaser.Input.Keyboard.Key;
    shoot: Phaser.Input.Keyboard.Key;
    heal: Phaser.Input.Keyboard.Key;
    dash: Phaser.Input.Keyboard.Key;
  };

  constructor(
    scene: Phaser.Scene,
    id: string,
    name: string,
    x: number,
    y: number,
    color: number,
    isHuman = false,
    personality?: string
  ) {
    this.scene = scene;
    this.id = id;
    this.name = name;
    this.color = color;
    this.isHuman = isHuman;
    this.personality = personality;

    // Body rectangle
    this.rect = scene.add.rectangle(x, y, CHAR_WIDTH, CHAR_HEIGHT, color);
    this.rect.setDepth(1);

    // Attack range circle
    this.attackCircle = scene.add.circle(
      x,
      y,
      GAME_CONFIG.meleeRadius,
      color,
      0.25
    );
    this.attackCircle.setDepth(0);
    this.attackCircle.setVisible(false);

    // Physics
    scene.physics.add.existing(this.rect);
    this.body = this.rect.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setBounce(0.25, 0.25);
    this.body.setSize(CHAR_WIDTH, CHAR_HEIGHT);

    // Name tag floating above
    const tagText = isHuman
      ? name
      : personality
      ? `${name} [${personality}]`
      : name;

    this.nameText = scene.add
      .text(x, y - 22, tagText, {
        fontFamily: "Courier New, monospace",
        fontSize: "10px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(5);

    if (isHuman && scene.input.keyboard) {
      const kb = scene.input.keyboard;
      this.keys = {
        up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        attack: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        shoot: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
        heal: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        dash: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      };
    }
  }

  get x(): number {
    return this.rect.x;
  }
  get y(): number {
    return this.rect.y;
  }

  /** Apply a Jev decision cycle (for AI agents) */
  applyDecision(decision: JevResponse): void {
    if (this.isHuman) return;
    this.currentMoveAction = decision.moveAction;
    if (decision.shouldMelee) this.pendingAttack = true;
    if (decision.shouldShoot) this.pendingShoot = true;
    if (decision.shouldHeal) this.tryHeal();
    if (decision.shouldDash) this.pendingDash = true;
  }

  /** Apply physical knockback impulse away from attacker */
  applyKnockback(vx: number, vy: number, durationMs = GAME_CONFIG.meleeKnockbackDurationMs): void {
    this.knockbackVx = vx;
    this.knockbackVy = vy;
    this.knockbackTimer = durationMs;
  }

  tryDash(): boolean {
    if (this.dashCooldownMs > 0) return false;
    this.dashCooldownMs = GAME_CONFIG.dashCooldownMs;
    this.dashActiveTimer = GAME_CONFIG.dashDurationMs;

    // Visual dash flash
    this.rect.setAlpha(0.6);
    this.scene.time.delayedCall(GAME_CONFIG.dashDurationMs, () => {
      this.rect.setAlpha(1.0);
    });
    return true;
  }

  /** Called every frame */
  update(delta: number): AgentUpdateResult {
    if (!this.alive) return { attacked: false, firedBullet: false };

    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - delta);
    this.bulletCooldownMs = Math.max(0, this.bulletCooldownMs - delta);
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - delta);
    this.dashActiveTimer = Math.max(0, this.dashActiveTimer - delta);
    this.knockbackTimer = Math.max(0, this.knockbackTimer - delta);

    let attacked = false;
    let firedBullet = false;

    // If under knockback impulse, apply knockback velocity
    if (this.knockbackTimer > 0) {
      this.body.setVelocity(this.knockbackVx, this.knockbackVy);
    } else {
      const currentSpeed =
        this.dashActiveTimer > 0 ? GAME_CONFIG.dashSpeed : GAME_CONFIG.moveSpeed;

      const diagSpeed = currentSpeed * 0.7071;

      if (this.isHuman && this.keys) {
        // ── Human Player Input ───────────────────────────────────────────────
        let vx = 0;
        let vy = 0;
        const left = this.keys.left.isDown;
        const right = this.keys.right.isDown;
        const up = this.keys.up.isDown;
        const down = this.keys.down.isDown;

        if (left && !right) vx = -1;
        else if (right && !left) vx = 1;
        if (up && !down) vy = -1;
        else if (down && !up) vy = 1;

        if (vx !== 0 && vy !== 0) {
          vx *= diagSpeed;
          vy *= diagSpeed;
        } else {
          vx *= currentSpeed;
          vy *= currentSpeed;
        }

        this.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.heal)) {
          this.tryHeal();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
          attacked = this.tryAttack();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.shoot)) {
          firedBullet = this.tryFireBullet();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.dash)) {
          this.tryDash();
        }
      } else {
        // ── AI Jev Movement & Actions ─────────────────────────────────────────
        let vx = 0;
        let vy = 0;
        switch (this.currentMoveAction) {
          case "MOVE_UP":
            vy = -currentSpeed;
            break;
          case "MOVE_DOWN":
            vy = currentSpeed;
            break;
          case "MOVE_LEFT":
            vx = -currentSpeed;
            break;
          case "MOVE_RIGHT":
            vx = currentSpeed;
            break;
          case "MOVE_UP_LEFT":
            vx = -diagSpeed;
            vy = -diagSpeed;
            break;
          case "MOVE_UP_RIGHT":
            vx = diagSpeed;
            vy = -diagSpeed;
            break;
          case "MOVE_DOWN_LEFT":
            vx = -diagSpeed;
            vy = diagSpeed;
            break;
          case "MOVE_DOWN_RIGHT":
            vx = diagSpeed;
            vy = diagSpeed;
            break;
          case "STOP":
          default:
            break;
        }
        this.body.setVelocity(vx, vy);

        if (this.pendingAttack) {
          this.pendingAttack = false;
          attacked = this.tryAttack();
        }
        if (this.pendingShoot) {
          this.pendingShoot = false;
          firedBullet = this.tryFireBullet();
        }
        if (this.pendingDash) {
          this.pendingDash = false;
          this.tryDash();
        }
      }
    }

    // Strict boundary safety clamp to prevent wall clipping
    this.rect.x = Phaser.Math.Clamp(this.rect.x, 16, 800 - 16);
    this.rect.y = Phaser.Math.Clamp(this.rect.y, 16, 600 - 16);

    // Sync attack circle and name text positions
    this.attackCircle.setPosition(this.rect.x, this.rect.y);
    this.nameText.setPosition(this.rect.x, this.rect.y - 22);

    return { attacked, firedBullet };
  }

  tryAttack(): boolean {
    if (this.attackCooldownMs > 0) return false;
    this.attackCooldownMs = GAME_CONFIG.meleeCooldownMs;
    this.flashAttackCircle();
    return true;
  }

  tryFireBullet(): boolean {
    if (this.bulletCooldownMs > 0) return false;
    this.bulletCooldownMs = GAME_CONFIG.bulletCooldownMs;
    return true;
  }

  tryHeal(): void {
    if (this.heals <= 0 || this.hp >= this.maxHp) return;
    this.heals--;
    this.hp = this.maxHp;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
      this.rect.setFillStyle(0x333333);
      this.body.setVelocity(0, 0);
      this.nameText.setText(`[DEAD] ${this.name}`).setColor("#666666");
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
    this.nameText.destroy();
  }
}
