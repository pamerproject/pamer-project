import "dotenv/config";
import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const adminName = process.env.ADMIN_NAME || "Admin";
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminPinId = process.env.ADMIN_PIN_ID || null;
  const adminUsername = process.env.ADMIN_USERNAME || `admin_${adminEmail?.split("@")[0] || "admin"}`;

  if (!adminEmail) {
    console.error("ADMIN_EMAIL env var is required");
    process.exit(1);
  }

  if (!adminPassword) {
    console.error("ADMIN_PASSWORD env var is required");
    process.exit(1);
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  // Hash password sekali — dipakai di cabang update & create.
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  // Username konsisten di kedua cabang, agar re-run seed TIDAK
  // mengganti nama user admin. Nilai dari ADMIN_USERNAME (mis. "pamerproject"),
  // fallback ke skema admin_<prefix-email>.
  // Akun admin dibuat/di-seed oleh operator — sudah trusted, jadi email
  // langsung dianggap terverifikasi (hindari banner "verifikasi email").
  const emailVerified = new Date();

  if (existingAdmin) {
    // Update juga password — kalau ADMIN_PASSWORD berubah, hash harus
    // ikut disinkronkan (sebelumnya hanya name/username/role yang di-update,
    // sehingga password baru tidak pernah berlaku untuk admin yang sudah ada).
    const updated = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: adminName,
        username: adminUsername,
        role: "ADMIN",
        password: hashedPassword,
        emailVerified,
      },
    });
    console.log(`✅ Admin user updated: ${updated.email} (${updated.role})`);
    await seedPin(updated.id, adminPinId);
  } else {
    const admin = await prisma.user.create({
      data: {
        name: adminName,
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN",
        emailVerified,
      },
    });
    console.log(`✅ Admin user created: ${admin.email} (role: ${admin.role})`);
    await seedPin(admin.id, adminPinId);
  }
}

async function seedPin(adminId: string, pinId: string | null) {
  if (!pinId) {
    console.log("ℹ️ No ADMIN_PIN_ID set, skipping initial pin.");
    return;
  }

  const pinTarget = await prisma.project.findUnique({ where: { id: pinId } });
  if (!pinTarget) {
    console.warn(`⚠️ Project with id "${pinId}" not found. Skipping pin.`);
    return;
  }

  // Pastikan project punya Post (feed membaca Post, bukan Project)
  let projectPost = await prisma.post.findFirst({
    where: { type: "project", projectId: pinId },
    select: { id: true },
  });
  if (!projectPost) {
    projectPost = await prisma.post.create({
      data: {
        type: "project",
        content: "",
        projectId: pinId,
        userId: pinTarget.userId,
      },
      select: { id: true },
    });
  }

  await prisma.$transaction([
    prisma.post.updateMany({
      where: { pinned: true },
      data: { pinned: false },
    }),
    prisma.post.update({
      where: { id: projectPost.id },
      data: { pinned: true },
    }),
  ]);

  console.log(`✅ Initial pin set: ${pinTarget.title}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
