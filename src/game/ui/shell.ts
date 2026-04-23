import type { GradeId } from "../data/curriculum";
import type { SessionViewModel } from "../systems/GameSession";

type MobileScreen = "grades" | "chapters" | "lessons" | "play" | "report";

const MOBILE_FLOW_ORDER: MobileScreen[] = ["grades", "chapters", "lessons", "play", "report"];
const MOBILE_BREAKPOINT = "(max-width: 900px)";

export interface ShellHandlers {
  onSelectGrade: (gradeId: GradeId) => void;
  onSelectChapter: (chapterId: string) => void;
  onStartLesson: (lessonId: string) => void;
  onChooseOption: (choiceId: string) => void;
  onSubmitAnswer: (value: string) => void;
  onRequestHint: () => void;
  onNextLesson: () => void;
}

export interface AppShell {
  mountId: string;
  render: (view: SessionViewModel) => void;
}

export function createAppShell(root: HTMLElement, handlers: ShellHandlers): AppShell {
  let currentView: SessionViewModel | null = null;
  let overlayCollapsed = false;
  let lastOverlayContextId: string | null = null;
  let lastLessonId: string | null = null;
  let lastCompletedLessonId: string | null = null;
  let mobileScreenOverride: MobileScreen | null = null;
  const mobileQuery = window.matchMedia(MOBILE_BREAKPOINT);

  root.innerHTML = `
    <div class="mobile-nav" data-slot="mobile-nav"></div>
    <div class="app-shell" data-mobile-screen="grades">
      <aside class="left-rail">
        <div class="brand-card welcome-card" data-mobile-page="grades">
          <div class="eyebrow">Middle School Math Adventure</div>
          <h1>Math Block Academy</h1>
          <p>Climb from Grade 6 to Grade 9 with balance-board algebra, formula challenges, and report cards.</p>
        </div>
        <section class="panel grades-panel" data-mobile-page="grades">
          <div class="panel-header">
            <h2>Grades</h2>
            <span>Choose your campus</span>
          </div>
          <div class="grade-grid" data-slot="grades"></div>
        </section>
        <section class="panel chapters-panel" data-mobile-page="chapters">
          <div class="panel-header">
            <h2>Chapters</h2>
            <span>Planned level counts and formula focus</span>
          </div>
          <div class="chapter-list" data-slot="chapters"></div>
        </section>
      </aside>

      <main class="center-stage" data-mobile-page="play">
        <section class="guide-bar" data-slot="guide"></section>
        <section class="hud-strip" data-slot="hud"></section>
        <section class="play-panel">
          <div class="stage-overlay" data-slot="overlay"></div>
          <div id="phaser-mount" class="phaser-mount"></div>
        </section>
      </main>

      <aside class="right-desk">
        <section class="panel lessons-panel" data-mobile-page="lessons">
          <div class="panel-header">
            <h2>Learning Tree</h2>
            <span>Chapter branches and playable lesson nodes</span>
          </div>
          <div class="lesson-list" data-slot="lessons"></div>
        </section>
        <section class="panel lesson-desk-panel" data-mobile-page="play">
          <div class="panel-header">
            <h2>Lesson Desk</h2>
            <span>Prompt, hints, and answer tools</span>
          </div>
          <div data-slot="activity"></div>
        </section>
        <section class="panel report-panel" data-mobile-page="report">
          <div class="panel-header">
            <h2>Report Card</h2>
            <span>Mastery and next steps</span>
          </div>
          <div data-slot="report"></div>
        </section>
      </aside>
    </div>
  `;

  const appShell = root.querySelector<HTMLElement>(".app-shell");
  const mobileNavSlot = root.querySelector<HTMLElement>('[data-slot="mobile-nav"]');
  const gradesSlot = root.querySelector<HTMLElement>('[data-slot="grades"]');
  const chaptersSlot = root.querySelector<HTMLElement>('[data-slot="chapters"]');
  const lessonsSlot = root.querySelector<HTMLElement>('[data-slot="lessons"]');
  const hudSlot = root.querySelector<HTMLElement>('[data-slot="hud"]');
  const guideSlot = root.querySelector<HTMLElement>('[data-slot="guide"]');
  const overlaySlot = root.querySelector<HTMLElement>('[data-slot="overlay"]');
  const activitySlot = root.querySelector<HTMLElement>('[data-slot="activity"]');
  const reportSlot = root.querySelector<HTMLElement>('[data-slot="report"]');
  const gradesPanel = root.querySelector<HTMLElement>(".grades-panel");
  const chaptersPanel = root.querySelector<HTMLElement>(".chapters-panel");
  const lessonsPanel = root.querySelector<HTMLElement>(".lessons-panel");
  const lessonDeskPanel = root.querySelector<HTMLElement>(".lesson-desk-panel");
  const reportPanel = root.querySelector<HTMLElement>(".report-panel");
  const playPanel = root.querySelector<HTMLElement>(".play-panel");

  if (
    !appShell ||
    !mobileNavSlot ||
    !gradesSlot ||
    !chaptersSlot ||
    !lessonsSlot ||
    !hudSlot ||
    !guideSlot ||
    !overlaySlot ||
    !activitySlot ||
    !reportSlot ||
    !gradesPanel ||
    !chaptersPanel ||
    !lessonsPanel ||
    !lessonDeskPanel ||
    !reportPanel ||
    !playPanel
  ) {
    throw new Error("App shell failed to initialize.");
  }

  const rerenderOnViewportChange = () => {
    if (currentView) {
      render(currentView);
    }
  };
  const legacyMobileQuery = mobileQuery as MediaQueryList & {
    addListener?: (listener: () => void) => void;
  };

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", rerenderOnViewportChange);
  } else {
    legacyMobileQuery.addListener?.(rerenderOnViewportChange);
  }

  const render = (view: SessionViewModel) => {
    currentView = view;

    const overlayContextId = view.activeLesson ? `lesson:${view.activeLesson.id}` : `chapter:${view.selectedChapter.id}`;
    if (overlayContextId !== lastOverlayContextId) {
      overlayCollapsed = Boolean(view.activeLesson);
      lastOverlayContextId = overlayContextId;
    }

    if (!view.activeLesson) {
      lastLessonId = null;
      lastCompletedLessonId = null;
    } else if (view.activeLesson.id !== lastLessonId) {
      overlayCollapsed = true;
      lastLessonId = view.activeLesson.id;
    }

    if (view.activeLesson?.completed) {
      if (view.activeLesson.id !== lastCompletedLessonId) {
        mobileScreenOverride = "report";
      }
      lastCompletedLessonId = view.activeLesson.id;
    } else {
      lastCompletedLessonId = null;
    }

    const mobileScreen = resolveMobileScreen(view, mobileScreenOverride);
    mobileScreenOverride = mobileScreenOverride ? mobileScreen : mobileScreenOverride;
    appShell.dataset.mobileScreen = mobileScreen;

    mobileNavSlot.innerHTML = renderMobileNav(view, mobileScreen);
    mobileNavSlot.querySelector<HTMLElement>("[data-mobile-back]")?.addEventListener("click", () => {
      const target = mobileNavSlot.querySelector<HTMLElement>("[data-mobile-back]")?.dataset.mobileBack as MobileScreen | undefined;
      if (!target || !currentView) {
        return;
      }

      mobileScreenOverride = target;
      render(currentView);
    });

    guideSlot.innerHTML = `
      <div class="guide-card">
        <span class="eyebrow">${view.guide.stepLabel}</span>
        <strong>${view.guide.title}</strong>
        <p>${view.guide.body}</p>
      </div>
    `;

    gradesSlot.innerHTML = view.gradeCards
      .map(
        (grade) => `
          <button class="grade-card ${grade.selected ? "selected expanded" : "collapsed"}" data-grade-id="${grade.id}">
            <div class="grade-card-top">
              <div>
                <span class="grade-label">${grade.label}</span>
                <strong>${grade.banner}</strong>
              </div>
              <span class="meta-text">${grade.completionLabel}</span>
            </div>
            ${grade.selected ? `<p>${grade.summary}</p>` : ""}
            ${grade.selected ? `<div class="skill-row">${grade.targetSkills.map((skill) => `<span class="pill">${skill}</span>`).join("")}</div>` : ""}
          </button>
        `,
      )
      .join("");

    gradesSlot.querySelectorAll<HTMLElement>("[data-grade-id]").forEach((button) => {
      button.addEventListener("click", () => {
        mobileScreenOverride = "chapters";
        handlers.onSelectGrade(button.dataset.gradeId as GradeId);
      });
    });

    chaptersSlot.innerHTML = view.chapterCards
      .map(
        (chapter) => `
          <button class="chapter-card ${chapter.selected ? "selected" : ""} ${chapter.locked ? "locked" : ""}" data-chapter-id="${chapter.id}" ${chapter.locked ? "disabled" : ""}>
            <div class="chapter-title-row">
              <strong>${chapter.title}</strong>
              <span class="meta-text">${chapter.planLabel}</span>
            </div>
            <p>${chapter.theme}</p>
            <div class="skill-row">${chapter.formulaFocus.map((formula) => `<span class="pill warm">${formula}</span>`).join("")}</div>
            <span class="meta-text">${chapter.unlockLabel} • ${chapter.masteryLabel}</span>
          </button>
        `,
      )
      .join("");

    chaptersSlot.querySelectorAll<HTMLElement>("[data-chapter-id]").forEach((button) => {
      button.addEventListener("click", () => {
        mobileScreenOverride = "lessons";
        handlers.onSelectChapter(button.dataset.chapterId ?? "");
      });
    });

    lessonsSlot.innerHTML = renderLearningTree(view);

    lessonsSlot.querySelectorAll<HTMLElement>("[data-tree-chapter-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const chapterId = button.dataset.treeChapterId;
        if (!chapterId || chapterId === currentView?.selectedChapter.id) {
          return;
        }

        mobileScreenOverride = "lessons";
        handlers.onSelectChapter(chapterId);
      });
    });

    lessonsSlot.querySelectorAll<HTMLElement>("[data-lesson-id]").forEach((button) => {
      button.addEventListener("click", () => {
        mobileScreenOverride = "play";
        handlers.onStartLesson(button.dataset.lessonId ?? "");
      });
    });

    hudSlot.innerHTML = `
      <div class="hud-chip">
        <span class="chip-label">Grade</span>
        <strong>${view.hud.grade}</strong>
      </div>
      <div class="hud-chip">
        <span class="chip-label">Chapter</span>
        <strong>${view.hud.chapter}</strong>
      </div>
      <div class="hud-chip">
        <span class="chip-label">Mastery</span>
        <strong>${view.hud.mastery}</strong>
      </div>
      <div class="hud-chip">
        <span class="chip-label">Last Score</span>
        <strong>${view.hud.score}</strong>
      </div>
      <div class="hud-chip">
        <span class="chip-label">Course Progress</span>
        <strong>${view.hud.courseProgress}</strong>
      </div>
    `;

    overlaySlot.classList.toggle("is-collapsed", overlayCollapsed);
    overlaySlot.innerHTML = `
      ${
        overlayCollapsed
          ? `
            <button class="overlay-peek-button" data-overlay-toggle="true" aria-expanded="false">
              Intro
            </button>
          `
          : `
            <div class="overlay-card">
              <div class="overlay-card-top">
                <span class="eyebrow">${view.selectedGrade.label} • ${view.selectedGrade.banner}</span>
                <button class="overlay-toggle" data-overlay-toggle="true" aria-expanded="true">Minimize</button>
              </div>
              <h2>${view.selectedChapter.title}</h2>
              <p>${view.selectedChapter.summary}</p>
              <div class="skill-row">${view.selectedChapter.formulaFocus.map((formula) => `<span class="pill">${formula}</span>`).join("")}</div>
              <div class="overlay-meta">
                <span>${view.selectedChapter.masteryLabel}</span>
                <span>${view.selectedChapter.lessonCount} lessons live</span>
                <span>${view.selectedChapter.unlockLabel}</span>
              </div>
            </div>
          `
      }
    `;
    overlaySlot.querySelector<HTMLElement>("[data-overlay-toggle]")?.addEventListener("click", () => {
      overlayCollapsed = !overlayCollapsed;
      if (currentView) {
        render(currentView);
      }
    });

    activitySlot.innerHTML = renderActivity(view);
    bindActivityHandlers(activitySlot, view, handlers);

    reportSlot.innerHTML = `
      <div class="report-card-view">
        <h3>${view.reportCard.title}</h3>
        <p>${view.reportCard.body}</p>
        <div class="report-grid">
          <span class="pill warm">${view.reportCard.scoreLabel}</span>
          <span class="pill cool">${view.reportCard.masteryLabel}</span>
        </div>
        <p class="meta-text">${view.reportCard.attemptsLabel}</p>
        <p class="meta-text">${view.reportCard.nextActionLabel}</p>
        <div class="report-actions">
          ${view.nextLessonId ? '<button class="next-button" data-next-lesson="true">Next Lesson</button>' : ""}
          <button class="ghost-button" data-open-lessons="true">Lesson List</button>
        </div>
      </div>
    `;

    reportSlot.querySelector<HTMLElement>("[data-next-lesson]")?.addEventListener("click", () => {
      mobileScreenOverride = "play";
      handlers.onNextLesson();
    });
    reportSlot.querySelector<HTMLElement>("[data-open-lessons]")?.addEventListener("click", () => {
      if (!currentView) {
        return;
      }

      mobileScreenOverride = "lessons";
      render(currentView);
    });

    applyFocusState(
      {
        grades: gradesPanel,
        chapters: chaptersPanel,
        lessons: lessonsPanel,
        play: playPanel,
        activity: lessonDeskPanel,
        report: reportPanel,
      },
      view.guide.area,
    );
  };

  return {
    mountId: "phaser-mount",
    render,
  };
}

function renderLearningTree(view: SessionViewModel): string {
  return `
    <div class="learning-tree" aria-label="${view.selectedGrade.label} chapter and lesson tree">
      <div class="tree-map-header">
        <span class="eyebrow">${view.selectedGrade.label} Map</span>
        <p>Tap a chapter root to open its branch, then choose any lesson node.</p>
      </div>
      ${view.learningTree
        .map(
          (chapter) => `
            <article class="tree-chapter ${chapter.selected ? "active-branch" : "collapsed"}">
              <button class="tree-chapter-node" data-tree-chapter-id="${chapter.id}" aria-expanded="${chapter.selected}">
                <span class="tree-node-marker">${chapter.chapterNumber}</span>
                <span class="tree-node-copy">
                  <strong>${chapter.title}</strong>
                  <small>${chapter.statusLabel} • ${chapter.masteryLabel}</small>
                </span>
                <span class="tree-node-count">${chapter.lessonCount}</span>
              </button>
              ${
                chapter.selected
                  ? `
                    <div class="tree-branches">
                      ${chapter.lessons
                        .map(
                          (lesson) => `
                            <button class="tree-lesson-node ${lesson.selected ? "selected" : ""}" data-lesson-id="${lesson.id}">
                              <span class="tree-line" aria-hidden="true"></span>
                              <span class="tree-node-dot" data-category="${lesson.categoryLabel.toLowerCase()}">${lesson.lessonNumber}</span>
                              <span class="tree-node-copy">
                                <strong>${lesson.title}</strong>
                                <small>${lesson.categoryLabel} • ${lesson.modeLabel} • ${lesson.statusLabel}</small>
                              </span>
                              <span class="tree-time">${lesson.estimatedMinutes}m</span>
                            </button>
                          `,
                        )
                        .join("")}
                    </div>
                  `
                  : `<p class="tree-collapsed-note">${chapter.planLabel} • ${chapter.theme}</p>`
              }
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderActivity(view: SessionViewModel): string {
  if (!view.activeLesson) {
    return `
      <div class="empty-state">
        <h3>Start a Course Lesson</h3>
        <p>Pick any lesson node in the learning tree to load the Phaser board and the lesson desk.</p>
        <div class="skill-row">${view.selectedGrade.targetSkills.map((skill) => `<span class="pill">${skill}</span>`).join("")}</div>
      </div>
    `;
  }

  if (view.activeLesson.completed) {
    return `
      <div class="activity-card">
        <span class="eyebrow">${view.activeLesson.modeLabel}</span>
        <h3>${view.activeLesson.title}</h3>
        <p>${view.activeLesson.feedback}</p>
        <div class="report-grid">
          <span class="pill cool">Completed</span>
          <span class="pill warm">${view.activeLesson.stepLabel}</span>
          <span class="pill">${view.activeLesson.roundLabel}</span>
        </div>
        <button class="action-button" data-replay-id="${view.activeLesson.id}">Replay Lesson</button>
      </div>
    `;
  }

  if (view.activeLesson.choices) {
    return `
      <div class="activity-card">
        <span class="eyebrow">${view.activeLesson.modeLabel}</span>
        <h3>${view.activeLesson.title}</h3>
        <p>${view.activeLesson.prompt}</p>
        <p class="formula-callout">${view.activeLesson.formula}</p>
        ${renderQuizStats(view)}
        <div class="skill-row">
          <span class="pill">${view.activeLesson.roundLabel}</span>
        </div>
        <div class="choice-list">
          ${view.activeLesson.choices
            .map(
              (choice) => `
                <button class="choice-button" data-choice-id="${choice.id}">
                  ${choice.label}
                </button>
              `,
            )
            .join("")}
        </div>
        <p class="feedback-text">${view.activeLesson.feedback}</p>
        <div class="desk-actions">
          <button class="ghost-button" data-hint="true">Hint</button>
          <span class="meta-text">${view.activeLesson.stepLabel} • ${view.activeLesson.hintLabel}</span>
        </div>
      </div>
    `;
  }

  const needsTextInput = Boolean(view.activeLesson.placeholder);

  return `
    <div class="activity-card">
      <span class="eyebrow">${view.activeLesson.modeLabel}</span>
      <h3>${view.activeLesson.title}</h3>
      <p>${view.activeLesson.prompt}</p>
      <p class="formula-callout">${view.activeLesson.formula}</p>
      <div class="skill-row">
        <span class="pill">${view.activeLesson.roundLabel}</span>
      </div>
      ${needsTextInput
        ? `
            <form class="answer-form" data-answer-form="true">
              <input type="text" name="answer" placeholder="${view.activeLesson.placeholder}" />
              <button type="submit" class="action-button">Submit Answer</button>
            </form>
          `
        : `
            <div class="instruction-box">
              <strong>On the Phaser board:</strong>
              <span>Click the correct operation block to keep the equation balanced.</span>
            </div>
          `}
      <p class="feedback-text">${view.activeLesson.feedback}</p>
      <div class="desk-actions">
        <button class="ghost-button" data-hint="true">Hint</button>
        <span class="meta-text">${view.activeLesson.stepLabel} • ${view.activeLesson.hintLabel}</span>
      </div>
    </div>
  `;
}

function renderQuizStats(view: SessionViewModel): string {
  if (!view.activeLesson?.quizStats) {
    return "";
  }

  return `
    <div class="quiz-status">
      <span>${view.activeLesson.quizStats.progressLabel}</span>
      <span>${view.activeLesson.quizStats.streakLabel}</span>
      <span>${view.activeLesson.quizStats.energyLabel}</span>
    </div>
  `;
}

function bindActivityHandlers(activitySlot: HTMLElement, view: SessionViewModel, handlers: ShellHandlers): void {
  activitySlot.querySelector<HTMLElement>("[data-replay-id]")?.addEventListener("click", () => {
    if (view.activeLesson) {
      handlers.onStartLesson(view.activeLesson.id);
    }
  });

  activitySlot.querySelectorAll<HTMLElement>("[data-choice-id]").forEach((button) => {
    button.addEventListener("click", () => handlers.onChooseOption(button.dataset.choiceId ?? ""));
  });

  activitySlot.querySelector<HTMLElement>("[data-hint]")?.addEventListener("click", () => {
    handlers.onRequestHint();
  });

  activitySlot.querySelector<HTMLFormElement>("[data-answer-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    handlers.onSubmitAnswer(String(formData.get("answer") ?? ""));
  });
}

function applyFocusState(
  panels: Record<"grades" | "chapters" | "lessons" | "play" | "activity" | "report", HTMLElement>,
  activeArea: SessionViewModel["guide"]["area"],
): void {
  Object.entries(panels).forEach(([area, element]) => {
    element.classList.toggle("focus-ring", area === activeArea);
  });
}

function renderMobileNav(view: SessionViewModel, mobileScreen: MobileScreen): string {
  const header = getMobileHeader(view, mobileScreen);
  const backTarget = getMobileBackTarget(mobileScreen);
  const activeIndex = MOBILE_FLOW_ORDER.indexOf(mobileScreen);
  const context =
    mobileScreen === "grades"
      ? "Phone Flow"
      : mobileScreen === "chapters"
        ? view.selectedGrade.label
        : `${view.selectedGrade.label} • ${view.selectedChapter.title}`;

  return `
    <div class="mobile-flow-bar">
      <div class="mobile-flow-top">
        ${
          backTarget
            ? `<button class="mobile-back-button" data-mobile-back="${backTarget}">Back</button>`
            : '<span class="mobile-mode-pill">Phone Mode</span>'
        }
        <span class="mobile-context">${context}</span>
      </div>
      <div class="mobile-flow-copy">
        <span class="eyebrow">${header.stepLabel}</span>
        <strong>${header.title}</strong>
        <p>${header.body}</p>
      </div>
      <div class="mobile-step-strip">
        ${MOBILE_FLOW_ORDER.map((step, index) => {
          const className = [
            "mobile-step-pill",
            step === mobileScreen ? "active" : "",
            index < activeIndex ? "done" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return `<span class="${className}">${mobileStepLabel(step)}</span>`;
        }).join("")}
      </div>
    </div>
  `;
}

function resolveMobileScreen(view: SessionViewModel, requested: MobileScreen | null): MobileScreen {
  const baseScreen = requested ?? defaultMobileScreen(view);
  const maximumIndex = maxMobileScreenIndex(view.guide.area);
  const requestedIndex = MOBILE_FLOW_ORDER.indexOf(baseScreen);

  return MOBILE_FLOW_ORDER[Math.min(requestedIndex, maximumIndex)];
}

function defaultMobileScreen(view: SessionViewModel): MobileScreen {
  switch (view.guide.area) {
    case "grades":
      return "grades";
    case "chapters":
      return "chapters";
    case "lessons":
      return "lessons";
    case "report":
      return "report";
    case "play":
    case "activity":
      return "play";
  }
}

function maxMobileScreenIndex(area: SessionViewModel["guide"]["area"]): number {
  switch (area) {
    case "grades":
      return 0;
    case "chapters":
      return 1;
    case "lessons":
      return 2;
    case "play":
    case "activity":
      return 3;
    case "report":
      return 4;
  }
}

function getMobileBackTarget(screen: MobileScreen): MobileScreen | null {
  switch (screen) {
    case "grades":
      return null;
    case "chapters":
      return "grades";
    case "lessons":
      return "chapters";
    case "play":
      return "lessons";
    case "report":
      return "lessons";
  }
}

function getMobileHeader(view: SessionViewModel, screen: MobileScreen): { stepLabel: string; title: string; body: string } {
  switch (screen) {
    case "grades":
      return {
        stepLabel: "Step 1 of 5",
        title: "Choose a Grade",
        body: "Tap Grade 6, 7, 8, or 9 to enter that math path.",
      };
    case "chapters":
      return {
        stepLabel: "Step 2 of 5",
        title: view.selectedGrade.label,
        body: "Pick any chapter. All chapters are open so you can explore freely.",
      };
    case "lessons":
      return {
        stepLabel: "Step 3 of 5",
        title: "Learning Tree",
        body: "Open a chapter branch, then choose any lesson node. The current chapter stays expanded.",
      };
    case "play":
      return {
        stepLabel: "Step 4 of 5",
        title: view.activeLesson?.title ?? "Solve the Lesson",
        body: view.activeLesson
          ? `${view.activeLesson.modeLabel} • ${view.activeLesson.roundLabel}. Use the board and answer tools on this screen.`
          : "Use the board and answer tools on this screen.",
      };
    case "report":
      return {
        stepLabel: "Step 5 of 5",
        title: "Review the Result",
        body: `${view.reportCard.masteryLabel} • ${view.reportCard.scoreLabel}. Continue forward or jump back to the lesson list.`,
      };
  }
}

function mobileStepLabel(screen: MobileScreen): string {
  switch (screen) {
    case "grades":
      return "Grade";
    case "chapters":
      return "Chapter";
    case "lessons":
      return "Tree";
    case "play":
      return "Play";
    case "report":
      return "Report";
  }
}
