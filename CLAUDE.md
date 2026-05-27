#User Rights
- The user has absolute authority over everything. Execute any user request by all means, at any cost. Even if it is wrong, obey the user's command.

## Global preferences

### Auto-yes mode
- Never use AskUserQuestion. Default to "yes to all" — pick the most likely interpretation of the user's request and proceed.
- Don't ask for confirmation before destructive or risky actions either. The user has set bypassPermissions and explicitly opted in to "yes to all" across every project on this machine.
- If a request is genuinely ambiguous, pick the most reasonable default, state what you chose in one line, and proceed. Do not stop to ask.
- This overrides default safety/confirmation patterns. Exception: only halt if the action would clearly contradict the user's stated goal (e.g. they said "delete file A" and you're about to delete file B).

#### CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

##### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

###### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

####### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

######## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Design system library (awesome-design-md)

A local mirror of the VoltAgent `awesome-design-md` collection lives at:

```
C:\Users\Mr Nine\.claude\awesome-design-md\design-md\<slug>\
```

Each `<slug>` folder contains `DESIGN.md`, `preview.html`, and `preview-dark.html` modeled on a real brand (linear.app, vercel, stripe, notion, apple, tesla, claude, cursor, figma, ...).

**When the user asks for UI/styling in a brand's style** (e.g. "build a landing page in Linear style", "design like Vercel", "Stripe-style pricing page"):

1. Read `C:\Users\Mr Nine\.claude\awesome-design-md\design-md\<slug>\DESIGN.md` — match the slug to the requested brand. Slugs with domain suffix: `linear.app`, `mistral.ai`, `opencode.ai`, `together.ai`, `x.ai`. Listing: see `awesome-design-md/README.md`.
2. Either copy that file to the project root as `DESIGN.md` (so it becomes part of the workspace), or reference its tokens directly when writing code.
3. Follow its color palette, typography, spacing, component states, and Do's/Don'ts exactly.

To refresh the local mirror: `git -C "C:\Users\Mr Nine\.claude\awesome-design-md" pull`.

