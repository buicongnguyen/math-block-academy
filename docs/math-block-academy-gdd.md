# Math Block Academy

## Vision

`Math Block Academy` is a browser game for Grades 6 through 9 where students learn math by moving operation blocks, choosing correct strategies, and typing final answers. The design goal is to make math feel physical and readable:

- `Block Move`: inverse-operation blocks act on both sides of an equation
- `Multiple Choice`: pick the correct result, formula, graph idea, or strategy
- `Write Answer`: type a number, inequality, formula, or simplified expression

## Standards Direction

This expansion uses official Common Core math domain coverage as the backbone for chapter planning, then converts each domain into game-friendly chapters. That means the game is no longer just an algebra starter. It now covers:

- ratios and proportional reasoning
- number systems and rational numbers
- expressions, equations, and inequalities
- geometry and measurement
- statistics and probability
- functions, systems, and Algebra I bridge topics

Research notes are in [standards-research.md](C:\Users\n\Documents\Codex\2026-04-20-game-studio-plugin-game-studio-openai-2\docs\standards-research.md).

## Grade Coverage

### Grade 6

- Ratios and Rates
- Fractions and Decimals
- Integers and Coordinate Plane
- Expressions and Equations
- Geometry: Area, Surface Area, and Volume
- Statistics and Data Stories

### Grade 7

- Proportional Relationships and Percent
- Rational Number Operations
- Expressions, Equations, and Inequalities
- Scale Drawings and Geometry Construction
- Circles, Angles, Surface Area, and Volume
- Probability and Sampling

### Grade 8

- Real Numbers and Exponents
- Linear Equations
- Systems of Equations
- Functions and Graphs
- Transformations, Congruence, and Similarity
- Pythagorean Theorem and Volume
- Statistics and Bivariate Data

### Grade 9

- Structure of Expressions
- Linear Equations and Inequalities
- Functions and Graphing
- Systems and Modeling
- Polynomials and Exponents
- Quadratics
- Algebraic Modeling and Data

## Level Design Model

Every chapter follows a full-course production structure:

- guided lessons
- practice lessons
- mastery lessons
- boss lessons

The current build now ships full playable course sequences:

- seed lessons for block move, multiple choice, and typed answers
- generated guided workshops and extra drills
- mixed practice sets and fluency sprints
- checkpoints and mastery challenges
- review relays that chain multiple lesson types together
- boss exams that unlock after the earlier chapter lessons are cleared

Planned production counts:

- Grades 6-7 chapters: `15 planned levels` each
- Grades 8-9 chapters: `16 planned levels` each

## Core Loop

1. Choose a grade.
2. Choose a chapter.
3. Start a course lesson.
4. Solve a block puzzle, answer a check, or type a response.
5. Earn a score and mastery band.
6. Read the report card.
7. Continue to the next course lesson.

## Screen Plan

### Grade Rail

- grade cards
- skill tags
- progress summaries

### Chapter Rail

- chapter titles
- standards-aligned domain themes
- formula focus tags
- planned level counts

### Phaser Playfield

- animated balance board
- equation blocks
- clickable operation cards
- formula prompt overlay

### Lesson Desk

- current objective
- typed answer box
- multiple-choice buttons
- hint button

### Report Card

- score
- mastery band
- wrong-attempt count
- hint count
- next lesson button

## Technical Structure

### Stack

- `Phaser`
- `TypeScript`
- `Vite`
- DOM overlays for menus and lesson UI

### Data-First Curriculum

The game now uses a standards-shaped data catalog stored in `src/game/content/course-content.json`:

- grades own chapters
- chapters own full lesson sequences
- lessons store block-board states, choices, typed answers, hints, and explanations as JSON data
- each chapter has formula focus and level planning metadata
- the same gameplay shell can support many more chapters without changing scene logic

## What The Prototype Now Delivers

- `4 grades`
- `26 chapters`
- `404 playable lessons`
- problem and lesson content moved into a JSON content asset
- standards-shaped curriculum coverage from Grade 6 math through an Algebra I style Grade 9 bridge
- local save progress in browser storage
- open exploration mode so students can try any chapter or lesson
- report cards and mastery tracking for every course lesson

## Next Production Steps

1. Add save data and student profiles.
2. Add more fresh numeric variants inside each generated practice set.
3. Add adaptive review paths when students miss the same concept repeatedly.
4. Add teacher-facing progress summaries.
5. Add classroom assignment and pacing tools.
