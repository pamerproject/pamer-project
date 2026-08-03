"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslation } from "@/lib/lang";
import Avatar from "@/components/ui/Avatar";
import { parsePostImage, getTimeAgo, getObjPosition, getZoomLevel, translateApiError } from "@/lib/helpers";
import renderContent from "@/lib/renderContent";
import { useInfiniteScroll } from "@/lib/hooks";
import PageSkeleton from "@/components/PageSkeleton";
import dynamic from "next/dynamic";
const FeedItem = dynamic(() => import("@/components/FeedItem"));
import JobCard from "@/components/JobCard";
import MyJobsList from "@/components/MyJobsList";
import AdsCard from "@/components/AdsCard";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
const PostJobModal = dynamic(() => import("@/components/PostJobModal"));
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Types ──────────────────────────────────────────────────────
interface PinnedProject {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image: string | null;
  tags: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  visibility?: string;
  _count?: { comments: number; likes: number };
}

interface ProfileJob {
  id: string;
  title: string;
  company: string;
  slug: string | null;
  type: string | null;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  location: string | null;
  image: string | null;
  description: string | null;
  status: string;
  createdAt: string;
}

interface ProfileUser {
  id: string;
  name: string | null;
  username: string;
  bio: string | null;
  avatar: string | null;
  avatarPosition: string;
  coverImage: string | null;
  coverPosition: string;
  website: string | null;
  github: string | null;
  linkedin: string | null;
  createdAt: string;
  _count: { posts: number; projects: number; likes: number; jobs: number };
  posts: ProfilePost[];
  projects: PinnedProject[];
  jobs: ProfileJob[];
}

interface ProfilePost {
  id: string;
  slug: string;
  content: string;
  image: string | null;
  createdAt: string;
  type: string;
  projectId: string | null;
  project: PinnedProject | null;
  _count: { comments: number; likes: number };
}

type Tab = "cerita" | "project" | "freelance";

// ─── Component ──────────────────────────────────────────────────
export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { data: session } = useSession();
  const { t, lang } = useTranslation();
  const currentUsername = session?.user?.username;

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("project");
  const [showPostModal, setShowPostModal] = useState(false);

  // Edit/delete post
  const [editingPost, setEditingPost] = useState<ProfilePost | null>(null);
  const [deletingPost, setDeletingPost] = useState<ProfilePost | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editGithubUrl, setEditGithubUrl] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagsInput, setEditTagsInput] = useState("");
  const [editVisibility, setEditVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [editSaving, setEditSaving] = useState(false);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close three-dot menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuPostId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleEditPost = async () => {
    if (editingPost?.type === "cerita" && !editContent.trim()) return;
    if (editingPost?.type === "project" && !editTitle.trim()) return;
    setEditSaving(true);
    const postId = editingPost!.id;
    try {
      const body: Record<string, unknown> = {};
      if (editingPost?.type === "cerita") body.content = editContent.trim();
      else {
        body.title = editTitle.trim();
        body.description = editDescription.trim() || null;
        body.content = "";
      }
      body.images = editImages;
      body.linkUrl = editLinkUrl || null;
      body.githubUrl = editGithubUrl || null;
      if (editingPost?.type === "project") {
        body.tags = editTags;
        body.visibility = editVisibility;
      }
      const slug = editingPost!.slug;
      const editUrl = slug && slug !== "null" ? `/api/posts/${slug}` : `/api/posts/_?postId=${postId}`;
      const res = await fetch(editUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setAllPosts((prev) => prev.map((p) =>
          p.id === postId ? { ...p, ...data.post } : p
        ));
        setEditingPost(null);
      }
    } catch {} finally {
      setEditSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (!deletingPost || deletingLoading) return;
    const deletedId = deletingPost.id;
    setAllPosts((prev) => prev.filter((p) => p.id !== deletedId));
    setDeletingPost(null);
    setDeletingLoading(true);
    try {
      const slug = deletingPost.slug;
      const delUrl = slug && slug !== "null" ? `/api/posts/${slug}` : `/api/posts/_?postId=${deletedId}`;
      const res = await fetch(delUrl, { method: "DELETE" });
      if (!res.ok) {
        alert(t("error.failedToLoad"));
        setRefreshKey((k) => k + 1);
      }
    } catch {
      alert(t("error.networkError"));
    } finally {
      setDeletingLoading(false);
    }
  };

  const handlePinProject = async (post: ProfilePost, currentlyPinned: boolean) => {
    const projectData = post.project;
    if (!projectData) return;
    const pinnedCount = pinnedProjects.length;

    if (!currentlyPinned && pinnedCount >= 5) {        alert(t("rightSidebar.maxPinnedWarning"));
      return;
    }

    const pinEntry: PinnedProject = {
      ...projectData,
      _count: { comments: post._count.comments, likes: post._count.likes },
    };

    if (!currentlyPinned) {
      setPinnedProjects((prev) => [pinEntry, ...prev]);
    } else {
      setPinnedProjects((prev) => prev.filter((p) => p.id !== projectData.id));
    }
    setOpenMenuPostId(null);

    try {
      const slug = projectData.slug;
      const pinUrl = slug && slug !== "null" ? `/api/projects/${slug}/pin` : `/api/projects/_/pin?projectId=${projectData.id}`;
      const res = await fetch(pinUrl, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(translateApiError(data.message, t) || t("rightSidebar.unpinFailed"));
        setRefreshKey((k) => k + 1);
      }
      window.dispatchEvent(new CustomEvent("pinned-projects-updated"));
    } catch {        alert(t("error.networkError"));
        setRefreshKey((k) => k + 1);
      window.dispatchEvent(new CustomEvent("pinned-projects-updated"));
    }
  };

  const openEditModal = (post: ProfilePost) => {
    const parsed = parsePostImage(post.image);
    setEditingPost(post);
    setEditContent(post.content || "");
    setEditTitle(post.project?.title || "");
    setEditDescription(post.project?.description || "");
    setEditImages(parsed.images);
    setEditLinkUrl(parsed.linkUrl || "");
    setEditGithubUrl(parsed.githubUrl || "");
    setEditTags(post.project?.tags || []);
    setEditTagsInput("");
    setEditVisibility(post.project?.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC");
    setOpenMenuPostId(null);
  };

  const handleEditUploadImage = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setEditImageUploading(true);
      try {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data?.preview) setEditImages((prev) => [...prev, data.preview]);
      } catch {} finally { setEditImageUploading(false); }
    };
    input.click();
  };

  // Pinned projects state
  const [pinnedProjects, setPinnedProjects] = useState<PinnedProject[]>([]);

  // Lazy load posts — pagination PER TIPE (cerita & project terpisah)
  // supaya project tidak tenggelam di bawah banyak cerita.
  const [allPosts, setAllPosts] = useState<ProfilePost[]>([]);
  const [postsSkip, setPostsSkip] = useState<Record<"cerita" | "project", number>>({ cerita: 10, project: 10 });
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState<Record<"cerita" | "project", boolean>>({ cerita: false, project: false });

  const loadMorePosts = useCallback(async () => {
    const type: "cerita" | "project" | null = activeTab === "freelance" ? null : activeTab;
    if (!username || !type || postsLoadingMore || !postsHasMore[type]) return;
    setPostsLoadingMore(true);
    try {
      const res = await fetch(`/api/users/${username}/posts?type=${type}&skip=${postsSkip[type]}&take=10`);
      if (res.ok) {
        const data = await res.json();
        if (data.posts && data.posts.length > 0) {
          // Guard dedup — hindari post ganda bila API berubah di kemudian hari
          setAllPosts((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            const fresh = data.posts.filter((p: ProfilePost) => !existing.has(p.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
          setPostsSkip((s) => ({ ...s, [type]: s[type] + 10 }));
        }
        if (!data.posts || data.posts.length < 10) {
          setPostsHasMore((h) => ({ ...h, [type]: false }));
        }
      } else {
        setPostsHasMore((h) => ({ ...h, [type]: false }));
      }
    } catch {
      setPostsHasMore((h) => ({ ...h, [type]: false }));
    } finally {
      setPostsLoadingMore(false);
    }
  }, [username, activeTab, postsSkip, postsLoadingMore, postsHasMore]);

  const { sentinelRef } = useInfiniteScroll(
    loadMorePosts,
    activeTab === "freelance" ? false : postsHasMore[activeTab],
    loading || postsLoadingMore
  );

  const isOwnProfile = !!session && currentUsername === username;

  // Fetch profile
  useEffect(() => {
    let ignore = false;
    setLoading(true);

    if (!isOwnProfile && session?.user?.id) {
      fetch(`/api/visit/${username}`, { method: "POST" }).catch(() => {});
    }

    fetch(`/api/users/${username}`)
      .then(async (res) => {
        if (res.status === 404) {
          // Profil dihapus / tidak ada / tidak berhak lihat → tampilkan not-found
          if (!ignore) {
            setNotFound(true);
            setLoading(false);
          }
          return null;
        }
        if (!res.ok) throw new Error(t("error.failedToLoad"));
        return res.json();
      })
      .then((data) => {
        if (!ignore && data?.user) {
          setUser(data.user);
          setAllPosts(data.user?.posts || []);
          setPinnedProjects(data.user?.projects || []);
          // Masing-masing tipe di-load 10 terbaru dari API profile
          const ceritaCount = (data.user?.posts || []).filter((p: ProfilePost) => p.type === "cerita").length;
          const projectCount = (data.user?.posts || []).filter((p: ProfilePost) => p.type === "project").length;
          setPostsSkip({ cerita: Math.min(ceritaCount, 10), project: Math.min(projectCount, 10) });
          setPostsHasMore({ cerita: ceritaCount >= 10, project: projectCount >= 10 });
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [username, refreshKey]);

  // ─── Loading skeleton ───────────────────────────────────────
  if (loading) {
    return <PageSkeleton />;
  }

  // ─── Error / User tidak ditemukan ───────────────────────────────
  if (error || !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        {/* Avatar placeholder — komponen Avatar yang sama seperti di komentar */}
        <div className="relative mb-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--brand-light)] ring-4 ring-[var(--brand)]/10">
            <Avatar src={null} name="?" size="xl" />
          </div>
          <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white shadow-lg">
            ?
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {notFound ? t("error.userNotFound") : error || t("error.userNotFound")}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
          {lang === "id"
            ? "Profil yang kamu cari mungkin sudah dihapus, diganti nama, atau belum pernah ada. Coba periksa kembali URL-nya."
            : "The profile you're looking for might have been removed, renamed, or never existed. Try checking the URL again."}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--brand-hover)] hover:shadow-md active:scale-[0.97]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            {t("error.backToHome")}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-3 text-sm font-medium text-[var(--foreground)] shadow-sm transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] active:scale-[0.97]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            {lang === "id" ? "Kembali" : "Go Back"}
          </button>
        </div>
      </div>
    );
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Banner verifikasi email — hanya untuk pemilik profil yang belum konfirmasi */}
      {isOwnProfile && <EmailVerifyBanner />}
      <div>
        {/* ── Cover Photo ─────────────────────────────── */}
            <div className="group relative h-48 overflow-hidden md:h-56 md:rounded-t-xl">
              {user.coverImage ? (
                <img
                  src={user.coverImage}
                  alt="Cover"
                  className="h-full w-full transition-all duration-300"
                  style={{
                    objectFit: "cover",
                    objectPosition: getObjPosition(user.coverPosition),
                    transform: `scale(${getZoomLevel(user.coverPosition) / 100})`,
                  }}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[var(--brand)]/20 via-[var(--brand)]/10 to-[var(--background)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-transparent to-transparent" />
            </div>

            {/* ── Profile Info ────────────────────────────── */}
            <div className="card-app relative border-b border-[var(--card-border)] bg-[var(--card)] px-4 pb-6 md:rounded-b-xl md:border-l md:border-r md:px-6">
              {/* Avatar */}
              <div className="group/av relative -mt-16 inline-block md:-mt-20">
                {user.avatar ? (
                  <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[var(--card)] shadow-lg transition-all duration-200 md:h-32 md:w-32">
                    <img
                      src={user.avatar}
                      alt={user.name || user.username}
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: getObjPosition(user.avatarPosition),
                        transform: `scale(${getZoomLevel(user.avatarPosition) / 100})`,
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[var(--card)] bg-[var(--brand)] text-4xl font-bold text-white shadow-lg md:h-32 md:w-32">
                    {(user.name || user.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name & username */}
              <div className="mt-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold md:text-2xl">
                      {user.name || user.username}
                    </h1>
                    {isOwnProfile && (
                      <Link
                        href="/settings"
                        className="rounded-lg p-1 text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                      >
                        <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                    )}
                  </div>
                  <p className="text-sm text-[var(--brand)]">@{user.username}</p>
                </div>
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <span className="block text-lg font-extrabold">{user._count.projects}</span>
                    <span className="text-xs text-[var(--muted)]">{t("profile.project")}</span>
                  </div>
                  <div>
                    <span className="block text-lg font-extrabold">{user._count.posts}</span>
                    <span className="text-xs text-[var(--muted)]">{t("profile.cerita")}</span>
                  </div>
                  <div>
                    <span className="block text-lg font-extrabold">{user._count.likes}</span>
                    <span className="text-xs text-[var(--muted)]">{t("profile.mantap")}</span>
                  </div>
                </div>
              </div>

              {/* Member since */}
              <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {t("profile.memberSince")} {memberSince}
              </div>

              {/* Bio & Links */}
              <div className="mt-3">
                {user.bio && (
                  <div className="text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">{renderContent(user.bio, false)}</div>
                )}

                <div className="mt-2 flex flex-wrap gap-3">
                  {user.website && (
                    <a href={user.website} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--brand)]">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      {new URL(user.website).hostname}
                    </a>
                  )}
                  {user.github && (
                    <a href={user.github} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--brand)]">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      GitHub
                    </a>
                  )}
                  {user.linkedin && (
                    <a href={user.linkedin} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--brand)]">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* ── Tabs ────────────────────────────────────── */}
            <div className="mt-4">
              <div className="flex border-b border-[var(--card-border)]">
                {(["project", "cerita", "freelance"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative flex-1 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                      activeTab === tab
                        ? "text-[var(--brand)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {tab === "cerita" && `${t("profile.tabCerita")} (${user._count.posts})`}
                    {tab === "project" && `${t("profile.tabProject")} (${user._count.projects})`}
                    {tab === "freelance" && `${t("profile.tabFreelance")} (${user._count.jobs})`}
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)]" />
                    )}
                  </button>
                ))}
              </div>

              {/* ── Tab: Cerita ──────────────────────────── */}
              {activeTab === "cerita" && (
                <div className="mt-4 space-y-2.5 md:space-y-4">
                  {allPosts.filter((p) => p.type === "cerita").map((post, index) => {
                    const parsed = parsePostImage(post.image);
                    return (
                      <div key={post.id}>
                        {/* Iklan Hostinger — disisipkan setiap 10 feed */}
                        {index > 0 && index % 10 === 0 && <div className="mb-4"><AdsCard /></div>}
                        <div className="group relative">
                        {isOwnProfile && (
                          <div className="absolute right-2 top-2 z-20">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuPostId(openMenuPostId === post.id ? null : post.id); }}
                              className="rounded-lg p-1.5 text-[var(--muted)] opacity-100 transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)] md:opacity-0 md:group-hover:opacity-100"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                              </svg>
                            </button>
                            {openMenuPostId === post.id && (
                              <div ref={menuRef} className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditModal(post); }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--brand-light)]"
                                >
                                  <svg className="h-4 w-4 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                  </svg>
                                  {t("profile.editPost")}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeletingPost(post); setOpenMenuPostId(null); }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/50"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                  {t("profile.deletePost")}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <FeedItem
                          refPath={`u/${username}`}
                          id={post.id}
                          slug={post.slug}
                          type={post.type}
                          name={user.name || user.username}
                          username={user.username}
                          time={getTimeAgo(post.createdAt, t, lang)}
                          content={post.content}
                          images={parsed.images}
                          linkUrl={post.project?.liveUrl || null}
                          githubUrl={post.project?.repoUrl || null}
                          avatar={user.avatar || undefined}
                          likes={post._count?.likes || 0}
                          comments={post._count?.comments || 0}
                        />
                        </div>
                      </div>
                    );
                  })}
                  {allPosts.filter((p) => p.type === "cerita").length === 0 && (
                    <div className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
                        <svg className="h-8 w-8 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold">{t("profile.noCerita")}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">{t("profile.noCeritaDesc", { name: user.name || user.username })}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Project ── */}
              {activeTab === "project" && (
                <div className="mt-4 space-y-2.5 md:space-y-4">
                  {allPosts.filter((p) => p.type === "project").map((post, index) => {
                    const parsed = parsePostImage(post.image);
                    const projectData = post.project ? {
                      id: post.project.id,
                      slug: post.project.slug,
                      title: post.project.title,
                      description: post.project.description,
                      tags: post.project.tags,
                      image: post.project.image,
                    } : undefined;
                    return (
                      <div key={post.id}>
                        {/* Iklan Hostinger — disisipkan setiap 10 feed */}
                        {index > 0 && index % 10 === 0 && <div className="mb-4"><AdsCard /></div>}
                        <div className="group relative">
                        {isOwnProfile && (
                          <div className="absolute right-2 top-2 z-20">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuPostId(openMenuPostId === post.id ? null : post.id); }}
                              className="rounded-lg p-1.5 text-[var(--muted)] opacity-100 transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)] md:opacity-0 md:group-hover:opacity-100"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                              </svg>
                            </button>
                            {openMenuPostId === post.id && (
                              <div ref={menuRef} className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditModal(post); }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--brand-light)]"
                                >
                                  <svg className="h-4 w-4 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                  </svg>
                                  {t("profile.editPost")}
                                </button>
                                {(() => {
                                  const isPinned = post.project ? pinnedProjects.some((p) => p.id === post.project!.id) : false;
                                  const atMax = pinnedProjects.length >= 5 && !isPinned;
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (atMax) return;
                                        handlePinProject(post, isPinned);
                                      }}
                                      disabled={atMax}
                                      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                                        atMax
                                          ? "cursor-not-allowed text-[var(--muted)]/50"
                                          : isPinned
                                            ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                            : "text-[var(--brand)] hover:bg-[var(--brand-light)]"
                                      }`}
                                    >
                                      <svg className="h-4 w-4" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                      </svg>
                                      {isPinned ? t("project.pinnedProject") : atMax ? t("project.pinMax") : t("project.pinProject")}
                                    </button>
                                  );
                                })()}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeletingPost(post); setOpenMenuPostId(null); }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/50"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                  {t("profile.deletePost")}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <FeedItem
                          refPath={`u/${username}`}
                          id={post.id}
                          slug={post.slug}
                          type={post.type}
                          name={user.name || user.username}
                          username={user.username}
                          time={getTimeAgo(post.createdAt, t, lang)}
                          content={post.content}
                          images={parsed.images}
                          linkUrl={post.project?.liveUrl || null}
                          githubUrl={post.project?.repoUrl || null}
                          avatar={user.avatar || undefined}
                          likes={post._count?.likes || 0}
                          comments={post._count?.comments || 0}
                          project={projectData}
                        />
                        </div>
                      </div>
                    );
                  })}
                  {allPosts.filter((p) => p.type === "project").length === 0 && (
                    <div className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
                        <svg className="h-8 w-8 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold">{t("profile.noProject")}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">{t("profile.noProjectDesc", { name: user.name || user.username })}</p>
                    </div>
                  )}
                </div>
              )}

          {/* ── Tab: Freelance ── */}
                  {activeTab === "freelance" && (
            <div className="mt-4">
              {isOwnProfile ? (
                    <>
                      <button
                        onClick={() => setShowPostModal(true)}
                        className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)]"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {t("profile.postFreelance")}
                      </button>
                      <MyJobsList key={refreshKey} />
                    </>
                  ) : (
                    <>
                      {user.jobs.length > 0 ? (
                        <div className="space-y-3">
                          {user.jobs.map((job) => (
                            <JobCard
                              key={job.id}
                              job={{
                                ...job,
                                postedAt: job.createdAt,
                                user: { name: user.name, username: user.username, avatar: user.avatar },
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
                          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
                            <svg className="h-8 w-8 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>                      <h3 className="text-lg font-bold">{t("profile.noJobs")}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                            {t("profile.noJobsDesc", { name: user.name || user.username })}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Infinite scroll sentinel — memuat post berikutnya per tipe aktif */}
              {(activeTab === "cerita" || activeTab === "project") && (
                <>
                  {postsHasMore[activeTab] && <div ref={sentinelRef} className="h-4" />}
                  {postsLoadingMore && (
                    <div className="flex items-center justify-center py-4">
                      <svg className="h-5 w-5 animate-spin text-[var(--muted)]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </>
              )}
            </div>
        </div>

      {/* ── Edit Post Modal ─────────────────────────────────── */}
      {editingPost && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50" onClick={() => setEditingPost(null)}>
          <div
            className="mx-2 w-full max-w-2xl rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-base font-bold">
                {editingPost.type === "project" ? t("profile.editProjectTitle") : t("profile.editPostTitle")}
              </h3>
              <button onClick={() => setEditingPost(null)} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[65vh] overflow-y-auto p-4">
              {editingPost.type === "project" && (
                <div className="space-y-3">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t("createPost.projectTitle")}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder={t("createPost.projectDesc")}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[var(--card-border)] bg-transparent px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                  />

                  {/* Tags */}
                  <div>
                    <input
                      type="text"
                      value={editTagsInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditTagsInput(val);
                        if (val.endsWith(",") || val.endsWith(" ")) {
                          const newTag = val.replace(/[, ]+$/, "").trim();
                          if (newTag && !editTags.includes(newTag)) {
                            setEditTags([...editTags, newTag]);
                          }
                          setEditTagsInput("");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault();
                          const val = editTagsInput.trim();
                          if (val && !editTags.includes(val)) {
                            setEditTags([...editTags, val]);
                          }
                          setEditTagsInput("");
                        }
                        if (e.key === "Backspace" && !editTagsInput && editTags.length > 0) {
                          setEditTags(editTags.slice(0, -1));
                        }
                      }}
                      placeholder={t("createPost.tags")}
                      className="w-full rounded-xl border border-[var(--card-border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                    />
                    {editTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {editTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-light)] px-3 py-1 text-xs font-medium text-[var(--brand)]"
                          >
                            #{tag}
                            <button
                              onClick={() => setEditTags(editTags.filter((t) => t !== tag))}
                              className="hover:text-red-500"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visibility toggle */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--muted)]">{t("profile.visibility")}:</span>
                    <button
                      type="button"
                      onClick={() => setEditVisibility("PUBLIC")}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                        editVisibility === "PUBLIC"
                          ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
                          : "border-[var(--card-border)] text-[var(--muted)]"
                      }`}
                    >
                      {t("profile.public")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditVisibility("PRIVATE")}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                        editVisibility === "PRIVATE"
                          ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
                          : "border-[var(--card-border)] text-[var(--muted)]"
                      }`}
                    >
                      {t("profile.private")}
                    </button>
                  </div>
                </div>
              )}

              {editingPost.type === "cerita" && (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) setEditContent(e.target.value);
                    }}
                    placeholder={t("createPost.placeholder")}
                    rows={5}
                    className="w-full resize-none border-none bg-transparent text-base leading-relaxed outline-none placeholder:text-[var(--muted)]"
                  />
                  <div className="mt-1 text-right text-xs text-[var(--muted)]">
                    {1000 - editContent.length}/1000
                  </div>
                </div>
              )}
            </div>

            {/* Toolbar & Images */}
            <div className="border-y border-[var(--card-border)]">
              <div className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleEditUploadImage}
                    disabled={editImageUploading || editImages.length >= 3}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--brand)] hover:bg-[var(--brand-light)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    {editImageUploading ? t("profile.uploading") : t("profile.addImages")}
                  </button>
                  {editImages.length > 0 && (
                    <span className="ml-1 text-xs font-medium text-[var(--muted)]">
                      {editImages.length}/3
                    </span>
                  )}
                </div>
              </div>

              {/* Image previews */}
              {editImages.length > 0 && (
                <div className="border-t border-[var(--card-border)] px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    {editImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="group relative h-24 w-24 overflow-hidden rounded-xl border-2 border-[var(--card-border)] bg-[var(--background)] transition-all hover:border-[var(--brand)] hover:shadow-md"
                      >
                        <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent pb-1 pt-3" />
                        <button
                          onClick={() => setEditImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg opacity-100 transition-all hover:scale-110 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {editImageUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Link & GitHub URLs */}
            <div className="px-4 py-3 space-y-2">
              <div className="relative">
                <input
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                  placeholder={t("createPost.liveUrl")}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div className="relative">
                <input
                  value={editGithubUrl}
                  onChange={(e) => setEditGithubUrl(e.target.value)}
                  placeholder={t("createPost.repoUrl")}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-[var(--card-border)] px-4 py-4">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingPost(null)}
                  className="rounded-lg border border-[var(--card-border)] px-5 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                >
                  {t("profile.cancel")}
                </button>
                <button
                  onClick={handleEditPost}
                  disabled={editSaving || (editingPost.type === "cerita" && !editContent.trim()) || (editingPost.type === "project" && !editTitle.trim())}
                  className="rounded-lg bg-[var(--brand)] px-6 py-2 text-sm font-bold text-white hover:bg-[var(--brand-hover)] disabled:opacity-40"
                >
                  {editSaving ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t("profile.saving")}
                    </span>
                  ) : (
                    t("profile.save")
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Post Confirmation ────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleDeletePost}
        title={t("profile.confirmDelete")}
        message={t("profile.confirmDeleteMsg", { type: deletingPost?.type === "project" ? t("createPost.projectType")?.toLowerCase() : t("createPost.ceritaType")?.toLowerCase() })}
        confirmText={t("confirmDialog.delete")}
        variant="danger"
        loading={deletingLoading}
      />

      {/* ── Post Job Modal ──────────────────────────────────── */}
      {showPostModal && (
        <PostJobModal
          onClose={() => setShowPostModal(false)}
          onSuccess={() => {
            setShowPostModal(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

    </>
  );
}
