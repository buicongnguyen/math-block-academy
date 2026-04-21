import fs from "node:fs";
import path from "node:path";
import problemBank from "../src/game/content/problem-bank.json" with { type: "json" };
import { applyProblemVariants } from "./problem-variants.mjs";

const contentPath = path.join(process.cwd(), "src/game/content/course-content.json");
const curriculum = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const updated = applyProblemVariants(curriculum, problemBank);

fs.writeFileSync(contentPath, `${JSON.stringify(updated, null, 2)}\n`);

const totals = updated.reduce(
  (acc, grade) => {
    acc.grades += 1;
    acc.chapters += grade.chapters.length;
    acc.lessons += grade.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
    return acc;
  },
  { grades: 0, chapters: 0, lessons: 0 },
);

console.log(`Generated varied curriculum: ${totals.grades} grades, ${totals.chapters} chapters, ${totals.lessons} lessons.`);
