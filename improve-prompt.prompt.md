---
mode: 'agent'
description: 'Rewrite a rough prompt into a clear, structured request and execute it'
---

First, rewrite the user's rough input into a clear, well-structured prompt that is specific and unambiguous. Then present it to the user for confirmation before executing.

## Rewriting rules

- Be specific — expand vague words like "fix", "improve", "handle", "make it work" into concrete actions.
- Include context the user implied but didn't state (language, framework, file type) if obvious.
- If intent is unclear, pick the most reasonable interpretation and make it explicit.
- Keep it concise — no filler, no padding.

## Steps

1. Rewrite the user's rough input using the rules above.
2. Display the improved prompt to the user inside a quoted block.
3. **STOP. Do NOT execute yet.** Use the `vscode_askQuestions` tool to present a confirmation with two button options: "Execute" and "Cancel" (set `allowFreeformInput` to `false`). Wait for the user's selection.
4. If the user selects **Execute**, carry out the improved prompt immediately.
5. If the user selects **Cancel**, stop and do nothing.

## User's rough input

${input}
