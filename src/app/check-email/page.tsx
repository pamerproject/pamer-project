"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CheckEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg className="h-8 w-8 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-gray-900">
          Please verify your email
        </h1>

        <p className="mt-3 text-center text-sm leading-relaxed text-gray-500">
          Check your mailbox at{" "}
          <span className="font-semibold text-gray-900">{email}</span>. We have sent
          you a verification link — click it to activate your account and start
          showing off your projects.
        </p>

        <button
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          className="mt-8 block w-full rounded-xl bg-[var(--brand)] py-3 text-center text-sm font-bold text-white transition-colors hover:bg-[var(--brand-hover)]"
        >
          Skip now
        </button>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailContent />
    </Suspense>
  );
}
