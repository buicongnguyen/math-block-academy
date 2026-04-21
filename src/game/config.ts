import Phaser from "phaser";
import { PuzzleScene } from "./scenes/PuzzleScene";

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#112826",
    scene: [PuzzleScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 960,
      height: 620,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  };
}

