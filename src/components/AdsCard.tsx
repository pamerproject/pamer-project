"use client";

import { useTranslation } from "@/lib/lang";

const AD_URL = "https://www.hostinger.com/id?REFERRALCODE=pamerproject";
const AD_IMAGE = "https://hpanel.hostinger.com/assets/images/referrals/cardBanners/reach.png";

/** Iklan Hostinger referral — dipakai di feed beranda (tiap 10 feed) dan dashboard. */
export default function AdsCard() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
      {/* Accent gradien Hostinger */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#673de6] via-[#8a5cf6] to-[#a855f7]" />

      {/* Header di atas gambar — avatar H di kiri, Sponsored di kanan atas */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#673de6] to-[#8a5cf6] text-lg font-black text-white shadow-sm">
            H
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black leading-tight tracking-tight text-[var(--foreground)]">
              Hostinger
            </p>
            <p className="text-xs font-bold text-[#8a5cf6]">{t("ads.title")}</p>
            <p className="text-[11px] text-[var(--muted)]">{t("ads.tagline")}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--brand-light)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          {t("ads.sponsored")}
        </span>
      </div>

      {/* Banner Hostinger — di bawah header */}
      <a
        href={AD_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block px-5 pt-4"
      >
        <img
          src={AD_IMAGE}
          alt="Hostinger Reach"
          loading="lazy"
          className="aspect-[16/7] w-full rounded-lg object-cover transition-transform duration-300 hover:scale-[1.02]"
        />
      </a>

      <div className="p-5">
        {/* Deskripsi */}
        <p className="text-sm leading-relaxed text-[var(--muted)]">{t("ads.desc")}</p>

        {/* Keuntungan */}
        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-2.5 rounded-xl bg-[#673de6]/5 p-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#673de6] text-white">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span className="text-sm font-bold text-[var(--foreground)]">{t("ads.earn")}</span>
          </div>
          <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <span className="text-sm font-bold text-[var(--foreground)]">{t("ads.friendDiscount")}</span>
          </div>
        </div>

        {/* Social proof — stats dari Hostinger referral */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--card-border)] rounded-xl border border-[var(--card-border)] bg-[var(--background)] py-3 text-center">
          <div className="px-2">
            <p className="text-base font-black leading-tight text-[var(--foreground)]">{t("ads.statPeopleValue")}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--muted)]">{t("ads.statPeopleLabel")}</p>
          </div>
          <div className="px-2">
            <p className="text-base font-black leading-tight text-[var(--foreground)]">{t("ads.statPaidValue")}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--muted)]">{t("ads.statPaidLabel")}</p>
          </div>
          <div className="px-2">
            <p className="text-base font-black leading-tight text-[var(--foreground)]">{t("ads.statAvgValue")}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--muted)]">{t("ads.statAvgLabel")}</p>
          </div>
        </div>

        {/* CTA */}
        <a
          href={AD_URL}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#673de6] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#5a31d1] active:scale-[0.98]"
        >
          {t("ads.cta")}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>

        {/* Syarat & ketentuan */}
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">{t("ads.terms")}</p>
        <a
          href={AD_URL}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-1 inline-block text-[11px] font-semibold text-[#673de6] hover:underline"
        >
          {t("ads.termsLink")}
        </a>
      </div>
    </div>
  );
}
