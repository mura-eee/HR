import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, sortOrder, isActive } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "会社名とコードは必須です" }, { status: 400 });
    }

    const { id } = await params;
    const duplicate = await prisma.company.findFirst({
      where: { code, NOT: { id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "このコードは既に使用されています" }, { status: 400 });
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        name,
        code,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : 0,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("所属企業更新エラー:", error);
    return NextResponse.json({ error: "所属企業の更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { id } = await params;
    // 所属社員がいる場合は削除不可
    const count = await prisma.employee.count({ where: { companyId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `この企業には${count}名の社員が所属しているため削除できません` },
        { status: 400 }
      );
    }

    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("所属企業削除エラー:", error);
    return NextResponse.json({ error: "所属企業の削除に失敗しました" }, { status: 500 });
  }
}
