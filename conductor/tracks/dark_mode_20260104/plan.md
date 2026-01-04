# Plan: Dark Mode Support

This plan outlines the implementation of dark mode support for StoryCraft, including theme configuration, persistence, and a header toggle.

## Phase 1: Foundation & Theme Configuration
- [x] Task: Configure Tailwind CSS for class-based dark mode 6316233
    - [x] Sub-task: Update `tailwind.config.ts` to include `darkMode: 'class'`
    - [x] Sub-task: Verify base dark mode styles in `globals.css`
- [x] Task: Define dark theme color tokens 6316233
    - [x] Sub-task: Define CSS variables for dark mode in `globals.css`
    - [x] Sub-task: Map Radix UI/Tailwind colors to dark mode variants
- [x] Task: Conductor - User Manual Verification 'Foundation & Theme Configuration' (Protocol in workflow.md) [checkpoint: 1ef82eb]

## Phase 2: Theme Management Logic
- [x] Task: Create Theme Context and Provider 015531a
    - [x] Sub-task: Write unit tests for `useTheme` hook (toggle logic, persistence)
    - [x] Sub-task: Implement `ThemeProvider` with system preference detection and `localStorage` persistence
- [x] Task: Integrate ThemeProvider into the root layout 015531a
    - [x] Sub-task: Update `app/layout.tsx` or `app/client-layout.tsx` to wrap the application
- [ ] Task: Conductor - User Manual Verification 'Theme Management Logic' (Protocol in workflow.md)

## Phase 3: UI Implementation
- [x] Task: Implement Theme Toggle Component f605764
    - [x] Sub-task: Write unit tests for `ThemeToggle` component
    - [x] Sub-task: Create `ThemeToggle` component using Radix UI primitives and Lucide icons (Sun/Moon)
- [x] Task: Add Toggle to Header f605764
    - [x] Sub-task: Update header component to include `ThemeToggle` next to the user profile
- [x] Task: Audit existing components for dark mode compatibility f605764
    - [x] Sub-task: Ensure all core UI components (buttons, cards, inputs) look correct in dark mode
- [x] Task: Conductor - User Manual Verification 'UI Implementation' (Protocol in workflow.md) [checkpoint: f605764]

## Phase 4: Final Polishing
- [ ] Task: Ensure accessibility compliance
    - [ ] Sub-task: Verify contrast ratios in dark mode using automated tools/manual check
- [ ] Task: Final end-to-end verification
    - [ ] Sub-task: Verify theme persistence across page reloads and browser sessions
- [ ] Task: Conductor - User Manual Verification 'Final Polishing' (Protocol in workflow.md)
