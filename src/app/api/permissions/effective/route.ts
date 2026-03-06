import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_FIELDS, TARGET_PRIORITY, PermissionLevel } from "@/lib/field-permissions";

// GET /api/permissions/effective?companyId=xxx
// 現在ログイン中のユーザーの実効権限を計算して返す
// companyId を指定すると user_company 権限を最高優先度で適用
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email ?? "" },
    include: {
      employee: {
        select: {
          positionId: true,
          companyId: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // ADMINは全て編集可能
  if (user.role === "ADMIN") {
    const all: Record<string, PermissionLevel> = {};
    for (const f of ALL_FIELDS) all[f.key] = "edit";
    return NextResponse.json({ permissions: all });
  }

  // 対象リストを優先度順に構築（user_company > user > company > position）
  const targets: { type: string; id: string }[] = [];

  // user_company: ログインユーザー × 閲覧中の社員の所属会社
  if (companyId) {
    targets.push({ type: "user_company", id: `${user.id}:${companyId}` });
  }

  targets.push({ type: "user", id: user.id });

  if (user.employee?.companyId) targets.push({ type: "company", id: user.employee.companyId });
  if (user.employee?.positionId) targets.push({ type: "position", id: user.employee.positionId });

  // 全対象の権限を一括取得
  const allPerms = await prisma.fieldPermission.findMany({
    where: {
      OR: targets.map((t) => ({ targetType: t.type, targetId: t.id })),
    },
  });

  // 低優先度から高優先度の順で上書き（最終的に高優先度が残る）
  const effective: Record<string, PermissionLevel> = {};
  for (const f of ALL_FIELDS) effective[f.key] = "edit"; // デフォルト: 編集可能

  for (const targetType of [...TARGET_PRIORITY].reverse()) {
    const target = targets.find((t) => t.type === targetType);
    if (!target) continue;
    const perms = allPerms.filter(
      (p) => p.targetType === targetType && p.targetId === target.id
    );
    for (const perm of perms) {
      effective[perm.fieldKey] = perm.level as PermissionLevel;
    }
  }

  return NextResponse.json({ permissions: effective });
}
