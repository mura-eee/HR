import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_FIELDS, TARGET_PRIORITY, PermissionLevel } from "@/lib/field-permissions";

export async function getEffectivePermission(fieldKey: string): Promise<PermissionLevel | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email ?? "" },
    include: {
      employee: {
        select: { positionId: true, companyId: true },
      },
    },
  });

  if (!user) return null;

  if (user.role === "ADMIN") return "edit";

  const targets: { type: string; id: string }[] = [
    { type: "user", id: user.id },
  ];
  if (user.employee?.companyId) targets.push({ type: "company", id: user.employee.companyId });
  if (user.employee?.positionId) targets.push({ type: "position", id: user.employee.positionId });

  const allPerms = await prisma.fieldPermission.findMany({
    where: {
      fieldKey,
      OR: targets.map((t) => ({ targetType: t.type, targetId: t.id })),
    },
  });

  let effective: PermissionLevel = "edit";

  for (const targetType of [...TARGET_PRIORITY].reverse()) {
    const target = targets.find((t) => t.type === targetType);
    if (!target) continue;
    const perm = allPerms.find((p) => p.targetType === targetType && p.targetId === target.id);
    if (perm) effective = perm.level as PermissionLevel;
  }

  return effective;
}
