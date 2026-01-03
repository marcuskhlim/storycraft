# Storycraft Application - Comprehensive Code Analysis

## Executive Summary

This document contains a thorough analysis of the Storycraft application, identifying improvements across security, performance, maintainability, code quality, and architecture. Issues are categorized by severity (Critical, High, Medium, Low) and organized by domain.

---

## Table of Contents

1. [Security Issues](#1-security-issues)
2. [Error Handling](#2-error-handling)
3. [Code Duplication](#3-code-duplication)
4. [Type Safety](#4-type-safety)
5. [Performance Optimizations](#5-performance-optimizations)
6. [Architecture & Separation of Concerns](#6-architecture--separation-of-concerns)
7. [Configuration Management](#7-configuration-management)
8. [API Design](#8-api-design)
9. [Database & Storage](#9-database--storage)
10. [Testing](#10-testing)
11. [Best Practices](#11-best-practices)
12. [Recommendations Summary](#12-recommendations-summary)

---

## 1. Security Issues

### Critical

#### 1.1 Rate Limiting Bypass for Anonymous Users

**File:** `middleware.ts:10`

```typescript
const userId = session?.user?.id || "anonymous";
await limiter.check(50, userId);
```

**Issue:** All unauthenticated requests share a single "anonymous" identifier, meaning collective anonymous traffic can exceed 50 requests/minute before any single user is blocked.

**Recommendation:** Use IP address or session token for anonymous users:

```typescript
const userId =
    session?.user?.id ||
    req.ip ||
    req.headers.get("x-forwarded-for") ||
    "anonymous";
```

#### 1.2 Missing Request Body Size Limits

**Files:** All API routes (`app/api/*/route.ts`)
**Issue:** No validation of request body size. Attackers could send very large payloads to cause memory exhaustion.

**Recommendation:** Add request size validation:

```typescript
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const body = await request.json();
if (JSON.stringify(body).length > MAX_BODY_SIZE) {
    return errorResponse("Request body too large", "PAYLOAD_TOO_LARGE", 413);
}
```

#### 1.3 Unsafe File Upload

**File:** `lib/storage/storage.ts:uploadImage`
**Issue:** No validation of file content/type before upload. Could allow malicious files.

**Recommendation:**

- Validate MIME type matches file extension
- Check file magic bytes
- Scan for embedded scripts in images
- Enforce maximum file size

### High

#### 1.4 Environment Variables Not Using Validated `env` Object

**Files:**

- `lib/api/imagen.ts:5-7` - Uses `process.env.LOCATION`, `process.env.PROJECT_ID`
- `lib/api/veo.ts:7-9` - Same issue
- `lib/api/tts.ts:8` - Uses `process.env.GCS_VIDEOS_STORAGE_URI`
- `lib/utils/ffmpeg.ts:10` - Uses `process.env.GCS_VIDEOS_STORAGE_URI`
- `lib/api/lyria.ts:10-12` - Same issue

**Issue:** Environment variables are validated in `lib/utils/env.ts` but many files bypass this and access `process.env` directly, which can be undefined.

**Recommendation:** All environment access should use the validated `env` object:

```typescript
import { env } from "@/lib/utils/env";
const LOCATION = env.LOCATION; // After adding to schema
```

#### 1.5 Content Security Policy Weaknesses

**File:** `middleware.ts:36-45`

```typescript
style-src 'self' 'unsafe-inline';
script-src '... ${isDev ? "'unsafe-eval'" : ""}';
```

**Issue:** `unsafe-inline` for styles allows inline style injection attacks.

**Recommendation:** Use style hashing or move to CSS modules.

### Medium

#### 1.6 No CSRF Token Validation

**Files:** All API routes
**Issue:** API routes don't verify CSRF tokens. While NextAuth provides some protection, explicit CSRF validation adds defense-in-depth.

#### 1.7 Verbose Error Messages in Production

**File:** `lib/utils/ffmpeg.ts:274`

```typescript
logger.debug("Spawned FFmpeg with command: " + commandLine);
```

**Issue:** FFmpeg command lines logged in debug mode could expose internal paths.

**Recommendation:** Ensure LOG_LEVEL defaults to 'warn' in production.

#### 1.8 No Input Sanitization for AI Prompts

**Files:** `lib/api/gemini.ts`, `lib/api/imagen.ts`, `lib/api/veo.ts`
**Issue:** User prompts are passed directly to AI services without sanitization.

**Recommendation:** Implement prompt sanitization to prevent injection attacks.

---

## 2. Error Handling

### Critical

#### 2.1 Functions Returning Strings Instead of Throwing Errors

**File:** `lib/utils/ffmpeg.ts:30-49`

```typescript
export function signedUrlToGcsUri(signedUrl: string): string {
    try {
        // ...
        if (parts.length < 3) {
            return "error less then 3 parts"; // Should throw!
        }
        // ...
    } catch (error) {
        return "error"; // Should throw!
    }
}
```

**Issue:** Function returns error strings that get used as actual GCS URIs downstream, causing cascading failures.

**Recommendation:** Throw proper errors:

```typescript
export function signedUrlToGcsUri(signedUrl: string): string {
    const url = new URL(signedUrl);
    const parts = url.pathname.split("/");
    if (parts.length < 3) {
        throw new Error(`Invalid signed URL format: ${signedUrl}`);
    }
    return `gs://${parts[1]}/${parts.slice(2).join("/")}`;
}
```

### High

#### 2.2 Inconsistent Error Handling Patterns

**Files:** Various API routes
**Issue:** Transaction errors are handled by throwing string messages like `"FORBIDDEN"` or `"NOT_FOUND"` which are then caught and converted to responses. This is fragile.

**Recommendation:** Create custom error classes:

```typescript
// lib/errors.ts
export class AppError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 500,
    ) {
        super(message);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden") {
        super("FORBIDDEN", message, 403);
    }
}
```

#### 2.3 Silent Failures

**File:** `lib/storage/storage.ts:31`

```typescript
if (!GCS_VIDEOS_STORAGE_URI) {
    logger.warn("GCS_VIDEOS_STORAGE_URI is not set...");
    return null; // Silent failure
}
```

**Issue:** Returns null instead of throwing, causing NullPointerExceptions downstream.

**File:** `lib/utils/client-export.ts:93-95`
**Issue:** Audio loading failures are silently ignored.

### Medium

#### 2.4 Unhandled Promise Rejections in ffprobe Callbacks

**File:** `lib/utils/ffmpeg.ts:354-375`
**Issue:** ffprobe callbacks don't always call reject/resolve, could leave promises hanging.

#### 2.5 Missing Error Types on Catch Blocks

**Files:** Multiple

```typescript
} catch (error) { // error is 'unknown'
    logger.error(`Error: ${error}`);
}
```

**Issue:** Error type is `unknown` but often used directly in string interpolation.

**Recommendation:** Type-check errors:

```typescript
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error: ${message}`);
}
```

---

## 3. Code Duplication

### High

#### 3.1 GCS URI Parsing Duplicated 5+ Times

**Files:**

- `lib/utils/ffmpeg.ts:592-598`
- `lib/api/tts.ts:106-112`
- `lib/api/lyria.ts` (similar pattern)
- Multiple locations in ffmpeg.ts (lines 493-508, 528-540, 551-567)

**Pattern repeated:**

```typescript
const bucketName = GCS_VIDEOS_STORAGE_URI.replace("gs://", "").split("/")[0];
const destinationPath = path.join(
    GCS_VIDEOS_STORAGE_URI.replace(`gs://${bucketName}/`, ""),
    fileName,
);
```

**Recommendation:** Create utility:

```typescript
// lib/utils/gcs.ts
export function parseGcsUri(uri: string): { bucket: string; path: string } {
    const match = uri.match(/gs:\/\/([^\/]+)\/?(.*)/);
    if (!match) throw new Error(`Invalid GCS URI: ${uri}`);
    return { bucket: match[1], path: match[2] };
}

export function buildGcsPath(basePath: string, fileName: string): string {
    const { bucket, path: baseDir } = parseGcsUri(basePath);
    return { bucket, fullPath: `${baseDir}/${fileName}` };
}
```

#### 3.2 Ownership Check Pattern Duplicated in Transactions

**Files:** `app/api/scenarios/route.ts:94-99`, `app/api/timeline/route.ts:50-54`

```typescript
if (existingData?.userId !== userId) {
    throw new Error("FORBIDDEN");
}
```

**Recommendation:** Create helper:

```typescript
// lib/api/ownership.ts
export function assertOwnership(
    data: { userId?: string } | undefined,
    userId: string,
): void {
    if (data?.userId !== userId) {
        throw new ForbiddenError("Resource does not belong to user");
    }
}
```

#### 3.3 HMR Global Client Pattern Duplicated

**Files:**

- `lib/storage/firestore.ts:4-9`
- `lib/storage/storage.ts:7-12`
- `lib/api/gemini.ts:16-29`
- `lib/api/tts.ts:10-20`
- `lib/api/auth-utils.ts` (similar)

**Recommendation:** Create factory:

```typescript
// lib/utils/singleton.ts
export function createSingleton<T>(name: string, factory: () => T): T {
    const globalForSingleton = global as unknown as Record<string, T>;
    if (!globalForSingleton[name]) {
        globalForSingleton[name] = factory();
    }
    return globalForSingleton[name];
}

// Usage:
const firestore = createSingleton('firestore', () => new Firestore({...}));
```

#### 3.4 Audio Duration Extraction Duplicated

**File:** `lib/utils/ffmpeg.ts`

- `getAudioDuration` (lines 132-151)
- `getAudioDurationFromBuffer` (lines 795-870)
- Similar logic in `concatenateVideos` (lines 361-368)

### Medium

#### 3.5 Schema Field Declarations Duplicated

**Files:** `app/types.ts` and `app/schemas.ts`
**Issue:** Types are defined in types.ts, then re-defined in schemas.ts with Zod. Some differences exist (e.g., Entity in types.ts has index signature not in schema).

**Recommendation:** Use Zod's `z.infer<>` to derive types from schemas (already done for some types but not all).

#### 3.6 API Response Pattern Not Always Used

**Files:** Some routes construct manual JSON responses instead of using `successResponse`/`errorResponse`.

---

## 4. Type Safety

### High

#### 4.1 Use of `any` Type

**File:** `types/api.ts:8`

```typescript
details?: any;
```

**Recommendation:** Change to `unknown` or define proper structure.

#### 4.2 Loose Index Signatures

**File:** `app/types.ts:41-42, 93`

```typescript
[key: string]: string | number | boolean | undefined | null;
```

**Issue:** Index signatures are too permissive, allowing any property with loose types.

**Recommendation:** Define explicit optional properties instead.

#### 4.3 Non-null Assertions Without Validation

**File:** `lib/api/gemini.ts:110, 121`

```typescript
for (const part of firstCandidate.content!.parts!) {
    // ...
    return { success: true, imageGcsUri: imageGcsUri! };
}
```

**Issue:** Non-null assertions (`!`) used without prior validation.

**File:** `lib/api/tts.ts:37`

```typescript
voice.name?.includes(voiceName!);
```

### Medium

#### 4.4 Missing Return Type Annotations

**Files:** Multiple async functions lack explicit return type annotations.

**Recommendation:** Add explicit return types for better documentation and error catching:

```typescript
export async function generateContent(...): Promise<string | undefined>
```

#### 4.5 Type Coercion in API Params

**File:** `lib/utils/ffmpeg.ts:385`

```typescript
if (parseFloat(videoDurationSecs) <= 0)
```

**Issue:** `videoDurationSecs` is string, converted to float for comparison.

---

## 5. Performance Optimizations

### High

#### 5.1 Missing Pagination for List Endpoints

**File:** `app/api/scenarios/route.ts:179`

```typescript
const scenariosSnapshot = await scenariosRef.get();
const scenarios = scenariosSnapshot.docs.map((doc) => ({...}));
```

**Issue:** Loads ALL scenarios for a user. Users with many scenarios will experience slow responses and high memory usage.

**Recommendation:** Implement cursor-based pagination:

```typescript
const PAGE_SIZE = 20;
const cursor = searchParams.get("cursor");
let query = scenariosRef.orderBy("updatedAt", "desc").limit(PAGE_SIZE);
if (cursor) {
    const cursorDoc = await firestore.doc(`scenarios/${cursor}`).get();
    query = query.startAfter(cursorDoc);
}
```

#### 5.2 No Request Timeouts

**Files:** All `fetch` calls in `lib/api/*.ts`
**Issue:** External API calls don't specify timeouts, could hang indefinitely.

**Recommendation:** Add AbortController with timeout:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);
try {
    const response = await fetch(url, {
        signal: controller.signal,
        ...options,
    });
} finally {
    clearTimeout(timeout);
}
```

#### 5.3 No Circuit Breaker Pattern

**Files:** External API integrations
**Issue:** Rapid successive failures to external services waste resources and delay recovery.

**Recommendation:** Implement circuit breaker for external calls.

### Medium

#### 5.4 Redundant File Downloads in Video Export

**File:** `lib/utils/ffmpeg.ts:486-511`
**Issue:** All videos downloaded sequentially even though download operations are parallelized.

**Observation:** Code already uses `Promise.all`, but could benefit from streaming directly from GCS.

#### 5.5 React Components Missing Memoization

**Files:** Various components
**Observation:** `memo()` is used in some components (EntityCard, CharacterCard) but not all.

**Files needing review:**

- Timeline components may benefit from memo due to frequent updates

#### 5.6 Store Actions Don't Batch Updates

**File:** `app/features/scenario/stores/useScenarioStore.ts`
**Issue:** Multiple `setField` calls trigger multiple re-renders.

**Recommendation:** Consider batch update functions for related fields.

---

## 6. Architecture & Separation of Concerns

### High

#### 6.1 Business Logic in API Routes

**Files:** `app/api/scenarios/route.ts`, `app/api/timeline/route.ts`
**Issue:** Routes contain business logic (ownership checks, data transformation) that should be in service layer.

**Recommendation:** Create service layer:

```typescript
// lib/services/scenario-service.ts
export class ScenarioService {
    async save(userId: string, scenario: Scenario): Promise<string> {...}
    async getById(userId: string, scenarioId: string): Promise<Scenario | null> {...}
    async delete(userId: string, scenarioId: string): Promise<void> {...}
}
```

#### 6.2 Server Actions Mixed with Client Utilities

**Files:** Various `actions/` directories contain server-only code that's imported in unexpected places.
**Issue:** Easy to accidentally import server code in client components.

**Recommendation:** Add `"use server"` directive to all server actions and organize more clearly.

### Medium

#### 6.3 Zustand Stores Too Coupled to UI State

**Files:** `useScenarioStore.ts`, `useEditorStore.ts`
**Issue:** Stores mix UI state (isEditing, activeTab) with domain state (scenario, timeline).

**Recommendation:** Separate UI state from domain state:

```typescript
// UI store
const useUIStore = create(() => ({
    activeTab: "create",
    isSidebarCollapsed: false,
}));

// Domain store
const useScenarioStore = create(() => ({
    scenario: null,
    errorMessage: null,
}));
```

#### 6.4 Missing Repository Pattern

**Issue:** Direct Firestore access scattered throughout codebase.

**Recommendation:** Introduce repository pattern:

```typescript
// lib/repositories/scenario-repository.ts
export class ScenarioRepository {
    async findById(id: string): Promise<Scenario | null> {...}
    async findByUserId(userId: string): Promise<Scenario[]> {...}
    async save(scenario: Scenario): Promise<void> {...}
    async delete(id: string): Promise<void> {...}
}
```

---

## 7. Configuration Management

### High

#### 7.1 Hardcoded Configuration Values

**File:** `lib/utils/ffmpeg.ts:12-22`

```typescript
const MOOD_MUSIC: { [key: string]: string } = {
    Angry: "[Angry] Drop and Roll - Silent Partner.mp3",
    // ...
};
```

**Issue:** Music mapping hardcoded in utility file.

**File:** `lib/api/imagen.ts:8-9`

```typescript
const MODEL = "imagen-4.0-generate-001";
const MODEL_EDIT = "imagen-3.0-capability-001";
```

**Issue:** Model names hardcoded instead of in config.

**Recommendation:** Move to centralized config:

```typescript
// lib/config.ts
export const config = {
    ai: {
        imagen: { model: "imagen-4.0-generate-001" },
        veo: { model: "veo-2.0-generate-001" },
    },
    media: {
        moodMusic: {...},
    },
};
```

#### 7.2 Magic Numbers

**Files:** Multiple

- `lib/utils/retry.ts:20` - `maxRetries = 5`
- `lib/utils/rate-limit.ts:31-33` - `60000ms`, `500 items`
- `lib/utils/ffmpeg.ts:79` - `fadeOutDuration = 3`
- `middleware.ts:14` - `50 requests`

**Recommendation:** Define as named constants or config values.

### Medium

#### 7.3 Environment Schema Incomplete

**File:** `lib/utils/env.ts`
**Issue:** `LOCATION` env var used in multiple files but not in schema.

**Recommendation:** Add all required env vars to schema:

```typescript
const envSchema = z.object({
    // ...existing
    LOCATION: z.string().min(1),
});
```

---

## 8. API Design

### Medium

#### 8.1 Inconsistent Parameter Naming

**Files:** API routes

- `scenarios/route.ts` uses `id` query param
- `timeline/route.ts` uses `scenarioId` query param

**Recommendation:** Standardize parameter naming across routes.

#### 8.2 Missing HTTP Method Handlers

**Files:** API routes
**Issue:** No PUT/PATCH handlers - all updates go through POST.

**Recommendation:** Use proper REST semantics:

- POST for create
- PUT/PATCH for update
- DELETE for delete

#### 8.3 No API Versioning

**Issue:** No API versioning strategy for future compatibility.

**Recommendation:** Add version prefix: `/api/v1/scenarios`

### Low

#### 8.4 Timestamps Exposed in Responses

**Files:** API routes
**Issue:** Firestore Timestamps returned directly, exposing internal data structure.

**Recommendation:** Transform to ISO strings before returning.

---

## 9. Database & Storage

### High

#### 9.1 No Soft Deletes

**Files:** `app/api/scenarios/route.ts:241`, `app/api/timeline/route.ts:164`
**Issue:** DELETE operations permanently remove data with no recovery option.

**Recommendation:** Add soft delete with `deletedAt` timestamp:

```typescript
transaction.update(scenarioRef, { deletedAt: Timestamp.now() });
// Add filter to queries: .where('deletedAt', '==', null)
```

#### 9.2 No Data Migration Strategy

**Issue:** Schema changes could break existing data. No migration system visible.

**Recommendation:** Implement migration system for schema changes.

### Medium

#### 9.3 Storage Lifecycle Not Managed

**Issue:** GCS files uploaded but no cleanup for orphaned/unused files.

**Recommendation:** Implement storage lifecycle policy or cleanup job.

#### 9.4 Firestore Connection Pool Settings

**File:** `lib/storage/firestore.ts:13-16`

```typescript
maxIdleTime: 180 * 1000, // Comment says 60 seconds, code says 180!
maxConcurrency: 100,
```

**Issue:** Comment doesn't match code (180s vs 60s).

---

## 10. Testing

### High

#### 10.1 Limited Test Coverage

**Files:** `__tests__/`
**Observation:** Tests exist for:

- API routes (users, scenarios)
- Some hooks and stores
- Utility functions

**Missing:**

- Integration tests for complete flows
- Component tests for complex UI
- E2E tests are minimal (only basic.spec.ts)

### Medium

#### 10.2 No Mocking Strategy for External Services

**Issue:** Tests may hit real external services or not test service failures.

**Recommendation:** Add mocks for:

- Google Cloud services
- AI APIs
- Storage operations

---

## 11. Best Practices

### High

#### 11.1 Commented-Out Code

**Files:**

- `lib/utils/ffmpeg.ts:82-87, 611-622` - Commented logic
- `lib/api/tts.ts:50-64` - Commented voice selection logic
- `lib/api/gemini.ts:35` - Commented config option

**Recommendation:** Remove commented code, use version control for history.

#### 11.2 TODO/FIXME Comments Without Tracking

**Issue:** TODOs exist but aren't tracked in an issue system.

**Recommendation:** Create issues for all TODOs or remove them.

### Medium

#### 11.3 Inconsistent Naming Conventions

**Files:** Various

- Some hooks: `use-auth.ts` (kebab-case)
- Some stores: `useScenarioStore.ts` (camelCase)
- Some components: `TimelineEditor.tsx` (PascalCase) vs `scene-card.tsx` (kebab-case)

**Recommendation:** Standardize naming:

- Files: kebab-case for all
- Exports: PascalCase for components, camelCase for hooks/functions

#### 11.4 Missing JSDoc Comments

**Issue:** Complex functions lack documentation.

**Recommendation:** Add JSDoc for public APIs:

```typescript
/**
 * Generates a video from an image using Veo AI.
 * @param prompt - Video generation prompt
 * @param imageGcsUri - Source image GCS URI
 * @returns Operation name for polling
 */
export async function generateSceneVideo(...): Promise<string>
```

#### 11.5 Logging Inconsistencies

**Files:** Various

- Some use `logger.debug()`, others use `console.log()`
- Debug logs sometimes include sensitive data

**Recommendation:**

- Use logger consistently
- Never log sensitive data
- Add correlation IDs for request tracing

---

## 12. Recommendations Summary

### Priority 1 - Critical (Fix Immediately)

| Issue                            | File                      | Impact                           |
| -------------------------------- | ------------------------- | -------------------------------- |
| Rate limiting bypass             | middleware.ts:10          | Security - DoS vulnerability     |
| Error strings instead of throws  | ffmpeg.ts:30-49           | Reliability - cascading failures |
| Missing request body size limits | API routes                | Security - memory exhaustion     |
| Environment variables bypass     | imagen.ts, veo.ts, tts.ts | Reliability - undefined access   |

### Priority 2 - High (Fix Soon)

| Issue                       | File                   | Impact          |
| --------------------------- | ---------------------- | --------------- |
| GCS URI parsing duplication | Multiple files         | Maintainability |
| Missing pagination          | scenarios/route.ts:179 | Performance     |
| No custom error classes     | API routes             | Maintainability |
| Ownership check duplication | API routes             | Maintainability |
| Silent failures             | storage.ts:31          | Reliability     |

### Priority 3 - Medium (Plan to Fix)

| Issue                | File          | Impact          |
| -------------------- | ------------- | --------------- |
| No request timeouts  | API calls     | Reliability     |
| Inconsistent naming  | Various       | Maintainability |
| Magic numbers        | Various       | Maintainability |
| Missing soft deletes | API routes    | Data safety     |
| CSP weaknesses       | middleware.ts | Security        |

### Priority 4 - Low (Nice to Have)

| Issue              | File       | Impact               |
| ------------------ | ---------- | -------------------- |
| Missing JSDoc      | Various    | Developer experience |
| Timestamp exposure | API routes | API cleanliness      |
| API versioning     | Routes     | Future compatibility |
| Test coverage      | Tests      | Quality assurance    |

---

## Appendix: File Reference

### Core Files Analyzed

- `middleware.ts` - Request middleware
- `auth.ts` - NextAuth configuration
- `app/types.ts` - Type definitions
- `app/schemas.ts` - Zod validation schemas
- `app/logger.ts` - Winston logger
- `app/api/*/route.ts` - API endpoints

### Library Files Analyzed

- `lib/utils/env.ts` - Environment validation
- `lib/utils/retry.ts` - Retry logic
- `lib/utils/ffmpeg.ts` - Video/audio processing
- `lib/utils/rate-limit.ts` - Rate limiting
- `lib/api/gemini.ts` - Gemini AI
- `lib/api/imagen.ts` - Image generation
- `lib/api/veo.ts` - Video generation
- `lib/api/tts.ts` - Text-to-speech
- `lib/api/response.ts` - API responses
- `lib/storage/firestore.ts` - Database
- `lib/storage/storage.ts` - Cloud Storage

### Component Files Analyzed

- `app/features/*/components/*.tsx` - Feature components
- `app/features/*/hooks/*.ts` - Custom hooks
- `app/features/*/stores/*.ts` - Zustand stores
- `components/ui/*.tsx` - UI components

---

_Analysis completed: January 2026_
_Lines of code analyzed: ~15,000+_
_Files analyzed: 100+_
