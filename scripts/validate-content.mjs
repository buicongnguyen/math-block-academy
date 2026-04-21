import fs from "node:fs";
import path from "node:path";

const contentPath = path.join(process.cwd(), "src/game/content/course-content.json");
const curriculum = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const errors = [];
const seenIds = new Set();
const stats = {
  grades: curriculum.length,
  chapters: 0,
  lessons: 0,
  activities: 0,
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

function collectActivities(lesson) {
  if (lesson.activity.kind === "composite") {
    return lesson.activity.rounds;
  }

  return [lesson.activity];
}

function validateActivity(activity, location) {
  stats.activities += 1;

  if (!activity.formula) errors.push(`${location} missing formula.`);
  if (!activity.prompt) errors.push(`${location} missing prompt.`);
  if (!activity.explanation) errors.push(`${location} missing explanation.`);

  if (activity.kind === "multiple-choice") {
    const choiceIds = new Set((activity.choices ?? []).map((choice) => choice.id));
    if ((activity.choices ?? []).length < 3) errors.push(`${location} needs at least 3 choices.`);
    if (!choiceIds.has(activity.correctChoiceId)) errors.push(`${location} correctChoiceId is missing from choices.`);
    if (!activity.hint) errors.push(`${location} missing hint.`);
    return;
  }

  if (activity.kind === "input") {
    if (!Array.isArray(activity.acceptedAnswers) || activity.acceptedAnswers.length === 0) {
      errors.push(`${location} needs acceptedAnswers.`);
    }
    if (!activity.hint) errors.push(`${location} missing hint.`);
    return;
  }

  if (activity.kind === "equation-balance") {
    if (!Array.isArray(activity.acceptedAnswers) || activity.acceptedAnswers.length === 0) {
      errors.push(`${location} needs acceptedAnswers.`);
    }
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

for (const grade of curriculum) {
  mark(grade.id, "grade");
  for (const chapter of grade.chapters ?? []) {
    stats.chapters += 1;
    mark(chapter.id, "chapter");

    const formulas = [];
    for (const lesson of chapter.lessons ?? []) {
      stats.lessons += 1;
      mark(lesson.id, "lesson");

      const activities = collectActivities(lesson);
      activities.forEach((activity, index) => {
        formulas.push(normalize(activity.formula));
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
  }
}

if (errors.length > 0) {
  console.error(JSON.stringify({ ...stats, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ...stats, errors }, null, 2));
