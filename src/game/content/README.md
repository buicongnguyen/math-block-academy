# Course Content

`course-content.json` is the generated problem and lesson content asset for Math Block Academy.

`problem-bank.json` stores the chapter-level variation settings used by
`scripts/regenerate-content.mjs`.

Use this folder for curriculum data:

- grades
- chapters
- formula focus
- lesson prompts
- block-board states
- choices
- accepted typed answers
- hints and explanations

Run these commands after changing the problem bank:

```bash
npm run generate:content
npm run validate:content
```

The generator keeps lesson IDs stable for saved progress while replacing repeated
formula examples with deterministic variants. Later-stage lessons also receive
tricky 2-4 step challenges. The validator checks IDs, answer references,
equation stages, tricky-question answer verification, and chapter-level formula
repetition.

Keep engine and UI logic out of this folder. Phaser rendering, scoring, progression, and save logic should continue to live under `src/game/scenes`, `src/game/systems`, and `src/game/ui`.
