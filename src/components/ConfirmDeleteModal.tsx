"use client";

import { Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/lang";

interface ConfirmDeleteModalProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDeleteModal({ title, onConfirm, onCancel, loading }: ConfirmDeleteModalProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-2xl animate-fade-in">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-center text-lg font-bold text-[var(--foreground)]">{t("freelance.confirmDelete")}</h3>
        <p className="mt-1 text-center text-sm text-[var(--muted)]">
          {t("freelance.confirmDeleteDesc", { title })}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            {t("confirmDialog.cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("confirmDialog.delete")
            )}
          </button>
        </div>
      </div>
    </>
  );
}