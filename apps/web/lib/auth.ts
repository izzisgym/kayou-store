import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Admin Password',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) return null;
        if (credentials?.password === adminPassword) {
          return { id: '1', name: 'Admin', email: 'admin@kayou.store' };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24, // 24 hours
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = nextUrl.pathname.startsWith('/admin') && nextUrl.pathname !== '/admin/login';
      if (isAdminRoute && !isLoggedIn) return false;
      return true;
    },
  },
});
