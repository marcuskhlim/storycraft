# Specification: Add Authentication to Server Actions

## Overview
This track focuses on securing all Server Actions within the StoryCraft application. Currently, several server actions may lack consistent session verification, posing a security risk. We will implement a centralized authentication utility and apply it to every Server Action to ensure only authorized users can perform mutations and AI operations.

## Functional Requirements
- **Authentication Utility**: Create a utility (e.g., `validateAuth` or `requireSession`) in `lib/api/auth-utils.ts` (or similar).
- **Session Verification**: The utility must verify the existence of a valid `auth.js` session.
- **Error Handling**: If authentication fails, the utility must return or throw a standardized error response/exception (e.g., `{ error: "Unauthorized" }` or a specific `AuthError`).
- **Universal Application**: Apply this utility as an inline check at the beginning of every Server Action in the following features:
    - `app/features/scenario/actions/`
    - `app/features/storyboard/actions/`
    - `app/features/create/actions/`
    - `app/features/shared/actions/` (if any)
    - Any other miscellaneous server actions in `app/actions/`.

## Non-Functional Requirements
- **Security**: Prevent unauthorized access to data mutations and expensive AI operations.
- **Consistency**: Ensure all server actions follow the same authentication pattern.
- **Performance**: The authentication check should be lightweight and leverage existing session caching from `auth.js`.

## Acceptance Criteria
- [ ] A reusable authentication utility is implemented.
- [ ] All 12+ identified Server Action files are updated to include the authentication check.
- [ ] Manual verification confirms that unauthenticated calls to these actions return an "Unauthorized" error.
- [ ] Unit tests are updated or created to verify authentication logic in at least one key action.

## Out of Scope
- Implementation of ownership checks (e.g., "Is this story owned by this user?"). This will be handled in a separate track.
- Updates to standard API Route Handlers (which are also a separate item in the improvement list).
