import Phaser from "phaser";
import "./style.css";
import { appBridge } from "./game/appBridge";
import { createGameConfig } from "./game/config";
import { createCurriculum } from "./game/data/curriculum";
import { GameSession } from "./game/systems/GameSession";
import { loadProgress, saveProgress } from "./game/systems/progressStore";
import { createAppShell } from "./game/ui/shell";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("App root not found.");
}

const session = new GameSession(createCurriculum(), loadProgress());
const shell = createAppShell(root, {
  onSelectGrade: (gradeId) => {
    session.selectGrade(gradeId);
    sync();
  },
  onSelectChapter: (chapterId) => {
    session.selectChapter(chapterId);
    sync();
  },
  onStartLesson: (lessonId) => {
    session.startLesson(lessonId);
    sync();
  },
  onChooseOption: (choiceId) => {
    session.submitChoice(choiceId);
    sync();
  },
  onSubmitAnswer: (value) => {
    session.submitTextAnswer(value);
    sync();
  },
  onRequestHint: () => {
    session.requestHint();
    sync();
  },
  onNextLesson: () => {
    session.startNextLesson();
    sync();
  },
});

// Phaser renders the puzzle board while the DOM shell handles text-heavy lesson flow.
new Phaser.Game(createGameConfig(shell.mountId));

appBridge.on("scene-ready", () => {
  sync();
});

appBridge.on<{ optionId: string }>("equation-option-selected", ({ optionId }) => {
  session.submitEquationOption(optionId);
  sync();
});

sync();

function sync(): void {
  shell.render(session.getViewModel());
  appBridge.emit("scene-state", session.getScenePayload());
  saveProgress(session.exportProgress());
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const serviceWorkerUrl = new URL(`${import.meta.env.BASE_URL}sw.js`, window.location.href);

    navigator.serviceWorker.register(serviceWorkerUrl.toString()).catch((error) => {
      console.warn("Service worker registration failed.", error);
    });
  });
}
