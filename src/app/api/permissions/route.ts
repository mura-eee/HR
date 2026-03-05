import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/permissions?targetType=xxx&targetId=xxx
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("targetType");
  const targetId = searchParams.get("targetId");

  const where: Record<string, string> = {};
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;

  const permissions = await prisma.fieldPermission.findMany({ where });
  return NextResponse.json({ permissions });
}

// POST /api/permissions - 対象の権限を一括保存
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { targetType, targetId, permissions } = await request.json();
  if (!targetType || !targetId) {
    return NextResponse.json({ error: "targetType と targetId は必須です" }, { status: 400 });
  }

  // 既存の権限を削除してから再作成
  await prisma.fieldPermission.deleteMany({ where: { targetType, targetId } });

  if (Array.isArray(permissions) && permissions.length > 0) {
    await prisma.fieldPermission.createMany({
      data: permissions.map((p: { fieldKey: string; level: string }) => ({
        targetType,
        targetId,
        fieldKey: p.fieldKey,
        level: p.level,
      })),
    });
  }

  return NextResponse.json({ success: true });
}
