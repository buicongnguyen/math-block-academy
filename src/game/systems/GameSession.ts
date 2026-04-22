import type { ScenePayload } from "../appBridge";
import type {
  Chapter,
  ChoiceActivity,
  CompositeActivity,
  EquationActivity,
  Grade,
  GradeId,
  InputActivity,
  Lesson,
  LessonActivity,
  LessonCategory,
} from "../data/curriculum";

export type MasteryBand = "Mastery" | "Proficient" | "Developing" | "Review";

export interface LessonResult {
  lessonId: string;
  score: number;
  band: MasteryBand;
  wrongAttempts: number;
  hintsUsed: number;
  summary: string;
}

export interface SessionProgressData {
  version: 1;
  selectedGradeId: GradeId;
  selectedChapterId: string;
  results: LessonResult[];
}

interface ActiveLessonRuntime {
  lessonId: string;
  incorrectAttempts: number;
  hintsUsed: number;
  feedback: string;
  equationStageIndex: number;
  compositeRoundIndex: number;
  completed: boolean;
  report?: LessonResult;
}

interface LessonLocation {
  grade: Grade;
  gradeIndex: number;
  chapter: Chapter;
  chapterIndex: number;
  lesson: Lesson;
  lessonIndex: number;
}

type PlayableActivity = EquationActivity | ChoiceActivity | InputActivity;
type GuideArea = "grades" | "chapters" | "lessons" | "play" | "activity" | "report";

export interface SessionViewModel {
  gradeCards: Array<{
    id: GradeId;
    label: string;
    banner: string;
    summary: string;
    targetSkills: string[];
    selected: boolean;
    completionLabel: string;
  }>;
  selectedGrade: {
    id: GradeId;
    label: string;
    banner: string;
    summary: string;
    targetSkills: string[];
    completionLabel: string;
  };
  chapterCards: Array<{
    id: string;
    title: string;
    summary: string;
    theme: string;
    formulaFocus: string[];
    planLabel: string;
    masteryLabel: string;
    unlockLabel: string;
    locked: boolean;
    selected: boolean;
  }>;
  selectedChapter: {
    id: string;
    title: string;
    summary: string;
    formulaFocus: string[];
    masteryLabel: string;
    lessonCount: number;
    unlockLabel: string;
  };
  learningTree: Array<{
    id: string;
    chapterNumber: number;
    title: string;
    theme: string;
    planLabel: string;
    masteryLabel: string;
    statusLabel: string;
    lessonCount: number;
    selected: boolean;
    lessons: Array<{
      id: string;
      lessonNumber: number;
      title: string;
      objective: string;
      modeLabel: string;
      estimatedMinutes: number;
      selected: boolean;
      statusLabel: string;
      categoryLabel: string;
    }>;
  }>;
  lessonCards: Array<{
    id: string;
    title: string;
    objective: string;
    modeLabel: string;
    estimatedMinutes: number;
    selected: boolean;
    statusLabel: string;
    categoryLabel: string;
    locked: boolean;
  }>;
  activeLesson: {
    id: string;
    title: string;
    objective: string;
    formula: string;
    modeLabel: string;
    prompt: string;
    placeholder?: string;
    choices?: Array<{ id: string; label: string }>;
    stepLabel: string;
    roundLabel: string;
    feedback: string;
    hintLabel: string;
    completed: boolean;
  } | null;
  reportCard: {
    title: string;
    body: string;
    scoreLabel: string;
    masteryLabel: string;
    attemptsLabel: string;
    nextActionLabel: string;
  };
  nextLessonId: string | null;
  hud: {
    grade: string;
    chapter: string;
    mastery: string;
    score: string;
    courseProgress: string;
  };
  guide: {
    stepLabel: string;
    title: string;
    body: string;
    area: GuideArea;
  };
}

export class GameSession {
  private readonly curriculum: Grade[];
  private selectedGradeId: GradeId;
  private selectedChapterId: string;
  private activeLessonId: string | null = null;
  private runtime: ActiveLessonRuntime | null = null;
  private readonly results = new Map<string, LessonResult>();
  private hasPickedGrade: boolean;
  private hasPickedChapter: boolean;

  constructor(curriculum: Grade[], savedProgress?: SessionProgressData | null) {
    this.curriculum = curriculum;
    this.selectedGradeId = curriculum[0].id;
    this.selectedChapterId = curriculum[0].chapters[0].id;
    this.hasPickedGrade = false;
    this.hasPickedChapter = false;

    if (savedProgress?.version === 1) {
      savedProgress.results.forEach((result) => {
        if (this.hasLesson(result.lessonId)) {
          this.results.set(result.lessonId, result);
        }
      });

      if (this.curriculum.some((grade) => grade.id === savedProgress.selectedGradeId)) {
        this.selectedGradeId = savedProgress.selectedGradeId;
      }

      const savedChapterLocation = this.findChapterLocation(savedProgress.selectedChapterId);
      if (savedChapterLocation) {
        this.selectedGradeId = savedChapterLocation.grade.id;
        this.selectedChapterId = savedProgress.selectedChapterId;
      } else {
        this.selectedChapterId = this.selectedGrade.chapters[0].id;
      }

      this.hasPickedGrade = true;
      this.hasPickedChapter = true;
    }
  }

  exportProgress(): SessionProgressData {
    return {
      version: 1,
      selectedGradeId: this.selectedGradeId,
      selectedChapterId: this.selectedChapterId,
      results: Array.from(this.results.values()),
    };
  }

  selectGrade(gradeId: GradeId): void {
    const grade = this.curriculum.find((entry) => entry.id === gradeId);

    if (!grade) {
      return;
    }

    this.selectedGradeId = grade.id;
    this.selectedChapterId = grade.chapters[0].id;
    this.activeLessonId = null;
    this.runtime = null;
    this.hasPickedGrade = true;
    this.hasPickedChapter = false;
  }

  selectChapter(chapterId: string): void {
    const location = this.findChapterLocation(chapterId);

    if (!location) {
      return;
    }

    this.selectedGradeId = location.grade.id;
    this.selectedChapterId = chapterId;
    this.activeLessonId = null;
    this.runtime = null;
    this.hasPickedGrade = true;
    this.hasPickedChapter = true;
  }

  startLesson(lessonId: string): void {
    const location = this.findLessonLocation(lessonId);

    if (!location) {
      return;
    }

    this.selectedGradeId = location.grade.id;
    this.selectedChapterId = location.chapter.id;
    this.activeLessonId = location.lesson.id;
    this.hasPickedGrade = true;
    this.hasPickedChapter = true;
    this.runtime = {
      lessonId: location.lesson.id,
      incorrectAttempts: 0,
      hintsUsed: 0,
      feedback: this.getInitialFeedback(this.getInitialPlayableActivity(location.lesson.activity)),
      equationStageIndex: 0,
      compositeRoundIndex: 0,
      completed: false,
      report: undefined,
    };
  }

  startNextLesson(): void {
    const nextId = this.getNextLessonId();

    if (nextId) {
      this.startLesson(nextId);
    }
  }

  requestHint(): void {
    const lesson = this.activeLesson;
    const runtime = this.runtime;

    if (!lesson || !runtime || runtime.completed) {
      return;
    }

    runtime.hintsUsed += 1;
    runtime.feedback = this.getHint(this.getCurrentActivity(lesson, runtime), runtime.equationStageIndex);
  }

  submitChoice(choiceId: string): void {
    const lesson = this.activeLesson;
    const runtime = this.runtime;

    if (!lesson || !runtime || runtime.completed) {
      return;
    }

    const activity = this.getCurrentActivity(lesson, runtime);

    if (activity.kind !== "multiple-choice") {
      return;
    }

    if (choiceId === activity.correctChoiceId) {
      runtime.feedback = activity.explanation;
      this.advanceAfterCorrectAnswer(lesson, runtime);
      return;
    }

    runtime.incorrectAttempts += 1;
    runtime.feedback = `Not yet. ${activity.hint}`;
  }

  submitTextAnswer(inputValue: string): void {
    const lesson = this.activeLesson;
    const runtime = this.runtime;

    if (!lesson || !runtime || runtime.completed) {
      return;
    }

    const activity = this.getCurrentActivity(lesson, runtime);
    const acceptedAnswers = this.getAcceptedAnswers(activity);
    const normalizedInput = normalize(inputValue);

    if (acceptedAnswers.includes(normalizedInput)) {
      runtime.feedback = this.getSuccessExplanation(activity);
      this.advanceAfterCorrectAnswer(lesson, runtime);
      return;
    }

    runtime.incorrectAttempts += 1;
    runtime.feedback = `Try again. ${this.getHint(activity, runtime.equationStageIndex)}`;
  }

  submitEquationOption(optionId: string): void {
    const lesson = this.activeLesson;
    const runtime = this.runtime;

    if (!lesson || !runtime || runtime.completed) {
      return;
    }

    const activity = this.getCurrentActivity(lesson, runtime);

    if (activity.kind !== "equation-balance") {
      return;
    }

    const stage = activity.stages[runtime.equationStageIndex];

    if (!stage || !stage.correctOptionId) {
      return;
    }

    if (optionId === stage.correctOptionId) {
      runtime.equationStageIndex += 1;
      const nextStage = activity.stages[runtime.equationStageIndex];
      runtime.feedback = nextStage ? nextStage.prompt : activity.explanation;
      return;
    }

    runtime.incorrectAttempts += 1;
    runtime.feedback = `That move breaks the balance. ${stage.hint}`;
  }

  getScenePayload(): ScenePayload {
    const lesson = this.activeLesson;
    const runtime = this.runtime;

    if (!lesson || !runtime) {
      return {
        mode: "idle",
        headline: "Choose a Grade and a Lesson",
        subheading: `${this.selectedGrade.label} • ${this.selectedChapter.title}`,
        prompt: "Start any course lesson to wake up the Phaser board. You can try checkpoints, review relays, and boss exams anytime.",
        feedback: "Progress is saved locally in this browser.",
      };
    }

    const activity = this.getCurrentActivity(lesson, runtime);

    if (activity.kind === "equation-balance") {
      const stage = activity.stages[Math.min(runtime.equationStageIndex, activity.stages.length - 1)];

      return {
        mode: runtime.completed ? "complete" : "equation",
        headline: lesson.title,
        subheading: `${this.getRoundLabel(lesson, runtime)} • ${activity.formula}`,
        prompt: stage.prompt,
        board: stage.board,
        equationOptions: runtime.completed ? [] : stage.options,
        feedback: runtime.feedback,
      };
    }

    return {
      mode: runtime.completed ? "complete" : activity.kind === "multiple-choice" ? "choice" : "input",
      headline: lesson.title,
      subheading: `${this.getRoundLabel(lesson, runtime)} • ${this.getSafeFormulaLabel(activity)}`,
      prompt: this.getActivePrompt(activity, runtime.equationStageIndex),
      feedback: runtime.feedback,
    };
  }

  getViewModel(): SessionViewModel {
    const selectedGrade = this.selectedGrade;
    const selectedChapter = this.selectedChapter;
    const activeLesson = this.activeLesson;
    const runtime = this.runtime;
    const activeReport = runtime?.report ?? (activeLesson ? this.results.get(activeLesson.id) : undefined);
    const chapterResults = selectedChapter.lessons.map((lesson) => this.results.get(lesson.id)).filter(Boolean) as LessonResult[];
    const chapterAverage = averageScore(chapterResults);
    const gradeResults = selectedGrade.chapters
      .flatMap((chapter) => chapter.lessons)
      .map((lesson) => this.results.get(lesson.id))
      .filter(Boolean) as LessonResult[];
    const courseDone = chapterResults.length;
    const currentActivity = activeLesson && runtime ? this.getCurrentActivity(activeLesson, runtime) : null;
    const guide = this.getGuide(activeLesson, runtime, currentActivity);

    return {
      gradeCards: this.curriculum.map((grade) => {
        const gradeCourseResults = grade.chapters
          .flatMap((chapter) => chapter.lessons)
          .map((lesson) => this.results.get(lesson.id))
          .filter(Boolean) as LessonResult[];

        return {
          id: grade.id,
          label: grade.label,
          banner: grade.banner,
          summary: grade.summary,
          targetSkills: grade.targetSkills,
          selected: grade.id === selectedGrade.id,
          completionLabel: completionLabel(gradeCourseResults.length, grade.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0)),
        };
      }),
      selectedGrade: {
        id: selectedGrade.id,
        label: selectedGrade.label,
        banner: selectedGrade.banner,
        summary: selectedGrade.summary,
        targetSkills: selectedGrade.targetSkills,
        completionLabel: completionLabel(
          gradeResults.length,
          selectedGrade.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0),
        ),
      },
      chapterCards: selectedGrade.chapters.map((chapter, chapterIndex) => {
        const results = chapter.lessons.map((lesson) => this.results.get(lesson.id)).filter(Boolean) as LessonResult[];
        const totalPlanned = chapter.levelPlan.guided + chapter.levelPlan.practice + chapter.levelPlan.mastery + chapter.levelPlan.boss;
        return {
          id: chapter.id,
          title: chapter.title,
          summary: chapter.summary,
          theme: chapter.theme,
          formulaFocus: chapter.formulaFocus,
          planLabel: `${totalPlanned} full-course lessons`,
          masteryLabel: masterySummary(results),
          unlockLabel: this.getChapterStatusLabel(chapter),
          locked: false,
          selected: chapter.id === selectedChapter.id,
        };
      }),
      selectedChapter: {
        id: selectedChapter.id,
        title: selectedChapter.title,
        summary: selectedChapter.summary,
        formulaFocus: selectedChapter.formulaFocus,
        masteryLabel: masterySummary(chapterResults),
        lessonCount: selectedChapter.lessons.length,
        unlockLabel: this.isSelectedChapterComplete(selectedChapter)
          ? this.isChapterPassed(selectedChapter)
            ? "Boss cleared"
            : "Replay the boss exam for Proficient or better"
          : "Open exploration mode",
      },
      learningTree: selectedGrade.chapters.map((chapter, chapterIndex) => {
        const results = chapter.lessons.map((lesson) => this.results.get(lesson.id)).filter(Boolean) as LessonResult[];
        const totalPlanned = chapter.levelPlan.guided + chapter.levelPlan.practice + chapter.levelPlan.mastery + chapter.levelPlan.boss;

        return {
          id: chapter.id,
          chapterNumber: chapterIndex + 1,
          title: chapter.title,
          theme: chapter.theme,
          planLabel: `${totalPlanned} lessons`,
          masteryLabel: masterySummary(results),
          statusLabel: this.getChapterStatusLabel(chapter),
          lessonCount: chapter.lessons.length,
          selected: chapter.id === selectedChapter.id,
          lessons: chapter.lessons.map((lesson, lessonIndex) => ({
            id: lesson.id,
            lessonNumber: lessonIndex + 1,
            title: lesson.title,
            objective: lesson.objective,
            modeLabel: lesson.modeLabel,
            estimatedMinutes: lesson.estimatedMinutes,
            selected: lesson.id === activeLesson?.id,
            statusLabel: lessonStatusLabel(this.results.get(lesson.id)),
            categoryLabel: categoryLabel(lesson.category),
          })),
        };
      }),
      lessonCards: selectedChapter.lessons.map((lesson, lessonIndex) => {
        return {
          id: lesson.id,
          title: lesson.title,
          objective: lesson.objective,
          modeLabel: lesson.modeLabel,
          estimatedMinutes: lesson.estimatedMinutes,
          selected: lesson.id === activeLesson?.id,
          statusLabel: lessonStatusLabel(this.results.get(lesson.id)),
          categoryLabel: categoryLabel(lesson.category),
          locked: false,
        };
      }),
      activeLesson: activeLesson && runtime && currentActivity
        ? {
            id: activeLesson.id,
            title: activeLesson.title,
            objective: activeLesson.objective,
            formula: this.getSafeFormulaLabel(currentActivity),
            modeLabel: activeLesson.modeLabel,
            prompt: this.getActivePrompt(currentActivity, runtime.equationStageIndex),
            placeholder: this.getActivePlaceholder(currentActivity, runtime.equationStageIndex),
            choices: currentActivity.kind === "multiple-choice" ? currentActivity.choices : undefined,
            stepLabel: this.getStepLabel(currentActivity, runtime.equationStageIndex),
            roundLabel: this.getRoundLabel(activeLesson, runtime),
            feedback: runtime.feedback,
            hintLabel: runtime.hintsUsed > 0 ? "Hint shown in feedback" : "Hint available",
            completed: runtime.completed,
          }
        : null,
      reportCard: activeReport
        ? {
            title: activeLesson?.category === "boss" ? "Boss Exam Report" : "Lesson Report Card",
            body: activeReport.summary,
            scoreLabel: `Score ${activeReport.score}`,
            masteryLabel: activeReport.band,
            attemptsLabel: `${activeReport.wrongAttempts} wrong attempt(s) • ${activeReport.hintsUsed} hint(s)`,
            nextActionLabel: this.getNextLessonId()
              ? "Use Next Lesson to keep climbing this chapter."
              : this.isChapterPassed(selectedChapter)
                ? "Chapter clear. You can still replay any lesson or jump to another chapter."
                : activeLesson?.category === "boss"
                  ? "Replay the boss exam and aim for Proficient or better, or try any other lesson."
                : "Choose another lesson from this chapter.",
          }
        : {
            title: "Report Card",
            body: `Selected chapter average: ${chapterAverage ? `${chapterAverage}%` : "Not started yet"}.`,
            scoreLabel: "No score yet",
            masteryLabel: masterySummary(chapterResults),
            attemptsLabel: `${courseDone}/${selectedChapter.lessons.length} lessons completed`,
            nextActionLabel: "Start any lesson, or use the list to jump around and practice freely.",
          },
      nextLessonId: this.getNextLessonId(),
      hud: {
        grade: selectedGrade.label,
        chapter: selectedChapter.title,
        mastery: chapterAverage ? `${masteryBandFromScore(chapterAverage)} (${chapterAverage}%)` : "Not started",
        score: activeReport ? `${activeReport.score}` : "--",
        courseProgress: `${courseDone}/${selectedChapter.lessons.length} complete`,
      },
      guide,
    };
  }

  private advanceAfterCorrectAnswer(lesson: Lesson, runtime: ActiveLessonRuntime): void {
    if (lesson.activity.kind === "composite") {
      const nextRoundIndex = runtime.compositeRoundIndex + 1;

      if (nextRoundIndex < lesson.activity.rounds.length) {
        runtime.compositeRoundIndex = nextRoundIndex;
        runtime.equationStageIndex = 0;
        runtime.feedback = this.getInitialFeedback(lesson.activity.rounds[nextRoundIndex]);
        return;
      }
    }

    this.completeLesson(lesson);
  }

  private completeLesson(lesson: Lesson): void {
    const runtime = this.runtime;

    if (!runtime) {
      return;
    }

    const scoreFloor = lesson.category === "boss" ? 50 : 40;
    const score = Math.max(scoreFloor, 100 - runtime.incorrectAttempts * 10 - runtime.hintsUsed * 5);
    const band = masteryBandFromScore(score);
    const bossSuffix = lesson.category === "boss" && score >= 75 ? " Boss clear recorded." : "";
    const result: LessonResult = {
      lessonId: lesson.id,
      score,
      band,
      wrongAttempts: runtime.incorrectAttempts,
      hintsUsed: runtime.hintsUsed,
      summary: `${lesson.title} finished in the ${band} band.${bossSuffix}`,
    };
    const existing = this.results.get(lesson.id);
    const storedResult = existing && existing.score > result.score ? existing : result;

    runtime.completed = true;
    runtime.report = storedResult;
    runtime.feedback = lesson.activity.kind === "composite"
      ? lesson.activity.explanation
      : this.getSuccessExplanation(this.getInitialPlayableActivity(lesson.activity));
    this.results.set(lesson.id, storedResult);
  }

  private get selectedGrade(): Grade {
    return this.curriculum.find((grade) => grade.id === this.selectedGradeId) ?? this.curriculum[0];
  }

  private get selectedChapter(): Chapter {
    return this.selectedGrade.chapters.find((chapter) => chapter.id === this.selectedChapterId) ?? this.selectedGrade.chapters[0];
  }

  private get activeLesson(): Lesson | null {
    return this.activeLessonId ? this.findLessonLocation(this.activeLessonId)?.lesson ?? null : null;
  }

  private getInitialPlayableActivity(activity: LessonActivity): PlayableActivity {
    if (activity.kind === "composite") {
      return activity.rounds[0];
    }

    return activity;
  }

  private getCurrentActivity(lesson: Lesson, runtime: ActiveLessonRuntime): PlayableActivity {
    if (lesson.activity.kind === "composite") {
      return lesson.activity.rounds[Math.min(runtime.compositeRoundIndex, lesson.activity.rounds.length - 1)];
    }

    return lesson.activity;
  }

  private hasLesson(lessonId: string): boolean {
    return this.curriculum.some((grade) => grade.chapters.some((chapter) => chapter.lessons.some((lesson) => lesson.id === lessonId)));
  }

  private findChapterLocation(chapterId: string): { grade: Grade; chapter: Chapter; chapterIndex: number } | null {
    for (const grade of this.curriculum) {
      const chapterIndex = grade.chapters.findIndex((chapter) => chapter.id === chapterId);
      if (chapterIndex !== -1) {
        return {
          grade,
          chapter: grade.chapters[chapterIndex],
          chapterIndex,
        };
      }
    }

    return null;
  }

  private findLessonLocation(lessonId: string): LessonLocation | null {
    for (let gradeIndex = 0; gradeIndex < this.curriculum.length; gradeIndex += 1) {
      const grade = this.curriculum[gradeIndex];

      for (let chapterIndex = 0; chapterIndex < grade.chapters.length; chapterIndex += 1) {
        const chapter = grade.chapters[chapterIndex];
        const lessonIndex = chapter.lessons.findIndex((lesson) => lesson.id === lessonId);

        if (lessonIndex !== -1) {
          return {
            grade,
            gradeIndex,
            chapter,
            chapterIndex,
            lesson: chapter.lessons[lessonIndex],
            lessonIndex,
          };
        }
      }
    }

    return null;
  }

  private isChapterPassed(chapter: Chapter): boolean {
    let finalBossIndex = -1;
    for (let index = chapter.lessons.length - 1; index >= 0; index -= 1) {
      if (chapter.lessons[index].category === "boss") {
        finalBossIndex = index;
        break;
      }
    }

    const finalBoss = finalBossIndex >= 0 ? chapter.lessons[finalBossIndex] : undefined;
    const finalBossResult = finalBoss ? this.results.get(finalBoss.id) : undefined;
    const requiredLessonsComplete = finalBossIndex >= 0
      ? chapter.lessons.slice(0, finalBossIndex).every((lesson) => this.results.has(lesson.id))
      : chapter.lessons.every((lesson) => this.results.has(lesson.id));

    return Boolean(requiredLessonsComplete && finalBossResult && finalBossResult.score >= 75);
  }

  private isSelectedChapterComplete(chapter: Chapter): boolean {
    return chapter.lessons.every((lesson) => this.results.has(lesson.id));
  }

  private getChapterStatusLabel(chapter: Chapter): string {
    if (this.isChapterPassed(chapter)) {
      return "Chapter clear";
    }

    const completed = chapter.lessons.filter((lesson) => this.results.has(lesson.id)).length;
    return completed > 0 ? `${completed}/${chapter.lessons.length} lessons complete` : "Open to try";
  }

  private getNextLessonId(): string | null {
    const lessons = this.selectedChapter.lessons;

    if (!this.activeLessonId) {
      const firstUnfinished = lessons.find((lesson) => !this.results.has(lesson.id));
      return firstUnfinished?.id ?? lessons[0]?.id ?? null;
    }

    const currentIndex = lessons.findIndex((lesson) => lesson.id === this.activeLessonId);

    const nextUnfinished = lessons.slice(currentIndex + 1).find((lesson) => !this.results.has(lesson.id));
    if (nextUnfinished) {
      return nextUnfinished.id;
    }

    const earlierUnfinished = lessons.slice(0, Math.max(currentIndex, 0)).find((lesson) => !this.results.has(lesson.id));
    if (earlierUnfinished) {
      return earlierUnfinished.id;
    }

    return null;
  }

  private getInitialFeedback(activity: PlayableActivity): string {
    if (activity.kind === "equation-balance") {
      return activity.stages[0]?.prompt ?? activity.prompt;
    }

    return activity.prompt;
  }

  private getHint(activity: PlayableActivity, equationStageIndex: number): string {
    if (activity.kind === "equation-balance") {
      return activity.stages[equationStageIndex]?.hint ?? activity.finalPrompt;
    }

    return activity.hint;
  }

  private getSafeFormulaLabel(activity: PlayableActivity): string {
    if (activity.kind === "equation-balance") {
      return activity.formula;
    }

    if (activity.formula.includes("=")) {
      return activity.kind === "multiple-choice"
        ? "Skill focus: reason from the prompt and compare choices"
        : "Skill focus: solve from the prompt, then type the result";
    }

    return `Skill focus: ${activity.formula}`;
  }

  private getAcceptedAnswers(activity: PlayableActivity): string[] {
    if (activity.kind === "multiple-choice") {
      return [];
    }

    return activity.acceptedAnswers.map((answer) => normalize(answer));
  }

  private getSuccessExplanation(activity: PlayableActivity): string {
    return activity.explanation;
  }

  private getActivePrompt(activity: PlayableActivity, equationStageIndex: number): string {
    if (activity.kind === "equation-balance") {
      const stage = activity.stages[equationStageIndex] ?? activity.stages[activity.stages.length - 1];
      return stage.options.length > 0 ? stage.prompt : activity.finalPrompt;
    }

    return activity.prompt;
  }

  private getActivePlaceholder(activity: PlayableActivity, equationStageIndex: number): string | undefined {
    if (activity.kind === "equation-balance") {
      const stage = activity.stages[equationStageIndex] ?? activity.stages[activity.stages.length - 1];
      return stage.options.length === 0 ? activity.placeholder : undefined;
    }

    if (activity.kind === "input") {
      return activity.placeholder;
    }

    return undefined;
  }

  private getStepLabel(activity: PlayableActivity, equationStageIndex: number): string {
    if (activity.kind === "equation-balance") {
      const stage = activity.stages[equationStageIndex] ?? activity.stages[activity.stages.length - 1];
      const currentStep = Math.min(equationStageIndex + 1, activity.stages.length);
      return stage.options.length > 0
        ? `Step ${currentStep} of ${Math.max(activity.stages.length - 1, 1)}`
        : "Final answer";
    }

    return activity.kind === "multiple-choice" ? "Choose one answer" : "Type the answer";
  }

  private getRoundLabel(lesson: Lesson, runtime: ActiveLessonRuntime): string {
    if (lesson.activity.kind !== "composite") {
      return categoryLabel(lesson.category);
    }

    return `Round ${runtime.compositeRoundIndex + 1} of ${lesson.activity.rounds.length}`;
  }

  private getGuide(
    activeLesson: Lesson | null,
    runtime: ActiveLessonRuntime | null,
    currentActivity: PlayableActivity | null,
  ): SessionViewModel["guide"] {
    if (!this.hasPickedGrade) {
      return {
        stepLabel: "Step 1 of 5",
        title: "Choose a Grade",
        body: "Start by clicking Grade 6, 7, 8, or 9. The selected grade expands while the others stay minimized.",
        area: "grades",
      };
    }

    if (!this.hasPickedChapter) {
      return {
        stepLabel: "Step 2 of 5",
        title: "Choose a Chapter",
        body: "Pick any chapter you want to study in the selected grade. All chapters are open for practice.",
        area: "chapters",
      };
    }

    if (!activeLesson || !runtime || !currentActivity) {
      return {
        stepLabel: "Step 3 of 5",
        title: "Choose a Lesson Node",
        body: "Use the learning tree: open a chapter branch, then select any lesson node to begin.",
        area: "lessons",
      };
    }

    if (runtime.completed) {
      return {
        stepLabel: "Step 5 of 5",
        title: "Review the Result",
        body: this.getNextLessonId()
          ? "Check your report card, then use Next Lesson or choose any other lesson."
          : "Read the report card. You can replay lessons or jump to another chapter anytime.",
        area: "report",
      };
    }

    const needsDeskInput = Boolean(this.getActivePlaceholder(currentActivity, runtime.equationStageIndex));

    if (currentActivity.kind === "equation-balance" && !needsDeskInput) {
      return {
        stepLabel: "Step 4 of 5",
        title: "Use the Puzzle Board",
        body: "Click the highlighted move cards inside the game board to keep the equation balanced.",
        area: "play",
      };
    }

    return {
      stepLabel: "Step 4 of 5",
      title: "Answer in the Lesson Desk",
      body: currentActivity.kind === "multiple-choice"
        ? "Choose the best answer in the lesson desk."
        : "Type the answer in the lesson desk, then submit it.",
      area: "activity",
    };
  }
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/×/g, "x")
    .replace(/−/g, "-");
}

function averageScore(results: LessonResult[]): number | null {
  if (results.length === 0) {
    return null;
  }

  const total = results.reduce((sum, result) => sum + result.score, 0);
  return Math.round(total / results.length);
}

function completionLabel(done: number, total: number): string {
  return `${done}/${total} lessons completed`;
}

function lessonStatusLabel(result: LessonResult | undefined): string {
  if (!result) {
    return "Not started";
  }

  return `${result.band} • ${result.score}`;
}

function masteryBandFromScore(score: number): MasteryBand {
  if (score >= 90) {
    return "Mastery";
  }

  if (score >= 75) {
    return "Proficient";
  }

  if (score >= 60) {
    return "Developing";
  }

  return "Review";
}

function masterySummary(results: LessonResult[]): string {
  const score = averageScore(results);

  if (!score) {
    return "Course not started";
  }

  return `${masteryBandFromScore(score)} • ${score}% average`;
}

function categoryLabel(category: LessonCategory): string {
  switch (category) {
    case "guided":
      return "Guided";
    case "mastery":
      return "Mastery";
    case "boss":
      return "Boss";
    default:
      return "Practice";
  }
}
