import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    username?: string;
    role?: string;
    emailVerified?: Date | null;
  }

  interface Session {
    user: {
      id: string;
      username?: string;
      role?: string;
      emailVerified?: Date | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: string;
    emailVerified?: Date | null;
  }
}
