"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/lang";
import Avatar from "@/components/ui/Avatar";
import ImageCarousel from "@/components/ui/ImageCarousel";
import EmojiPicker, { isOnlyEmoji } from "@/components/ui/EmojiPicker";
import StickerPicker from "@/components/ui/StickerPicker";
import EmojiStickerSheet from "@/components/ui/EmojiStickerSheet";
import { useInfiniteScroll, useKeepAboveKeyboard } from "@/lib/hooks";
import renderContent from "@/lib/renderContent";
import Breadcrumb from "@/components/Breadcrumb";
import { translateApiError } from "@/lib/helpers";
import NotFoundContent from "@/components/NotFoundContent";

/* ─── Types ──────────────────────────────────────────── */

interface ProjectData {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  tags: string[];
  image: string | null;
}

interface PostData {
  id: string;
  type: string;
  slug: string | null;
  content: string;
  images: string[];
  linkUrl: string | null;
  githubUrl: string | null;
  image: string | null;
  projectId: string | null;
  userId: string;
  createdAt: string;
  user: { id: string; name: string | null; username: string; avatar: string | null };
  project: ProjectData | null;
  _count: { comments: number; likes: number };
}

interface CommentUser {
  id: string;
  name: string | null;
  username: string;
  avatar: string | null;
}

interface ReplyData {
  id: string;
  content: string;
  userId: string;
  parentId: string | null;
  pinned: boolean;
  deleted: boolean;
  censored: boolean;
  editedAt: string | null;
  createdAt: string;
  user: CommentUser;
  _count: { likes: number };
  isLiked: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogSiteName: string | null;
}

interface CommentData {
  id: string;
  content: string;
  userId: string;
  parentId: string | null;
  pinned: boolean;
  deleted: boolean;
  censored: boolean;
  editedAt: string | null;
  createdAt: string;
  user: CommentUser;
  _count: { likes: number };
  isLiked: boolean;
  replies: ReplyData[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogSiteName: string | null;
}

function timeAgo(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return t("timeAgo.justNow");
  if (diff < 3600) return t("timeAgo.minutes", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("timeAgo.hours", { n: Math.floor(diff / 3600) });
  if (diff < 2592000) return t("timeAgo.days", { n: Math.floor(diff / 86400) });
  return t("timeAgo.months", { n: Math.floor(diff / 2592000) });
}

/* ─── Textarea Input with Mention ──────────────────────── */

function CommentTextarea({
  value,
  onChange,
  placeholder,
  onSubmit,
  onStickerSubmit,
  disabled,
  autoFocus,
  mentionUsers,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSubmit: () => void;
  onStickerSubmit?: (url: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  mentionUsers?: { name: string | null; username: string }[];
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);

  // ── Mention ──
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(-1);
  const mentionRef = useRef<HTMLDivElement>(null);

  const filtered = mentionUsers
    ? mentionUsers.filter((u) => {
        const q = mentionQuery.toLowerCase();
        return (u.name || u.username).toLowerCase().includes(q);
      })
    : [];

  const handleChange = (v: string) => {
    onChange(v);
    const pos = textareaRef.current?.selectionStart ?? v.length;
    const before = v.slice(0, pos);
    const atIdx = before.lastIndexOf("@");
    if (atIdx >= 0 && (atIdx === 0 || before[atIdx - 1] === " ")) {
      const q = before.slice(atIdx + 1);
      if (!q.includes(" ")) {
        // Aktif bahkan saat query kosong (baru ketik @) → tampilkan semua user
        setMentionActive(true);
        setMentionQuery(q);
        setMentionIndex(0);
      } else {
        setMentionActive(false);
        setMentionQuery("");
        setMentionIndex(-1);
      }
    } else {
      setMentionActive(false);
      setMentionQuery("");
      setMentionIndex(-1);
    }
  };

  const insertMention = (user: { name: string | null; username: string }) => {
    const pos = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const atIdx = before.lastIndexOf("@");
    const after = value.slice(pos);
    const label = user.name || user.username;
    const newVal = before.slice(0, atIdx) + "@" + label + " " + after;
    onChange(newVal);
    setMentionActive(false);
    setMentionQuery("");
    setMentionIndex(-1);
    setTimeout(() => {
      const newPos = atIdx + label.length + 2;
      textareaRef.current?.setSelectionRange(newPos, newPos);
      textareaRef.current?.focus();
    }, 0);
  };

  // Close mention on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setMentionActive(false);
        setMentionQuery("");
        setMentionIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (mentionActive && filtered.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex((i) => (i + 1) % filtered.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex((i) => (i - 1 + filtered.length) % filtered.length);
              } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(filtered[mentionIndex >= 0 ? mentionIndex : 0]);
              } else if (e.key === "Escape") {
                setMentionActive(false);
                setMentionQuery("");
                setMentionIndex(-1);
              }
            }
          }}
          placeholder={placeholder}
          rows={2}
          maxLength={160}
          autoFocus={autoFocus}
          className="flex-1 resize-none overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
        />
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-[var(--muted)]">{value.length}/160</span>
          <div className="flex items-center gap-1">
            {/* Emoji button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                className="rounded-lg p-1.5 text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                title={t("chat.emoji")}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </button>
              {showEmoji && (
                <div className="fixed inset-x-0 bottom-[20vh] z-[100] flex justify-center md:absolute md:bottom-full md:right-0 md:z-50 md:mb-2 md:block">
                  <EmojiPicker
                    onSelect={(emoji) => onChange(value + emoji)}
                    onClose={() => setShowEmoji(false)}
                  />
                </div>
              )}
            </div>
            {/* Sticker button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStickers(!showStickers)}
                className="rounded-lg p-1.5 text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                title={t("chat.stickers")}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456z" />
                </svg>
              </button>
              {showStickers && (
                <div className="fixed inset-x-0 bottom-[20vh] z-[100] flex justify-center md:absolute md:bottom-full md:right-0 md:z-50 md:mb-2 md:block">
                  <StickerPicker
                    onSelect={(sticker) => {
                      setShowStickers(false);
                      if (onStickerSubmit) {
                        onStickerSubmit(sticker.url);
                      } else {
                        onChange(sticker.url);
                        setTimeout(() => onSubmit(), 50);
                      }
                    }}
                    onClose={() => setShowStickers(false)}
                  />
                </div>
              )}
            </div>
            <button
              onClick={onSubmit}
              disabled={disabled || !value.trim()}
              className="self-start rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--brand-hover)] disabled:opacity-50 shrink-0"
            >
              {t("chat.send")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mention dropdown ── */}
      {mentionActive && filtered.length > 0 && (
        <div
          ref={mentionRef}
          className="absolute bottom-full left-0 z-50 mb-1 w-60 max-h-[40vh] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
        >
          {filtered.map((u, i) => (
            <button
              key={u.username}
              onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                i === mentionIndex ? "bg-[var(--brand-light)]" : "hover:bg-[var(--brand-light)]"
              }`}
            >
              <span className="font-medium text-[var(--foreground)]">{u.name || u.username}</span>
              <span className="text-xs text-[var(--muted)]">@{u.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


/* ─── Comment Item ────────────────────────────────────── */

function CommentItem({
  comment,
  isPostOwner,
  isCommentOwner,
  currentUserId,
  onLike,
  onPin,
  onReply,
  onEdit,
  onDelete,
  replyingTo,
  replyText,
  setReplyText,
  submitReply,
  onReplyStickerSubmit,
  editingId,
  editText,
  setEditText,
  saveEdit,
  cancelEdit,
  mentionUsers,
  mentionDisplayMap,
  mentionNameToUsername,
  t,
}: {
  comment: CommentData;
  isPostOwner: boolean;
  isCommentOwner: boolean;
  currentUserId: string | undefined;
  onLike: (id: string) => void;
  onPin: (id: string) => void;
  onReply: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  replyingTo: string | null;
  replyText: string;
  setReplyText: (v: string) => void;
  submitReply: () => void;
  onReplyStickerSubmit?: (url: string, parentId: string) => void;
  editingId: string | null;
  editText: string;
  setEditText: (v: string) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  mentionUsers?: { name: string | null; username: string }[];
  mentionDisplayMap?: Map<string, string>;
  mentionNameToUsername?: Map<string, string>;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const isReplying = replyingTo === comment.id;
  const isEditing = editingId === comment.id;

  // ── Reply emoji state ──
  const [showReplyEmoji, setShowReplyEmoji] = useState(false);
  const [showReplyStickers, setShowReplyStickers] = useState(false);

  // ── Reply mention ──
  const [replyMentionActive, setReplyMentionActive] = useState(false);
  const [replyMentionQuery, setReplyMentionQuery] = useState("");
  const [replyMentionIndex, setReplyMentionIndex] = useState(-1);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyMentionRef = useRef<HTMLDivElement>(null);

  const replyFiltered = mentionUsers
    ? mentionUsers.filter((u) => {
        const q = replyMentionQuery.toLowerCase();
        return (u.name || u.username).toLowerCase().includes(q);
      })
    : [];

  const handleReplyChange = (v: string) => {
    setReplyText(v);
    const pos = replyTextareaRef.current?.selectionStart ?? v.length;
    const before = v.slice(0, pos);
    const atIdx = before.lastIndexOf("@");
    if (atIdx >= 0 && (atIdx === 0 || before[atIdx - 1] === " ")) {
      const q = before.slice(atIdx + 1);
      if (!q.includes(" ")) {
        // Aktif bahkan saat query kosong (baru ketik @) → tampilkan semua user
        setReplyMentionActive(true);
        setReplyMentionQuery(q);
        setReplyMentionIndex(0);
      } else {
        setReplyMentionActive(false);
        setReplyMentionQuery("");
        setReplyMentionIndex(-1);
      }
    } else {
      setReplyMentionActive(false);
      setReplyMentionQuery("");
      setReplyMentionIndex(-1);
    }
  };

  const insertReplyMention = (user: { name: string | null; username: string }) => {
    const pos = replyTextareaRef.current?.selectionStart ?? replyText.length;
    const before = replyText.slice(0, pos);
    const atIdx = before.lastIndexOf("@");
    const after = replyText.slice(pos);
    const label = user.name || user.username;
    const newVal = before.slice(0, atIdx) + "@" + label + " " + after;
    setReplyText(newVal);
    setReplyMentionActive(false);
    setReplyMentionQuery("");
    setReplyMentionIndex(-1);
    setTimeout(() => {
      const newPos = atIdx + label.length + 2;
      replyTextareaRef.current?.setSelectionRange(newPos, newPos);
      replyTextareaRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (replyMentionRef.current && !replyMentionRef.current.contains(e.target as Node)) {
        setReplyMentionActive(false);
        setReplyMentionQuery("");
        setReplyMentionIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="group">
      {/* ── Main comment ── */}
      <div className={`flex gap-3 px-4 py-4 transition-all ${comment.pinned ? "bg-[var(--brand-light)]" : ""}`}>
        <Link href={`/u/${comment.user.username}`} className="shrink-0">
          <Avatar src={comment.user.avatar} name={comment.user.name} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-1.5">
            <Link
              href={`/u/${comment.user.username}`}
              className="text-xs font-bold text-[var(--foreground)] hover:text-[var(--brand)]"
            >
              {comment.user.name || comment.user.username}
            </Link>
            {comment.pinned && (
              <span className="inline-flex items-center gap-0.5 rounded bg-[var(--brand)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--brand)]">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                {t("project.pinned")}
              </span>
            )}
            <span className="text-[10px] text-[var(--muted)]">{timeAgo(comment.createdAt, t)}</span>
            {comment.editedAt && !comment.deleted && (
              <span className="text-[10px] italic text-[var(--muted)]">· {t("chat.edited")}</span>
            )}
          </div>

          {/* Content / deleted / edit mode */}
          {comment.deleted ? (
            <p className="mt-1 text-sm italic leading-relaxed text-[var(--muted)]">
              {t("chat.deletedByUser", { name: comment.user.name || comment.user.username })}
            </p>
          ) : isEditing ? (
            <div className="mt-1">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                rows={2}
                className="w-full resize-none overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                autoFocus
              />
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  disabled={!editText.trim()}
                  className="rounded-lg bg-[var(--brand)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50"
                >
                  {t("project.edit")}
                </button>
                <button
                  onClick={cancelEdit}
                  className="rounded-lg border border-[var(--card-border)] px-3 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {t("chat.cancel")}
                </button>
              </div>
            </div>
          ) : isOnlyEmoji(comment.content) && !comment.deleted ? (
            <div className="mt-2">
              <span className="inline-block text-5xl leading-none sm:text-6xl">{comment.content.trim()}</span>
            </div>
          ) : (
            <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap break-words">{renderContent(comment.content, true, mentionDisplayMap, mentionNameToUsername)}</div>
          )}

          {/* Censored note */}
          {comment.censored && !comment.deleted && (
            <p className="mt-2 flex flex-wrap items-center gap-1 text-[10px] italic text-[var(--muted)]">
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {t("comment.censoredNote")}{" "}
              <Link href="/terms" className="font-semibold text-[var(--brand)] hover:underline">{t("comment.censoredTermsLink")}</Link>
            </p>
          )}

          {/* Actions */}
          {!comment.deleted && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => onLike(comment.id)}
                className={`flex items-center gap-1 text-xs transition-all ${
                  comment.isLiked
                    ? "text-[var(--brand)]"
                    : "text-[var(--muted)] hover:text-[var(--brand)]"
                }`}
              >
                <svg className={`h-3.5 w-3.5 ${comment.isLiked ? "fill-current" : "fill-none"}`} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L9.46 2.71 8 4.17c-.21.21-.33.48-.33.77v.17l-.95 4.58c-.05.26-.09.52-.09.79v7.42c0 .9.71 1.63 1.6 1.64l7.82.34c.63.03 1.2-.32 1.45-.91l2.5-6.38c.1-.24.16-.5.16-.77z" />
                </svg>
                {comment._count.likes > 0 && comment._count.likes}
              </button>
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-[var(--muted)] hover:text-[var(--brand)] transition-all"
              >
                {t("project.reply")}
              </button>
              {isCommentOwner && (
                <>
                  <button
                    onClick={() => onEdit(comment.id, comment.content)}
                    className="text-xs text-[var(--muted)] hover:text-[var(--brand)] transition-all"
                  >
                    {t("project.edit")}
                  </button>
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="text-xs text-[var(--muted)] hover:text-red-500 transition-all"
                  >
                    {t("project.delete")}
                  </button>
                </>
              )}
              {isPostOwner && !isCommentOwner && (
                <button
                  onClick={() => onPin(comment.id)}
                  className="text-xs text-[var(--muted)] hover:text-[var(--brand)] transition-all"
                >
                  {comment.pinned ? t("comment.unpin") : t("comment.pin")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Reply input ── */}
      {isReplying && (
        <div className="hidden md:block relative border-t border-[var(--card-border)] bg-[var(--background)] px-4 py-4 pl-14">
          <div className="flex gap-2">
            <textarea
              ref={replyTextareaRef}
              value={replyText}
              onChange={(e) => handleReplyChange(e.target.value)}
              onKeyDown={(e) => {
                if (replyMentionActive && replyFiltered.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setReplyMentionIndex((i) => (i + 1) % replyFiltered.length);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setReplyMentionIndex((i) => (i - 1 + replyFiltered.length) % replyFiltered.length);
                  } else if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    insertReplyMention(replyFiltered[replyMentionIndex >= 0 ? replyMentionIndex : 0]);
                  } else if (e.key === "Escape") {
                    setReplyMentionActive(false);
                    setReplyMentionQuery("");
                    setReplyMentionIndex(-1);
                  }
                }
              }}
              placeholder={t("project.addComment")}
              rows={2}
              maxLength={160}
              className="flex-1 resize-none overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              autoFocus
            />
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] text-[var(--muted)]">{replyText.length}/160</span>
              <div className="flex items-center gap-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowReplyEmoji(!showReplyEmoji)}
                    className="rounded-lg p-1.5 text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                    title={t("chat.emoji")}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                    </svg>
                  </button>
                  {showReplyEmoji && (
                    <div className="fixed inset-x-0 bottom-[20vh] z-[100] flex justify-center md:bottom-[24vh]">
                      <EmojiPicker
                        onSelect={(emoji) => setReplyText(replyText + emoji)}
                        onClose={() => setShowReplyEmoji(false)}
                      />
                    </div>
                  )}
                </div>
                {/* Sticker button for reply */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowReplyStickers(!showReplyStickers)}
                    className="rounded-lg p-1.5 text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                    title={t("chat.stickers")}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456z" />
                    </svg>
                  </button>
                  {showReplyStickers && (
                    <div className="fixed inset-x-0 bottom-[20vh] z-[100] flex justify-center md:bottom-[24vh]">
                  <StickerPicker
                    onSelect={(sticker) => {
                      setShowReplyStickers(false);
                      if (onReplyStickerSubmit) {
                            onReplyStickerSubmit(sticker.url, comment.id);
                          }
                        }}
                        onClose={() => setShowReplyStickers(false)}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={submitReply}
                  disabled={!replyText.trim()}
                  className="self-start rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--brand-hover)] disabled:opacity-50 shrink-0"
                >
                  {t("chat.send")}
                </button>
              </div>
            </div>
          </div>
          {replyMentionActive && replyFiltered.length > 0 && (
            <div
              ref={replyMentionRef}
              className="absolute bottom-full left-0 z-50 mb-1 w-60 max-h-[40vh] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
            >
              {replyFiltered.map((u, i) => (
                <button
                  key={u.username}
                  onMouseDown={(e) => { e.preventDefault(); insertReplyMention(u); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    i === replyMentionIndex ? "bg-[var(--brand-light)]" : "hover:bg-[var(--brand-light)]"
                  }`}
                >
                  <span className="font-medium text-[var(--foreground)]">{u.name || u.username}</span>
                  <span className="text-xs text-[var(--muted)]">@{u.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Replies ── */}
      {comment.replies.length > 0 && (
        <div className="border-t border-[var(--card-border)] bg-[var(--background)]">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3 px-4 py-3 pl-14">
              <Link href={`/u/${reply.user.username}`} className="shrink-0">
                <Avatar src={reply.user.avatar} name={reply.user.name} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/u/${reply.user.username}`}
                    className="text-xs font-bold text-[var(--foreground)] hover:text-[var(--brand)]"
                  >
                    {reply.user.name || reply.user.username}
                  </Link>
                  <span className="text-[10px] text-[var(--muted)]">{timeAgo(reply.createdAt, t)}</span>
                  {reply.editedAt && !reply.deleted && (
                    <span className="text-[10px] italic text-[var(--muted)]">· {t("chat.edited")}</span>
                  )}
                </div>
                {reply.deleted ? (
                  <p className="mt-0.5 text-sm italic leading-relaxed text-[var(--muted)]">
                    {t("chat.deletedByUser", { name: reply.user.name || reply.user.username })}
                  </p>
                ) : editingId === reply.id ? (
                  <div className="mt-1">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                      rows={2}
                      className="w-full resize-none overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                      autoFocus
                    />
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={!editText.trim()}
                        className="rounded-lg bg-[var(--brand)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50"
                      >
                        {t("project.edit")}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-lg border border-[var(--card-border)] px-3 py-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        {t("chat.cancel")}
                      </button>
                    </div>
                  </div>
                ) : isOnlyEmoji(reply.content) && !reply.deleted ? (
                  <div className="mt-2">
                    <span className="inline-block text-4xl leading-none sm:text-5xl">{reply.content.trim()}</span>
                  </div>
                ) : (
                  <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap break-words">{renderContent(reply.content, true, mentionDisplayMap, mentionNameToUsername)}</div>
                )}
                {reply.censored && !reply.deleted && (
                  <p className="mt-2 flex flex-wrap items-center gap-1 text-[10px] italic text-[var(--muted)]">
                    <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {t("comment.censoredNote")}{" "}
                    <Link href="/terms" className="font-semibold text-[var(--brand)] hover:underline">{t("comment.censoredTermsLink")}</Link>
                  </p>
                )}
                {!reply.deleted && (
            <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => onLike(reply.id)}
                      className={`flex items-center gap-1 text-xs transition-all ${
                        reply.isLiked
                          ? "text-[var(--brand)]"
                          : "text-[var(--muted)] hover:text-[var(--brand)]"
                      }`}
                    >
                      <svg className={`h-3.5 w-3.5 ${reply.isLiked ? "fill-current" : "fill-none"}`} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L9.46 2.71 8 4.17c-.21.21-.33.48-.33.77v.17l-.95 4.58c-.05.26-.09.52-.09.79v7.42c0 .9.71 1.63 1.6 1.64l7.82.34c.63.03 1.2-.32 1.45-.91l2.5-6.38c.1-.24.16-.5.16-.77z" />
                      </svg>
                      {reply._count.likes > 0 && reply._count.likes}
                    </button>
                    {currentUserId === reply.userId && (
                      <>
                        <button
                          onClick={() => onEdit(reply.id, reply.content)}
                          className="text-xs text-[var(--muted)] hover:text-[var(--brand)] transition-all"
                        >
                          {t("project.edit")}
                        </button>
                        <button
                          onClick={() => onDelete(reply.id)}
                          className="text-xs text-[var(--muted)] hover:text-red-500 transition-all"
                        >
                          {t("project.delete")}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────── */

export default function PostDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params?.slug as string;
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const sessionUser = session?.user as { id?: string } | undefined;
  const userId = sessionUser?.id;

  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [postLiked, setPostLiked] = useState(false);
  const [postLikeCount, setPostLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentSkip, setCommentSkip] = useState(0);
  const [commentHasMore, setCommentHasMore] = useState(true);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);

  // ── Scroll detection for back button border ──
  // Scroll terjadi di dalam kontainer (contentRef), bukan window.
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 0);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
    // Re-run saat post dimuat — kontainer baru dirender setelah loading selesai.
  }, [post]);

  // ── Mounted flag untuk portal bar komentar (aman untuk SSR) ──
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- flag mount untuk portal bar (SSR-safe)
  useEffect(() => setMounted(true), []);

  // Extract unique users from comments & replies for @mention
  const mentionUsers = useMemo(() => {
    const map = new Map<string, { name: string | null; username: string }>();
    comments.forEach((c) => {
      if (!c.deleted) {
        map.set(c.user.username, { name: c.user.name, username: c.user.username });
        c.replies.forEach((r) => {
          if (!r.deleted) map.set(r.user.username, { name: r.user.name, username: r.user.username });
        });
      }
    });
    return Array.from(map.values());
  }, [comments]);

  // Maps untuk render @mention: username→nama (display) & nama→username (link /u/username)
  const mentionDisplayMap = useMemo(() => {
    const m = new Map<string, string>();
    mentionUsers.forEach((u) => { if (u.name) m.set(u.username, u.name); });
    return m;
  }, [mentionUsers]);

  const mentionNameToUsername = useMemo(() => {
    const m = new Map<string, string>();
    mentionUsers.forEach((u) => { if (u.name) m.set(u.name, u.username); });
    return m;
  }, [mentionUsers]);

  const loadMoreComments = useCallback(async () => {
    if (!slug || commentsLoadingMore || !commentHasMore) return;
    setCommentsLoadingMore(true);
    try {
      const res = await fetch(`/api/posts/${slug}/comments?skip=${commentSkip + 10}&take=10`);
      if (res.ok) {
        const data = await res.json();
        if (data?.comments && data.comments.length > 0) {
          setComments((prev) => [...prev, ...data.comments]);
          setCommentSkip((s) => s + 10);
        }
        if (!data?.comments || data.comments.length < 10) {
          setCommentHasMore(false);
        }
      } else {
        setCommentHasMore(false);
      }
    } catch {
      setCommentHasMore(false);
    } finally {
      setCommentsLoadingMore(false);
    }
  }, [slug, commentSkip, commentsLoadingMore, commentHasMore]);

  const { sentinelRef: commentSentinelRef } = useInfiniteScroll(loadMoreComments, commentHasMore, loading || commentsLoadingMore);

  // Like post
  const handleLikePost = async () => {
    if (!session || !post) return;
    const prevLiked = postLiked;
    const prevCount = postLikeCount;
    setPostLiked(!postLiked);
    setPostLikeCount(postLikeCount + (postLiked ? -1 : 1));
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPostLiked(data.liked);
        setPostLikeCount(data.count);
      } else {
        setPostLiked(prevLiked);
        setPostLikeCount(prevCount);
      }
    } catch {
      setPostLiked(prevLiked);
      setPostLikeCount(prevCount);
    }
  };

  // Share post
  const handleSharePost = () => {
    const url = window.location.href;
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav !== "undefined" && "share" in nav) {
      nav.share({ title: document.title, url }).catch(() => {});
    } else {
      const clipboard = navigator.clipboard;
      if (clipboard) {
        clipboard.writeText(url).catch(() => {});
      }
    }
  };

  // Comment input
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Parse error message from API response into translated text
  const showCommentError = async (res: Response) => {
    const data = await res.json().catch(() => null);
    setCommentError(translateApiError(data?.message || "error.failedToLoad", t));
  };

  // Reply
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Mobile state
  const [sheetMode, setSheetMode] = useState<"emoji" | "sticker" | null>(null);
  const mobileInputRef = useRef<HTMLTextAreaElement>(null);
  const [mobileInputFocused, setMobileInputFocused] = useState(false);
  // Posisi scroll feed saat input difokus → dipertahankan selama keyboard
  // terbuka agar feed tidak ikut melompat ke atas/bawah saat keyboard naik.
  const feedScrollRef = useRef(0);

  // ── Kelola tinggi kontainer agar selalu pas dengan area terlihat (iOS) ──
  // Kontainer dibuat penuh setinggi window saat keyboard naik agar feed mengisi
  // sampai input bar (fixed) dan tidak menyisakan strip abu-abu di atasnya.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const setHeight = () => {
      // Kontainer selalu penuh setinggi window (jangan dikecilkan ke area di
      // atas keyboard). Input bar bersifat fixed dan mengambang di atas
      // keyboard; feed mengisi sampai input bar sehingga tidak ada gap abu-abu.
      el.style.height = `${window.innerHeight}px`;
      // Browser kadang auto-scroll ke bawah saat keyboard naik (ingin
      // menampilkan input). Pulihkan scroll agar feed tetap diam.
      if (mobileInputFocused) {
        el.scrollTop = feedScrollRef.current;
      }
    };
    setHeight();
    window.addEventListener("resize", setHeight);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", setHeight);
    // Fallback sekali jalan: animasi keyboard bisa selesai lebih lambat dari
    // event resize terakhir, pulihkan scroll setelahnya agar tetap diam.
    const settle = window.setTimeout(() => {
      if (mobileInputFocused && el.scrollTop !== feedScrollRef.current) {
        el.scrollTop = feedScrollRef.current;
      }
    }, 400);
    return () => {
      window.removeEventListener("resize", setHeight);
      vv?.removeEventListener("resize", setHeight);
      window.clearTimeout(settle);
      el.style.height = "";
    };
  }, [mobileInputFocused]);

  // Bar komentar tetap menempel di atas keyboard (VisualViewport API)
  const setMobileBarEl = useKeepAboveKeyboard(mobileInputFocused);

  // Mobile mention state
  const [mobileMentionActive, setMobileMentionActive] = useState(false);
  const [mobileMentionQuery, setMobileMentionQuery] = useState("");
  const [mobileMentionIndex, setMobileMentionIndex] = useState(-1);
  const mobileMentionRef = useRef<HTMLDivElement>(null);

  // Auto-grow textarea: expand up to 2 lines, scroll beyond
  useEffect(() => {
    const el = mobileInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 64) + "px";
  }, [commentText]);

  // Mobile mention: deteksi @, filter user, insert nama
  const mobileFiltered = mentionUsers
    ? mentionUsers.filter((u) => {
        const q = mobileMentionQuery.toLowerCase();
        return (u.name || u.username).toLowerCase().includes(q);
      })
    : [];

  const handleMobileCommentChange = (v: string) => {
    setCommentError(null);
    setCommentText(v);
    const el = mobileInputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 64) + "px";
    }
    const pos = mobileInputRef.current?.selectionStart ?? v.length;
    const before = v.slice(0, pos);
    const atIdx = before.lastIndexOf("@");
    if (atIdx >= 0 && (atIdx === 0 || before[atIdx - 1] === " ")) {
      const q = before.slice(atIdx + 1);
      if (!q.includes(" ")) {
        // Aktif bahkan saat query kosong (baru ketik @) → tampilkan semua user
        setMobileMentionActive(true);
        setMobileMentionQuery(q);
        setMobileMentionIndex(0);
      } else {
        setMobileMentionActive(false);
        setMobileMentionQuery("");
        setMobileMentionIndex(-1);
      }
    } else {
      setMobileMentionActive(false);
      setMobileMentionQuery("");
      setMobileMentionIndex(-1);
    }
  };

  const insertMobileMention = (user: { name: string | null; username: string }) => {
    const pos = mobileInputRef.current?.selectionStart ?? commentText.length;
    const before = commentText.slice(0, pos);
    const atIdx = before.lastIndexOf("@");
    const after = commentText.slice(pos);
    const label = user.name || user.username;
    const newVal = before.slice(0, atIdx) + "@" + label + " " + after;
    setCommentText(newVal);
    setMobileMentionActive(false);
    setMobileMentionQuery("");
    setMobileMentionIndex(-1);
    setTimeout(() => {
      const newPos = atIdx + label.length + 2;
      mobileInputRef.current?.setSelectionRange(newPos, newPos);
      mobileInputRef.current?.focus();
    }, 0);
  };

  // Close mobile mention on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mobileMentionRef.current && !mobileMentionRef.current.contains(e.target as Node)) {
        setMobileMentionActive(false);
        setMobileMentionQuery("");
        setMobileMentionIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Store previous state for optimistic rollback
  const prevCommentsRef = useRef<CommentData[]>([]);

  // Get the name of the user being replied to (for mobile bar)
  const getReplyToName = useCallback(() => {
    if (!replyingTo) return "";
    for (const c of comments) {
      if (c.id === replyingTo) return c.user.name || c.user.username;
      for (const r of c.replies) {
        if (r.id === replyingTo) return r.user.name || r.user.username;
      }
    }
    return "";
  }, [replyingTo, comments]);

  // Mobile unified submit: reply via fixed-bottom bar
  const handleMobileSubmit = async () => {
    if (!commentText.trim() || submitting || !slug) return;
    if (replyingTo) {
      setSubmitting(true);
      setCommentError(null);
      try {
        const res = await fetch(`/api/posts/${slug}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: commentText.trim(), parentId: replyingTo }),
        });
        if (res.ok) {
          setCommentError(null);
          setCommentText("");
          setReplyingTo(null);
          setCommentCount((c) => c + 1);
          fetchComments();
        } else {
          await showCommentError(res);
        }
      } catch (err) {
        console.error("Failed to submit mobile reply:", err);
        setCommentError(t("error.failedToLoad"));
      } finally {
        setSubmitting(false);
      }
    } else {
      await submitComment();
    }
  };

  // Mobile sticker handler
  const handleMobileSticker = async (url: string) => {
    if (!url || !slug) return;
    setCommentError(null);
    try {
      const res = await fetch(`/api/posts/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: url, parentId: replyingTo || undefined }),
      });
      if (res.ok) {
        setCommentError(null);
        setCommentText("");
        setReplyingTo(null);
        setCommentCount((c) => c + 1);
        fetchComments();
      } else {
        await showCommentError(res);
      }
    } catch (err) {
      console.error("Failed to submit mobile sticker:", err);
      setCommentError(t("error.failedToLoad"));
    }
  };

  // Fetch post
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/posts/${slug}`)
      .then(async (res) => {
        if (res.status === 404) {
          // Post dihapus / tidak ada / tidak berhak lihat → tampilkan halaman 404
          setNotFound(true);
          return null;
        }
        if (!res.ok) {
          setError(t("error.failedToLoad"));
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.post) {
          setPost(data.post);
          setPostLiked(data.post.isLiked || false);
          setPostLikeCount(data.post._count?.likes || 0);
          setCommentCount(data.post._count?.comments || 0);
          setError(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch post:", err);
        setError(t("error.failedToLoad"));
      })
      .finally(() => setLoading(false));
  }, [slug, t]);

  // Fetch comments — paginated
  const fetchComments = useCallback(() => {
    if (!slug) return;
    fetch(`/api/posts/${slug}/comments?skip=0&take=10`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.comments) {
          setComments(data.comments);
          setCommentSkip(0);
          setCommentHasMore(data.total === undefined || data.total > data.comments.length);
        }
      })
      .catch((err) => console.error("Failed to fetch comments:", err));
  }, [slug]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const isPostOwner = !!userId && post?.userId === userId;

  // Submit main comment
  const submitComment = async () => {
    if (!commentText.trim() || submitting || !slug) return;
    setSubmitting(true);
    setCommentError(null);
    try {
      const payload: Record<string, unknown> = { content: commentText.trim() };
      const res = await fetch(`/api/posts/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setCommentText("");
        setCommentCount((c) => c + 1);
        fetchComments();
      } else {
        await showCommentError(res);
      }
    } catch (err) {
      console.error("Failed to submit comment:", err);
      setCommentError(t("error.failedToLoad"));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit sticker comment (direct, bypasses state)
  const handleStickerComment = async (url: string) => {
    if (!url || !slug) return;
    setCommentError(null);
    try {
      const res = await fetch(`/api/posts/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: url }),
      });
      if (res.ok) {
        setCommentCount((c) => c + 1);
        fetchComments();
      } else {
        await showCommentError(res);
      }
    } catch (err) {
      console.error("Failed to submit sticker comment:", err);
      setCommentError(t("error.failedToLoad"));
    }
  };

  // Submit sticker reply (direct, bypasses state)
  const handleReplyStickerComment = async (url: string, parentId: string) => {
    if (!url || !slug) return;
    setCommentError(null);
    try {
      const res = await fetch(`/api/posts/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: url, parentId }),
      });
      if (res.ok) {
        setReplyText("");
        setReplyingTo(null);
        setCommentCount((c) => c + 1);
        fetchComments();
      } else {
        await showCommentError(res);
      }
    } catch (err) {
      console.error("Failed to submit sticker reply:", err);
      setCommentError(t("error.failedToLoad"));
    }
  };

  // Submit reply
  const submitReply = async () => {
    if (!replyText.trim() || !replyingTo || !slug) return;
    setCommentError(null);
    try {
      const res = await fetch(`/api/posts/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim(), parentId: replyingTo }),
      });
      if (res.ok) {
        setReplyText("");
        setReplyingTo(null);
        setCommentCount((c) => c + 1);
        fetchComments();
      } else {
        await showCommentError(res);
      }
    } catch (err) {
      console.error("Failed to submit reply:", err);
      setCommentError(t("error.failedToLoad"));
    }
  };

  // Like comment — OPTIMISTIC
  const handleLike = (commentId: string) => {
    if (!session) return;
    prevCommentsRef.current = JSON.parse(JSON.stringify(comments));
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const newLiked = !c.isLiked;
          return {
            ...c,
            isLiked: newLiked,
            _count: { ...c._count, likes: c._count.likes + (newLiked ? 1 : -1) },
          };
        }
        return {
          ...c,
          replies: c.replies.map((r) =>
            r.id === commentId
              ? {
                  ...r,
                  isLiked: !r.isLiked,
                  _count: { ...r._count, likes: r._count.likes + (!r.isLiked ? 1 : -1) },
                }
              : r
          ),
        };
      })
    );
    fetch(`/api/comments/${commentId}/like`, { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setComments((prev) =>
            prev.map((c) => {
              if (c.id === commentId) {
                return { ...c, isLiked: data.liked, _count: { ...c._count, likes: data.count } };
              }
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === commentId
                    ? { ...r, isLiked: data.liked, _count: { ...r._count, likes: data.count } }
                    : r
                ),
              };
            })
          );
        } else {
          setComments(prevCommentsRef.current);
        }
      })
      .catch(() => setComments(prevCommentsRef.current));
  };

  // Pin comment — OPTIMISTIC
  const handlePin = (commentId: string) => {
    prevCommentsRef.current = JSON.parse(JSON.stringify(comments));
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, pinned: !c.pinned } : c)));
    fetch(`/api/comments/${commentId}/pin`, { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          fetchComments();
        } else {
          setComments(prevCommentsRef.current);
        }
      })
      .catch(() => setComments(prevCommentsRef.current));
  };

  // Edit comment
  const handleEdit = (commentId: string, content: string) => {
    setEditingId(commentId);
    setEditText(content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      const res = await fetch(`/api/comments/${editingId}/like`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditText("");
        fetchComments();
      }
    } catch (err) {
      console.error("Failed to edit comment:", err);
    }
  };

  // Delete comment — OPTIMISTIC
  const handleDelete = (commentId: string) => {
    prevCommentsRef.current = JSON.parse(JSON.stringify(comments));
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, deleted: true, content: t("comment.delete") };
        return { ...c, replies: c.replies.map((r) => (r.id === commentId ? { ...r, deleted: true, content: t("comment.delete") } : r)) };
      })
    );
    fetch(`/api/comments/${commentId}/like`, { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) setComments(prevCommentsRef.current);
      })
      .catch(() => setComments(prevCommentsRef.current));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-1/4 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return <NotFoundContent />;
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
          <svg className="h-8 w-8 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>          <h2 className="text-lg font-bold">{error || t("error.notFound")}</h2>
        <Link href="/" className="mt-4 rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--brand-hover)]">
          {t("error.backToHome")}
        </Link>
      </div>
    );
  }

  const isProject = post.type === "project";
  const ref = searchParams.get("ref");

  return (
    <div
      ref={contentRef}
      className="bg-[var(--background)] space-y-2.5 md:space-y-4 h-[100dvh] overflow-y-auto overscroll-contain pt-14 md:h-auto md:overflow-visible md:pt-0"
    >
      <style>{`.layout-bottom-pad { padding-bottom: 0 !important; }`}</style>
      <style>{`@media (max-width: 767px) { html, body { overflow: hidden !important; overscroll-behavior: none !important; } .layout-bottom-pad { padding-top: 0 !important; padding-bottom: 0 !important; } .layout-bottom-pad .max-w-7xl { padding-top: 0 !important; padding-bottom: 0 !important; } .post-detail-container > :not(:first-child) { margin-top: 0 !important; } }`}</style>
      <div className="post-detail-container pt-2 md:pt-0 space-y-0 pb-0 md:space-y-4 md:pb-0">
      {/* ── Mobile Back Button ── */}
      {/* Fixed di atas, menggantikan posisi navbar */}
      <div className={`fixed left-0 right-0 top-0 z-[65] flex h-14 items-center gap-3 border-b bg-[var(--card)] px-4 md:hidden transition-[border-color] duration-200 ${scrolled ? "border-[var(--brand)]" : "border-[var(--card-border)]"}`}>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-all hover:text-[var(--brand)]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {t("nav.back")}
        </button>
        <span className="text-xs text-[var(--muted)] truncate">
          {isProject && post.project?.title ? post.project.title : post.content?.slice(0, 40) || ""}
        </span>
      </div>
      <div className="hidden md:block">
        <Breadcrumb segments={[
          ref?.startsWith("u/") ? { label: t("sidebar.home"), href: `/${ref}` } : { label: t("sidebar.home"), href: "/" },
          { label: isProject ? t("project.title") : t("profile.cerita"), href: isProject ? "/projects" : "/" },
          { label: isProject && post.project?.title ? post.project.title : post.content?.slice(0, 60) || t("feed.viewDetail") }
        ]} />
      </div>
      {/* ── Post Card ── */}
      <article className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
        <div className="flex items-start gap-3 px-4 pb-2 pt-4">
          <Link href={`/u/${post.user.username}`}>
            <Avatar src={post.user.avatar} name={post.user.name} size="sm" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href={`/u/${post.user.username}`} className="text-sm font-bold hover:text-[var(--brand)]">
                {post.user.name || post.user.username}
              </Link>
              <span className="text-xs text-[var(--brand)]">@{post.user.username}</span>
              <span className="text-xs text-[var(--muted)]">·</span>
              <span className="text-xs text-[var(--muted)]">{timeAgo(post.createdAt, t)}</span>
              {isProject && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--brand)] tracking-wider shrink-0">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                  {t("feed.projectBadge")}
                </span>
              )}
            </div>
          </div>
        </div>

        {isProject && post.project ? (
          <Link href={`/project/${post.project.slug || post.project.id}`} className="block px-4 pb-3">
            <h2 className="text-lg font-bold mb-2">{post.project.title}</h2>
            {post.images && post.images.length > 1 ? (
              <div className="mb-3 overflow-hidden rounded-2xl border-y border-[var(--card-border)]">
                <ImageCarousel images={post.images} maxHeight={500} />
              </div>
            ) : post.project.image ? (
              <div className="w-full overflow-hidden rounded-2xl mb-3">
                <Image src={post.project.image} alt={post.project.title} width={1200} height={675} className="w-full h-auto object-cover" sizes="100vw" />
              </div>
            ) : null}
            {post.project.description && <div className="text-sm leading-relaxed text-[var(--muted)] mb-2 whitespace-pre-wrap break-words">{renderContent(post.project.description, true)}</div>}
            {post.project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {post.project.tags.map((t) => <span key={t} className="text-xs text-[var(--muted)]">#{t}</span>)}
              </div>
            )}
          </Link>
        ) : (
          <>
            {post.images && post.images.length > 0 && (
              <div className="border-y border-[var(--card-border)]">
                <ImageCarousel images={post.images} maxHeight={500} />
              </div>
            )}
            <div className="px-4 py-3">
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{renderContent(post.content, true)}</div>
            </div>
            {(post.linkUrl || post.githubUrl) && (
              <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-[var(--card-border)]">
                {post.linkUrl && (
                  <a href={post.linkUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium transition-all hover:border-[var(--brand)] hover:text-[var(--brand)]">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    {t("feed.linkProject")}
                    <svg className="h-3 w-3 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  </a>
                )}
                {post.githubUrl && (
                  <a href={post.githubUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium transition-all hover:border-[var(--brand)] hover:text-[var(--brand)]">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    {t("feed.linkGithub")}
                    <svg className="h-3 w-3 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-4 px-4 py-2.5 text-xs text-[var(--muted)] border-t border-[var(--card-border)]">
          <button
            onClick={handleLikePost}
            className={`flex items-center gap-1 font-medium transition-all ${
              postLiked
                ? "text-[var(--brand)]"
                : "text-[var(--muted)] hover:text-[var(--brand)]"
            }`}
          >
            <svg className={`h-4 w-4 ${postLiked ? "fill-current" : "fill-none"}`} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L9.46 2.71 8 4.17c-.21.21-.33.48-.33.77v.17l-.95 4.58c-.05.26-.09.52-.09.79v7.42c0 .9.71 1.63 1.6 1.64l7.82.34c.63.03 1.2-.32 1.45-.91l2.5-6.38c.1-.24.16-.5.16-.77z" />
            </svg>
            {postLikeCount > 0 && postLikeCount} {t("feed.likes")}
          </button>
          <span className="flex items-center gap-1.5 text-[var(--muted)]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
            <span>{commentCount} {t("feed.comments")}</span>
          </span>
          <button
            onClick={handleSharePost}
            className="ml-auto flex items-center gap-1 font-medium text-[var(--muted)] hover:text-[var(--brand)] transition-all"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
            </svg>
            <span className="hidden md:inline">{t("feed.share")}</span>
          </button>
        </div>
      </article>

      {/* ── Comment Input (Desktop) ── */}
      {session ? (
        <div className="hidden md:block rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <CommentTextarea
            value={commentText}
            onChange={(v) => {
              setCommentError(null);
              setCommentText(v);
            }}
            placeholder={t("project.addComment")}
            onSubmit={submitComment}
            onStickerSubmit={handleStickerComment}
            disabled={submitting}
            mentionUsers={mentionUsers}
            t={t}
          />
          {commentError && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400">
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {commentError}
            </p>
          )}
        </div>
      ) : (
        <div className="hidden md:block rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
          <p className="text-sm text-[var(--muted)]">
            <Link href="/login" className="font-semibold text-[var(--brand)] hover:underline">{t("auth.login")}</Link> {t("project.loginToComment").replace("Login", "").trim()}
          </p>
        </div>
      )}

      </div>

      {/* ── Mobile Fixed Comment Bar ── */}
      {/* Di-portal ke <body> — keluar dari semua ancestor (transform/overflow/scroll
          container) sehingga dijamin fixed: selalu menempel dasar layar, tidak ikut
          scroll, dan tidak ada ruang kosong di bawahnya. */}
      {mounted && session && createPortal(
        <div
          ref={setMobileBarEl}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--card-border)] bg-[var(--card)] shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:hidden"
          style={{ paddingBottom: 0 }}
        >
          {replyingTo && (
            <div className="flex items-center gap-1.5 border-b border-[var(--card-border)] bg-[var(--brand-light)]/50 px-3 py-1.5">
              <button
                type="button"
                onClick={() => { setReplyingTo(null); setReplyText(""); }}
                className="text-[var(--muted)] hover:text-[var(--foreground)] transition-all shrink-0"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <svg className="h-3 w-3 text-[var(--brand)] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15l3-3m0 0l3 3m-3-3v12M21 9l-3 3m0 0l-3-3m3 3V3" />
              </svg>
              <span className="text-xs text-[var(--muted)] truncate">
                {t("chat.replyingTo", { name: getReplyToName() })}
              </span>
            </div>
          )}
          <div className="relative px-2 pt-2 pb-1">
            {/* ── Mobile mention dropdown ── */}
            {mobileMentionActive && mobileFiltered.length > 0 && (
              <div
                ref={mobileMentionRef}
                className="absolute bottom-full left-2 right-2 z-[60] mb-2 max-h-[40vh] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg"
              >
                {mobileFiltered.map((u, i) => (
                  <button
                    key={u.username}
                    onMouseDown={(e) => { e.preventDefault(); insertMobileMention(u); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      i === mobileMentionIndex ? "bg-[var(--brand-light)]" : "hover:bg-[var(--brand-light)]"
                    }`}
                  >
                    <span className="font-medium text-[var(--foreground)]">{u.name || u.username}</span>
                    <span className="text-xs text-[var(--muted)]">@{u.username}</span>
                  </button>
                ))}
              </div>
            )}
            {commentError && (
              <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {commentError}
              </p>
            )}
            <div className="flex items-center gap-1.5">
              <textarea
                ref={mobileInputRef}
                onFocus={() => { feedScrollRef.current = contentRef.current?.scrollTop ?? 0; setMobileInputFocused(true); }}
                onBlur={() => { feedScrollRef.current = contentRef.current?.scrollTop ?? 0; setMobileInputFocused(false); }}
                value={commentText}
                onChange={(e) => handleMobileCommentChange(e.target.value)}
                onKeyDown={(e) => {
                  if (mobileMentionActive && mobileFiltered.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setMobileMentionIndex((i) => (i + 1) % mobileFiltered.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setMobileMentionIndex((i) => (i - 1 + mobileFiltered.length) % mobileFiltered.length);
                    } else if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      insertMobileMention(mobileFiltered[mobileMentionIndex >= 0 ? mobileMentionIndex : 0]);
                    } else if (e.key === "Escape") {
                      setMobileMentionActive(false);
                      setMobileMentionQuery("");
                      setMobileMentionIndex(-1);
                    }
                  }
                }}
                placeholder={t("project.addComment")}
                maxLength={160}
                rows={1}
                className="flex-1 resize-none overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)] max-h-[4rem]"
              />
              <button
                type="button"
                onClick={() => { setSheetMode("emoji"); mobileInputRef.current?.blur(); }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)] active:scale-90"
                title={t("chat.emoji")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => { setSheetMode("sticker"); mobileInputRef.current?.blur(); }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)] active:scale-90"
                title={t("chat.stickers")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleMobileSubmit}
                disabled={!commentText.trim()}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 ${
                  commentText.trim()
                    ? "bg-[var(--brand)] text-white shadow-sm hover:bg-[var(--brand-hover)]"
                    : "bg-[var(--card-border)] text-[var(--muted)]"
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <div className="mt-1 text-right text-[10px] text-[var(--muted)]">{commentText.length}/160</div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Emoji / Sticker Bottom Sheet (mobile) ── */}
      <EmojiStickerSheet
        open={!!sheetMode}
        defaultTab={sheetMode || "emoji"}
        onClose={() => setSheetMode(null)}
        onEmojiSelect={(emoji) => {
          setCommentText((prev) => prev + emoji);
        }}
        onStickerSelect={(sticker) => {
          handleMobileSticker(sticker.url);
        }}
      />

      {/* ── Comments List ── */}
      <div className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
        <div className="border-b border-[var(--card-border)] px-4 py-3">
          <h3 className="text-sm font-bold">{t("project.comments")} ({commentCount})</h3>
        </div>

        {comments.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-light)]">
              <svg className="h-6 w-6 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--muted)]">{t("feed.noPosts")}</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isPostOwner={isPostOwner}
                isCommentOwner={userId === comment.userId}
                currentUserId={userId}
                onLike={handleLike}
                onPin={handlePin}
                onReply={(id) => setReplyingTo(replyingTo === id ? null : id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                replyingTo={replyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                submitReply={submitReply}
                onReplyStickerSubmit={handleReplyStickerComment}
                editingId={editingId}
                editText={editText}
                setEditText={setEditText}
                saveEdit={saveEdit}
                cancelEdit={cancelEdit}
                mentionUsers={mentionUsers}
                mentionDisplayMap={mentionDisplayMap}
                mentionNameToUsername={mentionNameToUsername}
                t={t}
              />
            ))}
          </div>
        )}

        {comments.length > 0 && commentHasMore && (
          <div ref={commentSentinelRef} className="h-4" />
        )}

        {commentsLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <svg className="h-5 w-5 animate-spin text-[var(--muted)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>
      <div className="pb-20 md:pb-0" />
    </div>
  );
}
