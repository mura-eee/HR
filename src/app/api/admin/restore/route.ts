import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { restoreFromData } from "@/lib/backup";

// POST /api/admin/restore
// body: { backupId: string } または { data: object } (アップロードJSONの場合)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let backupData: any;

  if (body.backupId) {
    const backup = await prisma.backup.findUnique({ where: { id: body.backupId } });
    if (!backup) return NextResponse.json({ error: "バックアップが見つかりません" }, { status: 404 });
    backupData = backup.data;
  } else if (body.data) {
    backupData = body.data;
  } else {
    return NextResponse.json({ error: "backupId または data が必要です" }, { status: 400 });
  }

  if (!backupData?.version) {
    return NextResponse.json({ error: "無効なバックアップデータです" }, { status: 400 });
  }

  await restoreFromData(backupData);

  return NextResponse.json({ success: true });
}
