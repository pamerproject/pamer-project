import "dotenv/config";
import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const adminName = process.env.ADMIN_NAME || "Admin";
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminPinId = process.env.ADMIN_PIN_ID || null;

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

  if (existingAdmin) {
    const updated = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: adminName,
        username: `admin_${existingAdmin.id.slice(0, 8)}`,
        role: "ADMIN",
      },
    });
    console.log(`✅ Admin user updated: ${updated.email} (${updated.role})`);
    await seedPin(updated.id, adminPinId);
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        name: adminName,
        username: `admin_${adminEmail.split("@")[0]}`,
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN",
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
