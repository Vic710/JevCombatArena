import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene";
import GameScene, { ARENA_W, ARENA_H } from "./scenes/GameScene";
import GameOverScene from "./scenes/GameOverScene";
import HUD from "./ui/HUD";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: ARENA_W,
  height: ARENA_H,
  backgroundColor: "#0a0a0f",
  render: {
    // Nearest-neighbour filtering + no antialiasing = sharp geometric shapes
    // This also fixes blurriness when the canvas is CSS-scaled on HiDPI screens
    antialias: false,
    pixelArt: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, GameScene, HUD, GameOverScene],
};

new Phaser.Game(config);
