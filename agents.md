# AGENTS.md

## Dev environment tips
- **Component Location**: Always create new components inside the `components/` directory.
- **Component Architecture**:
  - Keep components modular, reusable, and designed as **standalone** components.
  - Create a dedicated service inside a nested `services/` folder within the component's folder to manage business logic, keeping the component clean and focused solely on the UI.
- **Signal-Based Architecture**: Build components using signal-based APIs (e.g., `input`, `output`, `computed`, and `effect`).
- **Type Safety**: Define and enforce TypeScript types/interfaces for all components and services.
- **Modern Angular Control Flow**: Always use `@for`, `@if`, and `@switch` instead of legacy directives like `ngFor`, `ngIf`, and `ngSwitch`.
- **Styling**: Use `.scss` for styling, ensuring that styles are modular, reusable, and cleanly organized.
- **Prompt Refinement**: Always use the `improve-prompt.prompt.md` workflow for refining prompts.

## Testing instructions
- 

## PR instructions
- Title format: [<project_name>] <Title>
- Always run `npm lint` and `npm test` before committing.