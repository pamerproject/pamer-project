import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { compressImage, isImageMimeType, validateImageSize } from "@/lib/image";
import { uploadToR2, generateImageKey, generateFileKey, isR2Configured } from "@/lib/r2";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { requireVerifiedEmail } from "@/lib/verified";

// Whitelist MIME dokumen (fix S2) — SVG/HTML/JS/XML sengaja TIDAK diizinkan
// karena bisa mengeksekusi script saat file dibuka langsung di browser
// (stored XSS / phishing). UI hanya meng-upload gambar, jadi ini ketat.
const ALLOWED_DOC_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "text/plain", // .txt
  "text/csv", // .csv
]);

/**
 * Magic-byte check — cegah spoofing `file.type` (mis. HTML di-rename .pdf).
 * Client/browser bisa berbohong soal MIME, jadi isi file ikut diverifikasi.
 */
function sniffDocumentSignature(buffer: Buffer, mime: string): boolean {
  if (mime === "application/pdf") {
    return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  }
  if (
    mime === "application/msword" ||
    mime === "application/vnd.ms-excel" ||
    mime === "application/vnd.ms-powerpoint"
  ) {
    // OLE2 compound document (doc/xls/ppt lama)
    return buffer.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"));
  }
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    // DOCX/XLSX/PPTX = container ZIP
    const head = buffer.subarray(0, 4);
    return head.equals(Buffer.from("504b0304", "hex")) || head.equals(Buffer.from("504b0506", "hex"));
  }
  // text/plain & text/csv — tidak ada signature kuat; cukup andalkan whitelist MIME
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Wajib login untuk upload
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "auth.loginRequired" }, { status: 401 });
    }

    // Email harus terverifikasi untuk upload (bagian dari alur buat feed)
    const verifiedError = requireVerifiedEmail(session, { errorKey: "error" });
    if (verifiedError) return verifiedError;

    // Rate limit: max 10 uploads per user per minute
    const rlKey = getRateLimitKey(req, `upload:${session.user.id}`);
    const rl = await checkRateLimit(rlKey, { max: 10, windowMs: 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "settings.tooManyUploads" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "settings.r2NotConfigured" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "settings.fileNotFound" }, { status: 400 });
    }

    const isImage = isImageMimeType(file.type);

    if (isImage) {
      // Validate image input size — compression will reduce to ~64KB
      const sizeError = validateImageSize(file.size, 512 * 1024);
      if (sizeError) {
        return NextResponse.json({ error: sizeError }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const input = Buffer.from(bytes);
      const result = await compressImage(input);
      const key = generateImageKey();
      const imageUrl = await uploadToR2(key, result.buffer, "image/webp");

      return NextResponse.json({
        success: true,
        type: "image",
        preview: imageUrl,
        file: {
          name: file.name.replace(/\.[^.]+$/, ".webp"),
          key,
          sizeKB: result.sizeKB,
          originalSizeKB: result.originalSizeKB,
          compressed: result.compressed,
          width: result.width,
          height: result.height,
          quality: result.quality,
        },
      });
    }

    // Document (PDF, DOC, etc.) — whitelist MIME ketat (fix S2).
    if (!ALLOWED_DOC_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "settings.uploadInvalidFormat" }, { status: 400 });
    }

    const maxDocSize = 512 * 1024; // 512KB
    if (file.size > maxDocSize) {
      return NextResponse.json({ error: "settings.fileTooBig" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Magic-byte check — file.type bisa dipalsukan, isi file tetap diverifikasi
    if (!sniffDocumentSignature(buffer, file.type)) {
      return NextResponse.json({ error: "settings.uploadInvalidFormat" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "bin";
    const key = generateFileKey(ext);
    const url = await uploadToR2(key, buffer, file.type);

    return NextResponse.json({
      success: true,
      type: "document",
      url,
      file: {
        name: file.name,
        key,
        sizeKB: Math.round(buffer.length / 1024),
        mime: file.type,
      },
    });
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : "settings.uploadFailed";
    // Jangan bocorkan XML error R2 mentah ke user — tampilkan pesan yang ramah
    // (mencakup gambar & dokumen karena uploadToR2 dipakai untuk keduanya)
    const message = raw.startsWith("R2 upload failed")
      ? "settings.uploadInvalidFormat"
      : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
