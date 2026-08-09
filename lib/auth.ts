import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types'

// PHASE_2_SWAP: Add AzureAD provider here
// import AzureADProvider from 'next-auth/providers/azure-ad'
// import { @azure/msal-node } for token acquisition

declare module 'next-auth' {
  interface Session {
    user: {
      id:              string
      email:           string
      name:            string
      role:            Role
      avatarUrl?:      string | null
      isDealTeamOnly?: boolean
    }
  }
  interface User {
    id:              string
    role:            Role
    avatarUrl?:      string | null
    isDealTeamOnly?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:              string
    role:            Role
    avatarUrl?:      string | null
    isDealTeamOnly?: boolean
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user || !user.passwordHash || !user.isActive) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id:              user.id,
          email:           user.email,
          name:            user.name,
          role:            user.role as Role,
          avatarUrl:       user.avatarUrl,
          isDealTeamOnly:  user.isDealTeamOnly,
        }
      },
    }),
    // PHASE_2_SWAP: Add AzureAD provider:
    // AzureADProvider({
    //   clientId:     process.env.AZURE_AD_CLIENT_ID!,
    //   clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
    //   tenantId:     process.env.AZURE_AD_TENANT_ID!,
    //   authorization: { params: { scope: 'openid profile email Sites.Read.All Files.ReadWrite.All' } },
    // }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id             = user.id
        token.role           = user.role
        token.avatarUrl      = user.avatarUrl ?? undefined
        token.isDealTeamOnly = user.isDealTeamOnly ?? false
      }
      return token
    },
    async session({ session, token }) {
      session.user.id             = token.id
      session.user.role           = token.role
      session.user.avatarUrl      = token.avatarUrl
      session.user.isDealTeamOnly = token.isDealTeamOnly ?? false
      return session
    },
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
}
