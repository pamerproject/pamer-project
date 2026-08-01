import prisma from "@/lib/prisma";

type NotifType = "LIKE" | "COMMENT" | "REPLY" | "VISIT";

export async function createNotification({
  type,
  recipientId,
  actorId,
  postId,
  projectId,
}: {
  type: NotifType;
  recipientId: string;
  actorId: string;
  postId?: string;
  projectId?: string;
}) {
  if (recipientId === actorId) return;

  if (type === "VISIT") {
    const existing = await prisma.notification.findFirst({
      where: {
        type: "VISIT",
        userId: recipientId,
        actorId,
        createdAt: { gte: new Date(Date.now() - 3600000) },
      },
    });
    if (existing) return;
  }

  await prisma.notification.create({
    data: { type, userId: recipientId, actorId, postId: postId || null, projectId: projectId || null },
  });
}
