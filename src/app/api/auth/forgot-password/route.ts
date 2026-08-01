import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { sendResetPasswordEmail, scheduleEmail } from "@/lib/email";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limit: max 3 requests per IP per 5 minutes
    const rlKey = getRateLimitKey(req, "forgot-password");
    const rl = await checkRateLimit(rlKey, { max: 3, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { message: "auth.tooManyRequests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "auth.emailRequired" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success even if email not found (security best practice)
    if (!user) {
      return NextResponse.json({
        message: "auth.ifEmailRegistered",
      });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    // Build reset link
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password/${resetToken}`;

    // Send email — BACKGROUND (after response). SMTP bermasalah tidak boleh
    // mengubah respons; tetap balas sukses seperti pesan umum (anti-enumeration).
    const acceptLang = req.headers.get("accept-language") || "";
    const emailLang = acceptLang.includes("en") ? "en" : "id";
    scheduleEmail(() => sendResetPasswordEmail(email, resetLink, emailLang, user.name || undefined));

    return NextResponse.json({
      message: "auth.ifEmailRegistered",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      {
        message: "auth.errorTryAgain",
      },
      { status: 500 }
    );
  }
}
