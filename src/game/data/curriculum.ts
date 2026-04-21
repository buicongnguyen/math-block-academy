import courseContent from "../content/course-content.json";

export type GradeId = "grade-6" | "grade-7" | "grade-8" | "grade-9";
export type Tone = "variable" | "constant" | "formula" | "neutral";

export interface TermToken {
  label: string;
  tone: Tone;
}

export interface BoardState {
  left: TermToken[];
  relation: string;
  right: TermToken[];
}

export interface EquationOption {
  id: string;
  label: string;
  summary: string;
}

export interface EquationStage {
  prompt: string;
  board: BoardState;
  options: EquationOption[];
  correctOptionId?: string;
  hint: string;
  feedback: string;
}

export interface EquationActivity {
  kind: "equation-balance";
  prompt: string;
  formula: string;
  stages: EquationStage[];
  finalPrompt: string;
  acceptedAnswers: string[];
  placeholder: string;
  explanation: string;
}

export interface ChoiceActivity {
  kind: "multiple-choice";
  prompt: string;
  formula: string;
  choices: Array<{
    id: string;
    label: string;
  }>;
  correctChoiceId: string;
  explanation: string;
  hint: string;
}

export interface InputActivity {
  kind: "input";
  prompt: string;
  formula: string;
  acceptedAnswers: string[];
  placeholder: string;
  explanation: string;
  hint: string;
}

export type SimpleActivity = EquationActivity | ChoiceActivity | InputActivity;

export interface CompositeActivity {
  kind: "composite";
  prompt: string;
  formula: string;
  rounds: SimpleActivity[];
  explanation: string;
}

export type LessonActivity = SimpleActivity | CompositeActivity;
export type LessonCategory = "guided" | "practice" | "mastery" | "boss";

export interface Lesson {
  id: string;
  title: string;
  objective: string;
  modeLabel: string;
  estimatedMinutes: number;
  category: LessonCategory;
  activity: LessonActivity;
}

export interface LevelPlan {
  guided: number;
  practice: number;
  mastery: number;
  boss: number;
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  theme: string;
  formulaFocus: string[];
  levelPlan: LevelPlan;
  lessons: Lesson[];
}

export interface Grade {
  id: GradeId;
  label: string;
  banner: string;
  summary: string;
  targetSkills: string[];
  chapters: Chapter[];
}

export function createCurriculum(): Grade[] {
  return cloneContent(courseContent as unknown as Grade[]);
}

function cloneContent<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
