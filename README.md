# Math Block Academy

A Phaser + TypeScript + Vite prototype for a middle-school math adventure that spans Grades 6 through 9.

## What is included

- A full curriculum-facing game design document in `docs/math-block-academy-gdd.md`
- Standards research notes in `docs/standards-research.md`
- A browser-playable vertical slice with:
  - Grade selection
  - Chapter map
  - Full-course lessons for every chapter
  - Generated guided workshops, practice drills, checkpoints, review relays, and boss exams for every chapter
  - Block-style equation puzzles in Phaser
  - Multiple-choice and typed-answer lesson modes
  - Local progress saving in browser storage
  - Scoring, mastery bands, and report cards

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL that Vite prints, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

## Deploy on GitHub Pages

This project includes a GitHub Actions workflow in `.github/workflows/pages.yml`.
After pushing to GitHub, open the repository settings, choose **Pages**, and set the
source to **GitHub Actions**. Each push to `main` will build and publish `dist/`.

## Project layout

- `docs/` design documents
- `src/game/content/` JSON course content and problem data
- `src/game/data/` curriculum TypeScript types and content loader
- `src/game/scenes/` Phaser rendering
- `src/game/systems/` gameplay state and grading
- `src/game/ui/` DOM HUD and menus
