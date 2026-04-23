import fs from "node:fs";
import path from "node:path";

const contentPath = path.join(process.cwd(), "src/game/content/course-content.json");
const curriculum = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const errors = [];
const seenIds = new Set();
const validCategories = new Set(["guided", "practice", "mastery", "quiz", "boss"]);
const stats = {
  grades: curriculum.length,
  chapters: 0,
  lessons: 0,
  activities: 0,
  quizzes: 0,
  trickyActivities: 0,
};

function mark(id, label) {
  if (!id || typeof id !== "string") {
    errors.push(`${label} has a missing id.`);
    return;
  }

  if (seenIds.has(id)) {
    errors.push(`Duplicate id: ${id}`);
  }

  seenIds.add(id);
}

function normalize(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeVisible(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function gcd(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left || 1;
}

function simplifyFraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

function collectActivities(lesson) {
  if (lesson.activity.kind === "composite") {
    return lesson.activity.rounds;
  }

  return [lesson.activity];
}

function validateActivity(activity, location) {
  stats.activities += 1;
  validateTrickyChallenge(activity, location);

  if (!activity.formula) errors.push(`${location} missing formula.`);
  if (!activity.prompt) errors.push(`${location} missing prompt.`);
  if (!activity.explanation) errors.push(`${location} missing explanation.`);

  if (activity.kind === "multiple-choice") {
    const choiceIds = new Set((activity.choices ?? []).map((choice) => choice.id));
    const choiceLabels = (activity.choices ?? []).map((choice) => normalizeVisible(choice.label));
    const duplicateLabels = choiceLabels.filter((label, index) => choiceLabels.indexOf(label) !== index);
    if ((activity.choices ?? []).length < 3) errors.push(`${location} needs at least 3 choices.`);
    if (!choiceIds.has(activity.correctChoiceId)) errors.push(`${location} correctChoiceId is missing from choices.`);
    if (duplicateLabels.length > 0) errors.push(`${location} has duplicate visible choice labels.`);
    if (!activity.hint) errors.push(`${location} missing hint.`);
    return;
  }

  if (activity.kind === "input") {
    if (!Array.isArray(activity.acceptedAnswers) || activity.acceptedAnswers.length === 0) {
      errors.push(`${location} needs acceptedAnswers.`);
    }
    validateAcceptedAnswers(activity, location);
    if (!activity.hint) errors.push(`${location} missing hint.`);
    return;
  }

  if (activity.kind === "equation-balance") {
    if (!Array.isArray(activity.acceptedAnswers) || activity.acceptedAnswers.length === 0) {
      errors.push(`${location} needs acceptedAnswers.`);
    }
    validateAcceptedAnswers(activity, location);
    if (!Array.isArray(activity.stages) || activity.stages.length < 2) {
      errors.push(`${location} needs at least 2 equation stages.`);
    }
    activity.stages?.forEach((stage, stageIndex) => {
      const stageLabel = `${location} stage ${stageIndex + 1}`;
      if (!stage.board) errors.push(`${stageLabel} missing board.`);
      if (!stage.hint) errors.push(`${stageLabel} missing hint.`);
      if (!Array.isArray(stage.options)) errors.push(`${stageLabel} missing options.`);
      if (stage.correctOptionId && !stage.options.some((option) => option.id === stage.correctOptionId)) {
        errors.push(`${stageLabel} correctOptionId is missing from options.`);
      }
    });
    return;
  }

  errors.push(`${location} has unknown activity kind ${activity.kind}.`);
}

function validateAcceptedAnswers(activity, location) {
  const answers = activity.acceptedAnswers ?? [];
  const trimmedAnswers = answers.map((answer) => String(answer).trim());
  const duplicateAnswers = trimmedAnswers.filter((answer, index) => trimmedAnswers.indexOf(answer) !== index);
  if (duplicateAnswers.length > 0) {
    errors.push(`${location} has duplicate accepted answers.`);
  }

  const fractionMatch = activity.formula.match(/=\s*(-?\d+)\/(\d+)$/);
  if (!fractionMatch) {
    return;
  }

  const numerator = Number(fractionMatch[1]);
  const denominator = Number(fractionMatch[2]);
  const simplified = simplifyFraction(numerator, denominator);
  if (simplified !== `${numerator}/${denominator}` && !trimmedAnswers.includes(simplified)) {
    errors.push(`${location} accepts ${numerator}/${denominator} but not simplified answer ${simplified}.`);
  }
}

function validateTrickyChallenge(activity, location) {
  if (activity.difficulty !== "tricky") {
    return;
  }

  stats.trickyActivities += 1;

  if (!Array.isArray(activity.thinkingSteps) || activity.thinkingSteps.length < 2 || activity.thinkingSteps.length > 4) {
    errors.push(`${location} tricky challenge must have 2 to 4 thinking steps.`);
  }

  const verification = activity.verification;
  if (!verification || verification.kind !== "numeric-expression") {
    errors.push(`${location} tricky challenge is missing numeric verification.`);
    return;
  }

  const computedValue = evaluateNumericExpression(verification.expression, location);
  if (computedValue === null) {
    return;
  }

  const expectedValue = Number(verification.expected);
  if (!Number.isFinite(expectedValue) || Math.abs(computedValue - expectedValue) > 1e-9) {
    errors.push(`${location} verification mismatch: ${verification.expression} = ${computedValue}, expected ${verification.expected}.`);
  }

  if (activity.kind === "multiple-choice") {
    const correctChoice = activity.choices?.find((entry) => entry.id === activity.correctChoiceId);
    if (!correctChoice || Number(correctChoice.label) !== expectedValue) {
      errors.push(`${location} tricky multiple-choice correct label does not match verified answer ${verification.expected}.`);
    }
  }

  if (activity.kind === "input" && !(activity.acceptedAnswers ?? []).map(String).includes(String(verification.expected))) {
    errors.push(`${location} tricky input does not accept verified answer ${verification.expected}.`);
  }
}

function validateQuizLesson(lesson, location) {
  if (lesson.activity.kind !== "composite") {
    errors.push(`${location} quiz must be a composite selection game.`);
    return;
  }

  const rounds = lesson.activity.rounds ?? [];
  if (rounds.length < 4) {
    errors.push(`${location} quiz needs at least 4 selection rounds.`);
  }

  rounds.forEach((round, index) => {
    if (round.kind !== "multiple-choice") {
      errors.push(`${location} quiz round ${index + 1} must be multiple-choice.`);
    }
  });
}

function evaluateNumericExpression(expression, location) {
  if (!/^[\d+\-*/().\s]+$/.test(expression)) {
    errors.push(`${location} verification expression has unsupported characters.`);
    return null;
  }

  try {
    const value = Function(`"use strict"; return (${expression});`)();
    if (!Number.isFinite(value)) {
      errors.push(`${location} verification expression did not produce a finite number.`);
      return null;
    }

    return value;
  } catch {
    errors.push(`${location} verification expression could not be evaluated.`);
    return null;
  }
}

for (const grade of curriculum) {
  mark(grade.id, "grade");
  for (const chapter of grade.chapters ?? []) {
    stats.chapters += 1;
    mark(chapter.id, "chapter");

    const formulas = [];
    let chapterTrickyActivities = 0;
    let chapterQuizLessons = 0;
    for (const lesson of chapter.lessons ?? []) {
      stats.lessons += 1;
      mark(lesson.id, "lesson");

      if (!validCategories.has(lesson.category)) {
        errors.push(`${lesson.id} has unknown lesson category ${lesson.category}.`);
      }

      if (lesson.category === "quiz") {
        stats.quizzes += 1;
        chapterQuizLessons += 1;
        validateQuizLesson(lesson, lesson.id);
      }

      const activities = collectActivities(lesson);
      activities.forEach((activity, index) => {
        formulas.push(normalize(activity.formula));
        if (activity.difficulty === "tricky") {
          chapterTrickyActivities += 1;
        }
        validateActivity(activity, `${lesson.id}${activities.length > 1 ? ` round ${index + 1}` : ""}`);
      });
    }

    const formulaCounts = new Map();
    formulas.forEach((formula) => formulaCounts.set(formula, (formulaCounts.get(formula) ?? 0) + 1));
    const uniqueFormulaCount = formulaCounts.size;
    const maxFormulaCount = Math.max(...formulaCounts.values());
    const maxShare = maxFormulaCount / Math.max(formulas.length, 1);

    if (uniqueFormulaCount < 10) {
      errors.push(`${chapter.id} only has ${uniqueFormulaCount} unique formulas; expected at least 10.`);
    }

    if (maxShare > 0.25) {
      errors.push(`${chapter.id} repeats one formula ${maxFormulaCount}/${formulas.length} times; max allowed is 25%.`);
    }

    if (chapterTrickyActivities < 4) {
      errors.push(`${chapter.id} only has ${chapterTrickyActivities} tricky activities; expected at least 4.`);
    }

    if (chapterQuizLessons < 1) {
      errors.push(`${chapter.id} does not include a chapter quiz.`);
    }
  }
}

if (errors.length > 0) {
  console.error(JSON.stringify({ ...stats, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ...stats, errors }, null, 2));
