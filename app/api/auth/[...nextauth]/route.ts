// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs"

import { handlers } from "@/auth"

// NextAuth v5 gives you handlers from auth.ts
export const { GET, POST } = handlers
