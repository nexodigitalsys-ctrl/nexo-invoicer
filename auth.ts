// auth.ts (raiz do projeto)
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;

        if (!email || !password) return null;

        // ✅ ADMIN (mantém como está)
        if (
          email === process.env.ADMIN_EMAIL &&
          password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id: "admin-1",
            name: "Admin",
            email,
            role: "admin",
            workspaceId: null, // admin usa cookie/workspaces
          } as any;
        }

        // ✅ CLAUDINEI (novo)
        if (
          email === process.env.CLAUDINEI_EMAIL &&
          password === process.env.CLAUDINEI_PASSWORD
        ) {
          return {
            id: "client-claudinei",
            name: "Claudinei",
            email,
            role: "client",
            workspaceId: Number(process.env.CLAUDINEI_WORKSPACE_ID || 1), // ✅ trava no workspace
          } as any;
        }

        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // no login inicial, "user" vem do authorize()
      if (user) {
        token.role = (user as any).role ?? "client";
        token.workspaceId = (user as any).workspaceId ?? null;
      }
      return token;
    },

    async session({ session, token }) {
      // expõe no session.user
      (session.user as any).role = token.role ?? "client";
      (session.user as any).workspaceId = token.workspaceId ?? null;
      return session;
    },
  },
};
