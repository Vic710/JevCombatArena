import Phaser from "phaser";
import { Agent } from "../entities/Agent";
import { BulletSystem } from "../combat/BulletSystem";
import { resolveMeleeAttack } from "../combat/CombatSystem";
import { askJev } from "../jev/JevClient";
import type { GameState, NpcMoveAction, BulletInfo } from "../state/GameState";
import { GAME_CONFIG } from "../config/gameConfig";

export const ARENA_W = 800;
export const ARENA_H = 600;

interface AgentAIDecisionState {
  timer: number;
  isPending: boolean;
  lastActionText: string;
}

const AGENT_COLORS = [
  0x4488ff, // Blue (Agent 1 / Player)
  0xff4444, // Red (Agent 2)
  0x44ff88, // Green (Agent 3)
  0xcc44ff, // Purple (Agent 4)
  0xffaa00, // Gold (Agent 5)
  0x00e5ff, // Cyan (Agent 6)
];

export default class GameScene extends Phaser.Scene {
  private agents: Agent[] = [];
  private aiStates: Map<string, AgentAIDecisionState> = new Map();
  private bulletSystem!: BulletSystem;
  private isPaused = false;
  private pauseContainer!: Phaser.GameObjects.Container;

  constructor() {
    super("game");
  }

  init(): void {
    this.agents = [];
    this.aiStates.clear();
    this.isPaused = false;
  }

  create(): void {
    // ── Background & Arena Visuals ──────────────────────────────────────────
    this.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0x141424);

    const border = this.add.graphics();
    border.lineStyle(2, 0x3b3b5c, 1);
    border.strokeRect(1, 1, ARENA_W - 2, ARENA_H - 2);

    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H);

    this.bulletSystem = new BulletSystem(this);

    // ── Spawn Agents ────────────────────────────────────────────────────────
    this.spawnAgents();

    // Setup Agent-to-Agent Colliders
    for (let i = 0; i < this.agents.length; i++) {
      for (let j = i + 1; j < this.agents.length; j++) {
        this.physics.add.collider(this.agents[i].rect, this.agents[j].rect);
      }
    }

    // Share reference via registry for HUD scene
    this.registry.set("agents", this.agents);
    this.scene.launch("hud");

    // ── Status & Key Hints ──────────────────────────────────────────────────
    const modeLabel = GAME_CONFIG.playerEnabled
      ? `HUMAN PLAYER vs ${GAME_CONFIG.jevAgentCount} JEV BOSS`
      : `JEV vs JEV (${this.agents.length} AGENTS SELF-PLAY)`;

    this.add
      .text(ARENA_W / 2, ARENA_H - 24, `Mode: ${modeLabel}`, {
        fontFamily: "Courier New, monospace",
        fontSize: "11px",
        color: "#9999bb",
      })
      .setOrigin(0.5, 1)
      .setDepth(20);

    const hintStr = GAME_CONFIG.playerEnabled
      ? "WASD move | SPACE melee | F bullet | SHIFT dash | E heal | [ESC] Pause | [P] Spectate | [R] Restart"
      : "[ESC] Pause | [P] Toggle Player | [+/-] Agents (2-6) | [R] Restart";

    this.add
      .text(ARENA_W / 2, ARENA_H - 8, hintStr, {
        fontFamily: "Courier New, monospace",
        fontSize: "10px",
        color: "#555577",
      })
      .setOrigin(0.5, 1)
      .setDepth(20);

    // ── Pause Overlay ───────────────────────────────────────────────────────
    const pauseBg = this.add.rectangle(ARENA_W / 2, ARENA_H / 2, 340, 100, 0x000000, 0.85);
    pauseBg.setStrokeStyle(2, 0x8888ff);
    const pauseText = this.add
      .text(ARENA_W / 2, ARENA_H / 2 - 12, "⏸️  GAME PAUSED", {
        fontFamily: "Courier New, monospace",
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5);

    const pauseSub = this.add
      .text(ARENA_W / 2, ARENA_H / 2 + 18, "Press [ESC] to resume", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        color: "#aaaacc",
      })
      .setOrigin(0.5, 0.5);

    this.pauseContainer = this.add.container(0, 0, [pauseBg, pauseText, pauseSub]);
    this.pauseContainer.setDepth(100);
    this.pauseContainer.setVisible(false);

    // ── Global Hotkeys ──────────────────────────────────────────────────────
    if (this.input.keyboard) {
      const kb = this.input.keyboard;

      // ESC = Toggle Pause
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on("down", () => {
        this.togglePause();
      });

      // M = Return to Start Menu
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.M).on("down", () => {
        this.bulletSystem.destroyAll();
        for (const a of this.agents) a.destroy();
        this.scene.stop("hud");
        this.scene.start("menu");
      });

      // P = Toggle Player control
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.P).on("down", () => {
        GAME_CONFIG.playerEnabled = !GAME_CONFIG.playerEnabled;
        this.restartGame();
      });

      // R = Restart match
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.R).on("down", () => {
        this.restartGame();
      });

      // + / - Increase or decrease Jev Agent Count (up to 6 agents)
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS).on("down", () => {
        GAME_CONFIG.jevAgentCount = Math.min(6, GAME_CONFIG.jevAgentCount + 1);
        this.restartGame();
      });

      kb.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS).on("down", () => {
        const minCount = GAME_CONFIG.playerEnabled ? 1 : 2;
        GAME_CONFIG.jevAgentCount = Math.max(minCount, GAME_CONFIG.jevAgentCount - 1);
        this.restartGame();
      });
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.pauseContainer.setVisible(this.isPaused);
    if (this.isPaused) {
      for (const a of this.agents) {
        a.body.setVelocity(0, 0);
      }
    }
  }

  private spawnAgents(): void {
    const isPlayer = GAME_CONFIG.playerEnabled;
    const totalCount = isPlayer
      ? 1 + GAME_CONFIG.jevAgentCount
      : Math.max(2, GAME_CONFIG.jevAgentCount);

    // Standard spawn positions (corners and edges)
    const spawnPoints = [
      { x: 120, y: ARENA_H - 120 }, // Bottom-Left
      { x: ARENA_W - 120, y: 120 }, // Top-Right
      { x: ARENA_W - 120, y: ARENA_H - 120 }, // Bottom-Right
      { x: 120, y: 120 }, // Top-Left
      { x: ARENA_W / 2, y: 120 }, // Top-Center
      { x: ARENA_W / 2, y: ARENA_H - 120 }, // Bottom-Center
      { x: 120, y: ARENA_H / 2 }, // Mid-Left
      { x: ARENA_W - 120, y: ARENA_H / 2 }, // Mid-Right
    ];

    for (let i = 0; i < totalCount; i++) {
      const pos = spawnPoints[i % spawnPoints.length];
      const color = AGENT_COLORS[i % AGENT_COLORS.length];
      const isHuman = isPlayer && i === 0;
      const id = isHuman ? "player" : `jev-${i + 1}`;
      const name = isHuman
        ? "PLAYER"
        : isPlayer
        ? `JEV BOSS ${i}`
        : `JEV #${i + 1}`;

      const personality = isHuman
        ? undefined
        : GAME_CONFIG.personalities[i % GAME_CONFIG.personalities.length];

      const agent = new Agent(this, id, name, pos.x, pos.y, color, isHuman, personality);
      this.agents.push(agent);

      if (!isHuman) {
        this.aiStates.set(id, {
          timer: Math.random() * 50, // Slight initial jitter to distribute calls
          isPending: false,
          lastActionText: "waiting...",
        });
      }
    }
  }

  update(_time: number, delta: number): void {
    if (this.isPaused) return;

    // ── 1. Update all Agents ─────────────────────────────────────────────────
    for (const agent of this.agents) {
      if (!agent.alive) continue;

      const res = agent.update(delta);

      if (res.attacked) {
        resolveMeleeAttack(agent, this.agents);
      }
      if (res.firedBullet) {
        const target = this.getNearestEnemy(agent);
        const targetX = target ? target.x : agent.x + (agent.x > ARENA_W / 2 ? -100 : 100);
        const targetY = target ? target.y : agent.y;

        this.bulletSystem.fireBullet(
          agent.x,
          agent.y,
          targetX,
          targetY,
          agent.id,
          agent.color
        );
      }
    }

    // ── 2. Update Bullets ────────────────────────────────────────────────────
    this.bulletSystem.update(this.agents);

    // ── 3. Evaluate Jev AI Decisions for all AI Agents ───────────────────────
    for (const agent of this.agents) {
      if (!agent.alive || agent.isHuman) continue;

      const aiState = this.aiStates.get(agent.id);
      if (!aiState) continue;

      aiState.timer += delta;
      if (aiState.timer >= GAME_CONFIG.decisionIntervalMs && !aiState.isPending) {
        aiState.timer = 0;
        aiState.isPending = true;
        this.requestAgentDecision(agent, aiState);
      }
    }

    // ── 4. Win / Game Over Check ─────────────────────────────────────────────
    const living = this.agents.filter((a) => a.alive);
    if (living.length <= 1) {
      const winnerName = living.length === 1 ? living[0].name : "NO ONE (DRAW)";
      this.time.delayedCall(800, () => {
        this.endGame(winnerName);
      });
    }
  }

  private getNearestEnemy(self: Agent): Agent | null {
    let nearest: Agent | null = null;
    let minDist = Infinity;

    for (const other of this.agents) {
      if (!other.alive || other.id === self.id) continue;
      const dx = other.x - self.x;
      const dy = other.y - self.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = other;
      }
    }
    return nearest;
  }

  private requestAgentDecision(agent: Agent, aiState: AgentAIDecisionState): void {
    const primaryTarget = this.getNearestEnemy(agent);

    let targetData: GameState["primaryTarget"] = null;
    if (primaryTarget) {
      const dx = primaryTarget.x - agent.x;
      const dy = primaryTarget.y - agent.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let bestMove: NpcMoveAction = "STOP";
      let retreatMove: NpcMoveAction = "STOP";
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > 30 && absDy > 30) {
        if (dx > 0 && dy < 0) {
          bestMove = "MOVE_UP_RIGHT";
          retreatMove = "MOVE_DOWN_LEFT";
        } else if (dx < 0 && dy < 0) {
          bestMove = "MOVE_UP_LEFT";
          retreatMove = "MOVE_DOWN_RIGHT";
        } else if (dx > 0 && dy > 0) {
          bestMove = "MOVE_DOWN_RIGHT";
          retreatMove = "MOVE_UP_LEFT";
        } else if (dx < 0 && dy > 0) {
          bestMove = "MOVE_DOWN_LEFT";
          retreatMove = "MOVE_UP_RIGHT";
        }
      } else if (absDx >= absDy) {
        if (dx > 0) {
          bestMove = "MOVE_RIGHT";
          retreatMove = "MOVE_LEFT";
        } else {
          bestMove = "MOVE_LEFT";
          retreatMove = "MOVE_RIGHT";
        }
      } else {
        if (dy > 0) {
          bestMove = "MOVE_DOWN";
          retreatMove = "MOVE_UP";
        } else {
          bestMove = "MOVE_UP";
          retreatMove = "MOVE_DOWN";
        }
      }

      targetData = {
        id: primaryTarget.id,
        name: primaryTarget.name,
        x: Math.round(primaryTarget.x),
        y: Math.round(primaryTarget.y),
        hp: primaryTarget.hp,
        maxHp: primaryTarget.maxHp,
        heals: primaryTarget.heals,
        distance: dist,
        dx,
        dy,
        bestMoveTowardTarget: bestMove,
        bestMoveAwayFromTarget: retreatMove,
        hpAdvantage: agent.hp - primaryTarget.hp,
      };
    }

    // ── Raw Bullet Observations (Objective sensory data) ────────────────────
    const allBullets = this.bulletSystem.getBullets();
    const enemyBullets: BulletInfo[] = [];

    for (const b of allBullets) {
      if (b.shooterId === agent.id) continue;

      const dx = b.x - agent.x;
      const dy = b.y - agent.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      enemyBullets.push({
        distancePx: Math.round(dist),
        relativeDx: Math.round(dx),
        relativeDy: Math.round(dy),
        vx: Math.round(b.vx),
        vy: Math.round(b.vy),
      });
    }

    const otherEnemies = this.agents
      .filter((a) => a.alive && a.id !== agent.id && (!primaryTarget || a.id !== primaryTarget.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        x: Math.round(a.x),
        y: Math.round(a.y),
        hp: a.hp,
        distance: Math.round(
          Math.sqrt(Math.pow(a.x - agent.x, 2) + Math.pow(a.y - agent.y, 2))
        ),
      }));

    const state: GameState = {
      self: {
        id: agent.id,
        name: agent.name,
        personality: agent.personality,
        x: Math.round(agent.x),
        y: Math.round(agent.y),
        hp: agent.hp,
        maxHp: agent.maxHp,
        heals: agent.heals,
        attackCooldownMs: agent.attackCooldownMs,
        bulletCooldownMs: agent.bulletCooldownMs,
        dashCooldownMs: agent.dashCooldownMs,
        nearLeftWall: agent.x < 60,
        nearRightWall: agent.x > ARENA_W - 60,
        nearTopWall: agent.y < 60,
        nearBottomWall: agent.y > ARENA_H - 60,
      },
      primaryTarget: targetData,
      otherEnemies,
      bullets: enemyBullets,
      arenaWidth: ARENA_W,
      arenaHeight: ARENA_H,
    };

    askJev(state)
      .then((decision) => {
        agent.applyDecision(decision);
        const actions = [
          decision.shouldMelee ? "MELEE" : null,
          decision.shouldShoot ? "SHOOT" : null,
          decision.shouldDash ? "DASH" : null,
          decision.shouldHeal ? "HEAL" : null,
        ]
          .filter(Boolean)
          .join("+");

        aiState.lastActionText = actions
          ? `${decision.moveAction} [${actions}]`
          : decision.moveAction;
        aiState.isPending = false;
      })
      .catch(() => {
        aiState.isPending = false;
      });
  }

  private restartGame(): void {
    this.bulletSystem.destroyAll();
    for (const a of this.agents) a.destroy();
    this.scene.stop("hud");
    this.scene.restart();
  }

  private endGame(winner: string): void {
    this.bulletSystem.destroyAll();
    for (const a of this.agents) a.body.setVelocity(0, 0);
    this.scene.stop("hud");
    this.scene.start("gameover", { winner });
  }
}
