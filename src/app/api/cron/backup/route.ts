import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { collectBackupData } from "@/lib/backup";

// GET /api/cron/backup - Vercel Cron / 自動バックアップ用エンドポイント
export async function GET(request: NextRequest) {
  // Vercel Cron のシークレット認証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await collectBackupData();
  const json = JSON.stringify(data);
  const sizeBytes = Buffer.byteLength(json, "utf8");

  const now = new Date();
  const name = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} (自動)`;

  await prisma.backup.create({
    data: { name, type: "auto", sizeBytes, data: data as object },
  });

  // 自動バックアップは最新10件のみ保持
  const autoBackups = await prisma.backup.findMany({
    where: { type: "auto" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (autoBackups.length > 10) {
    const toDelete = autoBackups.slice(10).map((b) => b.id);
    await prisma.backup.deleteMany({ where: { id: { in: toDelete } } });
  }

  return NextResponse.json({ success: true, name });
}
