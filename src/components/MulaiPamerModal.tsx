"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Avatar from "./ui/Avatar";
import { useTranslation } from "@/lib/lang";
import { translateApiError } from "@/lib/helpers";
import ErrorAlert from "@/components/ui/ErrorAlert";

type PostType = "cerita" | "project";

/**
 * Data awal untuk mode edit — form diisi dari post yang sudah ada,
 * lalu submit memakai PATCH ke endpoint update.
 */
export interface PostEditData {
  id: string;
  slug: string | null;
  type: PostType;
  content: string;
  title: string;
  description: string;
  tags: string[];
  visibility: "PUBLIC" | "PRIVATE";
  linkUrl: string | null;
  githubUrl: string | null;
  images: string[];
}

interface MulaiPamerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Jika diisi, modal berfungsi sebagai EDIT (PATCH) dengan form terisi data post. */
  editPost?: PostEditData | null;
}

// Shared image upload logic (same as before)

function extractHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 512 * 1024;

// Prefix tetap untuk link GitHub — user cukup mengetik username/repo,
// hasil akhir selalu https://github.com/username/repo (tidak bisa link lain).
const GITHUB_PREFIX = "https://github.com/";

/**
 * Ekstrak handle (username/repo) dari input mentah user.
 * - Terima bentuk: username/repo, github.com/username/repo,
 *   https://github.com/username/repo (dengan/tanpa www)
 * - TOLAK link lain (bukan github.com) — return ""
 */
function extractGithubHandle(raw: string): string {
  const v = raw.trim();
  if (!v) return "";

  // Full URL github.com — ambil bagian setelah github.com/
  const fullMatch = v.match(/^https?:\/\/(?:www\.)?github\.com\/([\w.-]+(?:\/[\w.-]+)*)\/?$/i);
  if (fullMatch) return fullMatch[1];

  // Tanpa protokol: github.com/username/repo
  const bareMatch = v.match(/^github\.com\/([\w.-]+(?:\/[\w.-]+)*)\/?$/i);
  if (bareMatch) return bareMatch[1];

  // Link non-github (ada protokol http/https atau domain lain) — tolak
  if (/^(https?:\/\/|www\.|\w+\.\w{2,}\/)/i.test(v)) return "";

  // Handle polos: username/repo (tanpa spasi & karakter aneh)
  const plain = v.replace(/\s+/g, "");
  if (/^[\w.-]+(?:\/[\w.-]+)*$/.test(plain)) return plain;
  return "";
}

/**
 * Bangun URL GitHub final dari input mentah user.
 * Return string kosong jika input bukan link GitHub yang valid.
 */
function buildGithubUrl(raw: string): string {
  const handle = extractGithubHandle(raw);
  if (!handle) return "";
  return `${GITHUB_PREFIX}${handle}`;
}

// Kunci localStorage untuk draft form — isi form tidak hilang saat reload
const DRAFT_KEY = "pamer-draft";

interface DraftData {
  postType: "cerita" | "project";
  text: string;
  title: string;
  description: string;
  tags: string[];
  visibility: "PUBLIC" | "PRIVATE";
  linkUrl: string;
  githubUrl: string;
  images: { url: string; name: string; sizeKB: number }[];
}

interface PreviewImage {
  id: string;
  url: string;
  name: string;
  sizeKB: number;
  originalSizeKB: number;
  uploading: boolean;
}

export default function MulaiPamerModal({
  isOpen,
  onClose,
  onSuccess,
  editPost,
}: MulaiPamerModalProps) {
  const { t } = useTranslation();
  const { data: session, update } = useSession();
  const isEdit = !!editPost;

  // Refresh session when profile is updated (e.g. avatar change)
  // JWT callback akan membaca data terbaru langsung dari database
  useEffect(() => {
    const handler = () => { update(); };
    window.addEventListener("session-refresh", handler);
    return () => window.removeEventListener("session-refresh", handler);
  }, [update]);
  const [postType, setPostType] = useState<PostType>("project");
  const [fullscreen, setFullscreen] = useState(false);

  // Cerita fields
  const [text, setText] = useState("");

  // Project fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");

  // Shared fields
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const githubInputRef = useRef<HTMLInputElement>(null);

  const sessionUser = session?.user as { username?: string; name?: string | null; image?: string | null } | undefined;

  const objectUrlsRef = useRef<string[]>([]);
  const prevOpen = useRef(isOpen);

  // Bersihkan semua object URL
  const revokeObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }, []);

  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      revokeObjectUrls();
      setPostType("project");
      setVisibility("PUBLIC");
      setTitle("");
      setText("");
      setDescription("");
      setTagsInput("");
      setTags([]);
      setLinkUrl("");
      setGithubUrl("");
      setShowLinkInput(false);
      setShowGithubInput(false);
      setImages([]);
      setError("");

      if (editPost) {
        // Mode edit: isi form dari data post yang diedit (tidak pakai draft)
        // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill form saat modal edit dibuka
        setPostType(editPost.type);
        setText(editPost.content || "");
        setTitle(editPost.title || "");
        setDescription(editPost.description || "");
        setTags(Array.isArray(editPost.tags) ? editPost.tags : []);
        if (editPost.visibility === "PUBLIC" || editPost.visibility === "PRIVATE") {
          setVisibility(editPost.visibility);
        }
        setLinkUrl(editPost.linkUrl || "");
        setGithubUrl(editPost.githubUrl || "");
        setImages(
          Array.isArray(editPost.images)
            ? editPost.images.map((url) => ({
                id: Math.random().toString(36).slice(2),
                url,
                name: url.split("/").pop() || "image",
                sizeKB: 0,
                originalSizeKB: 0,
                uploading: false,
              }))
            : []
        );
      } else {
        // Pulihkan draft dari localStorage (isi form tidak hilang saat reload)
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (raw) {
            const d = JSON.parse(raw) as DraftData;
            setPostType(d.postType === "cerita" || d.postType === "project" ? d.postType : "project");
            setText(d.text || "");
            setTitle(d.title || "");
            setDescription(d.description || "");
            setTags(Array.isArray(d.tags) ? d.tags : []);
            if (d.visibility === "PUBLIC" || d.visibility === "PRIVATE") setVisibility(d.visibility);
            setLinkUrl(d.linkUrl || "");
            setGithubUrl(d.githubUrl || "");
            setImages(
              Array.isArray(d.images)
                ? d.images.map((img) => ({
                    id: Math.random().toString(36).slice(2),
                    url: img.url,
                    name: img.name,
                    sizeKB: img.sizeKB,
                    originalSizeKB: img.sizeKB,
                    uploading: false,
                  }))
                : []
            );
          }
        } catch {
          // Abaikan draft korup / localStorage tidak tersedia
        }
      }

      const timer = setTimeout(() => titleInputRef.current?.focus(), 100);
      prevOpen.current = true;
      return () => {
        clearTimeout(timer);
        revokeObjectUrls();
      };
    }
    if (!isOpen) {
      revokeObjectUrls();
      prevOpen.current = false;
    }
  }, [isOpen, revokeObjectUrls, editPost]);

  // Autosave draft ke localStorage setiap ada perubahan form (mode create saja —
  // mode edit tidak boleh menimpa draft create yang belum terkirim)
  useEffect(() => {
    if (!isOpen || isEdit) return;
    try {
      const draft: DraftData = {
        postType,
        text,
        title,
        description,
        tags,
        visibility,
        linkUrl,
        githubUrl,
        // Hanya simpan gambar yang sudah ter-upload (URL http) — blob local preview tidak bertahan setelah reload
        images: images
          .filter((i) => !i.uploading && /^https?:\/\//.test(i.url))
          .map((i) => ({ url: i.url, name: i.name, sizeKB: i.sizeKB })),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // localStorage penuh / tidak tersedia — abaikan
    }
  }, [isOpen, isEdit, postType, text, title, description, tags, visibility, linkUrl, githubUrl, images]);

  const uploadToServer = useCallback(
    async (file: File): Promise<PreviewImage> => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(translateApiError(errData.error, t) || t("settings.uploadFailed"));
      }

      const data = await res.json();

      return {
        id: Math.random().toString(36).slice(2),
        url: data.preview,
        name: data.file.name,
        sizeKB: data.file.sizeKB,
        originalSizeKB: Math.round(file.size / 1024),
        uploading: false,
      };
    },
    [t]
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const available = MAX_IMAGES - images.length;
      if (files.length > available) {
        setError(t("createPost.maxImages"));
        return;
      }

      // Validasi ukuran — kumpulin file yang valid
      let sizeErrorMsg = "";
      const validFiles: File[] = [];
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          if (!sizeErrorMsg) {
            sizeErrorMsg = t("settings.photoTooBig");
          }
        } else {
          validFiles.push(file);
        }
      }

      if (sizeErrorMsg) {
        setError(sizeErrorMsg);
      }

      // Kalau semua file gak valid, berhenti
      if (validFiles.length === 0) return;

      setError("");
      const remaining = MAX_IMAGES - images.length;
      const toUpload = validFiles.slice(0, remaining);

      if (toUpload.length === 0) return;

      const entries: { id: string; file: File; localUrl: string }[] = toUpload.map((f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        localUrl: URL.createObjectURL(f),
      }));

      // Simpan object URLs untuk cleanup
      objectUrlsRef.current.push(...entries.map((e) => e.localUrl));

      // Tampilkan preview lokal INSTAN (pake object URL)
      const previews: PreviewImage[] = entries.map((e) => ({
        id: e.id,
        url: e.localUrl, // Preview lokal instan!
        name: e.file.name,
        sizeKB: Math.round(e.file.size / 1024),
        originalSizeKB: Math.round(e.file.size / 1024),
        uploading: true, // Masih uploading ke server
      }));

      setImages((prev) => [...prev, ...previews]);

      // Upload ke server di background
      for (let i = 0; i < toUpload.length; i++) {
        try {
          const result = await uploadToServer(toUpload[i]);
          // Ganti local URL dengan R2 URL
          setImages((prev) =>
            prev.map((img) =>
              img.id === entries[i].id ? result : img
            )
          );
          // Revoke object URL setelah diganti
          URL.revokeObjectURL(entries[i].localUrl);
          const idx = objectUrlsRef.current.indexOf(entries[i].localUrl);
          if (idx !== -1) objectUrlsRef.current.splice(idx, 1);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : t("settings.uploadCompressing");
          setError(msg);
          setImages((prev) =>
            prev.filter((img) => img.id !== entries[i].id)
          );
          // Revoke object URL gagal
          URL.revokeObjectURL(entries[i].localUrl);
          const idx = objectUrlsRef.current.indexOf(entries[i].localUrl);
          if (idx !== -1) objectUrlsRef.current.splice(idx, 1);
        }
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [images.length, uploadToServer, t]
  );

  const removeImage = (id: string) => {
    const img = images.find((i) => i.id === id);
    if (img) {
      const idx = objectUrlsRef.current.indexOf(img.url);
      if (idx !== -1) {
        URL.revokeObjectURL(img.url);
        objectUrlsRef.current.splice(idx, 1);
      }
    }
    setImages((prev) => prev.filter((i) => i.id !== id));
  };

  const [submitting, setSubmitting] = useState(false);

  // Insert code block markers at cursor position in textarea
  const insertCodeBlock = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = text.substring(start, end);
    const codeBlock = selected
      ? `\`\`\`\n${selected}\n\`\`\``
      : `\`\`\`\n\n\`\`\``;
    const newText = text.substring(0, start) + codeBlock + text.substring(end);
    if (newText.length <= 1000) {
      setText(newText);
      // Set cursor position after the insert
      setTimeout(() => {
        const pos = selected ? start + codeBlock.length : start + 4; // cursor di baris kosong antara ```
        ta.focus();
        ta.setSelectionRange(pos, pos);
      }, 0);
    }
  };

  // Auto-detect code when pasting
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    // Deteksi apakah text yang di-paste terlihat seperti kode
    // (punya newlines + indentation atau karakter kode seperti {}; =>)
    const hasNewlines = pasted.includes('\n');
    const hasCodeChars = /[{};=<>]/.test(pasted);
    const hasIndent = /^\s/.test(pasted);
    const alreadyWrapped = /^```/.test(text.trim());

    if (hasNewlines && (hasCodeChars || hasIndent) && !alreadyWrapped) {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const wrapped = `\`\`\`\n${pasted}\n\`\`\``;
      const newText = text.substring(0, start) + wrapped + text.substring(end);
      if (newText.length <= 1000) {
        setText(newText);
      }
    }
  };

  const handleSubmit = async () => {
    if (postType === "cerita") {
      if (!text.trim() && images.length === 0 && !linkUrl && !githubUrl) {
        setError(t("createPost.placeholder"));
        return;
      }
    } else {
      if (!title.trim()) {
        setError(t("profile.confirmDeleteMsg", { type: t("createPost.projectTitle").toLowerCase() }));
        return;
      }
    }

    if (images.some((i) => i.uploading)) {
      setError(t("createPost.uploading"));
      return;
    }

    if (!session) {
      setError(t("home.loginPrompt"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        images: images.map((i) => i.url),
        linkUrl: linkUrl || null,
        // Pastikan githubUrl selalu valid github.com — abaikan link lain
        githubUrl: buildGithubUrl(githubUrl || "") || null,
      };

      if (!isEdit) {
        body.type = postType;
      }

      if (postType === "cerita") {
        body.content = text;
      } else {
        body.title = title;
        body.description = description;
        body.tags = tags;
        body.visibility = visibility;
      }

      // Mode edit → PATCH ke post yang ada (pakai slug kalau ada, fallback postId)
      // Mode create → POST ke /api/posts
      const editUrl =
        editPost && editPost.slug && editPost.slug !== "null"
          ? `/api/posts/${editPost.slug}`
          : editPost
            ? `/api/posts/_?postId=${editPost.id}`
            : null;

      const res = await fetch(editUrl || "/api/posts", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(translateApiError(err.message, t) || t("createPost.placeholder"));
      }

      onSuccess?.();
      window.dispatchEvent(new CustomEvent("post-created"));
      if (!isEdit) {
        // Hapus draft hanya di mode create
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // abaikan
        }
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.errorOccurred");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex bg-black/50 ${
        fullscreen ? "items-stretch justify-stretch p-0" : "items-start justify-center pt-10 md:pt-20"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex flex-col bg-[var(--card)] shadow-lg ${
          fullscreen
            ? "h-full w-full rounded-none border-0"
            : "mx-2 w-full max-w-2xl rounded-2xl border border-[var(--card-border)]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {isEdit ? (
            <h3 className="text-base font-bold">
              {postType === "project" ? t("profile.editProjectTitle") : t("profile.editPostTitle")}
            </h3>
          ) : (
            <div className="flex items-center gap-1 rounded-xl border border-[var(--card-border)] p-0.5">
              <button
                onClick={() => { setPostType("project"); setTimeout(() => titleInputRef.current?.focus(), 100); }}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${
                  postType === "project"
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {t("createPost.projectType")}
              </button>
              <button
                onClick={() => { setPostType("cerita"); setTimeout(() => textareaRef.current?.focus(), 100); }}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${
                  postType === "cerita"
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {t("createPost.ceritaType")}
              </button>
            </div>
          )}
          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? t("createPost.exitFullscreen") : t("createPost.fullscreen")}
            aria-label={fullscreen ? t("createPost.exitFullscreen") : t("createPost.fullscreen")}
            className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
          >
            {fullscreen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9.75M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 14.25M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9.75M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 14.25" />
              </svg>
            )}
          </button>
        </div>

        <div className={`overflow-y-auto p-4 ${fullscreen ? "flex-1" : "max-h-[65vh]"}`}>
          {error && <ErrorAlert message={error} />}

          {/* Header user info */}
          <div className="flex items-center gap-3">
            <Avatar src={sessionUser?.image} name={sessionUser?.name || "User"} size="sm" />
            <div>
              <span className="text-sm font-bold">{sessionUser?.name || sessionUser?.username || "User"}</span>
              {sessionUser?.name && sessionUser?.username && (
                <span className="block text-[11px] text-[var(--brand)]">@{sessionUser.username}</span>
              )}
            </div>
          </div>

              {postType === "project" ? (
                <div className={`mt-4 space-y-4 ${fullscreen ? "flex h-full flex-col" : ""}`}>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("createPost.projectTitle")}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("createPost.projectDesc")}
                    rows={3}
                    className={`w-full resize-none rounded-xl border border-[var(--card-border)] bg-transparent px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)] ${fullscreen ? "flex-1" : ""}`}
                  />
                  <div>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTagsInput(val);
                        if (val.endsWith(",") || val.endsWith(" ")) {
                          const newTag = val.replace(/[, ]+$/, "").trim();
                          if (newTag && !tags.includes(newTag)) {
                            setTags([...tags, newTag]);
                          }
                          setTagsInput("");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault();
                          const val = tagsInput.trim();
                          if (val && !tags.includes(val)) {
                            setTags([...tags, val]);
                          }
                          setTagsInput("");
                        }
                        if (e.key === "Backspace" && !tagsInput && tags.length > 0) {
                          setTags(tags.slice(0, -1));
                        }
                      }}
                      placeholder={t("createPost.tags")}
                      className="w-full rounded-xl border border-[var(--card-border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                    />
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-light)] px-3 py-1 text-xs font-medium text-[var(--brand)]"
                          >
                            #{tag}
                            <button
                              onClick={() => setTags(tags.filter((t) => t !== tag))}
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

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--muted)]">{t("profile.visibility")}:</span>
                    <button
                      type="button"
                      onClick={() => setVisibility(visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC")}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                        visibility === "PUBLIC"
                          ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
                          : "border-[var(--card-border)] text-[var(--muted)]"
                      }`}
                    >
                      {t("profile.public")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility(visibility === "PRIVATE" ? "PUBLIC" : "PRIVATE")}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                        visibility === "PRIVATE"
                          ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
                          : "border-[var(--card-border)] text-[var(--muted)]"
                      }`}
                    >
                      {t("profile.private")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`mt-3 ${fullscreen ? "flex h-full flex-col" : ""}`}>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => {
                      if (e.target.value.length <= 1000) setText(e.target.value);
                    }}
                    onPaste={handlePaste}
                    placeholder={t("createPost.placeholder")}
                    className={`w-full resize-none border-none bg-transparent text-base leading-relaxed outline-none placeholder:text-[var(--muted)] ${fullscreen ? "flex-1" : ""}`}
                    rows={5}
                  />
                  <div className="mt-1 text-right text-xs text-[var(--muted)]">
                    {1000 - text.length}/1000
                  </div>
                </div>
              )}
        </div>

        <div className="border-y border-[var(--card-border)]">
          <div className="px-4 py-3">
            <div className="flex items-center gap-1">
              <span className="mr-2 hidden text-sm text-[var(--muted)] md:inline">{t("createPost.title")}:</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= MAX_IMAGES}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--brand)] hover:bg-[var(--brand-light)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {images.length >= MAX_IMAGES ? t("createPost.maxImages") : t("createPost.photo")}
              </button>
              {images.length > 0 && (
                <span className="ml-1 text-xs font-medium text-[var(--muted)]">
                  {images.length}/{MAX_IMAGES}
                </span>
              )}
              <button
                onClick={() => {
                  setShowLinkInput(!showLinkInput);
                  setShowGithubInput(false);
                  setTimeout(() => linkInputRef.current?.focus(), 50);
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--brand)] hover:bg-[var(--brand-light)]"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
                </svg>
                {t("createPost.link")}
              </button>
              <button
                onClick={() => {
                  setShowGithubInput(!showGithubInput);
                  setShowLinkInput(false);
                  setTimeout(() => githubInputRef.current?.focus(), 50);
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--brand)] hover:bg-[var(--brand-light)]"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {t("profile.github")}
              </button>
              <button
                onClick={insertCodeBlock}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--brand)] hover:bg-[var(--brand-light)]"
                title={t("codeBlock.code")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
                {t("codeBlock.code")}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff,image/bmp"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {images.length > 0 && (
            <div className="border-t border-[var(--card-border)] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--muted)]">
                  {images.length} {t("createPost.addImage")}
                </span>
                <span className="text-[10px] text-[var(--muted)]">
                  {t("chat.delete")}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    className="group relative h-28 w-28 overflow-hidden rounded-xl border-2 border-[var(--card-border)] bg-[var(--background)] transition-all hover:border-[var(--brand)] hover:shadow-md"
                  >
                    {/* Selalu tampilkan gambar (local preview atau R2) */}
                    <>
                      {/* unoptimized: preview bisa berupa blob: URL saat masih uploading */}
                      <Image
                        src={img.url}
                        alt={img.name}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="112px"
                      />

                      {/* Overlay spinner saat masih upload */}
                      {img.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="rounded-lg bg-black/70 px-3 py-2 text-center">
                            <svg className="mx-auto h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="mt-1 block text-[10px] font-medium text-white/80">
                              Mengompres...
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Gradient overlay with info badges */}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4">
                        <span className="rounded bg-black/50 px-1.5 text-[10px] font-medium text-white">
                          {img.sizeKB > 0 ? `${img.sizeKB}KB` : "IMG"}
                        </span>
                        <span className="rounded bg-black/50 px-1.5 text-[10px] font-medium text-white">
                          {index + 1}/{MAX_IMAGES}
                        </span>
                      </div>

                      {/* Delete button — always visible on mobile, shows on hover on desktop */}
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg opacity-100 transition-all hover:scale-110 active:scale-95 md:opacity-0 md:group-hover:opacity-100"
                        title={t("settings.removeLink")}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  </div>
                ))}

                {images.length < MAX_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-28 w-28 items-center justify-center rounded-xl border-2 border-dashed border-[var(--card-border)] bg-[var(--background)] text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span className="mt-1 block text-[10px] font-medium">
                        {t("settings.addLink")}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

          {showLinkInput && (
          <div className="px-4 pb-3">
            <input
              ref={linkInputRef}
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowLinkInput(false);
                  if (!linkUrl) setLinkUrl("");
                }
              }}
              placeholder="https://example.com/projectku"
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              autoFocus
            />
          </div>
        )}

        {showGithubInput && (
          <div className="px-4 pb-3">
            <div className="flex items-center overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--background)] focus-within:border-[var(--brand)]">
              <span className="shrink-0 select-none border-r border-[var(--card-border)] bg-[var(--brand-light)]/50 px-3 py-2 text-sm font-medium text-[var(--brand)]">
                {GITHUB_PREFIX}
              </span>
              <input
                ref={githubInputRef}
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={extractGithubHandle(githubUrl)}
                onChange={(e) => setGithubUrl(buildGithubUrl(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowGithubInput(false);
                    if (!githubUrl) setGithubUrl("");
                  }
                }}
                placeholder="username/repo"
                className="w-full min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)]"
                autoFocus
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--muted)]">
              {t("createPost.githubHint")}
            </p>
          </div>
        )}

        {linkUrl && !showLinkInput && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)]">
              <svg className="h-4 w-4 text-[var(--brand)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">
                {extractHostname(linkUrl)}
              </span>
              <span className="block truncate text-[11px] text-[var(--muted)]">
                {linkUrl}
              </span>
            </div>
            <button
              onClick={() => { setLinkUrl(""); setShowLinkInput(false); }}
              className="rounded p-1 text-[var(--muted)] hover:bg-red-50 hover:text-red-500"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {githubUrl && !showGithubInput && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)]">
              <svg className="h-4 w-4 text-[var(--brand)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">
                GitHub Repository
              </span>
              <span className="block truncate text-[11px] text-[var(--muted)]">
                {githubUrl}
              </span>
            </div>
            <button
              onClick={() => { setGithubUrl(""); setShowGithubInput(false); }}
              className="rounded p-1 text-[var(--muted)] hover:bg-red-50 hover:text-red-500"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className={`px-4 pb-6 pt-3 ${fullscreen ? "flex justify-end" : ""}`}>
          <button
            onClick={handleSubmit}
            disabled={submitting || (postType === "cerita" ? (!text.trim() && images.length === 0 && !linkUrl && !githubUrl) : !title.trim())}
            className={`rounded-lg bg-[var(--brand)] py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)] disabled:opacity-50 ${
              fullscreen ? "px-8" : "w-full"
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isEdit ? t("profile.saving") : t("createPost.saving")}
              </span>
            ) : (
              isEdit ? t("profile.save") : t("createPost.post")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
