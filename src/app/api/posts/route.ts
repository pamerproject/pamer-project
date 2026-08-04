import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { censorFields, censorText } from "@/lib/censor";
import { requireVerifiedEmail } from "@/lib/verified";
import { isUniqueConstraintError } from "@/lib/username.server";

// Helper: generate BASE slug dari title (untuk project).
// TIDAK cek uniqueness di sini — keunikan ditangani lewat optimistic create
// + retry P2002 di call site (fix B2: pola check-then-create rawan race).
function makeProjectSlug(title: string): string {
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug.includes("-") && slug.length > 0) {
    slug += "-" + Math.floor(1000 + Math.random() * 9000);
  }

  return slug;
}

// Helper: generate BASE slug dari content (untuk cerita).
// Sama seperti di atas — keunikan ditangani di call site via retry P2002.
function makePostSlug(content: string): string {
  // Ambil 50 karakter pertama dari content
  const preview = content.trim().slice(0, 50);
  let slug = preview
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Hapus trailing hyphens setelah truncate
  slug = slug.replace(/-+$/, "");

  if (!slug) slug = "post";

  // Selalu tambah random 4 digit untuk cerita
  slug += "-" + Math.floor(1000 + Math.random() * 9000);

  return slug;
}

function parsePostImage(
  image: string | null
): { images: string[]; linkUrl: string | null; githubUrl: string | null } {
  if (!image) return { images: [], linkUrl: null, githubUrl: null };
  try {
    const parsed = JSON.parse(image);
    if (Array.isArray(parsed)) {
      return { images: parsed, linkUrl: null, githubUrl: null };
    }
    if (parsed && typeof parsed === "object") {
      // Handle both "imgs" key (new format) and link-only posts
      return {
        images: Array.isArray(parsed.imgs) ? parsed.imgs : [],
        linkUrl: parsed.lnk || null,
        githubUrl: parsed.gh || null,
      };
    }
  } catch {
    // Not JSON — plain URL string (backward compat)
  }
  return { images: [image], linkUrl: null, githubUrl: null };
}

// GET /api/posts — ambil feed postingan (cerita + project)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    const take = parseInt(url.searchParams.get("take") || "10", 10);
    const type = url.searchParams.get("type");

    const where: Prisma.PostWhereInput = type === "cerita"
      ? { type: "cerita" }
      : type === "project"
        ? { project: { visibility: "PUBLIC" } }
        : { OR: [{ type: "cerita" }, { project: { visibility: "PUBLIC" } }] };

    // Item ter-pin (oleh admin) selalu tampil paling atas pada halaman pertama.
    // ID ter-pin selalu dikecualikan dari query utama supaya tidak muncul dua kali di feed.
    const includePinned = {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          tags: true,
          image: true,
          liveUrl: true,
          repoUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    } as const;

    type FeedPost = Prisma.PostGetPayload<{ include: typeof includePinned }>;

    const pinnedIds: string[] = [];
    const pinnedPosts: FeedPost[] = [];

    if (type !== "project") {
      const pinnedStory = await prisma.post.findFirst({
        where: { type: "cerita", pinned: true },
        include: includePinned,
      });
      if (pinnedStory) {
        pinnedIds.push(pinnedStory.id);
        if (skip === 0) pinnedPosts.push(pinnedStory);
      }
    }
    if (type !== "cerita") {
      const pinnedProject = await prisma.post.findFirst({
        where: { type: "project", pinned: true, project: { visibility: "PUBLIC" } },
        include: includePinned,
      });
      if (pinnedProject) {
        pinnedIds.push(pinnedProject.id);
        if (skip === 0) pinnedPosts.push(pinnedProject);
      }
    }

    const filterWhere = pinnedIds.length > 0
      ? { ...where, NOT: { id: { in: pinnedIds } } }
      : where;

    const posts = await prisma.post.findMany({
      skip,
      take,
      orderBy: { createdAt: "desc" },
      where: filterWhere,
      include: includePinned,
    });

    // Parse image field dan gabung counts project untuk tipe project
    const allPosts = [...pinnedPosts, ...posts];
    const projectIds = allPosts.filter(p => p.projectId).map(p => p.projectId!);

    const [projectCommentCounts, projectLikeCounts] = projectIds.length > 0 ? await Promise.all([
      prisma.comment.groupBy({ by: ["projectId"], where: { projectId: { in: projectIds } }, _count: true }),
      prisma.like.groupBy({ by: ["projectId"], where: { projectId: { in: projectIds } }, _count: true }),
    ]) : [[], []];

    const commentMap = new Map(projectCommentCounts.map(c => [c.projectId, c._count]));
    const likeMap = new Map(projectLikeCounts.map(l => [l.projectId, l._count]));

    const parsedPosts = allPosts.map((post) => {
      const parsed = parsePostImage(post.image);

      let comments = post._count.comments;
      let likes = post._count.likes;

      if (post.projectId) {
        comments += commentMap.get(post.projectId) || 0;
        likes = likeMap.get(post.projectId) || 0;
      }

      return {
        ...post,
        pinned: !!post.pinned,
        images: parsed.images,
        linkUrl: parsed.linkUrl,
        githubUrl: parsed.githubUrl,
        image: post.image,
        _count: { comments, likes },
      };
    });

    // Feed harus selalu fresh — tidak boleh di-cache agar postingan baru langsung muncul
    return NextResponse.json({ posts: parsedPosts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// POST /api/posts — buat postingan baru (cerita / project)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    // Email harus terverifikasi untuk membuat postingan
    const verifiedError = requireVerifiedEmail(session);
    if (verifiedError) return verifiedError;

    const { allowed } = await checkRateLimit(getRateLimitKey(req, "create-post"), { max: 10, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ message: "auth.tooManyRequests" }, { status: 429 });
    }

    const body = await req.json();
    Object.assign(body, censorFields(body, ['content', 'title', 'description']));
    if (Array.isArray(body.tags)) {
      body.tags = body.tags.map((t: string) => censorText(t).text);
    }
    const { type, images, linkUrl, githubUrl, visibility } = body;
    const imgArr: string[] = images || [];
    const postType = type === "project" ? "project" : "cerita";

    // Link GitHub wajib https://github.com/... — tolak bentuk lain
    const safeGithubUrl =
      typeof githubUrl === "string" && /^https:\/\/github\.com\/[\w.-]+(?:\/[\w.-]+)*\/?$/i.test(githubUrl.trim())
        ? githubUrl.trim()
        : null;

    if (postType === "cerita") {
      if (!body.content?.trim() && imgArr.length === 0 && !linkUrl && !safeGithubUrl) {
        return NextResponse.json(
          { message: "auth.contentRequired" },
          { status: 400 }
        );
      }
    } else {
      if (!body.title?.trim()) {
        return NextResponse.json(
          { message: "auth.projectTitleRequired" },
          { status: 400 }
        );
      }
    }

    // Simpan gambar & metadata sebagai JSON di field image
    let imageValue: string | null = null;
    if (imgArr.length > 0 || linkUrl || safeGithubUrl) {
      const data: { imgs?: string[]; lnk?: string; gh?: string } = {};
      if (imgArr.length > 0) data.imgs = imgArr;
      if (linkUrl) data.lnk = linkUrl;
      if (safeGithubUrl) data.gh = safeGithubUrl;
      imageValue = JSON.stringify(data);
    }

    // Buat slug dasar untuk cerita (tanpa cek uniqueness — fix B2)
    let postSlug: string | undefined;
    if (postType === "cerita" && body.content?.trim()) {
      postSlug = makePostSlug(body.content.trim());
    }

    // Buat Post record
    const postData: Prisma.PostUncheckedCreateInput = {
      type: postType,
      slug: postSlug || null,
      content: postType === "cerita" ? (body.content?.trim() || "") : "",
      image: imageValue,
      userId: session.user.id,
    };

    const postInclude = {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
        },
      },
      project: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          tags: true,
          image: true,
          liveUrl: true,
          repoUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    } as const;

    // Helper: optimistic create post — return null saat slug bentrok (P2002),
    // error lain dilempar ke pemanggil.
    const attemptPostCreate = async (slug: string | null) => {
      try {
        return await prisma.post.create({
          data: { ...postData, slug },
          include: postInclude,
        });
      } catch (err) {
        if (isUniqueConstraintError(err, ["slug"])) return null;
        throw err;
      }
    };

    // Jika project, buat Project record DULU (optimistic create + retry slug)
    // supaya projectId bisa masuk ke postData sebelum Post dibuat.
    if (postType === "project") {
      const baseSlug = makeProjectSlug(body.title.trim());

      const attemptProjectCreate = async (slug: string) => {
        try {
          return await prisma.project.create({
            data: {
              title: body.title.trim(),
              slug,
              description: body.description?.trim() || null,
              tags: body.tags || [],
              image: imgArr.length > 0 ? imgArr[0] : null,
              liveUrl: linkUrl || null,
              repoUrl: safeGithubUrl,
              status: "PUBLISHED",
              visibility: visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
              userId: session.user.id,
            },
          });
        } catch (err) {
          if (isUniqueConstraintError(err, ["slug"])) return null;
          throw err;
        }
      };

      let project = await attemptProjectCreate(baseSlug);
      for (let i = 1; i < 100 && !project; i++) {
        project = await attemptProjectCreate(`${baseSlug}-${i}`);
      }
      if (!project) throw new Error("Gagal membuat slug unik");
      postData.projectId = project.id;
    }

    // Buat Post record (optimistic create + retry slug)
    let post = await attemptPostCreate(postSlug ?? null);
    if (!post) {
      const base = postSlug || "post";
      for (let i = 1; i < 100 && !post; i++) {
        post = await attemptPostCreate(`${base}-${i}`);
      }
    }
    if (!post) throw new Error("Gagal membuat slug unik");

    const parsed = parsePostImage(post.image);

    return NextResponse.json(
      {
        post: {
          ...post,
          images: parsed.images,
          linkUrl: parsed.linkUrl,
          githubUrl: parsed.githubUrl,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
