import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { sendWelcomeEmail, scheduleEmail } from "@/lib/email";

// POST /api/auth/verify-email — konfirmasi token verifikasi email
export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { message: "auth.verifyTokenRequired" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { verifyToken: token } });

    if (!user || !user.verifyTokenExpires || user.verifyTokenExpires < new Date()) {
      // Token tidak ditemukan / sudah kedaluarsa. Biasanya ini karena token
      // SUDAH dipakai & dibersihkan oleh request sebelumnya (StrictMode
      // double-effect, email scanner yang prefetch link, atau efek yang jalan
      // ulang). Jika user yang sedang login sudah terverifikasi, jadikan
      // idempotent — anggap berhasil alih-alih menampilkan error palsu.
      const session = await auth();
      const sessionUser = session?.user as { emailVerified?: Date | null } | undefined;
      if (sessionUser?.emailVerified) {
        return NextResponse.json({ message: "auth.alreadyVerified" });
      }
      return NextResponse.json(
        { message: "auth.verifyInvalidToken" },
        { status: 400 }
      );
    }

    // Tandai email terverifikasi + bersihkan token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verifyToken: null,
        verifyTokenExpires: null,
      },
    });

    // Kirim email selamat datang — BACKGROUND, jangan memperlambat respons
    // verifikasi maupun menggagalkannya jika SMTP bermasalah.
    const acceptLang = req.headers.get("accept-language") || "";
    const emailLang = acceptLang.includes("en") ? "en" : "id";
    scheduleEmail(() => sendWelcomeEmail(user.email, emailLang, user.name || undefined));

    return NextResponse.json({ message: "auth.verifySuccessMsg" });
  } catch {
    // (fix S7) Jangan bocorkan err.message mentah ke client —
    // pesan error internal bisa membocorkan detail DB/SMTP.
    return NextResponse.json({ message: "auth.errorOccurred" }, { status: 500 });
  }
}
