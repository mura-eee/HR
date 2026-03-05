import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { name, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ error: "職種名は必須です" }, { status: 400 });
    }

    const jobType = await prisma.jobType.update({
      where: { id: params.id },
      data: { name, sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : 0 },
    });

    return NextResponse.json(jobType);
  } catch (error) {
    console.error("職種更新エラー:", error);
    return NextResponse.json({ error: "職種の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const count = await prisma.employee.count({ where: { jobTypeId: params.id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `この職種には${count}名の社員が設定されているため削除できません` },
        { status: 400 }
      );
    }

    await prisma.jobType.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("職種削除エラー:", error);
    return NextResponse.json({ error: "職種の削除に失敗しました" }, { status: 500 });
  }
}
