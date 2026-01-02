# StoryCraft Application Improvement Plan

## Executive Summary

After a thorough analysis of the StoryCraft codebase, I've identified several areas for improvement across architecture, code organization, performance, security, maintainability, and developer experience. This document provides detailed recommendations for refactoring the application to follow industry best practices.

---

## Table of Contents

1. [Architecture & Code Organization](#1-architecture--code-organization)
2. [State Management](#2-state-management)
3. [Component Design](#3-component-design)
4. [Performance Optimization](#4-performance-optimization)
5. [Security Improvements](#5-security-improvements)
6. [Error Handling & Resilience](#6-error-handling--resilience)
7. [Type Safety & Validation](#7-type-safety--validation)
8. [Testing Strategy](#8-testing-strategy)
9. [Code Quality & Maintainability](#9-code-quality--maintainability)
10. [API Design](#10-api-design)
11. [Infrastructure & DevOps](#11-infrastructure--devops)
12. [Priority Matrix](#12-priority-matrix)
13. [Post-Refactoring Review](#13-post-refactoring-review-phase-1-3-completed)
14. [Implementation Roadmap](#implementation-roadmap)
15. [Acknowledgments](#acknowledgments)

---

## 1. Architecture & Code Organization

### Current Issues

#### 1.1 Monolithic Main Page Component

**File:** `app/page.tsx` (1374 lines)

The main page component is handling too many responsibilities:

- State management for 25+ state variables
- Business logic for scenario generation, video generation, image handling
- Navigation state
- Form state
- Loading states for multiple async operations

**Recommendation:** Extract into a feature-based architecture:

```
app/
├── features/
│   ├── scenario/
│   │   ├── hooks/
│   │   │   ├── useScenarioGeneration.ts
│   │   │   ├── useScenarioState.ts
│   │   │   └── useCharacterManagement.ts
│   │   ├── components/
│   │   ├── actions/
│   │   └── types.ts
│   ├── storyboard/
│   │   ├── hooks/
│   │   ├── components/
│   │   └── actions/
│   ├── editor/
│   │   ├── hooks/
│   │   │   ├── useTimelineState.ts
│   │   │   ├── usePlayback.ts
│   │   │   └── useDragAndDrop.ts
│   │   ├── components/
│   │   └── actions/
│   └── shared/
│       ├── hooks/
│       ├── components/
│       └── utils/
```

#### 1.2 Large Component Files

- `editor-tab.tsx`: 2028 lines
- `scenario-tab.tsx`: 1349 lines
- `storyboard-tab.tsx`: 718 lines (less critical)

**Recommendation:** Break down into smaller, focused components:

```typescript
// editor-tab.tsx should be split into:
// - EditorTab.tsx (container, ~200 lines)
// - TimelineEditor.tsx (~400 lines)
// - TimelineLayer.tsx (~200 lines)
// - TimelineItem.tsx (~150 lines)
// - ResizeHandlers.tsx (~100 lines)
// - DragDropHandlers.tsx (~150 lines)
// - hooks/useTimelineInteractions.ts (~300 lines)
// - hooks/useSnapPoints.ts (~200 lines)
```

#### 1.3 Unclear Separation of Concerns

Server actions, API routes, and lib functions have overlapping responsibilities.

**Current structure issues:**

- `app/actions/` contains server actions that should be in feature folders
- `lib/` mixes API clients with utility functions
- Some business logic lives in components

**Recommendation:** Adopt a cleaner layered architecture:

```
lib/
├── api/                    # External API clients only
│   ├── gemini.ts
│   ├── imagen.ts
│   ├── veo.ts
│   ├── lyria.ts
│   └── tts.ts
├── storage/
│   ├── firestore.ts
│   └── gcs.ts
└── utils/                  # Pure utility functions
    ├── format.ts
    ├── validation.ts
    └── media.ts

app/
├── features/
│   └── [feature]/
│       ├── actions/        # Server actions for this feature
│       └── services/       # Business logic services
```

#### 1.4 Single Page vs Multi-Page Routes

The current single-page approach with tabs has tradeoffs:

| Single Page (Current)          | Multi-Page Routes          |
| ------------------------------ | -------------------------- |
| Cannot share specific step URL | Shareable `/editor/abc123` |
| Browser back/forward broken    | Works naturally            |
| State in one place (simpler)   | Needs global store         |
| Heavier initial load           | Lighter per page           |
| Instant tab switching          | Route change needed        |

**Recommendation:** Hybrid approach for best of both worlds:

```
/                       → Redirects to /create or /stories
/create                 → CreateTab (no scenario ID needed)
/stories                → StoriesTab (list view)
/project/[id]           → Single page with Scenario/Storyboard/Editor tabs
```

```typescript
// app/project/[id]/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

export default function ProjectPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'scenario';

  // Load scenario once, share across tabs
  const { data: scenario, isLoading } = useQuery({
    queryKey: ['scenario', params.id],
    queryFn: () => fetchScenario(params.id),
  });

  // Update URL without full navigation when switching tabs
  const handleTabChange = (tab: string) => {
    router.replace(`/project/${params.id}?tab=${tab}`, { scroll: false });
  };

  if (isLoading) return <ProjectSkeleton />;

  return (
    <ProjectProvider scenario={scenario}>
      <Tabs defaultValue={initialTab} onValueChange={handleTabChange}>
        <TabsContent value="scenario"><ScenarioTab /></TabsContent>
        <TabsContent value="storyboard"><StoryboardTab /></TabsContent>
        <TabsContent value="editor"><EditorTab /></TabsContent>
      </Tabs>
    </ProjectProvider>
  );
}
```

**Benefits:**

- Shareable URLs (`/project/abc?tab=editor&t=5.2`)
- Browser back/forward works
- No state sync complexity between tightly-coupled tabs
- Fast tab switching (URL change, not route change)
- Automatic code splitting for `/create` vs `/project`

---

## 2. State Management

### Current Issues

#### 2.1 State Explosion in Main Component

**File:** `app/page.tsx:57-91`

```typescript
// Current: 25+ useState calls in one component
const [pitch, setPitch] = useState("");
const [name, setName] = useState("");
const [style, setStyle] = useState("Photographic");
const [aspectRatio, setAspectRatio] = useState("16:9");
const [durationSeconds, setDurationSeconds] = useState(8);
const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
const [styleImageUri, setStyleImageUri] = useState<string | null>(null);
const [logoOverlay, setLogoOverlay] = useState<string | null>(null);
// ... 17 more state variables
```

**Recommendation:** Use **Zustand** for centralized, type-safe state management. Zustand offers a simpler API than Context/Reducers, better performance (no unnecessary re-renders), and built-in DevTools support.

```typescript
// store/useScenarioStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface ScenarioFormState {
    pitch: string;
    name: string;
    style: string;
    aspectRatio: string;
    durationSeconds: number;
    language: Language;
    styleImageUri: string | null;
    logoOverlay: string | null;
    numScenes: number;

    // Actions
    setField: <K extends keyof ScenarioFormState>(
        field: K,
        value: ScenarioFormState[K],
    ) => void;
    reset: () => void;
    loadFromScenario: (scenario: Scenario) => void;
}

export const useScenarioStore = create<ScenarioFormState>()(
    devtools((set) => ({
        pitch: "",
        name: "",
        style: "Photographic",
        aspectRatio: "16:9",
        durationSeconds: 8,
        language: DEFAULT_LANGUAGE,
        styleImageUri: null,
        logoOverlay: null,
        numScenes: 5,

        setField: (field, value) =>
            set(
                (state) => ({ ...state, [field]: value }),
                false,
                `set_${field}`,
            ),
        reset: () => set(initialFormState, false, "reset"),
        loadFromScenario: (scenario) =>
            set(mapScenarioToState(scenario), false, "load_scenario"),
    })),
);
```

#### 2.2 Loading State Fragmentation

Multiple loading states are managed independently:

```typescript
const [isLoading, setIsLoading] = useState(false);
const [isVideoLoading, setIsVideoLoading] = useState(false);
const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(
    new Set(),
);
const [generatingCharacterImages, setGeneratingCharacterImages] = useState<
    Set<number>
>(new Set());
const [generatingSettingImages, setGeneratingSettingImages] = useState<
    Set<number>
>(new Set());
const [generatingPropImages, setGeneratingPropImages] = useState<Set<number>>(
    new Set(),
);
```

**Recommendation:** Centralize loading state using Zustand:

```typescript
// store/useLoadingStore.ts
import { create } from "zustand";

interface LoadingState {
    scenario: boolean;
    storyboard: boolean;
    video: boolean;
    export: boolean;
    scenes: Set<number>;
    characters: Set<number>;
    settings: Set<number>;
    props: Set<number>;

    // Actions
    startLoading: (category: keyof LoadingState, index?: number) => void;
    stopLoading: (category: keyof LoadingState, index?: number) => void;
    isAnythingLoading: () => boolean;
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
    scenario: false,
    storyboard: false,
    video: false,
    export: false,
    scenes: new Set(),
    characters: new Set(),
    settings: new Set(),
    props: new Set(),

    startLoading: (category, index) =>
        set((state) => {
            if (typeof state[category] === "boolean") {
                return { [category]: true };
            }
            if (index !== undefined) {
                const nextSet = new Set(state[category] as Set<number>);
                nextSet.add(index);
                return { [category]: nextSet };
            }
            return state;
        }),

    stopLoading: (category, index) =>
        set((state) => {
            if (typeof state[category] === "boolean") {
                return { [category]: false };
            }
            if (index !== undefined) {
                const nextSet = new Set(state[category] as Set<number>);
                nextSet.delete(index);
                return { [category]: nextSet };
            }
            return state;
        }),

    isAnythingLoading: () => {
        const state = get();
        return Object.values(state).some(
            (v) => v === true || (v instanceof Set && v.size > 0),
        );
    },
}));
```

#### 2.3 Ref Overuse for State

Using refs to track mutable state that should be React state:

**File:** `app/page.tsx:93-94`

```typescript
const isLoadingScenarioRef = useRef(false);
```

**Issue:** This pattern bypasses React's reactivity and can lead to stale closures.

**Recommendation:** Use proper state with controlled updates or state machines.

---

## 3. Component Design

### Current Issues

#### 3.1 Prop Drilling Hell

**File:** `app/page.tsx:1288-1315`

```typescript
<ScenarioTab
    scenario={scenario}
    onGenerateStoryBoard={handleGenerateStoryBoard}
    isLoading={isLoading}
    onScenarioUpdate={handleScenarioUpdate}
    onRegenerateCharacterImage={handleRegenerateCharacterImage}
    onUploadCharacterImage={handleUploadCharacterImage}
    generatingCharacterImages={generatingCharacterImages}
    onRegenerateSettingImage={handleRegenerateSettingImage}
    onUploadSettingImage={handleUploadSettingImage}
    generatingSettingImages={generatingSettingImages}
    onRegeneratePropImage={handleRegeneratePropImage}
    onUploadPropImage={handleUploadPropImage}
    generatingPropImages={generatingPropImages}
/>
```

**Recommendation:** Use **Zustand** stores to eliminate prop drilling. While Context API is built-in, Zustand provides a more performant way to access state anywhere in the component tree without re-rendering everything in between.

```typescript
// store/useScenarioStore.ts (extended for actions)
export const useScenarioStore = create<ScenarioStore>((set) => ({
    scenario: undefined,

    // Actions
    updateScenario: (scenario) => set({ scenario }),

    regenerateCharacterImage: async (index, ...) => {
        // Logic for regeneration
    },

    uploadCharacterImage: async (index, file) => {
        // Logic for upload
    },
    // ... other actions
}));

// Components then simply consume what they need:
function ScenarioTab() {
  const scenario = useScenarioStore(state => state.scenario);
  const updateScenario = useScenarioStore(state => state.updateScenario);

  return (
    // ... clean component code
  );
}
```

#### 3.2 Duplicated UI Patterns

Character, Setting, and Prop editing in `scenario-tab.tsx` share nearly identical code patterns:

**Files:** `scenario-tab.tsx:773-962` (characters), `975-1136` (props), `1149-1312` (settings)

**Recommendation:** Create a generic EntityCard component:

```typescript
// components/EntityCard.tsx
interface EntityCardProps<T> {
    entity: T;
    index: number;
    type: "character" | "setting" | "prop";
    isLoading: boolean;
    isEditing: boolean;
    onEdit: (index: number) => void;
    onSave: (index: number, data: Partial<T>) => void;
    onRegenerate: (index: number) => void;
    onUpload: (index: number, file: File) => void;
    onRemove: (index: number) => void;
    renderForm: (
        data: T,
        onChange: (data: Partial<T>) => void,
    ) => React.ReactNode;
    renderDisplay: (data: T) => React.ReactNode;
}

export function EntityCard<
    T extends { name: string; description: string; imageGcsUri?: string },
>({
    entity,
    index,
    type,
    // ... other props
}: EntityCardProps<T>) {
    // Shared logic here
}
```

#### 3.3 Missing Component Composition

The EditorTab component handles too much inline:

**Recommendation:** Use composition pattern:

```typescript
// Before (monolithic)
<EditorTab scenario={scenario} /* 12 more props */ />

// After (composed)
<EditorProvider scenario={scenario}>
  <EditorLayout>
    <EditorHeader />
    <VideoPreview />
    <Timeline>
      <TimelineRuler />
      <TimelineLayers />
      <TimelinePlayhead />
    </Timeline>
    <EditorDialogs />
  </EditorLayout>
</EditorProvider>
```

---

## 4. Performance Optimization

### Current Issues

#### 4.1 Unnecessary Re-renders

**File:** `app/page.tsx`

Every state change in the main component triggers re-renders of all children:

```typescript
// Problem: These handlers are recreated on every render
const handleGenerate = async (modelName?: string, thinkingBudget?: number) => {
    // ...
};
```

**Recommendation:** Memoize callbacks and split state:

```typescript
// Use useCallback with stable dependencies
const handleGenerate = useCallback(
    async (modelName?: string, thinkingBudget?: number) => {
        // ...
    },
    [settings.llmModel, settings.thinkingBudget, pitch, numScenes, style],
);

// Memoize child components
const MemoizedScenarioTab = memo(ScenarioTab);
const MemoizedStoryboardTab = memo(StoryboardTab);
```

#### 4.2 Missing React Query Integration

The codebase has TanStack Query installed but doesn't use it effectively.

**Current pattern:**

```typescript
// Manual fetch with local state
const [scenarios, setScenarios] = useState([]);
useEffect(() => {
    fetch("/api/scenarios")
        .then((res) => res.json())
        .then(setScenarios);
}, []);
```

**Recommendation:** Use React Query for data fetching:

```typescript
// hooks/useUserScenarios.ts
export function useUserScenarios() {
    return useQuery({
        queryKey: ["scenarios", "list"],
        queryFn: async () => {
            const res = await fetch("/api/scenarios");
            if (!res.ok) throw new Error("Failed to fetch scenarios");
            return res.json();
        },
        staleTime: 30_000, // 30 seconds
    });
}

// hooks/useScenarioMutations.ts
export function useSaveScenario() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ scenario, scenarioId }: SaveScenarioInput) => {
            const res = await fetch("/api/scenarios", {
                method: "POST",
                body: JSON.stringify({ scenario, scenarioId }),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["scenarios"] });
        },
    });
}
```

#### 4.3 Heavy Component Mounting

**File:** `editor-tab.tsx:552-824`

The timeline initialization effect is very heavy and runs synchronously:

```typescript
useEffect(
    () => {
        const initializeTimeline = async () => {
            // 270+ lines of initialization code
        };
        initializeTimeline();
    },
    [
        /* many dependencies */
    ],
);
```

**Recommendation:**

1. Use Suspense for async loading
2. Implement progressive loading
3. Use web workers for heavy computations

```typescript
// Use React Suspense with use() hook (React 19+)
function TimelineLoader({ scenarioId }: { scenarioId: string }) {
  const timeline = use(loadTimeline(scenarioId));
  return <Timeline data={timeline} />;
}

// In parent:
<Suspense fallback={<TimelineSkeleton />}>
  <TimelineLoader scenarioId={scenarioId} />
</Suspense>
```

#### 4.4 Image Loading Optimization

GCS images are loaded without optimization strategies.

**Recommendation:**

1. Implement lazy loading for off-screen images
2. Add blur placeholders
3. Use Next.js Image optimization

```typescript
// components/OptimizedGcsImage.tsx
export function OptimizedGcsImage({
  gcsUri,
  alt,
  priority = false
}: OptimizedGcsImageProps) {
  const { data: imageUrl, isLoading } = useGcsImageUrl(gcsUri);

  return (
    <div className="relative">
      {isLoading && <Skeleton className="absolute inset-0" />}
      <Image
        src={imageUrl || '/placeholder.png'}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR_PLACEHOLDER}
        onLoadingComplete={() => setLoaded(true)}
      />
    </div>
  );
}
```

#### 4.5 Lazy Loading Tab Components _(from Gemini)_

All tab components are imported at the top level, bloating the initial bundle.

**Recommendation:** Use `next/dynamic` for lazy loading heavy components:

```typescript
// app/page.tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components that aren't immediately visible
const EditorTab = dynamic(
  () => import('@/app/features/editor/components/editor-tab').then(mod => mod.EditorTab),
  {
    loading: () => <EditorSkeleton />,
    ssr: false, // Editor has client-only dependencies
  }
);

const StoryboardTab = dynamic(
  () => import('@/app/features/storyboard/components/storyboard-tab').then(mod => mod.StoryboardTab),
  { loading: () => <StoryboardSkeleton /> }
);

const VideoTab = dynamic(
  () => import('@/app/features/editor/components/video-tab').then(mod => mod.VideoTab),
  { loading: () => <VideoSkeleton /> }
);

// Only CreateTab and ScenarioTab are loaded eagerly (first steps in flow)
```

**Benefit:** Faster initial page load (FCP/LCP), especially for the heavy EditorTab (2000+ lines).

---

## 5. Security Improvements

### Current Issues

#### 5.1 Missing Input Validation on Server Actions

**File:** `app/actions/generate-scenes.ts`

```typescript
export async function generateScenario(
    name: string,
    pitch: string,
    numScenes: number,
    // No validation before use
) {
    const prompt = getScenarioPrompt(pitch, numScenes, style, language);
    // Direct use without validation
}
```

**Recommendation:** Add Zod validation to all server actions:

```typescript
import { z } from "zod";

const generateScenarioSchema = z.object({
    name: z.string().min(1).max(200),
    pitch: z.string().min(10).max(5000),
    numScenes: z.number().int().min(1).max(20),
    style: z.enum([
        "Photographic",
        "2D Animation",
        "Anime",
        "3D Animation",
        "Claymation",
    ]),
    aspectRatio: z.enum(["16:9", "9:16"]),
    durationSeconds: z.enum([4, 6, 8]),
    language: z.object({
        name: z.string(),
        code: z.string(),
    }),
    modelName: z.string().optional(),
    thinkingBudget: z.number().min(0).max(10000).optional(),
    styleImageUri: z.string().url().optional(),
});

export async function generateScenario(input: unknown): Promise<Scenario> {
    const validatedInput = generateScenarioSchema.parse(input);
    // Now safe to use
}
```

#### 5.2 Missing Rate Limiting

No rate limiting on AI generation endpoints.

**Recommendation:** Implement rate limiting:

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
    analytics: true,
});

// middleware.ts
export async function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
        const ip = request.ip ?? "127.0.0.1";
        const { success, limit, reset, remaining } = await ratelimit.limit(ip);

        if (!success) {
            return new NextResponse("Too Many Requests", { status: 429 });
        }
    }
}
```

#### 5.3 Exposed Environment Variables

**File:** `lib/gemini.ts:11`

```typescript
const PROJECT_ID = process.env.PROJECT_ID;
```

While using environment variables is correct, there's no validation that required variables exist.

**Recommendation:** Validate environment variables at startup:

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
    PROJECT_ID: z.string().min(1),
    GOOGLE_CLOUD_BUCKET: z.string().min(1),
    AUTH_SECRET: z.string().min(32),
    // ... other required env vars
});

export const env = envSchema.parse(process.env);
```

#### 5.4 Authorization Gaps

**File:** `app/api/scenarios/route.ts`

Authorization checks may be missing or incomplete.

**Recommendation:** Implement consistent authorization middleware:

```typescript
// lib/auth-utils.ts
export async function requireAuth() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new AuthError("Unauthorized");
    }
    return session;
}

export async function requireScenarioOwnership(scenarioId: string) {
    const session = await requireAuth();
    const scenario = await getScenario(scenarioId);

    if (scenario.userId !== session.user.id) {
        throw new AuthError("Forbidden");
    }

    return { session, scenario };
}
```

#### 5.5 Missing Security Headers _(from Gemini)_

Default Next.js headers may not be sufficient for high-security standards.

**Recommendation:** Add secure headers in `next.config.mjs` or middleware:

```typescript
// next.config.mjs
const securityHeaders = [
    {
        key: "X-DNS-Prefetch-Control",
        value: "on",
    },
    {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
    {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
    },
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "Referrer-Policy",
        value: "origin-when-cross-origin",
    },
    {
        key: "Content-Security-Policy",
        value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://storage.googleapis.com;
      media-src 'self' blob: https://storage.googleapis.com;
      connect-src 'self' https://*.googleapis.com;
      frame-ancestors 'none';
    `.replace(/\n/g, ""),
    },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
    // ... rest of config
};
```

**Benefit:** Protects against XSS, clickjacking, MIME sniffing, and other common web vulnerabilities.

---

## 6. Error Handling & Resilience

### Current Issues

#### 6.1 Inconsistent Error Handling

Error handling varies across the codebase:

**File:** `app/page.tsx`

```typescript
catch (error) {
  console.error("Error generating scenes:", error);
  setErrorMessage(
    error instanceof Error
      ? error.message
      : "An unknown error occurred while generating scenes",
  );
}
```

**Recommendation:** Create a centralized error handling system:

```typescript
// lib/errors.ts
export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
        public isOperational: boolean = true,
    ) {
        super(message);
        this.name = "AppError";
    }
}

export class ValidationError extends AppError {
    constructor(
        message: string,
        public field?: string,
    ) {
        super(message, "VALIDATION_ERROR", 400);
    }
}

export class AIGenerationError extends AppError {
    constructor(
        message: string,
        public service: string,
    ) {
        super(message, "AI_GENERATION_ERROR", 502);
    }
}

// hooks/useErrorHandler.ts
export function useErrorHandler() {
    const [error, setError] = useState<AppError | null>(null);

    const handleError = useCallback((error: unknown) => {
        if (error instanceof AppError) {
            setError(error);
            if (!error.isOperational) {
                // Log to monitoring service
                reportError(error);
            }
        } else {
            const appError = new AppError(
                error instanceof Error ? error.message : "Unknown error",
                "UNKNOWN_ERROR",
            );
            setError(appError);
            reportError(error);
        }
    }, []);

    return { error, handleError, clearError: () => setError(null) };
}
```

#### 6.2 User-Facing Error Notifications _(from Gemini)_

Errors are displayed as inline text which can be missed or unclear.

**Recommendation:** Use a toast notification system for better UX:

```bash
npm install sonner
# or
npm install react-hot-toast
```

```typescript
// app/client-layout.tsx
import { Toaster } from 'sonner';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
}

// Usage in components
import { toast } from 'sonner';

const handleGenerate = async () => {
  try {
    await generateScenario(input);
    toast.success('Scenario generated successfully!');
  } catch (error) {
    toast.error(error.message, {
      description: 'Please try again or adjust your prompt.',
      action: {
        label: 'Retry',
        onClick: () => handleGenerate(),
      },
    });
  }
};
```

**Benefit:** Better UX with non-intrusive, consistent error feedback that users can act upon.

#### 6.3 Missing Error Boundaries

No Error Boundaries for graceful failure handling.

**Recommendation:**

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Usage:
<ErrorBoundary fallback={<EditorErrorState />}>
  <EditorTab />
</ErrorBoundary>
```

#### 6.4 No Retry UI for Failed Operations

When generation fails, users must manually retry.

**Recommendation:** Add automatic retry with exponential backoff:

```typescript
// hooks/useRetryableOperation.ts
export function useRetryableOperation<T>(
    operation: () => Promise<T>,
    options: {
        maxRetries?: number;
        onRetry?: (attempt: number) => void;
    } = {},
) {
    const { maxRetries = 3, onRetry } = options;
    const [state, setState] = useState<{
        status: "idle" | "loading" | "error" | "success";
        data: T | null;
        error: Error | null;
        retryCount: number;
    }>({
        status: "idle",
        data: null,
        error: null,
        retryCount: 0,
    });

    const execute = useCallback(async () => {
        setState((s) => ({ ...s, status: "loading", error: null }));

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                setState({
                    status: "success",
                    data: result,
                    error: null,
                    retryCount: attempt,
                });
                return result;
            } catch (error) {
                if (attempt < maxRetries) {
                    onRetry?.(attempt + 1);
                    await sleep(Math.pow(2, attempt) * 1000);
                } else {
                    setState({
                        status: "error",
                        data: null,
                        error: error as Error,
                        retryCount: attempt,
                    });
                    throw error;
                }
            }
        }
    }, [operation, maxRetries, onRetry]);

    return { ...state, execute, retry: execute };
}
```

---

## 7. Type Safety & Validation

### Current Issues

#### 7.1 Loose Type Definitions

**File:** `app/types.ts:84-87`

```typescript
metadata?: {
  logoOverlay?: string;
  [key: string]: string | number | boolean | undefined;
};
```

**Recommendation:** Use discriminated unions and strict types:

```typescript
// types/timeline.ts
interface VideoMetadata {
    type: "video";
    logoOverlay?: string;
    originalDuration: number;
    trimStart: number;
}

interface AudioMetadata {
    type: "audio";
    originalDuration: number;
    trimStart: number;
    volume: number;
}

type TimelineItemMetadata = VideoMetadata | AudioMetadata;

interface TimelineItem {
    id: string;
    startTime: number;
    duration: number;
    content: string;
    metadata: TimelineItemMetadata;
}
```

#### 7.2 Missing Runtime Validation

API responses are used directly without validation.

**Recommendation:** Validate all external data:

```typescript
// lib/api-client.ts
import { z } from "zod";

const scenarioResponseSchema = z.object({
    scenarioId: z.string(),
    scenario: scenarioSchema,
});

export async function saveScenario(
    scenario: Scenario,
): Promise<SaveScenarioResponse> {
    const res = await fetch("/api/scenarios", {
        method: "POST",
        body: JSON.stringify(scenario),
    });

    const data = await res.json();
    return scenarioResponseSchema.parse(data);
}
```

#### 7.3 Type Assertions and Non-null Assertions

**File:** `lib/gemini.ts:106`

```typescript
for (const part of firstCandidate.content!.parts!) {
```

**Recommendation:** Use proper null checks:

```typescript
const content = firstCandidate.content;
if (!content?.parts) {
    return { success: false, errorMessage: "No content parts in response" };
}

for (const part of content.parts) {
    // ...
}
```

---

## 8. Testing Strategy

### Current Issues

No test files exist in the codebase.

**Recommendation:** Implement comprehensive testing using **Vitest** (faster, native ESM support, better DX with Next.js):

#### 8.1 Setup Vitest

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
        include: ["**/*.test.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});

// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/",
}));
```

Add scripts to `package.json`:

```json
{
    "scripts": {
        "test": "vitest",
        "test:ui": "vitest --ui",
        "test:coverage": "vitest --coverage"
    }
}
```

#### 8.2 Unit Tests for Utilities and Hooks

```typescript
// __tests__/lib/prompt-utils.test.ts
import { describe, it, expect } from "vitest";
import { imagePromptToString } from "@/lib/utils/prompt-utils";

describe("imagePromptToString", () => {
    it("should format image prompt correctly", () => {
        const prompt = {
            Style: "Photographic",
            Scene: "A sunset over the ocean",
            // ...
        };

        const result = imagePromptToString(prompt);

        expect(result).toContain("Photographic");
        expect(result).toContain("sunset");
    });
});

// __tests__/hooks/useScenarioStore.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useScenarioStore } from "@/app/features/scenario/stores/useScenarioStore";

describe("useScenarioStore", () => {
    beforeEach(() => {
        useScenarioStore.getState().reset();
    });

    it("should update field values", () => {
        const { setField } = useScenarioStore.getState();

        setField("pitch", "New pitch");

        expect(useScenarioStore.getState().pitch).toBe("New pitch");
    });

    it("should reset to initial state", () => {
        const { setField, reset } = useScenarioStore.getState();

        setField("pitch", "Some value");
        setField("name", "Test Name");
        reset();

        expect(useScenarioStore.getState().pitch).toBe("");
        expect(useScenarioStore.getState().name).toBe("");
    });
});

// __tests__/hooks/useScenario.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useScenario } from "@/app/features/scenario/hooks/use-scenario";

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe("useScenario", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should provide scenario operations", () => {
        const { result } = renderHook(() => useScenario(), {
            wrapper: createWrapper(),
        });

        expect(result.current.saveScenarioDebounced).toBeDefined();
        expect(result.current.getCurrentScenarioId).toBeDefined();
    });
});
```

#### 8.3 Integration Tests for Server Actions

```typescript
// __tests__/actions/generate-scenes.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateScenario } from "@/app/features/scenario/actions/generate-scenes";

// Mock the Gemini API
vi.mock("@/lib/gemini", () => ({
    generateContent: vi.fn().mockResolvedValue({
        success: true,
        text: JSON.stringify({
            name: "Test Movie",
            scenes: [{}, {}, {}, {}, {}],
        }),
    }),
    generateImage: vi.fn().mockResolvedValue({
        success: true,
        imageGcsUri: "gs://bucket/image.png",
    }),
}));

describe("generateScenario", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should generate a valid scenario", async () => {
        const result = await generateScenario(
            "Test Movie",
            "A story about a brave knight",
            5,
            "Photographic",
            "16:9",
            8,
            { name: "English", code: "en-US" },
        );

        expect(result.name).toBe("Test Movie");
        expect(result.scenes).toHaveLength(5);
    });

    it("should validate input with Zod schema", async () => {
        await expect(
            generateScenario(
                "", // Empty name should fail
                "A story",
                5,
                "Photographic",
                "16:9",
                8,
                { name: "English", code: "en-US" },
            ),
        ).rejects.toThrow();
    });
});
```

#### 8.4 Component Tests

```typescript
// __tests__/components/SceneCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SceneCard } from "@/app/features/storyboard/components/scene-card";

const mockScene = {
    name: "Opening Scene",
    description: "The hero enters the forest",
    imagePrompt: { Style: "Photographic", Scene: "Forest entrance" },
    imageGcsUri: "gs://bucket/scene1.png",
};

describe("SceneCard", () => {
    it("should render scene information", () => {
        render(
            <SceneCard
                scene={mockScene}
                sceneNumber={1}
                scenario={{ name: "Test", scenes: [mockScene] }}
                onUpdate={vi.fn()}
                onRegenerateImage={vi.fn()}
                onGenerateVideo={vi.fn()}
                onUploadImage={vi.fn()}
                onRemoveScene={vi.fn()}
                isGenerating={false}
                canDelete={true}
            />,
        );

        expect(screen.getByText("Opening Scene")).toBeInTheDocument();
    });

    it("should call onRegenerateImage when regenerate button is clicked", () => {
        const onRegenerate = vi.fn();
        render(
            <SceneCard
                scene={mockScene}
                sceneNumber={1}
                scenario={{ name: "Test", scenes: [mockScene] }}
                onUpdate={vi.fn()}
                onRegenerateImage={onRegenerate}
                onGenerateVideo={vi.fn()}
                onUploadImage={vi.fn()}
                onRemoveScene={vi.fn()}
                isGenerating={false}
                canDelete={true}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));
        expect(onRegenerate).toHaveBeenCalled();
    });
});
```

#### 8.5 E2E Tests for Critical Flows (Playwright)

```typescript
// e2e/scenario-generation.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Scenario Generation", () => {
    test("should generate a complete scenario from pitch", async ({ page }) => {
        await page.goto("/");

        await page.fill(
            '[data-testid="pitch-input"]',
            "A story about a robot...",
        );
        await page.selectOption('[data-testid="style-select"]', "Anime");
        await page.click('[data-testid="generate-button"]');

        // Wait for generation to complete
        await expect(page.locator('[data-testid="scenario-tab"]')).toBeVisible({
            timeout: 60000,
        });

        // Verify scenario content
        await expect(
            page.locator('[data-testid="scenario-text"]'),
        ).toContainText("robot");
    });
});
```

---

## 9. Code Quality & Maintainability

### Current Issues

#### 9.1 Debug Console Logs in Production

**File:** `app/page.tsx:109-118`

```typescript
useEffect(() => {
    console.log("generatingScenes (in useEffect):", generatingScenes);
}, [generatingScenes]);

useEffect(() => {
    console.log(
        "generatingCharacterImages (in useEffect):",
        generatingCharacterImages,
    );
}, [generatingCharacterImages]);
```

**Recommendation:** Remove debug logs or use proper logging:

```typescript
// lib/logger.ts
const isDev = process.env.NODE_ENV === "development";

export const logger = {
    debug: (...args: any[]) => isDev && console.debug("[DEBUG]", ...args),
    info: (...args: any[]) => console.info("[INFO]", ...args),
    warn: (...args: any[]) => console.warn("[WARN]", ...args),
    error: (...args: any[]) => console.error("[ERROR]", ...args),
};
```

#### 9.2 Magic Numbers and Strings

**File:** `editor-tab.tsx:32-34`

```typescript
const TIMELINE_DURATION = 65;
const MARKER_INTERVAL = 5;
const CLIP_PADDING = 2;
```

These are good, but there are many inline values elsewhere.

**Recommendation:** Create a constants file:

```typescript
// constants/editor.ts
export const EDITOR_CONFIG = {
    TIMELINE: {
        DURATION_SECONDS: 65,
        MARKER_INTERVAL_SECONDS: 5,
        CLIP_PADDING_PX: 2,
        MIN_CLIP_DURATION_SECONDS: 0.5,
        SNAP_THRESHOLD_SECONDS: 0.5,
    },
    SCENE: {
        DEFAULT_DURATION_SECONDS: 8,
        MIN_DURATION_SECONDS: 4,
        MAX_DURATION_SECONDS: 8,
    },
} as const;
```

#### 9.3 Hardcoded AI Model Names & Centralized Configuration

Model names and configuration values are scattered across multiple files, and the defaults in `use-settings.tsx` are not accessible to server-side code.

**Files:** `app/actions/*.ts`, `lib/gemini.ts`, `hooks/use-settings.tsx`

**Recommendation:** Create a single source of truth for AI configuration that serves both the UI settings and the Server Actions.

1. **Extract Shared Config:** Move `LLM_OPTIONS`, `DEFAULT_SETTINGS`, etc., from `use-settings.tsx` to `lib/ai-config.ts`.
2. **Action Parameterization:** All Server Actions should accept an optional `settings` object.
3. **Server-Side Defaults:** Use the shared `DEFAULT_SETTINGS` as fallbacks in Server Actions when parameters are missing.

```typescript
// lib/ai-config.ts
export const AI_CONFIG = {
    MODELS: {
        LLM: [
            { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", thinking: 0 },
            // ...
        ],
        IMAGE: [
            /* ... */
        ],
        VIDEO: [
            /* ... */
        ],
    },
    DEFAULTS: {
        llmModel: "gemini-2.5-flash",
        thinkingBudget: 0,
        imageModel: "gemini-3-pro-image-preview",
        videoModel: "veo-3.1-fast-generate-preview",
        generateAudio: false,
    },
} as const;

// app/actions/generate-scenes.ts
import { AI_CONFIG } from "@/lib/ai-config";

export async function generateScenario(
    input: ScenarioInput,
    settings: Partial<Settings> = AI_CONFIG.DEFAULTS, // Default to shared config
) {
    const model = settings.llmModel || AI_CONFIG.DEFAULTS.llmModel;
    // ...
}
```

**Benefit:** Ensures consistency between what the user selects in the UI and what the backend executes, while providing safe defaults for all calls.

#### 9.4 Commented-Out Code

**File:** `app/actions/generate-scenes.ts:105-125`

Multiple blocks of commented-out code exist.

**Recommendation:** Remove commented code, use version control history instead.

#### 9.5 Missing JSDoc Comments

Functions lack documentation for complex parameters.

**Recommendation:** Add JSDoc for public APIs:

```typescript
/**
 * Generates a scenario from a user's pitch using AI.
 *
 * @param name - The name for the scenario
 * @param pitch - The story pitch (10-5000 characters)
 * @param numScenes - Number of scenes to generate (1-20)
 * @param style - Visual style (e.g., 'Photographic', 'Anime')
 * @param aspectRatio - Video aspect ratio ('16:9' or '9:16')
 * @param durationSeconds - Duration per scene (4, 6, or 8 seconds)
 * @param language - Language for dialogue and voiceover
 * @param modelName - AI model to use for generation
 * @param thinkingBudget - Token budget for model thinking
 * @param styleImageUri - Optional reference image for style
 * @returns The generated scenario with characters, settings, and scenes
 * @throws {ValidationError} If input validation fails
 * @throws {AIGenerationError} If AI generation fails
 */
export async function generateScenario(...): Promise<Scenario> {
  // ...
}
```

---

## 10. API Design

### Current Issues

#### 10.1 Inconsistent API Response Format

Different endpoints return data in different formats.

**Recommendation:** Standardize API responses:

```typescript
// types/api.ts
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, any>;
    };
    meta?: {
        timestamp: string;
        requestId: string;
    };
}

// Usage in API routes
export async function GET(request: Request) {
    try {
        const data = await fetchScenarios();
        return NextResponse.json({
            success: true,
            data: { scenarios: data },
            meta: { timestamp: new Date().toISOString() },
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "FETCH_ERROR",
                    message: error.message,
                },
            },
            { status: 500 },
        );
    }
}
```

#### 10.2 Missing API Versioning

No API versioning strategy.

**Recommendation:** Implement versioned routes:

```
app/
├── api/
│   └── v1/
│       ├── scenarios/
│       ├── videos/
│       └── users/
```

#### 10.3 tRPC Setup Not Utilized

The project has tRPC packages installed but doesn't use them.

**Recommendation:** Either remove tRPC dependencies or migrate to tRPC for type-safe API:

```typescript
// If keeping tRPC:
// server/routers/scenario.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const scenarioRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.scenarios.findMany({
            where: { userId: ctx.session.user.id },
            orderBy: { updatedAt: "desc" },
        });
    }),

    create: protectedProcedure
        .input(scenarioInputSchema)
        .mutation(async ({ ctx, input }) => {
            return ctx.db.scenarios.create({
                data: { ...input, userId: ctx.session.user.id },
            });
        }),
});
```

---

## 11. Infrastructure & DevOps

### Current Issues

#### 11.1 Missing Environment Configuration

No `.env.example` file documenting required variables.

**Recommendation:** Create comprehensive env example:

```bash
# .env.example

# Authentication
AUTH_SECRET=            # NextAuth secret (generate with: openssl rand -base64 32)
GOOGLE_CLIENT_ID=       # Google OAuth client ID
GOOGLE_CLIENT_SECRET=   # Google OAuth client secret

# Google Cloud
PROJECT_ID=             # GCP project ID
GOOGLE_CLOUD_BUCKET=    # GCS bucket for media storage
GOOGLE_APPLICATION_CREDENTIALS= # Path to service account key

# AI Services (optional overrides)
GEMINI_MODEL=gemini-2.5-flash
VEO_MODEL=veo-3.0-generate-001

# Feature Flags
USE_COSMO=false         # Use placeholder videos in development
ENABLE_RATE_LIMITING=true

# Monitoring (optional)
SENTRY_DSN=
```

#### 11.2 No Health Check Endpoint

Missing health check for deployment verification.

**Recommendation:**

```typescript
// app/api/health/route.ts
export async function GET() {
    const checks = {
        database: await checkFirestore(),
        storage: await checkGCS(),
        ai: await checkGeminiAPI(),
    };

    const healthy = Object.values(checks).every((c) => c.status === "healthy");

    return NextResponse.json(
        {
            status: healthy ? "healthy" : "degraded",
            checks,
            timestamp: new Date().toISOString(),
        },
        { status: healthy ? 200 : 503 },
    );
}
```

#### 11.3 No Observability Setup

Missing structured logging and monitoring.

**Recommendation:**

```typescript
// lib/observability.ts
import { trace, context, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("storycraft");

export function withTracing<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, string>,
): Promise<T> {
    return tracer.startActiveSpan(name, async (span) => {
        try {
            if (attributes) {
                Object.entries(attributes).forEach(([k, v]) =>
                    span.setAttribute(k, v),
                );
            }
            const result = await fn();
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            });
            span.recordException(error);
            throw error;
        } finally {
            span.end();
        }
    });
}

// Usage:
const scenario = await withTracing(
    "generateScenario",
    () => generateScenario(input),
    { style: input.style, numScenes: String(input.numScenes) },
);
```

---

## 12. Priority Matrix

### Critical (Completed/Address Immediately)

| Issue                              | Status    | Impact      | Effort | Files Affected         |
| ---------------------------------- | --------- | ----------- | ------ | ---------------------- |
| Input validation on server actions | COMPLETED | Security    | Medium | All `app/actions/*.ts` |
| Rate limiting                      | COMPLETED | Security    | Medium | `middleware.ts`        |
| Security headers _(Gemini)_        | COMPLETED | Security    | Low    | `next.config.mjs`      |
| Error boundaries                   | COMPLETED | Reliability | Low    | Add new component      |
| Remove console.log in production   | COMPLETED | Performance | Low    | Multiple files         |

### High Priority (COMPLETED)

| Issue                          | Status    | Impact          | Effort | Files Affected      |
| ------------------------------ | --------- | --------------- | ------ | ------------------- |
| Split page.tsx                 | COMPLETED | Maintainability | High   | `app/page.tsx`      |
| Implement React Query          | COMPLETED | Performance     | Medium | All data fetching   |
| Implement Zustand Stores       | COMPLETED | Code Quality    | Medium | Feature components  |
| Split editor-tab.tsx           | COMPLETED | Maintainability | High   | `editor-tab.tsx`    |
| Lazy load tabs _(Gemini)_      | COMPLETED | Performance     | Low    | `app/page.tsx`      |
| Toast notifications _(Gemini)_ | COMPLETED | UX              | Low    | Error handling code |

### Medium Priority (Backlog)

| Issue                           | Impact             | Effort | Files Affected        |
| ------------------------------- | ------------------ | ------ | --------------------- |
| Add testing infrastructure      | Quality            | High   | New test files        |
| Standardize API responses       | Maintainability    | Medium | API routes            |
| Type safety improvements        | Reliability        | Medium | `types.ts`            |
| Create EntityCard component     | Maintainability    | Medium | `scenario-tab.tsx`    |
| Centralize AI config _(Gemini)_ | Maintainability    | Low    | `config/ai-models.ts` |
| Hybrid routing approach         | UX/Maintainability | Medium | Route restructure     |

### Low Priority (Nice to Have)

| Issue               | Impact               | Effort    | Files Affected  |
| ------------------- | -------------------- | --------- | --------------- |
| Add OpenTelemetry   | Observability        | High      | New files       |
| Migrate to tRPC     | Type Safety          | Very High | All API code    |
| Add health check    | DevOps               | Low       | New API route   |
| JSDoc documentation | Developer Experience | Medium    | All public APIs |

---

## Implementation Roadmap

### Phase 1: Security & Stability (COMPLETED)

1. [x] Add Zod validation to all server actions
2. [x] Implement rate limiting middleware
3. [x] Add security headers (CSP, X-Frame-Options, etc.) _(Gemini)_
4. [x] Add Error Boundaries to main layout
5. [x] Clean up console logs
6. [x] Add environment validation

### Phase 2: Architecture Refactoring (COMPLETED)

1. [x] Implement Zustand stores (Scenario, Editor, Loading)
2. [x] Create feature-based folder structure
3. [x] Split EditorTab into smaller components
4. [x] Migrate to React Query for data fetching
5. [x] Centralize AI model configuration _(Gemini)_

### Phase 3: UX & Performance (COMPLETED)

1. [x] Add toast notifications for errors _(Gemini)_
2. [x] Lazy load heavy tab components _(Gemini)_
3. [x] Optimize image loading with placeholders
4. [x] Add React.memo to heavy components
5. [x] Implement progressive timeline loading

### Phase 4: Quality & Testing

1. Set up Vitest and React Testing Library
2. Write unit tests for hooks and utilities
3. Add integration tests for server actions
4. Set up Playwright for E2E tests
5. Add API response standardization

### Phase 5: Observability (Optional)

1. Add structured logging
2. Set up monitoring (OpenTelemetry)
3. Add health check endpoint

### Phase 6: Nice to Have

1. Implement hybrid routing (`/create`, `/project/[id]`)

---

## 13. Post-Refactoring Review (Phase 1-3 Completed)

After completing Phases 1, 2, and 3, a comprehensive code review was performed. This section documents the findings and fixes.

### 13.1 Bugs Found and Fixed

#### Error Boundary Button Bug (FIXED)

**File:** `app/features/shared/components/error-boundary.tsx`

**Issue:** The "Try again" button referenced a standalone function instead of the class method.

```typescript
// BEFORE (Bug):
<Button onClick={handleReset} variant="outline" size="sm">

// AFTER (Fixed):
<Button onClick={this.handleReset} variant="outline" size="sm">
```

**Impact:** The error boundary's reset functionality was broken - clicking "Try again" would reload the page but not reset the component's error state properly.

### 13.2 Architecture Observations

#### Zustand Store Side Effects (Acceptable Tradeoff)

**File:** `app/features/scenario/stores/useScenarioStore.ts`

The `setErrorMessage` action directly calls `toast.error()`:

```typescript
setErrorMessage: (errorMessage) => {
    if (errorMessage) {
        toast.error(errorMessage); // Side effect in store
    }
    set({ errorMessage }, false, "setErrorMessage");
};
```

**Assessment:** While this is technically an anti-pattern (stores should be pure), it's a common production pattern that centralizes error notification. The tradeoff is:

- **Pros:** Single source of truth for error display, consistent UX
- **Cons:** Makes unit testing harder, couples store to UI library

**Recommendation:** Keep as-is for now, but consider extracting to a middleware pattern if testing becomes problematic.

### 13.3 Current Architecture Strengths

After the refactoring, the codebase demonstrates several best practices:

1. **Feature-Based Organization**

    ```
    app/features/
    ├── create/        (CreateTab + StyleSelector)
    ├── editor/        (EditorTab, Timeline, hooks, stores)
    ├── scenario/      (ScenarioTab, stores, hooks, actions)
    ├── storyboard/    (StoryboardTab, SceneCard, modals)
    ├── stories/       (StoriesTab)
    └── shared/        (Layout, auth, error boundary, UI)
    ```

2. **Zustand Stores** - Three focused stores:
    - `useScenarioStore` - Form state, current scenario, results
    - `useEditorStore` - Active tab, playback, sidebar state
    - `useLoadingStore` - Centralized loading states with Set-based tracking

3. **React Query Integration** - Proper patterns:
    - Query key factories (`SCENARIO_KEYS.all`, `SCENARIO_KEYS.detail(id)`)
    - Mutations with cache invalidation
    - Debounced auto-save

4. **Component Memoization**
    - `TimelineEditor` - memoized with `React.memo`
    - `TimelineLayer` - memoized with `memo`
    - `TimelineItem` - memoized with `memo`

5. **Lazy Loading** - Heavy tabs use `next/dynamic`:
    - `EditorTab` (with `ssr: false`)
    - `ScenarioTab`
    - `StoryboardTab`

6. **Security**
    - Rate limiting: 50 req/min per user via LRU cache
    - Zod validation on all server actions
    - Security headers in `next.config.mjs`
    - Auth checks on API routes

### 13.4 Remaining Opportunities

| Item                            | Priority | Notes                                               |
| ------------------------------- | -------- | --------------------------------------------------- |
| Add `React.memo` to `SceneCard` | Low      | Would need stable callbacks (useCallback) in parent |
| Remove unused tRPC packages     | Low      | `@trpc/*` packages installed but not used           |
| Add per-tab ErrorBoundaries     | Low      | Currently one boundary wraps entire app             |
| Move auto-save to custom hook   | Low      | Currently in page.tsx, could be cleaner             |

---

## Conclusion

This improvement plan addresses the key areas that will have the highest impact on code quality, maintainability, and user experience. The priority matrix helps focus efforts on critical security and reliability issues first, while the phased roadmap provides a clear path forward.

The most impactful changes are:

1. **Security:** Input validation, rate limiting, and security headers
2. **Maintainability:** Splitting large components and introducing Zustand for robust state management
3. **Reliability:** Error handling improvements, toast notifications, and testing
4. **Performance:** React Query integration, lazy loading, and memoization
5. **UX:** Hybrid routing for shareable URLs and better navigation

By following this plan, the StoryCraft application will be more robust, easier to maintain, and provide a better experience for both developers and users.

---

## Acknowledgments

This document incorporates suggestions from multiple sources:

- **Primary analysis:** Claude (Anthropic) - comprehensive codebase review
- **Additional insights marked with _(Gemini)_:** Gemini 3 Pro (Google) - [improvement.md](./improvement.md)

Key contributions from Gemini 3 Pro:

- Lazy loading with `next/dynamic`
- Zustand as the preferred state management solution
- Toast notifications (`sonner` / `react-hot-toast`)
- Centralized AI model configuration
- Security headers (CSP, X-Frame-Options, etc.)
