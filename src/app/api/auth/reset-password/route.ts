import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limit: max 3 attempts per IP per 5 minutes
    const rlKey = getRateLimitKey(req, "reset-password");
    const rl = await checkRateLimit(rlKey, { max: 3, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { message: "auth.tooManyRequests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { message: "auth.tokenAndPasswordRequired" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "auth.passwordTooShort" },
        { status: 400 }
      );
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "auth.invalidToken" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password & clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return NextResponse.json({
      message: "auth.passwordChanged",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "auth.errorTryAgain" },
      { status: 500 }
    );
  }
}
