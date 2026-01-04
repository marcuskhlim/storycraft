# Plan: Add Authentication to Server Actions

## Phase 1: Foundation & Shared Utility [checkpoint: a7f8399]
- [x] Task: Create `lib/api/auth-utils.ts` and implement the authentication utility. 81bf4a3
- [x] Task: Write unit tests for the authentication utility in `__tests__/lib/api/auth-utils.test.ts`. 81bf4a3
- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Shared Utility' (Protocol in workflow.md)

## Phase 2: Secure Feature Actions [checkpoint: db5c9ba]
- [x] Task: Apply auth check to `app/features/scenario/actions/`. b6bb509
- [x] Task: Apply auth check to `app/features/storyboard/actions/`. 2d640b5
- [x] Task: Apply auth check to `app/features/create/actions/`. 96ddb07
- [x] Task: Apply auth check to any miscellaneous actions in `app/actions/`. 156ed44
- [x] Task: Write integration tests for a sample of secured actions to verify "Unauthorized" response when no session exists. 156ed44
- [x] Task: Conductor - User Manual Verification 'Phase 2: Secure Feature Actions' (Protocol in workflow.md)

## Phase 3: Verification & Cleanup [checkpoint: 516c7da]
- [x] Task: Run full project check (`npm run check`) to ensure no regressions. 5de3db2
- [x] Task: Perform manual verification by attempting to trigger actions while logged out. 5de3db2
- [x] Task: Conductor - User Manual Verification 'Phase 3: Verification & Cleanup' (Protocol in workflow.md)
