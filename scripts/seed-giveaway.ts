import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!adminUser) {
    console.error("Tidak ada user admin. Jalankan npm run seed-admin terlebih dahulu.");
    process.exit(1);
  }

  const existingGiveaway = await prisma.project.findFirst({
    where: {
      slug: "giveaway-premium-hosting",
    },
  });

  if (existingGiveaway) {
    console.log("Giveaway data sudah ada, skip.");
    return;
  }

  const project = await prisma.project.create({
    data: {
      title: "🎁 Giveaway: 1 Tahun Premium Hosting",
      slug: "giveaway-premium-hosting",
      description:
        "Dapatkan 1 tahun premium hosting gratis! Cukup ikuti akun kami dan like postingan ini. Hadiah bagi 1 pemenang terpilih setiap bulan.",
      content: `## 🎁 Cara Ikut Giveaway
1. Follow akun kami di media sosial
2. Like postingan ini
3. Tag 2 teman kamu di komentar
4. Share postingan ke story kamu

## 🏆 Hadiah
- 1x Tahun Premium Hosting (Unlimited Storage, Bandwidth, SSL)
- Nama domain .com gratis 1 tahun
- Dukungan prioritas 24/7

## 📅 Periode
- Mulai: 1 Agustus 2026
- Selesai: 31 Agustus 2026
- Pengumuman pemenang: 5 September 2026`,
      image: "",
      tags: ["giveaway", "free", "hosting", "prize"],
      liveUrl: null,
      repoUrl: null,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      userId: adminUser.id,
    },
  });

  // Feed membaca Post, jadi buat Post project ini & pin supaya tampil paling atas
  await prisma.post.create({
    data: {
      type: "project",
      slug: null,
      content: project.content || "",
      pinned: true,
      projectId: project.id,
      userId: adminUser.id,
    },
  });

  console.log("✅ Giveaway data seeded successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
