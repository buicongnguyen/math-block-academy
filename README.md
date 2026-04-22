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

## Refresh the game assets

The board art and token SVGs are generated into `public/assets/game-art/`.

```bash
npm run generate:assets
```

## Refresh the lesson questions

The course uses `src/game/content/problem-bank.json` plus a generator to reduce
repeated formulas and repeated answer patterns.

```bash
npm run generate:content
npm run validate:content
```

The validator fails if a chapter has too few unique formulas or if one formula
appears too often in the same chapter. It also checks that generated tricky
questions have 2-4 thinking steps and that their computed answers match the
stored correct answer.

## Preview the webpage build

```bash
npm run build
npm run preview:local
```

Then open `http://127.0.0.1:4173`.

To test from a phone on the same Wi-Fi network:

```bash
npm run build
npm run preview:phone
```

Then open `http://YOUR_COMPUTER_IP:4173` on the phone.

## Deploy on GitHub Pages

This project includes a GitHub Actions workflow in `.github/workflows/pages.yml`.
After pushing to GitHub, open the repository settings, choose **Pages**, and set the
source to **GitHub Actions**. Each push to `main` will build and publish `dist/`.

For a project repository, the published webpage usually follows this pattern:

```text
https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY_NAME/
```

Push command after creating an empty GitHub repository and setting `origin`:

```bash
git push -u origin main
```

## Project layout

- `docs/` design documents
- `public/assets/game-art/` generated SVG game assets
- `src/game/content/` JSON course content and problem data
- `src/game/data/` curriculum TypeScript types and content loader
- `src/game/scenes/` Phaser rendering
- `src/game/systems/` gameplay state and grading
- `src/game/ui/` DOM HUD and menus
