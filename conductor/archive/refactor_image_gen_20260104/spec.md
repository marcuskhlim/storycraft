# Specification: Centralized Image Generation Action

## Overview

This track refactors and centralizes image generation logic in StoryCraft. Currently, prompt building (YAML), Reference-to-Image (R2I) handling, and collage management are duplicated across `generate-scenario.ts`, `generate-scenes.ts`, and `regenerate-image/route.ts`. We will create a unified server action in the shared feature directory to consolidate these operations.

## Functional Requirements

- **Unified Action**: Create `app/features/shared/actions/image-generation.ts` as the central hub.
- **Consolidated Logic**: Implement `generateImageForScenario` to handle:
    - Filtering `presentCharacters`, `props`, and `settings` based on the prompt.
    - Constructing multi-part Gemini R2I prompts.
    - Automatic YAML-formatted prompt generation.
    - Conditional collage creation when reference parts exceed model limits.
    - Integration with `styleImageUri` for visual consistency.
- **Migration to Gemini**: Standardize on the Gemini `generateImage` (R2I) capability for all scenario-related generations.
- **Refactor Callers**: Update the following to use the new action:
    - `app/features/create/actions/generate-scenario.ts`
    - `app/features/scenario/actions/generate-scenes.ts`
    - `app/api/regenerate-image/route.ts`

## Non-Functional Requirements

- **Type Safety**: Maintain strict TypeScript typing for scenario and prompt objects.
- **Observability**: Ensure consistent logging through the centralized action.

## Acceptance Criteria

- [ ] `app/features/shared/actions/image-generation.ts` is created.
- [ ] Duplicated logic is removed from existing actions and routes.
- [ ] Unit tests verify prompt assembly and collage logic.
- [ ] Scene and entity generation remains functional with the new action.
