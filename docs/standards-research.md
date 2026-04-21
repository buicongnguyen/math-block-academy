# Standards Research Notes

## What I Used

To expand the game, I used the official Common Core math standards as a coverage baseline rather than a single publisher program. That choice keeps the game broad and easier to adapt.

Primary sources:

- [Common Core Mathematics Standards PDF](https://www.thecorestandards.org/wp-content/uploads/Math_Standards.pdf)
- [High School Algebra Introduction](https://www.thecorestandards.org/Math/Content/HSA/introduction/)

## Key Findings

### Grade 6

The Grade 6 overview includes:

- Ratios and Proportional Relationships
- The Number System
- Expressions and Equations
- Geometry
- Statistics and Probability

That is why the game now includes chapters for ratios, fractions and decimals, integers and coordinates, equations, geometry, and statistics.

### Grade 7

The Grade 7 introduction emphasizes:

- proportional relationships
- operations with rational numbers
- expressions and linear equations
- scale drawings and geometry
- probability and sampling

That is why the Grade 7 map now adds percent, rational numbers, equations and inequalities, scale geometry, circle and volume work, and probability.

### Grade 8

The Grade 8 introduction emphasizes:

- expressions and equations
- linear equations and systems
- functions
- geometry
- bivariate data

That is why the Grade 8 map now includes real numbers and exponents, linear equations, systems, functions, transformations and similarity, Pythagorean work, and bivariate data.

### Grade 9 / Algebra I Bridge

The official high-school algebra overview names:

- Seeing Structure in Expressions
- Arithmetic with Polynomials and Rational Functions
- Creating Equations
- Reasoning with Equations and Inequalities

The high-school functions overview connected from the same standards structure also supports function interpretation, building functions, and linear or quadratic models. That is why Grade 9 in the game is now an Algebra I style bridge with chapters for expressions, equations, graphing, systems, polynomials, quadratics, and modeling.

## How The Findings Changed The Game

Before this expansion, the prototype had a smaller chapter set. After the standards review, the game structure was expanded to:

- `Grade 6`: 6 chapters
- `Grade 7`: 6 chapters
- `Grade 8`: 7 chapters
- `Grade 9`: 7 chapters

Every chapter now includes a full playable course sequence generated from seed lesson types:

- one block-move equation lesson
- one multiple-choice lesson
- one write-answer lesson
- guided workshops
- focused practice drills
- mixed practice sets
- fluency sprints
- checkpoints and mastery challenges
- review relays
- boss exams

The current course data is stored as a JSON content asset at `src/game/content/course-content.json`, while TypeScript game logic reads it through `src/game/data/curriculum.ts`.

## Important Note

This is a `coverage baseline`, not a claim that every state or school uses the exact same sequence. I used the official standards as the safest broad map so the game can cover as much middle-school math as possible while staying organized.
