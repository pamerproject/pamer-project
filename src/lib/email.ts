import nodemailer from "nodemailer";
import { after } from "next/server";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_NAME = process.env.SMTP_FROM_NAME || "PamerProject";
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || "noreply@pamerproject.com";

/**
 * Kirim email secara BACKGROUND — dijalankan SETELAH response terkirim ke
 * client lewat `after()` dari Next.js (Node runtime). Manfaat:
 * - Endpoint tidak menunggu SMTP → latensi respons turun drastis.
 * - Kegagalan SMTP ditelan + dicatat, tidak pernah menggagalkan request.
 * - Error di-`after` pun ditangkap di sini, bukan dibiarkan jadi unhandled.
 *
 * Ada fallback bila `after()` tidak tersedia di konteks tertentu: task tetap
 * dijalankan fire-and-forget agar email tidak hilang diam-diam.
 */
export function scheduleEmail(task: () => Promise<void>): void {
  const run = (): void => {
    task().catch((err) => {
      console.error("[EMAIL SEND ERROR]", err);
    });
  };

  try {
    after(run);
  } catch (err) {
    console.error("[EMAIL after() UNAVAILABLE, fallback fire-and-forget]", err);
    run();
  }
}

/**
 * Layout dasar semua email. Dipakai bersama supaya desain konsisten:
 * - Tanpa header merah besar — hanya aksen gradient tipis di atas.
 * - Logo bulat "PP" agar mudah dikenali berasal dari PamerProject.
 * - Tombol CTA berwarna brand.
 */
interface EmailLayoutArgs {
  title: string;
  greeting: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaLink: string;
  note: string;
  isEn: boolean;
}

function buildEmailLayout({
  title,
  greeting,
  paragraphs,
  ctaLabel,
  ctaLink,
  note,
  isEn,
}: EmailLayoutArgs): string {
  const paragraphHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#374151;">${p}</p>`
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background:#f3f4f6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width:560px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <div style="height:6px; background:linear-gradient(90deg,#ef4444,#f97316,#ef4444);"></div>
      <div style="padding:36px 40px 4px; text-align:center;">
        <div style="width:64px; height:64px; margin:0 auto; border-radius:50%; background:linear-gradient(135deg,#ef4444,#dc2626); text-align:center; box-shadow:0 4px 14px rgba(220,38,38,0.28);">
          <span style="display:block; line-height:64px; color:#ffffff; font-size:24px; font-weight:800; letter-spacing:1px; text-indent:1px;">PP</span>
        </div>
        <p style="margin:14px 0 0; font-size:13px; font-weight:800; color:#111827; letter-spacing:3px;">PAMER<span style="color:#dc2626;">PROJECT</span></p>
      </div>
      <div style="padding:24px 40px 8px; text-align:center;">
        <h1 style="margin:0 0 16px; font-size:22px; font-weight:800; color:#111827;">${title}</h1>
        <p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#374151;">${greeting}</p>
        ${paragraphHtml}
        <div style="text-align:center; margin:28px 0;">
          <a href="${ctaLink}" style="display:inline-block; background:#dc2626; color:#ffffff !important; text-decoration:none; padding:14px 36px; border-radius:12px; font-weight:700; font-size:15px; box-shadow:0 4px 14px rgba(220,38,38,0.25);">${ctaLabel}</a>
        </div>
        <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">${note}</p>
      </div>
      <div style="padding:24px 40px; margin-top:16px; border-top:1px solid #e5e7eb; text-align:center;">
        <p style="margin:0; font-size:13px; color:#9ca3af;">&copy; 2026 PamerProject &middot; ${isEn ? "Show off your projects here!" : "Pamerkan Projectmu Disini!"}</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

function greetingLine(name: string | undefined, isEn: boolean): string {
  return isEn
    ? `${name ? `Hi ${name},` : "Hi,"}`
    : `${name ? `Halo ${name},` : "Halo,"}`;
}

/**
 * Kirim email reset password. Link berlaku 1 jam.
 */
export async function sendResetPasswordEmail(
  to: string,
  resetLink: string,
  lang: string = "id",
  name?: string
): Promise<void> {
  const isEn = lang === "en";
  const subject = `Reset Password - PamerProject`;

  const html = buildEmailLayout({
    title: isEn ? "Reset Your Password" : "Reset Password",
    greeting: greetingLine(name, isEn),
    paragraphs: [
      isEn
        ? "We received a request to reset your PamerProject account password."
        : "Kami menerima permintaan untuk mereset password akun PamerProject kamu.",
      isEn
        ? "Click the button below to set a new password:"
        : "Klik tombol di bawah ini untuk membuat password baru:",
    ],
    ctaLabel: isEn ? "Reset Password" : "Reset Password",
    ctaLink: resetLink,
    note: isEn
      ? "This link is valid for <strong>1 hour</strong>. If you did not request a password reset, please ignore this email."
      : "Link ini berlaku selama <strong>1 jam</strong>. Jika kamu tidak meminta reset password, abaikan email ini.",
    isEn,
  });

  const text = `${subject}\n\n${greetingLine(name, isEn)}\n${isEn
    ? "We received a request to reset your PamerProject account password.\n\nClick the link below to set a new password:"
    : "Kami menerima permintaan reset password untuk akun kamu.\n\nKlik link berikut untuk membuat password baru:"}\n${resetLink}\n\n${isEn
      ? "This link is valid for 1 hour. If you did not request a password reset, please ignore this email."
      : "Link ini berlaku selama 1 jam. Jika kamu tidak meminta reset password, abaikan email ini."}`;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
}

/**
 * Kirim email verifikasi akun. Link berlaku 24 jam.
 */
export async function sendVerificationEmail(
  to: string,
  verifyLink: string,
  lang: string = "id",
  name?: string
): Promise<void> {
  const isEn = lang === "en";
  const subject = isEn
    ? "Verify Your Email - PamerProject"
    : "Verifikasi Email Kamu - PamerProject";

  const html = buildEmailLayout({
    title: isEn ? "Verify Your Email" : "Verifikasi Email",
    greeting: greetingLine(name, isEn),
    paragraphs: [
      isEn
        ? "Welcome to PamerProject! Confirm your email address to unlock all features."
        : "Selamat datang di PamerProject! Konfirmasi alamat email kamu untuk membuka semua fitur.",
      isEn
        ? "Click the button below to verify your email:"
        : "Klik tombol di bawah ini untuk verifikasi email:",
    ],
    ctaLabel: isEn ? "Verify Email" : "Verifikasi Email",
    ctaLink: verifyLink,
    note: isEn
      ? "This link is valid for <strong>24 hours</strong>. If you did not create this account, please ignore this email."
      : "Link ini berlaku selama <strong>24 jam</strong>. Jika kamu tidak membuat akun ini, abaikan email ini.",
    isEn,
  });

  const text = `${subject}\n\n${greetingLine(name, isEn)}\n${isEn
    ? "Welcome to PamerProject! Confirm your email address to unlock all features.\n\nClick the link below to verify:"
    : "Selamat datang di PamerProject! Konfirmasi email kamu untuk membuka semua fitur.\n\nKlik link berikut untuk verifikasi:"}\n${verifyLink}\n\n${isEn
      ? "This link is valid for 24 hours. If you did not create this account, please ignore this email."
      : "Link ini berlaku selama 24 jam. Jika kamu tidak membuat akun ini, abaikan email ini."}`;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
}

/**
 * Kirim email selamat datang setelah email berhasil diverifikasi.
 */
export async function sendWelcomeEmail(
  to: string,
  lang: string = "id",
  name?: string
): Promise<void> {
  const isEn = lang === "en";
  const subject = isEn
    ? "Welcome to PamerProject! 🎉"
    : "Selamat Datang di PamerProject! 🎉";

  const html = buildEmailLayout({
    title: isEn ? "You're All Set!" : "Kamu Sudah Siap!",
    greeting: greetingLine(name, isEn),
    paragraphs: [
      isEn
        ? "Thank you for confirming your email. Your account is now fully active and ready to go."
        : "Terima kasih sudah memverifikasi email. Akun kamu sekarang aktif sepenuhnya dan siap dipakai.",
      isEn
        ? "Now it's time to show off what you've built — create a project, share a story, or join the community!"
        : "Sekarang saatnya memamerkan karya kamu — buat project, bagikan cerita, atau gabung dengan komunitas!",
    ],
    ctaLabel: isEn ? "Start Showing Off" : "Mulai Pamer Project",
    ctaLink: process.env.NEXTAUTH_URL || "http://localhost:3000",
    note: isEn
      ? "We can't wait to see what you create. See you on PamerProject!"
      : "Kami tidak sabar melihat karya kamu. Sampai jumpa di PamerProject!",
    isEn,
  });

  const text = `${subject}\n\n${greetingLine(name, isEn)}\n${isEn
    ? "Thank you for confirming your email. Your account is now fully active.\n\nCreate a project, share a story, or join the community:"
    : "Terima kasih sudah memverifikasi email. Akun kamu sekarang aktif sepenuhnya.\n\nBuat project, bagikan cerita, atau gabung komunitas:"}\n${process.env.NEXTAUTH_URL || "http://localhost:3000"}`;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
}
