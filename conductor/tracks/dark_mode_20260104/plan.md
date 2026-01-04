# Plan: Dark Mode Support

This plan outlines the implementation of dark mode support for StoryCraft, including theme configuration, persistence, and a header toggle.

## Phase 1: Foundation & Theme Configuration
- [ ] Task: Configure Tailwind CSS for class-based dark mode
    - [ ] Sub-task: Update `tailwind.config.ts` to include `darkMode: 'class'`
    - [ ] Sub-task: Verify base dark mode styles in `globals.css`
- [ ] Task: Define dark theme color tokens
    - [ ] Sub-task: Define CSS variables for dark mode in `globals.css`
    - [ ] Sub-task: Map Radix UI/Tailwind colors to dark mode variants
- [ ] Task: Conductor - User Manual Verification 'Foundation & Theme Configuration' (Protocol in workflow.md)

## Phase 2: Theme Management Logic
- [ ] Task: Create Theme Context and Provider
    - [ ] Sub-task: Write unit tests for `useTheme` hook (toggle logic, persistence)
    - [ ] Sub-task: Implement `ThemeProvider` with system preference detection and `localStorage` persistence
- [ ] Task: Integrate ThemeProvider into the root layout
    - [ ] Sub-task: Update `app/layout.tsx` or `app/client-layout.tsx` to wrap the application
- [ ] Task: Conductor - User Manual Verification 'Theme Management Logic' (Protocol in workflow.md)

## Phase 3: UI Implementation
- [ ] Task: Implement Theme Toggle Component
    - [ ] Sub-task: Write unit tests for `ThemeToggle` component
    - [ ] Sub-task: Create `ThemeToggle` component using Radix UI primitives and Lucide icons (Sun/Moon)
- [ ] Task: Add Toggle to Header
    - [ ] Sub-task: Update header component to include `ThemeToggle` next to the user profile
- [ ] Task: Audit existing components for dark mode compatibility
    - [ ] Sub-task: Ensure all core UI components (buttons, cards, inputs) look correct in dark mode
- [ ] Task: Conductor - User Manual Verification 'UI Implementation' (Protocol in workflow.md)

## Phase 4: Final Polishing
- [ ] Task: Ensure accessibility compliance
    - [ ] Sub-task: Verify contrast ratios in dark mode using automated tools/manual check
- [ ] Task: Final end-to-end verification
    - [ ] Sub-task: Verify theme persistence across page reloads and browser sessions
- [ ] Task: Conductor - User Manual Verification 'Final Polishing' (Protocol in workflow.md)
