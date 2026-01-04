# StoryCraft Codebase Improvement Report

**Generated:** 2026-01-04
**Scope:** Full application analysis covering architecture, code quality, security, performance, and maintainability.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Issues (Fix Immediately)](#2-critical-issues)
3. [API Routes](#3-api-routes)
4. [Server Actions](#4-server-actions)
5. [React Hooks](#5-react-hooks)
6. [Zustand Stores](#6-zustand-stores)
7. [React Components](#7-react-components)
8. [Utility Functions](#8-utility-functions)
9. [TypeScript Types](#9-typescript-types)
10. [Error Handling](#10-error-handling)
11. [Test Coverage](#11-test-coverage)
12. [CSS & Styling](#12-css--styling)
13. [Recommended Actions by Priority](#13-recommended-actions-by-priority)

---

## 1. Executive Summary

This analysis identified **150+ improvement opportunities** across the StoryCraft codebase. Key findings:

| Category | Issues Found | Severity |
|----------|-------------|----------|
| Security (Missing Auth) | 15 | **Critical** |
| Error Handling | 25 | High |
| Code Duplication | 30+ | Medium |
| Performance | 20 | Medium |
| Type Safety | 15 | Medium |
| Test Coverage | ~85% missing | Medium |
| Styling Inconsistencies | 20 | Low |

**Top 3 Priority Fixes:**
1. Add authentication checks to all 12 server actions
2. Fix silent error handling in `ffmpeg.ts` and `storage.ts`
3. Standardize error handling patterns across API routes

---

## 2. Critical Issues

### 2.1 Missing Authentication in Server Actions

**Severity:** Critical
**Impact:** Unauthorized users could potentially invoke server actions

All 12 server actions lack authentication checks:

| File | Location |
|------|----------|
| `resize-image.ts` | `app/features/storyboard/actions/` |
| `upload-image.ts` | `app/features/storyboard/actions/` |
| `image-generation.ts` | `app/features/shared/actions/` |
| `upload-to-gcs.ts` | `app/features/shared/actions/` |
| `generate-scenes.ts` | `app/features/scenario/actions/` |
| `modify-scenario.ts` | `app/features/scenario/actions/` |
| `generate-scenario.ts` | `app/features/create/actions/` |
| `generate-music.ts` | `app/features/editor/actions/` |
| `generate-voiceover.ts` | `app/features/editor/actions/` |
| `generate-video.ts` | `app/features/editor/actions/` |
| `conversational-edit.ts` | `app/features/editor/actions/` |
| `storageActions.ts` | `app/features/shared/actions/` |

**Fix:** Add authentication wrapper:
```typescript
import { auth } from "@/auth";

export async function myServerAction(data: Input) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  // ... action logic
}
```

### 2.2 Silent Error Handling

**Severity:** Critical

**File:** `lib/utils/ffmpeg.ts:47-48`
```typescript
// Returns string "error" instead of proper error
return "error";  // Line 48
```
**Impact:** Downstream code receives invalid GCS URI, causing cascading failures.

**File:** `lib/storage/storage.ts:31`
```typescript
return null;  // Silent config failure
```
**Impact:** Missing env vars cause runtime errors without clear error messages.

### 2.3 Missing Try-Catch in API Routes

**File:** `app/api/scene/route.ts:10-32`
- No try-catch protection
- JSON parsing and database calls unprotected

**File:** `app/api/videos/route.ts:49`
- JSON parsing outside try-catch block

---

## 3. API Routes

### 3.1 Code Duplication (13+ instances)

**Pattern repeated across 7 files:**
```typescript
const session = await auth();
if (!session?.user?.id) {
    return unauthorizedResponse();
}
```

**Recommendation:** Create middleware wrapper:
```typescript
// lib/api/with-auth.ts
export function withAuth(handler: AuthHandler) {
  return async (req: NextRequest) => {
    const session = await auth();
    if (!session?.user?.id) return unauthorizedResponse();
    return handler(req, session);
  };
}
```

### 3.2 Inconsistent Response Formats

| File | Pattern |
|------|---------|
| `media/route.ts:10` | Raw `NextResponse("Unauthorized")` |
| `scenarios/route.ts` | Uses `errorResponse()` helper |
| `videos/route.ts` | Uses `errorResponse()` helper |

**Fix:** Standardize all routes to use `lib/api/response.ts` helpers.

### 3.3 Missing Ownership Checks

| Route | Issue |
|-------|-------|
| `regenerate-image/route.ts` | Doesn't verify scenario belongs to user |
| `videos/route.ts` | No ownership verification |
| `scene/route.ts` | Any user can modify scenes |

### 3.4 Missing Security Features

- No request size limits on any route
- No rate limiting per endpoint
- Environment variables not validated at startup

---

## 4. Server Actions

### 4.1 Validation Pattern Duplication

Same pattern appears 10+ times:
```typescript
const parseResult = Schema.safeParse(data);
if (!parseResult.success) {
    throw new Error(`Invalid input: ${parseResult.error.message}`);
}
```

**Recommendation:** Create utility:
```typescript
// lib/utils/validation.ts
export function validateInput<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}
```

### 4.2 Inconsistent Error Handling

| Pattern | Files | Example |
|---------|-------|---------|
| Throws errors | 7 files | `generate-music.ts`, `generate-voiceover.ts` |
| Returns `{success: false}` | 3 files | `image-generation.ts`, `generate-video.ts` |
| Returns null | 1 file | `getDynamicImageUrl` |

**Recommendation:** Standardize on one approach.

### 4.3 Memory/Performance Risks

**File:** `storyboard/actions/resize-image.ts:140-224`
- Collage creation loads all images into memory
- No size limit checks

**File:** `create/actions/generate-scenario.ts:100-160`
- `pLimit(10)` multiplied by 3 resource types = 30 concurrent requests possible

---

## 5. React Hooks

### 5.1 Debounce Logic Duplication

**Files with identical debounce pattern:**
- `app/features/scenario/hooks/use-scenario.ts:65-78`
- `app/features/editor/hooks/use-timeline.ts:44-62`

**Recommendation:** Create shared hook:
```typescript
// app/features/shared/hooks/use-debounced-callback.ts
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T
```

### 5.2 Missing Cleanup Functions

| File | Issue |
|------|-------|
| `use-mediabunny.ts` | `videoSources` and `audioSources` maps not cleaned up |
| `use-scenario.ts:65-78` | Debounce timeout not cleared on unmount |
| `use-timeline.ts:44-62` | Same debounce cleanup issue |

### 5.3 Error Message Pattern Duplication

Same pattern repeated 10+ times:
```typescript
const message = error instanceof Error
  ? error.message
  : "An unknown error occurred";
```

**Recommendation:** Create `useErrorHandler` hook.

### 5.4 Missing Error States

| File | Issue |
|------|-------|
| `use-file-upload.ts:10-40` | No error handling for FileReader failures |
| `use-image-upload.ts:11-39` | Missing error state in return |
| `use-mediabunny.ts` | Errors logged but not exposed to callers |

---

## 6. Zustand Stores

### 6.1 Missing Persistence

**File:** `app/features/scenario/stores/useScenarioStore.ts`

Form state is lost on page refresh:
- `pitch`, `name`, `style`, `aspectRatio`, etc.

**Recommendation:** Add Zustand persist middleware.

### 6.2 Missing Selectors (Performance)

Multiple files destructure entire store:
```typescript
const { scenario, setScenario, setErrorMessage } = useScenarioStore();
```

**Files affected:**
- `use-storyboard-tab-state.ts:13-14`
- `use-create-tab-state.ts:22`
- `sidebar.tsx:38-39`
- `editor-tab.tsx:23, 25`

**Impact:** Any store change triggers re-renders.

**Fix:** Use selectors:
```typescript
const scenario = useScenarioStore((state) => state.scenario);
const setScenario = useScenarioStore((state) => state.setScenario);
```

### 6.3 Race Conditions

**File:** `use-scenario.ts:44, 149`
```typescript
useScenarioStore.getState().currentScenarioId
```

**Issue:** `getState()` in async functions can return stale values.

---

## 7. React Components

### 7.1 Oversized Components

| File | Lines | Recommendation |
|------|-------|----------------|
| `mediabunny-player.tsx` | 1,026 | Split into AudioManager, VideoPreloader, PlaybackController |
| `edit-scene-modal.tsx` | 728 | Extract GeneralTab, ImagePromptTab, VideoPromptTab |
| `editor-tab.tsx` | 644 | Extract media initialization into hooks |
| `sidebar.tsx` | 393 | Extract SettingsDialog, ScenariosList |
| `entity-card.tsx` | 226 | Extract EditMode, DisplayMode |

### 7.2 Missing Accessibility

| Component | Issue |
|-----------|-------|
| `edit-scene-modal.tsx:299-352` | Custom tabs missing `aria-selected`, `aria-controls` |
| `list-view.tsx:94-121` | Tab navigation missing ARIA attributes |
| `scene-card.tsx:125-186` | Icon buttons missing `aria-label` |
| `mediabunny-player.tsx:907-921` | Video elements missing `aria-label` |
| `sidebar.tsx:118-128` | Toggle button missing `aria-expanded` |

### 7.3 Performance Issues

**Missing `React.memo()` on:**
- `edit-scene-modal.tsx`
- `conversational-edit-modal.tsx`
- `grid-view.tsx`
- `mediabunny-player.tsx`

**Missing `useCallback` on:**
- `edit-scene-modal.tsx:87-196` - 4 update functions recreated every render

**Unoptimized list rendering:**
- `scenario-tab.tsx:80, 115, 148` - Using array index as `key`

### 7.4 Duplicated UI Patterns

**Sidebar scenario construction (lines 60-78 and 85-103):**
- Same `Scenario` object created in try and catch blocks

**Tab navigation pattern:**
- Duplicated in `edit-scene-modal.tsx` and `list-view.tsx`

---

## 8. Utility Functions

### 8.1 Duplicated Functions

**GCS bucket extraction (3 locations):**
```typescript
GCS_VIDEOS_STORAGE_URI.replace("gs://", "").split("/")[0]
```
- `lib/api/lyria.ts:68-71`
- `lib/api/tts.ts:106-108`
- `lib/utils/ffmpeg.ts:592-594`

**File upload to GCS (3 locations):**
- `lib/api/lyria.ts:76-84`
- `lib/api/tts.ts:113-121`
- `lib/utils/ffmpeg.ts:599-606`

**Global client caching (5 locations):**
- `lib/api/auth-utils.ts:3-13`
- `lib/api/gemini.ts:17-29`
- `lib/api/tts.ts:11-20`
- `lib/storage/storage.ts`
- `lib/storage/firestore.ts`

### 8.2 Missing Caching

| Function | Issue |
|----------|-------|
| `getAccessToken()` | Called for every API request, should cache with TTL |
| `listVoices()` | Static data, cache by language for 24h |
| `ffprobe` operations | File I/O for same files repeated |

### 8.3 Inconsistent Retry Configuration

| File | maxRetries |
|------|------------|
| `imagen.ts:73` | 5 |
| `imagen.ts:142` | 1 |
| `lyria.ts:87` | 1 |
| `veo.ts:149` | 5 |

---

## 9. TypeScript Types

### 9.1 Duplicated Type Definitions

**ViewMode & DisplayMode:**
- `app/features/storyboard/hooks/use-storyboard-tab-state.ts:8-9`
- `app/features/storyboard/components/storyboard-header.tsx:16-17`

**ThumbnailData (different structures, same name):**
- `app/features/editor/hooks/use-mediabunny.ts:24-28`
- `app/features/editor/components/video-thumbnail.tsx:19-22`

### 9.2 Loose Index Signatures

**File:** `app/types.ts:37-42`
```typescript
export interface Entity {
    name: string;
    description: string;
    [key: string]: string | number | boolean | undefined | null;
}
```

**Issue:** Allows any property, defeats type safety.

### 9.3 `any` Usage

**File:** `types/api.ts:8`
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
details?: any;
```

### 9.4 Empty Type Directories

All feature `types/` directories are empty:
- `app/features/storyboard/types/`
- `app/features/shared/types/`
- `app/features/scenario/types/`
- `app/features/create/types/`
- `app/features/editor/types/`

---

## 10. Error Handling

### 10.1 Inconsistent Patterns

| Pattern | Files |
|---------|-------|
| Throws errors | `generate-music.ts`, `generate-voiceover.ts`, `modify-scenario.ts` |
| Returns `{success: false}` | `image-generation.ts`, `generate-video.ts`, `conversational-edit.ts` |
| Returns null | `getDynamicImageUrl`, `storage.ts` |

### 10.2 Swallowed Errors

| File | Line | Issue |
|------|------|-------|
| `use-settings.tsx` | 32-36 | JSON parse error logged, silently returns defaults |
| `use-storyboard-actions.ts` | 100-104 | Timeline reset failure swallowed |
| `use-scenario.ts` | 58-60 | Catches and re-throws without context |

### 10.3 Missing Error Boundaries

Only one ErrorBoundary exists at `app/features/shared/components/error-boundary.tsx`.

**Not wrapped:**
- Create tab
- Scenario tab
- Storyboard tab
- Editor tab

### 10.4 `console.error` Usage

Should use logger instances instead:

| File | Line |
|------|------|
| `conversational-edit-modal.tsx` | 69 |
| `page.tsx` | 132 |
| `use-settings.tsx` | 33 |

---

## 11. Test Coverage

### 11.1 Coverage Statistics

| Category | Total | Tested | Coverage |
|----------|-------|--------|----------|
| Stores | 3 | 2 | 67% |
| Hooks | 28 | 3 | 11% |
| Actions | 12 | 3 | 25% |
| Components | 30+ | 1 | 3% |
| Utilities | 12 | 2 | 17% |
| API Routes | 3+ | 2 | 67% |
| **Total** | **88+** | **13** | **~15%** |

### 11.2 Critical Missing Tests

**High Priority:**
- `lib/utils/retry.ts` - Exponential backoff logic
- `lib/utils/rate-limit.ts` - Rate limiting
- `app/features/editor/hooks/use-timeline.ts` - Debounced saves
- `app/features/scenario/hooks/use-scenario.ts` - Scenario persistence
- `app/features/shared/actions/upload-to-gcs.ts` - GCS uploads

**Medium Priority:**
- All editor actions (music, voiceover, video generation)
- All storyboard actions (resize, upload)
- Authentication hooks

### 11.3 Test Setup Duplication

Mock setup duplicated across:
- `users/route.test.ts:6-27`
- `scenarios/route.test.ts:6-27`

**Recommendation:** Extract to `__tests__/lib/test-helpers/mock-setup.ts`

---

## 12. CSS & Styling

### 12.1 Hardcoded Colors

| File | Issue |
|------|-------|
| `style-selector.tsx:110-111` | `#0EA5E9` instead of `primary` |
| `video-config-form.tsx:70` | `text-[#0EA5E9]` |
| `format-selector.tsx:49` | `bg-[#0EA5E9]` |
| `stepper.tsx:45, 70` | `text-blue-600` instead of `text-primary` |

### 12.2 Dark Mode Inconsistencies

**Using hardcoded grays instead of semantic variables:**
- `story-basics-form.tsx:57` - `bg-gray-50/50 dark:bg-gray-900/50`
- `style-selector.tsx:135` - `dark:hover:bg-zinc-900`
- `slider.tsx:37` - `bg-gray-200 dark:bg-gray-700`

### 12.3 Arbitrary Values

| File | Value | Recommendation |
|------|-------|----------------|
| `sidebar.tsx:112` | `w-[70px]`, `w-[280px]` | Add to Tailwind config |
| `edit-scene-modal.tsx:269` | `max-w-[1200px]` | Use `max-w-7xl` |
| `top-nav.tsx:32-33` | `text-[13px]`, `text-[10px]` | Use `text-xs`, `text-sm` |

### 12.4 Accessibility Issues

- Only 11 `aria-*` or `role=` attributes in entire codebase
- Icon buttons missing `aria-label`
- Custom tabs missing ARIA attributes

---

## 13. Recommended Actions by Priority

### Immediate (Security/Stability)

1. **Add auth to all server actions**
   - Create `withServerAuth` wrapper
   - Apply to all 12 action files

2. **Fix silent error handling**
   - `lib/utils/ffmpeg.ts:48` - Throw error instead of returning "error"
   - `lib/storage/storage.ts:31` - Throw instead of returning null

3. **Add try-catch to API routes**
   - `app/api/scene/route.ts` - Entire route unprotected
   - `app/api/videos/route.ts:49` - Move JSON parsing inside try block

4. **Add ownership checks**
   - `regenerate-image/route.ts`
   - `videos/route.ts`
   - `scene/route.ts`

### High Priority (Code Quality)

5. **Create shared utilities**
   - `withAuth` API middleware
   - `validateInput` helper
   - `useDebounce` hook
   - `useAsyncOperation` hook for loading states

6. **Standardize error handling**
   - Choose either throw or return pattern
   - Create custom error classes
   - Add error boundaries to all tabs

7. **Add persistence to ScenarioStore**
   - Prevent form data loss on refresh

8. **Fix store selector usage**
   - Replace destructuring with selectors
   - Prevent unnecessary re-renders

### Medium Priority (Maintainability)

9. **Consolidate duplicated code**
   - GCS bucket extraction
   - Auth pattern in API routes
   - Validation pattern in actions

10. **Add missing tests**
    - `retry.ts`, `rate-limit.ts`
    - Timeline and scenario hooks
    - All editor actions

11. **Split oversized components**
    - `mediabunny-player.tsx`
    - `edit-scene-modal.tsx`
    - `editor-tab.tsx`

12. **Fix TypeScript types**
    - Remove loose index signatures
    - Consolidate duplicate types
    - Populate empty type directories

### Low Priority (Polish)

13. **Standardize CSS**
    - Replace hardcoded colors with variables
    - Use Tailwind scale for sizes
    - Fix dark mode inconsistencies

14. **Improve accessibility**
    - Add ARIA attributes to custom tabs
    - Add `aria-label` to icon buttons
    - Wrap features in ErrorBoundary

15. **Cache API responses**
    - `getAccessToken()` with TTL
    - `listVoices()` by language

---

## Appendix: File References

### Files Requiring Immediate Attention

```
app/api/scene/route.ts
app/api/videos/route.ts
lib/utils/ffmpeg.ts
lib/storage/storage.ts
app/features/*/actions/*.ts (all 12 files)
```

### Files for Refactoring

```
app/features/editor/components/mediabunny-player.tsx
app/features/storyboard/components/edit-scene-modal.tsx
app/features/editor/components/editor-tab.tsx
app/features/shared/components/layout/sidebar.tsx
```

### Files Needing Tests

```
lib/utils/retry.ts
lib/utils/rate-limit.ts
app/features/editor/hooks/use-timeline.ts
app/features/scenario/hooks/use-scenario.ts
app/features/shared/actions/upload-to-gcs.ts
```
