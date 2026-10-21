# Quiz UI — the harness tool, never markdown MCQs

Do **not** print A/B/C/D in the chat transcript. Every probe and lock-in quiz goes
through the `quiz` tool bundled in this project (`extensions/quiz.ts`). Call it,
wait for the result, then score. Never ask the question in prose and grade his
reply by eye.

## Which tool

| Tool | Use for |
|---|---|
| `quiz` | Anything with a right answer — probe strands, lock-in checks, Socratic discovery steps |
| `ask_user_question` | Genuine no-right-answer forks — goal, preference, direction, "what next" |

This project has both. `quiz` is graded: it knows the correct answer, marks ✓/✗,
and reveals your `explanation`. `ask_user_question` has no notion of correct.
Using the wrong one either leaks the answer or fabricates a grade.

If porting this skill to another harness, the equivalents are `AskUserQuestion`
(Claude Code), `question` (OpenCode), `ask_user_question` (Grok/Codex). If neither
exists, say which tool is missing and stop — do not fall back to pasted multiple
choice.

## What the extension already does for you

Do not re-implement these; they're handled and doing them by hand breaks it:

- **"I don't know" is added automatically**, dimmed, visually separated, never
  shuffled, and reported as a distinct `dontKnow` signal rather than a wrong
  grade. **Never add your own "I don't know" option** — you'd create a second,
  fake one that grades as wrong.
- **Options are shuffled by default** (`shuffle: true`), so position never leaks
  the answer. Don't set `shuffle: false` except when order is meaningful
  (ordered numbers, "all/none of the above" that must stay last).
- **A free-text note field** sits under the options, always available, including
  when he picks "I don't know". That is the talk-through slot — read it. A right
  letter with a wrong reason in the note is `edge`, not `known`.
- **One question per call.** The tool takes a single question; it does not batch.
  Sequence calls instead. Short batches, many calls.

## Call shape

```
quiz
  question: "<stem>"              # exactly one question
  details:  "<optional context>"  # shown under the stem; use sparingly
  options:                        # 3 content options is the default
    - label: "<bare claim>"
      value: "<stable id>"        # referenced by correctAnswer
  correctAnswer: "<value>"        # the value, never a position number
  explanation: "<why the right one is right, and why the tempting one isn't>"
  multiSelect: false              # these are single-answer quizzes
```

Rules that matter:

- **`correctAnswer` is the option's `value`, not an index.** Indexes miscount;
  values self-check.
- **`explanation` is required and is where all reasoning lives.** It's shown after
  he answers, right or wrong. This is the only place a "because" belongs.
- **`description` is optional detail shown *under* the option before answering.**
  Leave it empty for graded quizzes: it's visible pre-answer, so it's a leak
  surface and it breaks option parallelism. Use it only when a label is genuinely
  ambiguous and the detail is neutral ("refers to the operator, not the vector" —
  never "correct because…").
- **Three content options** by default. Fewer is guessable; more is a reading
  test. Options must be parallel in length, specificity, and register.
- **Never mark a recommended option, never order them, never hint in `details`**
  ("think about the units"). If the set is still tellable cold, rebuild it with
  the procedure in `SKILL.md` → Quizzes.

## Scoring after the tool returns

- `correct: true` → lock-in for that node. Log it, advance.
- `correct: false` → that node is not solid. Stay, re-motivate, or insert a
  prerequisite node. Log the misconception.
- `dontKnow: true` → `unknown` / `blocked` for that strand. Not a guess, not a
  wrong answer. On a lock-in check, treat as a miss and fix the node.

Map the selected label to its letter **only in the map/session file**, for the
quiz log. Do not re-pose the question in chat afterwards, and do not re-run it
"to be sure" — a re-ask teaches him to hedge.

## Probe specifics

Ask one question per call, then adapt. Start wide ("what kind of object is
this?"), then split the strand the answer left ambiguous. Include a genuine
floor and a genuine ceiling per strand — see the bracketing rules in `SKILL.md`
→ Phase 1.
