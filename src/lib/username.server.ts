import prisma from "@/lib/prisma";
import { generateUsername } from "@/lib/username";
import { Prisma, type User } from "@/generated/prisma/client";

/**
 * Deteksi error unique constraint Prisma (kode P2002).
 * `fields` = nama kolom yang bentrok (mis. ["username"], ["email"]).
 */
export function isUniqueConstraintError(
  err: unknown,
  fields: string[]
): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; meta?: { target?: string | string[] } };
  if (e.code !== "P2002") return false;
  const target = e.meta?.target;
  const targets = Array.isArray(target) ? target : target ? [target] : [];
  return targets.some((t) => fields.includes(t));
}

/**
 * Buat user dengan username UNIK — aman dari race condition.
 *
 * Pola lama "check dulu (findUnique) lalu create" rentan TOCTOU: dua request
 * bersamaan bisa sama-sama lolos check lalu salah satu gagal di unique
 * constraint (P2002) → 500. Solusinya optimistic create: langsung create
 * dengan base username, dan bila kena P2002 di kolom "username", retry
 * otomatis dengan suffix numerik berikutnya.
 *
 * @param name Nama pengguna (dipakai sebagai basis username).
 * @param buildData Builder data create — dipanggil ulang tiap retry dengan
 *                  username yang berbeda.
 */
export async function createUserWithUniqueUsername(
  name: string,
  buildData: (username: string) => Prisma.UserCreateInput
): Promise<User> {
  const base = generateUsername(name);

  // Helper: coba create, return null kalau username bentrok
  const attempt = async (username: string): Promise<User | null> => {
    try {
      return await prisma.user.create({ data: buildData(username) });
    } catch (err) {
      // Hanya bentrok username yang di-retry — error lain (mis. email
      // bentrok, validasi) tetap dilempar ke pemanggil.
      if (isUniqueConstraintError(err, ["username"])) return null;
      throw err;
    }
  };

  // 1) Coba username polos dulu — kalau tersedia, langsung dipakai
  const plain = await attempt(base);
  if (plain) return plain;

  // 2) Sudah dipakai / bentrok — tambah suffix numerik mulai 2 digit (10)
  for (let suffix = 10; suffix < 999999; suffix++) {
    const user = await attempt(`${base}${suffix}`);
    if (user) return user;
  }

  // 3) Fallback: base + timestamp (hampir tidak pernah kepake)
  const fallback = await attempt(`${base}${Date.now()}`);
  if (fallback) return fallback;
  // Tak mungkin tercapai — semua kandidat habis
  throw new Error("Gagal membuat username unik");
}
