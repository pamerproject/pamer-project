import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { censorFields } from "@/lib/censor";
import { deleteImageByUrl } from "@/lib/r2";

const SINGLETON_ID = "singleton";

const DEFAULT_SEO = {
  title: "PamerProject.com | Pamerkan Projectmu, Bangun Relasi dan Temukan Peluang!",
  description:
    "PamerProject adalah platform sosial untuk memamerkan project, membangun portofolio, dan terhubung dengan sesama kreator dari seluruh Indonesia. Punya project? Jangan disimpan sendiri — pamerkan, dapatkan feedback, bangun relasi, dan temukan peluang baru di sini!",
  keywords: "pamerproject, pamer project, portofolio, developer indonesia, project showcase, kreator, komunitas IT",
  ogImage: null as string | null,
  favicon: null as string | null,
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return { ok: false, status: 403 };
  }

  return { ok: true };
}

// GET /api/admin/seo — ambil pengaturan SEO saat ini (khusus admin)
export async function GET() {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const settings = await prisma.seoSettings.findUnique({
      where: { id: SINGLETON_ID },
    });

    return NextResponse.json({
      settings: settings || { ...DEFAULT_SEO, updatedAt: null },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// PUT /api/admin/seo — simpan pengaturan SEO (khusus admin)
export async function PUT(req: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const body = await req.json();
    const { title: rawTitle, description: rawDescription, keywords: rawKeywords } = censorFields(body, [
      "title",
      "description",
      "keywords",
    ]);

    const ogImage = body.ogImage?.trim() || null;
    const favicon = body.favicon?.trim() || null;

    const existing = await prisma.seoSettings.findUnique({
      where: { id: SINGLETON_ID },
    });

    // Izinkan simpan parsial — field yang kosong memakai nilai lama/default,
    // jadi admin cukup mengisi sebagian (mis. title saja) dan tetap tersimpan.
    const title = rawTitle?.trim() || existing?.title || DEFAULT_SEO.title;
    const description = rawDescription?.trim() || existing?.description || DEFAULT_SEO.description;
    const keywords = rawKeywords?.trim() || existing?.keywords || "";

    const settings = await prisma.seoSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {
        title,
        description,
        keywords,
        ogImage,
        favicon,
      },
      create: {
        id: SINGLETON_ID,
        title,
        description,
        keywords,
        ogImage,
        favicon,
      },
    });

    // Hapus gambar lama dari R2 SETELAH update sukses (hindari referensi rusak)
    if (existing) {
      if (existing.ogImage && existing.ogImage !== ogImage) {
        await deleteImageByUrl(existing.ogImage);
      }
      if (existing.favicon && existing.favicon !== favicon) {
        await deleteImageByUrl(existing.favicon);
      }
    }

    // Invalidasi cache metadata layout agar title/desc/keywords segera diperbarui
    revalidateTag("seo-settings", { expire: 3600 });

    return NextResponse.json({ settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "seo.saveFailed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
