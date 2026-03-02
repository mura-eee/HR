import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/settings/competency-items/[id] - Update a competency item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      category,
      name,
      description,
      coefficient,
      level1Text,
      level2Text,
      level3Text,
      level4Text,
      departmentId,
      sortOrder,
      isActive,
    } = body;

    if (!category || !name) {
      return NextResponse.json(
        { error: "カテゴリと項目名は必須です" },
        { status: 400 }
      );
    }

    const item = await prisma.competencyItem.update({
      where: { id },
      data: {
        category,
        name,
        description: description || null,
        coefficient: coefficient ? parseInt(String(coefficient), 10) : 2,
        level1Text: level1Text || null,
        level2Text: level2Text || null,
        level3Text: level3Text || null,
        level4Text: level4Text || null,
        departmentId: departmentId || null,
        sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("コンピテンシー項目更新エラー:", error);
    return NextResponse.json(
      { error: "コンピテンシー項目の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/competency-items/[id] - Delete a competency item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { id } = await params;

    // Check for associated evaluations
    const evalCount = await prisma.competencyEvaluation.count({
      where: { competencyItemId: id },
    });

    if (evalCount > 0) {
      return NextResponse.json(
        { error: "この項目に関連する評価データが存在するため削除できません" },
        { status: 400 }
      );
    }

    await prisma.competencyItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: "コンピテンシー項目を削除しました" });
  } catch (error) {
    console.error("コンピテンシー項目削除エラー:", error);
    return NextResponse.json(
      { error: "コンピテンシー項目の削除に失敗しました" },
      { status: 500 }
    );
  }
}
