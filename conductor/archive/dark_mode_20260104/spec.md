# Specification: Dark Mode Support

## Overview
This track involves implementing a comprehensive dark mode theme for the StoryCraft platform and adding a user-accessible toggle in the application header. The goal is to improve usability in low-light environments and provide user customization for the interface.

## Functional Requirements
- **Theme Implementation**: Define dark mode color tokens using Tailwind CSS's `dark:` variant or CSS custom properties.
- **Theme Persistence**:
    - Default to the user's system preference (`prefers-color-scheme`).
    - Allow users to manually toggle between light and dark modes.
    - Persist the user's manual choice in `localStorage`.
- **Header Toggle**:
    - Add a toggle button to the right side of the main header, positioned next to the user profile/avatar.
    - The button should use an icon-only switch (Sun icon for light, Moon icon for dark).

## Non-Functional Requirements
- **Accessibility**: Ensure high contrast in both light and dark modes (WCAG AA).
- **Performance**: Theme switching should be instantaneous without page reloads.

## Acceptance Criteria
- [ ] Tailwind CSS configuration supports dark mode (using the `class` strategy).
- [ ] Global CSS variables and Radix UI colors are correctly mapped for both themes.
- [ ] A `ThemeProvider` or similar utility manages theme state via React Context.
- [ ] The header toggle button correctly switches themes and updates icons.
- [ ] User preference is saved in `localStorage` and applied on initial page load.
- [ ] Dark mode correctly defaults to system preference if no manual override is present.

## Out of Scope
- Support for additional color themes beyond Light and Dark.
- Storing theme preference in the database/user profile.
