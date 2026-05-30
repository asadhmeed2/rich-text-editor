# AGENTS.md

## Dev environment tips
- while creating a new component make sure to create it in the components folder.
- component should be modular and reusable.
- a stand alone component.
- while creating a component create a service in `services/` folder in the same folder for it for the business logic and keep the component clean and focused on the UI.
- the code in every component should use the signal based architecture (inputs, outputs,computed signals and effect etc).
- create types for everything and use them where needed.
- use @for, @if, @switch instead of ngFor, ngIf, ngSwitch.
- use .scss for styling and make sure to use modular and reusable styles.
- use `improve-prompt.prompt.md` for every prompt.

## Testing instructions
- 

## PR instructions
- Title format: [<project_name>] <Title>
- Always run `pnpm lint` and `pnpm test` before committing.