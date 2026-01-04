# Plan: Centralized Image Generation Action

Refactor image generation logic into a unified shared action to eliminate duplication and standardize prompt engineering across the application.

## Phase 1: Shared Action Development [checkpoint: df1cbea]

- [x] Task: Create centralized image generation action b8e1a4a
    - [x] Sub-task: Create `app/features/shared/actions/image-generation.ts`

    - [x] Sub-task: Implement `generateImageForScenario` with R2I, YAML formatting, and collage logic

- [x] Task: Write unit tests for centralized action b8e1a4a
    - [x] Sub-task: Create `__tests__/features/shared/actions/image-generation.test.ts`

    - [x] Sub-task: Verify character filtering and part assembly logic

- [x] Task: Conductor - User Manual Verification 'Shared Action Development' (Protocol in workflow.md)

## Phase 2: Create Flow Refactoring [checkpoint: 55ac0c4]

- [x] Task: Refactor `generateScenario` action 95a9f12
    - [x] Sub-task: Update `app/features/create/actions/generate-scenario.ts` to use `generateImageForScenario`
    - [x] Sub-task: Remove redundant prompt building and R2I logic
- [x] Task: Conductor - User Manual Verification 'Create Flow Refactoring' (Protocol in workflow.md)

## Phase 3: Storyboard Flow Refactoring [checkpoint: 67a4b60]

- [x] Task: Refactor `generateStoryboard` action 8c28d9f
    - [x] Sub-task: Update `app/features/scenario/actions/generate-scenes.ts` to use `generateImageForScenario`
    - [x] Sub-task: Remove duplicated scene generation logic
- [x] Task: Conductor - User Manual Verification 'Storyboard Flow Refactoring' (Protocol in workflow.md)

## Phase 4: API ## Phase 4: API & Route Refactoring Route Refactoring [checkpoint: e87126c]

- [x] Task: Refactor image regeneration route dd63802
    - [x] Sub-task: Update `app/api/regenerate-image/route.ts` to use the centralized action
    - [x] Sub-task: Standardize input handling and error responses
- [x] Task: Conductor - User Manual Verification 'API - [~] Task: Conductor - User Manual Verification 'API & Route Refactoring' Route Refactoring' (Protocol in workflow.md)

## Phase 5: Finalization [checkpoint: 2978e12]

- [x] Task: Final cleanup and validation 31beeee
    - [x] Sub-task: Remove any remaining unused imports or legacy generation functions
    - [x] Sub-task: Run full test suite to ensure no regressions
- [x] Task: Conductor - User Manual Verification 'Finalization' (Protocol in workflow.md) 2978e12
