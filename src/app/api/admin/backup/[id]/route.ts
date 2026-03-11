import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/backup/[id] - バックアップデータをJSONでダウンロード
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const backup = await prisma.backup.findUnique({ where: { id } });
  if (!backup) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = JSON.stringify(backup.data, null, 2);
  const filename = `hr-backup-${backup.createdAt.toISOString().slice(0, 10)}.json`;

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// DELETE /api/admin/backup/[id] - バックアップ削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.backup.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
