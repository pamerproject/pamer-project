import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { sendVerificationEmail, scheduleEmail } from "@/lib/email";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

// POST /api/auth/resend-verification — kirim ulang email verifikasi (harus login)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    // Rate limit: max 3 kirim ulang per user per 5 menit
    const rlKey = getRateLimitKey(req, `resend-verify:${session.user.id}`);
    const rl = await checkRateLimit(rlKey, { max: 3, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { message: "auth.tooManyRequests" },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ message: "error.userNotFound" }, { status: 404 });
    }

    // Sudah terverifikasi — tidak perlu kirim ulang
    if (user.emailVerified) {
      return NextResponse.json({ message: "auth.alreadyVerified" });
    }

    // Generate token baru (berlaku 24 jam)
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { verifyToken, verifyTokenExpires },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyLink = `${baseUrl}/verify-email?token=${verifyToken}`;
    const acceptLang = req.headers.get("accept-language") || "";
    const emailLang = acceptLang.includes("en") ? "en" : "id";
    scheduleEmail(() => sendVerificationEmail(user.email, verifyLink, emailLang, user.name || undefined));

    return NextResponse.json({ message: "auth.verifySent" });
  } catch (err: unknown) {
    console.error("Resend verification error:", err);
    return NextResponse.json(
      { message: "auth.errorTryAgain" },
      { status: 500 }
    );
  }
}
