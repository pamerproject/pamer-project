import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { censorFields } from "@/lib/censor";
import { sendVerificationEmail, scheduleEmail } from "@/lib/email";
import { createUserWithUniqueUsername, isUniqueConstraintError } from "@/lib/username.server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = censorFields(body, ['name']);

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "auth.allFieldsRequired" },
        { status: 400 }
      );
    }

    // Validasi format email
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: "auth.invalidEmail" },
        { status: 400 }
      );
    }

    // Validasi panjang password minimal
    if (password.length < 6) {
      return NextResponse.json(
        { message: "auth.passwordTooShort" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { message: "auth.emailExists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate token verifikasi email (berlaku 24 jam)
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Buat user dengan username unik — helper bersama dengan social login.
    // Optimistic create + retry otomatis bila username bentrok (race
    // condition aman: tidak ada lagi 500 karena unique constraint).
    await createUserWithUniqueUsername(name, (username) => ({
      name,
      username,
      email,
      password: hashedPassword,
      verifyToken,
      verifyTokenExpires,
    }));

    // Kirim email verifikasi — BACKGROUND (setelah response). Jangan
    // memperlambat respons registrasi atau menggagalkannya jika SMTP down.
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyLink = `${baseUrl}/verify-email?token=${verifyToken}`;
    const acceptLang = req.headers.get("accept-language") || "";
    const emailLang = acceptLang.includes("en") ? "en" : "id";
    scheduleEmail(() => sendVerificationEmail(email, verifyLink, emailLang, name));

    return NextResponse.json({ message: "auth.accountCreated" });
  } catch (err: unknown) {
    // Race condition pada email (dua pendaftaran email sama bersamaan) —
    // balas seolah email sudah terdaftar, bukan 500.
    if (isUniqueConstraintError(err, ["email"])) {
      return NextResponse.json(
        { message: "auth.emailExists" },
        { status: 400 }
      );
    }
    console.error("[REGISTER ERROR]", err);
    return NextResponse.json(
      { message: "auth.errorOccurred" },
      { status: 500 }
    );
  }
}
