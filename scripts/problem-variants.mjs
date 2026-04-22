const choice = (id, label) => ({ id, label: String(label) });

const mod = (seed, length) => ((seed % length) + length) % length;

const unique = (values) => [...new Set(values.map(String))];

const normalizeLabel = (value) => String(value).trim().toLowerCase().replace(/\s+/g, " ");

const gcd = (a, b) => {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left || 1;
};

const simplify = (numerator, denominator) => {
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
};

const formatSigned = (value) => (value >= 0 ? `+ ${value}` : `- ${Math.abs(value)}`);

const acceptedNumber = (value, variable) => [String(value), `${variable}=${value}`, `${variable} = ${value}`];

const withPrefix = (prefix, text) => (prefix ? `${prefix}: ${text}` : text);

export function applyProblemVariants(curriculum, problemBank) {
  for (const grade of curriculum) {
    for (const chapter of grade.chapters) {
      const bank = problemBank[chapter.id];
      if (!bank) {
        continue;
      }

      let serial = 0;
      for (const lesson of chapter.lessons) {
        lesson.activity = rebuildActivity(lesson.activity, bank, chapter, lesson, () => serial++);
      }

      const uniqueFormulas = collectActivities(chapter)
        .map((activity) => activity.formula)
        .filter(Boolean);
      chapter.formulaFocus = [...new Set(uniqueFormulas)].slice(0, 6);
    }
  }

  return curriculum;
}

function rebuildActivity(activity, bank, chapter, lesson, nextSerial) {
  if (activity.kind !== "composite") {
    return makeActivity(activity.kind, bank, chapter, lesson, nextSerial(), lesson.title);
  }

  const rounds = activity.rounds.map((round, roundIndex) =>
    makeActivity(round.kind, bank, chapter, lesson, nextSerial(), `${lesson.title} Round ${roundIndex + 1}`),
  );

  return {
    ...activity,
    prompt: `${lesson.title}: solve a mixed set of fresh ${bank.label} problems.`,
    formula: rounds.map((round) => round.formula).join(" • "),
    rounds,
    explanation: `Great work. This mixed lesson used varied ${bank.label} problems instead of repeating the same examples.`,
  };
}

function makeActivity(kind, bank, chapter, lesson, seed, prefix) {
  if (kind === "equation-balance") {
    return makeEquationActivity(bank, chapter, lesson, seed, prefix);
  }

  if (kind === "multiple-choice") {
    return makeChoiceActivity(bank, chapter, lesson, seed, prefix);
  }

  return makeInputActivity(bank, chapter, lesson, seed, prefix);
}

function makeEquationActivity(bank, chapter, lesson, seed, prefix) {
  switch (bank.balance) {
    case "proportion":
      return makeProportionEquation(bank, chapter, seed, prefix);
    case "percent-equation":
      return makePercentEquation(bank, chapter, seed, prefix);
    case "inequality":
      return makeInequalityEquation(bank, chapter, seed, prefix);
    case "square-root":
      return makeSquareRootEquation(bank, chapter, seed, prefix);
    case "one-step":
      return makeOneStepEquation(bank, chapter, seed, prefix);
    default:
      return makeTwoStepEquation(bank, chapter, seed, prefix);
  }
}

function makeOneStepEquation(bank, chapter, seed, prefix) {
  const variable = bank.variable;
  const coefficient = 2 + mod(seed + chapter.id.length, 8);
  const answer = 3 + mod(seed * 3 + chapter.title.length, 12);
  const total = coefficient * answer;
  const formula = `${coefficient}${variable} = ${total}`;

  return {
    kind: "equation-balance",
    prompt: withPrefix(prefix, `Solve ${formula} in the ${bank.context}.`),
    formula,
    stages: [
      {
        prompt: `Which move isolates ${variable}?`,
        board: {
          left: [{ label: `${coefficient}${variable}`, tone: "formula" }],
          relation: "=",
          right: [{ label: String(total), tone: "constant" }],
        },
        options: [
          { id: `divide-${coefficient}`, label: `Divide both sides by ${coefficient}`, summary: "Undo the coefficient." },
          { id: `multiply-${coefficient}`, label: `Multiply both sides by ${coefficient}`, summary: "That makes the value larger." },
          { id: `subtract-${coefficient}`, label: `Subtract ${coefficient}`, summary: "Subtraction does not undo multiplication." },
        ],
        correctOptionId: `divide-${coefficient}`,
        hint: `Undo multiplication by dividing both sides by ${coefficient}.`,
        feedback: `Good. ${total} divided by ${coefficient} is ${answer}.`,
      },
      {
        prompt: `The board is solved. Type the value of ${variable}.`,
        board: {
          left: [{ label: variable, tone: "variable" }],
          relation: "=",
          right: [{ label: String(answer), tone: "constant" }],
        },
        options: [],
        hint: `${total} / ${coefficient} = ${answer}.`,
        feedback: `${variable} = ${answer}.`,
      },
    ],
    finalPrompt: `What is ${variable}?`,
    acceptedAnswers: acceptedNumber(answer, variable),
    placeholder: `${variable} = ?`,
    explanation: `Dividing both sides by ${coefficient} gives ${variable} = ${answer}.`,
  };
}

function makeTwoStepEquation(bank, chapter, seed, prefix) {
  const variable = bank.variable;
  const coefficient = 2 + mod(seed + chapter.id.length, 7);
  const answer = 2 + mod(seed * 2 + chapter.title.length, 13);
  const constant = 3 + mod(seed * 5 + chapter.id.length, 12);
  const total = coefficient * answer + constant;
  const formula = `${coefficient}${variable} + ${constant} = ${total}`;

  return {
    kind: "equation-balance",
    prompt: withPrefix(prefix, `Solve ${formula} with inverse operations.`),
    formula,
    stages: [
      {
        prompt: "Which move clears the constant first?",
        board: {
          left: [
            { label: `${coefficient}${variable}`, tone: "formula" },
            { label: `+ ${constant}`, tone: "constant" },
          ],
          relation: "=",
          right: [{ label: String(total), tone: "constant" }],
        },
        options: [
          { id: `subtract-${constant}`, label: `Subtract ${constant} from both sides`, summary: "Clear the added constant." },
          { id: `divide-${constant}`, label: `Divide by ${constant}`, summary: "The constant is not a factor." },
          { id: `add-${constant}`, label: `Add ${constant} to both sides`, summary: "That moves the wrong direction." },
        ],
        correctOptionId: `subtract-${constant}`,
        hint: `Remove +${constant} before dividing by ${coefficient}.`,
        feedback: `Good. The equation is now ${coefficient}${variable} = ${coefficient * answer}.`,
      },
      {
        prompt: `Now isolate ${variable}.`,
        board: {
          left: [{ label: `${coefficient}${variable}`, tone: "formula" }],
          relation: "=",
          right: [{ label: String(coefficient * answer), tone: "constant" }],
        },
        options: [
          { id: `divide-${coefficient}`, label: `Divide both sides by ${coefficient}`, summary: "Undo the coefficient." },
          { id: `multiply-${coefficient}`, label: `Multiply by ${coefficient}`, summary: "That moves away from the solution." },
          { id: `subtract-${coefficient}`, label: `Subtract ${coefficient}`, summary: "Subtraction does not undo the coefficient." },
        ],
        correctOptionId: `divide-${coefficient}`,
        hint: `Divide ${coefficient * answer} by ${coefficient}.`,
        feedback: `${variable} = ${answer}.`,
      },
      {
        prompt: `Type the value of ${variable}.`,
        board: {
          left: [{ label: variable, tone: "variable" }],
          relation: "=",
          right: [{ label: String(answer), tone: "constant" }],
        },
        options: [],
        hint: `${coefficient * answer} / ${coefficient} = ${answer}.`,
        feedback: `${variable} = ${answer}.`,
      },
    ],
    finalPrompt: `What is ${variable}?`,
    acceptedAnswers: acceptedNumber(answer, variable),
    placeholder: `${variable} = ?`,
    explanation: `Subtract ${constant}, then divide by ${coefficient}, so ${variable} = ${answer}.`,
  };
}

function makeProportionEquation(bank, chapter, seed, prefix) {
  const variable = bank.variable;
  const divisor = 2 + mod(seed + chapter.id.length, 7);
  const answer = 4 + mod(seed * 2 + chapter.title.length, 15);
  const total = divisor * answer;
  const formula = `${variable} / ${divisor} = ${answer}`;

  return {
    kind: "equation-balance",
    prompt: withPrefix(prefix, `Solve ${formula} to complete the ${bank.context}.`),
    formula,
    stages: [
      {
        prompt: `Which move undoes division by ${divisor}?`,
        board: {
          left: [{ label: `${variable} / ${divisor}`, tone: "formula" }],
          relation: "=",
          right: [{ label: String(answer), tone: "constant" }],
        },
        options: [
          { id: `multiply-${divisor}`, label: `Multiply both sides by ${divisor}`, summary: "Undo the division." },
          { id: `divide-${divisor}`, label: `Divide both sides by ${divisor}`, summary: "That repeats the operation." },
          { id: `subtract-${divisor}`, label: `Subtract ${divisor}`, summary: "Subtraction does not undo division." },
        ],
        correctOptionId: `multiply-${divisor}`,
        hint: `Use multiplication to undo division by ${divisor}.`,
        feedback: `Good. ${answer} times ${divisor} is ${total}.`,
      },
      {
        prompt: `Type the value of ${variable}.`,
        board: {
          left: [{ label: variable, tone: "variable" }],
          relation: "=",
          right: [{ label: String(total), tone: "constant" }],
        },
        options: [],
        hint: `${answer} x ${divisor} = ${total}.`,
        feedback: `${variable} = ${total}.`,
      },
    ],
    finalPrompt: `What is ${variable}?`,
    acceptedAnswers: acceptedNumber(total, variable),
    placeholder: `${variable} = ?`,
    explanation: `Multiplying both sides by ${divisor} gives ${variable} = ${total}.`,
  };
}

function makePercentEquation(bank, chapter, seed, prefix) {
  const variable = bank.variable;
  const percents = [10, 15, 20, 25, 30, 40, 50, 60, 75];
  const percent = percents[mod(seed + chapter.id.length, percents.length)];
  const answer = 20 + mod(seed * 9 + chapter.title.length, 18) * 5;
  const total = (percent * answer) / 100;
  const formula = `${percent}% of ${variable} = ${total}`;

  return {
    kind: "equation-balance",
    prompt: withPrefix(prefix, `Solve ${formula} in the ${bank.context}.`),
    formula,
    stages: [
      {
        prompt: `Which decimal represents ${percent}%?`,
        board: {
          left: [{ label: `${percent}% x ${variable}`, tone: "formula" }],
          relation: "=",
          right: [{ label: String(total), tone: "constant" }],
        },
        options: [
          { id: "decimal", label: `Use ${percent / 100}${variable} = ${total}`, summary: "Percent means out of 100." },
          { id: "whole", label: `Use ${percent}${variable} = ${total}`, summary: "That forgets to divide by 100." },
          { id: "add", label: `Use ${variable} + ${percent} = ${total}`, summary: "Percent of means multiplication." },
        ],
        correctOptionId: "decimal",
        hint: `${percent}% is ${percent / 100}.`,
        feedback: `Now solve ${percent / 100}${variable} = ${total}.`,
      },
      {
        prompt: `Divide by ${percent / 100} to isolate ${variable}.`,
        board: {
          left: [{ label: `${percent / 100}${variable}`, tone: "formula" }],
          relation: "=",
          right: [{ label: String(total), tone: "constant" }],
        },
        options: [
          { id: "divide-decimal", label: `Divide both sides by ${percent / 100}`, summary: "Undo the coefficient." },
          { id: "multiply-decimal", label: `Multiply by ${percent / 100}`, summary: "That makes the value smaller." },
          { id: "subtract-decimal", label: `Subtract ${percent / 100}`, summary: "Subtraction does not undo multiplication." },
        ],
        correctOptionId: "divide-decimal",
        hint: `${total} / ${percent / 100} = ${answer}.`,
        feedback: `${variable} = ${answer}.`,
      },
      {
        prompt: `Type the value of ${variable}.`,
        board: {
          left: [{ label: variable, tone: "variable" }],
          relation: "=",
          right: [{ label: String(answer), tone: "constant" }],
        },
        options: [],
        hint: `${total} / ${percent / 100} = ${answer}.`,
        feedback: `${variable} = ${answer}.`,
      },
    ],
    finalPrompt: `What is ${variable}?`,
    acceptedAnswers: acceptedNumber(answer, variable),
    placeholder: `${variable} = ?`,
    explanation: `${percent}% is ${percent / 100}, so dividing ${total} by ${percent / 100} gives ${answer}.`,
  };
}

function makeInequalityEquation(bank, chapter, seed, prefix) {
  const variable = bank.variable;
  const coefficient = 2 + mod(seed + chapter.id.length, 6);
  const boundary = 2 + mod(seed * 3 + chapter.title.length, 14);
  const constant = 1 + mod(seed * 5 + chapter.id.length, 10);
  const total = coefficient * boundary + constant;
  const direction = seed % 2 === 0 ? ">" : "<";
  const formula = `${coefficient}${variable} + ${constant} ${direction} ${total}`;
  const answer = `${variable} ${direction} ${boundary}`;

  return {
    kind: "equation-balance",
    prompt: withPrefix(prefix, `Solve ${formula}.`),
    formula,
    stages: [
      {
        prompt: "Which move clears the constant?",
        board: {
          left: [
            { label: `${coefficient}${variable}`, tone: "formula" },
            { label: `+ ${constant}`, tone: "constant" },
          ],
          relation: direction,
          right: [{ label: String(total), tone: "constant" }],
        },
        options: [
          { id: `subtract-${constant}`, label: `Subtract ${constant} from both sides`, summary: "Keep the inequality balanced." },
          { id: `add-${constant}`, label: `Add ${constant}`, summary: "That moves the wrong way." },
          { id: `divide-${constant}`, label: `Divide by ${constant}`, summary: "Clear addition first." },
        ],
        correctOptionId: `subtract-${constant}`,
        hint: `Remove +${constant} before dividing.`,
        feedback: `Good. Now ${coefficient}${variable} ${direction} ${coefficient * boundary}.`,
      },
      {
        prompt: `Divide by positive ${coefficient}.`,
        board: {
          left: [{ label: `${coefficient}${variable}`, tone: "formula" }],
          relation: direction,
          right: [{ label: String(coefficient * boundary), tone: "constant" }],
        },
        options: [
          { id: `divide-${coefficient}`, label: `Divide both sides by ${coefficient}`, summary: "The direction stays the same because it is positive." },
          { id: `flip`, label: "Flip the inequality", summary: "Only flip when multiplying or dividing by a negative." },
          { id: `multiply-${coefficient}`, label: `Multiply by ${coefficient}`, summary: "That does not isolate the variable." },
        ],
        correctOptionId: `divide-${coefficient}`,
        hint: `Positive division keeps ${direction}.`,
        feedback: answer,
      },
      {
        prompt: `Type the inequality solution.`,
        board: {
          left: [{ label: variable, tone: "variable" }],
          relation: direction,
          right: [{ label: String(boundary), tone: "constant" }],
        },
        options: [],
        hint: answer,
        feedback: answer,
      },
    ],
    finalPrompt: `What is the solution for ${variable}?`,
    acceptedAnswers: unique([answer, answer.replace(/\s+/g, ""), `${variable}${direction}${boundary}`]),
    placeholder: `${variable} ${direction} ?`,
    explanation: `Subtract ${constant}, then divide by positive ${coefficient}, so ${answer}.`,
  };
}

function makeSquareRootEquation(bank, chapter, seed, prefix) {
  const variable = bank.variable;
  const root = 3 + mod(seed * 2 + chapter.title.length, 11);
  const square = root * root;
  const formula = `${variable}^2 = ${square}`;

  return {
    kind: "equation-balance",
    prompt: withPrefix(prefix, `Solve ${formula}.`),
    formula,
    stages: [
      {
        prompt: "Which move reveals the roots?",
        board: {
          left: [{ label: `${variable}^2`, tone: "formula" }],
          relation: "=",
          right: [{ label: String(square), tone: "constant" }],
        },
        options: [
          { id: "square-root", label: "Square root both sides", summary: "Undo the square." },
          { id: "divide-2", label: "Divide by 2", summary: "There is no coefficient 2." },
          { id: "subtract-square", label: `Subtract ${square}`, summary: "That does not isolate the roots." },
        ],
        correctOptionId: "square-root",
        hint: "The inverse of squaring is square root.",
        feedback: `The roots are ${root} and -${root}.`,
      },
      {
        prompt: "Type both roots.",
        board: {
          left: [{ label: variable, tone: "variable" }],
          relation: "=",
          right: [{ label: `±${root}`, tone: "constant" }],
        },
        options: [],
        hint: `Both ${root} and -${root} square to ${square}.`,
        feedback: `${variable} = ±${root}.`,
      },
    ],
    finalPrompt: `Type the solution for ${variable}.`,
    acceptedAnswers: [`±${root}`, `+/-${root}`, `${root},-${root}`, `-${root},${root}`, `${variable}=±${root}`, `${variable} = ±${root}`],
    placeholder: `${variable} = ?`,
    explanation: `Square-rooting both sides gives ${variable} = ±${root}.`,
  };
}

function makeChoiceActivity(bank, chapter, lesson, seed, prefix) {
  const data = makeChoiceData(bank, chapter, seed);
  return {
    kind: "multiple-choice",
    prompt: withPrefix(prefix, data.prompt),
    formula: data.formula,
    choices: sanitizeChoices(data.choices, data.correctChoiceId),
    correctChoiceId: data.correctChoiceId,
    explanation: data.explanation,
    hint: data.hint,
  };
}

function sanitizeChoices(choices, correctChoiceId) {
  const correct = choices.find((entry) => entry.id === correctChoiceId) ?? choices[0];
  const labels = new Set([normalizeLabel(correct.label)]);
  const sanitized = [correct];

  for (const entry of choices) {
    if (entry.id === correct.id) {
      continue;
    }

    const labelKey = normalizeLabel(entry.label);
    if (labels.has(labelKey)) {
      continue;
    }

    labels.add(labelKey);
    sanitized.push(entry);
  }

  for (const label of fallbackChoiceLabels(correct.label)) {
    if (sanitized.length >= 3) {
      break;
    }

    const labelKey = normalizeLabel(label);
    if (!labels.has(labelKey)) {
      labels.add(labelKey);
      sanitized.push(choice(`fallback-${sanitized.length}`, label));
    }
  }

  return sanitized.slice(0, 3);
}

function fallbackChoiceLabels(correctLabel) {
  const numericValue = Number(correctLabel);
  if (Number.isFinite(numericValue)) {
    return [numericValue + 1, numericValue - 1, numericValue * 2, 0];
  }

  return ["Cannot be determined", `Not ${correctLabel}`, "No association"];
}

function makeChoiceData(bank, chapter, seed) {
  switch (bank.choice) {
    case "ratio":
      return ratioChoice(seed);
    case "fraction-decimal":
      return fractionDecimalChoice(seed);
    case "quadrant":
      return quadrantChoice(seed);
    case "combine":
      return combineChoice(bank.variable, seed);
    case "triangle-area":
      return triangleAreaChoice(seed);
    case "median":
      return medianChoice(seed);
    case "percent":
      return percentChoice(seed);
    case "integer-product":
      return integerProductChoice(seed);
    case "inequality-solution":
      return inequalityChoice(bank.variable, seed);
    case "scale":
      return scaleChoice(seed);
    case "circle":
      return circleChoice(seed);
    case "probability":
      return probabilityChoice(seed);
    case "root":
      return rootChoice(seed);
    case "slope":
      return slopeChoice(seed);
    case "system":
      return systemChoice(seed);
    case "function":
      return functionChoice(seed);
    case "transformation":
      return transformationChoice(seed);
    case "pythagorean":
      return pythagoreanChoice(seed);
    case "trend":
      return trendChoice(seed);
    case "distribute":
      return distributeChoice(bank.variable, seed);
    case "polynomial":
      return polynomialChoice(bank.variable, seed);
    case "quadratic-roots":
      return quadraticRootsChoice(seed);
    case "model-rate":
      return modelRateChoice(seed);
    default:
      return combineChoice(bank.variable, seed);
  }
}

function ratioChoice(seed) {
  const left = 2 + mod(seed, 7);
  const right = left + 1 + mod(seed * 2, 6);
  const scale = 2 + mod(seed * 3, 5);
  const a = left * scale;
  const b = right * scale;
  return {
    prompt: `Choose the ratio equivalent to ${a}:${b}.`,
    formula: `${a}:${b} = ${left}:${right}`,
    choices: [choice("correct", `${left}:${right}`), choice("swap", `${right}:${left}`), choice("off", `${left + 1}:${right}`)],
    correctChoiceId: "correct",
    explanation: `Divide both parts by ${scale} to get ${left}:${right}.`,
    hint: "Equivalent ratios divide both parts by the same number.",
  };
}

function fractionDecimalChoice(seed) {
  const pairs = [
    [1, 2, "0.5"],
    [1, 4, "0.25"],
    [3, 4, "0.75"],
    [2, 5, "0.4"],
    [3, 5, "0.6"],
    [1, 8, "0.125"],
    [3, 8, "0.375"],
    [7, 10, "0.7"],
  ];
  const [n, d, decimal] = pairs[mod(seed, pairs.length)];
  return {
    prompt: `Choose the decimal form of ${n}/${d}.`,
    formula: `${n}/${d} = ${decimal}`,
    choices: [choice("correct", decimal), choice("hundred", `${n}.${d}`), choice("inverse", `${d / n}`)],
    correctChoiceId: "correct",
    explanation: `${n} divided by ${d} is ${decimal}.`,
    hint: "Divide the numerator by the denominator.",
  };
}

function quadrantChoice(seed) {
  const points = [
    [3, 4, "Quadrant I"],
    [-5, 2, "Quadrant II"],
    [-4, -6, "Quadrant III"],
    [7, -3, "Quadrant IV"],
  ];
  const [x, y, quadrant] = points[mod(seed, points.length)];
  return {
    prompt: `Which quadrant contains (${x}, ${y})?`,
    formula: `(${x}, ${y})`,
    choices: [choice("correct", quadrant), choice("x-axis", "x-axis"), choice("wrong", points[mod(seed + 1, points.length)][2])],
    correctChoiceId: "correct",
    explanation: `The signs of (${x}, ${y}) place the point in ${quadrant}.`,
    hint: "Use the signs of x and y.",
  };
}

function combineChoice(variable, seed) {
  const first = 2 + mod(seed, 8);
  const second = 3 + mod(seed * 2, 7);
  const sum = first + second;
  return {
    prompt: `Combine like terms: ${first}${variable} + ${second}${variable}.`,
    formula: `${first}${variable} + ${second}${variable} = ${sum}${variable}`,
    choices: [choice("correct", `${sum}${variable}`), choice("multiply", `${first * second}${variable}`), choice("power", `${sum}${variable}^2`)],
    correctChoiceId: "correct",
    explanation: `Add the coefficients: ${first} + ${second} = ${sum}.`,
    hint: "Like terms keep the same variable part.",
  };
}

function triangleAreaChoice(seed) {
  const base = 6 + mod(seed * 2, 10);
  const height = 4 + mod(seed * 3, 8);
  const area = (base * height) / 2;
  return {
    prompt: `What is the area of a triangle with base ${base} and height ${height}?`,
    formula: `A = 1/2 x ${base} x ${height}`,
    choices: [choice("correct", area), choice("rectangle", base * height), choice("perimeter", base + height)],
    correctChoiceId: "correct",
    explanation: `Triangle area is half of ${base} x ${height}, so A = ${area}.`,
    hint: "Use one-half times base times height.",
  };
}

function medianChoice(seed) {
  const start = 3 + mod(seed, 9);
  const list = [start, start + 2, start + 5, start + 7, start + 10];
  return {
    prompt: `Find the median of ${list.join(", ")}.`,
    formula: `median(${list.join(",")}) = ${list[2]}`,
    choices: [choice("correct", list[2]), choice("first", list[0]), choice("meanish", list[3])],
    correctChoiceId: "correct",
    explanation: `The middle value in the ordered list is ${list[2]}.`,
    hint: "Median means the middle value.",
  };
}

function percentChoice(seed) {
  const percents = [10, 15, 20, 25, 30, 40, 60, 75];
  const percent = percents[mod(seed, percents.length)];
  const whole = 40 + mod(seed * 9, 16) * 5;
  const answer = (percent * whole) / 100;
  return {
    prompt: `What is ${percent}% of ${whole}?`,
    formula: `${percent}% x ${whole} = ${answer}`,
    choices: [choice("correct", answer), choice("too-high", answer + percent), choice("whole", whole - answer)],
    correctChoiceId: "correct",
    explanation: `${percent}% means ${percent / 100}, and ${percent / 100} x ${whole} = ${answer}.`,
    hint: "Convert percent to a decimal before multiplying.",
  };
}

function integerProductChoice(seed) {
  const negative = -(2 + mod(seed, 8));
  const positive = 3 + mod(seed * 2, 7);
  const answer = negative * positive;
  return {
    prompt: `Compute ${negative} x ${positive}.`,
    formula: `${negative} x ${positive} = ${answer}`,
    choices: [choice("correct", answer), choice("positive", Math.abs(answer)), choice("off", answer + positive)],
    correctChoiceId: "correct",
    explanation: `A negative times a positive is negative, so the product is ${answer}.`,
    hint: "Use the sign rules for multiplication.",
  };
}

function inequalityChoice(variable, seed) {
  const boundary = 2 + mod(seed * 2, 12);
  const direction = seed % 2 === 0 ? ">" : "<";
  return {
    prompt: `Which graph matches ${variable} ${direction} ${boundary}?`,
    formula: `${variable} ${direction} ${boundary}`,
    choices: [
      choice("correct", `Open circle at ${boundary}, shade ${direction === ">" ? "right" : "left"}`),
      choice("closed", `Closed circle at ${boundary}, shade ${direction === ">" ? "right" : "left"}`),
      choice("wrong-way", `Open circle at ${boundary}, shade ${direction === ">" ? "left" : "right"}`),
    ],
    correctChoiceId: "correct",
    explanation: `Strict inequalities use an open circle and shade the ${direction === ">" ? "right" : "left"}.`,
    hint: "Open circle means the endpoint is not included.",
  };
}

function scaleChoice(seed) {
  const scale = 2 + mod(seed, 5);
  const drawing = 3 + mod(seed * 2, 8);
  const actual = scale * drawing;
  return {
    prompt: `A drawing uses scale 1:${scale}. If the drawing length is ${drawing}, what is the actual length?`,
    formula: `${drawing} x ${scale} = ${actual}`,
    choices: [choice("correct", actual), choice("divide", drawing), choice("add", drawing + scale)],
    correctChoiceId: "correct",
    explanation: `Multiply the drawing length by ${scale}.`,
    hint: "Scale 1:k means actual length is k times the drawing length.",
  };
}

function circleChoice(seed) {
  const radius = 3 + mod(seed, 9);
  const diameter = radius * 2;
  return {
    prompt: `What is the circumference of a circle with radius ${radius}?`,
    formula: `C = 2π(${radius})`,
    choices: [choice("correct", `${diameter}π`), choice("area", `${radius * radius}π`), choice("diameter", diameter)],
    correctChoiceId: "correct",
    explanation: `C = 2πr = 2π(${radius}) = ${diameter}π.`,
    hint: "Circumference uses 2πr.",
  };
}

function probabilityChoice(seed) {
  const total = 6 + mod(seed * 2, 10);
  const favorable = 1 + mod(seed, total - 2);
  const simplified = simplify(favorable, total);
  return {
    prompt: `A bag has ${favorable} winning tiles out of ${total} total tiles. What is P(win)?`,
    formula: `${favorable}/${total} = ${simplified}`,
    choices: [choice("correct", simplified), choice("complement", simplify(total - favorable, total)), choice("total", total)],
    correctChoiceId: "correct",
    explanation: `Probability is favorable outcomes over total outcomes: ${simplified}.`,
    hint: "Write favorable over total and simplify.",
  };
}

function rootChoice(seed) {
  const root = 4 + mod(seed, 10);
  const square = root * root;
  return {
    prompt: `Choose the principal square root of ${square}.`,
    formula: `sqrt(${square}) = ${root}`,
    choices: [choice("correct", root), choice("negative", -root), choice("double", root * 2)],
    correctChoiceId: "correct",
    explanation: `The principal square root is the nonnegative root, ${root}.`,
    hint: "Find the number that squares to the radicand.",
  };
}

function slopeChoice(seed) {
  const x1 = 1 + mod(seed, 4);
  const y1 = 2 + mod(seed * 2, 5);
  const run = 2 + mod(seed * 3, 5);
  const slope = 1 + mod(seed, 5);
  const x2 = x1 + run;
  const y2 = y1 + slope * run;
  return {
    prompt: `Find the slope between (${x1}, ${y1}) and (${x2}, ${y2}).`,
    formula: `(${y2} - ${y1}) / (${x2} - ${x1}) = ${slope}`,
    choices: [choice("correct", slope), choice("rise", y2 - y1), choice("run", run)],
    correctChoiceId: "correct",
    explanation: `Rise is ${y2 - y1} and run is ${run}, so slope is ${slope}.`,
    hint: "Slope is change in y divided by change in x.",
  };
}

function systemChoice(seed) {
  const x = 1 + mod(seed, 8);
  const y = 2 + mod(seed * 2, 7);
  return {
    prompt: `Which ordered pair solves x + y = ${x + y} and x - y = ${x - y}?`,
    formula: `x + y = ${x + y}; x - y = ${x - y}`,
    choices: [choice("correct", `(${x}, ${y})`), choice("swap", `(${y}, ${x})`), choice("negative", `(${-x}, ${y})`)],
    correctChoiceId: "correct",
    explanation: `Substituting (${x}, ${y}) makes both equations true.`,
    hint: "Test each ordered pair in both equations.",
  };
}

function functionChoice(seed) {
  const slope = 2 + mod(seed, 5);
  const intercept = -4 + mod(seed * 3, 9);
  const x = 1 + mod(seed * 2, 7);
  const y = slope * x + intercept;
  return {
    prompt: `For f(x) = ${slope}x ${formatSigned(intercept)}, find f(${x}).`,
    formula: `f(${x}) = ${slope}(${x}) ${formatSigned(intercept)} = ${y}`,
    choices: [choice("correct", y), choice("no-intercept", slope * x), choice("add", slope + x + intercept)],
    correctChoiceId: "correct",
    explanation: `Substitute ${x}: ${slope}(${x}) ${formatSigned(intercept)} = ${y}.`,
    hint: "Replace x with the input value.",
  };
}

function transformationChoice(seed) {
  const x = -4 + mod(seed * 2, 9);
  const y = -3 + mod(seed * 3, 7);
  const dx = -2 + mod(seed, 5);
  const dy = -3 + mod(seed * 2, 7);
  return {
    prompt: `Translate (${x}, ${y}) by (${dx}, ${dy}).`,
    formula: `(${x} + ${dx}, ${y} + ${dy}) = (${x + dx}, ${y + dy})`,
    choices: [choice("correct", `(${x + dx}, ${y + dy})`), choice("subtract", `(${x - dx}, ${y - dy})`), choice("swap", `(${y + dy}, ${x + dx})`)],
    correctChoiceId: "correct",
    explanation: `Add the translation to each coordinate.`,
    hint: "Translation adds to x and y.",
  };
}

function pythagoreanChoice(seed) {
  const triples = [
    [3, 4, 5],
    [5, 12, 13],
    [6, 8, 10],
    [8, 15, 17],
    [7, 24, 25],
  ];
  const [a, b, c] = triples[mod(seed, triples.length)];
  return {
    prompt: `A right triangle has legs ${a} and ${b}. What is the hypotenuse?`,
    formula: `${a}^2 + ${b}^2 = ${c}^2`,
    choices: [choice("correct", c), choice("sum", a + b), choice("difference", Math.abs(b - a))],
    correctChoiceId: "correct",
    explanation: `${a}^2 + ${b}^2 = ${c * c}, so c = ${c}.`,
    hint: "Use a^2 + b^2 = c^2.",
  };
}

function trendChoice(seed) {
  const trends = [
    ["as x increases, y increases", "positive association"],
    ["as x increases, y decreases", "negative association"],
    ["points are scattered with no pattern", "no association"],
  ];
  const [description, answer] = trends[mod(seed, trends.length)];
  const distractors = trends.map(([, label]) => label).filter((label) => label !== answer);
  return {
    prompt: `A scatterplot shows that ${description}. What association is shown?`,
    formula: description,
    choices: [choice("correct", answer), choice("distractor-a", distractors[0]), choice("distractor-b", distractors[1])],
    correctChoiceId: "correct",
    explanation: `This pattern shows ${answer}.`,
    hint: "Look at the overall direction of the data.",
  };
}

function distributeChoice(variable, seed) {
  const coefficient = 2 + mod(seed, 6);
  const constant = 2 + mod(seed * 3, 8);
  return {
    prompt: `Expand ${coefficient}(${variable} + ${constant}).`,
    formula: `${coefficient}(${variable} + ${constant}) = ${coefficient}${variable} + ${coefficient * constant}`,
    choices: [
      choice("correct", `${coefficient}${variable} + ${coefficient * constant}`),
      choice("missed", `${coefficient}${variable} + ${constant}`),
      choice("added", `${coefficient + constant}${variable}`),
    ],
    correctChoiceId: "correct",
    explanation: `Distribute ${coefficient} to both terms.`,
    hint: "Multiply every term inside the parentheses.",
  };
}

function polynomialChoice(variable, seed) {
  const first = 2 + mod(seed, 5);
  const second = 3 + mod(seed * 2, 6);
  const power = seed % 2 === 0 ? 2 : 3;
  return {
    prompt: `Combine ${first}${variable}^${power} + ${second}${variable}^${power}.`,
    formula: `${first}${variable}^${power} + ${second}${variable}^${power} = ${first + second}${variable}^${power}`,
    choices: [
      choice("correct", `${first + second}${variable}^${power}`),
      choice("power-add", `${first + second}${variable}^${power + power}`),
      choice("multiply", `${first * second}${variable}^${power}`),
    ],
    correctChoiceId: "correct",
    explanation: `Like polynomial terms add coefficients and keep the same power.`,
    hint: "Only add coefficients when powers match.",
  };
}

function quadraticRootsChoice(seed) {
  const rootA = 1 + mod(seed, 6);
  const rootB = rootA + 1 + mod(seed * 2, 5);
  return {
    prompt: `Choose the roots of (x - ${rootA})(x - ${rootB}).`,
    formula: `(x - ${rootA})(x - ${rootB})`,
    choices: [choice("correct", `${rootA} and ${rootB}`), choice("negative", `-${rootA} and -${rootB}`), choice("sum", `0 and ${rootA + rootB}`)],
    correctChoiceId: "correct",
    explanation: `Set each factor equal to 0, so x = ${rootA} or x = ${rootB}.`,
    hint: "A factor x - a gives root a.",
  };
}

function modelRateChoice(seed) {
  const rate = 2 + mod(seed, 8);
  const start = 5 + mod(seed * 3, 12);
  const time = 3 + mod(seed * 2, 7);
  const value = start + rate * time;
  return {
    prompt: `A model starts at ${start} and increases by ${rate} each step. What is the value at step ${time}?`,
    formula: `${start} + ${rate}(${time}) = ${value}`,
    choices: [choice("correct", value), choice("rate-only", rate * time), choice("add-only", start + rate)],
    correctChoiceId: "correct",
    explanation: `Use start plus rate times step: ${start} + ${rate}(${time}) = ${value}.`,
    hint: "Linear models use start value plus rate times input.",
  };
}

function makeInputActivity(bank, chapter, lesson, seed, prefix) {
  const data = makeInputData(bank, chapter, seed);
  return {
    kind: "input",
    prompt: withPrefix(prefix, data.prompt),
    formula: data.formula,
    acceptedAnswers: data.acceptedAnswers,
    placeholder: data.placeholder,
    explanation: data.explanation,
    hint: data.hint,
  };
}

function makeInputData(bank, chapter, seed) {
  switch (bank.input) {
    case "unit-rate":
      return unitRateInput(seed);
    case "fraction-divide":
      return fractionDivideInput(seed);
    case "absolute":
      return absoluteInput(seed);
    case "evaluate-expression":
      return evaluateInput(bank.variable, seed);
    case "volume":
      return volumeInput(seed);
    case "mean":
      return meanInput(seed);
    case "negative-division":
      return negativeDivisionInput(seed);
    case "inequality":
      return inequalityInput(bank.variable, seed);
    case "angle":
      return angleInput(seed);
    case "circle-area":
      return circleAreaInput(seed);
    case "probability":
      return probabilityInput(seed);
    case "exponent":
      return exponentInput(seed);
    case "linear":
      return linearInput(bank.variable, seed);
    case "system":
      return systemInput(seed);
    case "function":
      return functionInput(seed);
    case "translation":
      return translationInput(seed);
    case "pythagorean":
      return pythagoreanInput(seed);
    case "expression":
      return expressionInput(bank.variable, seed);
    case "polynomial":
      return polynomialInput(bank.variable, seed);
    case "quadratic":
      return quadraticInput(seed);
    case "model-rate":
      return modelRateInput(seed);
    default:
      return linearInput(bank.variable, seed);
  }
}

function unitRateInput(seed) {
  const hours = 2 + mod(seed, 7);
  const rate = 5 + mod(seed * 3, 16);
  const total = hours * rate;
  return {
    prompt: `A trip covers ${total} miles in ${hours} hours. Type the unit rate.`,
    formula: `${total} / ${hours} = ${rate}`,
    acceptedAnswers: [String(rate), `${rate}mph`, `${rate} miles per hour`],
    placeholder: "Unit rate",
    explanation: `${total} divided by ${hours} is ${rate}.`,
    hint: "Divide total distance by hours.",
  };
}

function fractionDivideInput(seed) {
  const numerator = 1 + mod(seed, 4);
  const denominator = numerator + 2 + mod(seed * 2, 5);
  const divisor = 2 + mod(seed, 4);
  const rawAnswer = `${numerator}/${denominator * divisor}`;
  const simplifiedAnswer = simplify(numerator, denominator * divisor);
  return {
    prompt: `Type the result of (${numerator}/${denominator}) / ${divisor}.`,
    formula: `(${numerator}/${denominator}) / ${divisor} = ${simplifiedAnswer}`,
    acceptedAnswers: unique([rawAnswer, simplifiedAnswer]),
    placeholder: "Fraction",
    explanation: `Dividing by ${divisor} multiplies the denominator by ${divisor}.`,
    hint: "Keep-change-flip for division.",
  };
}

function absoluteInput(seed) {
  const value = -(5 + mod(seed * 2, 18));
  return {
    prompt: `Type the value of |${value}|.`,
    formula: `|${value}| = ${Math.abs(value)}`,
    acceptedAnswers: [String(Math.abs(value))],
    placeholder: "Absolute value",
    explanation: `Absolute value is distance from 0, so the answer is ${Math.abs(value)}.`,
    hint: "Distance is never negative.",
  };
}

function evaluateInput(variable, seed) {
  const coefficient = 2 + mod(seed, 6);
  const input = 3 + mod(seed * 2, 8);
  const constant = 1 + mod(seed * 3, 9);
  const answer = coefficient * input + constant;
  return {
    prompt: `Evaluate ${coefficient}${variable} + ${constant} when ${variable} = ${input}.`,
    formula: `${coefficient}(${input}) + ${constant} = ${answer}`,
    acceptedAnswers: [String(answer)],
    placeholder: "Value",
    explanation: `Substitute ${input}: ${coefficient}(${input}) + ${constant} = ${answer}.`,
    hint: "Replace the variable, then use order of operations.",
  };
}

function volumeInput(seed) {
  const length = 3 + mod(seed, 7);
  const width = 2 + mod(seed * 2, 6);
  const height = 4 + mod(seed * 3, 5);
  const answer = length * width * height;
  return {
    prompt: `Type the volume of a rectangular prism ${length} by ${width} by ${height}.`,
    formula: `V = ${length} x ${width} x ${height}`,
    acceptedAnswers: [String(answer), `${answer} cubic units`],
    placeholder: "Volume",
    explanation: `Multiply length, width, and height to get ${answer}.`,
    hint: "Volume is length times width times height.",
  };
}

function meanInput(seed) {
  const start = 4 + mod(seed, 9);
  const values = [start, start + 2, start + 6, start + 8];
  const answer = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    prompt: `Type the mean of ${values.join(", ")}.`,
    formula: `(${values.join(" + ")}) / ${values.length} = ${answer}`,
    acceptedAnswers: [String(answer)],
    placeholder: "Mean",
    explanation: `Add the values and divide by ${values.length}.`,
    hint: "Mean is total divided by count.",
  };
}

function negativeDivisionInput(seed) {
  const divisor = 2 + mod(seed, 8);
  const quotient = -(3 + mod(seed * 2, 9));
  const total = divisor * quotient;
  return {
    prompt: `Type ${total} / ${divisor}.`,
    formula: `${total} / ${divisor} = ${quotient}`,
    acceptedAnswers: [String(quotient)],
    placeholder: "Quotient",
    explanation: `A negative divided by a positive is negative: ${quotient}.`,
    hint: "Use integer sign rules.",
  };
}

function inequalityInput(variable, seed) {
  const boundary = 3 + mod(seed * 3, 12);
  const direction = seed % 2 === 0 ? ">" : "<";
  return {
    prompt: `Type the solution shown by an open circle at ${boundary} shaded ${direction === ">" ? "right" : "left"}.`,
    formula: `${variable} ${direction} ${boundary}`,
    acceptedAnswers: [`${variable}${direction}${boundary}`, `${variable} ${direction} ${boundary}`],
    placeholder: `${variable} ${direction} ?`,
    explanation: `The graph represents ${variable} ${direction} ${boundary}.`,
    hint: "Right means greater; left means less.",
  };
}

function angleInput(seed) {
  const a = 35 + mod(seed * 4, 40);
  const b = 45 + mod(seed * 5, 45);
  const answer = 180 - a - b;
  return {
    prompt: `A triangle has angles ${a} and ${b}. Type the third angle.`,
    formula: `180 - ${a} - ${b} = ${answer}`,
    acceptedAnswers: [String(answer), `${answer} degrees`],
    placeholder: "Angle",
    explanation: `Triangle angles total 180 degrees.`,
    hint: "Subtract known angles from 180.",
  };
}

function circleAreaInput(seed) {
  const radius = 2 + mod(seed, 9);
  const coefficient = radius * radius;
  return {
    prompt: `Type the area of a circle with radius ${radius} in terms of pi.`,
    formula: `A = π(${radius})^2 = ${coefficient}π`,
    acceptedAnswers: [`${coefficient}π`, `${coefficient}pi`, `${coefficient} pi`],
    placeholder: "Area",
    explanation: `Area is πr^2, so A = ${coefficient}π.`,
    hint: "Square the radius and keep pi.",
  };
}

function probabilityInput(seed) {
  const total = 8 + mod(seed * 2, 10);
  const favorable = 2 + mod(seed, total - 3);
  const answer = simplify(favorable, total);
  return {
    prompt: `Type the probability of drawing one of ${favorable} marked cards from ${total} cards.`,
    formula: `${favorable}/${total} = ${answer}`,
    acceptedAnswers: unique([answer, `${favorable}/${total}`]),
    placeholder: "Probability",
    explanation: `Probability is favorable over total: ${answer}.`,
    hint: "Write favorable outcomes over total outcomes.",
  };
}

function exponentInput(seed) {
  const base = 2 + mod(seed, 5);
  const exponent = 2 + mod(seed * 2, 4);
  const answer = base ** exponent;
  return {
    prompt: `Type ${base}^${exponent}.`,
    formula: `${base}^${exponent} = ${answer}`,
    acceptedAnswers: [String(answer)],
    placeholder: "Value",
    explanation: `${base} multiplied by itself ${exponent} times is ${answer}.`,
    hint: "Use repeated multiplication.",
  };
}

function linearInput(variable, seed) {
  const coefficient = 2 + mod(seed, 7);
  const answer = 2 + mod(seed * 2, 11);
  const constant = 3 + mod(seed * 3, 10);
  const total = coefficient * answer - constant;
  return {
    prompt: `Type the value of ${variable} in ${coefficient}${variable} - ${constant} = ${total}.`,
    formula: `${coefficient}${variable} - ${constant} = ${total}`,
    acceptedAnswers: acceptedNumber(answer, variable),
    placeholder: `${variable} = ?`,
    explanation: `Add ${constant}, then divide by ${coefficient}.`,
    hint: "Clear the constant first.",
  };
}

function systemInput(seed) {
  const x = 1 + mod(seed, 7);
  const y = 1 + mod(seed * 3, 8);
  return {
    prompt: `For x + y = ${x + y} and x - y = ${x - y}, type x.`,
    formula: `x + y = ${x + y}; x - y = ${x - y}`,
    acceptedAnswers: [String(x), `x=${x}`, `x = ${x}`],
    placeholder: "x = ?",
    explanation: `The solution is (${x}, ${y}), so x = ${x}.`,
    hint: "Add the equations to eliminate y.",
  };
}

function functionInput(seed) {
  const slope = 2 + mod(seed, 5);
  const intercept = -3 + mod(seed * 2, 9);
  const x = 2 + mod(seed * 3, 7);
  const y = slope * x + intercept;
  return {
    prompt: `Type f(${x}) for f(x) = ${slope}x ${formatSigned(intercept)}.`,
    formula: `f(${x}) = ${slope}(${x}) ${formatSigned(intercept)} = ${y}`,
    acceptedAnswers: [String(y)],
    placeholder: "f(x)",
    explanation: `Substitute ${x} to get ${y}.`,
    hint: "Replace x with the input.",
  };
}

function translationInput(seed) {
  const x = -3 + mod(seed, 7);
  const y = -4 + mod(seed * 2, 9);
  const dx = 1 + mod(seed * 3, 5);
  const dy = -2 + mod(seed, 5);
  return {
    prompt: `Translate (${x}, ${y}) by (${dx}, ${dy}). Type the new x-coordinate.`,
    formula: `x' = ${x} + ${dx} = ${x + dx}`,
    acceptedAnswers: [String(x + dx)],
    placeholder: "New x",
    explanation: `The new point is (${x + dx}, ${y + dy}).`,
    hint: "Add dx to the x-coordinate.",
  };
}

function pythagoreanInput(seed) {
  const triples = [
    [3, 4, 5],
    [5, 12, 13],
    [6, 8, 10],
    [8, 15, 17],
  ];
  const [a, b, c] = triples[mod(seed, triples.length)];
  return {
    prompt: `A right triangle has legs ${a} and ${b}. Type the hypotenuse.`,
    formula: `${a}^2 + ${b}^2 = ${c}^2`,
    acceptedAnswers: [String(c)],
    placeholder: "Hypotenuse",
    explanation: `The hypotenuse is ${c}.`,
    hint: "Use a^2 + b^2 = c^2.",
  };
}

function expressionInput(variable, seed) {
  const coefficient = 2 + mod(seed, 6);
  const constant = 3 + mod(seed * 2, 8);
  const input = 2 + mod(seed * 3, 7);
  const answer = coefficient * (input + constant);
  return {
    prompt: `Evaluate ${coefficient}(${variable} + ${constant}) when ${variable} = ${input}.`,
    formula: `${coefficient}(${input} + ${constant}) = ${answer}`,
    acceptedAnswers: [String(answer)],
    placeholder: "Value",
    explanation: `Evaluate inside parentheses first, then multiply.`,
    hint: "Substitute the variable before simplifying.",
  };
}

function polynomialInput(variable, seed) {
  const first = 2 + mod(seed, 5);
  const second = 4 + mod(seed * 2, 6);
  const sum = first + second;
  return {
    prompt: `Combine ${first}${variable}^2 + ${second}${variable}^2. Type the coefficient.`,
    formula: `${first}${variable}^2 + ${second}${variable}^2 = ${sum}${variable}^2`,
    acceptedAnswers: [String(sum)],
    placeholder: "Coefficient",
    explanation: `Add coefficients ${first} + ${second} = ${sum}.`,
    hint: "The power stays the same.",
  };
}

function quadraticInput(seed) {
  const root = 3 + mod(seed, 10);
  const square = root * root;
  return {
    prompt: `Type the positive root of x^2 = ${square}.`,
    formula: `x^2 = ${square}`,
    acceptedAnswers: [String(root), `x=${root}`, `x = ${root}`],
    placeholder: "Positive root",
    explanation: `The positive square root of ${square} is ${root}.`,
    hint: "Use the principal square root.",
  };
}

function modelRateInput(seed) {
  const rate = 2 + mod(seed, 9);
  const start = 4 + mod(seed * 2, 12);
  const input = 2 + mod(seed * 3, 8);
  const answer = start + rate * input;
  return {
    prompt: `A model is y = ${rate}x + ${start}. Type y when x = ${input}.`,
    formula: `y = ${rate}(${input}) + ${start} = ${answer}`,
    acceptedAnswers: [String(answer), `y=${answer}`, `y = ${answer}`],
    placeholder: "y = ?",
    explanation: `Substitute ${input} to get ${answer}.`,
    hint: "Multiply first, then add the start value.",
  };
}

function collectActivities(chapter) {
  return chapter.lessons.flatMap((lesson) => {
    if (lesson.activity.kind === "composite") {
      return lesson.activity.rounds;
    }

    return [lesson.activity];
  });
}
