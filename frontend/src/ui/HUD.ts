import Phaser from "phaser";
import type { Agent } from "../entities/Agent";

const ARENA_W = 800;
const PAD = 14;

interface AgentHUDCard {
  agent: Agent;
  hpFill: Phaser.GameObjects.Rectangle;
  hpText: Phaser.GameObjects.Text;
  healsText: Phaser.GameObjects.Text;
  meleeCdText: Phaser.GameObjects.Text;
  bulletCdText: Phaser.GameObjects.Text;
  dashCdText: Phaser.GameObjects.Text;
  barWidth: number;
}

export default class HUD extends Phaser.Scene {
  private cards: AgentHUDCard[] = [];

  constructor() {
    super("hud");
  }

  create(): void {
    this.cards = [];
    const agents = (this.registry.get("agents") as Agent[]) || [];

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Courier New, monospace",
      fontSize: "11px",
      color: "#ffffff",
    };

    const count = agents.length;
    const cardWidth = count <= 2 ? 200 : count <= 4 ? 170 : 120;
    const barHeight = 14;

    agents.forEach((agent, i) => {
      let x = PAD;
      let y = PAD;

      if (count === 2) {
        // 1v1 Layout (Left vs Right)
        x = i === 0 ? PAD : ARENA_W - PAD - cardWidth;
      } else {
        // Multi-agent Layout (Spread horizontally across top)
        const totalSpacing = ARENA_W - PAD * 2 - cardWidth * count;
        const gap = Math.max(8, totalSpacing / (count - 1));
        x = PAD + i * (cardWidth + gap);
      }

      const colorHexStr = "#" + agent.color.toString(16).padStart(6, "0");
      const personalityTag = agent.isHuman
        ? ""
        : agent.personality
        ? ` [${agent.personality}]`
        : "";

      // Name Label with Personality Tag
      this.add
        .text(x, y, `${agent.name}${personalityTag}`, {
          ...textStyle,
          fontSize: "12px",
          color: colorHexStr,
        })
        .setDepth(10);

      // HP Bar Background
      this.add
        .rectangle(x, y + 18, cardWidth, barHeight, 0x222233)
        .setOrigin(0, 0)
        .setDepth(10);

      // HP Fill
      const hpFill = this.add
        .rectangle(x, y + 18, cardWidth, barHeight, agent.color)
        .setOrigin(0, 0)
        .setDepth(11);

      // HP Text
      const hpText = this.add
        .text(x + cardWidth / 2, y + 18 + barHeight / 2, `${agent.hp}/${agent.maxHp}`, {
          ...textStyle,
          fontSize: "10px",
        })
        .setOrigin(0.5, 0.5)
        .setDepth(12);

      // Stats
      const healsText = this.add
        .text(x, y + 36, `Heals: ${agent.heals}`, textStyle)
        .setDepth(10);

      const meleeCdText = this.add
        .text(x, y + 50, "Melee: READY", { ...textStyle, color: "#44ff88" })
        .setDepth(10);

      const bulletCdText = this.add
        .text(x, y + 64, "Bullet: READY", { ...textStyle, color: "#44ff88" })
        .setDepth(10);

      const dashCdText = this.add
        .text(x, y + 78, "Dash: READY", { ...textStyle, color: "#44ff88" })
        .setDepth(10);

      this.cards.push({
        agent,
        hpFill,
        hpText,
        healsText,
        meleeCdText,
        bulletCdText,
        dashCdText,
        barWidth: cardWidth,
      });
    });
  }

  update(): void {
    for (const card of this.cards) {
      const {
        agent,
        hpFill,
        hpText,
        healsText,
        meleeCdText,
        bulletCdText,
        dashCdText,
        barWidth,
      } = card;

      const pct = Math.max(0, agent.hp / agent.maxHp);
      hpFill.setDisplaySize(barWidth * pct, 14);
      hpText.setText(`${agent.hp}/${agent.maxHp}`);

      if (!agent.alive) {
        hpFill.setFillStyle(0x333333);
        healsText.setText("DEAD").setColor("#888888");
        meleeCdText.setText("-").setColor("#888888");
        bulletCdText.setText("-").setColor("#888888");
        dashCdText.setText("-").setColor("#888888");
      } else {
        if (pct > 0.5) hpFill.setFillStyle(agent.color);
        else if (pct > 0.25) hpFill.setFillStyle(0xffaa00);
        else hpFill.setFillStyle(0xff2222);

        healsText.setText(`Heals: ${agent.heals}`).setColor("#ffffff");
        this.updateCooldown(meleeCdText, "Melee", agent.attackCooldownMs);
        this.updateCooldown(bulletCdText, "Bullet", agent.bulletCooldownMs);
        this.updateCooldown(dashCdText, "Dash", agent.dashCooldownMs);
      }
    }
  }

  private updateCooldown(text: Phaser.GameObjects.Text, name: string, ms: number): void {
    if (ms <= 0) {
      text.setText(`${name}: READY`).setColor("#44ff88");
    } else {
      const secs = (ms / 1000).toFixed(1);
      text.setText(`${name}: ${secs}s`).setColor("#ff8844");
    }
  }
}
