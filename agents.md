# AGENTS.md

## Dev environment tips
- **Component Location**: Always create new components inside the `components/` directory.
- **Component Architecture**:
  - Keep components modular, reusable, and designed as **standalone** components.
  - Create a dedicated service inside a nested `services/` folder within the component's folder to manage business logic, keeping the component clean and focused solely on the UI.
  - create a dedicated `index.ts` file that exports the component ts file with `export * from './component-name.component';` and same for its related types and services like `export * from './types/component-name.types';` and `export * from './services/component-name.service';`.
- **Signal-Based Architecture**: Build components using signal-based APIs (e.g., `input`, `output`, `computed`, `effect`,and `viewChild`).
- **Type Safety**: Define and enforce TypeScript types/interfaces for all components and services.
- **Modern Angular Control Flow**: Always use `@for`, `@if`, and `@switch` instead of legacy directives like `ngFor`, `ngIf`, and `ngSwitch`.
- **Styling**: Use `.scss` for styling, ensuring that styles are modular, reusable, and cleanly organized.
- **Prompt Refinement**: Always use the `improve-prompt.prompt.md` workflow for refining prompts.

