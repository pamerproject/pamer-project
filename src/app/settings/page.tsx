"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";
import SignOutButton from "@/components/SignOutButton";
import Link from "next/link";
import { getObjPosition, translateApiError } from "@/lib/helpers";
import PageSkeleton from "@/components/PageSkeleton";
import ErrorAlert from "@/components/ui/ErrorAlert";
import EditPhotoModal from "@/components/EditPhotoModal";

type EditTarget = "avatar" | "cover" | null;

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const { t } = useTranslation();

  // ─── Profile fields ──────────────────────────────────────
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─── Photo ───────────────────────────────────────────────
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarPosition, setAvatarPosition] = useState("center");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState("center");
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  // ─── Links ──────────────────────────────────────────────
  const [links, setLinks] = useState<{ name: string; url: string }[]>([]);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // ─── Theme ────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // ─── Delete Account ─────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteUsername, setDeleteUsername] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ─── Password ────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasPassword, setHasPassword] = useState(true); // default true untuk hindari flash
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const sessionUser = session?.user as
    | { id?: string; username?: string; email?: string; name?: string | null }
    | undefined;

  const dataLoaded = useRef(false);

  // Fetch current user data — only once on mount
  useEffect(() => {
    if (!session) return;
    if (dataLoaded.current) return;
    dataLoaded.current = true;

    fetch("/api/users/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setName(data.user.name || "");
          setBio(data.user.bio || "");
          setAvatar(data.user.avatar);
          setAvatarPosition(data.user.avatarPosition || "center");
          setCoverImage(data.user.coverImage);
          setCoverPosition(data.user.coverPosition || "center");
          setLinks(data.user.links || []);
          setHasPassword(data.user.hasPassword);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  // ─── Links handlers ────────────────────────────────────
  const addLink = () => {
    const name = linkName.trim();
    const url = linkUrl.trim();
    if (!name || !url) return;
    setLinks([...links, { name, url }]);
    setLinkName("");
    setLinkUrl("");
    setShowAddForm(false);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
    // Cancel editing jika sedang edit — hindari indeks stale
    if (editingLinkIndex !== null) {
      setEditingLinkIndex(null);
      setLinkName("");
      setLinkUrl("");
    }
  };

  const startEditLink = (index: number) => {
    setEditingLinkIndex(index);
    setShowAddForm(false);
    setLinkName(links[index].name);
    setLinkUrl(links[index].url);
  };

  const saveEditLink = () => {
    const name = linkName.trim();
    const url = linkUrl.trim();
    if (!name || !url || editingLinkIndex === null) return;
    const updated = [...links];
    updated[editingLinkIndex] = { name, url };
    setLinks(updated);
    setEditingLinkIndex(null);
    setLinkName("");
    setLinkUrl("");
  };

  const cancelEdit = () => {
    setEditingLinkIndex(null);
    setShowAddForm(false);
    setLinkName("");
    setLinkUrl("");
  };

  // ─── Save profile (name + bio + links) ──────────────────
  const handleSaveProfile = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, links }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(translateApiError(err.message, t) || t("settings.saveFailed"));
      }

      setSuccess(t("settings.saved"));
      await updateSession({ name });
      window.dispatchEvent(new CustomEvent("session-refresh"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("settings.saveFailed");
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [name, bio, links, updateSession]);

  // ─── Save photo ──────────────────────────────────────────
  const handlePhotoSave = useCallback(
    async (imageUrl: string | null, position: string) => {
      const payload: Record<string, string | null> = {};
      if (editTarget === "avatar") {
        payload.avatar = imageUrl;
        payload.avatarPosition = position;
      } else {
        payload.coverImage = imageUrl;
        payload.coverPosition = position;
      }

      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(t("settings.savePhotoFailed"));

      // Update local state
      if (editTarget === "avatar") {
        setAvatar(imageUrl);
        setAvatarPosition(position);
        // Trigger session refresh — JWT callback akan baca avatar terbaru dari DB
        window.dispatchEvent(new CustomEvent("session-refresh"));
      } else {
        setCoverImage(imageUrl);
        setCoverPosition(position);
      }
    },
    [editTarget]
  );

  // ─── Save password ───────────────────────────────────────
  const handleSavePassword = useCallback(async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError(t("settings.enterCurrentPassword"));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("settings.newPasswordMinChars"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.newPasswordMismatch"));
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(translateApiError(data.message, t) || t("settings.changePasswordFailed"));
      }

      setPasswordSuccess(t("settings.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("settings.changePasswordFailed");
      setPasswordError(msg);
    } finally {
      setSavingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  // Hindari flash "Silakan login dulu" saat reload: tunggu session selesai dimuat
  // (status === "loading") dulu dengan menampilkan skeleton, baru cek login.
  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (!session) {
    return (
      <div className="mx-auto mt-20 max-w-lg text-center">
        <p className="text-lg font-medium">{t("settings.loginRequired")}</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-[var(--brand)] hover:underline">
          {t("settings.login")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <>
      <div className="space-y-8">
            {/* ── Back to Profile ──────────────────────── */}
            <div className="mt-4 px-4 md:px-0">
              <Link
                href={`/u/${sessionUser?.username || ""}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-all hover:text-[var(--brand)]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                {t("settings.backToProfile")}
              </Link>
            </div>

            {/* ── Cover + Avatar (dibiarkan) ─────────────── */}
            <div className="card-app overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
              {/* ── Cover ────────────────────────────── */}
              <div className="group relative h-48 overflow-hidden md:rounded-t-xl">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt="Cover"
                    className="h-full w-full transition-all duration-300"
                    style={{ objectFit: "cover", objectPosition: getObjPosition(coverPosition) }}
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[var(--brand)]/20 to-[var(--background)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-transparent to-transparent" />
                <button
                  onClick={() => setEditTarget("cover")}
                  className="absolute right-3 top-3 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/70"
                >
                  {t("settings.editCover")}
                </button>
              </div>

              {/* ── Avatar ────────────────────────────── */}
              <div className="relative px-6 pb-6">
                <div className="group/av relative -mt-16 inline-block md:-mt-20">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Avatar"
                      className="h-28 w-28 rounded-full border-4 border-[var(--card)] object-cover shadow-lg md:h-32 md:w-32"
                      style={{ objectPosition: getObjPosition(avatarPosition) }}
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[var(--card)] bg-[var(--brand)] text-4xl font-bold text-white shadow-lg md:h-32 md:w-32">
                      {(sessionUser?.name || sessionUser?.username || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => setEditTarget("avatar")}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-100 transition-all md:opacity-0 md:hover:opacity-100"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  </button>
                </div>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  {t("settings.clickToChangePhoto")}
                </p>
              </div>
            </div>

            {/* ── Section: Profil ───────────────────────── */}
            <div>
              <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {t("settings.sectionProfile")}
              </h3>
              <div className="card-app overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
                {error && (
                  <div className="border-b border-[var(--card-border)] px-4 py-3 md:px-6">
                    <ErrorAlert message={error} />
                  </div>
                )}
                {success && (
                  <div className="border-b border-[var(--card-border)] px-4 py-3 md:px-6">
                    <ErrorAlert type="success" message={success} />
                  </div>
                )}

                {/* Email (disabled) */}
                <div className="border-b border-[var(--card-border)] px-4 py-4 md:px-6">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t("auth.email")}</label>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-[var(--foreground)]">{sessionUser?.email}</span>
                    <span className="shrink-0 text-[11px] text-[var(--muted)]">{t("auth.emailNotChangeable")}</span>
                  </div>
                </div>

                {/* Username (disabled) */}
                <div className="border-b border-[var(--card-border)] px-4 py-4 md:px-6">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t("settings.usernameLabel")}</label>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-[var(--foreground)]">@{sessionUser?.username}</span>
                    <span className="shrink-0 text-[11px] text-[var(--muted)]">{t("auth.usernameNotChangeable")}</span>
                  </div>
                </div>

                {/* Name */}
                <div className="border-b border-[var(--card-border)] px-4 py-4 md:px-6">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t("auth.name")}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("auth.namePlaceholder")}
                    className="mt-1.5 w-full border-0 border-b border-[var(--card-border)] bg-transparent px-0 pb-1.5 pt-0.5 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                  />
                </div>

                {/* Bio */}
                <div className="border-b border-[var(--card-border)] px-4 py-4 md:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t("settings.bioLabel")}</label>
                    <span className="text-[11px] text-[var(--muted)]">{500 - bio.length}/500</span>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t("settings.profileInfo")}
                    rows={2}
                    maxLength={500}
                    className="mt-1.5 w-full resize-none border-0 border-b border-[var(--card-border)] bg-transparent px-0 pb-1.5 pt-0.5 text-sm leading-relaxed text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                  />
                </div>

                {/* Links */}
                <div className="px-4 py-4 md:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t("settings.links")}</label>
                    {links.length > 0 && (
                      <span className="rounded-full bg-[var(--brand-light)] px-2 py-0.5 text-[11px] font-bold text-[var(--brand)]">{links.length}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{t("settings.linkDescription")}</p>

                  {/* Existing links — panel list dengan divider */}
                  {links.length > 0 && (
                    <div className="mt-3 divide-y divide-[var(--card-border)] overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--background)]">
                      {links.map((link, i) => (
                        <div key={i} className="flex items-center gap-3 px-3.5 py-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)]">
                            <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-[var(--foreground)]">{link.name}</span>
                            <span className="block truncate text-xs text-[var(--muted)]">{link.url}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button
                              onClick={() => startEditLink(i)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)] active:scale-95"
                              title={t("settings.editLinkTitle")}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeLink(i)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-all hover:bg-red-50 hover:text-red-500 active:scale-95"
                              title={t("settings.deleteLinkTitle")}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tombol tambah link — buka form */}
                  {!showAddForm && editingLinkIndex === null && (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--card-border)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] active:scale-[0.99]"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      {t("settings.addLinkLabel")}
                    </button>
                  )}

                  {/* Form tambah link */}
                  {showAddForm && editingLinkIndex === null && (
                    <div className="mt-3 rounded-xl border border-[var(--brand)]/30 bg-[var(--brand-light)]/20 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">{t("settings.addLinkLabel")}</p>
                        <button
                          onClick={() => { setShowAddForm(false); setLinkName(""); setLinkUrl(""); }}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted)] transition-all hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                          title={t("settings.cancelEdit")}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-2.5 space-y-2">
                        <input
                          type="text"
                          value={linkName}
                          onChange={(e) => setLinkName(e.target.value)}
                          placeholder={t("settings.linkNamePlaceholder")}
                          className="block w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 text-sm outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                        />
                        <input
                          type="url"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="block w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 text-sm outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                        />
                      </div>
                      <button
                        onClick={addLink}
                        disabled={!linkName.trim() || !linkUrl.trim()}
                        className="mt-3 w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)] active:scale-[0.98] disabled:opacity-50"
                      >
                        {t("settings.addLink")}
                      </button>
                    </div>
                  )}

                  {/* Form edit link */}
                  {editingLinkIndex !== null && (
                    <div className="mt-3 rounded-xl border border-[var(--brand)]/30 bg-[var(--brand-light)]/20 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">{t("settings.editLinkLabel")}</p>
                        <button
                          onClick={cancelEdit}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted)] transition-all hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                          title={t("settings.cancelEdit")}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-2.5 space-y-2">
                        <input
                          type="text"
                          value={linkName}
                          onChange={(e) => setLinkName(e.target.value)}
                          placeholder={t("settings.linkNamePlaceholder")}
                          className="block w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 text-sm outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEditLink(); } }}
                        />
                        <input
                          type="url"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="block w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 text-sm outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEditLink(); } }}
                        />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={cancelEdit}
                          className="flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition-all hover:bg-[var(--background)] active:scale-[0.98]"
                        >
                          {t("settings.cancelEdit")}
                        </button>
                        <button
                          onClick={saveEditLink}
                          disabled={!linkName.trim() || !linkUrl.trim()}
                          className="flex-1 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)] active:scale-[0.98] disabled:opacity-50"
                        >
                          {t("settings.saveLink")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save */}
                <div className="border-t border-[var(--card-border)] bg-[var(--background)] px-4 py-3 md:px-6">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)] active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? t("settings.saving") : t("settings.save")}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Section: Keamanan ─────────────────────── */}
            <div>
              <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {t("settings.sectionSecurity")}
              </h3>
              <div className="card-app overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
                {hasPassword ? (
                  <>
                    <div className="border-b border-[var(--card-border)] px-4 py-4 md:px-6">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-bold text-[var(--foreground)]">{t("settings.changePassword")}</h4>
                        <svg className="h-4 w-4 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>

                      {passwordError && <div className="mt-3"><ErrorAlert message={passwordError} /></div>}
                      {passwordSuccess && <div className="mt-3"><ErrorAlert type="success" message={passwordSuccess} /></div>}

                      <div className="mt-4 space-y-5">
                        {/* Current Password */}
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t("settings.currentPassword")}</label>
                          <div className="relative mt-1">
                            <input
                              type={showCurrent ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full border-0 border-b border-[var(--card-border)] bg-transparent px-0 py-1.5 pr-8 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrent(!showCurrent)}
                              className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                              tabIndex={-1}
                            >
                              {showCurrent ? (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* New Password */}
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t("settings.newPassword")}</label>
                          <div className="relative mt-1">
                            <input
                              type={showNew ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder={t("auth.passwordMinChars")}
                              className="w-full border-0 border-b border-[var(--card-border)] bg-transparent px-0 py-1.5 pr-8 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNew(!showNew)}
                              className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                              tabIndex={-1}
                            >
                              {showNew ? (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{t("settings.confirmNewPassword")}</label>
                          <div className="relative mt-1">
                            <input
                              type={showConfirm ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder={t("auth.confirmPlaceholder")}
                              className="w-full border-0 border-b border-[var(--card-border)] bg-transparent px-0 py-1.5 pr-8 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm(!showConfirm)}
                              className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                              tabIndex={-1}
                            >
                              {showConfirm ? (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 md:px-6">
                      <button
                        onClick={handleSavePassword}
                        disabled={savingPassword}
                        className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)] active:scale-[0.98] disabled:opacity-50"
                      >
                        {savingPassword ? t("settings.saving") : t("settings.changePassword")}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-4 md:px-6">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--foreground)]">{t("settings.changePassword")}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{t("settings.socialLoginPasswordInfo")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section: Tampilan ──────────────────────── */}
            <div>
              <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {t("settings.theme")}
              </h3>
              <div className="card-app flex items-center justify-between gap-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-4 md:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)]">
                    {isDark ? (
                      <svg className="h-4.5 w-4.5 text-[var(--brand)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                      </svg>
                    ) : (
                      <svg className="h-4.5 w-4.5 text-[var(--brand)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                      </svg>
                    )}
                  </span>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {isDark ? t("settings.darkThemeActive") : t("settings.lightThemeActive")}
                  </p>
                </div>

                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  onClick={() => {
                    if (isDark) {
                      document.documentElement.classList.remove('dark');
                      localStorage.setItem('theme', 'light');
                      setIsDark(false);
                    } else {
                      document.documentElement.classList.add('dark');
                      localStorage.setItem('theme', 'dark');
                      setIsDark(true);
                    }
                  }}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isDark ? 'bg-[var(--brand)]' : 'bg-[var(--card-border)]'}`}
                >
                  <span
                    className={`pointer-events-none relative inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-sm ring-0 transition-all duration-200 ease-in-out ${isDark ? 'translate-x-5' : 'translate-x-0'}`}
                  >
                    {isDark ? (
                      <svg className="h-3.5 w-3.5 text-[var(--brand)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39-.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                      </svg>
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* ── Section: Akun ─────────────────────────── */}
            <div>
              <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {t("settings.sectionAccount")}
              </h3>
              <div className="card-app overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
                {/* Logout */}
                <div className="border-b border-[var(--card-border)] px-4 py-4 md:px-6">
                  <SignOutButton />
                </div>

                {/* Delete Account */}
                <div className="px-4 py-4 md:px-6">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      aria-expanded={showDeleteConfirm}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-red-500">
                        <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        {t("settings.deleteAccount")}
                      </span>
                      <svg className="h-4 w-4 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2.5 text-sm font-semibold text-red-500">
                          <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          {t("settings.deleteAccount")}
                        </span>
                        <button
                          onClick={() => { setShowDeleteConfirm(false); setDeleteUsername(""); setDeleteError(""); }}
                          className="text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                        >
                          {t("settings.cancel")}
                        </button>
                      </div>

                      <p className="text-xs leading-relaxed text-[var(--muted)]">{t("settings.deleteAccountDesc")}</p>
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        {t("settings.typeUsername")} <strong className="font-mono text-sm text-red-700 dark:text-red-300">@{sessionUser?.username}</strong> {t("settings.toConfirm")}
                      </p>

                      <input
                        type="text"
                        value={deleteUsername}
                        onChange={(e) => { setDeleteUsername(e.target.value); setDeleteError(""); }}
                        placeholder={t("settings.typeUsernamePlaceholder")}
                        autoFocus
                        className="block w-full rounded-lg border border-red-300 px-3 py-2.5 text-sm outline-none transition-all placeholder:text-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-red-800 dark:bg-red-950/20 dark:placeholder:text-red-700"
                      />

                      {deleteError && <ErrorAlert message={deleteError} />}

                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowDeleteConfirm(false); setDeleteUsername(""); setDeleteError(""); }}
                          className="flex-1 rounded-lg border border-[var(--card-border)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition-all hover:bg-[var(--background)] active:scale-[0.98]"
                        >
                          {t("settings.cancel")}
                        </button>
                        <button
                          onClick={async () => {
                            setDeleteError("");
                            if (deleteUsername.trim() !== sessionUser?.username) {
                              setDeleteError(t("settings.usernameMismatch"));
                              return;
                            }
                            setDeleting(true);
                            try {
                              const res = await fetch("/api/users/account", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ username: deleteUsername.trim() }),
                              });
                              const data = await res.json();
                              if (data.deleted) {
                                // Force sign out
                                await fetch("/api/auth/logout", { method: "POST" });
                                window.location.href = "/";
                              } else {
                                setDeleteError(translateApiError(data.error, t) || t("settings.deleteError"));
                              }
                            } catch {
                              setDeleteError(t("error.networkError"));
                            } finally {
                              setDeleting(false);
                            }
                          }}
                          disabled={deleting || deleteUsername.trim() !== sessionUser?.username}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deleting ? (
                            <>
                              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              {t("settings.deleting")}
                            </>
                          ) : (
                            t("settings.deleteAccount")
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </div>

      {/* ── Edit Photo Modals ──────────────────────────────── */}
      <EditPhotoModal
        isOpen={editTarget === "avatar"}
        onClose={() => setEditTarget(null)}
        currentImage={avatar}
        currentPosition={avatarPosition}
        type="avatar"
        onSave={handlePhotoSave}
      />
      <EditPhotoModal
        isOpen={editTarget === "cover"}
        onClose={() => setEditTarget(null)}
        currentImage={coverImage}
        currentPosition={coverPosition}
        type="cover"
        onSave={handlePhotoSave}
      />
    </>
  );
}
