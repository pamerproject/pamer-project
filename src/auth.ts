import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createUserWithUniqueUsername } from "@/lib/username.server";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          image: user.avatar,
          role: user.role,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Google/GitHub login — pastikan user tersimpan di database
      if (account?.provider === "google" || account?.provider === "github") {
        if (!user.email) return false;

        const existing = await prisma.user.findUnique({ where: { email: user.email } });

        if (!existing) {
          // Buat user baru dengan username UNIK dari bagian lokal email
          // (mis. "danayasa2@gmail.com" → basis "danayasa2") — lebih aman
          // daripada dari nama (nama bisa ada spasi/karakter aneh). Helper
          // createUserWithUniqueUsername men-sanitasi + retry bila bentrok.
          // Email dari provider sudah terverifikasi.
          const emailLocal = user.email.split("@")[0] || "";
          const usernameBasis = emailLocal || user.name || "user";
          await createUserWithUniqueUsername(usernameBasis, (username) => ({
            name: user.name || "User",
            username,
            email: user.email!,
            avatar: user.image || null,
            password: null, // Tidak punya password (social login)
            emailVerified: new Date(),
          }));
        } else {
          // User sudah ada — isi data dari provider social:
          // 1. Avatar dari social kalau belum punya.
          // 2. Email auto-verified — Google/GitHub sudah memverifikasi email
          //    saat login, jadi user yang daftar via email/password tapi
          //    belum verifikasi langsung jadi verified (anti-lockout).
          const updates: { avatar?: string | null; emailVerified?: Date } = {};
          if (!existing.avatar && user.image) updates.avatar = user.image;
          if (!existing.emailVerified) updates.emailVerified = new Date();
          if (Object.keys(updates).length > 0) {
            await prisma.user.update({
              where: { id: existing.id },
              data: updates,
            });
          }
        }

        return true;
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        // Cari user di DB via EMAIL, bukan id — untuk login OAuth,
        // `user.id` adalah sub provider (mis. "123456789"), BUKAN id DB,
        // sehingga lookup by id gagal dan token.username kosong. Akibatnya
        // session.username undefined → link profil jadi /u/<Nama> (dengan
        // spasi, mis. /u/Ketut%20Dana). Email selalu konsisten dengan DB.
        const email = user.email || (token.email as string) || "";
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, username: true, avatar: true, name: true, emailVerified: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.username = dbUser.username;
            token.picture = dbUser.avatar;
            token.name = dbUser.name;
            token.emailVerified = dbUser.emailVerified;
          }
        }
      }
      // Backfill untuk sesi LAMA (token JWT dibuat sebelum fix ini): token
      // belum punya username, jadi masih menghasilkan link /u/<Nama> sampai
      // re-login. Isi sekali saja — berikutnya token.username sudah terisi,
      // sehingga blok ini tidak jalan lagi (tanpa biaya per-request).
      if (!token.username && token.email) {
        const legacyUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true, username: true, avatar: true, name: true, emailVerified: true },
        });
        if (legacyUser) {
          token.id = legacyUser.id;
          token.role = legacyUser.role;
          token.username = legacyUser.username;
          token.picture = legacyUser.avatar;
          token.name = legacyUser.name;
          token.emailVerified = legacyUser.emailVerified;
        }
      }

      // Update token saat session di-update — baca data terbaru dari DB
      if (trigger === "update") {
        const userId = token.id;
        if (!userId) return token;
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { avatar: true, username: true, name: true, role: true, emailVerified: true },
        });
        if (dbUser) {
          token.picture = dbUser.avatar;
          token.username = dbUser.username;
          token.name = dbUser.name;
          token.role = dbUser.role;
          token.emailVerified = dbUser.emailVerified;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id;
        session.user.username = token.username;
        session.user.image = token.picture;
        session.user.role = token.role;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

// Helper untuk server-side session — kompatibel dengan semua API routes yang pakai auth()
export async function auth() {
  return getServerSession(authOptions);
}
