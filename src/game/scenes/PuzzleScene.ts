import Phaser from "phaser";
import { appBridge, type ScenePayload } from "../appBridge";
import type { TermToken } from "../data/curriculum";

export class PuzzleScene extends Phaser.Scene {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private removeBridgeListener: (() => void) | null = null;
  private handleResize: (() => void) | null = null;
  private currentPayload: ScenePayload = {
    mode: "idle",
    headline: "",
    subheading: "",
    prompt: "",
  };

  constructor() {
    super("PuzzleScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#112826");
    this.handleResize = () => this.renderScene();
    this.scale.on("resize", this.handleResize);
    this.removeBridgeListener = appBridge.on<ScenePayload>("scene-state", (payload) => {
      this.currentPayload = payload;
      this.renderScene();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupSceneListeners());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanupSceneListeners());
    appBridge.emit("scene-ready", null);
    this.renderScene();
  }

  private renderScene(): void {
    this.clearStage();
    this.drawBackdrop();

    if (this.currentPayload.mode === "equation") {
      this.drawEquationBoard();
      return;
    }

    if (this.currentPayload.mode === "complete" && this.currentPayload.board) {
      this.drawEquationBoard();
      return;
    }

    this.drawAmbientBoard();
  }

  private drawBackdrop(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const graphics = this.add.graphics();

    graphics.fillStyle(0x112826, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0x1a3d38, 1);
    graphics.fillRoundedRect(18, 18, width - 36, height - 36, 28);
    graphics.lineStyle(1, 0x355e58, 0.65);

    for (let x = 28; x < width - 28; x += 46) {
      graphics.lineBetween(x, 28, x, height - 28);
    }

    for (let y = 28; y < height - 28; y += 42) {
      graphics.lineBetween(28, y, width - 28, y);
    }

    this.track(graphics);

    const formulas = ["x + 7 = 18", "y = 3x + 1", "a^2 + b^2 = c^2", "A = lw"];
    formulas.forEach((formula, index) => {
      const text = this.add.text(width - 230, 58 + index * 42, formula, {
        fontFamily: "Rockwell, Georgia, serif",
        fontSize: "22px",
        color: "#3b6e67",
      });
      text.setAlpha(0.7);
      this.track(text);
    });
  }

  private drawAmbientBoard(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const headline = this.add.text(width / 2, 120, this.currentPayload.headline, {
      fontFamily: "Rockwell, Georgia, serif",
      fontSize: "36px",
      color: "#f8f5dd",
      align: "center",
    });
    headline.setOrigin(0.5);

    const subheading = this.add.text(width / 2, 170, this.currentPayload.subheading, {
      fontFamily: "Trebuchet MS, Avenir Next, sans-serif",
      fontSize: "18px",
      color: "#a6d0c6",
      align: "center",
    });
    subheading.setOrigin(0.5);

    const promptCard = this.add.rectangle(width / 2, height / 2 + 30, Math.min(700, width - 120), 180, 0x204844, 0.96);
    promptCard.setStrokeStyle(3, 0x8fd4bf, 0.9);

    const promptText = this.add.text(width / 2, height / 2, this.currentPayload.prompt, {
      fontFamily: "Trebuchet MS, Avenir Next, sans-serif",
      fontSize: "24px",
      color: "#f8f5dd",
      align: "center",
      wordWrap: { width: Math.min(620, width - 170) },
    });
    promptText.setOrigin(0.5);

    const feedback = this.add.text(width / 2, height - 105, this.currentPayload.feedback ?? "", {
      fontFamily: "Trebuchet MS, Avenir Next, sans-serif",
      fontSize: "18px",
      color: "#ffc968",
      align: "center",
      wordWrap: { width: Math.min(680, width - 120) },
    });
    feedback.setOrigin(0.5);

    this.track(headline);
    this.track(subheading);
    this.track(promptCard);
    this.track(promptText);
    this.track(feedback);
  }

  private drawEquationBoard(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const board = this.currentPayload.board;

    if (!board) {
      return;
    }

    const trayY = height / 2 - 70;
    const trayWidth = Math.min(320, width * 0.32);
    const trayHeight = 112;

    const title = this.add.text(width / 2, 72, this.currentPayload.headline, {
      fontFamily: "Rockwell, Georgia, serif",
      fontSize: "32px",
      color: "#f8f5dd",
      align: "center",
    });
    title.setOrigin(0.5);

    const formula = this.add.text(width / 2, 112, this.currentPayload.subheading, {
      fontFamily: "Trebuchet MS, Avenir Next, sans-serif",
      fontSize: "18px",
      color: "#98d5c6",
      align: "center",
    });
    formula.setOrigin(0.5);

    this.track(title);
    this.track(formula);

    this.drawTray(width * 0.28, trayY, trayWidth, trayHeight);
    this.drawTray(width * 0.72, trayY, trayWidth, trayHeight);

    const relation = this.add.text(width / 2, trayY, board.relation, {
      fontFamily: "Rockwell, Georgia, serif",
      fontSize: "48px",
      color: "#ffd978",
    });
    relation.setOrigin(0.5);
    this.track(relation);

    this.drawTerms(board.left, width * 0.28, trayY, trayWidth - 28);
    this.drawTerms(board.right, width * 0.72, trayY, trayWidth - 28);

    const beam = this.add.rectangle(width / 2, trayY + 88, width * 0.66, 10, 0x7fe0c3, 0.75);
    const pivot = this.add.triangle(width / 2, trayY + 120, 0, 28, 34, -28, 68, 28, 0xffcb66, 0.9);
    this.track(beam);
    this.track(pivot);

    const promptCard = this.add.rectangle(width / 2, height - 210, Math.min(760, width - 80), 72, 0x173936, 0.96);
    promptCard.setStrokeStyle(2, 0x63b9a2, 0.7);
    const prompt = this.add.text(width / 2, height - 210, this.currentPayload.prompt, {
      fontFamily: "Trebuchet MS, Avenir Next, sans-serif",
      fontSize: "20px",
      color: "#f8f5dd",
      align: "center",
      wordWrap: { width: Math.min(690, width - 140) },
    });
    prompt.setOrigin(0.5);
    this.track(promptCard);
    this.track(prompt);

    const options = this.currentPayload.equationOptions ?? [];

    if (options.length > 0) {
      const cardWidth = Math.min(240, (width - 90) / Math.max(options.length, 3));
      const totalWidth = cardWidth * options.length + 18 * (options.length - 1);
      const startX = (width - totalWidth) / 2 + cardWidth / 2;

      options.forEach((option, index) => {
        this.drawOptionCard(startX + index * (cardWidth + 18), height - 96, cardWidth, 88, option.id, option.label, option.summary);
      });
    } else {
      const note = this.add.text(width / 2, height - 96, "Type the final answer in the lesson desk to continue.", {
        fontFamily: "Trebuchet MS, Avenir Next, sans-serif",
        fontSize: "18px",
        color: "#ffd978",
        align: "center",
      });
      note.setOrigin(0.5);
      this.track(note);
    }
  }

  private drawTray(centerX: number, centerY: number, width: number, height: number): void {
    const tray = this.add.rectangle(centerX, centerY, width, height, 0x254f49, 0.98);
    tray.setStrokeStyle(3, 0x8fd4bf, 0.85);
    this.track(tray);
  }

  private drawTerms(terms: TermToken[], centerX: number, centerY: number, maxWidth: number): void {
    const gap = 14;
    const cardWidth = Math.min(110, (maxWidth - gap * Math.max(terms.length - 1, 0)) / Math.max(terms.length, 1));
    const totalWidth = terms.length * cardWidth + Math.max(terms.length - 1, 0) * gap;
    const startX = centerX - totalWidth / 2 + cardWidth / 2;

    terms.forEach((term, index) => {
      const x = startX + index * (cardWidth + gap);
      const color = toneColor(term.tone);
      const card = this.add.rectangle(x, centerY, cardWidth, 62, color.fill, 1);
      card.setStrokeStyle(2, color.stroke, 1);
      const text = this.add.text(x, centerY, term.label, {
        fontFamily: "Trebuchet MS, Avenir Next, sans-serif",
        fontSize: "22px",
        color: "#10211e",
        align: "center",
        wordWrap: { width: cardWidth - 14 },
      });
      text.setOrigin(0.5);
      this.track(card);
      this.track(text);
    });
  }

  private drawOptionCard(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    optionId: string,
    label: string,
    summary: string,
  ): void {
    const card = this.add.rectangle(centerX, centerY, width, height, 0xffcb66, 0.98);
    card.setStrokeStyle(3, 0xf5f1d6, 0.95);
    card.setInteractive({ useHandCursor: true });

    const labelText = this.add.text(centerX, centerY - 16, label, {
      fontFamily: "Rockwell, Georgia, serif",
      fontSize: "18px",
      color: "#2f2712",
      align: "center",
      wordWrap: { width: width - 20 },
    });
    labelText.setOrigin(0.5);

    const summaryText = this.add.text(centerX, centerY + 18, summary, {
      fontFamily: "Trebuchet MS, Avenir Next, sans-serif",
      fontSize: "13px",
      color: "#4b3f1e",
      align: "center",
      wordWrap: { width: width - 20 },
    });
    summaryText.setOrigin(0.5);

    card.on("pointerover", () => {
      card.setFillStyle(0xffda88, 1);
    });
    card.on("pointerout", () => {
      card.setFillStyle(0xffcb66, 0.98);
    });
    card.on("pointerdown", () => {
      appBridge.emit("equation-option-selected", { optionId });
    });

    this.track(card);
    this.track(labelText);
    this.track(summaryText);
  }

  private clearStage(): void {
    while (this.objects.length > 0) {
      this.objects.pop()?.destroy();
    }
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  private cleanupSceneListeners(): void {
    if (this.handleResize) {
      this.scale.off("resize", this.handleResize);
      this.handleResize = null;
    }

    this.removeBridgeListener?.();
    this.removeBridgeListener = null;
  }
}

function toneColor(tone: TermToken["tone"]): { fill: number; stroke: number } {
  switch (tone) {
    case "variable":
      return { fill: 0x8de1cf, stroke: 0xeafff8 };
    case "constant":
      return { fill: 0xffd36e, stroke: 0xfff6d4 };
    case "formula":
      return { fill: 0xff8f6b, stroke: 0xffe0d7 };
    default:
      return { fill: 0xd9efea, stroke: 0xf8fffd };
  }
}
