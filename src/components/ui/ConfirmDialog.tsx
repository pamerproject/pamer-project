"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/lib/lang";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "default" | "input" | "alert";
  inputLabel?: string;
  inputValue?: string;
  inputPlaceholder?: string;
  inputMaxLength?: number;
  inputType?: "text" | "number" | "password";
  inputError?: string;
  onInputChange?: (val: string) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmText,
  cancelText,
  variant = "default",
  inputLabel,
  inputValue,
  inputPlaceholder,
  inputMaxLength,
  inputType = "text",
  inputError,
  onInputChange,
  onConfirm,
  loading,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when dialog opens (for input variant)
  useEffect(() => {
    if (isOpen && variant === "input" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, variant]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
      if (e.key === "Enter" && variant === "input" && inputValue?.length === 6) {
        onConfirm();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, loading, onClose, variant, inputValue, onConfirm]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";
  const isInput = variant === "input";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div
        className="w-full max-w-sm animate-zoom-in rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-0 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="px-6 pb-0 pt-8 text-center">
          <div
            className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ring-4 ${
              isDanger
                ? "bg-red-50 ring-red-100"
                : isInput
                ? "bg-[var(--brand-light)] ring-[var(--brand)]/10"
                : "bg-amber-50 ring-amber-100"
            }`}
          >
            {isDanger ? (
              <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            ) : isInput ? (
              <svg className="h-6 w-6 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.007v.008H12v-.008z" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>

        {/* Content */}
        <div className="px-6 pb-0 pt-3">
          {typeof message === "string" ? (
            <p className="text-center text-sm text-[var(--muted)]">{message}</p>
          ) : (
            message
          )}

          {/* Input field (for PIN variant) */}
          {isInput && (
            <div className="mt-4">
              {inputLabel && (
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  {inputLabel}
                </label>
              )}
              <input
                ref={inputRef}
                type={inputType}
                inputMode={inputType === "text" ? undefined : "numeric"}
                maxLength={inputMaxLength}
                placeholder={inputPlaceholder}
                value={inputValue || ""}
                onChange={(e) => {
                  const val = inputType === "text" ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, inputMaxLength || 6);
                  onInputChange?.(val);
                }}
                className="w-full rounded-xl border-2 px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                style={{
                  borderColor: inputError ? "#ef4444" : "var(--card-border)",
                }}
              />
              {/* Dots indicator */}
              {inputMaxLength && (
                <div className="mt-3 flex justify-center gap-2">
                  {Array.from({ length: inputMaxLength }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                        i < (inputValue?.length || 0)
                          ? inputError
                            ? "bg-red-400 scale-110"
                            : "bg-[var(--brand)] scale-110"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
              )}
              {inputError && (
                <div className="mt-2 flex animate-shake items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {inputError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-6 pb-6 pt-5">
          {variant !== "alert" && (
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-[var(--card-border)] py-2.5 text-sm font-bold transition-all hover:bg-[var(--background)] hover:border-[var(--brand)]/30 disabled:opacity-50"
            >
              {cancelText || t("confirmDialog.cancel")}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={loading || (isInput && (inputValue?.length || 0) < (inputMaxLength || 1))}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${
              isDanger
                ? "bg-red-500 shadow-red-500/20 hover:shadow-red-500/30"
                : "bg-[var(--brand)] shadow-[var(--brand)]/20 hover:shadow-[var(--brand)]/30"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("confirmDialog.processing")}
              </span>
            ) : (
              confirmText || t("confirmDialog.confirm")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
