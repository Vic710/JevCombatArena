import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import { ARENA_W, ARENA_H } from "./GameScene";

const PERSONALITY_PRESETS = [
  "Berserker",
  "Scared Runner",
  "Sniper",
  "Survivor",
  "Headfirst fighter",
  "Skirmisher",
  "Balanced",
];

const AGENT_COLORS = [
  0x4488ff, // Blue (Agent 1 / Player)
  0xff4444, // Red (Agent 2)
  0x44ff88, // Green (Agent 3)
  0xcc44ff, // Purple (Agent 4)
  0xffaa00, // Gold (Agent 5)
  0x00e5ff, // Cyan (Agent 6)
];

export default class MenuScene extends Phaser.Scene {
  private agentSlotContainers: Phaser.GameObjects.Container[] = [];
  private modeButtons: { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; isPlayer: boolean }[] = [];
  private speedButtons: { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; ms: number }[] = [];
  private countLabel!: Phaser.GameObjects.Text;

  constructor() {
    super("menu");
  }

  create(): void {
    this.agentSlotContainers = [];
    this.modeButtons = [];
    this.speedButtons = [];

    // ── Background & Ambient Grid ───────────────────────────────────────────
    this.add.rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0x0c0c16);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x1f1f38, 0.4);
    for (let x = 0; x < ARENA_W; x += 40) {
      grid.lineBetween(x, 0, x, ARENA_H);
    }
    for (let y = 0; y < ARENA_H; y += 40) {
      grid.lineBetween(0, y, ARENA_W, y);
    }

    const border = this.add.graphics();
    border.lineStyle(2, 0x3f3f6e, 1);
    border.strokeRect(4, 4, ARENA_W - 8, ARENA_H - 8);

    // ── Title Header ────────────────────────────────────────────────────────
    this.add
      .text(ARENA_W / 2, 38, "⚡ JEV AI COMBAT ARENA ⚡", {
        fontFamily: "Courier New, monospace",
        fontSize: "26px",
        fontStyle: "bold",
        color: "#00e5ff",
        stroke: "#003344",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(ARENA_W / 2, 64, "TypeSafe System One — Autonomous Real-Time Combat Simulation", {
        fontFamily: "Courier New, monospace",
        fontSize: "11px",
        color: "#8888aa",
      })
      .setOrigin(0.5);

    // ── Section 1: Mode Selection ───────────────────────────────────────────
    this.add
      .text(120, 96, "SELECT GAME MODE:", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    this.createModeButton(270, 96, "⚔️ JEV vs JEV (Self-Play)", false);
    this.createModeButton(530, 96, "🎮 HUMAN vs JEV BOSS", true);
    this.updateModeButtonStyles();

    // ── Section 2: Agent Count Selector ─────────────────────────────────────
    this.add
      .text(120, 138, "COMBATANTS COUNT:", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    this.createCountSelector(340, 138);

    // ── Section 3: AI Speed / Decision Tick ──────────────────────────────────
    this.add
      .text(120, 178, "AI TICK INTERVAL:", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    this.createSpeedButton(310, 178, "⚡ 100ms (Fast)", 100);
    this.createSpeedButton(440, 178, "⏱️ 200ms (Normal)", 200);
    this.createSpeedButton(570, 178, "🐢 300ms (Chill)", 300);
    this.updateSpeedButtonStyles();

    // ── Section 4: Personalities Config Panel ────────────────────────────────
    this.add
      .text(120, 218, "AGENT PERSONALITIES (Click to cycle):", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    // Quick preset buttons for personalities
    this.createPresetPill(480, 218, "All Berserkers", () => this.applyAllPersonalities("Berserker"));
    this.createPresetPill(585, 218, "All Snipers", () => this.applyAllPersonalities("Sniper"));
    this.createPresetPill(680, 218, "Chaos Mix", () => this.applyChaosPersonalities());

    this.renderAgentSlots();

    // ── Controls Cheatsheet Card ────────────────────────────────────────────
    const cheatCard = this.add.rectangle(ARENA_W / 2, 480, 720, 48, 0x141426, 0.9);
    cheatCard.setStrokeStyle(1, 0x2e2e4a);

    const cheatText =
      "CONTROLS: WASD Move | SPACE Melee | F Bullet | SHIFT Dash | E Heal | ESC Pause | M Menu | R Restart";
    this.add
      .text(ARENA_W / 2, 480, cheatText, {
        fontFamily: "Courier New, monospace",
        fontSize: "10px",
        color: "#9999bb",
      })
      .setOrigin(0.5);

    // ── Launch / Start Match Button ─────────────────────────────────────────
    this.createStartButton(ARENA_W / 2, 545);

    // Keyboard shortcuts for quick start
    if (this.input.keyboard) {
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", () => this.startGame());
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on("down", () => this.startGame());
    }
  }

  private createModeButton(x: number, y: number, label: string, isPlayer: boolean): void {
    const w = 220;
    const h = 28;
    const bg = this.add.rectangle(x, y, w, h, 0x22223a).setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(1, 0x444466);

    const text = this.add
      .text(x, y, label, {
        fontFamily: "Courier New, monospace",
        fontSize: "11px",
        color: "#cccccc",
      })
      .setOrigin(0.5);

    bg.on("pointerdown", () => {
      GAME_CONFIG.playerEnabled = isPlayer;
      this.updateModeButtonStyles();
      this.renderAgentSlots();
    });

    this.modeButtons.push({ bg, text, isPlayer });
  }

  private updateModeButtonStyles(): void {
    for (const b of this.modeButtons) {
      const active = GAME_CONFIG.playerEnabled === b.isPlayer;
      b.bg.setFillStyle(active ? 0x1e3a5f : 0x181828);
      b.bg.setStrokeStyle(1, active ? 0x00e5ff : 0x3a3a55);
      b.text.setColor(active ? "#00e5ff" : "#8888aa");
    }
  }

  private createCountSelector(x: number, y: number): void {
    // Minus Button
    const minusBg = this.add.rectangle(x - 60, y, 28, 24, 0x24243a).setInteractive({ useHandCursor: true });
    minusBg.setStrokeStyle(1, 0x444466);
    this.add.text(x - 60, y, "−", { fontFamily: "Courier New", fontSize: "16px", color: "#fff" }).setOrigin(0.5);

    // Count Label
    this.countLabel = this.add
      .text(x, y, `${this.getTotalAgents()} Agents`, {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Plus Button
    const plusBg = this.add.rectangle(x + 60, y, 28, 24, 0x24243a).setInteractive({ useHandCursor: true });
    plusBg.setStrokeStyle(1, 0x444466);
    this.add.text(x + 60, y, "+", { fontFamily: "Courier New", fontSize: "16px", color: "#fff" }).setOrigin(0.5);

    minusBg.on("pointerdown", () => {
      const min = GAME_CONFIG.playerEnabled ? 1 : 2;
      GAME_CONFIG.jevAgentCount = Math.max(min, GAME_CONFIG.jevAgentCount - 1);
      this.updateCountLabel();
      this.renderAgentSlots();
    });

    plusBg.on("pointerdown", () => {
      GAME_CONFIG.jevAgentCount = Math.min(6, GAME_CONFIG.jevAgentCount + 1);
      this.updateCountLabel();
      this.renderAgentSlots();
    });
  }

  private getTotalAgents(): number {
    return GAME_CONFIG.playerEnabled ? 1 + GAME_CONFIG.jevAgentCount : Math.max(2, GAME_CONFIG.jevAgentCount);
  }

  private updateCountLabel(): void {
    this.countLabel.setText(`${this.getTotalAgents()} Agents`);
  }

  private createSpeedButton(x: number, y: number, label: string, ms: number): void {
    const bg = this.add.rectangle(x, y, 120, 24, 0x22223a).setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(1, 0x444466);

    const text = this.add
      .text(x, y, label, {
        fontFamily: "Courier New, monospace",
        fontSize: "10px",
        color: "#cccccc",
      })
      .setOrigin(0.5);

    bg.on("pointerdown", () => {
      GAME_CONFIG.decisionIntervalMs = ms;
      this.updateSpeedButtonStyles();
    });

    this.speedButtons.push({ bg, text, ms });
  }

  private updateSpeedButtonStyles(): void {
    for (const b of this.speedButtons) {
      const active = GAME_CONFIG.decisionIntervalMs === b.ms;
      b.bg.setFillStyle(active ? 0x224433 : 0x181828);
      b.bg.setStrokeStyle(1, active ? 0x44ff88 : 0x3a3a55);
      b.text.setColor(active ? "#44ff88" : "#8888aa");
    }
  }

  private createPresetPill(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 92, 20, 0x252540).setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(1, 0x555577);

    this.add
      .text(x, y, label, {
        fontFamily: "Courier New, monospace",
        fontSize: "9px",
        color: "#ffaa00",
      })
      .setOrigin(0.5);

    bg.on("pointerover", () => bg.setFillStyle(0x353555));
    bg.on("pointerout", () => bg.setFillStyle(0x252540));
    bg.on("pointerdown", onClick);
  }

  private applyAllPersonalities(p: string): void {
    for (let i = 0; i < 8; i++) {
      GAME_CONFIG.personalities[i] = p;
    }
    this.renderAgentSlots();
  }

  private applyChaosPersonalities(): void {
    const list = ["Berserker", "Scared Runner", "Sniper", "Survivor", "Headfirst fighter", "Skirmisher"];
    for (let i = 0; i < 8; i++) {
      GAME_CONFIG.personalities[i] = list[i % list.length];
    }
    this.renderAgentSlots();
  }

  private renderAgentSlots(): void {
    for (const c of this.agentSlotContainers) {
      c.destroy();
    }
    this.agentSlotContainers = [];

    const total = this.getTotalAgents();
    const startY = 245;
    const rowHeight = 34;

    for (let i = 0; i < total; i++) {
      const isHuman = GAME_CONFIG.playerEnabled && i === 0;
      const y = startY + i * rowHeight;
      const color = AGENT_COLORS[i % AGENT_COLORS.length];
      const colorHex = "#" + color.toString(16).padStart(6, "0");

      const rowBg = this.add.rectangle(ARENA_W / 2, y, 720, 28, 0x141424, 0.7);
      rowBg.setStrokeStyle(1, 0x222238);

      const dot = this.add.circle(60, y, 6, color);

      const nameLabel = isHuman ? "PLAYER (HUMAN)" : `JEV #${i + 1}`;
      const nameText = this.add
        .text(76, y, nameLabel, {
          fontFamily: "Courier New, monospace",
          fontSize: "11px",
          fontStyle: "bold",
          color: colorHex,
        })
        .setOrigin(0, 0.5);

      const container = this.add.container(0, 0, [rowBg, dot, nameText]);

      if (isHuman) {
        const humanTag = this.add
          .text(480, y, "[Keyboard WASD / SPACE / F / SHIFT / E]", {
            fontFamily: "Courier New, monospace",
            fontSize: "10px",
            color: "#6688aa",
          })
          .setOrigin(0.5);
        container.add(humanTag);
      } else {
        const pIndex = i % GAME_CONFIG.personalities.length;
        const currentP = GAME_CONFIG.personalities[pIndex] || "Balanced";

        const btnW = 200;
        const pBtnBg = this.add
          .rectangle(480, y, btnW, 22, 0x22223a)
          .setInteractive({ useHandCursor: true });
        pBtnBg.setStrokeStyle(1, 0x555577);

        const pBtnText = this.add
          .text(480, y, `🧠 ${currentP} ▾`, {
            fontFamily: "Courier New, monospace",
            fontSize: "11px",
            color: "#ffdd44",
          })
          .setOrigin(0.5);

        pBtnBg.on("pointerover", () => pBtnBg.setFillStyle(0x333355));
        pBtnBg.on("pointerout", () => pBtnBg.setFillStyle(0x22223a));
        pBtnBg.on("pointerdown", () => {
          const nextIdx =
            (PERSONALITY_PRESETS.indexOf(currentP) + 1) % PERSONALITY_PRESETS.length;
          const nextP = PERSONALITY_PRESETS[nextIdx];
          GAME_CONFIG.personalities[pIndex] = nextP;
          this.renderAgentSlots();
        });

        container.add([pBtnBg, pBtnText]);
      }

      this.agentSlotContainers.push(container);
    }
  }

  private createStartButton(x: number, y: number): void {
    const btnW = 320;
    const btnH = 46;
    const bg = this.add.rectangle(x, y, btnW, btnH, 0x00aa88).setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(2, 0x00ffcc);

    const text = this.add
      .text(x, y, "ENTER ARENA (SPACE)", {
        fontFamily: "Courier New, monospace",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    bg.on("pointerover", () => {
      bg.setFillStyle(0x00ccaa);
      bg.setScale(1.02);
      text.setScale(1.02);
    });

    bg.on("pointerout", () => {
      bg.setFillStyle(0x00aa88);
      bg.setScale(1.0);
      text.setScale(1.0);
    });

    bg.on("pointerdown", () => this.startGame());
  }

  private startGame(): void {
    this.scene.start("game");
  }
}
