import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/settings/competency-items - List all competency items
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const items = await prisma.competencyItem.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("コンピテンシー項目一覧取得エラー:", error);
    return NextResponse.json(
      { error: "コンピテンシー項目一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/settings/competency-items - Create a new competency item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

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

    const item = await prisma.competencyItem.create({
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
        sortOrder: sortOrder ? parseInt(String(sortOrder), 10) : 0,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("コンピテンシー項目登録エラー:", error);
    return NextResponse.json(
      { error: "コンピテンシー項目の登録に失敗しました" },
      { status: 500 }
    );
  }
}
