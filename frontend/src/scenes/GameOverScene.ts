import Phaser from "phaser";
import { ARENA_W, ARENA_H } from "./GameScene";

interface GameOverData {
  winner: string;
}

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("gameover");
  }

  create(data: GameOverData): void {
    const { winner } = data;

    // Dark overlay
    this.add
      .rectangle(ARENA_W / 2, ARENA_H / 2, ARENA_W, ARENA_H, 0x000000, 0.7)
      .setDepth(0);

    // Winner banner
    const isPlayerWin = winner === "PLAYER";
    const winnerColor = isPlayerWin ? "#88bbff" : "#ff8888";
    this.add
      .text(ARENA_W / 2, ARENA_H / 2 - 60, `${winner} WINS!`, {
        fontFamily: "Courier New, monospace",
        fontSize: "42px",
        color: winnerColor,
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(10);

    const subtitle = isPlayerWin
      ? "You outplayed the AI!"
      : `${winner} outlasted the competition!`;

    this.add
      .text(ARENA_W / 2, ARENA_H / 2 + 10, subtitle, {
        fontFamily: "Courier New, monospace",
        fontSize: "15px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Restart button
    const btnPlayBg = this.add
      .rectangle(ARENA_W / 2 - 120, ARENA_H / 2 + 80, 200, 44, 0x008866)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    btnPlayBg.setStrokeStyle(1, 0x00ffcc);

    this.add
      .text(ARENA_W / 2 - 120, ARENA_H / 2 + 80, "PLAY AGAIN (R)", {
        fontFamily: "Courier New, monospace",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(11);

    // Menu button
    const btnMenuBg = this.add
      .rectangle(ARENA_W / 2 + 120, ARENA_H / 2 + 80, 200, 44, 0x333355)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    btnMenuBg.setStrokeStyle(1, 0x6666aa);

    this.add
      .text(ARENA_W / 2 + 120, ARENA_H / 2 + 80, "SETTINGS MENU (M)", {
        fontFamily: "Courier New, monospace",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(11);

    const restart = () => {
      this.scene.start("game");
    };

    const goToMenu = () => {
      this.scene.start("menu");
    };

    btnPlayBg
      .on("pointerover", () => btnPlayBg.setFillStyle(0x00aa88))
      .on("pointerout", () => btnPlayBg.setFillStyle(0x008866))
      .on("pointerdown", restart);

    btnMenuBg
      .on("pointerover", () => btnMenuBg.setFillStyle(0x444477))
      .on("pointerout", () => btnMenuBg.setFillStyle(0x333355))
      .on("pointerdown", goToMenu);

    if (this.input.keyboard) {
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", restart);
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on("down", restart);
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M).on("down", goToMenu);
    }
  }
}
