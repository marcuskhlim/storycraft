import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/utils/prisma"
import bcrypt from "bcryptjs"

export const authConfig = {
    pages: {
        signIn: "/sign-in",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnSignIn = nextUrl.pathname.startsWith("/sign-in")

            if (isLoggedIn) {
                if (isOnSignIn) {
                    return Response.redirect(new URL("/", nextUrl))
                }
                return true
            }

            if (isOnSignIn) {
                return true
            }

            return false
        },
        // Add user info to the session token
        async jwt({ token, profile, account }) {
            if (profile) {
                // Ensure profile object exists and has picture property
                // The exact structure might depend on the provider (Google usually has picture)
                const googleProfile = profile as { picture?: string };
                if (googleProfile.picture) {
                    token.picture = googleProfile.picture
                }
            }
            
            // Store Google's stable user ID in the token
            if (account?.provider === 'google' && account.providerAccountId) {
                token.googleUserId = account.providerAccountId
            }
            
            return token
        },
        // Add user info to the session object
        async session({ session, token }) {
            if (token?.picture && session.user) {
                session.user.image = token.picture as string;
            }
            // Use Google's stable user ID instead of NextAuth's internal ID
            if (token?.googleUserId && session.user) {
                session.user.id = token.googleUserId as string;
            } else if (token?.sub && session.user) {
                // Fallback to NextAuth's ID if Google ID is not available
                session.user.id = token.sub;
            }
            return session
        },
    },
    providers: [

   Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = (credentials ?? {}) as {
          email?: string
          password?: string
        }
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) {
            console.log("the password hash of "+password +" does not match "+user.passwordHash)
            return null
        }
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          isPaid: user.isPaid,
        }
      },
    }),


        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
    ],
} satisfies NextAuthConfig

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)