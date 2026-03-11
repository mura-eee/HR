import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { collectBackupData } from "@/lib/backup";

// GET /api/admin/backup - バックアップ一覧
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backups = await prisma.backup.findMany({
    select: { id: true, name: true, type: true, note: true, sizeBytes: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ backups });
}

// POST /api/admin/backup - バックアップ作成
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const type: string = body.type ?? "manual";
  const note: string = body.note ?? "";

  const data = await collectBackupData();
  const json = JSON.stringify(data);
  const sizeBytes = Buffer.byteLength(json, "utf8");

  const now = new Date();
  const name = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} (${type === "auto" ? "自動" : "手動"})`;

  const backup = await prisma.backup.create({
    data: { name, type, note: note || null, sizeBytes, data: data as object },
  });

  // 自動バックアップは最新10件のみ保持
  if (type === "auto") {
    const autoBackups = await prisma.backup.findMany({
      where: { type: "auto" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (autoBackups.length > 10) {
      const toDelete = autoBackups.slice(10).map((b) => b.id);
      await prisma.backup.deleteMany({ where: { id: { in: toDelete } } });
    }
  }

  return NextResponse.json({ backup: { id: backup.id, name: backup.name, sizeBytes: backup.sizeBytes, createdAt: backup.createdAt } });
}
